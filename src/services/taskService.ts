// Task Service for SitePulse
// Handles task creation, updates, and management with Firestore

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  category: string;
  subTask: string;
  tagalogLabel: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  assigned_worker_ids: string[];
  assigned_worker_names: string[];
  cnnEligible: boolean;
  notes?: string;
  verification?: {
    lastSubmissionId?: string;
    engineerStatus?: 'pending' | 'approved' | 'rejected';
    engineerNotes?: string;
    cnnResult?: {
      label: string;
      score: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Create a new task
 * @param taskData - Task information
 * @returns Promise<Task> - Created task
 */
export async function createTask(taskData: {
  projectId: string;
  title: string;
  category: string;
  subTask: string;
  tagalogLabel: string;
  planned_start_date: string;
  planned_end_date: string;
  assigned_worker_ids: string[];
  assigned_worker_names: string[];
  cnnEligible: boolean;
  notes?: string;
}): Promise<Task> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const tasksRef = collection(db, 'tasks');
    const taskDoc = await addDoc(tasksRef, {
      projectId: taskData.projectId,
      title: taskData.title,
      category: taskData.category,
      subTask: taskData.subTask,
      tagalogLabel: taskData.tagalogLabel,
      status: 'not_started',
      planned_start_date: taskData.planned_start_date,
      planned_end_date: taskData.planned_end_date,
      actual_start_date: null,
      actual_end_date: null,
      assigned_worker_ids: taskData.assigned_worker_ids,
      assigned_worker_names: taskData.assigned_worker_names,
      cnnEligible: taskData.cnnEligible,
      notes: taskData.notes || null,
      verification: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: auth.currentUser.uid
    });

    const createdTask: Task = {
      id: taskDoc.id,
      projectId: taskData.projectId,
      title: taskData.title,
      category: taskData.category,
      subTask: taskData.subTask,
      tagalogLabel: taskData.tagalogLabel,
      status: 'not_started',
      planned_start_date: taskData.planned_start_date,
      planned_end_date: taskData.planned_end_date,
      assigned_worker_ids: taskData.assigned_worker_ids,
      assigned_worker_names: taskData.assigned_worker_names,
      cnnEligible: taskData.cnnEligible,
      notes: taskData.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: auth.currentUser.uid
    };

    console.log('Task created successfully:', taskDoc.id);
    return createdTask;
  } catch (error) {
    console.error('Error creating task:', error);
    throw new Error('Failed to create task');
  }
}

/**
 * Get a task by ID
 * @param taskId - Task ID
 * @returns Promise<Task | null> - Task data or null
 */
export async function getTask(taskId: string): Promise<Task | null> {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
      return null;
    }

    const data = taskDoc.data();
    return {
      id: taskDoc.id,
      projectId: data.projectId,
      title: data.title,
      category: data.category,
      subTask: data.subTask,
      tagalogLabel: data.tagalogLabel,
      status: data.status,
      planned_start_date: data.planned_start_date,
      planned_end_date: data.planned_end_date,
      actual_start_date: data.actual_start_date,
      actual_end_date: data.actual_end_date,
      assigned_worker_ids: data.assigned_worker_ids || [],
      assigned_worker_names: data.assigned_worker_names || [],
      cnnEligible: data.cnnEligible || false,
      notes: data.notes,
      verification: data.verification,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy
    };
  } catch (error) {
    console.error('Error getting task:', error);
    throw new Error('Failed to fetch task');
  }
}

/**
 * Get all tasks for a project
 * @param projectId - Project ID
 * @returns Promise<Task[]> - Array of tasks
 */
export async function getProjectTasks(projectId: string): Promise<Task[]> {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const tasks: Task[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        projectId: data.projectId,
        title: data.title,
        category: data.category,
        subTask: data.subTask,
        tagalogLabel: data.tagalogLabel,
        status: data.status,
        planned_start_date: data.planned_start_date,
        planned_end_date: data.planned_end_date,
        actual_start_date: data.actual_start_date,
        actual_end_date: data.actual_end_date,
        assigned_worker_ids: data.assigned_worker_ids || [],
        assigned_worker_names: data.assigned_worker_names || [],
        cnnEligible: data.cnnEligible || false,
        notes: data.notes,
        verification: data.verification,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy
      });
    });

    return tasks;
  } catch (error) {
    console.error('Error getting project tasks:', error);
    throw new Error('Failed to fetch project tasks');
  }
}

/**
 * Get tasks assigned to a worker
 * @param workerId - Worker's UID
 * @returns Promise<Task[]> - Array of tasks
 */
export async function getWorkerTasks(workerId: string): Promise<Task[]> {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('assigned_worker_ids', 'array-contains', workerId)
    );

    const snapshot = await getDocs(q);
    const tasks: Task[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        projectId: data.projectId,
        title: data.title,
        category: data.category,
        subTask: data.subTask,
        tagalogLabel: data.tagalogLabel,
        status: data.status,
        planned_start_date: data.planned_start_date,
        planned_end_date: data.planned_end_date,
        actual_start_date: data.actual_start_date,
        actual_end_date: data.actual_end_date,
        assigned_worker_ids: data.assigned_worker_ids || [],
        assigned_worker_names: data.assigned_worker_names || [],
        cnnEligible: data.cnnEligible || false,
        notes: data.notes,
        verification: data.verification,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy
      });
    });

    // Sort by createdAt in JavaScript instead of Firestore (avoids index requirement)
    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error getting worker tasks:', error);
    throw new Error('Failed to fetch worker tasks');
  }
}

/**
 * Subscribe to real-time task updates for a project
 * @param projectId - Project ID
 * @param callback - Function to call when tasks update
 * @returns Unsubscribe function
 */
export function subscribeToProjectTasks(
  projectId: string,
  callback: (tasks: Task[]) => void
): Unsubscribe {
  const tasksRef = collection(db, 'tasks');
  const q = query(
    tasksRef,
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        projectId: data.projectId,
        title: data.title,
        category: data.category,
        subTask: data.subTask,
        tagalogLabel: data.tagalogLabel,
        status: data.status,
        planned_start_date: data.planned_start_date,
        planned_end_date: data.planned_end_date,
        actual_start_date: data.actual_start_date,
        actual_end_date: data.actual_end_date,
        assigned_worker_ids: data.assigned_worker_ids || [],
        assigned_worker_names: data.assigned_worker_names || [],
        cnnEligible: data.cnnEligible || false,
        notes: data.notes,
        verification: data.verification,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy
      });
    });
    callback(tasks);
  }, (error) => {
    console.error('Error in task subscription:', error);
  });
}

/**
 * Update a task
 * @param taskId - Task ID
 * @param updates - Fields to update
 * @returns Promise<void>
 */
export async function updateTask(
  taskId: string,
  updates: Partial<{
    title: string;
    status: Task['status'];
    planned_start_date: string;
    planned_end_date: string;
    actual_start_date: string;
    actual_end_date: string;
    assigned_worker_ids: string[];
    assigned_worker_names: string[];
    notes: string;
    verification: Task['verification'];
  }>
): Promise<void> {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    console.log('Task updated:', taskId);
  } catch (error) {
    console.error('Error updating task:', error);
    throw new Error('Failed to update task');
  }
}

/**
 * Update task status
 * @param taskId - Task ID
 * @param status - New status
 * @returns Promise<void>
 */
export async function updateTaskStatus(
  taskId: string,
  status: Task['status']
): Promise<void> {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const updates: any = {
      status,
      updatedAt: serverTimestamp()
    };

    // Set actual dates based on status
    if (status === 'in_progress' && !updates.actual_start_date) {
      updates.actual_start_date = new Date().toISOString().split('T')[0];
    }
    if (status === 'completed') {
      updates.actual_end_date = new Date().toISOString().split('T')[0];
    }

    await updateDoc(taskRef, updates);
    console.log('Task status updated:', taskId, status);
  } catch (error) {
    console.error('Error updating task status:', error);
    throw new Error('Failed to update task status');
  }
}

/**
 * Delete a task
 * @param taskId - Task ID
 * @returns Promise<void>
 */
export async function deleteTask(taskId: string): Promise<void> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Get task to verify ownership/permissions
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    const taskData = taskDoc.data();
    if (taskData.createdBy !== auth.currentUser.uid) {
      // Check if user is engineer for the project
      const engineerRef = doc(db, 'engineer_accounts', auth.currentUser.uid);
      const engineerDoc = await getDoc(engineerRef);
      
      if (!engineerDoc.exists() || !engineerDoc.data().activeProjectIds?.includes(taskData.projectId)) {
        throw new Error('Unauthorized: You can only delete tasks from your projects');
      }
    }

    // Delete task
    await deleteDoc(taskRef);
    console.log('Task deleted:', taskId);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw new Error('Failed to delete task');
  }
}

/**
 * Get task counts by status for a project
 * @param projectId - Project ID
 * @returns Promise<{not_started: number, in_progress: number, completed: number, total: number}>
 */
export async function getTaskCounts(projectId: string): Promise<{
  not_started: number;
  in_progress: number;
  completed: number;
  blocked: number;
  cancelled: number;
  total: number;
}> {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('projectId', '==', projectId));
    const snapshot = await getDocs(q);

    const counts = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0,
      total: snapshot.size
    };

    snapshot.forEach((doc) => {
      const status = doc.data().status;
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });

    return counts;
  } catch (error) {
    console.error('Error getting task counts:', error);
    throw new Error('Failed to fetch task counts');
  }
}

