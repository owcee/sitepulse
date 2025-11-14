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
  Badge 
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import { Task, TaskPhoto } from '../../types';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';

// Mock task detail data
const mockTaskDetail: Task = {
  id: '2',
  title: 'Concrete Pouring - Level 1',
  description: 'Pour concrete for first floor slab. Ensure proper mixing ratios and curing procedures are followed. Check for any air bubbles and ensure even distribution.',
  assignedTo: 'worker-2',
  projectId: 'project-1',
  status: 'in_progress',
  dueDate: '2024-01-25',
  createdAt: '2024-01-20',
  updatedAt: '2024-01-22',
  lastPhoto: {
    id: 'photo-2',
    taskId: '2',
    imageUri: 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Concrete+Work',
    cnnClassification: 'Concrete Pouring',
    confidence: 0.88,
    verificationStatus: 'pending',
    notes: 'Ready for review - concrete pour completed',
    uploadedBy: 'worker-2',
    uploadedAt: '2024-01-22T14:30:00Z',
  },
};

export default function TaskDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  
  // @ts-ignore - Route params would be properly typed in production
  const { taskId } = route.params;
  
  const [task] = useState<Task>(mockTaskDetail);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);

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


  const handleApprove = async () => {
    setProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      Alert.alert(
        'Task Approved',
        'The photo has been approved and task status updated.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      setProcessing(false);
    }, 1000);
  };

  const handleReject = async () => {
    if (!verificationNotes.trim()) {
      Alert.alert('Notes Required', 'Please provide feedback notes when rejecting a submission.');
      return;
    }

    setProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      Alert.alert(
        'Task Rejected',
        'The photo has been rejected and feedback has been sent to the worker.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      setProcessing(false);
    }, 1000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return constructionColors.complete;
    if (confidence >= 0.7) return constructionColors.warning;
    return constructionColors.urgent;
  };

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
          icon="dots-vertical"
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

            <View style={styles.taskDetails}>
              <View style={styles.detailRow}>
                <Paragraph style={styles.detailLabel}>Assigned to:</Paragraph>
                <Paragraph style={styles.detailValue}>Worker {task.assignedTo.split('-')[1]}</Paragraph>
              </View>
              <View style={styles.detailRow}>
                <Paragraph style={styles.detailLabel}>Due Date:</Paragraph>
                <Paragraph style={styles.detailValue}>{formatDate(task.dueDate)}</Paragraph>
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

        {/* Photo Verification Card */}
        {task.lastPhoto && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.photoHeader}>
                <Title style={styles.cardTitle}>Latest Photo Submission</Title>
                <Badge 
                  style={[
                    styles.verificationBadge, 
                    { backgroundColor: 
                      task.lastPhoto.verificationStatus === 'approved' ? constructionColors.complete :
                      task.lastPhoto.verificationStatus === 'rejected' ? constructionColors.urgent :
                      constructionColors.warning 
                    }
                  ]}
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
                  onPress={() => setPhotoModalVisible(true)}
                  style={styles.fullscreenButton}
                  icon="fullscreen"
                >
                  View Full Size
                </Button>
              </View>

              {/* CNN Classification */}
              <Card style={styles.cnnCard}>
                <Card.Content>
                  <View style={styles.cnnHeader}>
                    <IconButton icon="brain" size={20} iconColor={theme.colors.primary} />
                    <Title style={styles.cnnTitle}>AI Classification</Title>
                  </View>
                  
                  <View style={styles.cnnResult}>
                    <Paragraph style={styles.cnnClassification}>
                      {task.lastPhoto.cnnClassification}
                    </Paragraph>
                    <Chip 
                      style={[
                        styles.confidenceChip, 
                        { backgroundColor: getConfidenceColor(task.lastPhoto.confidence || 0) }
                      ]}
                      textStyle={{ color: 'white', fontWeight: 'bold' }}
                    >
                      {Math.round((task.lastPhoto.confidence || 0) * 100)}% Confidence
                    </Chip>
                  </View>
                </Card.Content>
              </Card>

              {/* Worker Notes */}
              {task.lastPhoto.notes && (
                <View style={styles.workerNotes}>
                  <Paragraph style={styles.notesLabel}>Worker Notes:</Paragraph>
                  <Paragraph style={styles.notesText}>{task.lastPhoto.notes}</Paragraph>
                </View>
              )}

              {/* Upload Info */}
              <View style={styles.uploadInfo}>
                <Paragraph style={styles.uploadText}>
                  Uploaded by Worker {task.lastPhoto.uploadedBy.split('-')[1]} on {formatDate(task.lastPhoto.uploadedAt)}
                </Paragraph>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Verification Controls Card */}
        {task.lastPhoto && task.lastPhoto.verificationStatus === 'pending' && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Verification Controls</Title>
              
              {/* Notes Input */}
              <TextInput
                label="Feedback Notes"
                value={verificationNotes}
                onChangeText={setVerificationNotes}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.notesInput}
                placeholder="Provide feedback for the worker..."
              />

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={handleApprove}
                  loading={processing}
                  icon="check"
                  style={[styles.actionButton, { backgroundColor: constructionColors.complete }]}
                  contentStyle={styles.actionButtonContent}
                >
                  Approve
                </Button>
                
                <Button
                  mode="contained"
                  onPress={handleReject}
                  loading={processing}
                  icon="close"
                  style={[styles.actionButton, { backgroundColor: constructionColors.urgent }]}
                  contentStyle={styles.actionButtonContent}
                >
                  Reject
                </Button>
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
            {task.lastPhoto && (
              <Image 
                source={{ uri: task.lastPhoto.imageUri }} 
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
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.md,
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
  cnnCard: {
    backgroundColor: '#f0f7ff',
    elevation: 1,
    marginBottom: spacing.md,
  },
  cnnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cnnTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: spacing.sm,
  },
  cnnResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cnnClassification: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  confidenceChip: {
    height: 28,
  },
  workerNotes: {
    backgroundColor: '#fff3cd',
    padding: spacing.md,
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
  },
  notesLabel: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fontSizes.sm,
    color: '#856404',
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
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


