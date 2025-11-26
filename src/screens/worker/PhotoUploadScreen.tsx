import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Image, Alert, Dimensions } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  TextInput, 
  Chip, 
  IconButton,
  Menu,
  Divider,
  ActivityIndicator,
  Badge,
  List,
  Portal,
  Modal 
} from 'react-native-paper';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import { Task } from '../../types';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { uploadTaskPhoto } from '../../services/firebaseService';
import { auth } from '../../firebaseConfig';

const screenWidth = Dimensions.get('window').width;

// Mock task options for photo association
const mockTasks: Pick<Task, 'id' | 'title' | 'status'>[] = [
  { id: '2', title: 'Concrete Pouring - Level 1', status: 'in_progress' },
  { id: '5', title: 'Site Cleanup', status: 'not_started' },
  { id: '6', title: 'Equipment Maintenance', status: 'not_started' },
];

// Mock CNN classification results
const mockClassificationResults = [
  'Foundation Work',
  'Concrete Pouring',
  'Electrical Work',
  'Plumbing',
  'Framing',
  'Roofing',
  'Drywall',
  'Flooring',
  'Painting',
  'HVAC Installation',
  'Insulation',
  'Windows/Doors',
  'Site Cleanup',
  'Equipment',
  'Safety Check',
];

export default function PhotoUploadScreen() {
  const route = useRoute();
  // @ts-ignore - Route params would be properly typed in production
  const { taskId } = route.params || {};

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string>(taskId || '');
  const [taskMenuVisible, setTaskMenuVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<{
    classification: string;
    confidence: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const simulateCNNClassification = async (imageUri: string) => {
    setIsClassifying(true);
    
    // Simulate CNN processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock classification result
    const randomClassification = mockClassificationResults[
      Math.floor(Math.random() * mockClassificationResults.length)
    ];
    const confidence = Math.random() * 0.4 + 0.6; // Random confidence between 0.6-1.0
    
    setClassificationResult({
      classification: randomClassification,
      confidence: confidence,
    });
    setIsClassifying(false);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setCapturedImage(photo.uri);
        setShowCamera(false);
        
        // Automatically run CNN classification
        await simulateCNNClassification(photo.uri);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      await simulateCNNClassification(result.assets[0].uri);
    }
  };

  const submitPhoto = async () => {
    if (!capturedImage) {
      Alert.alert('No Photo', 'Please capture or select a photo first.');
      return;
    }

    if (!selectedTask) {
      Alert.alert('No Task Selected', 'Please select a task to associate with this photo.');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Authentication Error', 'Please log in to upload photos.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user's project ID
      const { getUserProfile } = await import('../../utils/user');
      const userProfile = await getUserProfile(auth.currentUser.uid);
      
      if (!userProfile || !userProfile.projectId) {
        Alert.alert('Error', 'No project assigned. Please contact your engineer.');
        setIsSubmitting(false);
        return;
      }

      // Upload photo to Firebase Storage and save metadata to Firestore
      const photoData = await uploadTaskPhoto(selectedTask, capturedImage, {
        projectId: userProfile.projectId,
        uploaderName: userProfile.name,
        cnnClassification: classificationResult,
        notes: notes || undefined,
      });

      setIsSubmitting(false);
      Alert.alert(
        'Photo Uploaded Successfully!',
        'Your photo has been uploaded to Firebase and sent for engineer review. You will be notified once it\'s verified.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setCapturedImage(null);
              setClassificationResult(null);
              setNotes('');
              setSelectedTask('');
            }
          }
        ]
      );
    } catch (error) {
      setIsSubmitting(false);
      console.error('Photo upload error:', error);
      Alert.alert(
        'Upload Failed', 
        'Failed to upload photo. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setClassificationResult(null);
    setShowCamera(true);
  };

  const getTaskById = (id: string) => {
    return mockTasks.find(task => task.id === id);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return constructionColors.complete;
    if (confidence >= 0.7) return constructionColors.warning;
    return constructionColors.urgent;
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'High Confidence';
    if (confidence >= 0.7) return 'Medium Confidence';
    return 'Low Confidence';
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Paragraph style={styles.permissionText}>Requesting camera permission...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.permissionContainer}>
          <IconButton icon="camera-off" size={60} iconColor="#ccc" />
          <Title style={styles.permissionTitle}>Camera Permission Required</Title>
          <Paragraph style={styles.permissionText}>
            Please grant camera permission to capture construction photos.
          </Paragraph>
          <Button
            mode="contained"
            onPress={() => Camera.requestCameraPermissionsAsync()}
            style={styles.permissionButton}
          >
            Grant Permission
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Camera
          style={styles.camera}
          type={type}
          ref={cameraRef}
        >
          <View style={styles.cameraOverlay}>
            {/* Camera Controls Header */}
            <View style={styles.cameraHeader}>
              <IconButton
                icon="close"
                size={30}
                iconColor="white"
                onPress={() => setShowCamera(false)}
              />
              <Title style={styles.cameraTitle}>Capture Task Photo</Title>
              <IconButton
                icon="camera-flip"
                size={30}
                iconColor="white"
                onPress={() => {
                  setType(type === CameraType.back ? CameraType.front : CameraType.back);
                }}
              />
            </View>

            {/* Camera Grid Overlay */}
            <View style={styles.cameraGrid}>
              <View style={styles.gridLine} />
              <View style={[styles.gridLine, styles.gridLineVertical]} />
              <View style={[styles.gridLine, styles.gridLineHorizontal]} />
              <View style={[styles.gridLine, styles.gridLineVertical, styles.gridLineRight]} />
            </View>

            {/* Camera Controls Footer */}
            <View style={styles.cameraFooter}>
              <IconButton
                icon="image"
                size={30}
                iconColor="white"
                onPress={() => {
                  setShowCamera(false);
                  pickImage();
                }}
              />
              
              <View style={styles.captureButtonContainer}>
                <IconButton
                  icon="camera"
                  size={40}
                  iconColor="white"
                  style={styles.captureButton}
                  onPress={takePicture}
                />
              </View>
              
              <View style={{ width: 60 }} />
            </View>
          </View>
        </Camera>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Title style={styles.screenTitle}>Upload Photo</Title>
        <IconButton
          icon="information"
          size={24}
          iconColor={theme.colors.primary}
        />
      </View>

      <View style={styles.content}>
        {/* Photo Capture Section */}
        {!capturedImage ? (
          <Card style={styles.card}>
            <Card.Content style={styles.captureCard}>
              <IconButton icon="camera" size={50} iconColor={theme.colors.primary} />
              <Title style={styles.captureTitle} numberOfLines={2}>
                Capture Photo
              </Title>
              <Paragraph style={styles.captureDescription} numberOfLines={3}>
                Take a photo for AI analysis and review
              </Paragraph>
              
              <View style={styles.captureButtons}>
                <Button
                  mode="contained"
                  onPress={() => setShowCamera(true)}
                  icon="camera"
                  style={[styles.captureButton, styles.captureButtonSpacing]}
                  contentStyle={styles.captureButtonContent}
                >
                  Take Photo
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={pickImage}
                  icon="image"
                  style={styles.captureButton}
                  contentStyle={styles.captureButtonContent}
                >
                  Choose from Gallery
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <>
            {/* Photo Preview */}
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.photoHeader}>
                  <Title style={styles.cardTitle}>Photo Preview</Title>
                  <Button
                    mode="outlined"
                    onPress={retakePhoto}
                    icon="camera-retake"
                    compact
                  >
                    Retake
                  </Button>
                </View>
                
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: capturedImage }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                  <Button
                    mode="text"
                    onPress={() => setPreviewModalVisible(true)}
                    icon="fullscreen"
                    style={styles.fullscreenButton}
                  >
                    View Full Size
                  </Button>
                </View>
              </Card.Content>
            </Card>

            {/* AI Classification Results */}
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.classificationHeader}>
                  <Title style={styles.cardTitle}>AI Analysis</Title>
                  <IconButton icon="brain" size={20} iconColor={theme.colors.primary} />
                </View>
                
                {isClassifying ? (
                  <View style={styles.classifyingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Paragraph style={styles.classifyingText} numberOfLines={1}>
                      Analyzing with AI...
                    </Paragraph>
                    <Paragraph style={styles.classifyingSubtext} numberOfLines={2}>
                      Using MobileNetV3 CNN
                    </Paragraph>
                  </View>
                ) : classificationResult ? (
                  <View style={styles.classificationResult}>
                    <View style={styles.classificationMain}>
                      <Paragraph style={styles.classificationLabel}>Classification:</Paragraph>
                      <Title style={styles.classificationValue} numberOfLines={2} ellipsizeMode="tail">
                        {classificationResult.classification}
                      </Title>
                    </View>
                    
                    <View style={styles.confidenceSection}>
                      <Paragraph style={styles.confidenceLabel}>
                        Confidence Level: {Math.round(classificationResult.confidence * 100)}%
                      </Paragraph>
                      <Chip 
                        style={[
                          styles.confidenceChip, 
                          { backgroundColor: getConfidenceColor(classificationResult.confidence) }
                        ]}
                        textStyle={{ color: 'white', fontWeight: 'bold' }}
                      >
                        {getConfidenceText(classificationResult.confidence)}
                      </Chip>
                    </View>

                    {classificationResult.confidence < 0.7 && (
                      <View style={styles.lowConfidenceWarning}>
                        <IconButton icon="alert" size={16} iconColor={constructionColors.warning} />
                        <Paragraph style={styles.warningText} numberOfLines={3}>
                          Low confidence. Try better lighting or angle.
                        </Paragraph>
                      </View>
                    )}
                  </View>
                ) : null}
              </Card.Content>
            </Card>

            {/* Task Selection */}
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.cardTitle}>Associate with Task</Title>
                
                <Menu
                  visible={taskMenuVisible}
                  onDismiss={() => setTaskMenuVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setTaskMenuVisible(true)}
                      icon="chevron-down"
                      style={styles.taskSelector}
                      contentStyle={styles.taskSelectorContent}
                    >
                      {selectedTask 
                        ? getTaskById(selectedTask)?.title || 'Select Task'
                        : 'Select Task'
                      }
                    </Button>
                  }
                >
                  <Menu.Item title="Available Tasks" disabled />
                  <Divider />
                  {mockTasks.map((task) => (
                    <Menu.Item
                      key={task.id}
                      onPress={() => {
                        setSelectedTask(task.id);
                        setTaskMenuVisible(false);
                      }}
                      title={task.title}
                      leadingIcon={
                        task.status === 'in_progress' ? 'clock' : 'circle-outline'
                      }
                    />
                  ))}
                </Menu>

                {selectedTask && (
                  <View style={styles.selectedTaskInfo}>
                    <List.Item
                      title={getTaskById(selectedTask)?.title}
                      description={`Status: ${getTaskById(selectedTask)?.status.replace('_', ' ')}`}
                      left={() => <List.Icon icon="check-circle" color={constructionColors.complete} />}
                      titleStyle={styles.selectedTaskTitle}
                      titleNumberOfLines={2}
                      descriptionStyle={styles.selectedTaskDescription}
                      descriptionNumberOfLines={1}
                    />
                  </View>
                )}
              </Card.Content>
            </Card>

            {/* Notes Section */}
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.cardTitle}>Add Notes</Title>
                
                <TextInput
                  label="Progress Notes (Optional)"
                  value={notes}
                  onChangeText={setNotes}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  style={styles.notesInput}
                  placeholder="Describe the work completed, any issues encountered, or questions for the engineer..."
                />
              </Card.Content>
            </Card>

            {/* Submit Button */}
            <Card style={styles.card}>
              <Card.Content>
                <Button
                  mode="contained"
                  onPress={submitPhoto}
                  loading={isSubmitting}
                  disabled={!selectedTask || isSubmitting}
                  icon="cloud-upload"
                  style={styles.submitButton}
                  contentStyle={styles.submitButtonContent}
                >
                  {isSubmitting ? 'Uploading Photo...' : 'Submit for Review'}
                </Button>
                
                <Paragraph style={styles.submitDescription} numberOfLines={2}>
                  Photo will be sent for verification
                </Paragraph>
              </Card.Content>
            </Card>
          </>
        )}
      </View>

      {/* Full Screen Photo Modal */}
      <Portal>
        <Modal
          visible={previewModalVisible}
          onDismiss={() => setPreviewModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <IconButton
              icon="close"
              size={30}
              iconColor="white"
              style={styles.closeButton}
              onPress={() => setPreviewModalVisible(false)}
            />
            {capturedImage && (
              <Image 
                source={{ uri: capturedImage }} 
                style={styles.fullscreenPhoto}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: 'white',
    elevation: 1,
  },
  screenTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    elevation: 2,
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  
  // Permission styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: fontSizes.md,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permissionButton: {
    marginTop: spacing.md,
  },
  
  // Camera styles
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  cameraTitle: {
    color: 'white',
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  cameraGrid: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
    left: '33.33%',
  },
  gridLineHorizontal: {
    height: 1,
    width: '100%',
    top: '33.33%',
  },
  gridLineRight: {
    left: '66.66%',
  },
  cameraFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  captureButtonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 40,
    padding: spacing.sm,
  },
  captureButton: {
    backgroundColor: 'white',
    borderRadius: 35,
  },
  
  // Capture card styles
  captureCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  captureTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  captureDescription: {
    fontSize: fontSizes.md,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  captureButtons: {
    width: '100%',
  },
  captureButtonSpacing: {
    marginBottom: spacing.md,
  },
  captureButtonContent: {
    paddingVertical: spacing.md,
  },
  
  // Photo preview styles
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: theme.roundness,
    marginBottom: spacing.sm,
  },
  fullscreenButton: {
    marginTop: spacing.sm,
  },
  
  // Classification styles
  classificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  classifyingContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  classifyingText: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
    marginTop: spacing.md,
    fontWeight: '500',
  },
  classifyingSubtext: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  classificationResult: {
    padding: spacing.md,
    backgroundColor: '#f0f7ff',
    borderRadius: theme.roundness,
  },
  classificationMain: {
    marginBottom: spacing.md,
  },
  classificationLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    marginBottom: spacing.xs,
  },
  classificationValue: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  confidenceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  confidenceLabel: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  confidenceChip: {
    height: 28,
  },
  lowConfidenceWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3e0',
    padding: spacing.sm,
    borderRadius: theme.roundness,
  },
  warningText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: constructionColors.warning,
    marginLeft: spacing.sm,
  },
  
  // Task selection styles
  taskSelector: {
    marginBottom: spacing.md,
  },
  taskSelectorContent: {
    paddingVertical: spacing.sm,
  },
  selectedTaskInfo: {
    backgroundColor: '#e8f5e8',
    borderRadius: theme.roundness,
    marginTop: spacing.sm,
  },
  selectedTaskTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  selectedTaskDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
  },
  
  // Notes styles
  notesInput: {
    marginBottom: spacing.sm,
  },
  
  // Submit styles
  submitButton: {
    marginBottom: spacing.md,
  },
  submitButtonContent: {
    paddingVertical: spacing.md,
  },
  submitDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  fullscreenPhoto: {
    width: '100%',
    height: '100%',
  },
});


