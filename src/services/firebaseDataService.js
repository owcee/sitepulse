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
import { db, auth } from '../firebaseConfig';
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
    
    // Check for low stock (threshold: 4 units OR min_threshold if specified)
    const minThreshold = material.min_threshold || 4;
    const LOW_STOCK_THRESHOLD = minThreshold;
    
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
    
    // Check for low stock (threshold: 4 units OR min_threshold if specified)
    const minThreshold = updates.min_threshold !== undefined ? updates.min_threshold : (currentData.min_threshold || 4);
    const LOW_STOCK_THRESHOLD = minThreshold;
    
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
 * Delete a material (soft delete - moves to deleted_materials collection)
 * @param {string} materialId - Material ID
 * @returns {Promise<void>}
 */
export async function deleteMaterial(materialId) {
  try {
    const materialRef = doc(db, 'materials', materialId);
    const materialSnap = await getDoc(materialRef);
    
    if (!materialSnap.exists()) {
      throw new Error('Material not found');
    }
    
    const materialData = materialSnap.data();
    
    // Create deleted material record
    const deletedMaterialsRef = collection(db, 'deleted_materials');
    await addDoc(deletedMaterialsRef, {
      ...materialData,
      originalId: materialId,
      deletedAt: serverTimestamp(),
      deletedBy: auth.currentUser?.uid || null,
      deletedReason: 'Manual deletion',
    });
    
    // Delete original material
    await deleteDoc(materialRef);
    
    console.log(`Material ${materialId} soft-deleted and moved to deleted_materials`);
  } catch (error) {
    console.error('Error deleting material:', error);
    throw new Error('Failed to delete material');
  }
}

/**
 * Get all deleted materials for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of deleted material objects
 */
export async function getDeletedMaterials(projectId) {
  try {
    const deletedMaterialsRef = collection(db, 'deleted_materials');
    const q = query(
      deletedMaterialsRef,
      where('projectId', '==', projectId),
      orderBy('deletedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      originalId: doc.data().originalId || doc.id,
      ...doc.data(),
      deletedAt: doc.data().deletedAt?.toDate?.() || doc.data().deletedAt || null,
    }));
  } catch (error) {
    console.error('Error getting deleted materials:', error);
    // If orderBy fails, try without it
    try {
      const deletedMaterialsRef = collection(db, 'deleted_materials');
      const q = query(
        deletedMaterialsRef,
        where('projectId', '==', projectId)
      );
      const snapshot = await getDocs(q);
      const materials = snapshot.docs.map(doc => ({
        id: doc.id,
        originalId: doc.data().originalId || doc.id,
        ...doc.data(),
        deletedAt: doc.data().deletedAt?.toDate?.() || doc.data().deletedAt || null,
      }));
      // Sort in memory
      return materials.sort((a, b) => {
        const dateA = a.deletedAt ? (a.deletedAt instanceof Date ? a.deletedAt.getTime() : new Date(a.deletedAt).getTime()) : 0;
        const dateB = b.deletedAt ? (b.deletedAt instanceof Date ? b.deletedAt.getTime() : new Date(b.deletedAt).getTime()) : 0;
        return dateB - dateA;
      });
    } catch (fallbackError) {
      console.error('Error getting deleted materials (fallback):', fallbackError);
      return [];
    }
  }
}

/**
 * Get material usage history for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of usage submissions with task information
 */
export async function getMaterialUsageHistory(projectId) {
  try {
    const usageSubmissionsRef = collection(db, 'usage_submissions');
    const q = query(
      usageSubmissionsRef,
      where('projectId', '==', projectId),
      where('type', '==', 'material'),
      where('status', '==', 'approved'),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const usageHistory = [];
    for (const docItem of snapshot.docs) {
      const data = docItem.data();
      let taskInfo = null;
      
      // Fetch task information if taskId exists
      if (data.taskId) {
        try {
          const taskRef = doc(db, 'tasks', data.taskId);
          const taskSnap = await getDoc(taskRef);
          if (taskSnap.exists()) {
            const taskData = taskSnap.data();
            taskInfo = {
              id: taskSnap.id,
              title: taskData.title || 'Unknown Task',
              category: taskData.category || '',
              subTask: taskData.subTask || '',
            };
          }
        } catch (taskError) {
          console.error('Error fetching task info:', taskError);
        }
      }
      
      usageHistory.push({
        id: docItem.id,
        materialId: data.itemId,
        materialName: data.itemName,
        quantity: data.quantity || 0,
        unit: data.unit || 'units',
        workerName: data.workerName || 'Unknown Worker',
        timestamp: data.timestamp?.toDate?.() || data.timestamp || null,
        reviewedAt: data.reviewedAt?.toDate?.() || data.reviewedAt || null,
        taskId: data.taskId || null,
        taskInfo: taskInfo,
        notes: data.notes || '',
      });
    }
    
    return usageHistory;
  } catch (error) {
    console.error('Error getting material usage history:', error);
    // If orderBy fails, try without it
    try {
      const usageSubmissionsRef = collection(db, 'usage_submissions');
      const q = query(
        usageSubmissionsRef,
        where('projectId', '==', projectId),
        where('type', '==', 'material'),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(q);
      
      const usageHistory = [];
      for (const docItem of snapshot.docs) {
        const data = docItem.data();
        let taskInfo = null;
        
        if (data.taskId) {
          try {
            const taskRef = doc(db, 'tasks', data.taskId);
            const taskSnap = await getDoc(taskRef);
            if (taskSnap.exists()) {
              const taskData = taskSnap.data();
              taskInfo = {
                id: taskSnap.id,
                title: taskData.title || 'Unknown Task',
                category: taskData.category || '',
                subTask: taskData.subTask || '',
              };
            }
          } catch (taskError) {
            console.error('Error fetching task info:', taskError);
          }
        }
        
        usageHistory.push({
          id: docItem.id,
          materialId: data.itemId,
          materialName: data.itemName,
          quantity: data.quantity || 0,
          unit: data.unit || 'units',
          workerName: data.workerName || 'Unknown Worker',
          timestamp: data.timestamp?.toDate?.() || data.timestamp || null,
          reviewedAt: data.reviewedAt?.toDate?.() || data.reviewedAt || null,
          taskId: data.taskId || null,
          taskInfo: taskInfo,
          notes: data.notes || '',
        });
      }
      
      // Sort in memory
      return usageHistory.sort((a, b) => {
        const dateA = a.timestamp ? (a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()) : 0;
        const dateB = b.timestamp ? (b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()) : 0;
        return dateB - dateA;
      });
    } catch (fallbackError) {
      console.error('Error getting material usage history (fallback):', fallbackError);
      return [];
    }
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



