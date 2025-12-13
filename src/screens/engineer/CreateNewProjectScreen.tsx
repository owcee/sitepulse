import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
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
  Dialog,
  ProgressBar,
  ActivityIndicator
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { createProject } from '../../services/firebaseService';
import { uploadWithProgress } from '../../services/storageUploadHelperV2';

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
  const [clientName, setClientName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // File upload states
  const [excelFile, setExcelFile] = useState<{uri: string, name: string, size?: number} | null>(null);
  const [blueprintImage, setBlueprintImage] = useState<{uri: string, name: string} | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [uploadingBlueprint, setUploadingBlueprint] = useState(false);
  const [excelUploadProgress, setExcelUploadProgress] = useState(0);
  const [blueprintUploadProgress, setBlueprintUploadProgress] = useState(0);
  const [excelFileUrl, setExcelFileUrl] = useState<string>('');
  const [blueprintImageUrl, setBlueprintImageUrl] = useState<string>('');
  
  const [fieldErrors, setFieldErrors] = useState({
    projectName: false,
    excelFile: false,
    blueprintImage: false
  });

  const handlePickExcelFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setExcelFile({
          uri: file.uri,
          name: file.name || 'scope_of_work.xlsx',
          size: file.size
        });
        setFieldErrors(prev => ({ ...prev, excelFile: false }));
        
        // Upload file immediately
        await handleUploadExcelFile(file.uri, file.name || 'scope_of_work.xlsx');
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to pick Excel file: ${error.message}`);
    }
  };

  const handleUploadExcelFile = async (fileUri: string, fileName: string) => {
    // Store file info but don't upload yet - will upload after project creation
    // This way we can use the actual project ID in the storage path
    setExcelFileUrl(fileUri); // Store local URI temporarily
    console.log('✅ Excel file selected:', fileName);
  };

  const handlePickBlueprint = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setBlueprintImage({
          uri: asset.uri,
          name: asset.fileName || 'electrical_plan.jpg'
        });
        setFieldErrors(prev => ({ ...prev, blueprintImage: false }));
        
        // Upload image immediately
        await handleUploadBlueprint(asset.uri, asset.fileName || 'electrical_plan.jpg');
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to pick blueprint image: ${error.message}`);
    }
  };

  const handleUploadBlueprint = async (imageUri: string, fileName: string) => {
    // Store image info but don't upload yet - will upload after project creation
    // This way we can use the actual project ID in the storage path
    setBlueprintImageUrl(imageUri); // Store local URI temporarily
    console.log('✅ Blueprint image selected:', fileName);
  };

  const handleCreateProject = async () => {
    const errors = {
      projectName: false,
      excelFile: false,
      blueprintImage: false
    };

    if (!projectName.trim()) {
      errors.projectName = true;
      setFieldErrors(errors);
      setErrorMessage('Please enter a project name.');
      setShowErrorDialog(true);
      return;
    }

    if (!excelFile) {
      errors.excelFile = true;
      setFieldErrors(errors);
      setErrorMessage('Please upload the Excel file (Scope of Work & Gantt Chart).');
      setShowErrorDialog(true);
      return;
    }

    if (!blueprintImage) {
      errors.blueprintImage = true;
      setFieldErrors(errors);
      setErrorMessage('Please upload the Electrical Plan (Blueprint).');
      setShowErrorDialog(true);
      return;
    }

    setFieldErrors(errors);
    setIsCreating(true);
    setUploadingExcel(true);
    setUploadingBlueprint(true);

    try {
      // Files will be uploaded in projectService after project creation
      // Pass local URIs - service will handle upload to correct project folder
      const projectData = {
        name: projectName.trim(),
        description: description.trim(),
        location: location.trim(),
        clientName: clientName.trim(),
        excelFileUrl: excelFile.uri, // Local URI - will be uploaded in service
        blueprintImageUrl: blueprintImage.uri, // Local URI - will be uploaded in service
      };

      const createdProject = await createProject(projectData);
      
      setUploadingExcel(false);
      setUploadingBlueprint(false);
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
      setUploadingExcel(false);
      setUploadingBlueprint(false);
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

        {/* Excel File Upload */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Excel File (Scope of Work & Gantt Chart) *</Title>
            
            {!excelFile ? (
              <Button
                mode="outlined"
                onPress={handlePickExcelFile}
                icon="file-excel"
                style={styles.uploadButton}
                disabled={uploadingExcel || isCreating}
              >
                Upload Excel File
              </Button>
            ) : (
              <View style={styles.filePreview}>
                <View style={styles.fileInfo}>
                  <IconButton icon="file-excel" size={24} iconColor={constructionColors.success} />
                  <View style={styles.fileDetails}>
                    <Paragraph style={styles.fileName} numberOfLines={1}>
                      {excelFile.name}
                    </Paragraph>
                    {excelFile.size && (
                      <Paragraph style={styles.fileSize}>
                        {(excelFile.size / 1024 / 1024).toFixed(2)} MB
                      </Paragraph>
                    )}
                  </View>
                  {!uploadingExcel && (
                    <IconButton 
                      icon="close" 
                      size={24} 
                      iconColor={constructionColors.error}
                      onPress={() => {
                        setExcelFile(null);
                        setExcelFileUrl('');
                      }}
                    />
                  )}
                </View>
                {uploadingExcel && (
                  <View style={styles.progressContainer}>
                    <ProgressBar progress={excelUploadProgress / 100} color={theme.colors.primary} />
                    <Paragraph style={styles.progressText}>
                      Uploading... {excelUploadProgress.toFixed(0)}%
                    </Paragraph>
                  </View>
                )}
              </View>
            )}

            <Surface style={styles.infoBox}>
              <Paragraph style={styles.infoText} numberOfLines={4}>
                ℹ️ Must contain: Scope of Work sheet and Gantt Chart sheet. File will be uploaded automatically.
              </Paragraph>
            </Surface>
            {fieldErrors.excelFile && (
              <Paragraph style={styles.errorText}>Excel file is required</Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Electrical Plan Upload */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Electrical Plan (Blueprint) *</Title>
            
            {!blueprintImage ? (
              <Button
                mode="outlined"
                onPress={handlePickBlueprint}
                icon="file-image"
                style={styles.uploadButton}
                disabled={uploadingBlueprint || isCreating}
              >
                Upload Electrical Plan
              </Button>
            ) : (
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: blueprintImage.uri }} 
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
                {uploadingBlueprint && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <ProgressBar progress={blueprintUploadProgress / 100} color={theme.colors.primary} style={styles.overlayProgress} />
                    <Paragraph style={styles.overlayText}>
                      Uploading... {blueprintUploadProgress.toFixed(0)}%
                    </Paragraph>
                  </View>
                )}
                {!uploadingBlueprint && (
                  <View style={styles.imageActions}>
                    <IconButton 
                      icon="close" 
                      size={24} 
                      iconColor={constructionColors.error}
                      onPress={() => {
                        setBlueprintImage(null);
                        setBlueprintImageUrl('');
                      }}
                    />
                  </View>
                )}
              </View>
            )}

            <Surface style={styles.infoBox}>
              <Paragraph style={styles.infoText} numberOfLines={4}>
                ℹ️ Upload the electrical blueprint/plan image. JPG or PNG format recommended. Image will be uploaded automatically.
              </Paragraph>
            </Surface>
            {fieldErrors.blueprintImage && (
              <Paragraph style={styles.errorText}>Electrical Plan is required</Paragraph>
            )}
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
                <Chip icon="file-document" style={styles.featureChip}>Manage Blueprints</Chip>
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
  uploadButton: {
    marginBottom: spacing.md,
    borderColor: theme.colors.primary,
  },
  filePreview: {
    marginBottom: spacing.md,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fileDetails: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  fileName: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs / 2,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: spacing.md,
    borderRadius: theme.roundness,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    minHeight: 200,
    maxHeight: 300,
  },
  imagePreview: {
    width: '100%',
    height: 250,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  overlayProgress: {
    width: '80%',
    marginTop: spacing.md,
  },
  overlayText: {
    color: theme.colors.surface,
    marginTop: spacing.sm,
    fontSize: fontSizes.sm,
  },
  imageActions: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
  },
  errorText: {
    color: constructionColors.error,
    fontSize: fontSizes.sm,
    marginTop: spacing.xs,
  },
});


