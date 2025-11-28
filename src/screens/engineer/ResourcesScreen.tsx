import React, { useState, useEffect, useRef } from 'react';
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
  Button,
  Dialog,
  Portal
} from 'react-native-paper';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import { exportBudgetToPDF, exportMaterialsToPDF } from '../../services/pdfExportService';
import { getProject } from '../../services/projectService';
import { getBudget } from '../../services/firebaseDataService';

const screenWidth = Dimensions.get('window').width;

type TabType = 'budget' | 'inventory';

export default function ResourcesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { state, projectId, setBudget } = useProjectData();
  
  // Load budget from Firebase on mount if not in shared state
  // This ensures budget is available even if ProjectDataContext hasn't loaded it yet
  useEffect(() => {
    if (!projectId) return;
    
    // Only load if budget is not in state or if it's empty/undefined
    if (state.budget && state.budget.categories && state.budget.categories.length > 0) {
      return; // Budget already loaded
    }
    
    let isMounted = true;
    const loadBudget = async () => {
      try {
        const savedBudget = await getBudget(projectId);
        if (isMounted && savedBudget) {
          setBudget(savedBudget);
          console.log('✅ Budget loaded in ResourcesScreen');
        }
      } catch (error) {
        console.error('Error loading budget in ResourcesScreen:', error);
      }
    };
    
    loadBudget();
    return () => { isMounted = false; };
  }, [projectId, state.budget]); // Run when projectId changes or if budget is not loaded

  // Get budget from shared state (from BudgetLogsManagementPage)
  // If not available, calculate from inventory
  const calculateEquipmentSpent = () => {
    return state.equipment.reduce((total, equip) => {
      if (equip.type === 'rental' && equip.rentalCost) {
        return total + equip.rentalCost;
      }
      return total;
    }, 0);
  };

  const calculateMaterialsSpent = () => {
    return state.materials.reduce((total, material) => {
      // Use totalBought if available, otherwise use quantity
      const quantity = material.totalBought || material.quantity;
      return total + (quantity * material.price);
    }, 0);
  };

  // ALWAYS use shared budget from BudgetLogsManagementPage - no fallback calculations
  // This ensures consistency across all screens
  const budget = state.budget;
  
  // If budget is not loaded yet, show loading state or use defaults
  // But never recalculate from inventory as that causes inconsistencies
  let totalBudget = budget?.totalBudget || 250000;
  let totalSpent = budget?.totalSpent || 0;
  let categories: Array<{ name: string; allocated: number; spent: number }> = [];
  
  if (budget && budget.categories.length > 0) {
    // Use budget from BudgetLogsManagementPage (single source of truth)
    totalBudget = budget.totalBudget;
    totalSpent = budget.totalSpent;
    categories = budget.categories.map(cat => ({
      name: cat.name,
      allocated: cat.allocatedAmount,
      spent: cat.spentAmount,
    }));
  } else {
    // Only use defaults if budget hasn't been loaded yet
    // This will be updated once BudgetLogsManagementPage loads the budget
    categories = [
      { name: 'Equipment', allocated: 50000, spent: 0 },
      { name: 'Materials', allocated: 150000, spent: 0 },
    ];
  }
  
  const budgetUsagePercent = totalBudget > 0 ? totalSpent / totalBudget : 0;
  
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

  // Pie chart data for budget breakdown (from all categories)
  // Format: Category name only (no amount)
  const budgetChartData = categories
    .filter(cat => cat.spent > 0)
    .map((cat, index) => ({
      name: cat.name,
      population: cat.spent,
      color: index === 0 ? '#FF9800' : index === 1 ? '#2196F3' : '#4CAF50',
      legendFontColor: '#FFFFFF',
      legendFontSize: 12,
    }));

  // Bar chart data for budget vs spent (matching Budget Management)
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
            key={`pie-${budget?.lastUpdated?.getTime() || Date.now()}`}
            data={budgetChartData}
            width={screenWidth - 80}
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
        // Export budget data using categories from shared budget state
        // Generate budget logs from categories for PDF export
        const budgetLogs: any[] = [];
        
        // First, add all budget logs from state (these include all categories)
        state.budgetLogs.forEach(log => {
          if (log.type === 'expense' && log.amount > 0) {
            budgetLogs.push({
              id: log.id,
              category: log.category || 'other',
              amount: log.amount,
              description: log.description || 'No description',
              date: log.date || new Date().toISOString().split('T')[0],
              addedBy: 'Engineer'
            });
          }
        });
        
        // If we have shared budget state, ensure all categories are represented
        if (budget && budget.categories) {
          // Track which categories already have logs
          const categoriesWithLogs = new Set(
            budgetLogs.map(log => log.category.toLowerCase())
          );
          
          // For each category in the budget, ensure it has at least one log entry
          budget.categories.forEach(cat => {
            const categoryName = cat.name.toLowerCase();
            
            // Skip if this category already has logs
            if (categoriesWithLogs.has(categoryName)) {
              return;
            }
            
            // For primary categories (Equipment, Materials), generate logs from inventory
            if (cat.id === 'equipment' && cat.spentAmount > 0) {
              // Add logs from equipment
              state.equipment.forEach(equipment => {
                if (equipment.type === 'rental' && equipment.rentalCost && equipment.rentalCost > 0) {
                  budgetLogs.push({
                    id: `equipment-${equipment.id}`,
                    category: 'equipment',
                    amount: equipment.rentalCost,
                    description: `${equipment.name} - Rental`,
                    date: equipment.dateAcquired || new Date().toISOString().split('T')[0],
                    addedBy: 'System'
                  });
                }
              });
            } else if (cat.id === 'materials' && cat.spentAmount > 0) {
              // Add logs from materials
              state.materials.forEach(material => {
                if (material.quantity > 0 && material.price > 0) {
                  budgetLogs.push({
                    id: `material-${material.id}`,
                    category: 'materials',
                    amount: material.quantity * material.price,
                    description: `${material.name} - ${material.quantity} ${material.unit}`,
                    date: material.dateAdded || new Date().toISOString().split('T')[0],
                    addedBy: 'System'
                  });
                }
              });
            } else if (cat.spentAmount > 0) {
              // For custom categories without logs, create a summary log entry
              budgetLogs.push({
                id: `category-${cat.id}`,
                category: categoryName,
                amount: cat.spentAmount,
                description: `${cat.name} - Total spending`,
                date: cat.lastUpdated ? new Date(cat.lastUpdated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                addedBy: 'Engineer'
              });
            }
          });
        } else {
          // Fallback: if no shared budget, generate from inventory
          // Add logs from materials (for materials category)
          state.materials.forEach(material => {
            if (material.quantity > 0 && material.price > 0) {
              budgetLogs.push({
                id: `material-${material.id}`,
                category: 'materials',
                amount: material.quantity * material.price,
                description: `${material.name} - ${material.quantity} ${material.unit}`,
                date: material.dateAdded || new Date().toISOString().split('T')[0],
                addedBy: 'System'
              });
            }
          });
          
          // Add logs from equipment (for equipment category)
          state.equipment.forEach(equipment => {
            if (equipment.type === 'rental' && equipment.rentalCost && equipment.rentalCost > 0) {
              budgetLogs.push({
                id: `equipment-${equipment.id}`,
                category: 'equipment',
                amount: equipment.rentalCost,
                description: `${equipment.name} - Rental`,
                date: equipment.dateAcquired || new Date().toISOString().split('T')[0],
                addedBy: 'System'
              });
            }
          });
        }
        
        // Process logs for PDF
        const processedLogs = budgetLogs
          .filter(log => log.amount > 0)
          .map(log => {
            let category = (log.category || 'other').toLowerCase().trim();
            if (!category || category === '') category = 'other';
            
            let dateStr = log.date;
            if (!dateStr) {
              dateStr = new Date().toISOString().split('T')[0];
            } else if (typeof dateStr === 'string') {
              try {
                const dateObj = new Date(dateStr);
                if (!isNaN(dateObj.getTime())) {
                  dateStr = dateObj.toISOString().split('T')[0];
                }
              } catch (e) {
                // Keep original
              }
            }
            
            return {
              id: log.id,
              category: category,
              amount: Number(log.amount) || 0,
              description: (log.description || 'No description').trim(),
              date: dateStr,
              addedBy: log.addedBy || 'Engineer'
            };
          });

        const projectInfo = {
          name: projectName,
          description: projectDescription,
          totalBudget: totalBudget,
          contingencyPercentage: 10
        };
        
        await exportBudgetToPDF(processedLogs, projectInfo, totalSpent);
        setSuccessMessage('Your budget report has been shared.');
        setShowSuccessDialog(true);
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
        setSuccessMessage('Your inventory report has been shared.');
        setShowSuccessDialog(true);
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
      
      {/* Custom Success Dialog */}
      <Portal>
        <Dialog 
          visible={showSuccessDialog} 
          onDismiss={() => setShowSuccessDialog(false)}
          style={styles.successDialog}
        >
          <Dialog.Title style={styles.successDialogTitle}>
            PDF Exported Successfully
          </Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.successDialogMessage}>
              {successMessage}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => setShowSuccessDialog(false)}
              textColor={constructionColors.primary}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  successDialog: {
    backgroundColor: '#000000',
    borderRadius: theme.roundness,
  },
  successDialogTitle: {
    color: constructionColors.primary,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  successDialogMessage: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
  },
});

