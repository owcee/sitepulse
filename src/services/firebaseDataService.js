// Firestore Data Service for SitePulse
// Handles CRUD operations for project data (materials, workers, equipment, budget logs)

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getProject } from './projectService';
import { sendNotification } from './notificationService';

// ============================================================================
// MATERIALS
// ============================================================================

/**
 * Get all materials for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of material objects
 */
export async function getMaterials(projectId) {
  try {
    const materialsRef = collection(db, 'materials');
    const q = query(
      materialsRef, 
      where('projectId', '==', projectId),
      orderBy('dateAdded', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting materials:', error);
    throw new Error('Failed to fetch materials');
  }
}

/**
 * Add a new material
 * @param {string} projectId - Project ID
 * @param {Object} material - Material data
 * @returns {Promise<Object>} Created material with ID
 */
export async function addMaterial(projectId, material) {
  try {
    const materialsRef = collection(db, 'materials');
    const materialData = {
      ...material,
      projectId,
      dateAdded: material.dateAdded || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(materialsRef, materialData);
    
    // Check for low stock after adding (if quantity is already low)
    const quantity = material.quantity || 0;
    const totalBought = material.totalBought || quantity;
    const materialName = material.name || 'Material';
    const unit = material.unit || 'units';
    
    // Check for low stock (threshold: 10 units OR 20% of totalBought, whichever is higher)
    const percentageThreshold = Math.floor(totalBought * 0.2); // 20% of total
    const LOW_STOCK_THRESHOLD = Math.max(10, percentageThreshold); // At least 10 units, or 20% if higher
    
    if (quantity <= LOW_STOCK_THRESHOLD) {
      // Send low stock alert to engineer
      try {
        const project = await getProject(projectId);
        if (project && project.engineerId) {
          await sendNotification(project.engineerId, {
            title: 'Low Stock Alert',
            body: `Stock for ${materialName} is low (${quantity} out of ${totalBought} ${unit} remaining). Please restock soon.`,
            type: 'low_stock',
            relatedId: docRef.id,
            projectId: projectId,
            status: 'warning'
          });
          console.log('Low stock alert sent to engineer for new material');
        }
      } catch (notifError) {
        console.error('Failed to send low stock notification:', notifError);
        // Don't throw - material addition should still succeed
      }
    }
    
    return {
      id: docRef.id,
      ...materialData
    };
  } catch (error) {
    console.error('Error adding material:', error);
    throw new Error('Failed to add material');
  }
}

/**
 * Update an existing material
 * @param {string} materialId - Material ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateMaterial(materialId, updates) {
  try {
    const materialRef = doc(db, 'materials', materialId);
    const materialSnap = await getDoc(materialRef);
    
    if (!materialSnap.exists()) {
      throw new Error('Material not found');
    }
    
    const currentData = materialSnap.data();
    const projectId = currentData.projectId;
    
    await updateDoc(materialRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    // Check for low stock after update
    const updatedQuantity = updates.quantity !== undefined ? updates.quantity : currentData.quantity;
    const totalBought = updates.totalBought !== undefined ? updates.totalBought : (currentData.totalBought || updatedQuantity);
    const materialName = updates.name || currentData.name;
    const unit = updates.unit || currentData.unit || 'units';
    
    // Check for low stock (threshold: 10 units OR 20% of totalBought, whichever is higher)
    const percentageThreshold = Math.floor(totalBought * 0.2); // 20% of total
    const LOW_STOCK_THRESHOLD = Math.max(10, percentageThreshold); // At least 10 units, or 20% if higher
    
    if (updatedQuantity <= LOW_STOCK_THRESHOLD) {
      // Send low stock alert to engineer
      try {
        const project = await getProject(projectId);
        if (project && project.engineerId) {
          await sendNotification(project.engineerId, {
            title: 'Low Stock Alert',
            body: `Stock for ${materialName} is low (${updatedQuantity} out of ${totalBought} ${unit} remaining). Please restock soon.`,
            type: 'low_stock',
            relatedId: materialId,
            projectId: projectId,
            status: 'warning'
          });
          console.log('Low stock alert sent to engineer for material update');
        }
      } catch (notifError) {
        console.error('Failed to send low stock notification:', notifError);
        // Don't throw - material update should still succeed
      }
    }
  } catch (error) {
    console.error('Error updating material:', error);
    throw new Error('Failed to update material');
  }
}

/**
 * Delete a material
 * @param {string} materialId - Material ID
 * @returns {Promise<void>}
 */
export async function deleteMaterial(materialId) {
  try {
    const materialRef = doc(db, 'materials', materialId);
    await deleteDoc(materialRef);
  } catch (error) {
    console.error('Error deleting material:', error);
    throw new Error('Failed to delete material');
  }
}

// ============================================================================
// WORKERS
// ============================================================================

/**
 * Get all workers for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of worker objects
 */
export async function getWorkers(projectId) {
  try {
    const workersRef = collection(db, 'workers');
    const q = query(
      workersRef, 
      where('projectId', '==', projectId),
      orderBy('dateHired', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting workers:', error);
    throw new Error('Failed to fetch workers');
  }
}

/**
 * Add a new worker
 * @param {string} projectId - Project ID
 * @param {Object} worker - Worker data
 * @returns {Promise<Object>} Created worker with ID
 */
export async function addWorker(projectId, worker) {
  try {
    const workersRef = collection(db, 'workers');
    const workerData = {
      ...worker,
      projectId,
      dateHired: worker.dateHired || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(workersRef, workerData);
    
    return {
      id: docRef.id,
      ...workerData
    };
  } catch (error) {
    console.error('Error adding worker:', error);
    throw new Error('Failed to add worker');
  }
}

/**
 * Update an existing worker
 * @param {string} workerId - Worker ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateWorker(workerId, updates) {
  try {
    const workerRef = doc(db, 'workers', workerId);
    await updateDoc(workerRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating worker:', error);
    throw new Error('Failed to update worker');
  }
}

/**
 * Delete a worker
 * @param {string} workerId - Worker ID
 * @returns {Promise<void>}
 */
export async function deleteWorker(workerId) {
  try {
    const workerRef = doc(db, 'workers', workerId);
    await deleteDoc(workerRef);
  } catch (error) {
    console.error('Error deleting worker:', error);
    throw new Error('Failed to delete worker');
  }
}

// ============================================================================
// EQUIPMENT
// ============================================================================

/**
 * Get all equipment for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of equipment objects
 */
export async function getEquipment(projectId) {
  try {
    const equipmentRef = collection(db, 'equipment');
    const q = query(
      equipmentRef, 
      where('projectId', '==', projectId),
      orderBy('dateAcquired', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting equipment:', error);
    throw new Error('Failed to fetch equipment');
  }
}

/**
 * Add new equipment
 * @param {string} projectId - Project ID
 * @param {Object} equipment - Equipment data
 * @returns {Promise<Object>} Created equipment with ID
 */
export async function addEquipment(projectId, equipment) {
  try {
    const equipmentRef = collection(db, 'equipment');
    const equipmentData = {
      ...equipment,
      projectId,
      dateAcquired: equipment.dateAcquired || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(equipmentRef, equipmentData);
    
    return {
      id: docRef.id,
      ...equipmentData
    };
  } catch (error) {
    console.error('Error adding equipment:', error);
    throw new Error('Failed to add equipment');
  }
}

/**
 * Update existing equipment
 * @param {string} equipmentId - Equipment ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateEquipment(equipmentId, updates) {
  try {
    const equipmentRef = doc(db, 'equipment', equipmentId);
    await updateDoc(equipmentRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    throw new Error('Failed to update equipment');
  }
}

/**
 * Delete equipment
 * @param {string} equipmentId - Equipment ID
 * @returns {Promise<void>}
 */
export async function deleteEquipment(equipmentId) {
  try {
    const equipmentRef = doc(db, 'equipment', equipmentId);
    await deleteDoc(equipmentRef);
  } catch (error) {
    console.error('Error deleting equipment:', error);
    throw new Error('Failed to delete equipment');
  }
}

// ============================================================================
// BUDGET LOGS
// ============================================================================

/**
 * Get all budget logs for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of budget log objects
 */
export async function getBudgetLogs(projectId) {
  try {
    const logsRef = collection(db, 'budget_logs');
    
    // Try with orderBy first, but if it fails (missing index), fall back to without orderBy
    let q;
    let snapshot;
    
    try {
      q = query(
        logsRef, 
        where('projectId', '==', projectId),
        orderBy('date', 'desc')
      );
      snapshot = await getDocs(q);
    } catch (orderByError) {
      // If orderBy fails (likely missing index), try without it
      console.warn('OrderBy failed, fetching without sorting:', orderByError);
      q = query(
        logsRef, 
        where('projectId', '==', projectId)
      );
      snapshot = await getDocs(q);
      
      // Sort in memory
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by date descending
      logs.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      
      console.log('getBudgetLogs - Fetched and sorted logs:', logs.length);
      return logs;
    }
    
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('getBudgetLogs - Fetched logs:', logs.length);
    return logs;
  } catch (error) {
    console.error('Error getting budget logs:', error);
    throw new Error('Failed to fetch budget logs');
  }
}

/**
 * Add a new budget log
 * @param {string} projectId - Project ID
 * @param {Object} budgetLog - Budget log data
 * @returns {Promise<Object>} Created budget log with ID
 */
export async function addBudgetLog(projectId, budgetLog) {
  try {
    const logsRef = collection(db, 'budget_logs');
    const logData = {
      ...budgetLog,
      projectId,
      date: budgetLog.date || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(logsRef, logData);
    
    return {
      id: docRef.id,
      ...logData
    };
  } catch (error) {
    console.error('Error adding budget log:', error);
    throw new Error('Failed to add budget log');
  }
}

/**
 * Update an existing budget log
 * @param {string} logId - Budget log ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateBudgetLog(logId, updates) {
  try {
    const logRef = doc(db, 'budget_logs', logId);
    await updateDoc(logRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating budget log:', error);
    throw new Error('Failed to update budget log');
  }
}

/**
 * Delete a budget log
 * @param {string} logId - Budget log ID
 * @returns {Promise<void>}
 */
export async function deleteBudgetLog(logId) {
  try {
    const logRef = doc(db, 'budget_logs', logId);
    await deleteDoc(logRef);
  } catch (error) {
    console.error('Error deleting budget log:', error);
    throw new Error('Failed to delete budget log');
  }
}

// ============================================================================
// PROJECTS
// ============================================================================
// Note: getProject is imported from projectService, not defined here

/**
 * Update project settings (totalBudget, contingencyPercentage)
 * @param {string} projectId - Project ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateProject(projectId, updates) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating project:', error);
    throw new Error('Failed to update project');
  }
}

// ============================================================================
// BUDGET
// ============================================================================

/**
 * Get budget data for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object|null>} Budget object or null if not found
 */
export async function getBudget(projectId) {
  try {
    const budgetRef = doc(db, 'budgets', projectId);
    const budgetDoc = await getDoc(budgetRef);
    
    if (budgetDoc.exists()) {
      const data = budgetDoc.data();
      // Convert Firestore Timestamps to Dates
      return {
        id: budgetDoc.id,
        totalBudget: data.totalBudget || 0,
        totalSpent: data.totalSpent || 0,
        contingencyPercentage: data.contingencyPercentage || 10,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        categories: (data.categories || []).map(cat => ({
          ...cat,
          lastUpdated: cat.lastUpdated?.toDate() || new Date(),
        })),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting budget:', error);
    throw new Error('Failed to fetch budget');
  }
}

/**
 * Save or update budget data for a project
 * @param {string} projectId - Project ID
 * @param {Object} budgetData - Budget data
 * @returns {Promise<void>}
 */
export async function saveBudget(projectId, budgetData) {
  try {
    const budgetRef = doc(db, 'budgets', projectId);
    
    // Convert Date objects to ISO strings for arrays (serverTimestamp can't be used in arrays)
    const now = new Date();
    const firestoreData = {
      totalBudget: budgetData.totalBudget,
      totalSpent: budgetData.totalSpent,
      contingencyPercentage: budgetData.contingencyPercentage,
      lastUpdated: serverTimestamp(),
      categories: budgetData.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        allocatedAmount: cat.allocatedAmount,
        spentAmount: cat.spentAmount,
        description: cat.description || null,
        isPrimary: cat.isPrimary || false,
        lastUpdated: cat.lastUpdated ? Timestamp.fromDate(new Date(cat.lastUpdated)) : Timestamp.now(),
      })),
    };
    
    // Check if document exists first
    const budgetDoc = await getDoc(budgetRef);
    
    if (budgetDoc.exists()) {
      await updateDoc(budgetRef, firestoreData);
    } else {
      // Create new document
      await setDoc(budgetRef, {
        ...firestoreData,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error saving budget:', error);
    throw new Error('Failed to save budget');
  }
}



