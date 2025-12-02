/**
 * SITEPULSE - Survey Service
 * 
 * Service for managing daily site surveys and tracking survey submissions
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, app } from '../firebaseConfig';

// Initialize Firebase Functions
const functions = getFunctions(app);

// ============================================================================
// Types
// ============================================================================

export interface TaskUpdate {
  status: 'productive' | 'non_productive';
  delayReason?: string;
  delayReasonOther?: string;
}

export interface SurveyData {
  projectId: string;
  date: string;
  engineerName: string;
  siteStatus: 'normal' | 'delayed' | 'closed';
  siteClosedReason?: string;
  siteClosedReasonOther?: string;
  taskUpdates: Record<string, TaskUpdate>;
}

export interface SurveySubmissionResponse {
  success: boolean;
  updatesProcessed: number;
  updates: Array<{
    taskId: string;
    delayDays: number;
    riskLevel: string;
    predictedDuration: number;
    lastSurveyUpdate: string;
  }>;
}

// ============================================================================
// Survey Tracking Functions
// ============================================================================

/**
 * Check if the engineer should see the survey today for a specific project
 * Returns true if the engineer hasn't submitted a survey today for this project
 * @param userId - Engineer's user ID
 * @param projectId - Project ID
 * @returns Promise<boolean>
 */
export async function shouldShowSurvey(userId: string, projectId: string): Promise<boolean> {
  try {
    // Use composite key: userId_projectId for per-project tracking
    const surveyTrackingRef = doc(db, 'survey_tracking', `${userId}_${projectId}`);
    const surveyDoc = await getDoc(surveyTrackingRef);
    
    if (!surveyDoc.exists()) {
      // No survey tracking record - show survey
      console.log('[SurveyService] No survey record found for project, showing survey');
      return true;
    }
    
    const data = surveyDoc.data();
    const lastSurveyDate = data.lastSurveyDate;
    
    if (!lastSurveyDate) {
      console.log('[SurveyService] No lastSurveyDate, showing survey');
      return true;
    }
    
    // Compare dates (only date part, not time)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    let lastSurveyStr: string;
    
    if (lastSurveyDate.toDate) {
      // Firestore Timestamp
      lastSurveyStr = lastSurveyDate.toDate().toISOString().split('T')[0];
    } else if (lastSurveyDate instanceof Date) {
      lastSurveyStr = lastSurveyDate.toISOString().split('T')[0];
    } else if (typeof lastSurveyDate === 'string') {
      lastSurveyStr = lastSurveyDate.split('T')[0];
    } else {
      // Unknown format, show survey to be safe
      console.log('[SurveyService] Unknown date format, showing survey');
      return true;
    }
    
    const shouldShow = todayStr !== lastSurveyStr;
    console.log('[SurveyService] Last survey:', lastSurveyStr, 'Today:', todayStr, 'Show survey:', shouldShow, 'Project:', projectId);
    
    return shouldShow;
    
  } catch (error) {
    console.error('[SurveyService] Error checking survey status:', error);
    // On error, show survey to be safe
    return true;
  }
}

/**
 * Record that the engineer submitted a survey today for a specific project
 * @param userId - Engineer's user ID
 * @param projectId - The project ID for the survey
 */
export async function recordSurveySubmission(userId: string, projectId: string): Promise<void> {
  try {
    // Use composite key: userId_projectId for per-project tracking
    const surveyTrackingRef = doc(db, 'survey_tracking', `${userId}_${projectId}`);
    
    await setDoc(surveyTrackingRef, {
      userId,
      projectId,
      lastSurveyDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('[SurveyService] Survey submission recorded for user:', userId, 'project:', projectId);
    
  } catch (error) {
    console.error('[SurveyService] Error recording survey submission:', error);
    throw error;
  }
}

// ============================================================================
// Survey Submission Functions
// ============================================================================

/**
 * Submit the daily survey and trigger delay predictions
 * @param surveyData - The survey data from the UI
 * @returns Promise with the submission result
 */
export async function submitSurvey(surveyData: SurveyData): Promise<SurveySubmissionResponse> {
  try {
    console.log('[SurveyService] Submitting survey...', surveyData);
    
    const submitDailySurveyFn = httpsCallable<SurveyData, SurveySubmissionResponse>(
      functions, 
      'submitDailySurvey'
    );
    
    const result = await submitDailySurveyFn(surveyData);
    
    console.log('[SurveyService] Survey submitted successfully:', result.data);
    
    return result.data;
    
  } catch (error: any) {
    console.error('[SurveyService] Error submitting survey:', error);
    throw new Error(error.message || 'Failed to submit survey');
  }
}

/**
 * Skip the survey for today (user chose to dismiss)
 * This still records that we showed the survey, so we don't show it again today
 * @param userId - Engineer's user ID
 * @param projectId - Project ID
 */
export async function skipSurveyForToday(userId: string, projectId: string): Promise<void> {
  try {
    // Use composite key: userId_projectId for per-project tracking
    const surveyTrackingRef = doc(db, 'survey_tracking', `${userId}_${projectId}`);
    
    await setDoc(surveyTrackingRef, {
      userId,
      projectId,
      lastSurveyDate: serverTimestamp(),
      skipped: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log('[SurveyService] Survey skipped for user:', userId, 'project:', projectId);
    
  } catch (error) {
    console.error('[SurveyService] Error skipping survey:', error);
    // Don't throw - this is a non-critical operation
  }
}

