import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
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
import { getProjectVerificationLogs, WorkerVerificationData, VerificationLog } from '../../services/reportService';
import { approvePhoto, rejectPhoto } from '../../services/photoService';
import { approveUsageSubmission, rejectUsageSubmission } from '../../services/usageService';

export default function ReportLogsScreen() {
  const { state, projectId } = useProjectData(); // Use projectId directly from context
  const [workersData, setWorkersData] = useState<WorkerVerificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerVerificationData | null>(null);
  const [selectedLog, setSelectedLog] = useState<VerificationLog | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // For image viewer
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'history'>('reports'); // Tab state
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null); // For expanding history items

  useEffect(() => {
    loadData();
  }, [projectId]); // Reload when projectId changes

  const loadData = async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    
    try {
      const data = await getProjectVerificationLogs(projectId);
      setWorkersData(data);
    } catch (error) {
      console.error('Error loading logs:', error);
      Alert.alert('Error', 'Failed to load verification logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'equipment': return 'construct';
      case 'material': return 'cube';
      case 'task': return 'check-circle';
      case 'damage': return 'warning';
      default: return 'document';
    }
  };

  const getLogTypeLabel = (log: VerificationLog) => {
    switch (log.type) {
      case 'equipment':
        return `Equipment Usage${log.itemName ? `: ${log.itemName}` : ''}`;
      case 'material':
        return `Material Usage${log.itemName ? `: ${log.itemName}` : ''}`;
      case 'task':
        return `Task Completion${log.taskTitle ? `: ${log.taskTitle}` : ''}`;
      case 'damage':
        return `Damage Report${log.itemName ? `: ${log.itemName}` : ''}`;
      default:
        return 'Unknown';
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
    try {
      if (log.type === 'task') {
        await approvePhoto(log.id);
      } else {
        await approveUsageSubmission(log.id);
      }
      
      Alert.alert('Success', 'Log approved successfully');
      await loadData(); // Refresh data
      // Also update selected worker view if open
      if (selectedWorker) {
        const updatedData = await getProjectVerificationLogs(projectId);
        const updatedWorker = updatedData.find(w => w.workerId === selectedWorker.workerId);
        if (updatedWorker) setSelectedWorker(updatedWorker);
      }
    } catch (error) {
      console.error('Error approving log:', error);
      Alert.alert('Error', 'Failed to approve log');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectLog = (log: VerificationLog) => {
    setSelectedLog(log);
    setRejectionNotes('');
    setShowRejectionModal(true);
  };

  const submitRejection = async () => {
    if (!rejectionNotes.trim() || !selectedLog) {
      Alert.alert('Missing Notes', 'Please enter rejection notes for the worker.');
      return;
    }

    setIsProcessing(true);
    try {
      if (selectedLog.type === 'task') {
        await rejectPhoto(selectedLog.id, rejectionNotes);
      } else {
        await rejectUsageSubmission(selectedLog.id, rejectionNotes);
      }

      Alert.alert('Success', 'Log rejected and worker notified');
      setShowRejectionModal(false);
      setRejectionNotes('');
      setSelectedLog(null);
      
      await loadData(); // Refresh data
      // Also update selected worker view if open
      if (selectedWorker) {
        const updatedData = await getProjectVerificationLogs(projectId);
        const updatedWorker = updatedData.find(w => w.workerId === selectedWorker.workerId);
        if (updatedWorker) setSelectedWorker(updatedWorker);
      }
    } catch (error) {
      console.error('Error rejecting log:', error);
      Alert.alert('Error', 'Failed to reject log');
    } finally {
      setIsProcessing(false);
    }
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
              <Title style={styles.logTitle}>{getLogTypeLabel(log)}</Title>
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
          <TouchableOpacity 
            style={styles.photoContainer}
            onPress={() => {
              setSelectedImage(log.photo);
              setShowImageModal(true);
            }}
          >
            <Image source={{ uri: log.photo }} style={styles.submissionPhoto} />
            <Paragraph style={styles.tapToEnlarge}>Tap to enlarge</Paragraph>
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
                  - Engineer ({log.verifiedAt ? new Date(log.verifiedAt).toLocaleString() : ''})
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

  // Render history item (simple ID and date, expandable to full view)
  const renderHistoryItem = (log: VerificationLog) => {
    const isExpanded = expandedHistoryId === log.id;

    if (isExpanded) {
      // Show full details when expanded
      return renderLogItem(log);
    }

    // Show compact view when collapsed
    return (
      <Card 
        key={log.id} 
        style={styles.historyCard}
        onPress={() => setExpandedHistoryId(log.id)}
      >
        <Card.Content style={styles.historyCardContent}>
          <View style={styles.historyRow}>
            <View style={styles.historyIdSection}>
              <Paragraph style={styles.historyLabel}>ID:</Paragraph>
              <Paragraph style={styles.historyId}>{log.id.substring(0, 8)}...</Paragraph>
            </View>
            <View style={styles.historyDateSection}>
              <Paragraph style={styles.historyLabel}>
                {log.status === 'approved' ? 'Approved:' : 'Rejected:'}
              </Paragraph>
              <Paragraph style={styles.historyDate}>
                {log.verifiedAt ? new Date(log.verifiedAt).toLocaleDateString() : 'N/A'}
              </Paragraph>
            </View>
            <View style={styles.historyStatusIcon}>
              <Ionicons 
                name={log.status === 'approved' ? 'check-circle' : 'close-circle'} 
                size={24} 
                color={log.status === 'approved' ? constructionColors.complete : constructionColors.urgent}
              />
            </View>
          </View>
          <Paragraph style={styles.historyTaskTitle}>{getLogTypeLabel(log)}</Paragraph>
          <Paragraph style={styles.tapToExpand}>Tap to view details</Paragraph>
        </Card.Content>
      </Card>
    );
  };

  // Main worker list view
  if (!selectedWorker) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <Title style={styles.screenTitle}>Report Logs</Title>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Paragraph style={styles.loadingText}>Loading logs...</Paragraph>
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.workersGridContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {workersData.length > 0 ? (
              workersData.map((item) => (
                <View key={item.workerId}>
                  {renderWorkerCard({ item })}
                </View>
              ))
            ) : (
              <Paragraph style={styles.emptyText}>No activity found for this project yet.</Paragraph>
            )}
          </ScrollView>
        )}
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

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Paragraph style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            Reports ({selectedWorker.logs.filter(l => l.status === 'pending').length})
          </Paragraph>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Paragraph style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History ({selectedWorker.logs.filter(l => l.status !== 'pending').length})
          </Paragraph>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logsContainer} showsVerticalScrollIndicator={false}>
        {activeTab === 'reports' ? (
          // Reports Tab - Show ONLY pending logs with full details
          selectedWorker.logs.filter(l => l.status === 'pending').length > 0 ? (
            selectedWorker.logs
              .filter(l => l.status === 'pending')
              .map(renderLogItem)
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Paragraph style={styles.emptyText}>
                  No pending reports for this worker.
                </Paragraph>
              </Card.Content>
            </Card>
          )
        ) : (
          // History Tab - Show ONLY approved/rejected with ID and date
          selectedWorker.logs.filter(l => l.status !== 'pending').length > 0 ? (
            <>
              {selectedWorker.logs
                .filter(l => l.status !== 'pending')
                .map(renderHistoryItem)}
              {expandedHistoryId && (
                <Button
                  mode="text"
                  onPress={() => setExpandedHistoryId(null)}
                  style={styles.collapseButton}
                  icon="chevron-up"
                >
                  Collapse
                </Button>
              )}
            </>
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Paragraph style={styles.emptyText}>
                  No history available yet.
                </Paragraph>
              </Card.Content>
            </Card>
          )
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

        {/* Image Viewer Modal */}
        <Modal
          visible={showImageModal}
          onDismiss={() => setShowImageModal(false)}
          contentContainerStyle={styles.imageModal}
        >
          <View style={styles.imageModalHeader}>
            <Title style={styles.imageModalTitle}>Photo Evidence</Title>
            <IconButton
              icon="close"
              size={24}
              iconColor="white"
              onPress={() => setShowImageModal(false)}
            />
          </View>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
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
    backgroundColor: theme.colors.background,
    elevation: 0,
  },
  screenTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
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
    color: theme.colors.text,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
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
    color: theme.colors.text,
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
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  notesContainer: {
    padding: spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness,
  },
  engineerNotesContainer: {
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: theme.roundness,
  },
  notesText: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.placeholder,
  },
  tapToEnlarge: {
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  imageModal: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    margin: 0,
    padding: 0,
    flex: 1,
    justifyContent: 'center',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  imageModalTitle: {
    color: 'white',
    fontSize: fontSizes.lg,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  historyCard: {
    marginBottom: spacing.sm,
    elevation: 1,
    backgroundColor: theme.colors.surface,
  },
  historyCardContent: {
    paddingVertical: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  historyIdSection: {
    flex: 1,
  },
  historyDateSection: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  historyStatusIcon: {
    marginLeft: spacing.xs,
  },
  historyLabel: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  historyId: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  historyDate: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  historyTaskTitle: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  tapToExpand: {
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  collapseButton: {
    marginVertical: spacing.md,
  },
});
