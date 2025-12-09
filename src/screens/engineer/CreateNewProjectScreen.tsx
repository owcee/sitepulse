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
  Chip,
  IconButton,
  Portal,
  Dialog
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { createProject } from '../../services/firebaseService';

interface CreateNewProjectScreenProps {
  navigation?: any;
  onProjectCreated?: () => void;
  isFirstProject?: boolean; // Hide back/cancel buttons for first-time setup
}

export default function CreateNewProjectScreen({ navigation: propNavigation, onProjectCreated, isFirstProject = false }: CreateNewProjectScreenProps = {}) {
  let navigation: any = null;
  try {
    navigation = useNavigation();
  } catch (error) {
    // Navigation not available, use propNavigation or no-op
    navigation = propNavigation || { goBack: () => {}, canGoBack: () => false };
  }
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('');
  const [clientName, setClientName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    projectName: false,
    budget: false,
    duration: false
  });

  const handleCreateProject = async () => {
    const errors = {
      projectName: false,
      budget: false,
      duration: false
    };

    if (!projectName.trim()) {
      errors.projectName = true;
      setFieldErrors(errors);
      setErrorMessage('Please enter a project name.');
      setShowErrorDialog(true);
      return;
    }

    if (!budget.trim()) {
      errors.budget = true;
      setFieldErrors(errors);
      setErrorMessage('Please enter a project budget.');
      setShowErrorDialog(true);
      return;
    }

    if (!duration.trim()) {
      errors.duration = true;
      setFieldErrors(errors);
      setErrorMessage('Please enter project duration.');
      setShowErrorDialog(true);
      return;
    }

    setFieldErrors(errors);
    setIsCreating(true);

    try {
      // Convert months to days (approximately 30 days per month)
      const durationMonths = parseInt(duration) || 0;
      const durationDays = durationMonths * 30;
      
      const projectData = {
        name: projectName.trim(),
        description: description.trim(),
        location: location.trim(),
        clientName: clientName.trim(),
        budget: parseFloat(budget) || 0,
        duration: durationDays,
        durationMonths: durationMonths, // Store original months value too
      };

      const createdProject = await createProject(projectData);
      console.log('✅ Project created:', createdProject.id);
      
      // Show success dialog briefly, then redirect
      setShowSuccessDialog(true);
      
      // Refresh and redirect to the new project
      if (onProjectCreated) {
        console.log('⏳ Waiting for Firestore to propagate updates...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('🔄 Calling onProjectCreated to refresh and redirect...');
        await onProjectCreated();
        console.log('✅ Refresh complete, redirecting to new project...');
        
        // Close success dialog and navigate back to dashboard
        setShowSuccessDialog(false);
        
        // Navigate back to dashboard (the refresh will have loaded the new project)
        if (navigation && navigation.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        }
      } else {
        // If no onProjectCreated callback, just navigate back after a delay
        setTimeout(() => {
          setShowSuccessDialog(false);
          if (navigation && navigation.canGoBack && navigation.canGoBack()) {
            navigation.goBack();
          }
        }, 2000);
      }
    } catch (error: any) {
      setErrorMessage(`Failed to create project: ${error.message}`);
      setShowErrorDialog(true);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => {
                if (propNavigation?.goBack) {
                  propNavigation.goBack();
                } else if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              }}
              iconColor={theme.colors.primary}
            />
            <View style={styles.headerText}>
              <Title style={styles.screenTitle} numberOfLines={1}>Create New Project</Title>
              <Paragraph style={styles.subtitle} numberOfLines={2}>
                Set up a new construction project
              </Paragraph>
            </View>
          </View>
        </View>

        {/* Project Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Project Information</Title>
            
            <TextInput
              label="Project Name *"
              value={projectName}
              onChangeText={(text) => {
                setProjectName(text);
                if (text.trim()) {
                  setFieldErrors(prev => ({ ...prev, projectName: false }));
                }
              }}
              style={styles.input}
              placeholder="Enter project name"
              error={fieldErrors.projectName}
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
              label="Total Budget (₱) *"
              value={budget}
              onChangeText={(text) => {
                setBudget(text);
                if (text.trim()) {
                  setFieldErrors(prev => ({ ...prev, budget: false }));
                }
              }}
              keyboardType="numeric"
              style={styles.input}
              placeholder="e.g., 250000"
              error={fieldErrors.budget}
              left={<TextInput.Icon icon="cash" />}
            />

            <TextInput
              label="Duration (months) *"
              value={duration}
              onChangeText={(text) => {
                setDuration(text);
                if (text.trim()) {
                  setFieldErrors(prev => ({ ...prev, duration: false }));
                }
              }}
              keyboardType="numeric"
              style={styles.input}
              placeholder="Estimated project duration in months"
              left={<TextInput.Icon icon="calendar" />}
              error={fieldErrors.duration}
            />

            <Surface style={styles.infoBox}>
              <Paragraph style={styles.infoText} numberOfLines={4}>
                ℹ️ Timeline adjustable later. Budget includes all costs. Enter amount in Philippine Peso (₱).
              </Paragraph>
            </Surface>
          </Card.Content>
        </Card>

        {/* Quick Setup Options */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle} numberOfLines={1}>Quick Setup</Title>
            <Paragraph style={styles.subtitle} numberOfLines={2}>
              After creation, you can:
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
          {!isFirstProject && (
            <Button
              mode="outlined"
              onPress={() => navigation?.goBack()}
              style={styles.cancelButton}
              disabled={isCreating}
            >
              Cancel
            </Button>
          )}
          
          <Button
            mode="contained"
            onPress={handleCreateProject}
            style={[styles.createButton, isFirstProject && styles.createButtonFull]}
            loading={isCreating}
            disabled={isCreating}
            icon="plus"
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </Button>
        </View>
      </ScrollView>

      {/* Success Dialog - Dark Mode */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => setShowSuccessDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Project Created! 🎉</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogText}>
              Project "{projectName}" has been created successfully. Loading dashboard...
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => setShowSuccessDialog(false)}
              textColor={theme.colors.primary}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog - Dark Mode */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitleError}>Missing Information</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogText}>{errorMessage}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => setShowErrorDialog(false)}
              textColor={theme.colors.primary}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.xs,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.background,
  },
  infoBox: {
    padding: spacing.md,
    backgroundColor: theme.colors.background,
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
    marginTop: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  featureItem: {
    marginHorizontal: spacing.xs,
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
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
    borderColor: theme.colors.outline,
  },
  createButton: {
    flex: 1,
    marginLeft: spacing.sm,
    backgroundColor: theme.colors.primary,
  },
  createButtonFull: {
    marginLeft: 0,
  },
  dialog: {
    backgroundColor: '#1A1A1A',
    borderRadius: theme.roundness,
  },
  dialogTitle: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  dialogTitleError: {
    color: constructionColors.warning,
    fontWeight: 'bold',
  },
  dialogText: {
    color: theme.colors.text,
  },
});


