import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Button,
  IconButton,
  List,
  Divider,
  Chip,
  FAB,
  Portal,
  Modal,
  Surface,
  ProgressBar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { exportBudgetToPDF } from '../../services/pdfExportService';
import { useProjectData } from '../../context/ProjectDataContext';

interface BudgetCategory {
  id: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  description?: string;
  lastUpdated: Date;
}

interface ProjectBudget {
  totalBudget: number;
  totalSpent: number;
  categories: BudgetCategory[];
  contingencyPercentage: number;
  lastUpdated: Date;
}

export default function BudgetLogsManagementPage() {
  const navigation = useNavigation();
  const { state } = useProjectData();
  const [modalVisible, setModalVisible] = useState(false);
  const [totalBudgetModalVisible, setTotalBudgetModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Budget state
  const [budget, setBudget] = useState<ProjectBudget>({
    totalBudget: 850000,
    totalSpent: 425000,
    contingencyPercentage: 10,
    lastUpdated: new Date(),
    categories: [
      {
        id: 'materials',
        name: 'Materials',
        allocatedAmount: 400000,
        spentAmount: 220000,
        description: 'Construction materials, supplies, and inventory',
        lastUpdated: new Date(),
      },
      {
        id: 'labor',
        name: 'Labor & Payroll',
        allocatedAmount: 300000,
        spentAmount: 150000,
        description: 'Worker wages, salaries, and benefits',
        lastUpdated: new Date(),
      },
      {
        id: 'equipment',
        name: 'Equipment',
        allocatedAmount: 100000,
        spentAmount: 45000,
        description: 'Equipment rental and purchases',
        lastUpdated: new Date(),
      },
      {
        id: 'permits',
        name: 'Permits & Licenses',
        allocatedAmount: 30000,
        spentAmount: 8000,
        description: 'Legal permits and regulatory fees',
        lastUpdated: new Date(),
      },
      {
        id: 'other',
        name: 'Other Expenses',
        allocatedAmount: 20000,
        spentAmount: 2000,
        description: 'Miscellaneous project expenses',
        lastUpdated: new Date(),
      },
    ],
  });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    allocatedAmount: '',
    spentAmount: '',
    description: '',
  });

  const [totalBudgetForm, setTotalBudgetForm] = useState({
    totalBudget: budget.totalBudget.toString(),
    contingencyPercentage: budget.contingencyPercentage.toString(),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      allocatedAmount: '',
      spentAmount: '',
      description: '',
    });
    setEditingCategory(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (category: BudgetCategory) => {
    setFormData({
      name: category.name,
      allocatedAmount: category.allocatedAmount.toString(),
      spentAmount: category.spentAmount.toString(),
      description: category.description || '',
    });
    setEditingCategory(category);
    setModalVisible(true);
  };

  const openTotalBudgetModal = () => {
    setTotalBudgetForm({
      totalBudget: budget.totalBudget.toString(),
      contingencyPercentage: budget.contingencyPercentage.toString(),
    });
    setTotalBudgetModalVisible(true);
  };

  const saveCategory = () => {
    if (!formData.name.trim() || !formData.allocatedAmount || !formData.spentAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const allocatedAmount = parseFloat(formData.allocatedAmount);
    const spentAmount = parseFloat(formData.spentAmount);

    if (spentAmount > allocatedAmount) {
      Alert.alert('Warning', 'Spent amount exceeds allocated amount. Do you want to continue?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => proceedWithSave() }
      ]);
      return;
    }

    proceedWithSave();

    function proceedWithSave() {
      const categoryData: BudgetCategory = {
        id: editingCategory?.id || `category-${Date.now()}`,
        name: formData.name.trim(),
        allocatedAmount,
        spentAmount,
        description: formData.description.trim() || undefined,
        lastUpdated: new Date(),
      };

      setBudget(prev => {
        const newCategories = editingCategory
          ? prev.categories.map(c => c.id === editingCategory.id ? categoryData : c)
          : [...prev.categories, categoryData];

        const newTotalSpent = newCategories.reduce((sum, cat) => sum + cat.spentAmount, 0);

        return {
          ...prev,
          categories: newCategories,
          totalSpent: newTotalSpent,
          lastUpdated: new Date(),
        };
      });

      Alert.alert('Success', editingCategory ? 'Category updated successfully' : 'Category added successfully');
      setModalVisible(false);
      resetForm();
    }
  };

  const saveTotalBudget = () => {
    const newTotalBudget = parseFloat(totalBudgetForm.totalBudget);
    const newContingency = parseFloat(totalBudgetForm.contingencyPercentage);

    if (!newTotalBudget || newTotalBudget <= 0) {
      Alert.alert('Error', 'Please enter a valid total budget');
      return;
    }

    if (newContingency < 0 || newContingency > 50) {
      Alert.alert('Error', 'Contingency percentage must be between 0% and 50%');
      return;
    }

    setBudget(prev => ({
      ...prev,
      totalBudget: newTotalBudget,
      contingencyPercentage: newContingency,
      lastUpdated: new Date(),
    }));

    Alert.alert('Success', 'Total budget updated successfully');
    setTotalBudgetModalVisible(false);
  };

  const deleteCategory = (categoryId: string) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this budget category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setBudget(prev => {
              const newCategories = prev.categories.filter(c => c.id !== categoryId);
              const newTotalSpent = newCategories.reduce((sum, cat) => sum + cat.spentAmount, 0);
              
              return {
                ...prev,
                categories: newCategories,
                totalSpent: newTotalSpent,
                lastUpdated: new Date(),
              };
            });
            Alert.alert('Success', 'Category deleted successfully');
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCurrencyInput = (text: string, field: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    if (field === 'totalBudget') {
      setTotalBudgetForm(prev => ({ ...prev, totalBudget: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: numericValue }));
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      // Convert budget categories to budget logs format
      const budgetLogs = state.budgetLogs.map(log => ({
        id: log.id,
        category: log.category,
        amount: log.amount,
        description: log.description,
        date: log.date,
        addedBy: log.addedBy || 'Engineer'
      }));

      // Project info
      const projectInfo = {
        name: 'Construction Project', // Replace with actual project name if available
        description: 'Budget report for all project expenses',
        totalBudget: budget.totalBudget,
        contingencyPercentage: budget.contingencyPercentage
      };

      // Export to PDF
      await exportBudgetToPDF(budgetLogs, projectInfo, budget.totalSpent);
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Unable to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const budgetUsagePercent = budget.totalSpent / budget.totalBudget;
  const contingencyAmount = budget.totalBudget * (budget.contingencyPercentage / 100);
  const effectiveBudget = budget.totalBudget - contingencyAmount;
  const remainingBudget = budget.totalBudget - budget.totalSpent;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            iconColor={theme.colors.onSurface}
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>Budget Management</Text>
            <Text style={styles.subtitle}>Edit all budget data and categories</Text>
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
      </View>

      {/* Total Budget Overview */}
      <Card style={styles.totalBudgetCard}>
        <Card.Content>
          <View style={styles.totalBudgetHeader}>
            <Text style={styles.totalBudgetTitle}>Total Project Budget</Text>
            <IconButton
              icon="pencil"
              size={20}
              onPress={openTotalBudgetModal}
              iconColor={theme.colors.primary}
            />
          </View>

          <View style={styles.budgetSummary}>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Total Budget:</Text>
              <Text style={styles.budgetValue}>{formatCurrency(budget.totalBudget)}</Text>
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Total Spent:</Text>
              <Text style={[styles.budgetValue, { color: budgetUsagePercent > 0.8 ? constructionColors.urgent : constructionColors.complete }]}>
                {formatCurrency(budget.totalSpent)}
              </Text>
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Remaining:</Text>
              <Text style={[styles.budgetValue, { color: remainingBudget < 0 ? constructionColors.urgent : constructionColors.complete }]}>
                {formatCurrency(remainingBudget)}
              </Text>
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Contingency ({budget.contingencyPercentage}%):</Text>
              <Text style={styles.budgetValue}>{formatCurrency(contingencyAmount)}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>
              Budget Usage: {Math.round(budgetUsagePercent * 100)}%
            </Text>
            <ProgressBar 
              progress={budgetUsagePercent} 
              color={budgetUsagePercent > 0.8 ? constructionColors.urgent : constructionColors.complete}
              style={styles.progressBar}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Budget Categories */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.categoriesHeader}>
          <Text style={styles.categoriesTitle}>Budget Categories</Text>
          <Text style={styles.categoriesSubtitle}>Manage individual budget allocations</Text>
        </View>

        {budget.categories.map((category, index) => {
          const usagePercent = category.spentAmount / category.allocatedAmount;
          const remaining = category.allocatedAmount - category.spentAmount;

          return (
            <Card key={category.id} style={styles.categoryCard}>
              <Card.Content>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {category.description && (
                      <Text style={styles.categoryDescription}>{category.description}</Text>
                    )}
                  </View>
                  <View style={styles.categoryActions}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => openEditModal(category)}
                      iconColor={theme.colors.primary}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => deleteCategory(category.id)}
                      iconColor={constructionColors.urgent}
                    />
                  </View>
                </View>

                <View style={styles.categoryDetails}>
                  <View style={styles.categoryAmounts}>
                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>Allocated</Text>
                      <Text style={styles.amountValue}>{formatCurrency(category.allocatedAmount)}</Text>
                    </View>
                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>Spent</Text>
                      <Text style={[styles.amountValue, { color: usagePercent > 1 ? constructionColors.urgent : constructionColors.complete }]}>
                        {formatCurrency(category.spentAmount)}
                      </Text>
                    </View>
                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>Remaining</Text>
                      <Text style={[styles.amountValue, { color: remaining < 0 ? constructionColors.urgent : constructionColors.complete }]}>
                        {formatCurrency(remaining)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.categoryProgress}>
                    <Text style={styles.categoryProgressLabel}>
                      Usage: {Math.round(usagePercent * 100)}%
                    </Text>
                    <ProgressBar 
                      progress={Math.min(usagePercent, 1)} 
                      color={usagePercent > 1 ? constructionColors.urgent : usagePercent > 0.8 ? constructionColors.warning : constructionColors.complete}
                      style={styles.categoryProgressBar}
                    />
                  </View>

                  {usagePercent > 1 && (
                    <Chip
                      style={[styles.overBudgetChip, { backgroundColor: constructionColors.urgent }]}
                      textStyle={styles.overBudgetText}
                    >
                      Over Budget by {formatCurrency(category.spentAmount - category.allocatedAmount)}
                    </Chip>
                  )}
                </View>

                <Text style={styles.lastUpdated}>
                  Last updated: {category.lastUpdated.toLocaleDateString()}
                </Text>
              </Card.Content>
              {index < budget.categories.length - 1 && <Divider />}
            </Card>
          );
        })}
      </ScrollView>

      {/* Add Category FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openAddModal}
        label="Add Category"
      />

      {/* Add/Edit Category Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Edit Budget Category' : 'Add New Budget Category'}
            </Text>

            <TextInput
              mode="outlined"
              label="Category Name *"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Allocated Amount ($) *"
              value={formData.allocatedAmount}
              onChangeText={(text) => handleCurrencyInput(text, 'allocatedAmount')}
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon="currency-usd" />}
            />

            <TextInput
              mode="outlined"
              label="Spent Amount ($) *"
              value={formData.spentAmount}
              onChangeText={(text) => handleCurrencyInput(text, 'spentAmount')}
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon="currency-usd" />}
            />

            <TextInput
              mode="outlined"
              label="Description (Optional)"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <Button onPress={() => setModalVisible(false)}>Cancel</Button>
              <Button 
                mode="contained" 
                onPress={saveCategory}
                buttonColor={constructionColors.complete}
              >
                {editingCategory ? 'Update' : 'Add'} Category
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* Total Budget Modal */}
      <Portal>
        <Modal
          visible={totalBudgetModalVisible}
          onDismiss={() => setTotalBudgetModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <Text style={styles.modalTitle}>Edit Total Budget</Text>

            <TextInput
              mode="outlined"
              label="Total Project Budget ($) *"
              value={totalBudgetForm.totalBudget}
              onChangeText={(text) => handleCurrencyInput(text, 'totalBudget')}
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon="currency-usd" />}
            />

            <TextInput
              mode="outlined"
              label="Contingency Percentage (%) *"
              value={totalBudgetForm.contingencyPercentage}
              onChangeText={(text) => setTotalBudgetForm(prev => ({ ...prev, contingencyPercentage: text }))}
              keyboardType="numeric"
              style={styles.input}
              right={<TextInput.Affix text="%" />}
            />

            <View style={styles.contingencyInfo}>
              <Text style={styles.contingencyText}>
                Contingency Amount: {formatCurrency(parseFloat(totalBudgetForm.totalBudget || '0') * (parseFloat(totalBudgetForm.contingencyPercentage || '0') / 100))}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Button onPress={() => setTotalBudgetModalVisible(false)}>Cancel</Button>
              <Button 
                mode="contained" 
                onPress={saveTotalBudget}
                buttonColor={constructionColors.complete}
              >
                Update Budget
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  exportButton: {
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
  },

  // Total Budget Card
  totalBudgetCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: 'white',
    elevation: 4,
  },
  totalBudgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalBudgetTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  budgetSummary: {
    marginBottom: spacing.md,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  budgetLabel: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
  },
  budgetValue: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  progressSection: {
    marginTop: spacing.md,
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

  // Categories
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  categoriesHeader: {
    marginBottom: spacing.md,
  },
  categoriesTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  categoriesSubtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  categoryCard: {
    marginBottom: spacing.md,
    backgroundColor: 'white',
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  categoryDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  categoryActions: {
    flexDirection: 'row',
  },
  categoryDetails: {
    marginBottom: spacing.md,
  },
  categoryAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  amountSection: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  amountValue: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginTop: spacing.xs,
  },
  categoryProgress: {
    marginBottom: spacing.sm,
  },
  categoryProgressLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  categoryProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  overBudgetChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  overBudgetText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: fontSizes.xs,
  },
  lastUpdated: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: constructionColors.complete,
  },

  // Modal
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalSurface: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  contingencyInfo: {
    backgroundColor: constructionColors.complete + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  contingencyText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: constructionColors.complete,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});



