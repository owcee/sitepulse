import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, Text as RNText, ActivityIndicator } from 'react-native';
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
  Divider 
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { getTaskById, updateTaskStatus, Task as FirebaseTask } from '../../services/taskService';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CameraType } from 'expo-camera';
import { uploadTaskPhoto, canWorkerSubmitToday } from '../../services/photoService';
import { auth } from '../../firebaseConfig';

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

  // Load task from Firestore
  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const taskData = await getTaskById(taskId);
      if (taskData) {
        setTask(taskData);
        
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

      // Show notes modal (Android compatible)
      setShowNotesModal(true);
    } catch (error: any) {
      console.error('Error in photo upload flow:', error);
      Alert.alert('Error', error.message || 'Failed to start photo upload');
    }
  };

  const continueToCamera = () => {
    setShowNotesModal(false);
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        setShowCamera(false);
        setUploadingPhoto(true);

        try {
          // Get user profile for metadata
          const { getUserProfile } = await import('../../utils/user');
          if (!auth.currentUser) {
            throw new Error('User not authenticated');
          }
          
          const userProfile = await getUserProfile(auth.currentUser.uid);
          if (!userProfile || !userProfile.projectId) {
            throw new Error('No project assigned. Please contact your engineer.');
          }

          // Upload photo with proper metadata
          await uploadTaskPhoto(
            taskId,
            photo.uri,
            {
              projectId: userProfile.projectId,
              uploaderName: userProfile.name,
              cnnClassification: null,
              notes: photoNotes || undefined
            }
          );

          Alert.alert('Success', 'Photo uploaded successfully. Awaiting engineer review.');
          setPhotoNotes('');
          
          // Reload task to show new photo
          await loadTaskDetails();
        } catch (error: any) {
          console.error('Error uploading photo:', error);
          Alert.alert('Upload Failed', error.message || 'Failed to upload photo');
        } finally {
          setUploadingPhoto(false);
        }
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
                style={styles.closeButton}
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
          <Card.Content>
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
                { backgroundColor: isOverdue ? '#ffebee' : '#fff3e0' }
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
          <Card.Content style={{ overflow: 'visible' }}>
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
              <View style={[styles.cnnInfo, { backgroundColor: theme.colors.primaryContainer }]}>
                <IconButton icon="brain" size={20} iconColor={theme.colors.primary} />
                <Paragraph style={styles.cnnInfoText}>
                  This task requires AI verification
                </Paragraph>
              </View>
            )}

            {/* Current Verification Result */}
            {task.verification?.cnnResult && (
              <View style={styles.aiClassification}>
                <IconButton icon="brain" size={16} iconColor={theme.colors.primary} />
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
          </Card.Content>
        </Card>

        {/* Engineer Notes */}
        {task.notes && (
          <Card style={styles.card}>
            <Card.Content>
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
              style={styles.closeButton}
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
            <Card.Content>
              <Title style={styles.notesModalTitle}>Add Notes (Optional)</Title>
              <Paragraph style={styles.notesModalSubtitle}>
                Describe the work completed, any issues encountered, or questions for the engineer:
              </Paragraph>
              
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
                  onPress={continueToCamera}
                  icon="camera"
                  style={styles.notesModalContinueButton}
                >
                  Continue
                </Button>
              </View>
            </Card.Content>
          </Card>
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
    backgroundColor: 'white',
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
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#f0f7ff',
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
    backgroundColor: '#e8f5e8',
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
    backgroundColor: '#ffebee',
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
    borderTopColor: '#e0e0e0',
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
    backgroundColor: '#f8f9fa',
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
  closeButton: {
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
});


