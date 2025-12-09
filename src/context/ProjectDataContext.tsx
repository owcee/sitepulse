import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
import * as firebaseDataService from '../services/firebaseDataService';
import { getProject } from '../services/projectService';

// Types
export interface Material {
  id: string;
  name: string;
  quantity: number; // Current available quantity
  totalBought?: number; // Total quantity purchased
  price: number;
  unit: string;
  category: string;
  supplier?: string;
  dateAdded: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  contractType: 'daily' | 'weekly' | 'monthly';
  rate: number;
  phone: string;
  email?: string;
  status: 'active' | 'inactive';
  dateHired: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: 'owned' | 'rental';
  category: string;
  condition: 'excellent' | 'good' | 'fair' | 'needs_repair';
  rentalCost?: number;
  quantity?: number; // Number of pieces/units
  status: 'available' | 'in_use' | 'maintenance';
  dateAcquired: string;
}

export interface BudgetLog {
  id: string;
  category: 'materials' | 'workers' | 'equipment' | 'other';
  description: string;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  reference?: string;
}


export interface BudgetCategory {
  id: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  description?: string;
  lastUpdated: Date;
  isPrimary?: boolean;
}

export interface ProjectBudget {
  totalBudget: number;
  totalSpent: number;
  categories: BudgetCategory[];
  contingencyPercentage: number;
  lastUpdated: Date;
}

export interface ProjectData {
  materials: Material[];
  workers: Worker[];
  equipment: Equipment[];
  budgetLogs: BudgetLog[];
  totalBudget: number;
  budget?: ProjectBudget; // Optional shared budget state
  loading: boolean;
  error: string | null;
}

// Action types
type ProjectAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ALL_DATA'; payload: { materials: Material[]; workers: Worker[]; equipment: Equipment[]; budgetLogs: BudgetLog[]; totalBudget: number } }
  | { type: 'ADD_MATERIAL'; payload: Material }
  | { type: 'UPDATE_MATERIAL'; payload: { id: string; updates: Partial<Material> } }
  | { type: 'DELETE_MATERIAL'; payload: string }
  | { type: 'ADD_WORKER'; payload: Worker }
  | { type: 'UPDATE_WORKER'; payload: { id: string; updates: Partial<Worker> } }
  | { type: 'DELETE_WORKER'; payload: string }
  | { type: 'ADD_EQUIPMENT'; payload: Equipment }
  | { type: 'UPDATE_EQUIPMENT'; payload: { id: string; updates: Partial<Equipment> } }
  | { type: 'DELETE_EQUIPMENT'; payload: string }
  | { type: 'ADD_BUDGET_LOG'; payload: BudgetLog }
  | { type: 'UPDATE_BUDGET_LOG'; payload: { id: string; updates: Partial<BudgetLog> } }
  | { type: 'DELETE_BUDGET_LOG'; payload: string }
  | { type: 'UPDATE_BUDGET_SETTINGS'; payload: { totalBudget?: number } }
  | { type: 'SET_BUDGET'; payload: ProjectBudget }
  | { type: 'UPDATE_BUDGET'; payload: Partial<ProjectBudget> };

// Initial state - empty until loaded from Firebase
const initialState: ProjectData = {
  materials: [],
  workers: [],
  equipment: [],
  budgetLogs: [],
  totalBudget: 100000,
  budget: undefined,
  loading: true,
  error: null,
};

// Reducer
function projectDataReducer(state: ProjectData, action: ProjectAction): ProjectData {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_ALL_DATA':
      return {
        ...state,
        materials: action.payload.materials,
        workers: action.payload.workers,
        equipment: action.payload.equipment,
        budgetLogs: action.payload.budgetLogs,
        totalBudget: action.payload.totalBudget,
        loading: false,
        error: null,
      };
    case 'ADD_MATERIAL':
      return { ...state, materials: [...state.materials, action.payload] };
    case 'UPDATE_MATERIAL':
      return {
        ...state,
        materials: state.materials.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
        ),
      };
    case 'DELETE_MATERIAL':
      return {
        ...state,
        materials: state.materials.filter(item => item.id !== action.payload),
      };
    case 'ADD_WORKER':
      return { ...state, workers: [...state.workers, action.payload] };
    case 'UPDATE_WORKER':
      return {
        ...state,
        workers: state.workers.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
        ),
      };
    case 'DELETE_WORKER':
      return {
        ...state,
        workers: state.workers.filter(item => item.id !== action.payload),
      };
    case 'ADD_EQUIPMENT':
      return { ...state, equipment: [...state.equipment, action.payload] };
    case 'UPDATE_EQUIPMENT':
      return {
        ...state,
        equipment: state.equipment.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
        ),
      };
    case 'DELETE_EQUIPMENT':
      return {
        ...state,
        equipment: state.equipment.filter(item => item.id !== action.payload),
      };
    case 'ADD_BUDGET_LOG':
      return { ...state, budgetLogs: [...state.budgetLogs, action.payload] };
    case 'UPDATE_BUDGET_LOG':
      return {
        ...state,
        budgetLogs: state.budgetLogs.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
        ),
      };
    case 'DELETE_BUDGET_LOG':
      return {
        ...state,
        budgetLogs: state.budgetLogs.filter(item => item.id !== action.payload),
      };
    case 'UPDATE_BUDGET_SETTINGS':
      return {
        ...state,
        totalBudget: action.payload.totalBudget ?? state.totalBudget,
      };
    case 'SET_BUDGET':
      return {
        ...state,
        budget: action.payload,
      };
    case 'UPDATE_BUDGET':
      return {
        ...state,
        budget: state.budget ? { ...state.budget, ...action.payload } : undefined,
      };
    default:
      return state;
  }
}

// Context
interface ProjectDataContextType {
  state: ProjectData;
  dispatch: React.Dispatch<ProjectAction>;
  projectId: string;
  refreshData: () => Promise<void>;
  // Helper functions
  addMaterial: (material: Omit<Material, 'id'>) => Promise<void>;
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  addWorker: (worker: Omit<Worker, 'id'>) => Promise<void>;
  updateWorker: (id: string, updates: Partial<Worker>) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;
  addEquipment: (equipment: Omit<Equipment, 'id'>) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  addBudgetLog: (budgetLog: Omit<BudgetLog, 'id'>) => Promise<void>;
  updateBudgetLog: (id: string, updates: Partial<BudgetLog>) => Promise<void>;
  deleteBudgetLog: (id: string) => Promise<void>;
  updateBudgetSettings: (settings: { totalBudget?: number }) => Promise<void>;
  setBudget: (budget: ProjectBudget) => void;
  updateBudget: (updates: Partial<ProjectBudget>) => void;
}

const ProjectDataContext = createContext<ProjectDataContextType | undefined>(undefined);

// Provider component
export function ProjectDataProvider({ 
  children, 
  projectId = 'project-1',
  userId = null,
  userRole = null
}: { 
  children: ReactNode; 
  projectId?: string;
  userId?: string | null;
  userRole?: string | null;
}) {
  const [state, dispatch] = useReducer(projectDataReducer, initialState);
  // Use a ref to store the latest state for async operations
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Helper function to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      ),
    ]);
  };

  // Load all project data from Firebase
  const loadData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Load data with individual timeouts and error handling
      const loadWithFallback = async <T,>(
        loader: () => Promise<T>,
        fallback: T,
        name: string
      ): Promise<T> => {
        try {
          return await withTimeout(loader(), 10000);
        } catch (error: any) {
          console.error(`Error loading ${name}:`, error);
          return fallback;
        }
      };

      const [materials, workers, equipment, budgetLogs, project, savedBudget] = await Promise.all([
        loadWithFallback(
          () => firebaseDataService.getMaterials(projectId),
          [],
          'materials'
        ),
        loadWithFallback(
          () => firebaseDataService.getWorkers(projectId),
          [],
          'workers'
        ),
        loadWithFallback(
          () => firebaseDataService.getEquipment(projectId),
          [],
          'equipment'
        ),
        loadWithFallback(
          () => firebaseDataService.getBudgetLogs(projectId),
          [],
          'budgetLogs'
        ),
        loadWithFallback(
          async () => {
            try {
              return await getProject(projectId);
            } catch (error: any) {
              // If permission denied, log and return null instead of crashing
              if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
                console.warn(`[ProjectDataContext] Permission denied for project ${projectId}. User may not have access.`);
                return null;
              }
              throw error; // Re-throw other errors
            }
          },
          null,
          'project'
        ),
        loadWithFallback(
          () => firebaseDataService.getBudget(projectId),
          null,
          'budget'
        ),
      ]);

      dispatch({
        type: 'SET_ALL_DATA',
        payload: {
          materials,
          workers,
          equipment,
          budgetLogs,
          totalBudget: (project as any)?.totalBudget || 100000,
        },
      });
      
      // Load budget if available and update primary categories with current spent amounts
      if (savedBudget) {
        // Calculate current spent amounts from loaded materials/equipment
        const equipmentSpent = equipment.reduce((total, equip) => {
          if (equip.type === 'rental' && equip.rentalCost) {
            return total + equip.rentalCost;
          }
          return total;
        }, 0);
        
        const materialsSpent = materials.reduce((total, material) => {
          const quantity = material.totalBought || material.quantity;
          return total + (quantity * material.price);
        }, 0);
        
        // Update primary categories with current spent amounts
        // Only fix allocatedAmount if it's clearly wrong (old hardcoded values that don't match 20% of current budget)
        // IMPORTANT: Preserve ALL user adjustments - only fix old hardcoded values (50K or 150K) that are wrong
        const totalBudget = (savedBudget as any).totalBudget || 250000;
        const expectedAllocated = Math.round(totalBudget * 0.2);
        const oldHardcodedValues = [50000, 150000];
        const updatedCategories = (savedBudget as any).categories.map((cat: any) => {
          if (cat.id === 'equipment') {
            // Only fix if: it's exactly one of the old hardcoded values AND it doesn't equal 20% of current budget
            // This preserves any user adjustments (even if not exactly 20%)
            const isOldHardcoded = oldHardcodedValues.includes(cat.allocatedAmount);
            const exceedsBudget = cat.allocatedAmount > totalBudget;
            // Only fix old hardcoded values that are wrong - preserve all other user adjustments
            const shouldFix = exceedsBudget || (isOldHardcoded && cat.allocatedAmount !== expectedAllocated);
            return { 
              ...cat, 
              spentAmount: equipmentSpent, 
              allocatedAmount: shouldFix ? expectedAllocated : cat.allocatedAmount,
              lastUpdated: shouldFix ? new Date() : (cat.lastUpdated || new Date()) // Only update timestamp if we fixed it
            };
          }
          if (cat.id === 'materials') {
            // Only fix if: it's exactly one of the old hardcoded values AND it doesn't equal 20% of current budget
            // This preserves any user adjustments (even if not exactly 20%)
            const isOldHardcoded = oldHardcodedValues.includes(cat.allocatedAmount);
            const exceedsBudget = cat.allocatedAmount > totalBudget;
            // Only fix old hardcoded values that are wrong - preserve all other user adjustments
            const shouldFix = exceedsBudget || (isOldHardcoded && cat.allocatedAmount !== expectedAllocated);
            return { 
              ...cat, 
              spentAmount: materialsSpent, 
              allocatedAmount: shouldFix ? expectedAllocated : cat.allocatedAmount,
              lastUpdated: shouldFix ? new Date() : (cat.lastUpdated || new Date()) // Only update timestamp if we fixed it
            };
          }
          return {
            ...cat,
            lastUpdated: cat.lastUpdated || new Date(),
          };
        });
        
        // Calculate total spent
        const totalSpent = updatedCategories.reduce((sum: number, cat: any) => sum + cat.spentAmount, 0);
        
        const loadedBudget: ProjectBudget = {
          totalBudget: (savedBudget as any).totalBudget,
          totalSpent: totalSpent,
          contingencyPercentage: (savedBudget as any).contingencyPercentage,
          lastUpdated: (savedBudget as any).lastUpdated,
          categories: updatedCategories,
        };
        dispatch({ type: 'SET_BUDGET', payload: loadedBudget });
        console.log('✅ Budget loaded and updated with current spent amounts on app start');
      }
    } catch (error: any) {
      console.error('Error loading project data:', error);
      // Even on error, set empty data so app doesn't freeze
      dispatch({
        type: 'SET_ALL_DATA',
        payload: {
          materials: [],
          workers: [],
          equipment: [],
          budgetLogs: [],
          totalBudget: 100000,
        },
      });
    }
  };

  // Load data on mount or when projectId changes
  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  // Refresh data manually
  const refreshData = async () => {
    await loadData();
  };

  // Helper function to recalculate and update budget based on current materials/equipment
  // Uses stateRef to get the latest state to avoid stale closures
  const recalculateBudget = async () => {
    // Use a small delay to ensure state has been updated after dispatch
    setTimeout(async () => {
      // Get the latest state from ref to avoid stale closure
      const currentState = stateRef.current;
      if (!currentState.budget || !projectId) {
        console.log('⚠️ Cannot recalculate budget: budget or projectId missing');
        return;
      }
      
      try {
        // Calculate equipment and materials spent from current state
        const equipmentSpent = currentState.equipment.reduce((total, equip) => {
          if (equip.type === 'rental' && equip.rentalCost) {
            return total + equip.rentalCost;
          }
          return total;
        }, 0);
        
        const materialsSpent = currentState.materials.reduce((total, material) => {
          const quantity = material.totalBought || material.quantity;
          return total + (quantity * material.price);
        }, 0);
        
        console.log('📊 Recalculating budget:', { equipmentSpent, materialsSpent });
        
        // Update budget categories
        const updatedCategories = currentState.budget.categories.map(cat => {
          if (cat.id === 'equipment') {
            return { ...cat, spentAmount: equipmentSpent, lastUpdated: new Date() };
          }
          if (cat.id === 'materials') {
            return { ...cat, spentAmount: materialsSpent, lastUpdated: new Date() };
          }
          return cat;
        });
        
        // Calculate total spent
        const newTotalSpent = updatedCategories.reduce((sum, cat) => sum + cat.spentAmount, 0);
        
        const updatedBudget: ProjectBudget = {
          ...currentState.budget,
          categories: updatedCategories,
          totalSpent: newTotalSpent,
          lastUpdated: new Date(),
        };
        
        // Save to Firebase and update shared state
        await firebaseDataService.saveBudget(projectId, updatedBudget);
        dispatch({ type: 'SET_BUDGET', payload: updatedBudget });
        console.log('✅ Budget recalculated and updated after material/equipment change', updatedBudget);
      } catch (error: any) {
        console.error('Error recalculating budget:', error);
      }
    }, 200); // Delay to ensure state is updated after dispatch
  };

  const addMaterial = async (material: Omit<Material, 'id'>) => {
    try {
      const newMaterial = await firebaseDataService.addMaterial(projectId, material);
      dispatch({ type: 'ADD_MATERIAL', payload: newMaterial as Material });
      // Trigger budget recalculation after material add
      setTimeout(() => recalculateBudget(), 100);
    } catch (error: any) {
      console.error('Error adding material:', error);
      throw error;
    }
  };

  const updateMaterial = async (id: string, updates: Partial<Material>) => {
    try {
      await firebaseDataService.updateMaterial(id, updates);
      dispatch({ type: 'UPDATE_MATERIAL', payload: { id, updates } });
      // Trigger budget recalculation after material update
      setTimeout(() => recalculateBudget(), 100);
    } catch (error: any) {
      console.error('Error updating material:', error);
      throw error;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      await firebaseDataService.deleteMaterial(id);
      dispatch({ type: 'DELETE_MATERIAL', payload: id });
    } catch (error: any) {
      console.error('Error deleting material:', error);
      throw error;
    }
  };

  const addWorker = async (worker: Omit<Worker, 'id'>) => {
    try {
      const newWorker = await firebaseDataService.addWorker(projectId, worker);
      dispatch({ type: 'ADD_WORKER', payload: newWorker as Worker });
    } catch (error: any) {
      console.error('Error adding worker:', error);
      throw error;
    }
  };

  const updateWorker = async (id: string, updates: Partial<Worker>) => {
    try {
      await firebaseDataService.updateWorker(id, updates);
      dispatch({ type: 'UPDATE_WORKER', payload: { id, updates } });
    } catch (error: any) {
      console.error('Error updating worker:', error);
      throw error;
    }
  };

  const deleteWorker = async (id: string) => {
    try {
      await firebaseDataService.deleteWorker(id);
      dispatch({ type: 'DELETE_WORKER', payload: id });
    } catch (error: any) {
      console.error('Error deleting worker:', error);
      throw error;
    }
  };

  const addEquipment = async (equipment: Omit<Equipment, 'id'>) => {
    try {
      const newEquipment = await firebaseDataService.addEquipment(projectId, equipment);
      dispatch({ type: 'ADD_EQUIPMENT', payload: newEquipment as Equipment });
      // Trigger budget recalculation after equipment add
      setTimeout(() => recalculateBudget(), 100);
    } catch (error: any) {
      console.error('Error adding equipment:', error);
      throw error;
    }
  };

  const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
    try {
      await firebaseDataService.updateEquipment(id, updates);
      dispatch({ type: 'UPDATE_EQUIPMENT', payload: { id, updates } });
      // Trigger budget recalculation after equipment update
      setTimeout(() => recalculateBudget(), 100);
    } catch (error: any) {
      console.error('Error updating equipment:', error);
      throw error;
    }
  };

  const deleteEquipment = async (id: string) => {
    try {
      await firebaseDataService.deleteEquipment(id);
      dispatch({ type: 'DELETE_EQUIPMENT', payload: id });
    } catch (error: any) {
      console.error('Error deleting equipment:', error);
      throw error;
    }
  };

  const addBudgetLog = async (budgetLog: Omit<BudgetLog, 'id'>) => {
    try {
      const newLog = await firebaseDataService.addBudgetLog(projectId, budgetLog);
      dispatch({ type: 'ADD_BUDGET_LOG', payload: newLog as BudgetLog });
    } catch (error: any) {
      console.error('Error adding budget log:', error);
      throw error;
    }
  };

  const updateBudgetLog = async (id: string, updates: Partial<BudgetLog>) => {
    try {
      await firebaseDataService.updateBudgetLog(id, updates);
      dispatch({ type: 'UPDATE_BUDGET_LOG', payload: { id, updates } });
    } catch (error: any) {
      console.error('Error updating budget log:', error);
      throw error;
    }
  };

  const deleteBudgetLog = async (id: string) => {
    try {
      await firebaseDataService.deleteBudgetLog(id);
      dispatch({ type: 'DELETE_BUDGET_LOG', payload: id });
    } catch (error: any) {
      console.error('Error deleting budget log:', error);
      throw error;
    }
  };

  const updateBudgetSettings = async (settings: { totalBudget?: number }) => {
    try {
      await firebaseDataService.updateProject(projectId, settings);
      dispatch({ type: 'UPDATE_BUDGET_SETTINGS', payload: settings });
    } catch (error: any) {
      console.error('Error updating budget settings:', error);
      throw error;
    }
  };

  const setBudget = (budget: ProjectBudget) => {
    dispatch({ type: 'SET_BUDGET', payload: budget });
  };

  const updateBudget = (updates: Partial<ProjectBudget>) => {
    dispatch({ type: 'UPDATE_BUDGET', payload: updates });
  };

  const value: ProjectDataContextType = {
    state,
    dispatch,
    projectId,
    refreshData,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addWorker,
    updateWorker,
    deleteWorker,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    addBudgetLog,
    updateBudgetLog,
    deleteBudgetLog,
    updateBudgetSettings,
    setBudget,
    updateBudget,
  };

  return <ProjectDataContext.Provider value={value}>{children}</ProjectDataContext.Provider>;
}

// Hook to use the context
export function useProjectData() {
  const context = useContext(ProjectDataContext);
  if (context === undefined) {
    throw new Error('useProjectData must be used within a ProjectDataProvider');
  }
  return context;
}


