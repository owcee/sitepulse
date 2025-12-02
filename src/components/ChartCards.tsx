import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, ProgressBar, Chip } from 'react-native-paper';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import { theme, constructionColors, spacing, fontSizes } from '../utils/theme';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 60; // Account for card padding

interface ChartCardProps {
  onPress?: () => void;
}

interface BudgetData {
  totalBudget: number;
  totalSpent: number;
  categories: Array<{ name: string; allocatedAmount: number; spentAmount: number }>;
}

// Task Management Chart Card
export const TaskManagementChart: React.FC<ChartCardProps> = ({ onPress }) => {
  // This would come from actual data in real implementation
  const taskData = {
    total: 45,
    completed: 15,
    inProgress: 18,
    notStarted: 12,
  };

  const taskProgress = taskData.completed / taskData.total;

  const taskChartData = [
    {
      name: 'Completed',
      population: taskData.completed,
      color: constructionColors.complete,
              legendFontColor: theme.colors.onSurfaceVariant,
      legendFontSize: 12,
    },
    {
      name: 'In Progress',
      population: taskData.inProgress,
      color: constructionColors.inProgress,
              legendFontColor: theme.colors.onSurfaceVariant,
      legendFontSize: 12,
    },
    {
      name: 'Not Started',
      population: taskData.notStarted,
      color: constructionColors.notStarted,
              legendFontColor: theme.colors.onSurfaceVariant,
      legendFontSize: 12,
    },
  ];

  return (
    <TouchableOpacity onPress={onPress} style={styles.chartCard}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>Task Management</Title>
            <Chip icon="chart-pie" style={styles.headerChip}>
              {taskData.total} Total
            </Chip>
          </View>

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

          <PieChart
            data={taskChartData}
            width={chartWidth}
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor="population"
            backgroundColor={theme.colors.surface}
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

// Task Delay Summary Chart Card
interface DelayChartProps extends ChartCardProps {
  delayData?: {
    onSchedule: number;
    atRisk: number;
    delayed: number;
    total: number;
  };
}

export const DelayPredictionChart: React.FC<DelayChartProps> = ({ onPress, delayData }) => {
  // Use provided data or fallback to zeros
  const taskDelayData = delayData || {
    onSchedule: 0,
    atRisk: 0,
    delayed: 0,
    total: 0,
  };

  const tasksWithDelays = taskDelayData.atRisk + taskDelayData.delayed;
  
  const taskStatusData = [
    {
      name: 'On Schedule',
      population: taskDelayData.onSchedule,
      color: constructionColors.complete,
              legendFontColor: theme.colors.onSurfaceVariant,
      legendFontSize: 12,
    },
    {
      name: 'At Risk',
      population: taskDelayData.atRisk,
      color: constructionColors.warning,
              legendFontColor: theme.colors.onSurfaceVariant,
      legendFontSize: 12,
    },
    {
      name: 'Delayed',
      population: taskDelayData.delayed,
      color: constructionColors.urgent,
              legendFontColor: theme.colors.onSurfaceVariant,
      legendFontSize: 12,
    },
  ].filter(item => item.population > 0);

  return (
    <TouchableOpacity onPress={onPress} style={styles.chartCard}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>Task Delays</Title>
            <Chip 
              icon={tasksWithDelays > 0 ? "alert" : "check-circle"} 
              style={[
                styles.headerChip, 
                { backgroundColor: tasksWithDelays > 0 ? constructionColors.warning : constructionColors.complete }
              ]}
              textStyle={styles.headerChipText}
            >
              {tasksWithDelays} affected
            </Chip>
          </View>

          <View style={styles.progressSection}>
            <Paragraph style={styles.progressLabel}>
              Tasks on schedule: {taskDelayData.onSchedule} of {taskDelayData.total}
            </Paragraph>
            <ProgressBar 
              progress={taskDelayData.total > 0 ? taskDelayData.onSchedule / taskDelayData.total : 0} 
              color={constructionColors.complete}
              style={styles.progressBar}
            />
          </View>

          <Paragraph style={styles.chartDescription}>
            Current task delay status breakdown
          </Paragraph>

          {taskStatusData.length > 0 ? (
            <PieChart
              data={taskStatusData}
              width={chartWidth}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              }}
              accessor="population"
              backgroundColor={theme.colors.surface}
              paddingLeft="15"
              absolute
            />
          ) : (
            <View style={styles.emptyChartContainer}>
              <Paragraph style={styles.emptyChartText}>
                No active tasks to display
              </Paragraph>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

// Budget Chart Card
interface BudgetChartProps extends ChartCardProps {
  budgetData?: BudgetData;
}

export const BudgetChart: React.FC<BudgetChartProps> = ({ onPress, budgetData: propBudgetData }) => {
  // Use provided budget data or fallback to defaults
  const defaultBudgetData: BudgetData = {
    totalBudget: 250000,
    totalSpent: 0,
    categories: [
      { name: 'Equipment', allocatedAmount: 50000, spentAmount: 0 },
      { name: 'Materials', allocatedAmount: 150000, spentAmount: 0 },
    ],
  };

  const budgetData = propBudgetData || defaultBudgetData;
  const budgetUsagePercent = budgetData.totalBudget > 0 ? budgetData.totalSpent / budgetData.totalBudget : 0;

  const budgetChartData = budgetData.categories
    .filter(cat => cat.spentAmount > 0)
    .map((category, index) => ({
      name: category.name,
      population: category.spentAmount,
      color: [
        '#FF9800', '#2196F3', '#4CAF50', '#F44336', '#9C27B0'
      ][index % 5],
      legendFontColor: '#FFFFFF',
      legendFontSize: 12,
    }));

  return (
    <TouchableOpacity onPress={onPress} style={styles.chartCard}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>Budget Overview</Title>
            <Chip 
              icon="wallet"
              style={[
                styles.headerChip,
                { backgroundColor: budgetUsagePercent > 0.8 ? constructionColors.urgent : constructionColors.complete }
              ]}
              textStyle={styles.headerChipText}
            >
              {Math.round(budgetUsagePercent * 100)}% used
            </Chip>
          </View>

          <View style={styles.budgetSummary}>
            <Paragraph style={styles.budgetText}>
              Spent: ₱{budgetData.totalSpent.toLocaleString()} / ₱{budgetData.totalBudget.toLocaleString()}
            </Paragraph>
            <ProgressBar 
              progress={budgetUsagePercent} 
              color={budgetUsagePercent > 0.8 ? constructionColors.urgent : constructionColors.complete}
              style={styles.progressBar}
            />
          </View>

          <PieChart
            data={budgetChartData}
            width={chartWidth}
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              strokeWidth: 2,
            }}
            accessor="population"
            backgroundColor={theme.colors.surface}
            paddingLeft="15"
            absolute
            hasLegend={true}
          />
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chartCard: {
    width: screenWidth - 20,
    marginHorizontal: 10,
  },
  card: {
    backgroundColor: theme.colors.surface,
    elevation: 4,
    marginVertical: spacing.sm,
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
  headerChipText: {
    fontSize: 12,
    color: 'white',
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  chartDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  budgetSummary: {
    marginBottom: spacing.md,
  },
  budgetText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  emptyChartContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});


