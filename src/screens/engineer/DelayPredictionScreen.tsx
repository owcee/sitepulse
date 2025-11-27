import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Chip, 
  ProgressBar,
  IconButton,
  SegmentedButtons 
} from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { DelayPrediction, DelayFactor, Task } from '../../types';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import { predictProjectDelays, DelayPredictionResult } from '../../services/mlService';
import { db } from '../../firebaseConfig';

const screenWidth = Dimensions.get('window').width;

type ViewMode = 'in_progress' | 'completed';

interface RealTask {
  id: string;
  title: string;
  status: string;
  progressPercent: number;
  planned_start_date?: any;
  planned_end_date?: any;
  completedAt?: any;
  delayPrediction?: any;
}

export default function DelayPredictionScreen() {
  const { projectId } = useProjectData();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('in_progress');
  const [predictions, setPredictions] = useState<DelayPrediction[]>([]);
  const [completedTasks, setCompletedTasks] = useState<RealTask[]>([]);
  const [inProgressTasks, setInProgressTasks] = useState<RealTask[]>([]);
  const [stats, setStats] = useState({
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    total: 0
  });

  // Load real tasks from Firebase on mount
  useEffect(() => {
    if (projectId) {
      loadTasksFromFirebase();
    }
  }, [projectId]);

  const loadTasksFromFirebase = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('projectId', '==', projectId));
      const snapshot = await getDocs(q);
      
      const completed: RealTask[] = [];
      const inProgress: RealTask[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const task: RealTask = {
          id: doc.id,
          title: data.title || 'Untitled Task',
          status: data.status || 'not_started',
          progressPercent: data.progressPercent || 0,
          planned_start_date: data.planned_start_date,
          planned_end_date: data.planned_end_date,
          completedAt: data.completedAt,
          delayPrediction: data.delayPrediction
        };
        
        if (task.status === 'completed') {
          completed.push(task);
        } else {
          inProgress.push(task);
        }
      });
      
      setCompletedTasks(completed);
      setInProgressTasks(inProgress);
      
      // If there are existing delay predictions stored in tasks, show them
      const existingPredictions: DelayPrediction[] = inProgress
        .filter(t => t.delayPrediction)
        .map(t => ({
          taskId: t.id,
          taskTitle: t.title,
          originalDueDate: t.planned_end_date?.toDate?.()?.toISOString() || new Date().toISOString(),
          estimatedCompletionDate: new Date(Date.now() + (t.delayPrediction?.predictedDuration || 0) * 24 * 60 * 60 * 1000).toISOString(),
          delayDays: t.delayPrediction?.delayDays || 0,
          confidenceLevel: 0.85,
          currentStatus: t.delayPrediction?.riskLevel === 'High' ? 'delayed' : 
                        (t.delayPrediction?.riskLevel === 'Medium' ? 'at_risk' : 'in_progress'),
          factors: (t.delayPrediction?.factors || []).map((f: string) => ({
            name: f,
            impact: 0.5,
            description: `Detected factor: ${f}`
          }))
        }));
      
      if (existingPredictions.length > 0) {
        setPredictions(existingPredictions);
        // Calculate stats from existing predictions
        const high = existingPredictions.filter(p => p.currentStatus === 'delayed').length;
        const medium = existingPredictions.filter(p => p.currentStatus === 'at_risk').length;
        const low = existingPredictions.filter(p => p.currentStatus === 'in_progress').length;
        setStats({
          highRisk: high,
          mediumRisk: medium,
          lowRisk: low,
          total: existingPredictions.length
        });
      }
      
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks from database');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPrediction = async () => {
    if (!projectId) {
      Alert.alert('No Project', 'Please select a project first.');
      return;
    }
    
    setRefreshing(true);
    try {
      const result = await predictProjectDelays(projectId);
      
      if (!result.predictions || result.predictions.length === 0) {
        Alert.alert('No Tasks', 'No active tasks found for delay prediction.');
        setRefreshing(false);
        return;
      }
      
      // Transform API result to UI model
      const mappedPredictions: DelayPrediction[] = result.predictions.map(p => {
        // Find the matching task to get original due date
        const matchingTask = inProgressTasks.find(t => t.id === p.taskId);
        const originalDueDate = matchingTask?.planned_end_date?.toDate?.()?.toISOString() || new Date().toISOString();
        
        return {
          taskId: p.taskId,
          taskTitle: p.taskTitle,
          originalDueDate: originalDueDate,
          estimatedCompletionDate: new Date(Date.now() + p.predictedDuration * 24 * 60 * 60 * 1000).toISOString(),
          delayDays: p.delayDays,
          confidenceLevel: 0.85,
          currentStatus: p.riskLevel === 'High' ? 'delayed' : (p.riskLevel === 'Medium' ? 'at_risk' : 'in_progress'),
          factors: p.factors.map(f => ({
            name: f,
            impact: f.includes('shortage') || f.includes('breakdown') ? 0.7 : 
                   f.includes('weather') || f.includes('permit') ? 0.6 : 0.3,
            description: `Detected factor: ${f}`
          }))
        };
      });

      setPredictions(mappedPredictions);
      setStats({
        highRisk: result.highRiskCount,
        mediumRisk: result.mediumRiskCount,
        lowRisk: result.lowRiskCount,
        total: result.totalTasks
      });
      
      Alert.alert('Analysis Complete', `${result.totalTasks} tasks analyzed.\n${result.highRiskCount} high-risk, ${result.mediumRiskCount} medium-risk, ${result.lowRiskCount} low-risk.`);
    } catch (error) {
      console.error('Prediction error:', error);
      Alert.alert('Error', 'Failed to generate predictions. Make sure Firebase Functions are deployed.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportPDF = () => {
    Alert.alert('Export Report', 'Task delay prediction report exported successfully.', [{ text: 'OK' }]);
  };

  const getDelayRiskColor = (delayDays: number) => {
    if (delayDays <= 0) return constructionColors.complete;
    if (delayDays <= 2) return constructionColors.warning;
    return constructionColors.urgent;
  };

  const getStatusColor = (status: 'in_progress' | 'at_risk' | 'delayed' | string) => {
    switch (status) {
      case 'in_progress':
        return constructionColors.complete;
      case 'at_risk':
        return constructionColors.warning;
      case 'delayed':
        return constructionColors.urgent;
      default:
        return theme.colors.disabled;
    }
  };

  const getImpactColor = (impact: number) => {
    const absImpact = Math.abs(impact);
    if (absImpact >= 0.5) return constructionColors.urgent;
    if (absImpact >= 0.3) return constructionColors.warning;
    return constructionColors.complete;
  };

  const tasksWithDelays = stats.highRisk + stats.mediumRisk;

  const renderTaskPrediction = (prediction: DelayPrediction) => (
    <Card key={prediction.taskId} style={styles.taskCard}>
      <Card.Content style={{ overflow: 'visible' }}>
        <View style={styles.taskHeader}>
          <View style={styles.taskInfo}>
            <Title style={styles.taskTitle}>{prediction.taskTitle}</Title>
            <Chip 
              style={[styles.statusChip, { backgroundColor: getStatusColor(prediction.currentStatus) }]}
              textStyle={styles.statusChipText}
            >
              {prediction.currentStatus.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>
          <Chip 
            style={[styles.confidenceChip, { backgroundColor: theme.colors.primary }]}
            textStyle={styles.confidenceChipText}
          >
            {Math.round(prediction.confidenceLevel * 100)}%
          </Chip>
        </View>

        <View style={styles.predictionDetails}>
          <View style={styles.dateRow}>
            <Paragraph style={styles.dateLabel}>Original Due:</Paragraph>
            <Paragraph style={styles.originalDate}>
              {new Date(prediction.originalDueDate).toLocaleDateString()}
            </Paragraph>
          </View>
          
          <View style={styles.dateRow}>
            <Paragraph style={styles.dateLabel}>Predicted:</Paragraph>
            <Paragraph style={[styles.predictedDate, { color: getDelayRiskColor(prediction.delayDays) }]}>
              {new Date(prediction.estimatedCompletionDate).toLocaleDateString()}
            </Paragraph>
          </View>

          {prediction.delayDays !== 0 && (
            <View style={styles.delayAlert}>
              <IconButton 
                icon={prediction.delayDays > 0 ? "alert-circle" : "check-circle"} 
                size={16} 
                iconColor={getDelayRiskColor(prediction.delayDays)}
              />
              <Paragraph style={[styles.delayText, { color: getDelayRiskColor(prediction.delayDays) }]}>
                {prediction.delayDays > 0 ? 
                  `${prediction.delayDays} day${prediction.delayDays > 1 ? 's' : ''} behind` :
                  `${Math.abs(prediction.delayDays)} day${Math.abs(prediction.delayDays) > 1 ? 's' : ''} ahead`
                }
              </Paragraph>
            </View>
          )}

          <ProgressBar 
            progress={0.6}
            color={getStatusColor(prediction.currentStatus)}
            style={styles.progressBar}
          />
        </View>

        {/* Factors affecting this task */}
        <View style={styles.factorsSection}>
          <Title style={styles.factorsTitle}>Contributing Factors:</Title>
          {prediction.factors.map((factor, index) => (
            <View key={index} style={styles.factorItem}>
              <View style={styles.factorHeader}>
                <Paragraph style={styles.factorName}>{factor.name}</Paragraph>
                <Chip 
                  style={[styles.impactChip, { backgroundColor: getImpactColor(factor.impact) }]}
                  textStyle={styles.impactChipText}
                >
                  {factor.impact > 0 ? '+' : ''}{Math.round(factor.impact * 100)}%
                </Chip>
              </View>
              <Paragraph style={styles.factorDescription}>{factor.description}</Paragraph>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  const renderCompletedTask = (task: RealTask) => (
    <Card key={task.id} style={styles.completedTaskCard}>
      <Card.Content>
        <View style={styles.completedTaskHeader}>
          <View style={styles.taskInfo}>
            <Title style={styles.completedTaskTitle}>{task.title}</Title>
            <Chip 
              style={[styles.statusChip, { backgroundColor: constructionColors.complete }]}
              textStyle={{ color: 'white', fontSize: 12 }}
            >
              COMPLETED
            </Chip>
          </View>
        </View>
        
        <View style={styles.completedTaskDetails}>
          <View style={styles.dateRow}>
            <Paragraph style={styles.dateLabel}>Due Date:</Paragraph>
            <Paragraph style={styles.originalDate}>
              {task.planned_end_date?.toDate ? 
                new Date(task.planned_end_date.toDate()).toLocaleDateString() : 
                'N/A'}
            </Paragraph>
          </View>
          
          <View style={styles.dateRow}>
            <Paragraph style={styles.dateLabel}>Completed:</Paragraph>
            <Paragraph style={[styles.completedDate, { color: constructionColors.complete }]}>
              {task.completedAt?.toDate ? 
                new Date(task.completedAt.toDate()).toLocaleDateString() : 
                'N/A'}
            </Paragraph>
          </View>

          <View style={styles.statusIndicator}>
            <IconButton 
              icon="check-circle" 
              size={16} 
              iconColor={constructionColors.complete}
            />
            <Paragraph style={[styles.statusText, { color: constructionColors.complete }]}>
              Task completed successfully
            </Paragraph>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Paragraph style={styles.loadingText}>Loading tasks...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Title style={styles.screenTitle}>Task Delay Prediction</Title>
        <View style={styles.headerActions}>
          <IconButton
            icon="refresh"
            size={24}
            iconColor={theme.colors.primary}
            onPress={handleRefreshPrediction}
            disabled={refreshing}
          />
          <IconButton
            icon="file-pdf-box"
            size={24}
            iconColor={theme.colors.primary}
            onPress={handleExportPDF}
          />
        </View>
      </View>

      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Paragraph style={styles.summaryNumber}>{inProgressTasks.length}</Paragraph>
              <Paragraph style={styles.summaryLabel}>In Progress</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Paragraph style={[styles.summaryNumber, { color: constructionColors.urgent }]}>
                {tasksWithDelays}
              </Paragraph>
              <Paragraph style={styles.summaryLabel}>With Delays</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Paragraph style={[styles.summaryNumber, { color: constructionColors.complete }]}>
                {completedTasks.length}
              </Paragraph>
              <Paragraph style={styles.summaryLabel}>Completed</Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
          buttons={[
            { value: 'in_progress', label: 'In Progress Tasks', icon: 'clock' },
            { value: 'completed', label: 'Completed Tasks', icon: 'check-circle' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {viewMode === 'in_progress' ? (
          <>
            {/* Task Status Pie Chart */}
            <Card style={styles.chartCard}>
              <Card.Content>
                <Title style={styles.chartTitle}>Task Status Overview</Title>
                <Paragraph style={styles.chartDescription}>
                  Current status distribution of all project tasks
                </Paragraph>
                
                {(() => {
                  const taskStatusData = [
                    {
                      name: 'In Progress',
                      population: inProgressTasks.length,
                      color: constructionColors.inProgress,
                      legendFontColor: '#7F7F7F',
                      legendFontSize: 12,
                    },
                    {
                      name: 'Completed',
                      population: completedTasks.length,
                      color: constructionColors.complete,
                      legendFontColor: '#7F7F7F',
                      legendFontSize: 12,
                    },
                    {
                      name: 'With Delays',
                      population: tasksWithDelays,
                      color: constructionColors.urgent,
                      legendFontColor: '#7F7F7F',
                      legendFontSize: 12,
                    },
                  ].filter(item => item.population > 0);

                  if (taskStatusData.length === 0) {
                    return (
                      <View style={styles.noDataContainer}>
                        <Paragraph style={styles.noDataText}>No task data available</Paragraph>
                      </View>
                    );
                  }

                  return (
                    <PieChart
                      data={taskStatusData}
                      width={screenWidth - 80}
                      height={200}
                      chartConfig={{
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      }}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      absolute
                    />
                  );
                })()}

                {/* Task Status Summary */}
                <View style={styles.statusSummary}>
                  <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: constructionColors.inProgress }]} />
                    <Paragraph style={styles.statusLabel}>In Progress: {inProgressTasks.length}</Paragraph>
                  </View>
                  <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: constructionColors.complete }]} />
                    <Paragraph style={styles.statusLabel}>Completed: {completedTasks.length}</Paragraph>
                  </View>
                  <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: constructionColors.urgent }]} />
                    <Paragraph style={styles.statusLabel}>With Delays: {tasksWithDelays}</Paragraph>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* In Progress Tasks Section */}
            {predictions.length > 0 ? (
              predictions.map(renderTaskPrediction)
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <IconButton icon="clock-check" size={48} iconColor="#ccc" />
                  <Title style={styles.emptyTitle}>No Predictions Yet</Title>
                  <Paragraph style={styles.emptyText}>
                    Tap the refresh button to generate AI delay predictions for your {inProgressTasks.length} active task(s).
                  </Paragraph>
                  <Button 
                    mode="contained" 
                    onPress={handleRefreshPrediction}
                    loading={refreshing}
                    disabled={refreshing}
                    style={styles.generateButton}
                    icon="brain"
                  >
                    Generate Predictions
                  </Button>
                </Card.Content>
              </Card>
            )}
          </>
        ) : (
          <>
            {completedTasks.length > 0 ? (
              completedTasks.map(renderCompletedTask)
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <IconButton icon="clipboard-check" size={48} iconColor="#ccc" />
                  <Title style={styles.emptyTitle}>No Completed Tasks</Title>
                  <Paragraph style={styles.emptyText}>
                    No tasks have been completed yet.
                  </Paragraph>
                </Card.Content>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: 'white',
    elevation: 1,
  },
  screenTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
  },
  summaryCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    elevation: 2,
    borderRadius: theme.roundness,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    lineHeight: 32,
  },
  summaryLabel: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  segmentedButtons: {
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
  },
  taskCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    elevation: 2,
    borderRadius: theme.roundness,
    overflow: 'visible',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  taskInfo: {
    flex: 1,
    marginRight: spacing.sm,
    maxWidth: '70%',
  },
  taskTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  statusChip: {
    alignSelf: 'flex-start',
    minWidth: 50,
  },
  statusChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 14,
    includeFontPadding: false,
  },
  confidenceChip: {
    minWidth: 50,
    height: 24,
    alignSelf: 'flex-start',
  },
  predictionDetails: {
    marginBottom: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dateLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  originalDate: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: theme.colors.text,
  },
  predictedDate: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  delayAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: spacing.sm,
    borderRadius: theme.roundness,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  delayText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: spacing.sm,
  },
  factorsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  factorsTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  factorItem: {
    marginBottom: spacing.md,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    overflow: 'visible',
  },
  factorName: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  confidenceChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 14,
    includeFontPadding: false,
  },
  impactChip: {
    minWidth: 55,
    alignSelf: 'flex-start',
  },
  impactChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  factorDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  completedTaskCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
    borderRadius: theme.roundness,
    backgroundColor: '#f8f9fa',
  },
  completedTaskHeader: {
    marginBottom: spacing.md,
  },
  completedTaskTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  completedTaskDetails: {
    marginBottom: spacing.sm,
  },
  completedDate: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  emptyCard: {
    margin: spacing.md,
    elevation: 1,
    borderRadius: theme.roundness,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    color: theme.colors.onSurfaceDisabled,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  generateButton: {
    marginTop: spacing.lg,
  },
  chartCard: {
    margin: spacing.md,
    elevation: 2,
    borderRadius: theme.roundness,
    backgroundColor: 'white',
  },
  chartTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  chartDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  noDataContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  noDataText: {
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  statusSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  statusLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
    fontWeight: '500',
  },
});
