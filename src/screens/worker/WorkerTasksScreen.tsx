import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Chip, 
  Badge, 
  Searchbar,
  IconButton,
  FAB,
  Button,
  ActivityIndicator,
  Text,
  Modal,
  Portal,
  Surface,
  List
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../../firebaseConfig';
import { collection, query, where, orderBy, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { Task } from '../../types';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { getWorkerTasks, Task as FirebaseTask } from '../../services/taskService';
import { useProjectData } from '../../context/ProjectDataContext';

export default function WorkerTasksScreen() {
  const navigation = useNavigation();
  const { projectId } = useProjectData();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<FirebaseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [taskPhotos, setTaskPhotos] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load worker's tasks from Firestore
  useEffect(() => {
    loadWorkerTasks();
  }, [projectId]);

  const loadWorkerTasks = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log('No user logged in');
        setTasks([]);
        return;
      }

      // Get tasks assigned to this worker
      const workerTasks = await getWorkerTasks(currentUser.uid);
      console.log(`✅ Loaded ${workerTasks.length} tasks for worker ${currentUser.uid}`);
      
      // Filter by projectId if available
      const filteredByProject = projectId 
        ? workerTasks.filter(task => task.projectId === projectId)
        : workerTasks;
      
      setTasks(filteredByProject);
    } catch (error: any) {
      console.error('Error loading worker tasks:', error);
      Alert.alert('Error', `Failed to load tasks: ${error.message}`);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkerTasks();
    setRefreshing(false);
  };

  const loadTaskPhotoHistory = async () => {
    if (!auth.currentUser) return;
    
    try {
      setLoadingHistory(true);
      const photosRef = collection(db, 'task_photos');
      
      // Query without orderBy first to avoid index requirement
      let q = query(
        photosRef,
        where('uploaderId', '==', auth.currentUser.uid)
      );

      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (indexError: any) {
        // If index error, try without orderBy
        console.log('Index error, fetching without orderBy:', indexError);
        q = query(
          photosRef,
          where('uploaderId', '==', auth.currentUser.uid)
        );
        snapshot = await getDocs(q);
      }

      const photos: any[] = [];
      const taskCache = new Map<string, string>();

      // Fetch all photos first
      const photoPromises = snapshot.docs.map(async (photoDoc) => {
        const data = photoDoc.data();
        let taskTitle = 'Unknown Task';
        
        // Try to get task title from cache or fetch it
        if (data.taskId) {
          if (taskCache.has(data.taskId)) {
            taskTitle = taskCache.get(data.taskId)!;
          } else {
            try {
              const taskDocRef = doc(db, 'tasks', data.taskId);
              const taskSnap = await getDoc(taskDocRef);
              if (taskSnap.exists()) {
                const taskData = taskSnap.data();
                taskTitle = taskData.title || 'Unknown Task';
                taskCache.set(data.taskId, taskTitle);
              }
            } catch (err) {
              console.error('Error fetching task title:', err);
            }
          }
        }
        
        const uploadedAt = data.uploadedAt?.toDate() || new Date();
        
        return {
          id: photoDoc.id,
          taskId: data.taskId,
          taskTitle: taskTitle,
          imageUrl: data.imageUrl,
          verificationStatus: data.verificationStatus || 'pending',
          notes: data.notes || '',
          rejectionReason: data.rejectionReason || '',
          uploadedAt: uploadedAt,
          verifiedAt: data.verifiedAt?.toDate(),
          verifiedBy: data.verifiedBy,
        };
      });

      const resolvedPhotos = await Promise.all(photoPromises);
      
      // Sort by uploadedAt descending in memory
      resolvedPhotos.sort((a, b) => {
        const dateA = a.uploadedAt instanceof Date ? a.uploadedAt.getTime() : new Date(a.uploadedAt).getTime();
        const dateB = b.uploadedAt instanceof Date ? b.uploadedAt.getTime() : new Date(b.uploadedAt).getTime();
        return dateB - dateA;
      });
      
      setTaskPhotos(resolvedPhotos);
    } catch (error: any) {
      console.error('Error loading task photo history:', error);
      Alert.alert('Error', `Failed to load upload history: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return constructionColors.complete;
      case 'rejected':
        return constructionColors.urgent;
      case 'pending':
        return constructionColors.warning;
      default:
        return theme.colors.outline;
    }
  };

  const getTaskStatusColor = (status: Task['status']) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'in_progress':
        return 'clock';
      case 'not_started':
        return 'circle-outline';
      default:
        return 'help-circle';
    }
  };


  const getVerificationStatus = (task: FirebaseTask) => {
    if (!task.verification?.engineerStatus) return null;
    
    switch (task.verification.engineerStatus) {
      case 'approved':
        return { icon: 'check-circle', color: constructionColors.complete, text: 'Approved' };
      case 'pending':
        return { icon: 'clock', color: constructionColors.warning, text: 'Under Review' };
      case 'rejected':
        return { icon: 'close-circle', color: constructionColors.urgent, text: 'Rejected' };
      default:
        return null;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredTasks = tasks.filter(task => {
    const searchLower = searchQuery.toLowerCase();
    return (
      task.title?.toLowerCase().includes(searchLower) ||
      task.subTask?.toLowerCase().includes(searchLower) ||
      task.tagalogLabel?.toLowerCase().includes(searchLower) ||
      task.category?.toLowerCase().includes(searchLower)
    );
  });

  const handleTaskPress = (task: any) => {
    // @ts-ignore - Navigation typing would be properly configured in production
    navigation.navigate('WorkerTaskDetail', { taskId: task.id });
  };

  const renderTaskCard = (task: FirebaseTask) => {
    const verificationStatus = getVerificationStatus(task);
    const daysUntilDue = getDaysUntilDue(task.planned_end_date);
    const isCompleted = task.status === 'completed';
    const isInProgress = task.status === 'in_progress';
    // Only show border indicators for tasks that are not completed
    const isOverdue = !isCompleted && daysUntilDue < 0;
    const isDueSoon = !isCompleted && daysUntilDue <= 2 && daysUntilDue >= 0;
    
    // For completed or not_started tasks, use View instead of TouchableOpacity
    const isNotStarted = task.status === 'not_started';
    const CardWrapper: any = (isCompleted || isNotStarted) ? View : TouchableOpacity;
    const cardProps = (isCompleted || isNotStarted) ? {} : { onPress: () => handleTaskPress(task) };
    
    return (
      <CardWrapper 
        key={task.id} 
        {...cardProps}
        style={styles.taskCardTouchable}
      >
        <Card style={[
          styles.taskCard,
          isOverdue && styles.overdueCard,
          isDueSoon && styles.dueSoonCard,
          { overflow: 'visible' }
        ]}>
          <Card.Content style={{ overflow: 'visible' }}>
            {/* Header Row */}
            <View style={[styles.taskHeader, { overflow: 'visible' }]}>
              <View style={[styles.taskTitleRow, { overflow: 'visible' }]}>
      <IconButton
        icon={getStatusIcon(task.status)}
        size={24}
        iconColor={getTaskStatusColor(task.status as 'not_started' | 'in_progress' | 'completed')}
        style={styles.statusIcon}
      />
                <View style={[styles.titleContainer, { overflow: 'visible' }]}>
                  <Title style={styles.taskTitle} numberOfLines={2} ellipsizeMode="tail">
                    {task.title}
                  </Title>
                  <View style={[styles.taskMeta, { overflow: 'visible' }]}>
                    <Chip 
                      style={[styles.statusChip, styles.taskMetaChip, { backgroundColor: getTaskStatusColor(task.status as 'not_started' | 'in_progress' | 'completed') }]}
                      textStyle={styles.statusChipText}
                    >
                      {task.status.replace('_', ' ').toUpperCase()}
                    </Chip>
                  </View>
                </View>
              </View>
            </View>

            {/* Description */}
            <Paragraph style={styles.taskDescription} numberOfLines={3} ellipsizeMode="tail">
              {task.subTask}
            </Paragraph>
            <Paragraph style={styles.tagalogLabel} numberOfLines={1}>
              {task.tagalogLabel}
            </Paragraph>

            {/* Due Date Warning - Only show for in_progress or overdue tasks, not for completed */}
            {!isCompleted && (isOverdue || (isInProgress && daysUntilDue >= 0)) && (
              <View style={[
                styles.dueDateAlert,
                { backgroundColor: isOverdue ? constructionColors.urgent + '20' : constructionColors.warning + '20', overflow: 'visible' }
              ]}>
                <IconButton 
                  icon={isOverdue ? 'alert-circle' : 'clock'} 
                  size={16} 
                  iconColor={isOverdue ? constructionColors.urgent : constructionColors.warning}
                />
                <Paragraph 
                  style={[
                    styles.dueDateText,
                    { color: isOverdue ? constructionColors.urgent : constructionColors.warning }
                  ]}
                  numberOfLines={1}
                >
                  {isOverdue 
                    ? `Overdue ${Math.abs(daysUntilDue)}d`
                    : daysUntilDue === 0
                    ? 'Due today'
                    : daysUntilDue === 1
                    ? 'Due in 1 day'
                    : `Due in ${daysUntilDue} days`
                  }
                </Paragraph>
              </View>
            )}

            {/* Photo Status */}
            {(task as any).lastPhoto && (
              <View style={styles.photoStatus}>
                <View style={styles.photoInfo}>
                  <IconButton icon="camera" size={16} iconColor="#666" />
                  <Paragraph style={styles.photoText} numberOfLines={1}>
                    {new Date((task as any).lastPhoto.uploadedAt).toLocaleDateString()}
                  </Paragraph>
                </View>
                
                {verificationStatus && (
                  <View style={styles.verificationStatus}>
                    <IconButton 
                      icon={verificationStatus.icon} 
                      size={16} 
                      iconColor={verificationStatus.color}
                    />
                    <Paragraph 
                      style={[styles.verificationText, { color: verificationStatus.color }]}
                      numberOfLines={1}
                    >
                      {verificationStatus.text}
                    </Paragraph>
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.taskActions}>
              <View style={styles.actionInfo}>
                <Paragraph style={styles.dueDate}>
                  Due: {new Date(task.planned_end_date).toLocaleDateString()}
                </Paragraph>
                <Paragraph style={styles.lastUpdate}>
                  Updated: {new Date(task.updatedAt).toLocaleDateString()}
                </Paragraph>
              </View>
              
              {/* Action buttons removed per user request */}
            </View>
          </Card.Content>
        </Card>
      </CardWrapper>
    );
  };

  // Task statistics
  const taskStats = {
    total: filteredTasks.length,
    completed: filteredTasks.filter(t => t.status === 'completed').length,
    inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
    notStarted: filteredTasks.filter(t => t.status === 'not_started').length,
    overdue: filteredTasks.filter(t => getDaysUntilDue(t.planned_end_date) < 0).length,
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.screenTitle}>My Tasks</Text>
        </View>
        <IconButton
          icon="refresh"
          size={24}
          iconColor={theme.colors.primary}
          onPress={onRefresh}
          disabled={refreshing}
        />
      </View>

      {/* Search Bar and History Button */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search my tasks..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={theme.colors.onSurfaceVariant}
          inputStyle={{ color: theme.colors.text }}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
        <Button
          mode="contained"
          icon="history"
          onPress={() => {
            setShowHistoryModal(true);
            loadTaskPhotoHistory();
          }}
          style={styles.historyButton}
          contentStyle={styles.historyButtonContent}
          labelStyle={styles.historyButtonLabel}
        >
          History
        </Button>
      </View>

      {/* Task Statistics */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Paragraph style={styles.statNumber}>{taskStats.total}</Paragraph>
              <Paragraph style={styles.statLabel}>Total</Paragraph>
            </View>
            <View style={styles.statItem}>
              <Paragraph style={[styles.statNumber, { color: constructionColors.complete }]}>
                {taskStats.completed}
              </Paragraph>
              <Paragraph style={styles.statLabel}>Completed</Paragraph>
            </View>
            <View style={styles.statItem}>
              <Paragraph style={[styles.statNumber, { color: constructionColors.inProgress }]}>
                {taskStats.inProgress}
              </Paragraph>
              <Paragraph style={styles.statLabel}>In Progress</Paragraph>
            </View>
            <View style={styles.statItem}>
              <Paragraph style={[styles.statNumber, { color: constructionColors.notStarted }]}>
                {taskStats.notStarted}
              </Paragraph>
              <Paragraph style={styles.statLabel}>Not Started</Paragraph>
            </View>
            {taskStats.overdue > 0 && (
              <View style={styles.statItem}>
                <Paragraph style={[styles.statNumber, { color: constructionColors.urgent }]}>
                  {taskStats.overdue}
                </Paragraph>
                <Paragraph style={styles.statLabel}>Overdue</Paragraph>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Tasks List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Paragraph style={styles.loadingText}>Loading your tasks...</Paragraph>
        </View>
      ) : (
        <ScrollView 
          style={styles.tasksList} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredTasks.map(renderTaskCard)}
          
          {filteredTasks.length === 0 && (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <IconButton icon="clipboard-check" size={40} iconColor="#ccc" />
                <Title style={styles.emptyTitle}>No tasks found</Title>
                <Paragraph style={styles.emptyText}>
                  {searchQuery 
                    ? 'No tasks match your search criteria'
                    : 'You have no assigned tasks at the moment'
                  }
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
      )}

      {/* Task Upload History Modal */}
      <Portal>
        <Modal
          visible={showHistoryModal}
          onDismiss={() => {
            setShowHistoryModal(false);
          }}
          contentContainerStyle={styles.historyModalContainer}
        >
          <Surface style={styles.historyModalSurface}>
            <View style={styles.historyModalHeader}>
              <Title style={styles.historyModalTitle}>Task Upload History</Title>
              <IconButton
                icon="close"
                size={24}
                iconColor={theme.colors.text}
                onPress={() => {
                  setShowHistoryModal(false);
                }}
              />
            </View>
            
            {loadingHistory ? (
              <View style={styles.historyLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Paragraph style={styles.historyLoadingText}>Loading history...</Paragraph>
              </View>
            ) : taskPhotos.length === 0 ? (
              <View style={styles.historyEmptyContainer}>
                <Paragraph style={styles.historyEmptyText}>No uploads found</Paragraph>
              </View>
            ) : (
              <ScrollView style={styles.historyContent}>
                {taskPhotos.map((photo) => (
                  <List.Item
                    key={photo.id}
                    title={photo.taskTitle || 'Unknown Task'}
                    description={`Uploaded: ${photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleDateString() : 'N/A'}`}
                    left={() => (
                      <List.Icon 
                        icon="camera"
                        color={getStatusColor(photo.verificationStatus)}
                      />
                    )}
                    right={() => (
                      <Chip 
                        style={{
                          ...styles.historyStatusChip,
                          backgroundColor: getStatusColor(photo.verificationStatus),
                        }}
                        textStyle={styles.historyStatusChipText}
                      >
                        {photo.verificationStatus.toUpperCase()}
                      </Chip>
                    )}
                    style={styles.historyItem}
                    titleStyle={{ color: theme.colors.text }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  />
                ))}
              </ScrollView>
            )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  historyButton: {
    backgroundColor: theme.colors.primary,
  },
  historyButtonContent: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  historyButtonLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  statsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    elevation: 2,
    borderRadius: theme.roundness,
    backgroundColor: '#1E1E1E',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  tasksList: {
    flex: 1,
  },
  taskCardTouchable: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  taskCard: {
    elevation: 2,
    borderRadius: theme.roundness,
    backgroundColor: '#1E1E1E',
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: constructionColors.urgent,
  },
  dueSoonCard: {
    borderLeftWidth: 4,
    borderLeftColor: constructionColors.warning,
  },
  taskHeader: {
    marginBottom: spacing.sm,
    overflow: 'visible',
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusIcon: {
    margin: 0,
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  statusChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    paddingVertical: 2,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -spacing.xs,
    overflow: 'visible',
  },
  taskMetaChip: {
    marginTop: spacing.xs,
    marginRight: spacing.xs,
  },
  statusChip: {
    minHeight: 30,
    paddingVertical: 4,
    paddingHorizontal: 8,
    overflow: 'visible',
  },
  taskDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  tagalogLabel: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  dueDateAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: theme.roundness,
    marginBottom: spacing.sm,
  },
  dueDateText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginLeft: spacing.sm,
    lineHeight: 20,
    paddingVertical: 2,
  },
  photoStatus: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: theme.roundness,
    marginBottom: spacing.sm,
  },
  photoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  photoText: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
    marginLeft: spacing.sm,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  actionInfo: {
    flex: 1,
  },
  dueDate: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
    fontWeight: '500',
  },
  lastUpdate: {
    fontSize: fontSizes.xs,
    color: theme.colors.placeholder,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
  },
  actionButtonWrapper: {
    marginHorizontal: spacing.xs,
  },
  actionButton: {
    minWidth: 80,
  },
  actionButtonContent: {
    paddingVertical: spacing.xs,
  },
  emptyCard: {
    margin: spacing.md,
    elevation: 1,
    backgroundColor: '#1E1E1E',
  },
  emptyContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    color: theme.colors.placeholder,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  historyModalContainer: {
    padding: spacing.xs,
    justifyContent: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  historyModalSurface: {
    backgroundColor: '#000000',
    borderRadius: theme.roundness,
    padding: spacing.lg,
    maxHeight: '90%',
    width: '100%',
    maxWidth: '100%',
    marginHorizontal: spacing.xs,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyModalTitle: {
    color: theme.colors.text,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  historyContent: {
    maxHeight: 500,
    width: '100%',
  },
  historyItem: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.lg,
    paddingLeft: spacing.xs,
    backgroundColor: 'transparent',
  },
  historyStatusChip: {
    height: 28,
    paddingHorizontal: spacing.xs,
    minWidth: 70,
    maxWidth: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyStatusChipText: {
    color: 'white',
    fontSize: 7,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.1,
    lineHeight: 9,
  },
  historyLoadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  historyLoadingText: {
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  historyEmptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  historyEmptyText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: fontSizes.sm,
  },
});
