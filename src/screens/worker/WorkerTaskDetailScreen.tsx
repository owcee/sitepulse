import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
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

import { Task, TaskPhoto } from '../../types';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';

// Mock task detail data for worker
const mockWorkerTaskDetail: Task = {
  id: '2',
  title: 'Concrete Pouring - Level 1',
  description: 'Pour concrete for first floor slab. Ensure proper mixing ratios and curing procedures are followed. Check for any air bubbles and ensure even distribution. Follow all safety protocols and wear appropriate PPE.',
  assignedTo: 'worker-2',
  projectId: 'project-1',
  status: 'in_progress',
  dueDate: '2024-01-25',
  createdAt: '2024-01-20',
  updatedAt: '2024-01-22',
  lastPhoto: {
    id: 'photo-2',
    taskId: '2',
    imageUri: 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Concrete+Pour',
    cnnClassification: 'Concrete Pouring',
    confidence: 0.88,
    verificationStatus: 'pending',
    notes: 'Concrete pour completed according to specifications. Ready for engineer review.',
    uploadedBy: 'worker-2',
    uploadedAt: '2024-01-22T14:30:00Z',
  },
};

// Mock instruction steps
const mockInstructions = [
  'Set up concrete forms and ensure they are level and secure',
  'Verify concrete mix ratio meets specifications (1:2:3 ratio)',
  'Pour concrete in sections, starting from one corner',
  'Use vibrator to eliminate air bubbles',
  'Level surface with screed board',
  'Apply finishing techniques as required',
  'Cover with plastic sheeting for curing',
  'Take photos at key stages for documentation',
];

// Mock approved photos from engineer
const mockApprovedPhotos = [
  {
    id: 'approved-1',
    imageUri: 'https://via.placeholder.com/150x100/4CAF50/FFFFFF?text=Setup',
    description: 'Forms setup - Approved',
    uploadedAt: '2024-01-21T10:00:00Z',
  },
  {
    id: 'approved-2',
    imageUri: 'https://via.placeholder.com/150x100/4CAF50/FFFFFF?text=Mix',
    description: 'Concrete mix - Approved',
    uploadedAt: '2024-01-21T14:00:00Z',
  },
];

export default function WorkerTaskDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  
  // @ts-ignore - Route params would be properly typed in production
  const { taskId } = route.params;
  
  const [task] = useState<Task>(mockWorkerTaskDetail);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const getStatusColor = (status: Task['status']) => {
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
        return { color: theme.colors.disabled, icon: 'help-circle', text: 'Unknown Status' };
    }
  };

  // Action handlers removed per user request

  const handleAddNotes = async () => {
    if (!newNotes.trim()) {
      Alert.alert('Notes Required', 'Please enter some notes before submitting.');
      return;
    }

    Alert.alert('Notes Added', 'Your notes have been added to the task.');
    setNewNotes('');
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

  const daysUntilDue = getDaysUntilDue(task.dueDate);
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 2 && daysUntilDue >= 0;
  const verificationInfo = task.lastPhoto ? getVerificationStatusInfo(task.lastPhoto.verificationStatus) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.primary}
        />
        <Title style={styles.headerTitle}>Task Details</Title>
        <IconButton
          icon="help-circle"
          size={24}
          iconColor={theme.colors.primary}
        />
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

            <Paragraph style={styles.taskDescription}>
              {task.description}
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
                <Paragraph style={styles.detailLabel}>Due Date:</Paragraph>
                <Paragraph style={[
                  styles.detailValue,
                  (isOverdue || isDueSoon) && { color: isOverdue ? constructionColors.urgent : constructionColors.warning }
                ]}>
                  {formatDate(task.dueDate)}
                </Paragraph>
              </View>
              <View style={styles.detailRow}>
                <Paragraph style={styles.detailLabel}>Created:</Paragraph>
                <Paragraph style={styles.detailValue}>{formatDate(task.createdAt)}</Paragraph>
              </View>
              <View style={styles.detailRow}>
                <Paragraph style={styles.detailLabel}>Last Updated:</Paragraph>
                <Paragraph style={styles.detailValue}>{formatDate(task.updatedAt)}</Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Instructions Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.instructionsHeader}>
              <Title style={styles.cardTitle}>Task Instructions</Title>
              <IconButton icon="clipboard-list" size={20} iconColor={theme.colors.primary} />
            </View>
            
            <View style={styles.instructionsList}>
              {mockInstructions.map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <Paragraph style={styles.instructionNumberText}>{index + 1}</Paragraph>
                  </View>
                  <Paragraph style={styles.instructionText}>{instruction}</Paragraph>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Previous Approved Photos */}
        {mockApprovedPhotos.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.photosHeader}>
                <Title style={styles.cardTitle}>Previously Approved Photos</Title>
                <IconButton icon="check-circle" size={20} iconColor={constructionColors.complete} />
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.approvedPhotosContainer}>
                  {mockApprovedPhotos.map((photo) => (
                    <View key={photo.id} style={styles.approvedPhotoCard}>
                      <Image 
                        source={{ uri: photo.imageUri }} 
                        style={styles.approvedPhotoThumbnail}
                        resizeMode="cover"
                      />
                      <Badge 
                        style={[styles.approvedBadge, { backgroundColor: constructionColors.complete }]}
                      >
                        ✓
                      </Badge>
                      <Paragraph style={styles.approvedPhotoDescription}>
                        {photo.description}
                      </Paragraph>
                      <Paragraph style={styles.approvedPhotoDate}>
                        {new Date(photo.uploadedAt).toLocaleDateString()}
                      </Paragraph>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card.Content>
          </Card>
        )}

        {/* Current Photo Status */}
        {task.lastPhoto && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.photoHeader}>
                <Title style={styles.cardTitle}>Latest Photo Submission</Title>
                <Badge 
                  style={[styles.verificationBadge, { backgroundColor: verificationInfo?.color }]}
                >
                  {task.lastPhoto.verificationStatus.toUpperCase()}
                </Badge>
              </View>

              {/* Photo Preview */}
              <View style={styles.photoContainer}>
                <Image 
                  source={{ uri: task.lastPhoto.imageUri }} 
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
                <Button
                  mode="outlined"
                  onPress={() => openPhotoModal(task.lastPhoto!.imageUri)}
                  style={styles.fullscreenButton}
                  icon="fullscreen"
                >
                  View Full Size
                </Button>
              </View>

              {/* Verification Status */}
              <View style={[styles.verificationStatus, { backgroundColor: `${verificationInfo?.color}20` }]}>
                <IconButton 
                  icon={verificationInfo?.icon || 'help-circle'} 
                  size={20} 
                  iconColor={verificationInfo?.color}
                />
                <Paragraph style={[styles.verificationText, { color: verificationInfo?.color }]}>
                  {verificationInfo?.text}
                </Paragraph>
              </View>

              {/* AI Classification */}
              <View style={styles.aiClassification}>
                <IconButton icon="brain" size={16} iconColor={theme.colors.primary} />
                <Paragraph style={styles.aiText}>
                  AI Classification: <strong>{task.lastPhoto.cnnClassification}</strong> 
                  ({Math.round((task.lastPhoto.confidence || 0) * 100)}% confidence)
                </Paragraph>
              </View>

              {/* Worker Notes */}
              {task.lastPhoto.notes && (
                <View style={styles.workerNotes}>
                  <Paragraph style={styles.notesLabel}>Your Notes:</Paragraph>
                  <Paragraph style={styles.notesText}>{task.lastPhoto.notes}</Paragraph>
                </View>
              )}

              {/* Engineer Feedback (if rejected) */}
              {task.lastPhoto.verificationStatus === 'rejected' && (
                <View style={styles.engineerFeedback}>
                  <Paragraph style={styles.feedbackLabel}>Engineer Feedback:</Paragraph>
                  <Paragraph style={styles.feedbackText}>
                    Please recheck the concrete consistency and ensure proper vibration to eliminate air bubbles. Resubmit photos showing improved technique.
                  </Paragraph>
                </View>
              )}

              <View style={styles.uploadInfo}>
                <Paragraph style={styles.uploadText}>
                  Uploaded on {formatDate(task.lastPhoto.uploadedAt)}
                </Paragraph>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Add Notes Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Add Notes</Title>
            
            <TextInput
              label="Progress Notes"
              value={newNotes}
              onChangeText={setNewNotes}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.notesInput}
              placeholder="Share your progress, concerns, or questions..."
            />

            <Button
              mode="contained"
              onPress={handleAddNotes}
              icon="note-plus"
              style={styles.addNotesButton}
            >
              Add Notes
            </Button>
          </Card.Content>
        </Card>

        {/* Action buttons card removed per user request */}
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
    paddingVertical: spacing.sm,
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
    gap: spacing.sm,
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
    gap: spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    gap: spacing.md,
  },
  approvedPhotoCard: {
    width: 120,
    alignItems: 'center',
    position: 'relative',
  },
  approvedPhotoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: theme.roundness,
    marginBottom: spacing.sm,
  },
  approvedBadge: {
    position: 'absolute',
    top: -5,
    right: 10,
    minWidth: 24,
    height: 24,
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
  },
  verificationBadge: {
    alignSelf: 'flex-start',
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
    gap: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
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
});


