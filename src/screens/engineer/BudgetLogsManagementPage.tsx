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
import { predictAllDelays } from '../../services/delayPredictionService';

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
  
  // Calculate materials spent amounts from actual data
  const calculateMaterialsSpent = () => {
    return state.materials.reduce((total, material) => {
      // Use totalBought if available, otherwise use quantity
      const quantity = material.totalBought || material.quantity;
      return total + (quantity * material.price);
    }, 0);
  };

  // Calculate contingency delay spent from actual completed delays + predicted delays
  const calculateContingencyDelaySpent = async (projectTotalBudget: number): Promise<number> => {
    if (!projectId || !budget) return 0;
    
    try {
      // Get project for delay penalty rate
      const project = await getProject(projectId);
      const delayPenaltyRate = project?.delayContingencyRate || 2; // Default 2% per day
      
      // Calculate actual penalty from completed tasks
      const { getProjectTasks } = await import('../../services/taskService');
      const allTasks = await getProjectTasks(projectId);
      const completedTasks = allTasks.filter(t => t.status === 'completed' && t.planned_end_date && t.actual_end_date);
      
      let actualPenalty = 0;
      completedTasks.forEach((task) => {
        const plannedEnd = new Date(task.planned_end_date);
        const actualEnd = new Date(task.actual_end_date!);
        
        // Calculate actual delay days
        const delayDays = Math.max(0, Math.ceil((actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24)));
        
        if (delayDays > 0) {
          // Calculate penalty for this task: (delayDays × rate) × totalBudget / 100
          const penaltyPercentage = delayDays * delayPenaltyRate;
          const taskPenalty = (projectTotalBudget * penaltyPercentage) / 100;
          actualPenalty += taskPenalty;
        }
      });
      
      // Also get predicted penalty from active/in-progress tasks (for potential future delays)
      const result = await predictAllDelays(projectId);
      const activePredictions = result.predictions.filter(p => p.status !== 'completed');
      
      let predictedPenalty = 0;
      if (activePredictions.length > 0) {
        // Get max predicted delay from active tasks
        const maxDelay = Math.max(...activePredictions.map(p => p.delayDays || 0), 0);
        
        if (maxDelay > 0) {
          const deductionPercentage = maxDelay * delayPenaltyRate;
          predictedPenalty = (projectTotalBudget * deductionPercentage) / 100;
        }
      }
      
      // Return the higher of actual or predicted (since actual is certain, predicted is potential)
      // Actually, we should use actual for completed + predicted for active
      // But for spent amount, we should use actual penalties only
      return actualPenalty;
    } catch (error) {
      console.error('Error calculating contingency delay:', error);
      return 0;
    }
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
          // Only fix allocatedAmount if it's clearly wrong (old hardcoded values that don't match 20% of current budget)
          // IMPORTANT: Preserve ALL user adjustments - only fix old hardcoded values (50K or 150K) that are wrong
          const expectedAllocated = Math.round(loadedBudget.totalBudget * 0.2);
          const oldHardcodedValues = [50000, 150000];
          
          // Calculate contingency delay spent
          const contingencyDelaySpent = await calculateContingencyDelaySpent(loadedBudget.totalBudget);
          
          // Calculate allocated amount for Contingency Delay from contingency percentage
          const contingencyDelayAllocated = (loadedBudget.totalBudget * loadedBudget.contingencyPercentage) / 100;
          
          // Ensure Contingency Delay category exists
          let hasContingencyDelay = loadedBudget.categories.some(cat => cat.id === 'contingency_delay');
          
          const updatedCategories = loadedBudget.categories
            .filter(cat => cat.id !== 'equipment') // Remove equipment category
            .map(cat => {
            if (cat.id === 'materials') {
              // Only fix if: it's exactly one of the old hardcoded values AND it doesn't equal 20% of current budget
              // This preserves any user adjustments (even if not exactly 20%)
              const isOldHardcoded = oldHardcodedValues.includes(cat.allocatedAmount);
              const exceedsBudget = cat.allocatedAmount > loadedBudget.totalBudget;
              // Only fix old hardcoded values that are wrong - preserve all other user adjustments
              const shouldFix = exceedsBudget || (isOldHardcoded && cat.allocatedAmount !== expectedAllocated);
              return { 
                ...cat, 
                spentAmount: calculateMaterialsSpent(), 
                allocatedAmount: shouldFix ? expectedAllocated : cat.allocatedAmount,
                lastUpdated: shouldFix ? new Date() : cat.lastUpdated // Only update timestamp if we fixed it
              };
            }
            if (cat.id === 'contingency_delay') {
              hasContingencyDelay = true;
              return {
                ...cat,
                allocatedAmount: contingencyDelayAllocated,
                spentAmount: contingencyDelaySpent,
                lastUpdated: new Date(),
              };
            }
            return cat;
          });
          
          // Add Contingency Delay category if it doesn't exist
          if (!hasContingencyDelay) {
            updatedCategories.push({
              id: 'contingency_delay',
              name: 'Contingency Delay',
              allocatedAmount: contingencyDelayAllocated,
              spentAmount: contingencyDelaySpent,
              description: 'Auto-calculated penalty based on delay prediction',
              lastUpdated: new Date(),
              isPrimary: true,
            });
          }
          
          const updatedTotalSpent = updatedCategories.reduce((sum, cat) => sum + cat.spentAmount, 0);
          
          const finalBudget: ProjectBudget = {
            ...loadedBudget,
            categories: updatedCategories,
            totalSpent: updatedTotalSpent,
          };
          
          console.log('✅ Final budget after updates:', finalBudget);
          
          // Check if any allocations were corrected (only save if corrections were made)
          const allocationsWereFixed = updatedCategories.some(cat => {
            if (cat.id === 'materials') {
              const oldCat = loadedBudget.categories.find(c => c.id === cat.id);
              return oldCat && oldCat.allocatedAmount !== cat.allocatedAmount;
            }
            return false;
          });
          
          // Only save to Firebase if allocations were corrected (to avoid unnecessary saves)
          if (allocationsWereFixed) {
            console.log('🔧 Correcting old hardcoded allocations, saving to Firebase...');
            await saveBudgetToFirebase(finalBudget);
          }
          
          setBudget(finalBudget);
          setSharedBudget(finalBudget);
        } else {
          console.log('ℹ️ No saved budget found, using defaults');
          // If no saved budget, get project's totalBudget or use default
          let projectTotalBudget = 250000; // Default
          try {
            const project = await getProject(projectId);
            if (project) {
              projectTotalBudget = project.budget || 250000;
            }
          } catch (error) {
            console.warn('Could not load project budget, using default');
          }
          const contingencyDelaySpent = await calculateContingencyDelaySpent(projectTotalBudget);
          const defaultBudget = getDefaultBudget(projectTotalBudget, contingencyDelaySpent);
          setBudget(defaultBudget);
          setSharedBudget(defaultBudget);
        }
      } catch (error) {
        console.error('❌ Error loading budget from Firebase:', error);
        // On error, get project's totalBudget or use defaults
        let projectTotalBudget = 250000; // Default
        try {
          const project = await getProject(projectId);
          if (project) {
            projectTotalBudget = project.budget || 250000;
          }
        } catch (err) {
          console.warn('Could not load project budget, using default');
        }
        const contingencyDelaySpent = await calculateContingencyDelaySpent(projectTotalBudget);
        const defaultBudget = getDefaultBudget(projectTotalBudget, contingencyDelaySpent, 10);
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
  const initialMaterialsSpent = calculateMaterialsSpent();
  
  const getDefaultBudget = (totalBudget: number = 250000, contingencyDelaySpent: number = 0, contingencyPercentage: number = 10): ProjectBudget => {
    // Calculate 20% of total budget for materials category
    const materialsAllocated = Math.round(totalBudget * 0.2);
    
    // Calculate allocated amount for Contingency Delay from contingency percentage
    const contingencyDelayAllocated = (totalBudget * contingencyPercentage) / 100;
    
    const categories = [
      {
        id: 'materials',
        name: 'Materials',
        allocatedAmount: materialsAllocated,
        spentAmount: initialMaterialsSpent,
        description: 'Material purchases (Auto-calculated)',
        lastUpdated: new Date(),
        isPrimary: true,
      },
      {
        id: 'contingency_delay',
        name: 'Contingency Delay',
        allocatedAmount: contingencyDelayAllocated,
        spentAmount: contingencyDelaySpent,
        description: 'Auto-calculated penalty based on delay prediction',
        lastUpdated: new Date(),
        isPrimary: true,
      },
    ];
    
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spentAmount, 0);
    
    return {
      totalBudget,
      totalSpent,
      contingencyPercentage,
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
    delayContingencyRate: '2',
  });
  
  // Update totalBudgetForm when budget loads
  React.useEffect(() => {
    const loadFormData = async () => {
      if (budget && projectId) {
        try {
          const project = await getProject(projectId);
          setTotalBudgetForm({
            totalBudget: budget.totalBudget.toString(),
            contingencyPercentage: budget.contingencyPercentage.toString(),
            delayContingencyRate: (project?.delayContingencyRate || 2).toString(),
          });
        } catch (error) {
          console.error('Error loading project for delay contingency rate:', error);
          setTotalBudgetForm({
            totalBudget: budget.totalBudget.toString(),
            contingencyPercentage: budget.contingencyPercentage.toString(),
            delayContingencyRate: '2',
          });
        }
      }
    };
    loadFormData();
  }, [budget, projectId]);

  // Update primary categories when materials change
  // Also update categories based on budget logs
  React.useEffect(() => {
    // Wait for budget to be loaded before updating
    if (loadingBudget) return;
    
    // If no budget exists yet, don't update (will be initialized on load)
    if (!budget) return;
    
    // Prevent updates during sync to avoid loops
    if (isSyncingRef.current) return;
    
    const materialsSpent = calculateMaterialsSpent();
    
    // Check if primary categories need updating
    const materialsCategory = budget.categories.find(cat => cat.id === 'materials');
    
    const materialsChanged = materialsCategory && Math.abs(materialsCategory.spentAmount - materialsSpent) > 0.01;
    
    if (!materialsChanged) return;
    
    // Update immediately (no debounce) to ensure changes persist
    // This is the SINGLE source of truth for budget updates
    // Calculate contingency delay asynchronously
    (async () => {
      const contingencyDelaySpent = await calculateContingencyDelaySpent(budget.totalBudget);
      setBudget((prev) => {
        if (!prev) return getDefaultBudget(250000, 0);
        const updatedCategories = prev.categories
          .filter(cat => cat.id !== 'equipment') // Remove equipment category
          .map(cat => {
          if (cat.id === 'materials') {
            return { ...cat, spentAmount: materialsSpent, lastUpdated: new Date() };
          }
          if (cat.id === 'contingency_delay') {
            return { ...cat, spentAmount: contingencyDelaySpent, lastUpdated: new Date() };
          }
          return cat;
        });
        
        // Ensure Contingency Delay category exists
        const hasContingencyDelay = updatedCategories.some(cat => cat.id === 'contingency_delay');
        if (!hasContingencyDelay) {
          updatedCategories.push({
            id: 'contingency_delay',
            name: 'Contingency Delay',
            allocatedAmount: 0,
            spentAmount: contingencyDelaySpent,
            description: 'Auto-calculated penalty based on delay prediction',
            lastUpdated: new Date(),
            isPrimary: true,
          });
        }
      
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
    })();
  }, [state.materials, state.budgetLogs, budget, loadingBudget]);

    // Update contingency delay category when delay predictions might change
    // This runs periodically to keep the category up-to-date
    React.useEffect(() => {
      if (loadingBudget || !budget || isSyncingRef.current) return;
      
      // Update contingency delay category every time budget is accessed
      // This ensures it stays current with latest delay predictions
      (async () => {
        const contingencyDelaySpent = await calculateContingencyDelaySpent(budget.totalBudget);
        const contingencyDelayAllocated = (budget.totalBudget * budget.contingencyPercentage) / 100;
        const contingencyCategory = budget.categories.find(cat => cat.id === 'contingency_delay');
        
        // Only update if the value has changed
        const needsUpdate = !contingencyCategory || 
          Math.abs(contingencyCategory.spentAmount - contingencyDelaySpent) > 0.01 ||
          Math.abs(contingencyCategory.allocatedAmount - contingencyDelayAllocated) > 0.01;
        
        if (needsUpdate) {
          setBudget((prev) => {
            if (!prev) return prev;
            
            const updatedCategories = prev.categories.map(cat => {
              if (cat.id === 'contingency_delay') {
                return { 
                  ...cat, 
                  allocatedAmount: contingencyDelayAllocated,
                  spentAmount: contingencyDelaySpent, 
                  lastUpdated: new Date() 
                };
              }
              return cat;
            });
            
            // Ensure category exists if it doesn't
            const hasContingencyDelay = updatedCategories.some(cat => cat.id === 'contingency_delay');
            if (!hasContingencyDelay) {
              updatedCategories.push({
                id: 'contingency_delay',
                name: 'Contingency Delay',
                allocatedAmount: contingencyDelayAllocated,
                spentAmount: contingencyDelaySpent,
                description: 'Auto-calculated penalty based on delay prediction',
                lastUpdated: new Date(),
                isPrimary: true,
              });
            }
            
            const newTotalSpent = updatedCategories.reduce((sum, cat) => sum + cat.spentAmount, 0);
            
            const updatedBudget: ProjectBudget = {
              ...prev,
              categories: updatedCategories,
              totalSpent: newTotalSpent,
              lastUpdated: new Date(),
            };
            
            saveBudgetToFirebase(updatedBudget);
            return updatedBudget;
          });
        }
      })();
    }, [budget, loadingBudget]);

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

  const openTotalBudgetModal = async () => {
    if (!budget || !projectId) return;
    try {
      const project = await getProject(projectId);
      setTotalBudgetForm({
        totalBudget: budget.totalBudget.toString(),
        contingencyPercentage: budget.contingencyPercentage.toString(),
        delayContingencyRate: (project?.delayContingencyRate || 2).toString(),
      });
    } catch (error) {
      console.error('Error loading project:', error);
      setTotalBudgetForm({
        totalBudget: budget.totalBudget.toString(),
        contingencyPercentage: budget.contingencyPercentage.toString(),
        delayContingencyRate: '2',
      });
    }
    setTotalBudgetModalVisible(true);
  };

  const saveCategory = () => {
    if (!formData.name.trim() || !formData.allocatedAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    let allocatedAmount = parseFloat(formData.allocatedAmount);
    
    // For primary categories, only allow editing allocated amount (except Contingency Delay)
    const isPrimary = editingCategory?.isPrimary;
    const isContingencyDelay = editingCategory?.id === 'contingency_delay';
    
    // For Contingency Delay, allocated amount comes from contingency percentage
    // Don't allow manual editing - it's set from Edit Total Budget modal
    if (isContingencyDelay && budget) {
      allocatedAmount = (budget.totalBudget * budget.contingencyPercentage) / 100;
    }
    
    // Validate that total allocated doesn't exceed total budget
    if (!budget) {
      Alert.alert('Error', 'Budget not loaded');
      return;
    }
    
    const otherCategoriesAllocated = budget.categories
      .filter(cat => editingCategory ? cat.id !== editingCategory.id : true)
      .reduce((sum, cat) => sum + cat.allocatedAmount, 0);
    
    const totalAllocated = otherCategoriesAllocated + allocatedAmount;
    
    if (totalAllocated > budget.totalBudget) {
      Alert.alert(
        'Budget Exceeded',
        `Total allocated amount (₱${(totalAllocated / 1000).toFixed(0)}K) cannot exceed total budget (₱${(budget.totalBudget / 1000).toFixed(0)}K). Please reduce the allocated amount.`
      );
      return;
    }
    
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
    if (!budget || !projectId) return;

    const newTotalBudget = parseFloat(totalBudgetForm.totalBudget);
    const newContingencyPercentage = parseFloat(totalBudgetForm.contingencyPercentage);
    const newDelayContingencyRate = parseFloat(totalBudgetForm.delayContingencyRate);

    if (!newTotalBudget || newTotalBudget <= 0) {
      Alert.alert('Error', 'Please enter a valid total budget');
      return;
    }

    if (newContingencyPercentage < 0 || newContingencyPercentage > 50) {
      Alert.alert('Error', 'Contingency percentage must be between 0% and 50%');
      return;
    }

    if (newDelayContingencyRate < 0 || newDelayContingencyRate > 10) {
      Alert.alert('Error', 'Delay contingency rate must be between 0% and 10% per day');
      return;
    }

    // Update project's delayContingencyRate
    try {
      await updateProject(projectId, {
        budget: newTotalBudget,
        delayContingencyRate: newDelayContingencyRate,
      });
    } catch (error) {
      console.error('Error updating project:', error);
      Alert.alert('Error', 'Failed to update delay contingency rate');
      return;
    }

    // Calculate new allocated amount for Contingency Delay category
    const contingencyDelayAllocated = (newTotalBudget * newContingencyPercentage) / 100;
    
    // Update Contingency Delay category's allocated amount
    const updatedCategories = budget.categories.map(cat => {
      if (cat.id === 'contingency_delay') {
        return {
          ...cat,
          allocatedAmount: contingencyDelayAllocated,
          lastUpdated: new Date(),
        };
      }
      return cat;
    });

    // Ensure Contingency Delay category exists
    const hasContingencyDelay = updatedCategories.some(cat => cat.id === 'contingency_delay');
    if (!hasContingencyDelay) {
      // Calculate spent amount for new category
      const contingencyDelaySpent = await calculateContingencyDelaySpent(newTotalBudget);
      updatedCategories.push({
        id: 'contingency_delay',
        name: 'Contingency Delay',
        allocatedAmount: contingencyDelayAllocated,
        spentAmount: contingencyDelaySpent,
        description: 'Auto-calculated penalty based on delay prediction',
        lastUpdated: new Date(),
        isPrimary: true,
      });
    }

    const updatedBudget: ProjectBudget = {
      ...budget,
      totalBudget: newTotalBudget,
      contingencyPercentage: newContingencyPercentage,
      categories: updatedCategories,
      lastUpdated: new Date(),
    };

    setBudget(updatedBudget);
    
    // Immediately save to Firebase
    await saveBudgetToFirebase(updatedBudget);

    setSuccessMessage('Total budget, contingency percentage, and delay contingency rate updated successfully');
    setShowSuccessDialog(true);
    setTotalBudgetModalVisible(false);
  };

  const deleteCategory = (categoryId: string, isPrimary?: boolean) => {
    if (!budget) return;
    
    // Prevent deletion of primary categories
    if (isPrimary) {
      Alert.alert(
        'Cannot Delete',
        'Materials is a primary category that cannot be deleted. It is automatically synced with your inventory.'
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
              <Text style={styles.budgetLabel}>Contingency Allocation ({budget.contingencyPercentage}%):</Text>
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
                  {editingCategory.id === 'contingency_delay' 
                    ? '⚠️ This is a protected category. Penalty amount is auto-calculated from delay predictions. Allocated amount is not used for this category.'
                    : `⚠️ This is a primary category. Spent amount is auto-calculated from ${editingCategory.name} inventory.`}
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
              disabled={editingCategory?.id === 'contingency_delay'}
            />
            {editingCategory?.id === 'contingency_delay' && (
              <Paragraph style={styles.helperText}>
                Allocated amount is automatically calculated from Contingency Percentage in Edit Total Budget. It cannot be manually edited here.
              </Paragraph>
            )}

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
            {(() => {
              const totalBudget = parseFloat(totalBudgetForm.totalBudget || '0');
              const contingencyPercent = parseFloat(totalBudgetForm.contingencyPercentage || '0');
              const calculatedAmount = (totalBudget * contingencyPercent) / 100;
              return (
                <>
                  <Paragraph style={styles.calculatedAmount}>
                    <Text style={styles.calculatedAmountBold}>{formatCurrency(calculatedAmount)}</Text>
                  </Paragraph>
                  <Paragraph style={styles.helperText}>
                    Percentage of total budget allocated for Contingency Delay category
                  </Paragraph>
                </>
              );
            })()}

            <TextInput
              mode="outlined"
              label="Delay Penalty Rate (% per day) *"
              value={totalBudgetForm.delayContingencyRate}
              onChangeText={(text) => setTotalBudgetForm(prev => ({ ...prev, delayContingencyRate: text }))}
              keyboardType="numeric"
              style={styles.input}
              right={<TextInput.Affix text="%" />}
              textColor={theme.colors.text}
            />
            {(() => {
              const totalBudget = parseFloat(totalBudgetForm.totalBudget || '0');
              const delayRate = parseFloat(totalBudgetForm.delayContingencyRate || '0');
              const perDayAmount = (totalBudget * delayRate) / 100;
              return (
                <>
                  <Paragraph style={styles.calculatedAmount}>
                    <Text style={styles.calculatedAmountBold}>{formatCurrency(perDayAmount)} per day</Text>
                  </Paragraph>
                  <Paragraph style={styles.helperText}>
                    Percentage of total budget deducted per day of predicted delay (used to calculate spent amount)
                  </Paragraph>
                </>
              );
            })()}

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
  helperText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    marginHorizontal: spacing.xs,
  },
  calculatedAmount: {
    fontSize: fontSizes.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  calculatedAmountBold: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
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



