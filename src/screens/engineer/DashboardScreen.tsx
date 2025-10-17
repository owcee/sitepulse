import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  ProgressBar, 
  Badge, 
  Chip,
  IconButton,
  ActivityIndicator
} from 'react-native-paper';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import { getTaskCounts } from '../../services/taskService';

const screenWidth = Dimensions.get('window').width;

// Mock data - in production this would come from Firebase/state management
const mockData = {
  taskSummary: {
    total: 45,
    notStarted: 12,
    inProgress: 18,
    completed: 15,
  },
  recentPhotos: [
    { id: '1', taskId: 'task-1', imageUri: 'https://via.placeholder.com/150', classification: 'Foundation Work', verified: true },
    { id: '2', taskId: 'task-2', imageUri: 'https://via.placeholder.com/150', classification: 'Concrete Pouring', verified: false },
    { id: '3', taskId: 'task-3', imageUri: 'https://via.placeholder.com/150', classification: 'Electrical Work', verified: true },
    { id: '4', taskId: 'task-4', imageUri: 'https://via.placeholder.com/150', classification: 'Plumbing', verified: false },
  ],
  delayRisk: {
    estimatedCompletion: '2024-12-20',
    delayDays: 5,
    riskLevel: 'medium',
  },
  resources: {
    budgetSpent: 425000,
    budgetTotal: 850000,
    payrollCurrent: 45000,
    inventoryAlerts: 3,
  },
  unreadMessages: 7,
};

export default function DashboardScreen() {
  const { state, projectId } = useProjectData();
  const [taskSummary, setTaskSummary] = useState(mockData.taskSummary);
  const [loading, setLoading] = useState(true);

  // Load real task counts from Firebase
  useEffect(() => {
    if (!projectId) return;

    const loadTaskCounts = async () => {
      try {
        const counts = await getTaskCounts(projectId);
        setTaskSummary({
          total: counts.total,
          notStarted: counts.not_started,
          inProgress: counts.in_progress,
          completed: counts.completed,
        });
        setLoading(false);
      } catch (error) {
        console.error('Error loading task counts:', error);
        setLoading(false);
      }
    };

    loadTaskCounts();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadTaskCounts, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  const taskProgress = taskSummary.total > 0 ? taskSummary.completed / taskSummary.total : 0;
  const budgetProgress = mockData.resources.budgetSpent / mockData.resources.budgetTotal;

  // Chart data for task distribution
  const taskChartData = [
    {
      name: 'Completed',
      population: taskSummary.completed,
      color: constructionColors.complete,
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'In Progress',
      population: taskSummary.inProgress,
      color: constructionColors.inProgress,
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Not Started',
      population: taskSummary.notStarted,
      color: constructionColors.notStarted,
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];

  // Mock timeline data for delay prediction
  const timelineData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        data: [20, 45, 65, 80],
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Task Status Summary */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>Task Overview</Title>
              <Chip icon="chart-pie" style={styles.headerChip}>
                {taskSummary.total} Total
              </Chip>
            </View>
            
            {loading ? (
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <>
                <View style={styles.taskSummaryRow}>
                  <View style={styles.taskSummaryItem}>
                    <Paragraph style={styles.taskCount}>{taskSummary.completed}</Paragraph>
                    <Paragraph style={[styles.taskLabel, { color: constructionColors.complete }]}>
                      Completed
                    </Paragraph>
                  </View>
                  <View style={styles.taskSummaryItem}>
                    <Paragraph style={styles.taskCount}>{taskSummary.inProgress}</Paragraph>
                    <Paragraph style={[styles.taskLabel, { color: constructionColors.inProgress }]}>
                      In Progress
                    </Paragraph>
                  </View>
                  <View style={styles.taskSummaryItem}>
                    <Paragraph style={styles.taskCount}>{taskSummary.notStarted}</Paragraph>
                    <Paragraph style={[styles.taskLabel, { color: constructionColors.notStarted }]}>
                      Not Started
                    </Paragraph>
                  </View>
                </View>
              </>
            )}

            {!loading && (
              <>
                <View style={styles.progressSection}>
                  <Paragraph style={styles.progressLabel}>
                    Overall Progress: {Math.round(taskProgress * 100)}%
                  </Paragraph>
                  <ProgressBar 
                    progress={taskProgress} 
                    color={constructionColors.complete}
                    style={styles.progressBar}
                  />
                </View>

                {/* Pie Chart */}
                {taskSummary.total > 0 ? (
                  <PieChart
                    data={taskChartData}
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
                ) : (
                  <View style={{ padding: spacing.md, alignItems: 'center' }}>
                    <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
                      No tasks yet. Create your first task to get started!
                    </Paragraph>
                  </View>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Latest Photos Section */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>Recent Photo Uploads</Title>
              <IconButton 
                icon="camera" 
                size={20} 
                iconColor={theme.colors.primary}
              />
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photosContainer}>
                {mockData.recentPhotos.map((photo) => (
                  <View key={photo.id} style={styles.photoCard}>
                    <View style={styles.photoImageContainer}>
                      <View style={styles.photoPlaceholder}>
                        <IconButton icon="image" size={30} iconColor="#666" />
                      </View>
                      {photo.verified ? (
                        <Badge 
                          style={[styles.verificationBadge, { backgroundColor: constructionColors.complete }]}
                        >
                          ✓
                        </Badge>
                      ) : (
                        <Badge 
                          style={[styles.verificationBadge, { backgroundColor: constructionColors.warning }]}
                        >
                          !
                        </Badge>
                      )}
                    </View>
                    <Paragraph style={styles.photoClassification}>
                      {photo.classification}
                    </Paragraph>
                    <Paragraph style={styles.photoStatus}>
                      {photo.verified ? 'Verified' : 'Pending Review'}
                    </Paragraph>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Delay Risk Section */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>Project Timeline</Title>
              <Chip 
                icon="alert" 
                style={[styles.headerChip, { backgroundColor: constructionColors.warning }]}
              >
                {mockData.delayRisk.delayDays} days delay
              </Chip>
            </View>

            <View style={styles.delayInfo}>
              <Paragraph style={styles.delayText}>
                Estimated Completion: <strong>{mockData.delayRisk.estimatedCompletion}</strong>
              </Paragraph>
              <Paragraph style={[styles.riskLevel, { color: constructionColors.warning }]}>
                Risk Level: Medium
              </Paragraph>
            </View>

            <LineChart
              data={timelineData}
              width={screenWidth - 80}
              height={180}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Resource Snapshot */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>Resource Summary</Title>
              <IconButton 
                icon="wallet" 
                size={20} 
                iconColor={theme.colors.primary}
              />
            </View>

            <View style={styles.resourceRow}>
              <View style={styles.resourceItem}>
                <Paragraph style={styles.resourceLabel}>Budget Used</Paragraph>
                <Paragraph style={styles.resourceValue}>
                  ${(mockData.resources.budgetSpent / 1000).toFixed(0)}K
                </Paragraph>
                <ProgressBar 
                  progress={budgetProgress} 
                  color={budgetProgress > 0.8 ? constructionColors.warning : constructionColors.complete}
                  style={styles.resourceProgress}
                />
              </View>
              
              <View style={styles.resourceItem}>
                <Paragraph style={styles.resourceLabel}>Monthly Payroll</Paragraph>
                <Paragraph style={styles.resourceValue}>
                  ${(mockData.resources.payrollCurrent / 1000).toFixed(0)}K
                </Paragraph>
              </View>
            </View>

            {mockData.resources.inventoryAlerts > 0 && (
              <View style={styles.alertSection}>
                <Chip 
                  icon="alert-circle" 
                  style={[styles.alertChip, { backgroundColor: constructionColors.urgent }]}
                  textStyle={{ color: 'white' }}
                >
                  {mockData.resources.inventoryAlerts} Inventory Alerts
                </Chip>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Chat Messages Badge */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>Team Communication</Title>
              {mockData.unreadMessages > 0 && (
                <Badge 
                  style={[styles.messagesBadge, { backgroundColor: theme.colors.primary }]}
                >
                  {mockData.unreadMessages}
                </Badge>
              )}
            </View>
            
            <Paragraph style={styles.messagesText}>
              {mockData.unreadMessages > 0 
                ? `You have ${mockData.unreadMessages} unread messages`
                : 'All messages read'
              }
            </Paragraph>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    margin: spacing.md,
    elevation: 2,
    borderRadius: theme.roundness,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerChip: {
    backgroundColor: theme.colors.primary,
  },
  taskSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  taskSummaryItem: {
    alignItems: 'center',
  },
  taskCount: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  taskLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressLabel: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
    color: theme.colors.text,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoCard: {
    width: 120,
    alignItems: 'center',
  },
  photoImageContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: theme.roundness,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 24,
    height: 24,
  },
  photoClassification: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    textAlign: 'center',
    color: theme.colors.text,
  },
  photoStatus: {
    fontSize: fontSizes.xs,
    textAlign: 'center',
    color: theme.colors.placeholder,
  },
  delayInfo: {
    marginBottom: spacing.md,
  },
  delayText: {
    fontSize: fontSizes.md,
    marginBottom: spacing.xs,
  },
  riskLevel: {
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: theme.roundness,
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  resourceItem: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  resourceLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    marginBottom: spacing.xs,
  },
  resourceValue: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  resourceProgress: {
    height: 6,
    borderRadius: 3,
  },
  alertSection: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  alertChip: {
    backgroundColor: constructionColors.urgent,
  },
  messagesBadge: {
    backgroundColor: theme.colors.primary,
  },
  messagesText: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
  },
});


