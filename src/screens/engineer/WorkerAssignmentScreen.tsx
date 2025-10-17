import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  List,
  Checkbox,
  Avatar,
  Chip,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { 
  getAvailableWorkers, 
  assignWorkerToProject, 
  sendProjectAssignmentNotification 
} from '../../services/firebaseService';

interface Worker {
  id: string;
  name: string;
  email: string;
  role: string;
  profileImage?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  managerId: string;
}

interface WorkerAssignmentScreenProps {
  route: {
    params: {
      project: Project;
    };
  };
  navigation: any;
}

export default function WorkerAssignmentScreen({ route, navigation }: WorkerAssignmentScreenProps) {
  const { project } = route.params;
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadAvailableWorkers();
  }, []);

  const loadAvailableWorkers = async () => {
    try {
      setLoading(true);
      const workers = await getAvailableWorkers();
      setAvailableWorkers(workers);
    } catch (error: any) {
      Alert.alert('Error', `Failed to load available workers: ${error.message}`);
    } finally {
      setLoading(false);
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

  const handleAssignWorkers = async () => {
    if (selectedWorkers.size === 0) {
      Alert.alert('No Selection', 'Please select at least one worker to assign.');
      return;
    }

    setAssigning(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Assign each selected worker
      for (const workerId of selectedWorkers) {
        try {
          // Create assignment record
          const assignment = await assignWorkerToProject(workerId, project.id);
          
          // Send notification to worker
          await sendProjectAssignmentNotification(workerId, project, assignment.id);
          
          successCount++;
        } catch (error) {
          console.error(`Failed to assign worker ${workerId}:`, error);
          errorCount++;
        }
      }

      // Show results
      let message = '';
      if (successCount > 0) {
        message += `${successCount} worker(s) have been sent assignment requests.`;
      }
      if (errorCount > 0) {
        message += ` ${errorCount} assignment(s) failed.`;
      }

      Alert.alert(
        'Assignment Complete',
        message + ' Workers will receive notifications to accept or reject the assignment.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error: any) {
      Alert.alert('Error', `Failed to assign workers: ${error.message}`);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Paragraph style={styles.loadingText}>Loading available workers...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Title style={styles.screenTitle}>Assign Workers</Title>
          <Paragraph style={styles.subtitle}>
            Select workers to invite to "{project.name}"
          </Paragraph>
        </View>

        {/* Project Info */}
        <Card style={styles.projectCard}>
          <Card.Content>
            <Title style={styles.projectTitle}>{project.name}</Title>
            <Paragraph style={styles.projectDescription}>
              {project.description || 'No description provided'}
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Available Workers */}
        <Card style={styles.workersCard}>
          <Card.Content>
            <View style={styles.workersHeader}>
              <Title style={styles.cardTitle}>Available Workers</Title>
              <Chip 
                style={styles.countChip}
                textStyle={styles.countChipText}
              >
                {availableWorkers.length} available
              </Chip>
            </View>

            {availableWorkers.length === 0 ? (
              <View style={styles.emptyState}>
                <Paragraph style={styles.emptyText}>
                  No workers available for assignment. All workers may already be assigned to projects.
                </Paragraph>
                <Button
                  mode="outlined"
                  onPress={loadAvailableWorkers}
                  style={styles.refreshButton}
                >
                  Refresh List
                </Button>
              </View>
            ) : (
              availableWorkers.map((worker, index) => (
                <View key={worker.id}>
                  <List.Item
                    title={worker.name}
                    description={worker.email}
                    left={(props) => (
                      <Avatar.Image
                        {...props}
                        source={{ uri: worker.profileImage || 'https://via.placeholder.com/40' }}
                        size={40}
                        style={styles.workerAvatar}
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
              ))
            )}
          </Card.Content>
        </Card>

        {/* Selection Summary */}
        {selectedWorkers.size > 0 && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Title style={styles.summaryTitle}>
                {selectedWorkers.size} Worker(s) Selected
              </Title>
              <Paragraph style={styles.summaryText}>
                These workers will receive notifications to accept or reject the project assignment.
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
            disabled={assigning}
          >
            Cancel
          </Button>
          
          <Button
            mode="contained"
            onPress={handleAssignWorkers}
            style={styles.assignButton}
            loading={assigning}
            disabled={assigning || selectedWorkers.size === 0}
            icon="account-plus"
          >
            {assigning ? 'Assigning...' : `Assign ${selectedWorkers.size} Worker(s)`}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
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
    marginBottom: spacing.lg,
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
    lineHeight: 22,
  },
  projectCard: {
    marginBottom: spacing.md,
    elevation: 2,
    backgroundColor: constructionColors.complete + '10',
    borderLeftWidth: 4,
    borderLeftColor: constructionColors.complete,
  },
  projectTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  projectDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  workersCard: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  workersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  countChip: {
    backgroundColor: theme.colors.primaryContainer,
  },
  countChipText: {
    color: theme.colors.onPrimaryContainer,
    fontSize: fontSizes.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  refreshButton: {
    borderColor: theme.colors.outline,
  },
  workerItem: {
    paddingVertical: spacing.sm,
  },
  selectedWorkerItem: {
    backgroundColor: theme.colors.primaryContainer + '20',
  },
  workerAvatar: {
    marginLeft: spacing.xs,
  },
  summaryCard: {
    marginBottom: spacing.md,
    elevation: 2,
    backgroundColor: constructionColors.inProgress + '10',
    borderLeftWidth: 4,
    borderLeftColor: constructionColors.inProgress,
  },
  summaryTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderColor: theme.colors.outline,
  },
  assignButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
  },
});
