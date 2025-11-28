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
export const DelayPredictionChart: React.FC<ChartCardProps> = ({ onPress }) => {
  // This would come from actual task data in real implementation
  const taskDelayData = {
    onSchedule: 2,
    atRisk: 1,
    delayed: 1,
    total: 4,
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
              progress={taskDelayData.onSchedule / taskDelayData.total} 
              color={constructionColors.complete}
              style={styles.progressBar}
            />
          </View>

          <Paragraph style={styles.chartDescription}>
            Current task delay status breakdown
          </Paragraph>

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
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

// Budget Chart Card
export const BudgetChart: React.FC<ChartCardProps> = ({ onPress }) => {
  // This would come from actual data in real implementation
  const budgetData = {
    totalBudget: 850000,
    spentAmount: 425000,
    categories: [
      { name: 'Materials', allocated: 400000, spent: 220000 },
      { name: 'Labor', allocated: 300000, spent: 150000 },
      { name: 'Equipment', allocated: 100000, spent: 45000 },
      { name: 'Permits', allocated: 30000, spent: 8000 },
      { name: 'Other', allocated: 20000, spent: 2000 },
    ],
  };

  const budgetUsagePercent = budgetData.spentAmount / budgetData.totalBudget;

  const budgetChartData = budgetData.categories.map((category, index) => ({
    name: category.name,
    population: category.spent,
    color: [
      '#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0'
    ][index % 5],
    legendFontColor: '#7F7F7F',
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
              Spent: ₱{budgetData.spentAmount.toLocaleString()} / ₱{budgetData.totalBudget.toLocaleString()}
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
});


