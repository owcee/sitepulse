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

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { 
  getProjectWorkers, 
  getAvailableWorkers, 
  assignWorkerToProject, 
  sendProjectAssignmentNotification 
} from '../../services/firebaseService';

export default function WorkersManagementPage() {
  const navigation = useNavigation();
  
  // Firebase-based state
  const [projectWorkers, setProjectWorkers] = useState<any[]>([]);
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningWorkers, setAssigningWorkers] = useState(false);
  
  // Modal states
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  
  // Current project ID (this should come from props or context in real implementation)
  const currentProjectId = 'project-1'; // This would be dynamic

  useEffect(() => {
    loadWorkersData();
  }, []);

  const loadWorkersData = async () => {
    try {
      setLoading(true);
      const [currentWorkers, availableWorkersList] = await Promise.all([
        getProjectWorkers(currentProjectId),
        getAvailableWorkers()
      ]);
      
      setProjectWorkers(currentWorkers);
      setAvailableWorkers(availableWorkersList);
    } catch (error: any) {
      console.error('Error loading workers:', error);
      Alert.alert('Error', `Failed to load workers data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWorkers = async () => {
    if (selectedWorkers.size === 0) {
      Alert.alert('No Selection', 'Please select workers to assign.');
      return;
    }

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading workers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            iconColor={theme.colors.onSurface}
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
            <Text style={styles.summaryLabel}>Project Workers</Text>
          </Card.Content>
        </Card>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>{availableWorkers.length}</Text>
            <Text style={styles.summaryLabel}>Available Workers</Text>
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
                <Text style={styles.emptyText}>No workers assigned to this project yet.</Text>
                <Text style={styles.emptySubtext}>Use the button below to invite workers.</Text>
              </View>
            ) : (
              projectWorkers.map((worker, index) => (
                <View key={worker.id}>
                  <List.Item
                    title={worker.name}
                    description={`Email: ${worker.email} • Role: ${worker.role || 'Worker'}`}
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
                        style={[styles.statusChip, { backgroundColor: constructionColors.complete }]}
                        textStyle={styles.statusText}
                      >
                        Assigned
                      </Chip>
                    )}
                  />
                  {index < projectWorkers.length - 1 && <Divider />}
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

            <ScrollView style={styles.modalContent}>
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
    paddingVertical: spacing.md,
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
    color: theme.colors.onSurface,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
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
    marginLeft: spacing.xs,
  },
  statusChip: {
    marginRight: spacing.sm,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: fontSizes.xs,
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
    padding: spacing.md,
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
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  assignActionButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
  },
});
