import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, Text as RNText, Text, ActivityIndicator } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  TextInput, 
  Chip, 
  IconButton,
  Portal,
  Modal,
  Badge,
  List,
  Divider,
  Surface
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { getTaskById, updateTaskStatus, Task as FirebaseTask } from '../../services/taskService';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CameraType } from 'expo-camera';
import { uploadTaskPhoto, canWorkerSubmitToday, getTaskPhotos } from '../../services/photoService';
import { auth } from '../../firebaseConfig';
import { cnnStatusPredictor, TaskAwareCNNModel, formatStatus, getConfidenceColor } from '../../services/cnnService';

export default function WorkerTaskDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  
  // @ts-ignore - Route params would be properly typed in production
  const { taskId } = route.params;
  
  const [task, setTask] = useState<FirebaseTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [photoNotes, setPhotoNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const cameraRef = useRef<Camera>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [cnnInitialized, setCnnInitialized] = useState(false);
  const [predictingCnn, setPredictingCnn] = useState(false);
  const [latestPhoto, setLatestPhoto] = useState<any>(null);

  // Lazy CNN initialization helper – only runs when we actually need a prediction
  const ensureCnnInitialized = async (): Promise<boolean> => {
    if (cnnInitialized) {
      return true;
    }
    try {
      console.log('[CNN] Lazy init start...');
      await cnnStatusPredictor.initialize();
      setCnnInitialized(true);
      console.log('[CNN] Lazy init success');
      return true;
    } catch (error) {
      console.error('[CNN] Lazy init failed:', error);
      return false;
    }
  };
  // -----------------------------------------------------------------------------

  // Load task from Firestore
  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const taskData = await getTaskById(taskId);
      console.log('[WorkerTaskDetail] ========== TASK DATA LOADED ==========');
      console.log('[WorkerTaskDetail] Task ID:', taskId);
      console.log('[WorkerTaskDetail] Task subTask:', taskData?.subTask);
      console.log('[WorkerTaskDetail] Task cnnEligible:', taskData?.cnnEligible);
      console.log('[WorkerTaskDetail] Full task data:', taskData);
      console.log('[WorkerTaskDetail] =======================================');
      
      if (taskData) {
        setTask(taskData);
        
        // Load latest photo to show CNN prediction
        try {
          const photos = await getTaskPhotos(taskId);
          console.log('[WorkerTaskDetail] Loaded photos:', photos?.length);
          if (photos && photos.length > 0) {
            console.log('[WorkerTaskDetail] Latest photo:', photos[0]);
            console.log('[WorkerTaskDetail] Has CNN prediction:', !!photos[0].cnnPrediction);
            console.log('[WorkerTaskDetail] CNN prediction data:', photos[0].cnnPrediction);
            setLatestPhoto(photos[0]); // Most recent photo
          }
        } catch (photoError) {
          console.error('Error loading photos:', photoError);
          // Don't fail the whole operation
        }
        
        // Check if photo was rejected and show notification
        if (taskData.verification?.engineerStatus === 'rejected') {
          Alert.alert(
            'Photo Rejected',
            `Your photo submission was rejected. ${taskData.verification.engineerNotes || 'Please upload a new photo.'}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', 'Task not found');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error loading task:', error);
      Alert.alert('Error', `Failed to load task: ${error.message}`);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return constructionColors.complete;
      case 'in_progress':
        return constructionColors.inProgress;
      case 'not_started':
        return constructionColors.notStarted;
      default:
        return theme.colors.disabled;
    }
  };

  const getVerificationStatusInfo = (status: string) => {
    switch (status) {
      case 'approved':
        return { color: constructionColors.complete, icon: 'check-circle', text: 'Approved by Engineer' };
      case 'pending':
        return { color: constructionColors.warning, icon: 'clock', text: 'Pending Review' };
      case 'rejected':
        return { color: constructionColors.urgent, icon: 'close-circle', text: 'Rejected - Needs Revision' };
      default:
        return { color: theme.colors.disabled, icon: 'help-circle', text: 'No Photo Submitted' };
    }
  };

  const handleUploadPhoto = async () => {
    try {
      // Check if worker can submit today
      if (auth.currentUser) {
        const eligibility = await canWorkerSubmitToday(taskId, auth.currentUser.uid);
        if (!eligibility.canSubmit) {
          Alert.alert('Cannot Submit', eligibility.reason || 'You have already submitted a photo for this task today.');
          return;
        }
      }

      // Request camera permission if needed
      if (!permission || !permission.granted) {
        const result = await requestPermission();
        if (!result || !result.granted) {
          Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
          return;
        }
      }

      // Open camera directly (photo first, then notes)
      setShowCamera(true);
    } catch (error: any) {
      console.error('Error in photo upload flow:', error);
      Alert.alert('Error', error.message || 'Failed to start photo upload');
    }
  };

  const showNotesAfterPhoto = () => {
    setShowCamera(false);
    setShowNotesModal(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        setShowCamera(false);
        setSelectedPhotoUri(photo.uri);
        
        // Show notes modal after photo is taken (optional)
        setShowNotesModal(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture. Please try again.');
        setShowCamera(false);
      }
    }
  };


  const openPhotoModal = (imageUri: string) => {
    setSelectedPhotoUri(imageUri);
    setPhotoModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Paragraph style={styles.loadingText}>Loading task details...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Paragraph>Task not found</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  const daysUntilDue = getDaysUntilDue(task.planned_end_date);
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 2 && daysUntilDue >= 0;
  const verificationInfo = task.verification?.engineerStatus ? getVerificationStatusInfo(task.verification.engineerStatus) : null;

  // Full-screen camera view
  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <Camera 
          style={styles.camera} 
          type={CameraType.back}
          ref={cameraRef}
        >
          <View style={styles.cameraControls}>
            {/* Camera Header - positioned just below status bar */}
            <View style={styles.cameraHeader}>
              <IconButton
                icon="close"
                size={32}
                iconColor="white"
                onPress={() => {
                  setShowCamera(false);
                  setPhotoNotes('');
                }}
                style={styles.cameraCloseButton}
              />
              <Title style={styles.cameraTitle}>
                Photo: {task.title}
              </Title>
            </View>
            
            {/* Camera Capture Button */}
            <View style={styles.cameraActions}>
              <IconButton
                icon="camera"
                size={70}
                iconColor="white"
                style={styles.captureButton}
                onPress={takePicture}
                disabled={uploadingPhoto}
              />
            </View>
          </View>
        </Camera>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.primary}
        />
        <Title style={styles.headerTitle}>Task Details</Title>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Info Card */}
        <Card style={styles.card}>
          <Card.Content style={{ backgroundColor: theme.colors.background }}>
            <View style={styles.taskHeader}>
              <Title style={styles.taskTitle}>{task.title}</Title>
              <View style={styles.taskMeta}>
                <Chip 
                  icon="clock" 
                  style={[styles.statusChip, { backgroundColor: getStatusColor(task.status) }]}
                  textStyle={{ color: 'white' }}
                >
                  {task.status.replace('_', ' ').toUpperCase()}
                </Chip>
              </View>
            </View>

            <Paragraph style={styles.taskCategory}>
              Category: {task.category.replace('_', ' ')}
            </Paragraph>

            <Paragraph style={styles.taskDescription}>
              {task.subTask}
            </Paragraph>

            <Paragraph style={styles.tagalogLabel}>
              {task.tagalogLabel}
            </Paragraph>

            {/* Due Date Alert */}
            {(isOverdue || isDueSoon) && (
              <View style={[
                styles.dueDateAlert,
                { backgroundColor: isOverdue ? constructionColors.urgent + '20' : constructionColors.warning + '20' }
              ]}>
                <IconButton 
                  icon={isOverdue ? 'alert-circle' : 'clock-alert'} 
                  size={20} 
                  iconColor={isOverdue ? constructionColors.urgent : constructionColors.warning}
                />
                <Paragraph style={[
                  styles.dueDateText,
                  { color: isOverdue ? constructionColors.urgent : constructionColors.warning }
                ]}>
                  {isOverdue 
                    ? `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''}`
                    : `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`
                  }
                </Paragraph>
              </View>
            )}

            <View style={styles.taskDetails}>
              <View style={styles.detailRow}>
                <Paragraph style={styles.detailLabel}>Start Date</Paragraph>
                <Paragraph style={styles.detailValue}>
                  {new Date(task.planned_start_date).toLocaleDateString()}
                </Paragraph>
              </View>
              <View style={styles.detailRow}>
                <Paragraph style={styles.detailLabel}>Due Date</Paragraph>
                <Paragraph style={[
                  styles.detailValue,
                  (isOverdue || isDueSoon) && { color: isOverdue ? constructionColors.urgent : constructionColors.warning }
                ]}>
                  {new Date(task.planned_end_date).toLocaleDateString()}
                </Paragraph>
              </View>
              {task.assigned_worker_names && task.assigned_worker_names.length > 0 && (
                <View style={styles.detailRow}>
                  <Paragraph style={styles.detailLabel}>Assigned To</Paragraph>
                  <Paragraph style={styles.detailValue}>
                    {task.assigned_worker_names.join(', ')}
                  </Paragraph>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>


        {/* Photo Submission Card */}
        <Card style={[styles.card, { overflow: 'visible' }]}>
          <Card.Content style={{ overflow: 'visible', backgroundColor: theme.colors.background }}>
            <View style={[styles.photoHeader, { overflow: 'visible' }]}>
              <Title style={styles.cardTitle}>Photo Verification</Title>
              {verificationInfo && (
                <Chip
                  icon={verificationInfo.icon}
                  style={{ backgroundColor: verificationInfo.color }}
                  textStyle={{ color: 'white', fontSize: 11 }}
                >
                  {task.verification?.engineerStatus?.toUpperCase() || 'NONE'}
                </Chip>
              )}
            </View>

            {/* CNN Status Info */}
            {task.cnnEligible && (
              <View style={[styles.cnnInfo, { backgroundColor: theme.colors.primaryContainer, overflow: 'visible' }]}>
                <View style={[styles.customBadge, styles.cnnBadge]}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" style={styles.badgeIcon} />
                  <Text style={styles.cnnBadgeText}>CNN Eligible</Text>
                </View>
              </View>
            )}

            {/* Current Verification Result */}
            {task.verification?.cnnResult && (
              <View style={styles.aiClassification}>
                <IconButton icon="chart-line" size={16} iconColor={theme.colors.primary} />
                <Paragraph style={styles.aiText}>
                  AI Classification: <RNText style={styles.boldText}>{task.verification.cnnResult.label}</RNText> 
                  ({Math.round((task.verification.cnnResult.score || 0) * 100)}% confidence)
                </Paragraph>
              </View>
            )}

            {/* Engineer Feedback (if rejected) */}
            {task.verification?.engineerStatus === 'rejected' && task.verification?.engineerNotes && (
              <View style={styles.engineerFeedback}>
                <Paragraph style={styles.feedbackLabel}>Engineer Feedback</Paragraph>
                <Paragraph style={styles.feedbackText}>
                  {task.verification.engineerNotes}
                </Paragraph>
              </View>
            )}

            {/* Upload Photo Button */}
            <Button
              mode="contained"
              icon="camera"
              onPress={handleUploadPhoto}
              loading={uploadingPhoto}
              disabled={uploadingPhoto}
              style={styles.uploadButton}
            >
              {uploadingPhoto ? 'Uploading...' : task.verification?.lastSubmissionId ? 'Upload New Photo' : 'Upload Photo'}
            </Button>

            {/* CNN Prediction Display - Show after photo upload */}
            {latestPhoto && latestPhoto.cnnPrediction && (
              <View style={styles.cnnPredictionContainer}>
                <Divider style={{ marginVertical: spacing.md }} />
                <Title style={styles.cnnPredictionTitle}>
                  🤖 CNN Prediction
                </Title>
                
                {/* Status Prediction */}
                <View style={styles.cnnPredictionBox}>
                  <View style={styles.cnnStatusRow}>
                    <Paragraph style={styles.cnnLabel}>Predicted Status:</Paragraph>
                    <Chip 
                      style={[
                        styles.cnnStatusChip,
                        { backgroundColor: getStatusColor(latestPhoto.cnnPrediction.status) }
                      ]}
                      textStyle={styles.cnnStatusText}
                    >
                      {formatStatus(latestPhoto.cnnPrediction.status)}
                    </Chip>
                  </View>

                  {/* Confidence Level */}
                  <View style={styles.cnnConfidenceRow}>
                    <Paragraph style={styles.cnnLabel}>Confidence:</Paragraph>
                    <View style={styles.confidenceContainer}>
                      <Paragraph 
                        style={[
                          styles.confidencePercentage,
                          { color: getConfidenceColor(latestPhoto.cnnPrediction.confidence) }
                        ]}
                      >
                        {Math.round(latestPhoto.cnnPrediction.confidence * 100)}%
                      </Paragraph>
                      {/* Progress Bar */}
                      <View style={styles.confidenceBarContainer}>
                        <View 
                          style={[
                            styles.confidenceBarFill,
                            { 
                              width: `${latestPhoto.cnnPrediction.confidence * 100}%`,
                              backgroundColor: getConfidenceColor(latestPhoto.cnnPrediction.confidence)
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>

                  {/* Progress Percent */}
                  <View style={styles.cnnProgressRow}>
                    <Paragraph style={styles.cnnLabel}>Estimated Progress:</Paragraph>
                    <Paragraph style={styles.cnnProgressValue}>
                      {latestPhoto.cnnPrediction.progressPercent}%
                    </Paragraph>
                  </View>

                  {/* Info Note */}
                  <View style={styles.cnnInfoNote}>
                    <IconButton icon="information" size={16} iconColor={theme.colors.onSurfaceVariant} />
                    <Paragraph style={styles.cnnInfoNoteText}>
                      CNN prediction submitted to engineer for review
                    </Paragraph>
                  </View>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Engineer Notes */}
        {task.notes && (
          <Card style={styles.card}>
            <Card.Content style={{ backgroundColor: theme.colors.background }}>
              <Title style={styles.cardTitle}>Engineer Notes</Title>
              <View style={styles.notesSection}>
                <Paragraph style={styles.notesText}>{task.notes}</Paragraph>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Full Screen Photo Modal */}
      <Portal>
        <Modal
          visible={photoModalVisible}
          onDismiss={() => setPhotoModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <IconButton
              icon="close"
              size={30}
              iconColor="white"
              style={styles.modalCloseButton}
              onPress={() => setPhotoModalVisible(false)}
            />
            <Image 
              source={{ uri: selectedPhotoUri }} 
              style={styles.fullscreenPhoto}
              resizeMode="contain"
            />
          </View>
        </Modal>
      </Portal>

      {/* Notes Input Modal */}
      <Portal>
        <Modal
          visible={showNotesModal}
          onDismiss={() => {
            setShowNotesModal(false);
            setPhotoNotes('');
          }}
          contentContainerStyle={styles.notesModalContainer}
        >
          <Card style={styles.notesModalCard}>
            <Card.Content style={{ backgroundColor: theme.colors.background }}>
              <Title style={styles.notesModalTitle}>Upload Photo</Title>
              <Paragraph style={styles.notesModalSubtitle}>
                Photo captured successfully. Add notes (optional) before uploading:
              </Paragraph>
              <Title style={[styles.notesModalTitle, { fontSize: fontSizes.md, marginTop: spacing.md, marginBottom: spacing.xs }]}>Add Notes (Optional)</Title>
              
              <TextInput
                mode="outlined"
                multiline
                numberOfLines={4}
                value={photoNotes}
                onChangeText={setPhotoNotes}
                placeholder="Enter your notes here..."
                style={styles.notesTextInput}
              />

              <View style={styles.notesModalActions}>
                <Button
                  mode="text"
                  onPress={() => {
                    setShowNotesModal(false);
                    setPhotoNotes('');
                  }}
                  style={styles.notesModalCancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={async () => {
                    setShowNotesModal(false);
                    setUploadingPhoto(true);

                    try {
                      // Get user profile for metadata
                      const userProfile = auth.currentUser ? {
                        projectId: task?.projectId || '',
                        name: auth.currentUser.displayName || 'Worker',
                        uid: auth.currentUser.uid
                      } : null;

                      // Run CNN prediction if task is CNN-eligible
                      let cnnPrediction = null;
                      console.log('[CNN] ========== CNN ELIGIBILITY CHECK ==========');
                      console.log('[CNN] Task exists:', !!task);
                      console.log('[CNN] Task cnnEligible field:', task?.cnnEligible);
                      console.log('[CNN] CNN initialized:', cnnInitialized);
                      console.log('[CNN] Task subTask:', task?.subTask);
                      console.log('[CNN] Is CNN eligible (model check):', task?.subTask ? TaskAwareCNNModel.isCNNEligible(task.subTask) : 'NO SUBTASK');
                      console.log('[CNN] =======================================');
                      
                      const cnnReady = task && task.cnnEligible && task.subTask && TaskAwareCNNModel.isCNNEligible(task.subTask) && await ensureCnnInitialized();
                      if (cnnReady) {
                        try {
                          setPredictingCnn(true);
                          console.log('[CNN] ✅✅✅ RUNNING CNN PREDICTION for task:', task.subTask);
                          console.log('[CNN] Image URI:', selectedPhotoUri);
                          const prediction = await cnnStatusPredictor.predictStatus(
                            selectedPhotoUri,
                            task.subTask
                          );
                          cnnPrediction = prediction;
                          console.log('[CNN] ✅✅✅ PREDICTION SUCCESS:', JSON.stringify(prediction, null, 2));
                        } catch (cnnError: any) {
                          console.error('[CNN] ❌❌❌ PREDICTION FAILED:', cnnError);
                          console.error('[CNN] Error stack:', cnnError.stack);
                          // Continue without CNN prediction - don't block upload
                        } finally {
                          setPredictingCnn(false);
                        }
                      } else {
                        console.log('[CNN] ❌❌❌ SKIPPING CNN PREDICTION');
                        console.log('[CNN] Reason breakdown:');
                        if (!task) console.log('[CNN]   - Task is null/undefined');
                        if (task && !task.cnnEligible) console.log('[CNN]   - task.cnnEligible is false');
                        if (!cnnInitialized) console.log('[CNN]   - CNN not initialized');
                        if (task && !task.subTask) console.log('[CNN]   - task.subTask is missing');
                        if (task && task.subTask && !TaskAwareCNNModel.isCNNEligible(task.subTask)) {
                          console.log('[CNN]   - task.subTask "' + task.subTask + '" not in CNN model mapping');
                        }
                      }

                      // Upload photo with proper metadata including CNN prediction
                      console.log('[Upload] ========== UPLOADING PHOTO ==========');
                      console.log('[Upload] Task ID:', taskId);
                      console.log('[Upload] Image URI:', selectedPhotoUri);
                      console.log('[Upload] CNN Prediction to upload:', cnnPrediction);
                      console.log('[Upload] =====================================');
                      
                      await uploadTaskPhoto(
                        taskId,
                        selectedPhotoUri,
                        {
                          projectId: userProfile?.projectId || '',
                          uploaderName: userProfile?.name || 'Worker',
                          uploaderId: userProfile?.uid || '',
                          notes: photoNotes || undefined,
                          cnnPrediction: cnnPrediction
                        }
                      );
                      
                      console.log('[Upload] ✅ Photo uploaded successfully');

                      setSuccessMessage('Photo uploaded successfully. Awaiting engineer review.');
                      setShowSuccessModal(true);
                      setPhotoNotes('');
                      setSelectedPhotoUri('');
                      
                      // Reload task to show new photo
                      await loadTaskDetails();
                    } catch (error: any) {
                      console.error('Error uploading photo:', error);
                      Alert.alert('Upload Failed', error.message || 'Failed to upload photo');
                    } finally {
                      setUploadingPhoto(false);
                      setPredictingCnn(false);
                    }
                  }}
                  icon="upload"
                  loading={uploadingPhoto || predictingCnn}
                  disabled={uploadingPhoto || predictingCnn}
                  style={styles.notesModalContinueButton}
                >
                  {predictingCnn ? 'Analyzing with AI...' : uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Success Modal */}
      <Portal>
        <Modal
          visible={showSuccessModal}
          onDismiss={() => setShowSuccessModal(false)}
          contentContainerStyle={styles.successModalContainer}
        >
          <Surface style={styles.successModalSurface}>
            <Title style={styles.successModalTitle}>Success</Title>
            <Paragraph style={styles.successModalMessage}>{successMessage}</Paragraph>
            <Button
              mode="contained"
              onPress={() => setShowSuccessModal(false)}
              style={styles.successModalButton}
            >
              OK
            </Button>
          </Surface>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  card: {
    margin: spacing.md,
    elevation: 2,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.background,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  taskHeader: {
    marginBottom: spacing.md,
  },
  taskTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  taskMetaChip: {
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  statusChip: {
    height: 32,
  },
  taskDescription: {
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: theme.colors.text,
    marginBottom: spacing.lg,
  },
  dueDateAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
  },
  dueDateText: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  taskDetails: {
    backgroundColor: theme.colors.background,
    padding: spacing.md,
    borderRadius: theme.roundness,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: theme.colors.placeholder,
  },
  detailValue: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
    fontWeight: '500',
  },
  instructionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  instructionsList: {
    marginVertical: -spacing.sm,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: spacing.sm,
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  instructionNumberText: {
    color: 'white',
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.text,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  approvedPhotosContainer: {
    flexDirection: 'row',
    marginLeft: -spacing.sm,
  },
  approvedPhotoWrapper: {
    marginLeft: spacing.md,
  },
  approvedPhotoCard: {
    width: 120,
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
    marginRight: spacing.md,
  },
  approvedPhotoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: theme.roundness,
    marginBottom: spacing.sm,
  },
  approvedBadgeContainer: {
    position: 'absolute',
    top: -12,
    right: -4,
    zIndex: 10,
    overflow: 'visible',
  },
  approvedBadge: {
    minWidth: 32,
    height: 32,
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  approvedPhotoDescription: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    textAlign: 'center',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  approvedPhotoDate: {
    fontSize: fontSizes.xs,
    textAlign: 'center',
    color: theme.colors.placeholder,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  verificationBadgeContainer: {
    overflow: 'visible',
    padding: 4,
  },
  verificationBadge: {
    minHeight: 28,
    height: 28,
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoContainer: {
    marginBottom: spacing.md,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: theme.roundness,
    marginBottom: spacing.sm,
  },
  fullscreenButton: {
    alignSelf: 'center',
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
  },
  verificationText: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  aiClassification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    padding: spacing.sm,
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
  },
  aiText: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
    marginLeft: spacing.sm,
  },
  boldText: {
    fontWeight: 'bold',
  },
  workerNotes: {
    backgroundColor: constructionColors.complete + '20',
    padding: spacing.md,
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
  },
  notesLabel: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: constructionColors.complete,
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
  },
  engineerFeedback: {
    backgroundColor: constructionColors.urgent + '20',
    padding: spacing.md,
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
  },
  feedbackLabel: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: constructionColors.urgent,
    marginBottom: spacing.xs,
  },
  feedbackText: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
    fontStyle: 'italic',
  },
  uploadInfo: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: spacing.sm,
  },
  uploadText: {
    fontSize: fontSizes.xs,
    color: theme.colors.placeholder,
    fontStyle: 'italic',
  },
  notesInput: {
    marginBottom: spacing.lg,
  },
  addNotesButton: {
    alignSelf: 'flex-start',
  },
  actionButtons: {
    marginVertical: -spacing.xs,
  },
  actionButton: {
    marginVertical: spacing.xs,
  },
  actionButtonContent: {
    paddingVertical: spacing.sm,
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  fullscreenPhoto: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: theme.colors.placeholder,
  },
  taskCategory: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  tagalogLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  cnnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  customBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: 'visible',
    alignSelf: 'flex-start',
  },
  cnnBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: spacing.sm,
  },
  cnnBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeIcon: {
    marginRight: spacing.xs / 2,
  },
  cnnInfoText: {
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
    flex: 1,
  },
  uploadButton: {
    marginTop: spacing.md,
  },
  notesSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingBottom: spacing.md,
  },
  cameraCloseButton: {
    backgroundColor: constructionColors.urgent,
    margin: 0,
  },
  cameraTitle: {
    color: 'white',
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginLeft: spacing.md,
    flex: 1,
  },
  cameraActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 4,
    borderColor: theme.colors.primary,
  },
  // Notes Modal styles
  notesModalContainer: {
    padding: spacing.md,
  },
  notesModalCard: {
    maxHeight: '80%',
    backgroundColor: theme.colors.background,
  },
  notesModalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  notesModalSubtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    marginBottom: spacing.md,
  },
  notesTextInput: {
    marginBottom: spacing.md,
    minHeight: 100,
  },
  notesModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  notesModalCancelButton: {
    marginRight: spacing.sm,
  },
  notesModalContinueButton: {
    minWidth: 120,
  },
  successModalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  successModalSurface: {
    backgroundColor: theme.colors.background,
    padding: spacing.xl,
    borderRadius: theme.roundness,
    width: '90%',
    maxWidth: 400,
    elevation: 4,
  },
  successModalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  successModalButton: {
    marginTop: spacing.md,
  },
  cnnPredictionContainer: {
    marginTop: spacing.md,
  },
  cnnPredictionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: spacing.md,
  },
  cnnPredictionBox: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.roundness,
    padding: spacing.md,
  },
  cnnStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cnnLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  cnnStatusChip: {
    height: 32,
  },
  cnnStatusText: {
    color: 'white',
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  cnnConfidenceRow: {
    marginBottom: spacing.md,
  },
  confidenceContainer: {
    marginTop: spacing.sm,
  },
  confidencePercentage: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  confidenceBarContainer: {
    height: 8,
    backgroundColor: theme.colors.surfaceDisabled,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  cnnProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cnnProgressValue: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  cnnInfoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    padding: spacing.sm,
    borderRadius: theme.roundness,
    marginTop: spacing.xs,
  },
  cnnInfoNoteText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
});


