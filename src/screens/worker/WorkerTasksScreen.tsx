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
  Text
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../../firebaseConfig';

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

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
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

  const handleTaskPress = (task: Task) => {
    // @ts-ignore - Navigation typing would be properly configured in production
    navigation.navigate('WorkerTaskDetail', { taskId: task.id });
  };

  const renderTaskCard = (task: FirebaseTask) => {
    const verificationStatus = getVerificationStatus(task);
    const daysUntilDue = getDaysUntilDue(task.planned_end_date);
    const isOverdue = daysUntilDue < 0;
    const isDueSoon = daysUntilDue <= 2 && daysUntilDue >= 0;
    
    return (
      <TouchableOpacity 
        key={task.id} 
        onPress={() => handleTaskPress(task)}
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
                  iconColor={getStatusColor(task.status)}
                  style={styles.statusIcon}
                />
                <View style={[styles.titleContainer, { overflow: 'visible' }]}>
                  <Title style={styles.taskTitle} numberOfLines={2} ellipsizeMode="tail">
                    {task.title}
                  </Title>
                  <View style={[styles.taskMeta, { overflow: 'visible' }]}>
                    <Chip 
                      style={[styles.statusChip, styles.taskMetaChip, { backgroundColor: getStatusColor(task.status) }]}
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

            {/* Due Date Warning */}
            {(isOverdue || isDueSoon) && (
              <View style={[
                styles.dueDateAlert,
                { backgroundColor: isOverdue ? constructionColors.urgent + '20' : constructionColors.warning + '20', overflow: 'visible' }
              ]}>
                <IconButton 
                  icon={isOverdue ? 'alert-circle' : 'clock-alert'} 
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
                    : `Due ${daysUntilDue}d`
                  }
                </Paragraph>
              </View>
            )}

            {/* Photo Status */}
            {task.lastPhoto && (
              <View style={styles.photoStatus}>
                <View style={styles.photoInfo}>
                  <IconButton icon="camera" size={16} iconColor="#666" />
                  <Paragraph style={styles.photoText} numberOfLines={1}>
                    {new Date(task.lastPhoto.uploadedAt).toLocaleDateString()}
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
      </TouchableOpacity>
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

      {/* Search Bar */}
      <Searchbar
        placeholder="Search my tasks..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        iconColor={theme.colors.onSurfaceVariant}
        inputStyle={{ color: theme.colors.text }}
        placeholderTextColor={theme.colors.onSurfaceVariant}
      />

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
  searchBar: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  statsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    elevation: 2,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.surface,
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
});
