// Worker Assignment Service for SitePulse
// Handles inviting workers to projects, acceptance/rejection flow

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { sendNotification } from './notificationService';

export interface WorkerAssignment {
  workerId: string;
  workerName: string;
  workerEmail: string;
  projectId: string;
  projectName: string;
  status: 'pending' | 'accepted' | 'rejected';
  invitedBy: string;
  invitedByName: string;
  invitedAt: Date;
  decidedAt?: Date;
}

/**
 * Get available workers (not assigned to any project)
 * @returns Promise<Array> - Available workers
 */
export async function getAvailableWorkers(): Promise<any[]> {
  try {
    const workersRef = collection(db, 'worker_accounts');
    const q = query(workersRef, where('projectId', '==', null));
    
    const snapshot = await getDocs(q);
    const workers: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      workers.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        role: data.role || 'worker',
        profileImage: data.profileImage
      });
    });

    return workers;
  } catch (error) {
    console.error('Error getting available workers:', error);
    throw new Error('Failed to fetch available workers');
  }
}

/**
 * Invite/assign a worker to a project
 * @param workerId - Worker's UID
 * @param projectId - Project ID
 * @param projectName - Project name
 * @returns Promise<WorkerAssignment> - Created assignment
 */
export async function inviteWorker(
  workerId: string,
  projectId: string,
  projectName: string
): Promise<WorkerAssignment> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Get engineer info
    const engineerDoc = await getDoc(doc(db, 'engineer_accounts', auth.currentUser.uid));
    if (!engineerDoc.exists()) {
      throw new Error('Engineer account not found');
    }
    const engineerData = engineerDoc.data();

    // Get worker info
    const workerDoc = await getDoc(doc(db, 'worker_accounts', workerId));
    if (!workerDoc.exists()) {
      throw new Error('Worker account not found');
    }
    const workerData = workerDoc.data();

    // Create assignment document
    const assignmentRef = doc(db, 'worker_assignments', workerId);
    const assignmentData = {
      workerId,
      workerName: workerData.name,
      workerEmail: workerData.email,
      projectId,
      projectName,
      status: 'pending',
      invitedBy: auth.currentUser.uid,
      invitedByName: engineerData.name,
      invitedAt: serverTimestamp(),
      decidedAt: null
    };

    await setDoc(assignmentRef, assignmentData);

    const assignment: WorkerAssignment = {
      ...assignmentData,
      invitedAt: new Date()
    };

    console.log('Worker invited successfully:', workerId);
    return assignment;
  } catch (error) {
    console.error('Error inviting worker:', error);
    throw new Error('Failed to invite worker');
  }
}

/**
 * Send project assignment notification to worker
 * @param workerId - Worker's UID
 * @param projectInfo - Project details
 * @param assignmentId - Assignment document ID
 * @returns Promise<void>
 */
export async function sendProjectAssignmentNotification(
  workerId: string,
  projectInfo: { id: string; name: string; description?: string },
  assignmentId: string
): Promise<void> {
  try {
    await sendNotification(workerId, {
      title: 'New Project Assignment',
      body: `You have been invited to join "${projectInfo.name}". Please review and accept or reject this assignment.`,
      type: 'project_assignment',
      projectId: projectInfo.id,
      assignmentId: assignmentId,
      status: 'pending'
    });

    console.log('Assignment notification sent to worker:', workerId);
  } catch (error) {
    console.error('Error sending assignment notification:', error);
    throw new Error('Failed to send assignment notification');
  }
}

/**
 * Get pending invites for a worker
 * @param workerId - Worker's UID
 * @returns Promise<WorkerAssignment[]> - Pending assignments
 */
export async function getWorkerInvites(workerId: string): Promise<WorkerAssignment[]> {
  try {
    const assignmentRef = doc(db, 'worker_assignments', workerId);
    const assignmentDoc = await getDoc(assignmentRef);

    if (!assignmentDoc.exists()) {
      return [];
    }

    const data = assignmentDoc.data();
    if (data.status === 'pending') {
      return [{
        workerId: data.workerId,
        workerName: data.workerName,
        workerEmail: data.workerEmail,
        projectId: data.projectId,
        projectName: data.projectName,
        status: data.status,
        invitedBy: data.invitedBy,
        invitedByName: data.invitedByName,
        invitedAt: data.invitedAt?.toDate() || new Date(),
        decidedAt: data.decidedAt?.toDate()
      }];
    }

    return [];
  } catch (error) {
    console.error('Error getting worker invites:', error);
    throw new Error('Failed to fetch worker invites');
  }
}

/**
 * Accept project assignment (worker action)
 * @param workerId - Worker's UID
 * @param projectId - Project ID
 * @returns Promise<void>
 */
export async function acceptAssignment(
  workerId: string,
  projectId: string
): Promise<void> {
  try {
    // Update assignment status
    const assignmentRef = doc(db, 'worker_assignments', workerId);
    await updateDoc(assignmentRef, {
      status: 'accepted',
      decidedAt: serverTimestamp()
    });

    // Update worker's projectId
    const workerRef = doc(db, 'worker_accounts', workerId);
    await updateDoc(workerRef, {
      projectId: projectId,
      assignedAt: serverTimestamp()
    });

    console.log('Assignment accepted:', workerId, projectId);
  } catch (error) {
    console.error('Error accepting assignment:', error);
    throw new Error('Failed to accept assignment');
  }
}

/**
 * Reject project assignment (worker action)
 * @param workerId - Worker's UID
 * @returns Promise<void>
 */
export async function rejectAssignment(workerId: string): Promise<void> {
  try {
    // Update assignment status
    const assignmentRef = doc(db, 'worker_assignments', workerId);
    await updateDoc(assignmentRef, {
      status: 'rejected',
      decidedAt: serverTimestamp()
    });

    console.log('Assignment rejected:', workerId);
  } catch (error) {
    console.error('Error rejecting assignment:', error);
    throw new Error('Failed to reject assignment');
  }
}

/**
 * Get all workers assigned to a project
 * @param projectId - Project ID
 * @returns Promise<any[]> - Assigned workers
 */
export async function getProjectWorkers(projectId: string): Promise<any[]> {
  try {
    const workersRef = collection(db, 'worker_accounts');
    const q = query(workersRef, where('projectId', '==', projectId));
    
    const snapshot = await getDocs(q);
    const workers: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      workers.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        role: data.role || 'worker',
        assignedAt: data.assignedAt?.toDate(),
        profileImage: data.profileImage
      });
    });

    return workers;
  } catch (error) {
    console.error('Error getting project workers:', error);
    throw new Error('Failed to fetch project workers');
  }
}

/**
 * Remove worker from project (engineer action)
 * @param workerId - Worker's UID
 * @returns Promise<void>
 */
export async function removeWorkerFromProject(workerId: string): Promise<void> {
  try {
    // Update worker's projectId to null
    const workerRef = doc(db, 'worker_accounts', workerId);
    await updateDoc(workerRef, {
      projectId: null,
      removedAt: serverTimestamp()
    });

    // Delete or update assignment record
    const assignmentRef = doc(db, 'worker_assignments', workerId);
    await updateDoc(assignmentRef, {
      status: 'removed',
      decidedAt: serverTimestamp()
    });

    console.log('Worker removed from project:', workerId);
  } catch (error) {
    console.error('Error removing worker from project:', error);
    throw new Error('Failed to remove worker from project');
  }
}






