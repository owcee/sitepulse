import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList, TouchableOpacity, Image } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Surface,
  Chip,
  List,
  IconButton,
  Badge,
  Modal,
  Portal,
  TextInput,
  Divider
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';

interface VerificationLog {
  id: string;
  workerId: string;
  type: 'equipment' | 'material' | 'task' | 'damage';
  photo: string;
  workerNotes: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  engineerNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

interface WorkerVerificationData {
  workerId: string;
  workerName: string;
  pendingCount: number;
  lastActivity: string;
  logs: VerificationLog[];
}

// Mock verification data - removed clock in/out, only work submissions
const mockVerificationData: WorkerVerificationData[] = [
  {
    workerId: '1',
    workerName: 'John Doe',
    pendingCount: 2,
    lastActivity: '2024-01-28T14:30:00Z',
    logs: [
      {
        id: '3',
        workerId: '1',
        type: 'material',
        photo: 'https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=Cement+Bags',
        workerNotes: 'Used 5 bags of cement for foundation work in Section A',
        timestamp: '2024-01-28T10:30:00Z',
        status: 'approved',
        engineerNotes: 'Approved - usage verified on site',
        verifiedBy: 'Engineer Smith',
        verifiedAt: '2024-01-28T11:00:00Z',
      },
      {
        id: '4',
        workerId: '1',
        type: 'equipment',
        photo: 'https://via.placeholder.com/300x200/45B7D1/FFFFFF?text=Concrete+Mixer',
        workerNotes: 'Used concrete mixer for 2 hours, cleaned after use',
        timestamp: '2024-01-28T14:30:00Z',
        status: 'pending',
      },
    ],
  },
  {
    workerId: '2',
    workerName: 'Jane Smith',
    pendingCount: 1,
    lastActivity: '2024-01-28T16:45:00Z',
    logs: [
      {
        id: '6',
        workerId: '2',
        type: 'task',
        photo: 'https://via.placeholder.com/300x200/96CEB4/FFFFFF?text=Electrical+Work',
        workerNotes: 'Completed electrical wiring for first floor, all connections tested',
        timestamp: '2024-01-28T16:45:00Z',
        status: 'pending',
      },
    ],
  },
  {
    workerId: '3',
    workerName: 'Mike Johnson',
    pendingCount: 1,
    lastActivity: '2024-01-28T15:30:00Z',
    logs: [
      {
        id: '9',
        workerId: '3',
        type: 'damage',
        photo: 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Wall+Damage',
        workerNotes: 'Found crack in wall during plumbing installation, needs repair',
        timestamp: '2024-01-28T15:30:00Z',
        status: 'pending',
      },
    ],
  },
];

export default function ReportLogsScreen() {
  const { state } = useProjectData();
  const [selectedWorker, setSelectedWorker] = useState<WorkerVerificationData | null>(null);
  const [selectedLog, setSelectedLog] = useState<VerificationLog | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'equipment': return 'construct';
      case 'material': return 'cube';
      case 'task': return 'checkmark-circle';
      case 'damage': return 'warning';
      default: return 'document';
    }
  };

  const getLogTypeLabel = (type: string) => {
    switch (type) {
      case 'equipment': return 'Equipment Usage';
      case 'material': return 'Material Usage';
      case 'task': return 'Task Completion';
      case 'damage': return 'Damage Report';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return constructionColors.complete;
      case 'rejected': return constructionColors.urgent;
      case 'pending': return constructionColors.warning;
      default: return theme.colors.outline;
    }
  };

  const handleApproveLog = async (log: VerificationLog) => {
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      Alert.alert(
        'Log Approved',
        `${getLogTypeLabel(log.type)} has been approved and saved to Firestore.`,
        [{ text: 'OK' }]
      );
      // Here you would update the log status in your state/context
    }, 1500);
  };

  const handleRejectLog = (log: VerificationLog) => {
    setSelectedLog(log);
    setRejectionNotes('');
    setShowRejectionModal(true);
  };

  const submitRejection = async () => {
    if (!rejectionNotes.trim()) {
      Alert.alert('Missing Notes', 'Please enter rejection notes for the worker.');
      return;
    }

    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      setShowRejectionModal(false);
      Alert.alert(
        'Log Rejected',
        `${selectedLog ? getLogTypeLabel(selectedLog.type) : 'Log'} has been rejected. Worker will receive FCM notification with your feedback.`,
        [{ text: 'OK' }]
      );
      setSelectedLog(null);
      setRejectionNotes('');
    }, 1500);
  };

  const renderWorkerCard = ({ item }: { item: WorkerVerificationData }) => (
    <TouchableOpacity 
      style={styles.workerFolderCard}
      onPress={() => setSelectedWorker(item)}
    >
      <View style={styles.folderIconContainer}>
        <Ionicons name="folder" size={64} color="#4A90E2" />
        {item.pendingCount > 0 && (
          <Badge 
            style={[styles.pendingBadge, { backgroundColor: constructionColors.urgent }]}
            size={20}
          >
            {item.pendingCount}
          </Badge>
        )}
      </View>
      <Paragraph style={styles.workerFolderName}>{item.workerName}</Paragraph>
    </TouchableOpacity>
  );

  const renderLogItem = (log: VerificationLog) => (
    <Card key={log.id} style={styles.logCard}>
      <Card.Content>
        <View style={styles.logHeader}>
          <View style={styles.logInfo}>
            <Ionicons 
              name={getLogTypeIcon(log.type)} 
              size={24} 
              color={getStatusColor(log.status)} 
            />
            <View style={styles.logDetails}>
              <Title style={styles.logTitle}>{getLogTypeLabel(log.type)}</Title>
              <Paragraph style={styles.logTimestamp}>
                {new Date(log.timestamp).toLocaleString()}
              </Paragraph>
            </View>
          </View>
          <Chip 
            style={{ backgroundColor: getStatusColor(log.status) }}
            textStyle={{ color: 'white', fontSize: 12 }}
          >
            {log.status.toUpperCase()}
          </Chip>
        </View>

        {/* Photo Evidence */}
        <View style={styles.photoSection}>
          <Paragraph style={styles.notesLabel}>Photo Evidence:</Paragraph>
          <TouchableOpacity style={styles.photoContainer}>
            <Image source={{ uri: log.photo }} style={styles.submissionPhoto} />
          </TouchableOpacity>
        </View>

        {/* Worker Notes */}
        <View style={styles.notesSection}>
          <Paragraph style={styles.notesLabel}>Worker Notes:</Paragraph>
          <Surface style={styles.notesContainer}>
            <Paragraph style={styles.notesText}>{log.workerNotes}</Paragraph>
          </Surface>
        </View>

        {/* Engineer Notes (if rejected/approved) */}
        {log.engineerNotes && (
          <View style={styles.notesSection}>
            <Paragraph style={styles.notesLabel}>Engineer Notes:</Paragraph>
            <Surface style={styles.engineerNotesContainer}>
              <Paragraph style={styles.notesText}>{log.engineerNotes}</Paragraph>
              {log.verifiedBy && (
                <Paragraph style={styles.verificationInfo}>
                  - {log.verifiedBy} ({log.verifiedAt ? new Date(log.verifiedAt).toLocaleString() : ''})
                </Paragraph>
              )}
            </Surface>
          </View>
        )}

        {/* Action Buttons for Pending Logs */}
        {log.status === 'pending' && (
          <View style={styles.logActions}>
            <Button
              mode="outlined"
              onPress={() => handleRejectLog(log)}
              style={styles.rejectButton}
              icon="close"
              disabled={isProcessing}
            >
              Reject
            </Button>
            <Button
              mode="contained"
              onPress={() => handleApproveLog(log)}
              style={styles.approveButton}
              icon="check"
              loading={isProcessing}
              disabled={isProcessing}
            >
              Approve
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  // Main worker list view
  if (!selectedWorker) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <Title style={styles.screenTitle}>Report Logs</Title>
          <Paragraph style={styles.subtitle}>
            Review and verify worker submissions
          </Paragraph>
        </View>

        <View style={styles.workersGridContainer}>
          {mockVerificationData.map((item) => (
            <View key={item.workerId}>
              {renderWorkerCard({ item })}
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Worker's logs detail view
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.detailHeader}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => setSelectedWorker(null)}
        />
        <View style={styles.detailTitleContainer}>
          <Title style={styles.detailTitle}>{selectedWorker.workerName}</Title>
          <Paragraph style={styles.detailSubtitle}>Verification Logs</Paragraph>
        </View>
      </View>

      <ScrollView style={styles.logsContainer} showsVerticalScrollIndicator={false}>
        {selectedWorker.logs.length > 0 ? (
          selectedWorker.logs.map(renderLogItem)
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Paragraph style={styles.emptyText}>
                No logs submitted by this worker yet.
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Rejection Modal */}
      <Portal>
        <Modal
          visible={showRejectionModal}
          onDismiss={() => setShowRejectionModal(false)}
          contentContainerStyle={styles.rejectionModal}
        >
          <Title style={styles.modalTitle}>Reject Submission</Title>
          <Paragraph style={styles.modalSubtitle}>
            Please provide feedback for the worker to resubmit properly.
          </Paragraph>
          
          <TextInput
            label="Rejection Notes *"
            value={rejectionNotes}
            onChangeText={setRejectionNotes}
            multiline
            numberOfLines={4}
            style={styles.rejectionInput}
            placeholder="Explain why this submission is being rejected and what needs to be corrected..."
          />
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowRejectionModal(false)}
              style={styles.modalCancelButton}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={submitRejection}
              style={styles.modalSubmitButton}
              loading={isProcessing}
              disabled={isProcessing || !rejectionNotes.trim()}
            >
              Reject & Notify
            </Button>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
  },
  workersGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: spacing.md,
    paddingTop: 0,
  },
  workerFolderCard: {
    alignItems: 'center',
    padding: spacing.sm,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    elevation: 2,
    width: 100,
    minHeight: 120,
  },
  folderIconContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
    overflow: 'visible',
  },
  workerFolderName: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pendingBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  detailTitleContainer: {
    marginLeft: spacing.sm,
  },
  detailTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  detailSubtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  logsContainer: {
    flex: 1,
    padding: spacing.md,
    paddingTop: 0,
  },
  logCard: {
    marginBottom: spacing.md,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  logInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  logTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  logTimestamp: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  notesSection: {
    marginBottom: spacing.md,
  },
  notesLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  notesContainer: {
    padding: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.roundness,
  },
  engineerNotesContainer: {
    padding: spacing.sm,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.roundness,
  },
  notesText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurface,
    lineHeight: 20,
  },
  verificationInfo: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  logActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    flex: 1,
    marginRight: spacing.xs,
    borderColor: constructionColors.urgent,
  },
  approveButton: {
    flex: 1,
    marginLeft: spacing.xs,
    backgroundColor: constructionColors.complete,
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  rejectionModal: {
    backgroundColor: theme.colors.surface,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: theme.roundness,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  rejectionInput: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    marginRight: spacing.xs,
    borderColor: theme.colors.outline,
  },
  modalSubmitButton: {
    flex: 1,
    marginLeft: spacing.xs,
    backgroundColor: constructionColors.urgent,
  },
  photoSection: {
    marginBottom: spacing.md,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  submissionPhoto: {
    width: 200,
    height: 150,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surfaceVariant,
  },
});
