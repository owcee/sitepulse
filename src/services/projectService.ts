// Project Service for SitePulse
// Handles project creation and management

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
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  clientName: string;
  engineerId: string;
  engineerName: string;
  budget: number;
  duration: number; // in days
  startDate?: string;
  estimatedEndDate?: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new project
 * @param projectData - Project information
 * @returns Promise<Project> - Created project
 */
export async function createProject(projectData: {
  name: string;
  description: string;
  location: string;
  clientName: string;
  budget: number;
  duration: number;
}): Promise<Project> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Get engineer info
    const engineerRef = doc(db, 'engineer_accounts', auth.currentUser.uid);
    const engineerDoc = await getDoc(engineerRef);
    
    if (!engineerDoc.exists()) {
      throw new Error('Engineer account not found');
    }

    const engineerData = engineerDoc.data();

    // Calculate dates
    const startDate = new Date();
    const estimatedEndDate = new Date();
    estimatedEndDate.setDate(startDate.getDate() + projectData.duration);

    // Create project document
    const projectsRef = collection(db, 'projects');
    const projectDoc = await addDoc(projectsRef, {
      name: projectData.name,
      description: projectData.description,
      location: projectData.location,
      clientName: projectData.clientName,
      engineerId: auth.currentUser.uid,
      engineerName: engineerData.name,
      budget: projectData.budget,
      duration: projectData.duration,
      startDate: startDate.toISOString().split('T')[0],
      estimatedEndDate: estimatedEndDate.toISOString().split('T')[0],
      status: 'planning',
      totalBudget: projectData.budget,
      contingencyPercentage: 10,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Create initial budget document in budgets collection with the same structure as BudgetLogsManagementPage
    const { saveBudget } = await import('./firebaseDataService');
    const initialBudget = {
      totalBudget: projectData.budget, // Use the budget from project creation
      totalSpent: 0,
      contingencyPercentage: 10,
      lastUpdated: new Date(),
      categories: [
        {
          id: 'equipment',
          name: 'Equipment',
          allocatedAmount: 50000,
          spentAmount: 0,
          description: 'Equipment rental and purchases (Auto-calculated)',
          lastUpdated: new Date(),
          isPrimary: true,
        },
        {
          id: 'materials',
          name: 'Materials',
          allocatedAmount: 150000,
          spentAmount: 0,
          description: 'Construction materials and supplies (Auto-calculated)',
          lastUpdated: new Date(),
          isPrimary: true,
        },
      ],
    };
    
    await saveBudget(projectDoc.id, initialBudget);
    console.log('✅ Initial budget document created for project:', projectDoc.id);

    // Update engineer's project lists (Phase 3: multi-project support)
    const currentActiveProjects = engineerData.activeProjectIds || [];
    await updateDoc(engineerRef, {
      projectId: projectDoc.id, // Keep for backward compatibility
      activeProjectIds: [...currentActiveProjects, projectDoc.id],
      currentProjectId: projectDoc.id,
      updatedAt: serverTimestamp()
    });

    const createdProject: Project = {
      id: projectDoc.id,
      name: projectData.name,
      description: projectData.description,
      location: projectData.location,
      clientName: projectData.clientName,
      engineerId: auth.currentUser.uid,
      engineerName: engineerData.name,
      budget: projectData.budget,
      duration: projectData.duration,
      startDate: startDate.toISOString().split('T')[0],
      estimatedEndDate: estimatedEndDate.toISOString().split('T')[0],
      status: 'planning',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Project created successfully:', projectDoc.id);
    return createdProject;
  } catch (error) {
    console.error('Error creating project:', error);
    throw new Error('Failed to create project');
  }
}

/**
 * Get a project by ID
 * @param projectId - Project ID
 * @returns Promise<Project | null> - Project data or null
 */
export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      return null;
    }

    const data = projectDoc.data();
    return {
      id: projectDoc.id,
      name: data.name,
      description: data.description,
      location: data.location,
      clientName: data.clientName,
      engineerId: data.engineerId,
      engineerName: data.engineerName,
      budget: data.budget,
      duration: data.duration,
      startDate: data.startDate,
      estimatedEndDate: data.estimatedEndDate,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error: any) {
    // Log the specific project ID that failed
    console.error(`Error fetching project ${projectId}:`, error);
    
    // If it's a permissions error, provide more context
    if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
      console.warn(`Permission denied for project ${projectId}. User may not have access to this project.`);
    }
    
    throw new Error('Failed to fetch project');
  }
}

/**
 * Get all projects for an engineer
 * @param engineerId - Engineer's UID (optional, uses current user if not provided)
 * @returns Promise<Project[]> - Array of projects
 */
export async function getEngineerProjects(engineerId?: string): Promise<Project[]> {
  try {
    const userId = engineerId || auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const projectsRef = collection(db, 'projects');
    
    // Try with orderBy first, fallback to just where if index is missing
    let snapshot;
    try {
      const q = query(
        projectsRef,
        where('engineerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      snapshot = await getDocs(q);
    } catch (indexError: any) {
      // If index error, try without orderBy
      if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
        // Silently fallback to query without orderBy
        const q = query(
          projectsRef,
          where('engineerId', '==', userId)
        );
        snapshot = await getDocs(q);
      } else {
        throw indexError;
      }
    }

    const projects: Project[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      projects.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        location: data.location,
        clientName: data.clientName,
        engineerId: data.engineerId,
        engineerName: data.engineerName,
        budget: data.budget,
        duration: data.duration,
        startDate: data.startDate,
        estimatedEndDate: data.estimatedEndDate,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });

    // Sort manually if we couldn't use orderBy
    projects.sort((a, b) => {
      const aTime = a.createdAt.getTime();
      const bTime = b.createdAt.getTime();
      return bTime - aTime; // Descending order
    });

    return projects;
  } catch (error: any) {
    console.error('Error getting engineer projects:', error);
    // Provide more specific error message
    if (error.message) {
      throw new Error(`Failed to fetch engineer projects: ${error.message}`);
    }
    throw new Error('Failed to fetch engineer projects');
  }
}

/**
 * Update a project
 * @param projectId - Project ID
 * @param updates - Fields to update
 * @returns Promise<void>
 */
export async function updateProject(
  projectId: string,
  updates: Partial<{
    name: string;
    description: string;
    location: string;
    clientName: string;
    budget: number;
    duration: number;
    status: 'planning' | 'active' | 'completed' | 'paused';
  }>
): Promise<void> {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    console.log('Project updated:', projectId);
  } catch (error) {
    console.error('Error updating project:', error);
    throw new Error('Failed to update project');
  }
}

/**
 * Delete a project
 * @param projectId - Project ID
 * @returns Promise<void>
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Get project to verify ownership
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }

    const projectData = projectDoc.data();
    if (projectData.engineerId !== auth.currentUser.uid) {
      throw new Error('Unauthorized: You can only delete your own projects');
    }

    // Delete project
    await deleteDoc(projectRef);

    // Update engineer's project lists (Phase 3: multi-project support)
    const engineerRef = doc(db, 'engineer_accounts', auth.currentUser.uid);
    const engineerDoc = await getDoc(engineerRef);
    const engineerData = engineerDoc.data();
    if (!engineerData) {
      throw new Error('Engineer data not found');
    }
    const activeProjects = (engineerData.activeProjectIds || []).filter((id: string) => id !== projectId);
    
    await updateDoc(engineerRef, {
      projectId: activeProjects.length > 0 ? activeProjects[0] : null, // Set to first project or null
      activeProjectIds: activeProjects,
      currentProjectId: activeProjects.length > 0 ? activeProjects[0] : null,
      updatedAt: serverTimestamp()
    });

    // TODO: Also update/remove all workers assigned to this project
    // TODO: Consider soft-delete instead of hard-delete for data integrity

    console.log('Project deleted:', projectId);
  } catch (error) {
    console.error('Error deleting project:', error);
    throw new Error('Failed to delete project');
  }
}

/**
 * Start a project (change status to active)
 * @param projectId - Project ID
 * @returns Promise<void>
 */
export async function startProject(projectId: string): Promise<void> {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: 'active',
      actualStartDate: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp()
    });

    console.log('Project started:', projectId);
  } catch (error) {
    console.error('Error starting project:', error);
    throw new Error('Failed to start project');
  }
}

/**
 * Complete a project
 * @param projectId - Project ID
 * @returns Promise<void>
 */
export async function completeProject(projectId: string): Promise<void> {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: 'completed',
      actualEndDate: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp()
    });

    console.log('Project completed:', projectId);
  } catch (error) {
    console.error('Error completing project:', error);
    throw new Error('Failed to complete project');
  }
}

/**
 * Pause a project
 * @param projectId - Project ID
 * @returns Promise<void>
 */
export async function pauseProject(projectId: string): Promise<void> {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: 'paused',
      pausedAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });

    console.log('Project paused:', projectId);
  } catch (error) {
    console.error('Error pausing project:', error);
    throw new Error('Failed to pause project');
  }
}



