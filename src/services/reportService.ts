import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  getDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { TaskPhoto } from './photoService';
import { UsageSubmission } from './usageService';

export interface VerificationLog {
  id: string;
  workerId: string;
  workerName: string;
  type: 'equipment' | 'material' | 'task' | 'damage';
  photo: string;
  workerNotes: string;
  timestamp: string; // ISO string
  status: 'pending' | 'approved' | 'rejected';
  engineerNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rawTimestamp: Date; // For sorting
  taskTitle?: string; // For task completion photos
  itemName?: string; // For material/equipment/damage
  // CNN fields for task photos
  cnnEligible?: boolean; // Whether the task is CNN eligible
  cnnLabel?: string; // CNN prediction label (e.g., "Concrete pouring - Not started")
  cnnConfidence?: number; // CNN confidence (0-1)
}

export interface WorkerVerificationData {
  workerId: string;
  workerName: string;
  pendingCount: number;
  lastActivity: string;
  logs: VerificationLog[];
}

/**
 * Fetch all verification logs (task photos + usage submissions) for a project
 * @param projectId - Project ID
 * @returns Promise<WorkerVerificationData[]> - Aggregated data per worker
 */
export async function getProjectVerificationLogs(projectId: string): Promise<WorkerVerificationData[]> {
  try {
    // 1. Fetch Task Photos
    console.log('Fetching photos for project:', projectId);
    const photosRef = collection(db, 'task_photos');
    const photosQuery = query(
      photosRef,
      where('projectId', '==', projectId)
    );
    
    let photosSnapshot;
    try {
      photosSnapshot = await getDocs(photosQuery);
      console.log(`Fetched ${photosSnapshot.size} photos`);
    } catch (e) {
      console.error('Error fetching photos:', e);
      photosSnapshot = { forEach: () => {}, size: 0 }; // Fallback
    }
    
    // 2. Fetch Usage Submissions
    console.log('Fetching usage submissions for project:', projectId);
    const usageRef = collection(db, 'usage_submissions');
    const usageQuery = query(
      usageRef,
      where('projectId', '==', projectId)
    );
    
    let usageSnapshot;
    try {
      usageSnapshot = await getDocs(usageQuery);
      console.log(`Fetched ${usageSnapshot.size} usage submissions`);
    } catch (e) {
      console.error('Error fetching usage:', e);
      usageSnapshot = { forEach: () => {}, size: 0 }; // Fallback
    }

    // 3. Process and normalize data
    const logs: VerificationLog[] = [];

    // Process Photos
    const taskCache = new Map<string, { title: string; cnnEligible: boolean }>(); // Cache task data
    
    for (const docSnapshot of photosSnapshot.docs || []) {
      const data = docSnapshot.data();
      
      // DEBUG LOGGING
      if (data.cnnClassification) {
        console.log(`[DEBUG] Photo ${docSnapshot.id} has CNN data:`, JSON.stringify(data.cnnClassification));
      } else {
        console.log(`[DEBUG] Photo ${docSnapshot.id} has NO CNN data`);
      }
      
      // Fetch task data if not cached
      let taskTitle = 'Unknown Task';
      let cnnEligible = false;
      
      if (data.taskId) {
        if (taskCache.has(data.taskId)) {
          const cached = taskCache.get(data.taskId)!;
          taskTitle = cached.title;
          cnnEligible = cached.cnnEligible;
        } else {
          try {
            const taskDoc = await getDoc(doc(db, 'tasks', data.taskId));
            if (taskDoc.exists()) {
              const taskData = taskDoc.data();
              taskTitle = taskData.title || 'Untitled Task';
              cnnEligible = taskData.cnnEligible || false;
              taskCache.set(data.taskId, { title: taskTitle, cnnEligible });
            }
          } catch (err) {
            console.error('Error fetching task:', err);
          }
        }
      }
      
        // Handle CNN classification
        let cnnLabel = data.cnnLabel || null; // Prefer the direct field
        let cnnConfidence = data.cnnConfidence || data.confidence || null;

        // Fallback logic if direct field is missing
        if (!cnnLabel && data.cnnClassification) {
          if (typeof data.cnnClassification === 'string') {
            cnnLabel = data.cnnClassification;
          } else if (typeof data.cnnClassification === 'object') {
            cnnLabel = data.cnnClassification.classification || 
                       data.cnnClassification.label || 
                       'Unknown Label';
                       
            if (!cnnConfidence && data.cnnClassification.confidence) {
              cnnConfidence = data.cnnClassification.confidence;
            }
          }
        } else if (!cnnLabel && data.cnnResult) { 
           cnnLabel = data.cnnResult.label || data.cnnResult.classification;
           if (!cnnConfidence) cnnConfidence = data.cnnResult.confidence || data.cnnResult.score;
        }

        logs.push({
        id: docSnapshot.id,
        workerId: data.uploaderId,
        workerName: data.uploaderName || 'Unknown Worker',
        type: 'task',
        photo: data.imageUrl,
        workerNotes: data.notes || 'No notes provided',
        timestamp: data.uploadedAt?.toDate().toISOString() || new Date().toISOString(),
        status: data.verificationStatus,
        engineerNotes: data.rejectionReason,
        verifiedBy: data.verifiedBy,
        verifiedAt: data.verifiedAt?.toDate().toISOString(),
        rawTimestamp: data.uploadedAt?.toDate() || new Date(),
        taskTitle: taskTitle,
        cnnEligible: cnnEligible,
        cnnLabel: cnnLabel,
        cnnConfidence: cnnConfidence
      });
    }

    // Process Usage
    usageSnapshot.forEach(doc => {
      const data = doc.data();
      // Map specific usage types
      let type: 'equipment' | 'material' | 'damage' = 'material';
      if (data.type === 'equipment') type = 'equipment';
      if (data.type === 'damage') type = 'damage';

      logs.push({
        id: doc.id,
        workerId: data.workerId,
        workerName: data.workerName || 'Unknown Worker',
        type: type,
        photo: data.photoUrl,
        workerNotes: data.notes || `Used ${data.itemName}`,
        timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
        status: data.status,
        engineerNotes: data.rejectionReason,
        verifiedBy: data.reviewerId, // usageService uses reviewerId
        verifiedAt: data.reviewedAt?.toDate().toISOString(),
        rawTimestamp: data.timestamp?.toDate() || new Date(),
        itemName: data.itemName // Store item name for usage submissions
      });
    });

    // 4. Group by Worker
    const workerMap = new Map<string, WorkerVerificationData>();

    // Sort all logs by date desc
    logs.sort((a, b) => b.rawTimestamp.getTime() - a.rawTimestamp.getTime());

    logs.forEach(log => {
      if (!log.workerId) {
        console.warn('Log missing workerId:', log.id);
        return;
      }

      if (!workerMap.has(log.workerId)) {
        workerMap.set(log.workerId, {
          workerId: log.workerId,
          workerName: log.workerName || 'Unknown Worker',
          pendingCount: 0,
          lastActivity: log.timestamp,
          logs: []
        });
      }

      const workerData = workerMap.get(log.workerId)!;
      workerData.logs.push(log);
      if (log.status === 'pending') {
        workerData.pendingCount++;
      }
      // Update last activity if this log is newer
      if (new Date(log.timestamp) > new Date(workerData.lastActivity)) {
        workerData.lastActivity = log.timestamp;
      }
    });

    const result = Array.from(workerMap.values());
    console.log(`Processed logs for ${result.length} workers`);
    return result;

  } catch (error) {
    console.error('Error fetching project verification logs:', error);
    // Return empty array instead of throwing to prevent infinite loading
    return [];
  }
}

