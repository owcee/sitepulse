/**
 * SITEPULSE - Delay Prediction Service
 * 
 * Service layer for calling delay prediction cloud functions
 * Uses Firebase Web SDK (firebase/functions)
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

// Initialize Firebase Functions
const functions = getFunctions(app);

// ============================================================================
// Types
// ============================================================================

export interface DelayPrediction {
  taskId: string;
  taskTitle: string;
  taskType?: string;
  status?: string;
  plannedDuration: number;
  predictedDuration: number;
  delayDays: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  factors: string[];
  plannedEndDate?: string;
}

export interface PredictAllDelaysResponse {
  projectId: string;
  predictions: DelayPrediction[];
  totalTasks: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  timestamp: string;
}

export interface SinglePredictionInput {
  taskId: string;
  taskType: string;
  plannedDuration: number;
  daysPassed: number;
  progressPercent: number;
  material_shortage?: number;
  equipment_breakdown?: number;
  weather_issue?: number;
  permit_issue?: number;
}

export interface SinglePredictionResponse {
  taskId: string;
  predictedDuration: number;
  delayDays: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  factors: string[];
  timestamp: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Predict delays for all active tasks in a project
 * @param projectId - The project ID
 * @returns Promise with predictions for all tasks
 */
export async function predictAllDelays(projectId: string): Promise<PredictAllDelaysResponse> {
  try {
    console.log('[DelayPrediction] Fetching predictions for project:', projectId);
    
    const predictAllDelaysFn = httpsCallable<{ projectId: string }, PredictAllDelaysResponse>(
      functions, 
      'predictAllDelays'
    );
    
    const result = await predictAllDelaysFn({ projectId });
    
    console.log('[DelayPrediction] Received predictions:', result.data);
    return result.data;
    
  } catch (error: any) {
    console.error('[DelayPrediction] Error fetching predictions:', error);
    throw new Error(error.message || 'Failed to fetch delay predictions');
  }
}

/**
 * Predict delay for a single task
 * @param input - Task prediction input data
 * @returns Promise with single task prediction
 */
export async function predictSingleDelay(input: SinglePredictionInput): Promise<SinglePredictionResponse> {
  try {
    console.log('[DelayPrediction] Predicting delay for task:', input.taskId);
    
    const predictDelayFn = httpsCallable<SinglePredictionInput, SinglePredictionResponse>(
      functions, 
      'predictDelay'
    );
    
    const result = await predictDelayFn(input);
    
    console.log('[DelayPrediction] Prediction result:', result.data);
    return result.data;
    
  } catch (error: any) {
    console.error('[DelayPrediction] Error predicting delay:', error);
    throw new Error(error.message || 'Failed to predict delay');
  }
}

/**
 * Get risk level color for UI
 * @param riskLevel - The risk level string
 * @returns Color code for the risk level
 */
export function getRiskLevelColor(riskLevel: 'Low' | 'Medium' | 'High'): string {
  switch (riskLevel) {
    case 'High':
      return '#F44336'; // Red
    case 'Medium':
      return '#FFC107'; // Yellow/Orange
    case 'Low':
      return '#4CAF50'; // Green
    default:
      return '#757575'; // Gray
  }
}

/**
 * Get risk level icon for UI
 * @param riskLevel - The risk level string
 * @returns Icon name for the risk level
 */
export function getRiskLevelIcon(riskLevel: 'Low' | 'Medium' | 'High'): string {
  switch (riskLevel) {
    case 'High':
      return 'alert-circle';
    case 'Medium':
      return 'alert';
    case 'Low':
      return 'check-circle';
    default:
      return 'help-circle';
  }
}

/**
 * Format delay days for display
 * @param delayDays - Number of delay days
 * @returns Formatted string
 */
export function formatDelayDays(delayDays: number): string {
  if (delayDays <= 0) {
    return 'On track';
  }
  
  const roundedDays = Math.round(delayDays * 10) / 10;
  
  if (roundedDays === 1) {
    return '1 day delayed';
  }
  
  return `${roundedDays} days delayed`;
}

