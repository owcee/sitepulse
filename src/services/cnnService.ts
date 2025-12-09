/**
 * SITEPULSE - CNN Status Predictor (Task-Aware)
 * 
 * This module provides a task-aware CNN prediction system where:
 * - The task name is already known (from the app)
 * - CNN only predicts the STATUS (not_started, in_progress, completed)
 * - Returns confidence level for the status prediction
 * 
 * Model: model_optimized.tflite
 * Labels: labels_improved.json
 */

// Import TFLite module - Metro requires static imports
let Tflite: any = null;
const loadTflite = () => {
  if (Tflite !== null && Tflite !== false) return Tflite;
  if (Tflite === false) return null; // Already tried and failed
  try {
    // Static require for Metro bundler compatibility - USE .default!
    const module = require('tflite-react-native');
    Tflite = module.default || module;
    return Tflite;
  } catch (error) {
    console.warn('[CNN] tflite-react-native not available:', error);
    Tflite = false; // Mark as attempted but failed
    return null;
  }
};

// ============================================================================
// Type Definitions
// ============================================================================

export interface StatusPrediction {
  status: 'not_started' | 'in_progress' | 'completed';
  confidence: number;              // 0.0 to 1.0
  progressPercent: number;         // 0, 50, or 100
  taskMatch: boolean;              // Whether CNN's predicted task matches known task
  predictedTask?: string;          // What task CNN thought it was (for validation)
  timestamp: string;
}

// ============================================================================
// Task ID to CNN Label Mapping
// ============================================================================

/**
 * Maps app task IDs to CNN model activity labels
 * CNN uses: concrete_pouring, chb_laying, roofing, tile_laying, painting
 */
const TASK_ID_TO_CNN_ACTIVITY: Record<string, string> = {
  'concrete_pouring': 'concrete_pouring',
  'chb_laying': 'chb_laying',
  'roof_sheeting': 'roofing',        // Note: app uses "roof_sheeting", CNN uses "roofing"
  'tile_laying': 'tile_laying',
  'painting': 'painting',
};

/**
 * Reverse mapping: CNN activity to app task ID
 */
const CNN_ACTIVITY_TO_TASK_ID: Record<string, string> = {
  'concrete_pouring': 'concrete_pouring',
  'chb_laying': 'chb_laying',
  'roofing': 'roof_sheeting',
  'tile_laying': 'tile_laying',
  'painting': 'painting',
};

// ============================================================================
// CNN Model Manager (Task-Aware)
// ============================================================================

export class TaskAwareCNNModel {
  private tflite: any = null;
  private isLoaded: boolean = false;

  /**
   * Check if the model is loaded and ready
   */
  isModelLoaded(): boolean {
    return this.isLoaded && this.tflite !== null;
  }

  /**
   * Initialize and load the TFLite model
   * Call this once when app starts
   */
  async initialize(): Promise<void> {
    const TfliteModule = loadTflite();
    if (!TfliteModule) {
      console.warn('[CNN] Tflite-react-native is not loaded, skipping initialization.');
      this.isLoaded = false;
      return; // Gracefully skip - don't throw error
    }
    
    try {
      console.log('[CNN] Initializing TFLite...');
      
      // tflite-react-native exports default class
      this.tflite = new TfliteModule();
      
      if (!this.tflite) {
        console.warn('[CNN] TFLite instance is null, skipping model load.');
        this.isLoaded = false;
        return; // Gracefully skip
      }
      
      console.log('[CNN] Loading model: model_optimized.tflite');
      
      // loadModel returns Promise<void> according to type definition
      await this.tflite.loadModel({
        model: 'model_optimized.tflite',
        labels: 'labels_improved.json',
        numThreads: 2,
      });

      this.isLoaded = true;
      console.log('[CNN] ✅ Model loaded successfully');
    } catch (error) {
      console.error('[CNN] ❌ Initialization error:', error);
      console.warn('[CNN] CNN will be disabled for this session');
      this.isLoaded = false;
      this.tflite = null;
      // Don't throw - let the app continue without CNN
    }
  }

  /**
   * Predict STATUS ONLY for a known task
   * 
   * @param imageUri - Local path to image file
   * @param knownTaskId - The task ID that is already known (e.g., "concrete_pouring")
   * @returns Status prediction with confidence
   */
  async predictStatus(
    imageUri: string, 
    knownTaskId: string
  ): Promise<StatusPrediction> {
    if (!this.isLoaded) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    // Validate task is CNN-eligible
    const cnnActivity = TASK_ID_TO_CNN_ACTIVITY[knownTaskId];
    if (!cnnActivity) {
      throw new Error(`Task "${knownTaskId}" is not CNN-eligible. Only these tasks support CNN: ${Object.keys(TASK_ID_TO_CNN_ACTIVITY).join(', ')}`);
    }

    try {
      const startTime = Date.now();

      // tflite-react-native uses a callback style API. Promisify it so we can
      // safely await the results without getting `undefined` (the current bug).
      const results = await new Promise<any[]>((resolve, reject) => {
        this.tflite.runModelOnImage(
          {
            path: imageUri,
            imageMean: 127.5,
            imageStd: 127.5,
            numResults: 15, // Get all 15 classes for complete probability distribution
            threshold: 0.0,
          },
          (err: any, res: any[]) => {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          }
        );
      });

      const inferenceTime = Date.now() - startTime;
      console.log(`[CNN] Inference completed in ${inferenceTime}ms`);

      if (!results || results.length === 0) {
        throw new Error('No prediction returned from model');
      }

      // Extract status from all predictions, filtering for the known task
      // This gives us more accurate confidence since we normalize probabilities
      // within only the 3 relevant status classes
      const statusPrediction = this.extractStatusForTask(results, knownTaskId, cnnActivity);

      console.log('[CNN] Status Prediction:', statusPrediction);
      return statusPrediction;

    } catch (error) {
      console.error('[CNN] Prediction error:', error);
      throw error;
    }
  }

  /**
   * Extract status from predictions, filtering for the known task
   * This normalizes probabilities within only the 3 relevant status classes
   */
  private extractStatusForTask(
    predictions: Array<{ label: string; confidence: number }>,
    knownTaskId: string,
    expectedCnnActivity: string
  ): StatusPrediction {
    // Filter predictions to only the 3 classes for this task
    const taskPredictions: Array<{ label: string; confidence: number; status: string }> = [];
    let taskMatch = false;

    for (const pred of predictions) {
      const { activity, status } = this.parseLabel(pred.label);
      
      // Check if this prediction is for the expected task
      if (activity === expectedCnnActivity) {
        taskPredictions.push({ ...pred, status });
        taskMatch = true;
      }
    }

    // If we have predictions for this task, normalize and pick best
    if (taskPredictions.length > 0) {
      // Normalize probabilities to sum to 1.0 within task classes
      const totalConfidence = taskPredictions.reduce((sum, p) => sum + p.confidence, 0);
      const normalized = taskPredictions.map(p => ({
        ...p,
        confidence: p.confidence / totalConfidence
      }));

      // Find best status
      const best = normalized.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      return {
        status: best.status as 'not_started' | 'in_progress' | 'completed',
        confidence: best.confidence,
        progressPercent: this.statusToProgress(best.status),
        taskMatch: true,
        timestamp: new Date().toISOString(),
      };
    }

    // Fallback: no match found, use top prediction anyway
    const topPred = predictions[0];
    const { status, activity } = this.parseLabel(topPred.label);
    const predictedTaskId = CNN_ACTIVITY_TO_TASK_ID[activity] || activity;
    
    console.warn(`[CNN] Task mismatch: Expected "${expectedCnnActivity}", got "${activity}"`);

    return {
      status: status as 'not_started' | 'in_progress' | 'completed',
      confidence: topPred.confidence,
      progressPercent: this.statusToProgress(status),
      taskMatch: false,
      predictedTask: predictedTaskId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse CNN label into activity and status
   * e.g., "concrete_pouring_in_progress" -> { activity: "concrete_pouring", status: "in_progress" }
   */
  private parseLabel(label: string): { activity: string; status: 'not_started' | 'in_progress' | 'completed' } {
    let status: 'not_started' | 'in_progress' | 'completed';
    let activity: string;

    if (label.includes('not_started')) {
      status = 'not_started';
      activity = label.replace('_not_started', '');
    } else if (label.includes('in_progress')) {
      status = 'in_progress';
      activity = label.replace('_in_progress', '');
    } else if (label.includes('completed')) {
      status = 'completed';
      activity = label.replace('_completed', '');
    } else {
      // Fallback
      status = 'in_progress';
      activity = label;
    }

    return { activity, status };
  }

  /**
   * Convert status to progress percentage
   */
  private statusToProgress(status: string): number {
    switch (status) {
      case 'not_started':
        return 0;
      case 'in_progress':
        return 50;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  }

  /**
   * Get confidence level category
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.80) return 'high';
    if (confidence >= 0.70) return 'medium';
    return 'low';
  }

  /**
   * Check if prediction is reliable enough for auto-approval
   */
  isReliable(confidence: number, taskMatch: boolean): boolean {
    // Require both high confidence AND task match for auto-approval
    return confidence >= 0.70 && taskMatch;
  }

  /**
   * Check if a task ID is CNN-eligible
   */
  static isCNNEligible(taskId: string): boolean {
    return taskId in TASK_ID_TO_CNN_ACTIVITY;
  }

  /**
   * Get all CNN-eligible task IDs
   */
  static getCNNEligibleTasks(): string[] {
    return Object.keys(TASK_ID_TO_CNN_ACTIVITY);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.tflite) {
      await this.tflite.close();
      this.isLoaded = false;
      console.log('[CNN] Model unloaded');
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const cnnStatusPredictor = new TaskAwareCNNModel();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format status for display
 */
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get color for confidence level
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.80) return '#4CAF50';  // Green
  if (confidence >= 0.70) return '#FF9800';   // Orange
  return '#F44336';                            // Red
}

/**
 * Get warning message if task mismatch detected
 */
export function getTaskMismatchWarning(prediction: StatusPrediction): string | null {
  if (prediction.taskMatch) return null;
  
  return `⚠️ Warning: CNN detected "${formatStatus(prediction.predictedTask || 'unknown')}" instead of expected task. Status prediction may be less accurate.`;
}


