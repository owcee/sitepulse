// Advanced Firebase Service
// Aggregates all Phase 2 Firebase services into one convenient import

import { auth } from '../firebaseConfig';
import * as notificationService from './notificationService';
import * as photoService from './photoService';
import * as assignmentService from './assignmentService';
import * as usageService from './usageService';
import * as projectService from './projectService';
import * as fcmService from './fcmService';

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

export const createProject = projectService.createProject;
export const getProject = projectService.getProject;
export const getEngineerProjects = projectService.getEngineerProjects;
export const updateProject = projectService.updateProject;
export const deleteProject = projectService.deleteProject;
export const startProject = projectService.startProject;
export const completeProject = projectService.completeProject;
export const pauseProject = projectService.pauseProject;

// ============================================================================
// WORKER ASSIGNMENT
// ============================================================================

export const getAvailableWorkers = assignmentService.getAvailableWorkers;
export const getProjectWorkers = assignmentService.getProjectWorkers;
export const getPendingInvitations = assignmentService.getPendingInvitations;
export const inviteWorker = assignmentService.inviteWorker;
export const sendProjectAssignmentNotification = assignmentService.sendProjectAssignmentNotification;
export const getWorkerInvites = assignmentService.getWorkerInvites;
export const acceptAssignment = assignmentService.acceptAssignment;
export const rejectAssignment = assignmentService.rejectAssignment;
export const removeWorkerFromProject = assignmentService.removeWorkerFromProject;
export const getWorkerProjects = assignmentService.getWorkerProjects;

export const updateWorkerAssignedTasks = assignmentService.updateWorkerAssignedTasks;

// Legacy compatibility
export async function assignWorkerToProject(workerId, projectId) {
  // This function now creates an invitation instead of direct assignment
  const projectData = await projectService.getProject(projectId);
  if (!projectData) {
    throw new Error('Project not found');
  }
  
  const assignment = await inviteWorker(workerId, projectId, projectData.name);
  return assignment;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const sendNotification = notificationService.sendNotification;
export const getNotifications = notificationService.getNotifications;
export const subscribeToNotifications = notificationService.subscribeToNotifications;
export const markAsRead = notificationService.markAsRead;
export const markAllAsRead = notificationService.markAllAsRead;
export const deleteNotification = notificationService.deleteNotification;
export const getUnreadCount = notificationService.getUnreadCount;

// Legacy compatibility
export async function getUserNotifications() {
  return notificationService.getNotifications();
}

export async function markNotificationAsRead(notificationId) {
  return notificationService.markAsRead(notificationId);
}

/**
 * Accept project assignment (worker action)
 * @param {string} notificationId - Notification ID
 * @param {string} assignmentId - Assignment ID
 * @param {string} projectId - Project ID
 * @returns {Promise<void>}
 */
export async function acceptProjectAssignment(notificationId, assignmentId, projectId) {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
  
  // Accept the assignment
  await assignmentService.acceptAssignment(auth.currentUser.uid, projectId);
  
  // Delete the project assignment notification (it's been handled, no need to keep it)
  await notificationService.deleteNotification(notificationId);
  
  // Send confirmation notification (optional)
  await notificationService.sendNotification(auth.currentUser.uid, {
    title: 'Assignment Accepted',
    body: 'You have successfully joined the project!',
    type: 'system',
    status: 'completed'
  });
}

/**
 * Reject project assignment (worker action)
 * @param {string} notificationId - Notification ID
 * @param {string} assignmentId - Assignment ID
 * @param {string} projectId - Project ID
 * @returns {Promise<void>}
 */
export async function rejectProjectAssignment(notificationId, assignmentId, projectId) {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
  
  // Reject the assignment
  await assignmentService.rejectAssignment(auth.currentUser.uid);
  
  // Mark notification as read
  await notificationService.markAsRead(notificationId);
}

// ============================================================================
// PHOTO UPLOADS
// ============================================================================

export const uploadTaskPhoto = photoService.uploadTaskPhoto;
export const uploadTaskPhotoWithProgress = photoService.uploadTaskPhotoWithProgress;
export const getTaskPhotos = photoService.getTaskPhotos;
export const getPendingPhotos = photoService.getPendingPhotos;
export const approvePhoto = photoService.approvePhoto;
export const rejectPhoto = photoService.rejectPhoto;

// ============================================================================
// INVENTORY/USAGE REPORTS
// ============================================================================

export const submitUsageReport = usageService.submitUsageReport;
export const getUsageSubmissions = usageService.getUsageSubmissions;
export const getWorkerSubmissions = usageService.getWorkerSubmissions;
export const approveUsageSubmission = usageService.approveUsageSubmission;
export const rejectUsageSubmission = usageService.rejectUsageSubmission;
export const checkDuplicateUsage = usageService.checkDuplicateUsage;

// ============================================================================
// FCM PUSH NOTIFICATIONS
// ============================================================================

export const saveFCMToken = fcmService.saveFCMToken;
export const clearFCMToken = fcmService.clearFCMToken;
export const getFCMToken = fcmService.getFCMToken;

