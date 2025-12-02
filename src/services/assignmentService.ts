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
  previousProjectId?: string | null;
  isProjectSwitch?: boolean;
}

/**
 * Get available workers (not assigned to any project)
 * @returns Promise<Array> - Available workers
 */
export async function getAvailableWorkers(): Promise<any[]> {
  try {
    // Get all workers regardless of project assignment
    // Workers can now be assigned to multiple projects
    const workersRef = collection(db, 'worker_accounts');
    const snapshot = await getDocs(workersRef);
    const workers: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      workers.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        role: data.role || 'worker',
        profileImage: data.profileImage,
        projectId: data.projectId || null, // Include current project info
        hasProject: data.projectId !== null && data.projectId !== undefined
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

    // Check if worker already has a project
    const currentProjectId = workerData.projectId;
    const hasExistingProject = currentProjectId && currentProjectId !== null;

    // Create assignment document
    const assignmentRef = doc(db, 'worker_assignments', workerId);
    const assignmentData: any = {
      workerId,
      workerName: workerData.name,
      workerEmail: workerData.email,
      projectId,
      projectName,
      status: 'pending',
      invitedBy: auth.currentUser.uid,
      invitedByName: engineerData.name,
      invitedAt: serverTimestamp(),
      previousProjectId: hasExistingProject ? currentProjectId : null, // Store previous project if exists
      isProjectSwitch: hasExistingProject // Flag to indicate this is a project switch
    };
    
    // Only add decidedAt if it's not undefined (Firestore doesn't allow undefined)
    // decidedAt will be set when the worker accepts/rejects

    await setDoc(assignmentRef, assignmentData);

    const assignment: WorkerAssignment = {
      ...assignmentData,
      status: assignmentData.status as 'pending' | 'rejected' | 'accepted',
      invitedAt: new Date(),
      decidedAt: assignmentData.decidedAt ? new Date(assignmentData.decidedAt) : undefined
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
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Get engineer info for the notification
    const engineerDoc = await getDoc(doc(db, 'engineer_accounts', auth.currentUser.uid));
    if (!engineerDoc.exists()) {
      throw new Error('Engineer account not found');
    }
    const engineerData = engineerDoc.data();
    const engineerName = engineerData.name || 'Engineer';
    const engineerEmail = engineerData.email || '';

    // Check if worker already has a project
    const workerDoc = await getDoc(doc(db, 'worker_accounts', workerId));
    const workerData = workerDoc.data();
    const hasExistingProject = workerData?.projectId && workerData.projectId !== null;

    // Format notification message: Project name, Engineer name and email, then question
    const notificationBody = `${projectInfo.name}\n\nEngineer: ${engineerName}\nEmail: ${engineerEmail}\n\nWould you like to accept or reject this assignment?`;

    await sendNotification(workerId, {
      title: hasExistingProject ? 'New Project Invitation (Switch)' : 'New Project Assignment',
      body: notificationBody,
      type: 'project_assignment',
      projectId: projectInfo.id,
      assignmentId: assignmentId, // This is the workerId (document ID in worker_assignments)
      status: 'pending'
    });

    console.log('Assignment notification sent to worker:', workerId, hasExistingProject ? '(project switch)' : '');
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
        decidedAt: data.decidedAt?.toDate(),
        previousProjectId: data.previousProjectId || null,
        isProjectSwitch: data.isProjectSwitch || false
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
    // Get current assignment to check if it's a project switch
    const assignmentRef = doc(db, 'worker_assignments', workerId);
    const assignmentDoc = await getDoc(assignmentRef);
    const assignmentData = assignmentDoc.data();
    const isProjectSwitch = assignmentData?.isProjectSwitch || false;
    const previousProjectId = assignmentData?.previousProjectId;

    // Update assignment status
    await updateDoc(assignmentRef, {
      status: 'accepted',
      decidedAt: serverTimestamp()
    });

    // Update worker's projectId (keep current project as primary, but allow multiple)
    const workerRef = doc(db, 'worker_accounts', workerId);
    const workerDoc = await getDoc(workerRef);
    const workerData = workerDoc.data();
    
    // Get existing project IDs array or create new one
    const existingProjectIds = workerData?.projectIds || (workerData?.projectId ? [workerData.projectId] : []);
    
    // Add new project if not already in list
    if (!existingProjectIds.includes(projectId)) {
      existingProjectIds.push(projectId);
    }
    
    await updateDoc(workerRef, {
      projectId: projectId, // Current/primary project
      projectIds: existingProjectIds, // All projects worker is assigned to
      assignedAt: serverTimestamp(),
      previousProjectId: previousProjectId || null, // Store previous project for reference
      projectSwitchedAt: isProjectSwitch ? serverTimestamp() : null
    });

    console.log('Assignment accepted:', workerId, projectId, isProjectSwitch ? '(project switch)' : '');
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
 * Get all projects for a worker (accepted assignments)
 * @param workerId - Worker's UID
 * @returns Promise<Array<{projectId: string, projectName: string}>> - Worker's projects
 */
export async function getWorkerProjects(workerId: string): Promise<Array<{projectId: string, projectName: string}>> {
  try {
    // Get worker's projectIds from worker_accounts
    const workerRef = doc(db, 'worker_accounts', workerId);
    const workerDoc = await getDoc(workerRef);
    
    if (!workerDoc.exists()) {
      return [];
    }
    
    const workerData = workerDoc.data();
    const projectIds = workerData?.projectIds || (workerData?.projectId ? [workerData.projectId] : []);
    
    if (projectIds.length === 0) {
      return [];
    }
    
    // Get project details for each project ID
    const projects = await Promise.all(
      projectIds.map(async (projectId: string) => {
        try {
          const projectRef = doc(db, 'projects', projectId);
          const projectDoc = await getDoc(projectRef);
          
          if (projectDoc.exists()) {
            const projectData = projectDoc.data();
            return {
              projectId: projectId,
              projectName: projectData.name || 'Unknown Project'
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching project ${projectId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null values
    return projects.filter(p => p !== null) as Array<{projectId: string, projectName: string}>;
  } catch (error) {
    console.error('Error getting worker projects:', error);
    throw new Error('Failed to fetch worker projects');
  }
}

/**
 * Get workers with pending invitations for a project
 * @param projectId - Project ID
 * @returns Promise<any[]> - Workers with pending invitations
 */
export async function getPendingInvitations(projectId: string): Promise<any[]> {
  try {
    // Get workers who have pending assignments for this project
    const assignmentsRef = collection(db, 'worker_assignments');
    const q = query(
      assignmentsRef, 
      where('projectId', '==', projectId),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    const workerIds: string[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.workerId) {
        workerIds.push(data.workerId);
      }
    });

    if (workerIds.length === 0) {
      return [];
    }

    // Get worker details from worker_accounts
    const workers: any[] = [];
    
    // Fetch each worker's details
    for (const workerId of workerIds) {
      try {
        const workerDoc = await getDoc(doc(db, 'worker_accounts', workerId));
        if (workerDoc.exists()) {
          const data = workerDoc.data();
          workers.push({
            id: workerDoc.id,
            name: data.name,
            email: data.email,
            role: data.role || 'worker',
            profileImage: data.profileImage
          });
        }
      } catch (error) {
        console.error(`Error fetching worker ${workerId}:`, error);
      }
    }

    return workers;
  } catch (error) {
    console.error('Error getting pending invitations:', error);
    throw new Error('Failed to fetch pending invitations');
  }
}

/**
 * Get all workers assigned to a project
 * @param projectId - Project ID
 * @returns Promise<any[]> - Assigned workers
 */
export async function getProjectWorkers(projectId: string): Promise<any[]> {
  try {
    // Get workers who have accepted assignments for this project
    const assignmentsRef = collection(db, 'worker_assignments');
    const q = query(
      assignmentsRef, 
      where('projectId', '==', projectId),
      where('status', '==', 'accepted')
    );
    
    const snapshot = await getDocs(q);
    const workerIds: string[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.workerId) {
        workerIds.push(data.workerId);
      }
    });

    if (workerIds.length === 0) {
      return [];
    }

    // Get worker details from worker_accounts
    const workersRef = collection(db, 'worker_accounts');
    const workers: any[] = [];
    
    // Fetch each worker's details
    for (const workerId of workerIds) {
      try {
        const workerDoc = await getDoc(doc(db, 'worker_accounts', workerId));
        if (workerDoc.exists()) {
          const data = workerDoc.data();
          workers.push({
            id: workerDoc.id,
            name: data.name,
            email: data.email,
            role: data.role || 'worker',
            profileImage: data.profileImage
          });
        }
      } catch (error) {
        console.error(`Error fetching worker ${workerId}:`, error);
      }
    }

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

/**
 * Update the list of tasks assigned to a worker
 * @param workerId - Worker's UID
 * @param taskIds - Array of task IDs
 */
export async function updateWorkerAssignedTasks(workerId: string, taskIds: string[]): Promise<void> {
  try {
    const workerRef = doc(db, 'worker_accounts', workerId);
    await updateDoc(workerRef, {
      assignedTaskIds: taskIds,
      assignedTaskCount: taskIds.length,
    });
    console.log(`Updated ${workerId} assigned tasks:`, taskIds);
  } catch (error) {
    console.error('Error updating worker assigned tasks:', error);
    throw new Error('Failed to update worker task assignments');
  }
}










