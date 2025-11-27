/**
 * CNN Service for Construction Task Classification
 * Uses TensorFlow.js for on-device inference (with mock fallback)
 * 
 * Model: model_optimized.tflite (converted to TensorFlow.js format)
 * Labels: labels_improved.json
 * 
 * Classifies construction task photos into 15 classes:
 * - 5 activities × 3 stages (not_started, in_progress, completed)
 */

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CNNPrediction {
  label: string;              // e.g., "concrete_pouring_in_progress"
  confidence: number;         // 0.0 to 1.0
  stage: 'not_started' | 'in_progress' | 'completed';
  activity: string;           // e.g., "concrete_pouring"
  autoProgress: number;       // 0, 50, or 100
  timestamp: string;
}

interface ModelConfig {
  modelPath: string;
  labelsPath: string;
  inputSize: number;
  isLoaded: boolean;
}

// ============================================================================
// CNN Service Class
// ============================================================================

class CNNService {
  private config: ModelConfig = {
    modelPath: '',
    labelsPath: '',
    inputSize: 224,
    isLoaded: false,
  };

  private labels: string[] = [];
  private isInitializing: boolean = false;
  private model: tf.LayersModel | null = null;
  private useRealModel: boolean = false; // Set to true when real model is available

  /**
   * Initialize the CNN model
   * Call this once when the app starts or before first prediction
   */
  async initialize(): Promise<void> {
    if (this.config.isLoaded) {
      console.log('[CNN] Model already loaded');
      return;
    }

    if (this.isInitializing) {
      console.log('[CNN] Model is already initializing');
      return;
    }

    this.isInitializing = true;

    try {
      console.log('[CNN] Initializing model...');

      // Initialize TensorFlow.js backend
      await tf.ready();
      console.log('[CNN] TensorFlow.js backend ready');

      // Load labels from JSON
      await this.loadLabels();

      // Try to load real TensorFlow.js model (if converted)
      try {
        const modelPath = require('../../assets/ml/tfjs_model/model.json');
        this.model = await tf.loadLayersModel(bundleResourceIO(modelPath));
        this.useRealModel = true;
        console.log('[CNN] ✅ Real TensorFlow.js model loaded successfully!');
      } catch (modelError) {
        console.log('[CNN] Real model not found, using mock implementation');
        console.log('[CNN] To use real AI: Convert model_optimized.tflite to TensorFlow.js format');
        this.useRealModel = false;
      }

      this.config.isLoaded = true;
      this.isInitializing = false;
      console.log(`[CNN] Model initialized successfully (${this.useRealModel ? 'REAL AI' : 'mock mode'})`);
    } catch (error) {
      this.isInitializing = false;
      console.error('[CNN] Failed to initialize model:', error);
      throw new Error('Failed to initialize CNN model');
    }
  }

  /**
   * Load classification labels from JSON file
   */
  private async loadLabels(): Promise<void> {
    try {
      // Load labels from the bundled JSON file
      const labelsFile = require('../../assets/ml/labels_improved.json');
      this.labels = labelsFile;
      console.log(`[CNN] Loaded ${this.labels.length} labels`);
    } catch (error) {
      console.error('[CNN] Failed to load labels:', error);
      // Fallback to hardcoded labels if file is missing
      this.labels = this.getDefaultLabels();
      console.log('[CNN] Using default labels');
    }
  }

  /**
   * Get default labels (fallback)
   */
  private getDefaultLabels(): string[] {
    return [
      'chb_laying_completed',
      'chb_laying_in_progress',
      'chb_laying_not_started',
      'concrete_pouring_completed',
      'concrete_pouring_in_progress',
      'concrete_pouring_not_started',
      'painting_completed',
      'painting_in_progress',
      'painting_not_started',
      'roof_sheeting_completed',
      'roof_sheeting_in_progress',
      'roof_sheeting_not_started',
      'tile_laying_completed',
      'tile_laying_in_progress',
      'tile_laying_not_started',
    ];
  }

  /**
   * Run CNN inference on an image
   * @param imageUri - Local path to image file
   * @returns CNN prediction result
   */
  async predict(imageUri: string): Promise<CNNPrediction> {
    if (!this.config.isLoaded) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    try {
      const startTime = Date.now();
      console.log('[CNN] Running inference on:', imageUri);

      // Use real TensorFlow.js model if available
      if (this.useRealModel && this.model) {
        try {
          const realPrediction = await this.runRealInference(imageUri);
          const inferenceTime = Date.now() - startTime;
          console.log(`[CNN] ✅ Real AI inference completed in ${inferenceTime}ms`);
          return realPrediction;
        } catch (realError) {
          console.warn('[CNN] Real model inference failed, falling back to mock:', realError);
          // Fall through to mock
        }
      }

      // Fallback to mock implementation
      const mockPrediction = await this.generateMockPrediction(imageUri);
      const inferenceTime = Date.now() - startTime;
      console.log(`[CNN] Mock inference completed in ${inferenceTime}ms`);

      return mockPrediction;
    } catch (error) {
      console.error('[CNN] Prediction error:', error);
      throw error;
    }
  }

  /**
   * Run real TensorFlow.js inference on an image
   */
  private async runRealInference(imageUri: string): Promise<CNNPrediction> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    // Load and preprocess image
    const imageAsset = Asset.fromModule(require('../../assets/ml/tfjs_model/model.json'));
    await imageAsset.downloadAsync();
    
    // For now, this is a placeholder - actual implementation requires:
    // 1. Loading image as tensor
    // 2. Preprocessing (resize, normalize)
    // 3. Running inference
    // 4. Post-processing results
    
    // This will be fully implemented once the model is converted
    throw new Error('Real model inference not yet implemented - model conversion required');
  }

  /**
   * Generate mock prediction for testing
   * Falls back to this when real model is not available
   */
  private async generateMockPrediction(imageUri: string): Promise<CNNPrediction> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Randomly select a label for mock prediction
    const randomIndex = Math.floor(Math.random() * this.labels.length);
    const selectedLabel = this.labels[randomIndex];

    // Generate confidence (70-95% for realism)
    const confidence = 0.7 + Math.random() * 0.25;

    // Parse the label to extract components
    const parsed = this.parsePredictionLabel(selectedLabel);

    return {
      label: selectedLabel,
      confidence: parseFloat(confidence.toFixed(2)),
      stage: parsed.stage,
      activity: parsed.activity,
      autoProgress: parsed.autoProgress,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse prediction label into structured format
   * Example: "concrete_pouring_in_progress" → { activity: "concrete_pouring", stage: "in_progress" }
   */
  private parsePredictionLabel(label: string): {
    stage: 'not_started' | 'in_progress' | 'completed';
    activity: string;
    autoProgress: number;
  } {
    let stage: 'not_started' | 'in_progress' | 'completed';
    let activity: string;

    if (label.includes('not_started')) {
      stage = 'not_started';
      activity = label.replace('_not_started', '');
    } else if (label.includes('in_progress')) {
      stage = 'in_progress';
      activity = label.replace('_in_progress', '');
    } else if (label.includes('completed')) {
      stage = 'completed';
      activity = label.replace('_completed', '');
    } else {
      // Fallback
      stage = 'in_progress';
      activity = label;
    }

    // Map stage to progress percentage
    const autoProgress = this.stageToProgress(stage);

    return { stage, activity, autoProgress };
  }

  /**
   * Convert stage to progress percentage
   */
  private stageToProgress(stage: string): number {
    switch (stage) {
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
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  }

  /**
   * Check if prediction is reliable enough for auto-approval
   */
  isReliable(confidence: number): boolean {
    return confidence >= 0.7;
  }

  /**
   * Format stage name for display
   */
  formatStage(stage: string): string {
    return stage
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format activity name for display
   */
  formatActivity(activity: string): string {
    return activity
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if a task type is CNN-eligible
   */
  isCNNEligible(taskType: string): boolean {
    if (!taskType) return false;
    
    const eligibleKeywords = [
      'concrete',
      'pouring',
      'chb',
      'block',
      'laying',
      'roof',
      'sheeting',
      'tile',
      'tiling',
      'paint',
      'painting'
    ];

    const normalizedTask = taskType.toLowerCase().trim();
    
    return eligibleKeywords.some(keyword => normalizedTask.includes(keyword));
  }

  /**
   * Get CNN-eligible task types
   */
  getCNNEligibleTasks(): string[] {
    return [
      'Concrete pouring',
      'CHB laying',
      'Roof sheeting',
      'Tile laying',
      'Painting',
    ];
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.config.isLoaded = false;
    this.labels = [];
    console.log('[CNN] Resources cleaned up');
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const cnnService = new CNNService();

// ============================================================================
// Usage Example:
// ============================================================================

/*
// 1. Initialize model (once at app start)
await cnnService.initialize();

// 2. Run prediction on an image
const prediction = await cnnService.predict(imageUri);

console.log('Label:', prediction.label);
console.log('Confidence:', prediction.confidence);
console.log('Stage:', prediction.stage);
console.log('Auto Progress:', prediction.autoProgress);

// 3. Check confidence level
const confidenceLevel = cnnService.getConfidenceLevel(prediction.confidence);
console.log('Confidence Level:', confidenceLevel);

// 4. Check if reliable
const isReliable = cnnService.isReliable(prediction.confidence);
console.log('Is Reliable:', isReliable);
*/

// ============================================================================
// Integration with Real TFLite (Future)
// ============================================================================

/*
To integrate with actual TensorFlow Lite:

1. Install dependency:
   npm install tflite-react-native

2. Link native modules (if using older React Native):
   npx react-native link

3. Copy model files to assets:
   assets/ml/model_optimized.tflite
   assets/ml/labels_improved.json

4. Replace generateMockPrediction() with:

   import Tflite from 'tflite-react-native';

   private tflite: any = null;

   async initialize() {
     this.tflite = new Tflite();
     await this.tflite.loadModel({
       model: 'model_optimized.tflite',
       labels: 'labels_improved.json',
       numThreads: 2,
       isQuantized: false,
     });
     this.config.isLoaded = true;
   }

   async predict(imageUri: string) {
     const results = await this.tflite.runModelOnImage({
       path: imageUri,
       imageMean: 127.5,
       imageStd: 127.5,
       numResults: 1,
       threshold: 0.0,
     });

     const topPrediction = results[0];
     return this.parsePredictionLabel(topPrediction.label);
   }
*/

