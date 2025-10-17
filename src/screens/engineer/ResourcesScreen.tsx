import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  SegmentedButtons,
  Chip,
  ProgressBar,
  List,
  Divider,
  IconButton,
  DataTable,
  Badge 
} from 'react-native-paper';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResourceBudget, Worker, InventoryItem } from '../../types';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';

const screenWidth = Dimensions.get('window').width;

type TabType = 'budget' | 'inventory';

// Mock resource data
const mockBudgetData: ResourceBudget = {
  id: 'budget-1',
  projectId: 'project-1',
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


const mockInventory: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Portland Cement',
    currentStock: 45,
    minStock: 20,
    unit: 'bags',
    lastUpdated: '2024-01-22',
    cost: 12.50,
  },
  {
    id: 'inv-2',
    name: 'Steel Rebar',
    currentStock: 8,
    minStock: 15,
    unit: 'tons',
    lastUpdated: '2024-01-21',
    cost: 650.00,
  },
  {
    id: 'inv-3',
    name: 'Lumber 2x4',
    currentStock: 120,
    minStock: 50,
    unit: 'pieces',
    lastUpdated: '2024-01-23',
    cost: 8.75,
  },
  {
    id: 'inv-4',
    name: 'Electrical Wire',
    currentStock: 5,
    minStock: 10,
    unit: 'rolls',
    lastUpdated: '2024-01-20',
    cost: 85.00,
  },
  {
    id: 'inv-5',
    name: 'PVC Pipes',
    currentStock: 35,
    minStock: 25,
    unit: 'pieces',
    lastUpdated: '2024-01-22',
    cost: 15.25,
  },
];

export default function ResourcesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const { state } = useProjectData();

  // Calculate budget data from context
  const totalMaterialsCost = state.materials.reduce((sum, material) => sum + (material.quantity * material.price), 0);
  const totalWorkersCost = state.workers.reduce((sum, worker) => sum + worker.rate, 0);
  const totalEquipmentCost = state.equipment.filter(eq => eq.type === 'rental').reduce((sum, eq) => sum + (eq.dailyRate || 0), 0);
  const totalExpenses = state.budgetLogs.filter(log => log.type === 'expense').reduce((sum, log) => sum + log.amount, 0);
  const totalIncome = state.budgetLogs.filter(log => log.type === 'income').reduce((sum, log) => sum + log.amount, 0);
  
  const budgetUsagePercent = totalExpenses / state.totalBudget;
  const lowStockItems = state.materials.filter(material => material.quantity <= 10); // Simple low stock threshold

  // Pie chart data for budget breakdown
  const budgetChartData = [
    { name: 'Materials', population: totalMaterialsCost, color: '#2196F3', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Workers', population: totalWorkersCost, color: '#4CAF50', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Equipment', population: totalEquipmentCost, color: '#FF9800', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Other', population: totalExpenses - totalMaterialsCost - totalWorkersCost - totalEquipmentCost, color: '#F44336', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  ].filter(item => item.population > 0);

  // Bar chart data for budget vs spent
  const categories = [
    { name: 'Materials', allocated: state.totalBudget * 0.4, spent: totalMaterialsCost },
    { name: 'Workers', allocated: state.totalBudget * 0.3, spent: totalWorkersCost },
    { name: 'Equipment', allocated: state.totalBudget * 0.2, spent: totalEquipmentCost },
    { name: 'Other', allocated: state.totalBudget * 0.1, spent: Math.max(0, totalExpenses - totalMaterialsCost - totalWorkersCost - totalEquipmentCost) },
  ];
  
  const budgetBarData = {
    labels: categories.map(c => c.name.substring(0, 8)),
    datasets: [
      {
        data: categories.map(c => c.allocated / 1000),
        color: () => '#E3F2FD',
      },
      {
        data: categories.map(c => c.spent / 1000),
        color: () => '#2196F3',
      },
    ],
  };

  const renderBudgetTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Budget Overview */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.budgetHeader}>
            <Title style={styles.cardTitle}>Budget Overview</Title>
            <Chip 
              icon="wallet" 
              style={[
                styles.usageChip, 
                { backgroundColor: budgetUsagePercent > 0.8 ? constructionColors.urgent : constructionColors.complete }
              ]}
              textStyle={{ color: 'white' }}
            >
              {Math.round(budgetUsagePercent * 100)}% Used
            </Chip>
          </View>

          <View style={styles.budgetSummary}>
            <View style={styles.budgetItem}>
              <Paragraph style={styles.budgetLabel}>Total Budget</Paragraph>
              <Paragraph style={styles.budgetValue}>
                ${(state.totalBudget / 1000).toFixed(0)}K
              </Paragraph>
            </View>
            <View style={styles.budgetItem}>
              <Paragraph style={styles.budgetLabel}>Spent</Paragraph>
              <Paragraph style={[styles.budgetValue, { color: constructionColors.urgent }]}>
                ${(totalExpenses / 1000).toFixed(0)}K
              </Paragraph>
            </View>
            <View style={styles.budgetItem}>
              <Paragraph style={styles.budgetLabel}>Remaining</Paragraph>
              <Paragraph style={[styles.budgetValue, { color: constructionColors.complete }]}>
                ${((state.totalBudget - totalExpenses) / 1000).toFixed(0)}K
              </Paragraph>
            </View>
          </View>

          <ProgressBar 
            progress={budgetUsagePercent} 
            color={budgetUsagePercent > 0.8 ? constructionColors.urgent : theme.colors.primary}
            style={styles.budgetProgress}
          />
        </Card.Content>
      </Card>

      {/* Budget Breakdown Pie Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Spending by Category</Title>
          
          <PieChart
            data={budgetChartData}
            width={screenWidth - 80}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>

      {/* Category Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Budget vs Actual by Category</Title>
          
          <BarChart
            data={budgetBarData}
            width={screenWidth - 80}
            height={220}
            yAxisLabel="$"
            yAxisSuffix="K"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            style={styles.chart}
          />

          <View style={styles.categoryList}>
            {mockBudgetData.categories.map((category, index) => {
              const usagePercent = category.spent / category.allocated;
              return (
                <View key={index}>
                  <View style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <Paragraph style={styles.categoryName}>{category.name}</Paragraph>
                      <Paragraph style={styles.categoryUsage}>
                        {Math.round(usagePercent * 100)}%
                      </Paragraph>
                    </View>
                    <View style={styles.categoryAmounts}>
                      <Paragraph style={styles.categorySpent}>
                        Spent: ${(category.spent / 1000).toFixed(0)}K
                      </Paragraph>
                      <Paragraph style={styles.categoryBudget}>
                        Budget: ${(category.allocated / 1000).toFixed(0)}K
                      </Paragraph>
                    </View>
                    <ProgressBar 
                      progress={usagePercent} 
                      color={usagePercent > 0.9 ? constructionColors.urgent : theme.colors.primary}
                      style={styles.categoryProgress}
                    />
                  </View>
                  {index < mockBudgetData.categories.length - 1 && <Divider />}
                </View>
              );
            })}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );


  const renderInventoryTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Inventory Alerts */}
      {lowStockItems.length > 0 && (
        <Card style={[styles.card, styles.alertCard]}>
          <Card.Content>
            <View style={styles.alertHeader}>
              <IconButton 
                icon="alert-circle" 
                size={24} 
                iconColor={constructionColors.urgent}
              />
              <Title style={[styles.cardTitle, { color: constructionColors.urgent }]}>
                Low Stock Alerts
              </Title>
              <Badge 
                style={[styles.alertBadge, { backgroundColor: constructionColors.urgent }]}
              >
                {lowStockItems.length}
              </Badge>
            </View>
            
            {lowStockItems.map((item, index) => (
              <View key={item.id}>
                <View style={styles.alertItem}>
                  <Paragraph style={styles.alertItemName}>{item.name}</Paragraph>
                  <Paragraph style={styles.alertItemStock}>
                    {item.currentStock} {item.unit} remaining (Min: {item.minStock})
                  </Paragraph>
                </View>
                {index < lowStockItems.length - 1 && <Divider />}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Inventory Overview */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.inventoryHeader}>
            <Title style={styles.cardTitle}>Inventory Management</Title>
            <IconButton 
              icon="plus" 
              size={24} 
              iconColor={theme.colors.primary}
              onPress={() => Alert.alert('Add Materials', 'Use the Project Tools page to manage materials inventory.', [{ text: 'OK' }])}
            />
          </View>

          <View style={styles.inventorySummary}>
            <View style={styles.summaryItem}>
              <Paragraph style={styles.summaryLabel}>Total Items</Paragraph>
              <Paragraph style={styles.summaryValue}>{mockInventory.length}</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Paragraph style={styles.summaryLabel}>Low Stock</Paragraph>
              <Paragraph style={[styles.summaryValue, { color: constructionColors.urgent }]}>
                {lowStockItems.length}
              </Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Paragraph style={styles.summaryLabel}>Total Value</Paragraph>
              <Paragraph style={styles.summaryValue}>
                ${mockInventory.reduce((sum, item) => sum + (item.currentStock * item.cost), 0).toLocaleString()}
              </Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Inventory List */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Current Inventory</Title>
          
          {mockInventory.map((item, index) => {
            const isLowStock = item.currentStock <= item.minStock;
            const stockPercent = item.currentStock / (item.minStock * 2); // Assuming good stock is 2x min stock
            
            return (
              <View key={item.id}>
                <View style={styles.inventoryItem}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Paragraph style={styles.itemName}>{item.name}</Paragraph>
                      <Paragraph style={styles.itemUnit}>
                        {item.currentStock} {item.unit} • ${item.cost.toFixed(2)} each
                      </Paragraph>
                    </View>
                    
                    {isLowStock && (
                      <Chip 
                        icon="alert" 
                        style={[styles.lowStockChip, { backgroundColor: constructionColors.urgent }]}
                        textStyle={{ color: 'white', fontSize: 12 }}
                      >
                        LOW
                      </Chip>
                    )}
                  </View>
                  
                  <View style={styles.stockInfo}>
                    <View style={styles.stockLevels}>
                      <Paragraph style={styles.stockCurrent}>
                        Current: {item.currentStock} {item.unit}
                      </Paragraph>
                      <Paragraph style={styles.stockMin}>
                        Min: {item.minStock} {item.unit}
                      </Paragraph>
                    </View>
                    
                    <ProgressBar 
                      progress={Math.min(stockPercent, 1)} 
                      color={isLowStock ? constructionColors.urgent : constructionColors.complete}
                      style={styles.stockProgress}
                    />
                  </View>
                  
                  <View style={styles.itemFooter}>
                    <Paragraph style={styles.lastUpdated}>
                      Updated: {new Date(item.lastUpdated).toLocaleDateString()}
                    </Paragraph>
                    <Paragraph style={styles.itemValue}>
                      Value: ${(item.currentStock * item.cost).toFixed(2)}
                    </Paragraph>
                  </View>
                </View>
                {index < mockInventory.length - 1 && <Divider />}
              </View>
            );
          })}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'budget':
        return renderBudgetTab();
      case 'inventory':
        return renderInventoryTab();
      default:
        return renderBudgetTab();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Title style={styles.screenTitle}>Resource Management</Title>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabType)}
          buttons={[
            { value: 'budget', label: 'Budget', icon: 'wallet' },
            { value: 'inventory', label: 'Inventory', icon: 'package-variant' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'white',
    elevation: 1,
  },
  screenTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'white',
  },
  segmentedButtons: {
    marginBottom: spacing.sm,
  },
  content: {
    flex: 1,
  },
  card: {
    margin: spacing.md,
    elevation: 2,
    borderRadius: theme.roundness,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  
  // Budget styles
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  usageChip: {
    height: 32,
  },
  budgetSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  budgetItem: {
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    marginBottom: spacing.xs,
  },
  budgetValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  budgetProgress: {
    height: 8,
    borderRadius: 4,
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: theme.roundness,
  },
  categoryList: {
    marginTop: spacing.md,
  },
  categoryItem: {
    paddingVertical: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
  categoryUsage: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  categoryAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  categorySpent: {
    fontSize: fontSizes.sm,
    color: constructionColors.urgent,
  },
  categoryBudget: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
  },
  categoryProgress: {
    height: 6,
    borderRadius: 3,
  },
  
  
  // Inventory styles
  alertCard: {
    backgroundColor: '#ffebee',
    borderColor: constructionColors.urgent,
    borderWidth: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  alertBadge: {
    marginLeft: 'auto',
  },
  alertItem: {
    paddingVertical: spacing.sm,
  },
  alertItemName: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: constructionColors.urgent,
  },
  alertItemStock: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  inventorySummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  inventoryItem: {
    paddingVertical: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
  itemUnit: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
  },
  lowStockChip: {
    height: 24,
  },
  stockInfo: {
    marginBottom: spacing.sm,
  },
  stockLevels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stockCurrent: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: theme.colors.text,
  },
  stockMin: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
  },
  stockProgress: {
    height: 6,
    borderRadius: 3,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lastUpdated: {
    fontSize: fontSizes.xs,
    color: theme.colors.placeholder,
    fontStyle: 'italic',
  },
  itemValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: constructionColors.complete,
  },
});


