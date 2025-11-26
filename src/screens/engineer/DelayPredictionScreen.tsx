import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Chip, 
  ProgressBar,
  IconButton,
  List,
  Divider,
  SegmentedButtons 
} from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DelayPrediction, DelayFactor, Task } from '../../types';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';

const screenWidth = Dimensions.get('window').width;

// Mock task data with delay predictions
const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Foundation Excavation',
    description: 'Dig foundation for building structure',
    assignedTo: 'worker-1',
    projectId: 'project-1',
    status: 'in_progress',
    dueDate: '2024-02-15',
    priority: 'high',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-23',
  },
  {
    id: 'task-2',
    title: 'Concrete Pouring',
    description: 'Pour concrete for foundation',
    assignedTo: 'worker-2',
    projectId: 'project-1',
    status: 'in_progress',
    dueDate: '2024-02-20',
    priority: 'high',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-25',
  },
  {
    id: 'task-3',
    title: 'Framing Installation',
    description: 'Install steel frame structure',
    assignedTo: 'worker-3',
    projectId: 'project-1',
    status: 'in_progress',
    dueDate: '2024-02-28',
    priority: 'medium',
    createdAt: '2024-01-20',
    updatedAt: '2024-01-26',
  },
  {
    id: 'task-4',
    title: 'Site Preparation',
    description: 'Clear and prepare construction site',
    assignedTo: 'worker-1',
    projectId: 'project-1',
    status: 'completed',
    dueDate: '2024-01-30',
    priority: 'high',
    createdAt: '2024-01-05',
    updatedAt: '2024-01-28',
  },
  {
    id: 'task-5',
    title: 'Utility Connections',
    description: 'Connect water and electrical utilities',
    assignedTo: 'worker-2',
    projectId: 'project-1',
    status: 'completed',
    dueDate: '2024-02-05',
    priority: 'medium',
    createdAt: '2024-01-12',
    updatedAt: '2024-02-03',
  },
];

// Mock delay predictions for in-progress tasks
const mockDelayPredictions: DelayPrediction[] = [
  {
    taskId: 'task-1',
    taskTitle: 'Foundation Excavation',
    originalDueDate: '2024-02-15',
    estimatedCompletionDate: '2024-02-18',
    delayDays: 3,
    confidenceLevel: 0.85,
    currentStatus: 'delayed',
    factors: [
      {
        name: 'Weather Conditions',
        impact: 0.6,
        description: 'Heavy rainfall has made soil conditions difficult for excavation',
      },
      {
        name: 'Equipment Issues',
        impact: 0.4,
        description: 'Excavator required maintenance causing 1-day delay',
      },
    ],
  },
  {
    taskId: 'task-2',
    taskTitle: 'Concrete Pouring',
    originalDueDate: '2024-02-20',
    estimatedCompletionDate: '2024-02-21',
    delayDays: 1,
    confidenceLevel: 0.78,
    currentStatus: 'at_risk',
    factors: [
      {
        name: 'Material Delivery',
        impact: 0.7,
        description: 'Concrete supplier has limited availability next week',
      },
      {
        name: 'Dependency Tasks',
        impact: 0.3,
        description: 'Foundation excavation delay affects concrete pouring schedule',
      },
    ],
  },
  {
    taskId: 'task-3',
    taskTitle: 'Framing Installation',
    originalDueDate: '2024-02-28',
    estimatedCompletionDate: '2024-02-27',
    delayDays: -1,
    confidenceLevel: 0.92,
    currentStatus: 'in_progress',
    factors: [
      {
        name: 'Efficient Progress',
        impact: -0.3,
        description: 'Team is working ahead of schedule with good weather',
      },
      {
        name: 'Material Availability',
        impact: -0.2,
        description: 'Steel frames arrived earlier than expected',
      },
    ],
  },
];

type ViewMode = 'in_progress' | 'completed';

export default function DelayPredictionScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('in_progress');

  const handleRefreshPrediction = async () => {
    setRefreshing(true);
    // Simulate API call to regenerate predictions
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Updated', 'Delay predictions have been refreshed with latest data.');
    }, 2000);
  };

  const handleExportPDF = () => {
    Alert.alert('Export Report', 'Task delay prediction report exported successfully.', [{ text: 'OK' }]);
  };

  const getDelayRiskColor = (delayDays: number) => {
    if (delayDays <= 0) return constructionColors.complete;
    if (delayDays <= 2) return constructionColors.warning;
    return constructionColors.urgent;
  };

  const getStatusColor = (status: 'in_progress' | 'at_risk' | 'delayed') => {
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

  const inProgressTasks = mockTasks.filter(task => task.status === 'in_progress');
  const completedTasks = mockTasks.filter(task => task.status === 'completed');
  const tasksWithDelays = mockDelayPredictions.filter(pred => pred.delayDays > 0).length;

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
            progress={0.6} // This would be calculated based on actual task progress
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

  const renderCompletedTask = (task: Task) => (
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
              {new Date(task.dueDate).toLocaleDateString()}
            </Paragraph>
          </View>
          
          <View style={styles.dateRow}>
            <Paragraph style={styles.dateLabel}>Completed:</Paragraph>
            <Paragraph style={[styles.completedDate, { color: constructionColors.complete }]}>
              {new Date(task.updatedAt).toLocaleDateString()}
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
            {mockDelayPredictions.length > 0 ? (
              mockDelayPredictions.map(renderTaskPrediction)
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <IconButton icon="clock-check" size={48} iconColor="#ccc" />
                  <Title style={styles.emptyTitle}>No In-Progress Tasks</Title>
                  <Paragraph style={styles.emptyText}>
                    All tasks are either completed or not started yet.
                  </Paragraph>
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
