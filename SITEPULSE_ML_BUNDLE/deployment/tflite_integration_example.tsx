/**
 * SITEPULSE - TensorFlow Lite CNN Integration Example
 * 
 * This file shows how to integrate the CNN model for construction progress classification
 * in your React Native app.
 * 
 * Model: model_optimized.tflite
 * Labels: labels_improved.json
 */

import React, { useState, useEffect } from 'react';
import { View, Image, Alert, StyleSheet } from 'react-native';
import { Button, Text, Card, ProgressBar, Chip } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import Tflite from 'tflite-react-native';

// ============================================================================
// Type Definitions
// ============================================================================

interface CNNPrediction {
  label: string;              // e.g., "concrete_pouring_in_progress"
  confidence: number;         // 0.0 to 1.0
  stage: 'not_started' | 'in_progress' | 'completed';
  activity: string;           // e.g., "concrete_pouring"
  autoProgress: number;       // 0, 50, or 100
  timestamp: string;
}

interface Task {
  id: string;
  title: string;
  cnnEligible: boolean;
  category: string;
  subTask: string;
}

// ============================================================================
// TFLite Model Manager
// ============================================================================

class CNNModelManager {
  private tflite: any = null;
  private isLoaded: boolean = false;

  /**
   * Initialize and load the TFLite model
   * Call this once when app starts
   */
  async initialize(): Promise<void> {
    try {
      this.tflite = new Tflite();
      
      await this.tflite.loadModel({
        model: 'model_optimized.tflite',
        labels: 'labels_improved.json',
        numThreads: 2,              // Use 2 CPU threads
        isQuantized: false,          // Our model uses float16
      });

      this.isLoaded = true;
      console.log('[CNN] Model loaded successfully');
    } catch (error) {
      console.error('[CNN] Failed to load model:', error);
      throw new Error('Failed to initialize CNN model');
    }
  }

  /**
   * Run inference on an image
   * @param imageUri - Local path to image file
   * @returns CNN prediction result
   */
  async predict(imageUri: string): Promise<CNNPrediction> {
    if (!this.isLoaded) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    try {
      const startTime = Date.now();

      // Run inference
      const results = await this.tflite.runModelOnImage({
        path: imageUri,
        imageMean: 127.5,           // Normalization: (pixel / 127.5) - 1
        imageStd: 127.5,            // Maps [0, 255] → [-1, 1]
        numResults: 1,              // Get top prediction only
        threshold: 0.0,             // No confidence threshold (we handle it ourselves)
      });

      const inferenceTime = Date.now() - startTime;
      console.log(`[CNN] Inference completed in ${inferenceTime}ms`);

      if (!results || results.length === 0) {
        throw new Error('No prediction returned from model');
      }

      // Parse the top prediction
      const topPrediction = results[0];
      const parsed = this.parsePrediction(topPrediction);

      console.log('[CNN] Prediction:', parsed);
      return parsed;

    } catch (error) {
      console.error('[CNN] Prediction error:', error);
      throw error;
    }
  }

  /**
   * Parse raw model output into structured format
   */
  private parsePrediction(rawPrediction: any): CNNPrediction {
    const label = rawPrediction.label;              // e.g., "concrete_pouring_in_progress"
    const confidence = rawPrediction.confidence;    // e.g., 0.86

    // Extract activity and stage from label
    const parts = label.split('_');
    let stage: 'not_started' | 'in_progress' | 'completed';
    let activity: string;

    if (label.includes('not_started')) {
      stage = 'not_started';
      activity = parts.slice(0, -2).join('_');
    } else if (label.includes('in_progress')) {
      stage = 'in_progress';
      activity = parts.slice(0, -2).join('_');
    } else if (label.includes('completed')) {
      stage = 'completed';
      activity = parts.slice(0, -1).join('_');
    } else {
      // Fallback
      stage = 'in_progress';
      activity = label;
    }

    // Map stage to progress percentage
    const autoProgress = this.stageToProgress(stage);

    return {
      label,
      confidence,
      stage,
      activity,
      autoProgress,
      timestamp: new Date().toISOString(),
    };
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
    if (confidence >= 0.80) return 'high';
    if (confidence >= 0.70) return 'medium';
    return 'low';
  }

  /**
   * Check if prediction is reliable enough for auto-approval
   */
  isReliable(confidence: number): boolean {
    return confidence >= 0.70;
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
// React Component Example
// ============================================================================

// Singleton instance
const cnnModel = new CNNModelManager();

export default function TaskUpdateWithCNN({ task }: { task: Task }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<CNNPrediction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  // Initialize model on component mount
  useEffect(() => {
    initializeModel();
    return () => {
      // Cleanup on unmount
      cnnModel.cleanup();
    };
  }, []);

  const initializeModel = async () => {
    try {
      await cnnModel.initialize();
      setModelReady(true);
    } catch (error) {
      Alert.alert('Model Error', 'Failed to load AI model. Please restart the app.');
    }
  };

  /**
   * Handle image selection from camera or gallery
   */
  const handleImagePick = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to capture photos.');
        return;
      }

      // Show options: Camera or Gallery
      Alert.alert(
        'Select Image',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: () => capturePhoto(),
          },
          {
            text: 'Choose from Gallery',
            onPress: () => pickFromGallery(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const capturePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,               // Compress to reduce file size
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);
      runPrediction(imageUri);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);
      runPrediction(imageUri);
    }
  };

  /**
   * Run CNN inference on selected image
   */
  const runPrediction = async (imageUri: string) => {
    if (!modelReady) {
      Alert.alert('Model Not Ready', 'AI model is still loading. Please wait.');
      return;
    }

    setIsProcessing(true);
    setPrediction(null);

    try {
      const result = await cnnModel.predict(imageUri);
      setPrediction(result);

      // Show result to user
      const confidenceLevel = cnnModel.getConfidenceLevel(result.confidence);
      const confidencePercent = (result.confidence * 100).toFixed(0);

      Alert.alert(
        '🧠 AI Prediction',
        `Stage: ${result.stage.replace('_', ' ').toUpperCase()}\nConfidence: ${confidencePercent}%\n\n${
          confidenceLevel === 'low' 
            ? '⚠️ Low confidence - Please verify manually' 
            : '✓ Prediction looks reliable'
        }`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      Alert.alert('Prediction Error', 'Failed to analyze image. Please try again.');
      console.error('[CNN] Prediction failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Format stage name for display
   */
  const formatStage = (stage: string): string => {
    return stage
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  /**
   * Get color for confidence level
   */
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.80) return '#4CAF50';  // Green
    if (confidence >= 0.70) return '#FF9800';  // Orange
    return '#F44336';                          // Red
  };

  /**
   * Save task update with CNN prediction
   */
  const handleSaveUpdate = async () => {
    if (!prediction) {
      Alert.alert('No Prediction', 'Please capture an image first.');
      return;
    }

    try {
      // Save to Firestore
      await updateTaskInFirestore({
        taskId: task.id,
        progressPercent: prediction.autoProgress,
        aiPrediction: prediction,
        imageUrl: selectedImage,
        timestamp: new Date(),
      });

      Alert.alert('Success', 'Task updated with AI prediction!');
      
      // Navigate back or refresh
    } catch (error) {
      Alert.alert('Error', 'Failed to save update. Please try again.');
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!task.cnnEligible) {
    return (
      <View style={styles.container}>
        <Text>This task does not support AI prediction.</Text>
        <Text>Please update progress manually.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>📸 AI-Powered Progress Update</Text>
          <Text style={styles.subtitle}>{task.title}</Text>

          {/* Image Display */}
          {selectedImage && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Capture Button */}
          <Button
            mode="contained"
            icon="camera"
            onPress={handleImagePick}
            disabled={isProcessing || !modelReady}
            style={styles.button}
          >
            {selectedImage ? 'Retake Photo' : 'Capture Photo'}
          </Button>

          {/* Processing Indicator */}
          {isProcessing && (
            <View style={styles.processingContainer}>
              <ProgressBar indeterminate color="#6200ee" />
              <Text style={styles.processingText}>🧠 Analyzing image...</Text>
            </View>
          )}

          {/* Prediction Results */}
          {prediction && !isProcessing && (
            <View style={styles.predictionContainer}>
              <Text style={styles.predictionTitle}>AI Prediction</Text>
              
              <Chip 
                icon="brain" 
                style={[styles.stageChip, { backgroundColor: getConfidenceColor(prediction.confidence) }]}
                textStyle={{ color: 'white', fontWeight: 'bold' }}
              >
                {formatStage(prediction.stage)}
              </Chip>

              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>Confidence:</Text>
                <Text style={[styles.confidenceValue, { color: getConfidenceColor(prediction.confidence) }]}>
                  {(prediction.confidence * 100).toFixed(0)}%
                </Text>
              </View>

              <ProgressBar 
                progress={prediction.confidence} 
                color={getConfidenceColor(prediction.confidence)}
                style={styles.confidenceBar}
              />

              <View style={styles.progressInfo}>
                <Text style={styles.progressLabel}>Auto-calculated Progress:</Text>
                <Text style={styles.progressValue}>{prediction.autoProgress}%</Text>
              </View>

              {cnnModel.getConfidenceLevel(prediction.confidence) === 'low' && (
                <Card style={styles.warningCard}>
                  <Card.Content>
                    <Text style={styles.warningText}>
                      ⚠️ Low confidence detected. Please verify the prediction manually.
                    </Text>
                  </Card.Content>
                </Card>
              )}

              {/* Save Button */}
              <Button
                mode="contained"
                icon="check"
                onPress={handleSaveUpdate}
                style={styles.saveButton}
              >
                Save Progress Update
              </Button>
            </View>
          )}

          {!modelReady && (
            <Text style={styles.loadingText}>Loading AI model...</Text>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  imageContainer: {
    marginVertical: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 250,
  },
  button: {
    marginVertical: 8,
  },
  processingContainer: {
    marginVertical: 16,
  },
  processingText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  predictionContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  stageChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  confidenceBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    marginBottom: 16,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#4CAF50',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
});

// ============================================================================
// Firebase Integration (Example)
// ============================================================================

async function updateTaskInFirestore(data: any) {
  // TODO: Replace with your actual Firestore implementation
  console.log('Saving to Firestore:', data);
  
  /*
  import firestore from '@react-native-firebase/firestore';
  
  await firestore()
    .collection('tasks')
    .doc(data.taskId)
    .update({
      progressPercent: data.progressPercent,
      aiPrediction: data.aiPrediction,
      imageUrl: data.imageUrl,
      lastUpdated: firestore.FieldValue.serverTimestamp(),
    });
  */
}

