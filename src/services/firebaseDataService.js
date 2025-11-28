// Firestore Data Service for SitePulse
// Handles CRUD operations for project data (materials, workers, equipment, budget logs)

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

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
    await updateDoc(materialRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
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

/**
 * Get a project by ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object|null>} Project object or null
 */
export async function getProject(projectId) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (projectDoc.exists()) {
      return {
        id: projectDoc.id,
        ...projectDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting project:', error);
    throw new Error('Failed to fetch project');
  }
}

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



