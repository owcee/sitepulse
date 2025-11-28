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
  Badge,
  Button
} from 'react-native-paper';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import { exportBudgetToPDF, exportMaterialsToPDF } from '../../services/pdfExportService';
import { getProject } from '../../services/projectService';

const screenWidth = Dimensions.get('window').width;

type TabType = 'budget' | 'inventory';

export default function ResourcesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const [isExporting, setIsExporting] = useState(false);
  const { state, projectId } = useProjectData();

  // Calculate budget data matching Budget Management page
  const equipmentSpent = state.equipment.reduce((total, equip) => {
    if (equip.type === 'rental' && equip.rentalCost) {
      return total + equip.rentalCost;
    }
    return total;
  }, 0);

  const materialsSpent = state.materials.reduce((total, material) => {
    return total + (material.quantity * material.price);
  }, 0);

  // Budget allocations from Budget Management (matching the default values)
  const equipmentAllocated = 50000; // ₱50,000
  const materialsAllocated = 150000; // ₱150,000
  const totalBudget = 250000; // ₱250,000
  const totalSpent = equipmentSpent + materialsSpent;
  
  const budgetUsagePercent = totalSpent / totalBudget;
  
  // Combined low stock items from materials and equipment
  const lowStockMaterials = state.materials
    .filter(material => material.quantity <= 10)
    .map(material => ({
      ...material,
      currentStock: material.quantity,
      minStock: 10,
      type: 'material' as const,
    }));

  const lowStockEquipment = state.equipment
    .filter(equip => equip.status === 'maintenance')
    .map(equip => ({
      ...equip,
      name: equip.name,
      type: 'equipment' as const,
    }));

  // Pie chart data for budget breakdown
  const budgetChartData = [
    { name: 'Equipment', population: equipmentSpent, color: '#FF9800', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Materials', population: materialsSpent, color: '#2196F3', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  ].filter(item => item.population > 0);

  // Bar chart data for budget vs spent (matching Budget Management)
  const categories = [
    { name: 'Equipment', allocated: equipmentAllocated, spent: equipmentSpent },
    { name: 'Materials', allocated: materialsAllocated, spent: materialsSpent },
  ];
  
  const budgetBarData = {
    labels: categories.map(c => c.name.substring(0, 8)),
    datasets: [
      {
        data: categories.map(c => c.allocated / 1000),
      },
      {
        data: categories.map(c => c.spent / 1000),
      },
    ],
    legend: ['Allocated', 'Spent'],
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
              textStyle={styles.usageChipText}
            >
              {Math.round(budgetUsagePercent * 100)}% Used
            </Chip>
          </View>

          <View style={styles.budgetSummary}>
            <View style={styles.budgetItem}>
              <Paragraph style={styles.budgetLabel}>Total Budget</Paragraph>
              <Paragraph style={styles.budgetValue}>
                ₱{(totalBudget / 1000).toFixed(0)}K
              </Paragraph>
            </View>
            <View style={styles.budgetItem}>
              <Paragraph style={styles.budgetLabel}>Spent</Paragraph>
              <Paragraph style={[styles.budgetValue, { color: constructionColors.urgent }]}>
                ₱{(totalSpent / 1000).toFixed(0)}K
              </Paragraph>
            </View>
            <View style={styles.budgetItem}>
              <Paragraph style={styles.budgetLabel}>Remaining</Paragraph>
              <Paragraph style={[styles.budgetValue, { color: constructionColors.complete }]}>
                ₱{((totalBudget - totalSpent) / 1000).toFixed(0)}K
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
            backgroundColor={theme.colors.surface}
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>

      {/* Category Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Budget by Category</Title>
          
          <View style={styles.categoryList}>
            {categories.map((category, index) => {
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
                        Spent: ₱{(category.spent / 1000).toFixed(0)}K
                      </Paragraph>
                      <Paragraph style={styles.categoryBudget}>
                        Budget: ₱{(category.allocated / 1000).toFixed(0)}K
                      </Paragraph>
                    </View>
                    <ProgressBar 
                      progress={usagePercent} 
                      color={usagePercent > 0.9 ? constructionColors.urgent : theme.colors.primary}
                      style={styles.categoryProgress}
                    />
                  </View>
                  {index < categories.length - 1 && <Divider />}
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
      {(lowStockMaterials.length > 0 || lowStockEquipment.length > 0) && (
        <Card style={[styles.card, styles.alertCard]}>
          <Card.Content>
            <View style={styles.alertHeader}>
              <IconButton 
                icon="alert-circle" 
                size={24} 
                iconColor={constructionColors.urgent}
              />
              <Title style={[styles.cardTitle, { color: constructionColors.urgent }]}>
                Low Stock & Maintenance Alerts
              </Title>
              <Badge 
                style={[styles.alertBadge, { backgroundColor: constructionColors.urgent }]}
              >
                {lowStockMaterials.length + lowStockEquipment.length}
              </Badge>
            </View>
            
            {lowStockMaterials.map((item, index) => (
              <View key={item.id}>
                <View style={styles.alertItem}>
                  <Paragraph style={styles.alertItemName}>{item.name} (Material)</Paragraph>
                  <Paragraph style={styles.alertItemStock}>
                    {item.currentStock} {item.unit} remaining (Min: {item.minStock})
                  </Paragraph>
                </View>
                {(index < lowStockMaterials.length - 1 || lowStockEquipment.length > 0) && <Divider />}
              </View>
            ))}
            
            {lowStockEquipment.map((item, index) => (
              <View key={item.id}>
                <View style={styles.alertItem}>
                  <Paragraph style={styles.alertItemName}>{item.name} (Equipment)</Paragraph>
                  <Paragraph style={styles.alertItemStock}>
                    Needs Maintenance
                  </Paragraph>
                </View>
                {index < lowStockEquipment.length - 1 && <Divider />}
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
              <Paragraph style={styles.summaryLabel}>Materials</Paragraph>
              <Paragraph style={styles.summaryValue}>{state.materials.length}</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Paragraph style={styles.summaryLabel}>Equipment</Paragraph>
              <Paragraph style={styles.summaryValue}>{state.equipment.length}</Paragraph>
            </View>
            <View style={styles.summaryItem}>
              <Paragraph style={styles.summaryLabel}>Alerts</Paragraph>
              <Paragraph style={[styles.summaryValue, { color: constructionColors.urgent }]}>
                {lowStockMaterials.length + lowStockEquipment.length}
              </Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Inventory List */}
      <Card style={styles.card}>
        <Card.Content style={{ overflow: 'visible' }}>
          <Title style={styles.cardTitle}>Materials ({state.materials.length})</Title>
          
          {state.materials.length === 0 ? (
            <Paragraph style={styles.emptyText}>No materials in inventory</Paragraph>
          ) : (
            state.materials.map((item, index) => {
              const isLowStock = item.quantity <= 10;
              const totalValue = item.quantity * item.price;
              
              return (
                <View key={item.id}>
                  <View style={styles.inventoryItem}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemInfo}>
                        <Paragraph style={styles.itemName}>{item.name}</Paragraph>
                        <Paragraph style={styles.itemUnit}>
                          {item.quantity} {item.unit} • ₱{item.price.toFixed(2)} each
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

                    <View style={styles.itemFooter}>
                      <Paragraph style={styles.itemValue}>
                        Total Value: ₱{totalValue.toLocaleString()}
                      </Paragraph>
                    </View>
                  </View>
                  {index < state.materials.length - 1 && <Divider />}
                </View>
              );
            })
          )}
        </Card.Content>
      </Card>

      {/* Equipment List */}
      <Card style={styles.card}>
        <Card.Content style={{ overflow: 'visible' }}>
          <Title style={styles.cardTitle}>Equipment ({state.equipment.length})</Title>
          
          {state.equipment.length === 0 ? (
            <Paragraph style={styles.emptyText}>No equipment in inventory</Paragraph>
          ) : (
            state.equipment.map((item, index) => {
              const needsMaintenance = item.status === 'maintenance';
              const statusColor = item.status === 'available' ? constructionColors.complete : 
                                 item.status === 'in_use' ? constructionColors.inProgress : 
                                 constructionColors.urgent;
              
              return (
                <View key={item.id}>
                  <View style={styles.inventoryItem}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemInfo}>
                        <Paragraph style={styles.itemName}>{item.name}</Paragraph>
                        <Paragraph style={styles.itemUnit}>
                          {item.category} • {item.type === 'rental' ? 'Rental' : 'Owned'}
                        </Paragraph>
                      </View>
                      
                      <Chip 
                        style={[styles.lowStockChip, { backgroundColor: statusColor }]}
                        textStyle={styles.statusChipText}
                      >
                        {item.status.replace('_', ' ').toUpperCase()}
                      </Chip>
                    </View>

                    <View style={styles.itemFooter}>
                      {item.type === 'rental' && item.rentalCost && (
                        <Paragraph style={styles.itemValue}>
                          Rental Cost: ₱{item.rentalCost.toLocaleString()}
                        </Paragraph>
                      )}
                      <Paragraph style={styles.itemUnit}>
                        Condition: {item.condition.replace('_', ' ')}
                      </Paragraph>
                    </View>
                  </View>
                  {index < state.equipment.length - 1 && <Divider />}
                </View>
              );
            })
          )}
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

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Get project info
      let projectName = 'Construction Project';
      let projectDescription = 'Budget and inventory report';
      
      if (projectId) {
        try {
          const project = await getProject(projectId);
          if (project) {
            projectName = project.name || projectName;
            projectDescription = project.description || projectDescription;
          }
        } catch (error) {
          console.error('Error loading project info:', error);
        }
      }

      if (activeTab === 'budget') {
        // Export budget data
        console.log('Resources Screen - Total budget logs in state:', state.budgetLogs.length);
        console.log('Resources Screen - Budget logs:', JSON.stringify(state.budgetLogs, null, 2));
        
        const budgetLogs = state.budgetLogs
          .filter(log => {
            const isValid = log && log.type === 'expense' && log.amount > 0;
            if (!isValid) {
              console.log('Resources Screen - Filtering out log:', log);
            }
            return isValid;
          })
          .map(log => {
            // Normalize category - ensure it's a valid string
            let category = log.category || 'other';
            if (typeof category !== 'string') {
              category = 'other';
            }
            category = String(category).trim().toLowerCase();
            if (!category || category === '') {
              category = 'other';
            }
            // Capitalize first letter
            const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
            
            console.log('Resources Screen - Processing log:', {
              originalCategory: log.category,
              normalizedCategory: category,
              capitalizedCategory: capitalizedCategory,
              amount: log.amount
            });
            
            return {
              id: log.id,
              category: capitalizedCategory, // Pass capitalized to PDF service
              amount: log.amount || 0,
              description: (log.description || 'No description').trim(),
              date: log.date || new Date().toISOString(),
              addedBy: 'Engineer'
            };
          });
        
        console.log('Resources Screen - Filtered budget logs for PDF:', budgetLogs.length);
        console.log('Resources Screen - Budget logs for PDF:', JSON.stringify(budgetLogs, null, 2));

        const projectInfo = {
          name: projectName,
          description: projectDescription,
          totalBudget: totalBudget,
          contingencyPercentage: 10
        };

        await exportBudgetToPDF(budgetLogs, projectInfo, totalSpent);
      } else {
        // Export inventory data (materials and equipment)
        const materials = state.materials.map(material => ({
          id: material.id,
          name: material.name,
          quantity: material.quantity,
          unit: material.unit,
          price: material.price,
          category: material.category || 'General',
          supplier: material.supplier,
          dateAdded: material.dateAdded || new Date().toISOString()
        }));

        const equipment = state.equipment.map(equip => ({
          id: equip.id,
          name: equip.name,
          type: equip.type,
          category: equip.category || 'General',
          condition: equip.condition,
          rentalCost: equip.rentalCost,
          status: equip.status,
          dateAcquired: equip.dateAcquired || new Date().toISOString()
        }));

        const projectInfo = {
          name: projectName,
          description: projectDescription
        };

        await exportMaterialsToPDF(materials, projectInfo, 10, equipment);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', error?.message || 'Unable to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Title style={styles.screenTitle}>Resource Management</Title>
        </View>
        <Button
          mode="contained"
          icon="file-pdf-box"
          onPress={handleExportPDF}
          loading={isExporting}
          disabled={isExporting}
          style={styles.exportButton}
          labelStyle={{ fontSize: 13 }}
        >
          Export PDF
        </Button>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: theme.colors.background,
    elevation: 0,
  },
  headerLeft: {
    flex: 1,
  },
  screenTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  exportButton: {
    marginLeft: spacing.sm,
    backgroundColor: theme.colors.primary,
  },
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: theme.colors.background,
  },
  segmentedButtons: {
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  content: {
    flex: 1,
  },
  card: {
    margin: spacing.md,
    elevation: 2,
    borderRadius: theme.roundness,
    overflow: 'visible',
    backgroundColor: theme.colors.surface,
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
    minWidth: 100,
    paddingHorizontal: spacing.sm,
  },
  usageChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
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
    color: theme.colors.onSurfaceVariant,
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
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurface,
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
    color: theme.colors.onSurfaceVariant,
  },
  categoryProgress: {
    height: 6,
    borderRadius: 3,
  },
  
  
  // Inventory styles
  alertCard: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
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
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  inventoryItem: {
    paddingVertical: spacing.md,
    overflow: 'visible',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    overflow: 'visible',
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.sm,
    maxWidth: '70%',
  },
  itemName: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
  itemUnit: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  lowStockChip: {
    minWidth: 120,
    height: 34,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
  },
  statusChipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    letterSpacing: 0.3,
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
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  itemValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: constructionColors.complete,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontStyle: 'italic',
  },
});

