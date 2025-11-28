import React, { useState, useEffect } from 'react';
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
  Dialog,
  Paragraph,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { exportBudgetToPDF } from '../../services/pdfExportService';
import { useProjectData } from '../../context/ProjectDataContext';
import { updateProject, getProject } from '../../services/projectService';
import { getBudgetLogs, getBudget, saveBudget } from '../../services/firebaseDataService';

interface BudgetCategory {
  id: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  description?: string;
  lastUpdated: Date;
  isPrimary?: boolean; // Protected categories that cannot be deleted
}

interface ProjectBudget {
  totalBudget: number;
  totalSpent: number;
  categories: BudgetCategory[];
  contingencyPercentage: number;
  lastUpdated: Date;
}

interface ProjectInfo {
  title: string;
  description: string;
}

export default function BudgetLogsManagementPage() {
  const navigation = useNavigation();
  const { state, projectId, setBudget: setSharedBudget } = useProjectData();
  const [modalVisible, setModalVisible] = useState(false);
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
  const [totalBudgetModalVisible, setTotalBudgetModalVisible] = useState(false);
  const [projectInfoModalVisible, setProjectInfoModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [loadingProjectInfo, setLoadingProjectInfo] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const isSyncingRef = React.useRef(false);
  
  // Calculate equipment and materials spent amounts from actual data
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

  // Project info state
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    title: '',
    description: '',
  });

  const [projectInfoForm, setProjectInfoForm] = useState({
    title: '',
    description: '',
  });

  // Load project info from Firestore
  useEffect(() => {
    const loadProjectInfo = async () => {
      if (!projectId) return;
      
      try {
        setLoadingProjectInfo(true);
        const project = await getProject(projectId);
        if (project) {
          const loadedInfo = {
            title: project.name,
            description: project.description || '',
          };
          setProjectInfo(loadedInfo);
          setProjectInfoForm(loadedInfo);
        }
      } catch (error) {
        console.error('Error loading project info:', error);
      } finally {
        setLoadingProjectInfo(false);
      }
    };

    loadProjectInfo();
  }, [projectId]);
  
  // Load budget from Firebase on mount (only once)
  const hasLoadedBudgetRef = React.useRef(false);
  
  useEffect(() => {
    // Only load once
    if (hasLoadedBudgetRef.current || !projectId) {
      if (!projectId) {
        setLoadingBudget(false);
      }
      return;
    }
    
    const loadBudgetFromFirebase = async () => {
      try {
        hasLoadedBudgetRef.current = true;
        setLoadingBudget(true);
        console.log('📥 Loading budget from Firebase for project:', projectId);
        const savedBudget = await getBudget(projectId);
        
        if (savedBudget) {
          console.log('✅ Budget loaded from Firebase:', savedBudget);
          // Convert to ProjectBudget format
          const budgetData = savedBudget as any;
          const loadedBudget: ProjectBudget = {
            totalBudget: budgetData.totalBudget || 250000,
            totalSpent: budgetData.totalSpent || 0,
            contingencyPercentage: budgetData.contingencyPercentage || 10,
            lastUpdated: budgetData.lastUpdated || new Date(),
            categories: (budgetData.categories || []).map((cat: any) => ({
              ...cat,
              lastUpdated: cat.lastUpdated || new Date(),
            })),
          };
          
          // Update primary categories with current spent amounts
          const updatedCategories = loadedBudget.categories.map(cat => {
            if (cat.id === 'equipment') {
              return { ...cat, spentAmount: calculateEquipmentSpent(), lastUpdated: new Date() };
            }
            if (cat.id === 'materials') {
              return { ...cat, spentAmount: calculateMaterialsSpent(), lastUpdated: new Date() };
            }
            return cat;
          });
          
          const updatedTotalSpent = updatedCategories.reduce((sum, cat) => sum + cat.spentAmount, 0);
          
          const finalBudget: ProjectBudget = {
            ...loadedBudget,
            categories: updatedCategories,
            totalSpent: updatedTotalSpent,
          };
          
          console.log('✅ Final budget after updates:', finalBudget);
          setBudget(finalBudget);
          setSharedBudget(finalBudget);
        } else {
          console.log('ℹ️ No saved budget found, using defaults');
          // If no saved budget, initialize with defaults
          const defaultBudget = getDefaultBudget();
          setBudget(defaultBudget);
          setSharedBudget(defaultBudget);
        }
      } catch (error) {
        console.error('❌ Error loading budget from Firebase:', error);
        // On error, use defaults
        const defaultBudget = getDefaultBudget();
        setBudget(defaultBudget);
        setSharedBudget(defaultBudget);
      } finally {
        setLoadingBudget(false);
        console.log('✅ Budget loading complete');
      }
    };

    loadBudgetFromFirebase();
  }, [projectId]); // Only depend on projectId, not setSharedBudget
  
  // Budget state - will be initialized from Firebase or defaults
  const initialEquipmentSpent = calculateEquipmentSpent();
  const initialMaterialsSpent = calculateMaterialsSpent();
  
  const getDefaultBudget = (): ProjectBudget => {
    const categories = [
      {
        id: 'equipment',
        name: 'Equipment',
        allocatedAmount: 50000,
        spentAmount: initialEquipmentSpent,
        description: 'Equipment rental and purchases (Auto-calculated)',
        lastUpdated: new Date(),
        isPrimary: true,
      },
      {
        id: 'materials',
        name: 'Materials',
        allocatedAmount: 150000,
        spentAmount: initialMaterialsSpent,
        description: 'Construction materials and supplies (Auto-calculated)',
        lastUpdated: new Date(),
        isPrimary: true,
      },
    ];
    
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spentAmount, 0);
    
    return {
      totalBudget: 250000, // ₱250,000 - default budget
      totalSpent,
      contingencyPercentage: 10,
      lastUpdated: new Date(),
      categories,
    };
  };
  
  const [budget, setBudget] = useState<ProjectBudget | null>(null);
  
  // Helper function to save budget to Firebase and sync to shared state
  const saveBudgetToFirebase = async (budgetToSave: ProjectBudget) => {
    if (!projectId || isSyncingRef.current) return;
    
    try {
      isSyncingRef.current = true;
      
      // Update shared state
      setSharedBudget(budgetToSave);
      
      // Save to Firebase
      await saveBudget(projectId, budgetToSave);
      console.log('✅ Budget saved to Firebase successfully');
    } catch (error) {
      console.error('❌ Error saving budget to Firebase:', error);
    } finally {
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
  };
  
  // Sync budget to shared state when budget changes (but don't save to Firebase here to avoid loops)
  React.useEffect(() => {
    if (loadingBudget || !budget || isSyncingRef.current) {
      return;
    }
    
    // Only sync if the budget is different from the shared budget
    if (!state.budget || 
        budget.totalBudget !== state.budget.totalBudget ||
        budget.totalSpent !== state.budget.totalSpent ||
        budget.categories.length !== state.budget.categories.length ||
        JSON.stringify(budget.categories.map(c => c.id).sort()) !== JSON.stringify(state.budget.categories.map(c => c.id).sort())) {
      setSharedBudget(budget);
    }
  }, [budget, state.budget, setSharedBudget, loadingBudget]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    allocatedAmount: '',
    spentAmount: '',
    description: '',
  });

  const [totalBudgetForm, setTotalBudgetForm] = useState({
    totalBudget: '250000',
    contingencyPercentage: '10',
  });
  
  // Update totalBudgetForm when budget loads
  React.useEffect(() => {
    if (budget) {
      setTotalBudgetForm({
        totalBudget: budget.totalBudget.toString(),
        contingencyPercentage: budget.contingencyPercentage.toString(),
      });
    }
  }, [budget]);

  // Update primary categories when equipment or materials change
  // Also update categories based on budget logs
  React.useEffect(() => {
    // Wait for budget to be loaded before updating
    if (loadingBudget) return;
    
    // If no budget exists yet, don't update (will be initialized on load)
    if (!budget) return;
    
    // Prevent updates during sync to avoid loops
    if (isSyncingRef.current) return;
    
    const equipmentSpent = calculateEquipmentSpent();
    const materialsSpent = calculateMaterialsSpent();
    
    // Check if primary categories need updating
    const equipmentCategory = budget.categories.find(cat => cat.id === 'equipment');
    const materialsCategory = budget.categories.find(cat => cat.id === 'materials');
    
    const equipmentChanged = equipmentCategory && Math.abs(equipmentCategory.spentAmount - equipmentSpent) > 0.01;
    const materialsChanged = materialsCategory && Math.abs(materialsCategory.spentAmount - materialsSpent) > 0.01;
    
    if (!equipmentChanged && !materialsChanged) return;
    
    // Update immediately (no debounce) to ensure changes persist
    // This is the SINGLE source of truth for budget updates
    setBudget(prev => {
      if (!prev) return getDefaultBudget();
      const updatedCategories = prev.categories.map(cat => {
        if (cat.id === 'equipment') {
          return { ...cat, spentAmount: equipmentSpent, lastUpdated: new Date() };
        }
        if (cat.id === 'materials') {
          return { ...cat, spentAmount: materialsSpent, lastUpdated: new Date() };
        }
        return cat;
      });
      
      // Calculate spent amounts from budget logs for each category
      const logsByCategory = state.budgetLogs.reduce((acc, log) => {
        if (log.type === 'expense' && log.amount > 0) {
          const categoryName = log.category.toLowerCase();
          if (!acc[categoryName]) {
            acc[categoryName] = 0;
          }
          acc[categoryName] += log.amount;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Update categories with budget log amounts (for non-primary categories)
      const finalCategories = updatedCategories.map(cat => {
        const categoryName = cat.name.toLowerCase();
        const logAmount = logsByCategory[categoryName] || 0;
        
        // For primary categories, keep auto-calculated amount
        if (cat.isPrimary) {
          return cat;
        }
        
        // For non-primary categories, use budget log amounts
        return {
          ...cat,
          spentAmount: logAmount,
          lastUpdated: new Date(),
        };
      });
      
      // Calculate new total spent from all categories
      const newTotalSpent = finalCategories.reduce((sum, cat) => sum + cat.spentAmount, 0);
      
      const updatedBudget: ProjectBudget = {
        ...prev,
        categories: finalCategories,
        totalSpent: newTotalSpent,
        lastUpdated: new Date(),
      };
      
      // Save to Firebase and update shared state IMMEDIATELY
      // This ensures the change persists and all screens update
      saveBudgetToFirebase(updatedBudget);
      
      return updatedBudget;
    });
  }, [state.equipment, state.materials, state.budgetLogs, budget, loadingBudget]);

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
    if (!budget) return;
    setTotalBudgetForm({
      totalBudget: budget.totalBudget.toString(),
      contingencyPercentage: budget.contingencyPercentage.toString(),
    });
    setTotalBudgetModalVisible(true);
  };

  const saveCategory = () => {
    if (!formData.name.trim() || !formData.allocatedAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const allocatedAmount = parseFloat(formData.allocatedAmount);
    
    // For primary categories, only allow editing allocated amount
    const isPrimary = editingCategory?.isPrimary;
    let spentAmount: number;
    
    if (isPrimary) {
      // Keep the auto-calculated spent amount for primary categories
      spentAmount = editingCategory?.spentAmount || 0;
    } else {
      // For non-primary categories, allow manual spent amount entry
      if (!formData.spentAmount) {
        Alert.alert('Error', 'Please fill in the spent amount');
        return;
      }
      spentAmount = parseFloat(formData.spentAmount);
      
      if (spentAmount > allocatedAmount) {
        Alert.alert('Warning', 'Spent amount exceeds allocated amount. Do you want to continue?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => proceedWithSave() }
        ]);
        return;
      }
    }

    proceedWithSave();

    async function proceedWithSave() {
      if (!budget || !projectId) return;
      
      const categoryData: BudgetCategory = {
        id: editingCategory?.id || `category-${Date.now()}`,
        name: formData.name.trim(),
        allocatedAmount,
        spentAmount,
        description: formData.description.trim() || undefined,
        lastUpdated: new Date(),
        isPrimary: isPrimary || false,
      };

      const newCategories = editingCategory
        ? budget.categories.map(c => c.id === editingCategory.id ? categoryData : c)
        : [...budget.categories, categoryData];

      const newTotalSpent = newCategories.reduce((sum, cat) => sum + cat.spentAmount, 0);

      const updatedBudget: ProjectBudget = {
        ...budget,
        categories: newCategories,
        totalSpent: newTotalSpent,
        lastUpdated: new Date(),
      };

      setBudget(updatedBudget);
      
      // Immediately save to Firebase
      await saveBudgetToFirebase(updatedBudget);

      setSuccessMessage(editingCategory ? 'Category updated successfully' : 'Category added successfully');
      setShowSuccessDialog(true);
      setModalVisible(false);
      resetForm();
    }
  };

  const saveTotalBudget = async () => {
    if (!budget) return;
    
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

    const updatedBudget: ProjectBudget = {
      ...budget,
      totalBudget: newTotalBudget,
      contingencyPercentage: newContingency,
      lastUpdated: new Date(),
    };

    setBudget(updatedBudget);
    
    // Immediately save to Firebase
    await saveBudgetToFirebase(updatedBudget);

    setSuccessMessage('Total budget updated successfully');
    setShowSuccessDialog(true);
    setTotalBudgetModalVisible(false);
  };

  const deleteCategory = (categoryId: string, isPrimary?: boolean) => {
    if (!budget) return;
    
    // Prevent deletion of primary categories
    if (isPrimary) {
      Alert.alert(
        'Cannot Delete',
        'Equipment and Materials are primary categories that cannot be deleted. They are automatically synced with your inventory.'
      );
      return;
    }

    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this budget category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const newCategories = budget.categories.filter(c => c.id !== categoryId);
            const newTotalSpent = newCategories.reduce((sum, cat) => sum + cat.spentAmount, 0);
            
            const updatedBudget: ProjectBudget = {
              ...budget,
              categories: newCategories,
              totalSpent: newTotalSpent,
              lastUpdated: new Date(),
            };
            
            setBudget(updatedBudget);
            
            // Immediately save to Firebase
            await saveBudgetToFirebase(updatedBudget);
            
            setSuccessMessage('Category deleted successfully');
            setShowSuccessDialog(true);
          },
        },
      ]
    );
  };

  const openProjectInfoModal = () => {
    setProjectInfoForm({
      title: projectInfo.title,
      description: projectInfo.description,
    });
    setProjectInfoModalVisible(true);
  };

  const saveProjectInfo = async () => {
    if (!projectInfoForm.title.trim()) {
      Alert.alert('Error', 'Project title is required');
      return;
    }

    if (!projectId) {
      Alert.alert('Error', 'Project ID not found');
      return;
    }

    try {
      // Update project in Firestore
      await updateProject(projectId, {
        name: projectInfoForm.title.trim(),
        description: projectInfoForm.description.trim(),
      });

      // Update local state
      setProjectInfo({
        title: projectInfoForm.title.trim(),
        description: projectInfoForm.description.trim(),
      });

      Alert.alert('Success', 'Project information updated successfully');
      setProjectInfoModalVisible(false);
    } catch (error: any) {
      console.error('Error updating project info:', error);
      Alert.alert('Error', error?.message || 'Failed to update project information');
    }
  };

  const formatCurrency = (amount: number) => {
    return '₱' + amount.toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleCurrencyInput = (text: string, field: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    if (field === 'totalBudget') {
      setTotalBudgetForm(prev => ({ ...prev, totalBudget: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: numericValue }));
    }
  };

  // Show loading state if budget hasn't loaded yet
  if (loadingBudget || !budget) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
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
              <Text style={styles.subtitle}>Loading budget data...</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  const budgetUsagePercent = budget.totalSpent / budget.totalBudget;
  const contingencyAmount = budget.totalBudget * (budget.contingencyPercentage / 100);
  const effectiveBudget = budget.totalBudget - contingencyAmount;
  const remainingBudget = budget.totalBudget - budget.totalSpent;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
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
        </View>
      </View>

      {/* Project Information Card */}
      {loadingProjectInfo ? (
        <Card style={styles.projectInfoCard}>
          <Card.Content>
            <View style={styles.projectInfoHeader}>
              <View style={styles.projectInfoText}>
                <Text style={styles.projectTitle}>Loading...</Text>
                <Text style={styles.projectDescription}>Loading project information...</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.projectInfoCard}>
          <Card.Content>
            <View style={styles.projectInfoHeader}>
              <View style={styles.projectInfoText}>
                <Text style={styles.projectTitle}>{projectInfo.title || 'No Project Name'}</Text>
                <Text style={styles.projectDescription}>{projectInfo.description || 'No description'}</Text>
              </View>
              <IconButton
                icon="pencil"
                size={20}
                onPress={openProjectInfoModal}
                iconColor={theme.colors.primary}
              />
            </View>
          </Card.Content>
        </Card>
      )}

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Budget Categories Button */}
        <View style={styles.categoriesButtonContainer}>
          <Button
            mode="contained"
            icon="view-list"
            onPress={() => setCategoriesModalVisible(true)}
            style={styles.viewCategoriesButton}
            contentStyle={styles.viewCategoriesButtonContent}
            labelStyle={styles.viewCategoriesButtonLabel}
            compact
          >
            View Categories ({budget.categories.length})
          </Button>
          <Button
            mode="contained"
            icon="plus"
            onPress={openAddModal}
            style={styles.addCategoryButton}
            contentStyle={styles.addCategoryButtonContent}
            labelStyle={styles.addCategoryButtonLabel}
            compact
          >
            Add New Budget Category
          </Button>
        </View>

      </ScrollView>

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

            {editingCategory?.isPrimary && (
              <Surface style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ This is a primary category. Spent amount is auto-calculated from {editingCategory.name} inventory.
                </Text>
              </Surface>
            )}

            <TextInput
              mode="outlined"
              label="Category Name *"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              style={styles.input}
              disabled={editingCategory?.isPrimary}
              textColor={theme.colors.text}
            />

            <TextInput
              mode="outlined"
              label="Allocated Amount (₱) *"
              value={formData.allocatedAmount}
              onChangeText={(text) => handleCurrencyInput(text, 'allocatedAmount')}
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon="cash" />}
              textColor={theme.colors.text}
            />

            {!editingCategory?.isPrimary && (
              <TextInput
                mode="outlined"
                label="Spent Amount (₱) *"
                value={formData.spentAmount}
                onChangeText={(text) => handleCurrencyInput(text, 'spentAmount')}
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Icon icon="cash" />}
                textColor={theme.colors.text}
              />
            )}

            {editingCategory?.isPrimary && (
              <Surface style={styles.autoCalcBox}>
                <Text style={styles.autoCalcLabel}>Auto-Calculated Spent:</Text>
                <Text style={styles.autoCalcValue}>{formatCurrency(editingCategory.spentAmount)}</Text>
              </Surface>
            )}

            <TextInput
              mode="outlined"
              label="Description (Optional)"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
              style={styles.input}
              disabled={editingCategory?.isPrimary}
              textColor={theme.colors.text}
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
              label="Total Project Budget (₱) *"
              value={totalBudgetForm.totalBudget}
              onChangeText={(text) => handleCurrencyInput(text, 'totalBudget')}
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon="cash" />}
              textColor={theme.colors.text}
            />

            <TextInput
              mode="outlined"
              label="Contingency Percentage (%) *"
              value={totalBudgetForm.contingencyPercentage}
              onChangeText={(text) => setTotalBudgetForm(prev => ({ ...prev, contingencyPercentage: text }))}
              keyboardType="numeric"
              style={styles.input}
              right={<TextInput.Affix text="%" />}
              textColor={theme.colors.text}
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

      {/* Project Info Modal */}
      <Portal>
        <Modal
          visible={projectInfoModalVisible}
          onDismiss={() => setProjectInfoModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <Text style={styles.modalTitle}>Edit Project Information</Text>

            <TextInput
              mode="outlined"
              label="Project Title *"
              value={projectInfoForm.title}
              onChangeText={(text) => setProjectInfoForm(prev => ({ ...prev, title: text }))}
              style={styles.input}
              textColor={theme.colors.text}
            />

            <TextInput
              mode="outlined"
              label="Project Description"
              value={projectInfoForm.description}
              onChangeText={(text) => setProjectInfoForm(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={4}
              style={styles.input}
              textColor={theme.colors.text}
            />

            <View style={styles.modalActions}>
              <Button onPress={() => setProjectInfoModalVisible(false)}>Cancel</Button>
              <Button 
                mode="contained" 
                onPress={saveProjectInfo}
                buttonColor={constructionColors.complete}
              >
                Update Info
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* Categories Modal */}
      <Portal>
        <Modal
          visible={categoriesModalVisible}
          onDismiss={() => setCategoriesModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.categoriesModalSurface}>
            <View style={styles.categoriesModalHeader}>
              <Text style={styles.modalTitle}>Budget Categories</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setCategoriesModalVisible(false)}
              />
            </View>
            
            <ScrollView style={styles.categoriesScrollView} showsVerticalScrollIndicator={false}>
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
                            onPress={() => {
                              setCategoriesModalVisible(false);
                              openEditModal(category);
                            }}
                            iconColor={theme.colors.primary}
                          />
                          <IconButton
                            icon="delete"
                            size={20}
                            onPress={() => deleteCategory(category.id, category.isPrimary)}
                            iconColor={category.isPrimary ? theme.colors.onSurfaceDisabled : constructionColors.urgent}
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
          </Surface>
        </Modal>

        {/* Success Dialog */}
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => setShowSuccessDialog(false)}
          style={styles.successDialog}
        >
          <Dialog.Title style={styles.successDialogTitle}>Success</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.successDialogMessage}>
              {successMessage}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSuccessDialog(false)} textColor={theme.colors.primary}>
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingVertical: spacing.sm,
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
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
  },

  // Project Info Card
  projectInfoCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: theme.colors.surface,
    elevation: 3,
    borderRadius: theme.roundness,
  },
  projectInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  projectInfoText: {
    flex: 1,
  },
  projectTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  projectDescription: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },

  // Total Budget Card
  totalBudgetCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: theme.colors.surface,
    elevation: 4,
    borderRadius: theme.roundness,
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
    color: theme.colors.text,
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
    color: theme.colors.text,
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

  // Categories Button
  categoriesButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  viewCategoriesButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  viewCategoriesButtonContent: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  viewCategoriesButtonLabel: {
    fontSize: 10,
    color: 'white',
  },
  addCategoryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  addCategoryButtonContent: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  addCategoryButtonLabel: {
    fontSize: 10,
    color: 'white',
  },
  
  // Budget Logs Section
  budgetLogsCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: theme.colors.surface,
    elevation: 4,
    borderRadius: theme.roundness,
  },
  budgetLogsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  budgetLogsTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addLogButton: {
    backgroundColor: theme.colors.primary,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    padding: spacing.lg,
    fontSize: fontSizes.md,
  },
  logsList: {
    gap: spacing.sm,
  },
  logCard: {
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logInfo: {
    flex: 1,
  },
  logDescription: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryChip: {
    height: 24,
    backgroundColor: theme.colors.primaryContainer,
  },
  categoryChipText: {
    fontSize: 10,
    color: theme.colors.onPrimaryContainer,
  },
  logDate: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  logAmount: {
    alignItems: 'flex-end',
  },
  logAmountText: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  logActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  typeSection: {
    marginBottom: spacing.md,
  },
  typeLabel: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },

  // Info Section
  scrollView: {
    flex: 1,
  },
  categoryCard: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.surface,
    elevation: 2,
    borderRadius: theme.roundness,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryInfo: {
    flex: 1,
    marginRight: spacing.xs,
  },
  categoryName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    flexShrink: 1,
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
    color: theme.colors.text,
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

  // Modal
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalSurface: {
    backgroundColor: theme.colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.surface,
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
  warningBox: {
    backgroundColor: constructionColors.warning + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  warningText: {
    fontSize: fontSizes.sm,
    color: constructionColors.warning,
    fontWeight: '500',
  },
  autoCalcBox: {
    backgroundColor: constructionColors.complete + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoCalcLabel: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  autoCalcValue: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: constructionColors.complete,
  },
  successDialog: {
    backgroundColor: '#000000',
  },
  successDialogTitle: {
    color: theme.colors.primary,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  successDialogMessage: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
  },

  // Categories Modal
  categoriesModalSurface: {
    backgroundColor: theme.colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    width: '95%',
    maxHeight: '85%',
  },
  categoriesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoriesScrollView: {
    maxHeight: '100%',
  },
});



