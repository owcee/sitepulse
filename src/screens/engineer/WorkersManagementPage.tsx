import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  List, 
  Divider, 
  Chip, 
  ActivityIndicator,
  Avatar,
  IconButton,
  Portal,
  Modal,
  Surface,
  Checkbox
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import { 
  getProjectWorkers, 
  getPendingInvitations,
  getAvailableWorkers, 
  assignWorkerToProject, 
  sendProjectAssignmentNotification,
  updateWorkerAssignedTasks
} from '../../services/firebaseService';
import { getProjectTasks, updateTask, Task } from '../../services/taskService';

export default function WorkersManagementPage() {
  const navigation = useNavigation();
  const { projectId } = useProjectData();
  
  // Firebase-based state
  const [projectWorkers, setProjectWorkers] = useState<any[]>([]); // Accepted workers
  const [pendingWorkers, setPendingWorkers] = useState<any[]>([]); // Workers with pending invitations
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningWorkers, setAssigningWorkers] = useState(false);
  
  // Modal states
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  
  // Task assignment modal states
  const [taskAssignModalVisible, setTaskAssignModalVisible] = useState(false);
  const [selectedWorkerForTask, setSelectedWorkerForTask] = useState<any>(null);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [assigningToTasks, setAssigningToTasks] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  
  // Use project ID from context
  const currentProjectId = projectId;

  useEffect(() => {
    if (currentProjectId) {
      loadWorkersData();
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (currentProjectId) {
      loadProjectTasks();
    }
  }, [currentProjectId]);

  const loadWorkersData = async () => {
    try {
      setLoading(true);
      const [currentWorkers, availableWorkersList, pendingInvites] = await Promise.all([
        getProjectWorkers(currentProjectId),
        getAvailableWorkers(),
        getPendingInvitations(currentProjectId)
      ]);
      
      setProjectWorkers(currentWorkers);
      setAvailableWorkers(availableWorkersList);
      setPendingWorkers(pendingInvites);
    } catch (error: any) {
      console.error('Error loading workers:', error);
      Alert.alert('Error', `Failed to load workers data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectTasks = async () => {
    try {
      const tasks = await getProjectTasks(currentProjectId);
      setProjectTasks(tasks);
      return tasks;
    } catch (error: any) {
      console.error('Error loading project tasks:', error);
      return [];
    }
  };

  const getWorkerAssignedCount = (workerId: string) => {
    return projectTasks.filter(task => task.assigned_worker_ids.includes(workerId)).length;
  };

  // Get all workers (including those with projects) for assignment
  const getAllWorkersForAssignment = async () => {
    try {
      const workersRef = collection(db, 'worker_accounts');
      const snapshot = await getDocs(workersRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all workers:', error);
      return [];
    }
  };

  const handleAssignWorkers = async () => {
    if (selectedWorkers.size === 0) {
      Alert.alert('No Selection', 'Please select workers to assign.');
      return;
    }

    // Workers can now accept multiple projects, so no warning needed
    proceedWithAssignment();
  };

  const proceedWithAssignment = async () => {
    setAssigningWorkers(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const workerId of selectedWorkers) {
        try {
          // Create assignment
          const assignment = await assignWorkerToProject(workerId, currentProjectId);
          
          // Send notification
          const projectData = { id: currentProjectId, name: 'Downtown Office Complex' };
          await sendProjectAssignmentNotification(workerId, projectData, (assignment as any).id);
          
          successCount++;
        } catch (error) {
          console.error(`Failed to assign worker ${workerId}:`, error);
          errorCount++;
        }
      }

      let message = `${successCount} worker(s) have been sent assignment requests.`;
      if (errorCount > 0) {
        message += ` ${errorCount} assignment(s) failed.`;
      }

      Alert.alert('Assignment Complete', message);
      
      // Refresh data and close modal
      await loadWorkersData();
      setAssignModalVisible(false);
      setSelectedWorkers(new Set());
      
    } catch (error: any) {
      Alert.alert('Error', `Failed to assign workers: ${error.message}`);
    } finally {
      setAssigningWorkers(false);
    }
  };

  const toggleWorkerSelection = (workerId: string) => {
    const newSelected = new Set(selectedWorkers);
    if (newSelected.has(workerId)) {
      newSelected.delete(workerId);
    } else {
      newSelected.add(workerId);
    }
    setSelectedWorkers(newSelected);
  };

  const handleOpenTaskAssignment = async (worker: any) => {
    setSelectedWorkerForTask(worker);
    setTaskAssignModalVisible(true);
    setLoadingTasks(true);
    
    try {
      const tasks = await loadProjectTasks();
      setAvailableTasks(tasks);
      
      // Pre-select tasks that already have this worker assigned
      const workerTaskIds = new Set(
        tasks
          .filter(task => task.assigned_worker_ids.includes(worker.id))
          .map(task => task.id)
      );
      setSelectedTasks(workerTaskIds);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleAssignToTasks = async () => {
    if (!selectedWorkerForTask) return;
    
    setAssigningToTasks(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const task of availableTasks) {
        const isCurrentlyAssigned = task.assigned_worker_ids.includes(selectedWorkerForTask.id);
        const shouldBeAssigned = selectedTasks.has(task.id);

        // If status changed, update the task
        if (isCurrentlyAssigned !== shouldBeAssigned) {
          try {
            let updatedWorkerIds = [...task.assigned_worker_ids];
            let updatedWorkerNames = [...task.assigned_worker_names];

            if (shouldBeAssigned) {
              // Add worker
              updatedWorkerIds.push(selectedWorkerForTask.id);
              updatedWorkerNames.push(selectedWorkerForTask.name);
            } else {
              // Remove worker
              const workerIndex = updatedWorkerIds.indexOf(selectedWorkerForTask.id);
              if (workerIndex > -1) {
                updatedWorkerIds.splice(workerIndex, 1);
                updatedWorkerNames.splice(workerIndex, 1);
              }
            }

            await updateTask(task.id, {
              assigned_worker_ids: updatedWorkerIds,
              assigned_worker_names: updatedWorkerNames
            });

            successCount++;
          } catch (error) {
            console.error(`Failed to update task ${task.id}:`, error);
            errorCount++;
          }
        }
      }

      Alert.alert(
        'Success',
        `Worker assignment updated for ${successCount} task(s).${errorCount > 0 ? ` ${errorCount} failed.` : ''}`
      );
      
      const refreshedTasks = await loadProjectTasks();
      const assignedTaskIds = refreshedTasks
        .filter(task => task.assigned_worker_ids.includes(selectedWorkerForTask.id))
        .map(task => task.id);

      await updateWorkerAssignedTasks(selectedWorkerForTask.id, assignedTaskIds);

      setTaskAssignModalVisible(false);
      setSelectedWorkerForTask(null);
      setSelectedTasks(new Set());
      
    } catch (error: any) {
      Alert.alert('Error', `Failed to assign worker to tasks: ${error.message}`);
    } finally {
      setAssigningToTasks(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading workers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            iconColor={theme.colors.primary}
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>Workers Management</Text>
            <Text style={styles.subtitle}>Manage your project team</Text>
          </View>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>{projectWorkers.length}</Text>
            <Text style={styles.summaryLabel}>Joined</Text>
          </Card.Content>
        </Card>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>{pendingWorkers.length}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </Card.Content>
        </Card>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>{availableWorkers.length}</Text>
            <Text style={styles.summaryLabel}>Available</Text>
          </Card.Content>
        </Card>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Current Project Workers */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Project Workers</Text>
              <Chip style={styles.countChip}>
                {projectWorkers.length}
              </Chip>
            </View>

            {projectWorkers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={theme.colors.onSurfaceDisabled} />
                <Text style={styles.emptyText}>No workers joined this project yet.</Text>
                <Text style={styles.emptySubtext}>Use the button below to invite workers.</Text>
              </View>
            ) : (
              projectWorkers.map((worker, index) => {
                const assignedCount = getWorkerAssignedCount(worker.id);
                return (
                  <View key={worker.id}>
                    <Surface style={styles.workerCardSurface}>
                      <List.Item
                        title={worker.name}
                        description={`Email: ${worker.email}`}
                        left={(props) => (
                          <Avatar.Image
                            {...props}
                            source={{ uri: worker.profileImage || 'https://via.placeholder.com/40' }}
                            size={48}
                            style={styles.workerAvatar}
                          />
                        )}
                        style={styles.listItemContent}
                      />
                      <Text style={styles.assignedCountText}>
                        Assigned to {assignedCount} task{assignedCount === 1 ? '' : 's'}
                      </Text>
                      <View style={styles.workerActions}>
                        <Chip 
                          style={[styles.statusChip, { backgroundColor: constructionColors.complete }]}
                          textStyle={styles.statusText}
                        >
                          Joined
                        </Chip>
                        <Button
                          mode="contained"
                          onPress={() => handleOpenTaskAssignment(worker)}
                          style={styles.assignTaskButton}
                          labelStyle={styles.assignTaskButtonLabel}
                        >
                          Assign Task
                        </Button>
                      </View>
                    </Surface>
                    {index < projectWorkers.length - 1 && <Divider />}
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        {/* Pending Invitations */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Invitations</Text>
              <Chip style={styles.countChip}>
                {pendingWorkers.length}
              </Chip>
            </View>

            {pendingWorkers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color={theme.colors.onSurfaceDisabled} />
                <Text style={styles.emptyText}>No pending invitations.</Text>
                <Text style={styles.emptySubtext}>Workers you invite will appear here until they accept.</Text>
              </View>
            ) : (
              pendingWorkers.map((worker, index) => (
                <View key={worker.id}>
                  <List.Item
                    title={worker.name}
                    description={`Email: ${worker.email} • Waiting for response`}
                    left={(props) => (
                      <Avatar.Image
                        {...props}
                        source={{ uri: worker.profileImage || 'https://via.placeholder.com/40' }}
                        size={40}
                        style={styles.workerAvatar}
                      />
                    )}
                    right={(props) => (
                      <Chip 
                        {...props}
                        style={[styles.statusChip, { backgroundColor: '#FF9800' }]}
                        textStyle={styles.statusText}
                      >
                        Pending
                      </Chip>
                    )}
                  />
                  {index < pendingWorkers.length - 1 && <Divider />}
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Available Workers */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Workers</Text>
              <Button
                mode="contained"
                onPress={() => setAssignModalVisible(true)}
                disabled={availableWorkers.length === 0}
                style={styles.assignButton}
                icon="account-plus"
              >
                Assign Workers
              </Button>
            </View>

            {availableWorkers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.onSurfaceDisabled} />
                <Text style={styles.emptyText}>All workers are currently assigned to projects.</Text>
                <Text style={styles.emptySubtext}>New workers will appear here when they sign up.</Text>
              </View>
            ) : (
              availableWorkers.map((worker, index) => (
                <View key={worker.id}>
                  <List.Item
                    title={worker.name}
                    description={`Email: ${worker.email} • Available for assignment`}
                    left={(props) => (
                      <Avatar.Image
                        {...props}
                        source={{ uri: worker.profileImage || 'https://via.placeholder.com/40' }}
                        size={40}
                        style={styles.workerAvatar}
                      />
                    )}
                    right={(props) => (
                      <Chip 
                        {...props}
                        style={[styles.statusChip, { backgroundColor: constructionColors.inProgress }]}
                        textStyle={styles.statusText}
                      >
                        Available
                      </Chip>
                    )}
                  />
                  {index < availableWorkers.length - 1 && <Divider />}
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Worker Assignment Modal */}
      <Portal>
        <Modal
          visible={assignModalVisible}
          onDismiss={() => setAssignModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Workers to Project</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setAssignModalVisible(false)}
              />
            </View>

            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.modalInstructions}>
                Select workers to invite to your project. They will receive notifications to accept or reject the assignment.
              </Text>
              
              {availableWorkers.map((worker, index) => (
                <View key={worker.id}>
                  <List.Item
                    title={worker.name}
                    description={worker.email}
                    left={(props) => (
                      <Avatar.Image
                        {...props}
                        source={{ uri: worker.profileImage || 'https://via.placeholder.com/40' }}
                        size={40}
                      />
                    )}
                    right={(props) => (
                      <Checkbox
                        {...props}
                        status={selectedWorkers.has(worker.id) ? 'checked' : 'unchecked'}
                        onPress={() => toggleWorkerSelection(worker.id)}
                      />
                    )}
                    onPress={() => toggleWorkerSelection(worker.id)}
                    style={[
                      styles.workerItem,
                      selectedWorkers.has(worker.id) && styles.selectedWorkerItem
                    ]}
                  />
                  {index < availableWorkers.length - 1 && <Divider />}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                onPress={() => setAssignModalVisible(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAssignWorkers}
                loading={assigningWorkers}
                disabled={selectedWorkers.size === 0 || assigningWorkers}
                style={styles.assignActionButton}
              >
                {assigningWorkers ? 'Assigning...' : `Assign ${selectedWorkers.size} Worker(s)`}
              </Button>
            </View>
          </Surface>
        </Modal>

        {/* Task Assignment Modal */}
        <Modal
          visible={taskAssignModalVisible}
          onDismiss={() => setTaskAssignModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign {selectedWorkerForTask?.name} to Tasks
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setTaskAssignModalVisible(false)}
              />
            </View>

            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.modalInstructions}>
                Select or deselect tasks to assign/unassign this worker. Workers can be assigned to multiple tasks.
              </Text>
              
              {loadingTasks ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading tasks...</Text>
                </View>
              ) : availableTasks.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="clipboard-outline" size={48} color={theme.colors.onSurfaceDisabled} />
                  <Text style={styles.emptyText}>No tasks available in this project.</Text>
                  <Text style={styles.emptySubtext}>Create tasks first from the Tasks screen.</Text>
                </View>
              ) : (
                availableTasks.map((task, index) => (
                  <View key={task.id}>
                    <List.Item
                      title={task.title}
                      description={`${task.tagalogLabel} • Status: ${task.status.replace('_', ' ')}`}
                      left={(props) => (
                        <View style={styles.taskIconContainer}>
                          <Ionicons 
                            name="hammer" 
                            size={24} 
                            color={theme.colors.primary} 
                          />
                        </View>
                      )}
                      right={(props) => (
                        <Checkbox
                          {...props}
                          status={selectedTasks.has(task.id) ? 'checked' : 'unchecked'}
                          onPress={() => toggleTaskSelection(task.id)}
                        />
                      )}
                      onPress={() => toggleTaskSelection(task.id)}
                      style={[
                        styles.taskItem,
                        selectedTasks.has(task.id) && styles.selectedTaskItem
                      ]}
                    />
                    {index < availableTasks.length - 1 && <Divider />}
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                onPress={() => setTaskAssignModalVisible(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAssignToTasks}
                loading={assigningToTasks}
                disabled={assigningToTasks}
                style={styles.assignActionButton}
              >
                {assigningToTasks ? 'Updating...' : 'Update Assignment'}
              </Button>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerText: {
    marginLeft: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: spacing.xs / 2,
    backgroundColor: 'white',
    elevation: 2,
  },
  summaryContent: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryNumber: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  sectionCard: {
    marginBottom: spacing.lg,
    backgroundColor: 'white',
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  countChip: {
    backgroundColor: theme.colors.primaryContainer,
  },
  assignButton: {
    backgroundColor: theme.colors.primary,
  },
  workerAvatar: {
    marginRight: spacing.md,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: fontSizes.xs,
  },
  workerCardSurface: {
    padding: spacing.sm,
    borderRadius: theme.roundness,
    marginBottom: spacing.sm,
    elevation: 1,
  },
  listItemContent: {
    flex: 1,
  },
  assignedCountText: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    marginLeft: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceDisabled,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalSurface: {
    backgroundColor: 'white',
    borderRadius: theme.roundness,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  modalContent: {
    maxHeight: 400,
  },
  modalScrollContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  modalInstructions: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  workerItem: {
    paddingVertical: spacing.sm,
  },
  selectedWorkerItem: {
    backgroundColor: theme.colors.primaryContainer + '20',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  assignActionButton: {
    marginLeft: spacing.sm,
    flex: 2,
    backgroundColor: theme.colors.primary,
  },
  workerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  assignTaskButton: {
    minWidth: 120,
    height: 38,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness,
  },
  assignTaskButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  taskIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    marginLeft: spacing.sm,
  },
  taskItem: {
    paddingVertical: spacing.sm,
  },
  selectedTaskItem: {
    backgroundColor: theme.colors.primaryContainer + '20',
  },
});
