import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { Task } from './taskService';

export interface DelayPredictionInput {
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

export interface DelayPredictionResult {
  taskId: string;
  predictedDuration: number;
  delayDays: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  factors: string[];
  timestamp: string;
}

export interface BatchPredictionResult {
  projectId: string;
  predictions: (DelayPredictionResult & { taskTitle: string })[];
  totalTasks: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  timestamp: string;
}

/**
 * Predict delay for a single task
 */
export async function predictDelay(input: DelayPredictionInput): Promise<DelayPredictionResult> {
  try {
    const predictDelayFn = httpsCallable(functions, 'predictDelay');
    const result = await predictDelayFn(input);
    return result.data as DelayPredictionResult;
  } catch (error) {
    console.error('Error calling predictDelay:', error);
    throw error;
  }
}

/**
 * Predict delays for all tasks in a project
 */
export async function predictProjectDelays(projectId: string): Promise<BatchPredictionResult> {
  try {
    const predictAllDelaysFn = httpsCallable(functions, 'predictAllDelays');
    const result = await predictAllDelaysFn({ projectId });
    return result.data as BatchPredictionResult;
  } catch (error) {
    console.error('Error calling predictAllDelays:', error);
    throw error;
  }
}

/**
 * Helper to calculate days passed and planned duration from task dates
 */
export function calculateTaskMetrics(task: Task) {
  const startDate = task.planned_start_date ? new Date(task.planned_start_date) : new Date();
  const endDate = task.planned_end_date ? new Date(task.planned_end_date) : new Date();
  const now = new Date();

  const daysPassed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const plannedDuration = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  return { daysPassed, plannedDuration };
}


