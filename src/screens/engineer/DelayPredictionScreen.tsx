/**
 * SITEPULSE - Delay Prediction Screen
 * 
 * Shows AI-powered delay predictions for all project tasks.
 * Data comes from the predictAllDelays cloud function.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert, RefreshControl, Text as RNText } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Chip, 
  ProgressBar,
  IconButton,
  SegmentedButtons,
  ActivityIndicator,
  Surface,
  Text,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import { 
  predictAllDelays, 
  DelayPrediction, 
  PredictAllDelaysResponse,
  getRiskLevelColor,
  formatDelayDays,
} from '../../services/delayPredictionService';
import { getProjectTasks, Task } from '../../services/taskService';

const screenWidth = Dimensions.get('window').width;

type ViewMode = 'in_progress' | 'completed';

export default function DelayPredictionScreen() {
  const { projectId } = useProjectData();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('in_progress');
  
  // Data from cloud function
  const [predictions, setPredictions] = useState<DelayPrediction[]>([]);
  const [summary, setSummary] = useState({
    totalTasks: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
  });
  
  // Completed tasks from Firestore
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);

  // Load predictions and tasks
  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (!projectId) {
      setError('No project selected');
      setLoading(false);
      return;
    }

    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch predictions from cloud function
      console.log('[DelayPrediction] Fetching predictions for project:', projectId);
      const result = await predictAllDelays(projectId);
      
      setPredictions(result.predictions);
      setSummary({
        totalTasks: result.totalTasks,
        highRiskCount: result.highRiskCount,
        mediumRiskCount: result.mediumRiskCount,
        lowRiskCount: result.lowRiskCount,
      });

      // Also fetch completed tasks
      const allTasks = await getProjectTasks(projectId);
      const completed = allTasks.filter(t => t.status === 'completed');
      setCompletedTasks(completed);

      console.log('[DelayPrediction] Loaded', result.predictions.length, 'predictions and', completed.length, 'completed tasks');

    } catch (err: any) {
      console.error('[DelayPrediction] Error loading data:', err);
      setError(err.message || 'Failed to load predictions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle refresh
  const handleRefresh = () => {
    loadData(true);
  };

  const handleExportPDF = async () => {
    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Generate prediction rows HTML
      const predictionRows = predictions.map(p => {
        const riskColor = p.riskLevel === 'High' ? '#FF6B35' : p.riskLevel === 'Medium' ? '#FFB800' : '#4CAF50';
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${p.taskTitle}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${p.plannedDuration} days</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: ${riskColor};">${p.predictedDuration} days</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; color: ${riskColor}; font-weight: bold;">+${p.delayDays.toFixed(1)} days</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
              <span style="background-color: ${riskColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                ${p.riskLevel}
              </span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-size: 12px;">${p.factors?.join(', ') || '-'}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Delay Prediction Report</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; color: #333; background: #fff; }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #FF6B35; }
            .header h1 { margin: 0; color: #FF6B35; font-size: 28px; }
            .header p { margin: 5px 0; color: #666; font-size: 14px; }
            .summary-cards { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 15px; }
            .summary-card { flex: 1; padding: 20px; border-radius: 8px; text-align: center; color: white; }
            .summary-card.high { background: linear-gradient(135deg, #FF6B35, #e55d2b); }
            .summary-card.medium { background: linear-gradient(135deg, #FFB800, #e5a500); }
            .summary-card.low { background: linear-gradient(135deg, #4CAF50, #43a047); }
            .summary-card.total { background: linear-gradient(135deg, #2196F3, #1976D2); }
            .summary-card h3 { margin: 0 0 10px; font-size: 14px; opacity: 0.9; }
            .summary-card .value { font-size: 32px; font-weight: 700; margin: 0; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #FF6B35; font-size: 20px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0; }
            table { width: 100%; border-collapse: collapse; background: #fff; }
            thead { background: #FF6B35; color: white; }
            th { padding: 12px 10px; text-align: left; font-size: 13px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Task Delay Prediction Report</h1>
            <p><strong>SitePulse</strong> AI-Powered Construction Management</p>
            <p>Generated on: ${currentDate}</p>
          </div>

          <div class="summary-cards">
            <div class="summary-card total">
              <h3>Total Active Tasks</h3>
              <p class="value">${summary.totalTasks}</p>
            </div>
            <div class="summary-card high">
              <h3>High Risk</h3>
              <p class="value">${summary.highRiskCount}</p>
            </div>
            <div class="summary-card medium">
              <h3>Medium Risk</h3>
              <p class="value">${summary.mediumRiskCount}</p>
            </div>
            <div class="summary-card low">
              <h3>Low Risk</h3>
              <p class="value">${summary.lowRiskCount}</p>
            </div>
          </div>

          <div class="section">
            <h2>Task Delay Predictions</h2>
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th style="text-align: center;">Planned</th>
                  <th style="text-align: center;">Predicted</th>
                  <th style="text-align: center;">Delay</th>
                  <th style="text-align: center;">Risk Level</th>
                  <th>Contributing Factors</th>
                </tr>
              </thead>
              <tbody>
                ${predictionRows || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #999;">No active tasks</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p><strong>SitePulse</strong> - AI-Powered Construction Management Platform</p>
            <p>This report is generated using machine learning predictions based on daily survey data.</p>
            <p>Report generated on ${currentDate}</p>
          </div>
        </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log('Delay Prediction PDF generated:', uri);

      // Share/Save the PDF
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Delay Prediction Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Generated', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Export Failed', 'Unable to generate PDF report. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return constructionColors.inProgress;
      case 'not_started':
        return constructionColors.notStarted;
      case 'completed':
        return constructionColors.complete;
      default:
        return theme.colors.disabled;
    }
  };

  const renderTaskPrediction = (prediction: DelayPrediction) => {
    const riskColor = getRiskLevelColor(prediction.riskLevel);
    
    // Calculate estimated completion date
    const plannedEnd = prediction.plannedEndDate ? new Date(prediction.plannedEndDate) : null;
    const estimatedEnd = plannedEnd && prediction.delayDays > 0 
      ? new Date(plannedEnd.getTime() + prediction.delayDays * 24 * 60 * 60 * 1000)
      : plannedEnd;

    return (
      <Card key={prediction.taskId} style={styles.taskCard}>
        <Card.Content style={{ overflow: 'visible' }}>
          <View style={styles.taskHeader}>
            <View style={styles.taskInfo}>
              <Title style={styles.taskTitle}>{prediction.taskTitle}</Title>
              {prediction.taskType && (
                <Paragraph style={styles.taskType}>{prediction.taskType}</Paragraph>
              )}
              <View style={[styles.customBadge, styles.statusBadge, { backgroundColor: getStatusColor(prediction.status || 'in_progress') }]}>
                <Text style={styles.statusBadgeText}>
                  {(prediction.status || 'in_progress').replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={[styles.riskBadge, { overflow: 'visible' }]}>
              <View style={[styles.customBadge, styles.riskBadgeContainer, { backgroundColor: riskColor }]}>
                <Ionicons 
                  name={prediction.riskLevel === 'High' ? 'alert-circle' : prediction.riskLevel === 'Medium' ? 'warning' : 'checkmark-circle'} 
                  size={14} 
                  color="#FFFFFF" 
                  style={styles.badgeIcon} 
                />
                <Text style={styles.riskBadgeText}>
                  {prediction.riskLevel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.predictionDetails}>
            <View style={styles.dateRow}>
              <Paragraph style={styles.dateLabel}>Planned Duration:</Paragraph>
              <Paragraph style={styles.dateValue}>
                {prediction.plannedDuration} days
              </Paragraph>
            </View>
            
            <View style={styles.dateRow}>
              <Paragraph style={styles.dateLabel}>Predicted Duration:</Paragraph>
              <Paragraph style={[styles.dateValue, { color: riskColor, fontWeight: 'bold' }]}>
                {prediction.predictedDuration} days
              </Paragraph>
            </View>

            {plannedEnd && (
              <View style={styles.dateRow}>
                <Paragraph style={styles.dateLabel}>Planned End:</Paragraph>
                <Paragraph style={styles.dateValue}>
                  {plannedEnd.toLocaleDateString()}
                </Paragraph>
              </View>
            )}

            {prediction.delayDays > 0 && (
              <View style={[styles.delayAlert, { borderColor: riskColor, backgroundColor: riskColor + '15' }]}>
                <IconButton 
                  icon="alert-circle" 
                  size={16} 
                  iconColor={riskColor}
                  style={{ margin: 0 }}
                />
                <Paragraph style={[styles.delayText, { color: riskColor }]}>
                  {formatDelayDays(prediction.delayDays)}
                </Paragraph>
              </View>
            )}

            {prediction.delayDays <= 0 && (
              <View style={[styles.delayAlert, { borderColor: constructionColors.complete, backgroundColor: constructionColors.complete + '15' }]}>
                <IconButton 
                  icon="check-circle" 
                  size={16} 
                  iconColor={constructionColors.complete}
                  style={{ margin: 0 }}
                />
                <Paragraph style={[styles.delayText, { color: constructionColors.complete }]}>
                  On track
                </Paragraph>
              </View>
            )}

            {/* Progress Bar based on predicted vs planned */}
            <View style={styles.progressContainer}>
              <Paragraph style={styles.progressLabel}>
                Delay Risk
              </Paragraph>
              <ProgressBar 
                progress={Math.min(prediction.delayDays / prediction.plannedDuration, 1)} 
                color={riskColor}
                style={styles.progressBar}
              />
            </View>
          </View>

          {/* Contributing Factors */}
          {prediction.factors && prediction.factors.length > 0 && (
            <View style={styles.factorsSection}>
              <Title style={styles.factorsTitle}>Contributing Factors:</Title>
              <View style={styles.factorsList}>
                {prediction.factors.map((factor, index) => (
                  <Chip 
                    key={index}
                    style={styles.factorChip}
                    textStyle={styles.factorChipText}
                    icon={factor === 'On track' ? 'check' : 'alert-circle-outline'}
                  >
                    {factor}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderCompletedTask = (task: Task) => (
    <Card key={task.id} style={styles.completedTaskCard}>
      <Card.Content>
        <View style={styles.completedTaskHeader}>
          <View style={styles.taskInfo}>
            <Title style={styles.completedTaskTitle}>{task.title}</Title>
            <View style={[styles.customBadge, { backgroundColor: constructionColors.complete }]}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                COMPLETED
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.completedTaskDetails}>
          <View style={styles.dateRow}>
            <Paragraph style={styles.dateLabel}>Due Date:</Paragraph>
            <Paragraph style={styles.dateValue}>
              {new Date(task.planned_end_date).toLocaleDateString()}
            </Paragraph>
          </View>
          
          {task.actual_end_date && (
            <View style={styles.dateRow}>
              <Paragraph style={styles.dateLabel}>Completed:</Paragraph>
              <Paragraph style={[styles.completedDate, { color: constructionColors.complete }]}>
                {new Date(task.actual_end_date).toLocaleDateString()}
              </Paragraph>
            </View>
          )}

          <View style={styles.statusIndicator}>
            <IconButton 
              icon="check-circle" 
              size={16} 
              iconColor={constructionColors.complete}
              style={{ margin: 0 }}
            />
            <Paragraph style={[styles.statusText, { color: constructionColors.complete }]}>
              Task completed successfully
            </Paragraph>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <Title style={styles.screenTitle}>Task Delay Prediction</Title>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Paragraph style={styles.loadingText}>Analyzing task delays...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <Title style={styles.screenTitle}>Task Delay Prediction</Title>
        </View>
        <View style={styles.errorContainer}>
          <IconButton icon="alert-circle" size={48} iconColor={constructionColors.urgent} />
          <Paragraph style={styles.errorText}>{error}</Paragraph>
          <Button mode="contained" onPress={() => loadData()} style={styles.retryButton}>
            Retry
          </Button>
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
            onPress={handleRefresh}
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
              <Paragraph style={styles.summaryNumber}>{summary.totalTasks}</Paragraph>
              <Paragraph style={styles.summaryLabel}>Active</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Paragraph style={[styles.summaryNumber, { color: constructionColors.urgent }]}>
                {summary.highRiskCount}
              </Paragraph>
              <Paragraph style={styles.summaryLabel}>High Risk</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Paragraph style={[styles.summaryNumber, { color: constructionColors.warning }]}>
                {summary.mediumRiskCount}
              </Paragraph>
              <Paragraph style={styles.summaryLabel}>Medium</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Paragraph style={[styles.summaryNumber, { color: constructionColors.complete }]}>
                {summary.lowRiskCount}
              </Paragraph>
              <Paragraph style={styles.summaryLabel}>Low Risk</Paragraph>
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
            { value: 'in_progress', label: 'Active Tasks', icon: 'clock' },
            { value: 'completed', label: 'Completed', icon: 'check-circle' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {viewMode === 'in_progress' ? (
          <>
            {/* Risk Distribution Chart */}
            {predictions.length > 0 && (
              <Card style={styles.chartCard}>
                <Card.Content>
                  <Title style={styles.chartTitle}>Risk Distribution</Title>
                  <Paragraph style={styles.chartDescription}>
                    Delay risk levels for active tasks
                  </Paragraph>
                  
                  {(() => {
                    const chartData = [
                      {
                        name: 'High Risk',
                        population: summary.highRiskCount,
                        color: constructionColors.urgent,
                        legendFontColor: theme.colors.text,
                        legendFontSize: 12,
                      },
                      {
                        name: 'Medium',
                        population: summary.mediumRiskCount,
                        color: constructionColors.warning,
                        legendFontColor: theme.colors.text,
                        legendFontSize: 12,
                      },
                      {
                        name: 'Low Risk',
                        population: summary.lowRiskCount,
                        color: constructionColors.complete,
                        legendFontColor: theme.colors.text,
                        legendFontSize: 12,
                      },
                    ].filter(item => item.population > 0);

                    if (chartData.length === 0) {
                      return (
                        <View style={styles.noDataContainer}>
                          <Paragraph style={styles.noDataText}>No data to display</Paragraph>
                        </View>
                      );
                    }

                    return (
                      <PieChart
                        data={chartData}
                        width={screenWidth - 80}
                        height={180}
                        chartConfig={{
                          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        }}
                        accessor="population"
                        backgroundColor={theme.colors.surface}
                        paddingLeft="15"
                        absolute
                      />
                    );
                  })()}
                </Card.Content>
              </Card>
            )}

            {/* Active Tasks with Predictions */}
            {predictions.length > 0 ? (
              predictions.map(renderTaskPrediction)
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <IconButton icon="clock-check" size={48} iconColor={theme.colors.disabled} />
                  <Title style={styles.emptyTitle}>No Active Tasks</Title>
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
                  <IconButton icon="clipboard-check" size={48} iconColor={theme.colors.disabled} />
                  <Title style={styles.emptyTitle}>No Completed Tasks</Title>
                  <Paragraph style={styles.emptyText}>
                    No tasks have been completed yet.
                  </Paragraph>
                </Card.Content>
              </Card>
            )}
          </>
        )}
        
        {/* Bottom padding */}
        <View style={{ height: spacing.xl }} />
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
    backgroundColor: theme.colors.background,
  },
  screenTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: constructionColors.urgent,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
  },
  summaryCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    elevation: 2,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
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
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    lineHeight: 28,
  },
  summaryLabel: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 2,
  },
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  segmentedButtons: {
    backgroundColor: theme.colors.surface,
  },
  content: {
    flex: 1,
  },
  taskCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    elevation: 2,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
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
    overflow: 'visible',
    minWidth: 0,
  },
  taskTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  taskType: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  riskBadge: {
    alignItems: 'flex-end',
    overflow: 'visible',
    flexShrink: 0,
  },
  customBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: 'visible',
    alignSelf: 'flex-start',
  },
  statusBadge: {
    marginTop: spacing.xs,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  riskBadgeContainer: {
    paddingHorizontal: spacing.sm,
  },
  riskBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: spacing.xs / 2,
  },
  badgeIcon: {
    marginRight: spacing.xs / 2,
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
  dateValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: theme.colors.text,
  },
  delayAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: theme.roundness,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  delayText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  factorsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  factorsTitle: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  factorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  factorChip: {
    backgroundColor: theme.colors.background,
    marginBottom: spacing.xs,
  },
  factorChipText: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
  },
  completedTaskCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.surface,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    color: theme.colors.onSurfaceVariant,
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
    backgroundColor: theme.colors.surface,
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
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noDataText: {
    color: theme.colors.onSurfaceVariant,
  },
});
