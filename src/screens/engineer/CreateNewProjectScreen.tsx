import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  TextInput, 
  Button, 
  Surface,
  Divider,
  Chip
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { createProject } from '../../services/firebaseService';

interface CreateNewProjectScreenProps {
  navigation?: any;
  onProjectCreated?: () => void;
}

export default function CreateNewProjectScreen({ navigation, onProjectCreated }: CreateNewProjectScreenProps = {}) {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('');
  const [clientName, setClientName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      Alert.alert('Missing Information', 'Please enter a project name.');
      return;
    }

    if (!budget.trim()) {
      Alert.alert('Missing Information', 'Please enter a project budget.');
      return;
    }

    if (!duration.trim()) {
      Alert.alert('Missing Information', 'Please enter project duration.');
      return;
    }

    setIsCreating(true);

    try {
      const projectData = {
        name: projectName.trim(),
        description: description.trim(),
        location: location.trim(),
        clientName: clientName.trim(),
        budget: parseFloat(budget) || 0,
        duration: parseInt(duration) || 0,
      };

      const createdProject = await createProject(projectData);
      
      // Refresh parent to update user state with new projectId
      if (onProjectCreated) {
        onProjectCreated();
      }
      
      Alert.alert(
        'Project Created!',
        `Project "${projectName}" has been created successfully. You'll now be redirected to your dashboard.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // The parent will automatically navigate to dashboard after refresh
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to create project: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Title style={styles.screenTitle}>Create New Project</Title>
          <Paragraph style={styles.subtitle}>
            Set up a new construction project with basic information
          </Paragraph>
        </View>

        {/* Project Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Project Information</Title>
            
            <TextInput
              label="Project Name *"
              value={projectName}
              onChangeText={setProjectName}
              style={styles.input}
              placeholder="Enter project name"
            />

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="Brief description of the project"
            />

            <TextInput
              label="Location"
              value={location}
              onChangeText={setLocation}
              style={styles.input}
              placeholder="Project site location"
            />

            <TextInput
              label="Client Name"
              value={clientName}
              onChangeText={setClientName}
              style={styles.input}
              placeholder="Client or company name"
            />
          </Card.Content>
        </Card>

        {/* Budget & Timeline */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Budget & Timeline</Title>
            
            <TextInput
              label="Total Budget *"
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
              style={styles.input}
              placeholder="Enter total budget"
              left={<TextInput.Icon icon="currency-usd" />}
            />

            <TextInput
              label="Duration (days) *"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              style={styles.input}
              placeholder="Estimated project duration"
              left={<TextInput.Icon icon="calendar" />}
            />

            <Surface style={styles.infoBox}>
              <Paragraph style={styles.infoText}>
                ℹ️ Timeline can be adjusted later from Project Tools. Budget includes materials, labor, and equipment costs.
              </Paragraph>
            </Surface>
          </Card.Content>
        </Card>

        {/* Quick Setup Options */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Quick Setup</Title>
            <Paragraph style={styles.subtitle}>
              After creating the project, you'll be able to:
            </Paragraph>
            
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Chip icon="account-group" style={styles.featureChip}>Add Workers</Chip>
              </View>
              <View style={styles.featureItem}>
                <Chip icon="package-variant" style={styles.featureChip}>Manage Materials</Chip>
              </View>
              <View style={styles.featureItem}>
                <Chip icon="hammer" style={styles.featureChip}>Add Equipment</Chip>
              </View>
              <View style={styles.featureItem}>
                <Chip icon="chart-line" style={styles.featureChip}>Track Progress</Chip>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => navigation?.goBack()}
            style={styles.cancelButton}
            disabled={isCreating}
          >
            Cancel
          </Button>
          
          <Button
            mode="contained"
            onPress={handleCreateProject}
            style={styles.createButton}
            loading={isCreating}
            disabled={isCreating}
            icon="plus"
          >
            {isCreating ? 'Creating...' : 'Create Project'}
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
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  infoBox: {
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.roundness,
    marginTop: spacing.sm,
  },
  infoText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  featureItem: {
    marginBottom: spacing.sm,
  },
  featureChip: {
    backgroundColor: theme.colors.primaryContainer,
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
  createButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
});


