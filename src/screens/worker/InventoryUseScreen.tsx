import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Image, FlatList, Text, Dimensions } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  TextInput, 
  Chip, 
  IconButton,
  ActivityIndicator,
  Divider,
  List,
  Surface,
  SegmentedButtons,
  DataTable,
  Modal,
  Portal,
  Dialog
} from 'react-native-paper';
import { Camera, CameraType } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import { UsageSubmission } from '../../types';
import { submitUsageReport, checkDuplicateUsage } from '../../services/firebaseService';
import { 
  getWorkerSubmissions, 
  getPendingUsageForItem,
  requestBorrowEquipment,
  getActiveBorrowRequest,
  markBorrowUsageReported,
  returnBorrowedEquipment,
  EquipmentBorrowRequest
} from '../../services/usageService';
// @ts-ignore - firebaseConfig exports auth which may have implicit any type
import { auth } from '../../firebaseConfig';
import type { Auth } from 'firebase/auth';

// @ts-ignore - auth type from firebaseConfig
const typedAuth: Auth = auth as unknown as Auth;

const { width: screenWidth } = Dimensions.get('window');

// UsageSubmission interface moved to types/index.ts

export default function InventoryUseScreen() {
  const { state, projectId } = useProjectData();
  const [activeTab, setActiveTab] = useState('materials');
  const [usageHistory, setUsageHistory] = useState<UsageSubmission[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<UsageSubmission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionType, setSubmissionType] = useState<'material' | 'equipment' | 'damage'>('material');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const cameraRef = useRef<Camera>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{count: number, itemName: string, quantity: string} | null>(null);
  const [showOverLimitDialog, setShowOverLimitDialog] = useState(false);
  const [overLimitMessage, setOverLimitMessage] = useState('');
  const [equipmentBorrowRequests, setEquipmentBorrowRequests] = useState<Map<string, EquipmentBorrowRequest>>(new Map());
  const [loadingBorrowRequests, setLoadingBorrowRequests] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [showReportUsageRequiredModal, setShowReportUsageRequiredModal] = useState(false);
  const [showFillRequiredFieldsModal, setShowFillRequiredFieldsModal] = useState(false);

  // Load usage history when history tab is active
  useEffect(() => {
    if (activeTab === 'history' && typedAuth?.currentUser) {
      loadUsageHistory();
    }
  }, [activeTab, typedAuth?.currentUser]);

  // Load equipment borrow requests when equipment tab is active
  useEffect(() => {
    if (activeTab === 'equipment' && typedAuth?.currentUser) {
      loadEquipmentBorrowRequests();
    }
  }, [activeTab, typedAuth?.currentUser, state.equipment]);

  const loadUsageHistory = async () => {
    if (!typedAuth?.currentUser) return;
    
    try {
      setLoadingHistory(true);
      const submissions = await getWorkerSubmissions(typedAuth.currentUser.uid);
      // Map service submissions to component type (photoUrl -> photo, Date -> string)
      const mappedSubmissions: UsageSubmission[] = submissions.map(sub => ({
        id: sub.id,
        type: sub.type,
        itemId: sub.itemId,
        itemName: sub.itemName,
        quantity: sub.quantity,
        unit: sub.unit,
        notes: sub.notes || '',
        photo: sub.photoUrl || '',
        timestamp: sub.timestamp instanceof Date ? sub.timestamp.toISOString() : (typeof sub.timestamp === 'string' ? sub.timestamp : new Date().toISOString()),
        status: sub.status,
        rejectionReason: sub.rejectionReason,
        taskId: sub.taskId,
        workerId: sub.workerId,
      }));
      setUsageHistory(mappedSubmissions);
    } catch (error: any) {
      console.error('Error loading usage history:', error);
      Alert.alert('Error', 'Failed to load usage history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadEquipmentBorrowRequests = async () => {
    if (!typedAuth?.currentUser) return;
    
    try {
      setLoadingBorrowRequests(true);
      const requestsMap = new Map<string, EquipmentBorrowRequest>();
      
      // Load active borrow request for each equipment
      for (const equipment of state.equipment) {
        const activeRequest = await getActiveBorrowRequest(typedAuth.currentUser.uid, equipment.id);
        if (activeRequest) {
          requestsMap.set(equipment.id, activeRequest);
        }
      }
      
      setEquipmentBorrowRequests(requestsMap);
    } catch (error: any) {
      console.error('Error loading equipment borrow requests:', error);
    } finally {
      setLoadingBorrowRequests(false);
    }
  };

  const handleRequestBorrow = async (equipmentId: string, equipmentName: string) => {
    if (!typedAuth?.currentUser) return;
    
    try {
      setIsSubmitting(true);
      await requestBorrowEquipment(equipmentId, equipmentName);
      setSuccessMessage(`Borrow request for ${equipmentName} submitted. Waiting for engineer approval.`);
      setShowSuccessModal(true);
      await loadEquipmentBorrowRequests();
    } catch (error: any) {
      setDialogMessage(error.message || 'Failed to request equipment borrow');
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnEquipment = async (borrowRequestId: string, equipmentName: string, hasReportedUsage: boolean) => {
    if (!typedAuth?.currentUser) return;
    
    // Check if usage report has been submitted
    if (!hasReportedUsage) {
      setShowReportUsageRequiredModal(true);
      return;
    }
    
    try {
      setIsSubmitting(true);
      await returnBorrowedEquipment(borrowRequestId);
      setSuccessMessage(`${equipmentName} returned successfully. You can request again tomorrow.`);
      setShowSuccessModal(true);
      await loadEquipmentBorrowRequests();
    } catch (error: any) {
      setDialogMessage(error.message || 'Failed to return equipment');
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openUsageModal = (type: 'material' | 'equipment' | 'damage', itemId: string, taskId: string = 'current-task-1') => {
    setSubmissionType(type);
    setSelectedItem(itemId);
    setCurrentTaskId(taskId);
    setQuantity(type === 'material' ? '1' : '');
    setNotes('');
    setCapturedImage(null);
    setShowUsageModal(true);
  };

  const openCamera = (type: 'material' | 'equipment') => {
    setSubmissionType(type);
    setShowItemSelector(true);
  };

  const selectItem = (itemId: string) => {
    setSelectedItem(itemId);
    setShowItemSelector(false);
    // Reset form
    setQuantity('1');
    setNotes('');
    setCapturedImage(null);
  };

  const openCameraForSelectedItem = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take evidence photos.');
        return;
      }
    }
    
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setCapturedImage(photo.uri);
        setShowCamera(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };



  const checkForDuplicates = async (itemId: string, quantity: string, taskId: string): Promise<{hasDuplicates: boolean, count: number}> => {
    try {
      if (!typedAuth?.currentUser) return { hasDuplicates: false, count: 0 };
      
      const duplicates = await checkDuplicateUsage(taskId, itemId, parseInt(quantity), typedAuth.currentUser.uid);
      return { hasDuplicates: duplicates.length > 0, count: duplicates.length };
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return { hasDuplicates: false, count: 0 };
    }
  };

  const checkPendingUsage = async (itemId: string, requestedQuantity: number): Promise<{canSubmit: boolean, message: string, pendingCount: number, pendingTotal: number}> => {
    try {
      if (!projectId || submissionType !== 'material') {
        return { canSubmit: true, message: '', pendingCount: 0, pendingTotal: 0 };
      }

      const pendingInfo = await getPendingUsageForItem(projectId, itemId);
      const material = state.materials.find(m => m.id === itemId);
      const availableQuantity = material?.quantity || 0;
      const totalRequested = pendingInfo.totalQuantity + requestedQuantity;

      if (totalRequested > availableQuantity) {
        return {
          canSubmit: false,
          message: `Cannot submit: ${pendingInfo.count} worker(s) have already requested ${pendingInfo.totalQuantity} ${material?.unit || 'units'}. Your request of ${requestedQuantity} ${material?.unit || 'units'} would exceed the available ${availableQuantity} ${material?.unit || 'units'}.`,
          pendingCount: pendingInfo.count,
          pendingTotal: pendingInfo.totalQuantity
        };
      }

      return {
        canSubmit: true,
        message: `${pendingInfo.count} worker(s) have already requested ${pendingInfo.totalQuantity} ${material?.unit || 'units'}.`,
        pendingCount: pendingInfo.count,
        pendingTotal: pendingInfo.totalQuantity
      };
    } catch (error) {
      console.error('Error checking pending usage:', error);
      return { canSubmit: true, message: '', pendingCount: 0, pendingTotal: 0 };
    }
  };

  const submitUsage = async () => {
    if (!selectedItem) {
      Alert.alert('No Item Selected', 'Please select an item to report usage for.');
      return;
    }

    // Check for required fields and show modal if missing
    const missingFields: string[] = [];
    
    if (!capturedImage) {
      missingFields.push('photo');
    }
    
    if (submissionType === 'material' && !quantity) {
      missingFields.push('quantity');
    }
    
    if (!notes.trim()) {
      missingFields.push('notes');
    }

    if (missingFields.length > 0) {
      setShowFillRequiredFieldsModal(true);
      return;
    }

    // Check for duplicate submissions on same task and pending usage limits
    if (submissionType === 'material' && quantity) {
      const requestedQty = parseInt(quantity);
      const selectedItemInfo = getSelectedItemInfo();
      const itemName = selectedItemInfo?.name || 'Unknown Item';

      // Check pending usage to prevent exceeding available quantity
      const pendingCheck = await checkPendingUsage(selectedItem, requestedQty);
      if (!pendingCheck.canSubmit) {
        setOverLimitMessage(pendingCheck.message);
        setShowOverLimitDialog(true);
        return;
      }

      // Check for duplicate submissions on same task
      const duplicateCheck = await checkForDuplicates(selectedItem, quantity, currentTaskId);
      if (duplicateCheck.hasDuplicates) {
        setDuplicateInfo({
          count: duplicateCheck.count,
          itemName,
          quantity
        });
        setShowDuplicateDialog(true);
        return;
      }
    }

    proceedWithSubmission();
  };

  const proceedWithSubmission = async () => {
    if (!typedAuth?.currentUser) {
      Alert.alert('Authentication Error', 'Please log in to submit usage reports.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedItemInfo = getSelectedItemInfo();
      
      const reportData = {
        type: submissionType,
        itemId: selectedItem,
        itemName: selectedItemInfo?.name || 'Unknown Item',
        quantity: submissionType === 'material' ? parseInt(quantity) : undefined,
        unit: submissionType === 'material' ? (selectedItemInfo as any)?.unit : undefined,
        notes: notes,
        localPhotoUri: capturedImage, // This will be uploaded to Firebase Storage
        taskId: currentTaskId,
      };

      const result = await submitUsageReport(reportData);
      
      // If this is an equipment usage report, mark borrow request as having reported usage
      if (submissionType === 'equipment' && selectedItem) {
        const borrowRequest = equipmentBorrowRequests.get(selectedItem);
        if (borrowRequest && borrowRequest.status === 'approved') {
          try {
            await markBorrowUsageReported(borrowRequest.id);
            await loadEquipmentBorrowRequests(); // Refresh borrow requests
          } catch (error) {
            console.error('Error marking borrow usage reported:', error);
          }
        }
      }
      
      setIsSubmitting(false);
      
      // Refresh history if on history tab
      if (activeTab === 'history') {
        await loadUsageHistory();
      }
      
      // Refresh borrow requests if on equipment tab
      if (activeTab === 'equipment') {
        await loadEquipmentBorrowRequests();
      }
      
      // Show custom success modal
      setSuccessMessage(
        submissionType === 'damage' 
          ? 'Your damage report has been submitted for engineer verification.'
          : `Your ${submissionType} usage report has been submitted for engineer verification.`
      );
      setShowUsageModal(false);
      setShowSuccessModal(true);
      resetForm();
    } catch (error) {
      setIsSubmitting(false);
      console.error('Error submitting usage report:', error);
      Alert.alert(
        'Submission Failed',
        'Failed to submit usage report. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const resetForm = () => {
    setCapturedImage(null);
    setSelectedItem('');
    setQuantity('');
    setNotes('');
    setCurrentTaskId('');
  };

  const closeUsageModal = () => {
    setShowUsageModal(false);
    resetForm();
  };

  const getSelectedItemInfo = () => {
    if (submissionType === 'material') {
      return state.materials.find(m => m.id === selectedItem);
    } else {
      return state.equipment.find(e => e.id === selectedItem);
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

  const renderItemSelector = () => {
    const items = submissionType === 'material' ? state.materials : state.equipment;
    
    return (
      <Portal>
        <Modal
          visible={showItemSelector}
          onDismiss={() => setShowItemSelector(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content style={{ backgroundColor: theme.colors.background }}>
              <Title style={styles.modalTitle}>
                Select {submissionType === 'material' ? 'Material' : 'Equipment'}
              </Title>
              
              <ScrollView style={styles.itemList}>
                {items.map((item) => (
                  <List.Item
                    key={item.id}
                    title={item.name}
                    description={
                      submissionType === 'material' 
                        ? `Available: ${(item as any).quantity} ${(item as any).unit}`
                        : `Status: ${(item as any).status} | Condition: ${(item as any).condition}`
                    }
                    left={() => (
                      <List.Icon 
                        icon={submissionType === 'material' ? 'package-variant' : 'hammer'} 
                        color={theme.colors.primary}
                      />
                    )}
                    onPress={() => selectItem(item.id)}
                    style={styles.itemListItem}
                    titleStyle={{ color: theme.colors.text }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  />
                ))}
              </ScrollView>
              
              <Button
                mode="outlined"
                onPress={() => setShowItemSelector(false)}
                style={styles.modalCloseButton}
              >
                Cancel
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    );
  };

  if (showCamera) {
    const selectedItemInfo = getSelectedItemInfo();
    
    return (
      <View style={styles.cameraContainer}>
        <Camera 
          style={styles.camera} 
          type={CameraType.back}
          ref={cameraRef}
        >
          <View style={styles.cameraControls}>
            {/* Camera Header - positioned just below status bar */}
            <View style={styles.cameraHeader}>
              <IconButton
                icon="close"
                size={32}
                iconColor="white"
                onPress={() => setShowCamera(false)}
                style={styles.closeButton}
              />
              <Title style={styles.cameraTitle}>
                Photo: {selectedItemInfo?.name}
              </Title>
            </View>
            
            {/* Camera Capture Button */}
            <View style={styles.cameraActions}>
              <IconButton
                icon="camera"
                size={70}
                iconColor="white"
                style={styles.captureButton}
                onPress={takePicture}
              />
            </View>
          </View>
        </Camera>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Title style={styles.screenTitle}>Inventory Usage</Title>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <SegmentedButtons
            value={activeTab}
            onValueChange={setActiveTab}
            buttons={[
              {
                value: 'materials',
                label: 'Materials',
                icon: 'package-variant',
              },
              {
                value: 'equipment',
                label: 'Equipment',
                icon: 'hammer',
              },
              {
                value: 'history',
                label: 'History',
                icon: 'history',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <Card style={styles.card}>
            <Card.Content style={{ backgroundColor: theme.colors.background }}>
              <Title style={styles.cardTitle}>Report Material Usage</Title>
              
              <Paragraph style={styles.instructions}>
                Select a material and report how much you've used with photo evidence
              </Paragraph>

              {/* Available Materials with Report Used Buttons */}
              <Divider style={styles.divider} />
              <Paragraph style={styles.sectionTitle}>Available Materials</Paragraph>
              
              {state.materials.map((material) => (
                <Surface key={material.id} style={styles.materialCard}>
                  <List.Item
                    title={material.name}
                    description={`Available: ${material.quantity} / ${material.totalBought || material.quantity} ${material.unit}`}
                    left={() => (
                      <List.Icon icon="package-variant" color={theme.colors.primary} />
                    )}
                    style={{ backgroundColor: 'transparent' }}
                    titleStyle={{ color: theme.colors.text }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  />
                  <View style={styles.materialActions}>
                    <Button
                      mode="contained"
                      onPress={() => openUsageModal('material', material.id)}
                      icon="clipboard-check"
                      style={styles.reportUsedButton}
                      contentStyle={styles.reportUsedButtonContent}
                    >
                      Report Used
                    </Button>
                  </View>
                </Surface>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <Card style={styles.card}>
            <Card.Content style={{ backgroundColor: theme.colors.background }}>
              <Title style={styles.cardTitle}>Equipment Reports</Title>
              
              <Paragraph style={styles.instructions}>
                Report equipment usage or damage with photo evidence
              </Paragraph>

              {/* Available Equipment with Report Buttons */}
              <Divider style={styles.divider} />
              <Paragraph style={styles.sectionTitle}>Available Equipment</Paragraph>
              
              {loadingBorrowRequests ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading equipment status...</Text>
                </View>
              ) : (
                state.equipment.map((equipment) => {
                  const borrowRequest = equipmentBorrowRequests.get(equipment.id);
                  const isPending = borrowRequest?.status === 'pending';
                  const isApproved = borrowRequest?.status === 'approved';
                  const hasReportedUsage = borrowRequest?.hasReportedUsage || false;
                  const canReturn = isApproved && hasReportedUsage;

                  return (
                    <Surface key={equipment.id} style={styles.equipmentCard}>
                      <List.Item
                        title={equipment.name}
                        description={`Status: ${equipment.status} | Condition: ${equipment.condition}${equipment.quantity ? ` | ${equipment.quantity} pcs` : ''}`}
                        left={() => (
                          <List.Icon icon="hammer" color={theme.colors.primary} />
                        )}
                        style={{ backgroundColor: 'transparent' }}
                        titleStyle={{ color: theme.colors.text }}
                        descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                      />
                      <View style={styles.equipmentActions}>
                        {!borrowRequest && (
                          <Button
                            mode="contained"
                            onPress={() => handleRequestBorrow(equipment.id, equipment.name)}
                            icon="hand-coin"
                            style={styles.reportUsageButton}
                            contentStyle={styles.reportButtonContent}
                            labelStyle={styles.reportButtonLabel}
                            disabled={isSubmitting}
                            loading={isSubmitting}
                          >
                            Request Borrow
                          </Button>
                        )}
                        {isPending && (
                          <Button
                            mode="outlined"
                            icon="clock-outline"
                            style={styles.reportUsageButton}
                            contentStyle={styles.reportButtonContent}
                            labelStyle={styles.reportButtonLabel}
                            disabled
                          >
                            Pending Approval
                          </Button>
                        )}
                        {isApproved && (
                          <>
                            <Button
                              mode="contained"
                              onPress={() => openUsageModal('equipment', equipment.id)}
                              icon="clipboard-check"
                              style={styles.reportUsageButton}
                              contentStyle={styles.reportButtonContent}
                              labelStyle={styles.reportButtonLabel}
                            >
                              Report Usage
                            </Button>
                            <Button
                              mode="contained"
                              onPress={() => {
                                setSubmissionType('damage');
                                openUsageModal('damage', equipment.id);
                              }}
                              icon="alert-circle"
                              style={styles.reportDamageButton}
                              contentStyle={styles.reportButtonContent}
                              labelStyle={styles.reportButtonLabel}
                            >
                              Report Damage
                            </Button>
                            <Button
                              mode="contained"
                              onPress={() => borrowRequest && handleReturnEquipment(borrowRequest.id, equipment.name, hasReportedUsage)}
                              icon="hand-coin-outline"
                              style={[styles.reportDamageButton, { backgroundColor: constructionColors.complete }]}
                              contentStyle={styles.reportButtonContent}
                              labelStyle={styles.reportButtonLabel}
                              disabled={isSubmitting}
                              loading={isSubmitting}
                            >
                              Return
                            </Button>
                          </>
                        )}
                      </View>
                    </Surface>
                  );
                })
              )}
            </Card.Content>
          </Card>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <Card style={styles.card}>
            <Card.Content style={{ backgroundColor: theme.colors.background }}>
              <Title style={styles.cardTitle}>Usage History</Title>
              
              {loadingHistory ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Paragraph style={styles.loadingText}>Loading history...</Paragraph>
                </View>
              ) : usageHistory.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Paragraph style={styles.emptyText}>No usage history found</Paragraph>
                </View>
              ) : (
                usageHistory.map((submission) => (
                  <List.Item
                    key={submission.id}
                    title={submission.itemName}
                    description={`${submission.type === 'damage' ? 'DAMAGE REPORT' : submission.type.toUpperCase()} • ${submission.timestamp ? new Date(submission.timestamp).toLocaleDateString() : 'N/A'}`}
                    left={() => (
                      <List.Icon 
                        icon={
                          submission.type === 'material' ? 'package-variant' : 
                          submission.type === 'equipment' ? 'hammer' : 
                          'alert-circle'
                        }
                        color={
                          submission.type === 'damage' ? constructionColors.urgent : 
                          getStatusColor(submission.status)
                        }
                      />
                    )}
                    right={() => (
                      <Chip 
                        style={{
                          ...styles.statusChip,
                          backgroundColor: submission.type === 'damage' && submission.status === 'approved' 
                            ? constructionColors.urgent 
                            : getStatusColor(submission.status),
                        }}
                        textStyle={styles.statusChipText}
                      >
                        {submission.status.toUpperCase()}
                      </Chip>
                    )}
                    onPress={() => {
                      setSelectedSubmission(submission);
                      setShowDetailModal(true);
                    }}
                    style={styles.historyItem}
                    titleStyle={{ color: theme.colors.text }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  />
                ))
              )}
            </Card.Content>
          </Card>
        )}

        {/* Submission Detail Modal */}
        <Portal>
          <Modal
            visible={showDetailModal}
            onDismiss={() => {
              setShowDetailModal(false);
              setSelectedSubmission(null);
            }}
            contentContainerStyle={styles.detailModalContainer}
          >
            <Surface style={styles.detailModalSurface}>
              <View style={styles.detailModalHeader}>
                <Title style={styles.detailModalTitle}>
                  {selectedSubmission?.type === 'damage' ? 'Damage Report Details' : 'Usage Details'}
                </Title>
                <IconButton
                  icon="close"
                  size={24}
                  iconColor={theme.colors.text}
                  onPress={() => {
                    setShowDetailModal(false);
                    setSelectedSubmission(null);
                  }}
                />
              </View>
              
              <ScrollView style={styles.detailModalContent}>
                {selectedSubmission && (
                  <>
                    <View style={styles.detailSection}>
                      <Paragraph style={styles.detailLabel}>Item Name:</Paragraph>
                      <Paragraph style={styles.detailValue}>{selectedSubmission.itemName}</Paragraph>
                    </View>
                    
                    <View style={styles.detailSection}>
                      <Paragraph style={styles.detailLabel}>Type:</Paragraph>
                      <Paragraph style={styles.detailValue}>
                        {selectedSubmission.type === 'damage' ? 'DAMAGE REPORT' : selectedSubmission.type.toUpperCase()}
                      </Paragraph>
                    </View>
                    
                    {selectedSubmission.type === 'material' && (
                      <View style={styles.detailSection}>
                        <Paragraph style={styles.detailLabel}>Quantity:</Paragraph>
                        <Paragraph style={styles.detailValue}>
                          {selectedSubmission.quantity || 'N/A'} {selectedSubmission.unit || ''}
                        </Paragraph>
                      </View>
                    )}
                    
                    <View style={styles.detailSection}>
                      <Paragraph style={styles.detailLabel}>Status:</Paragraph>
                      <Chip 
                        style={{
                          ...styles.detailStatusChip,
                          backgroundColor: selectedSubmission.type === 'damage' && selectedSubmission.status === 'approved' 
                            ? constructionColors.urgent 
                            : getStatusColor(selectedSubmission.status),
                        }}
                        textStyle={styles.detailStatusChipText}
                      >
                        {selectedSubmission.status.toUpperCase()}
                      </Chip>
                    </View>
                    
                    <View style={styles.detailSection}>
                      <Paragraph style={styles.detailLabel}>Date:</Paragraph>
                      <Paragraph style={styles.detailValue}>
                        {selectedSubmission.timestamp ? new Date(selectedSubmission.timestamp).toLocaleDateString() : 'N/A'}
                      </Paragraph>
                    </View>
                    
                    {selectedSubmission.notes && (
                      <View style={styles.detailSection}>
                        <Paragraph style={styles.detailLabel}>Notes:</Paragraph>
                        <Paragraph style={styles.detailValue}>{selectedSubmission.notes}</Paragraph>
                      </View>
                    )}
                    
                    {selectedSubmission.rejectionReason && (
                      <View style={styles.detailSection}>
                        <Paragraph style={styles.detailLabel}>Rejection Reason:</Paragraph>
                        <Paragraph style={[styles.detailValue, { color: constructionColors.urgent }]}>
                          {selectedSubmission.rejectionReason}
                        </Paragraph>
                      </View>
                    )}
                    
                    {selectedSubmission.photo && (
                      <View style={styles.detailSection}>
                        <Paragraph style={styles.detailLabel}>Photo:</Paragraph>
                        <Image 
                          source={{ uri: selectedSubmission.photo }} 
                          style={styles.detailPhoto}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
              
              <View style={styles.detailModalActions}>
                <Button
                  mode="contained"
                  onPress={() => {
                    setShowDetailModal(false);
                    setSelectedSubmission(null);
                  }}
                  style={styles.detailModalButton}
                >
                  Close
                </Button>
              </View>
            </Surface>
          </Modal>
        </Portal>

        {/* Old forms removed - now using modal */}
        {false && selectedItem && submissionType === 'material' && !showCamera && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Report Material Usage</Title>
              
              {/* Selected Material Info */}
              <Surface style={styles.selectedItemInfo}>
                <Paragraph style={styles.selectedItemLabel}>Selected Material:</Paragraph>
                <Title style={styles.selectedItemName}>
                  {getSelectedItemInfo()?.name}
                </Title>
                <Paragraph style={styles.selectedItemDetails}>
                  Available: {(getSelectedItemInfo() as any)?.quantity} {(getSelectedItemInfo() as any)?.unit}
                </Paragraph>
              </Surface>

              {/* Quantity Selector with Plus/Minus */}
              <View style={styles.quantitySection}>
                <Paragraph style={styles.quantityLabel}>Quantity Used:</Paragraph>
                <View style={styles.quantitySelector}>
                  <IconButton
                    icon="minus"
                    size={24}
                    mode="contained"
                    style={styles.quantityButton}
                    onPress={() => {
                      const current = parseInt(quantity) || 1;
                      if (current > 1) {
                        setQuantity((current - 1).toString());
                      }
                    }}
                    disabled={parseInt(quantity) <= 1}
                  />
                  
                  <TextInput
                    value={quantity}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 1;
                      const item = getSelectedItemInfo() as any;
                      if (num > 0 && num <= (item?.quantity || 0)) {
                        setQuantity(text);
                      }
                    }}
                    keyboardType="numeric"
                    style={styles.quantityInput}
                    textAlign="center"
                  />
                  
                  <Text style={styles.unitText}>
                    {(getSelectedItemInfo() as any)?.unit}
                  </Text>
                  
                  <IconButton
                    icon="plus"
                    size={24}
                    mode="contained"
                    style={styles.quantityButton}
                    onPress={() => {
                      const current = parseInt(quantity) || 0;
                      const item = getSelectedItemInfo() as any;
                      const available = item?.quantity || 0;
                      if (current < available) {
                        setQuantity((current + 1).toString());
                      }
                    }}
                    disabled={parseInt(quantity) >= ((getSelectedItemInfo() as any)?.quantity || 0)}
                  />
                </View>
              </View>

              {/* Notes Input */}
              <TextInput
                label="Usage Notes *"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={styles.notesInput}
                placeholder="Describe how the material was used, location, purpose, etc..."
                textColor={theme.colors.text}
              />

              {/* Photo Section */}
              <View style={[styles.photoSection, { backgroundColor: theme.colors.background }]}>
                <Paragraph style={styles.photoLabel}>Photo Evidence:</Paragraph>
                {capturedImage ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: capturedImage || '' }} style={styles.previewImage} />
                    <Button
                      mode="text"
                      onPress={() => setCapturedImage(null)}
                      icon="close"
                      style={styles.removePhotoButton}
                    >
                      Remove Photo
                    </Button>
                  </View>
                ) : (
                  <Button
                    mode="contained"
                    onPress={openCameraForSelectedItem}
                    icon="camera"
                    style={styles.cameraButton}
                    contentStyle={styles.cameraButtonContent}
                  >
                    Take Photo Evidence
                  </Button>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.formActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setSelectedItem('');
                    setCapturedImage(null);
                    setQuantity('');
                    setNotes('');
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                
                <Button
                  mode="contained"
                  onPress={submitUsage}
                  disabled={!capturedImage || !notes.trim() || !quantity || isSubmitting}
                  loading={isSubmitting}
                  style={styles.submitButton}
                >
                  Submit Usage
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Old equipment form removed - now using modal */}
        {false && selectedItem && (submissionType === 'equipment' || submissionType === 'damage') && !showCamera && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>
                {submissionType === 'damage' ? 'Report Equipment Damage' : 'Report Equipment Usage'}
              </Title>
              
              {/* Selected Equipment Info */}
              <Surface style={styles.selectedItemInfo}>
                <Paragraph style={styles.selectedItemLabel}>Selected Equipment:</Paragraph>
                <Title style={styles.selectedItemName}>
                  {getSelectedItemInfo()?.name}
                </Title>
                <Paragraph style={styles.selectedItemDetails}>
                  Status: {(getSelectedItemInfo() as any)?.status} | Condition: {(getSelectedItemInfo() as any)?.condition}
                </Paragraph>
              </Surface>

              {/* Notes Input */}
              <TextInput
                label={submissionType === 'damage' ? 'Damage Description *' : 'Usage Notes *'}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                style={styles.notesInput}
                placeholder={
                  submissionType === 'damage' 
                    ? "Describe the damage, how it occurred, location, severity, etc..."
                    : "Describe how the equipment was used, location, purpose, etc..."
                }
                textColor={theme.colors.text}
              />

              {/* Photo Section */}
              <View style={[styles.photoSection, { backgroundColor: theme.colors.background }]}>
                <Paragraph style={styles.photoLabel}>Photo Evidence:</Paragraph>
                {capturedImage ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: capturedImage || '' }} style={styles.previewImage} />
                    <Button
                      mode="text"
                      onPress={() => setCapturedImage(null)}
                      icon="close"
                      style={styles.removePhotoButton}
                    >
                      Remove Photo
                    </Button>
                  </View>
                ) : (
                  <Button
                    mode="contained"
                    onPress={openCameraForSelectedItem}
                    icon="camera"
                    style={styles.cameraButton}
                    contentStyle={styles.cameraButtonContent}
                  >
                    Take Photo Evidence
                  </Button>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.formActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setSelectedItem('');
                    setCapturedImage(null);
                    setQuantity('');
                    setNotes('');
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                
                <Button
                  mode="contained"
                  onPress={submitUsage}
                  disabled={!capturedImage || !notes.trim() || isSubmitting}
                  loading={isSubmitting}
                  style={styles.submitButton}
                >
                  {submissionType === 'damage' ? 'Submit Damage Report' : 'Submit Usage'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}


      </ScrollView>

      {/* Usage Report Modal */}
      <Portal>
        <Modal
          visible={showUsageModal}
          onDismiss={closeUsageModal}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Title style={styles.modalTitle}>
                {submissionType === 'damage' ? 'Report Equipment Damage' : 
                 submissionType === 'equipment' ? 'Report Equipment Usage' :
                 'Report Material Usage'}
              </Title>
              
              {/* Selected Item Info */}
              <Surface style={styles.selectedItemInfo}>
                <Paragraph style={styles.selectedItemLabel}>
                  Selected {submissionType === 'material' ? 'Material' : 'Equipment'}:
                </Paragraph>
                <Title style={styles.selectedItemName}>
                  {getSelectedItemInfo()?.name}
                </Title>
                <Paragraph style={styles.selectedItemDetails}>
                  {submissionType === 'material' 
                    ? `Available: ${(getSelectedItemInfo() as any)?.quantity} / ${(getSelectedItemInfo() as any)?.totalBought || (getSelectedItemInfo() as any)?.quantity} ${(getSelectedItemInfo() as any)?.unit}`
                    : `Status: ${(getSelectedItemInfo() as any)?.status} | Condition: ${(getSelectedItemInfo() as any)?.condition}`
                  }
                </Paragraph>
              </Surface>

              {/* Quantity Input - Only for materials */}
              {submissionType === 'material' && (
                <TextInput
                  label="Quantity Used *"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  style={styles.textInput}
                  textColor={theme.colors.text}
                  right={<TextInput.Affix text={(getSelectedItemInfo() as any)?.unit || ''} />}
                />
              )}

              {/* Notes Input */}
              <TextInput
                label={submissionType === 'damage' ? 'Damage Description *' : 
                       submissionType === 'equipment' ? 'Usage Notes *' : 'Usage Notes *'}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                style={styles.textInput}
                textColor={theme.colors.text}
                placeholder={
                  submissionType === 'damage' 
                    ? 'Describe the damage in detail...'
                    : submissionType === 'equipment'
                    ? 'Describe how the equipment was used...'
                    : 'Describe how the material was used...'
                }
              />

              {/* Photo Section */}
              <Surface style={styles.photoSection}>
                <View style={styles.photoHeader}>
                  <Paragraph style={styles.photoTitle}>Photo Evidence * (Required)</Paragraph>
                  <Paragraph style={styles.photoSubtitle}>
                    {submissionType === 'damage' 
                      ? 'Take a photo showing the damage'
                      : submissionType === 'equipment'
                      ? 'Take a photo showing the equipment in use'
                      : 'Take a photo showing the material usage'
                    }
                  </Paragraph>
                </View>
                
                {capturedImage ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                    <Button
                      mode="outlined"
                      onPress={openCameraForSelectedItem}
                      icon="camera"
                      style={styles.retakePhotoButton}
                      contentStyle={styles.actionButtonContent}
                    >
                      Retake Photo
                    </Button>
                  </View>
                ) : (
                  <Button
                    mode="contained"
                    onPress={openCameraForSelectedItem}
                    icon="camera"
                    style={styles.uploadPhotoButton}
                    contentStyle={styles.uploadPhotoButtonContent}
                    labelStyle={styles.uploadPhotoButtonLabel}
                  >
                    Upload Photo Here
                  </Button>
                )}
              </Surface>

              {/* Submit Section */}
              <View style={styles.formActions}>
                <Button
                  mode="text"
                  onPress={closeUsageModal}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                
                <Button
                  mode="contained"
                  onPress={submitUsage}
                  disabled={
                    !capturedImage || 
                    !notes.trim() || 
                    (submissionType === 'material' && !quantity) || 
                    isSubmitting
                  }
                  loading={isSubmitting}
                  style={styles.submitButton}
                  contentStyle={styles.submitButtonContent}
                  labelStyle={styles.submitButtonLabel}
                >
                  {submissionType === 'damage' ? 'Submit Damage Report' : 'Submit Usage'}
                </Button>
              </View>
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>

      {/* Success Modal */}
      <Portal>
        <Modal 
          visible={showSuccessModal} 
          onDismiss={() => setShowSuccessModal(false)}
          contentContainerStyle={styles.successModalContainer}
        >
          <Surface style={styles.successModalContent}>
            <Title style={styles.successModalTitle}>
              {submissionType === 'damage' ? 'Damage Report Submitted' : 'Usage Report Submitted'}
            </Title>
            <Paragraph style={styles.successModalMessage}>
              {successMessage}
            </Paragraph>
            <Button 
              onPress={() => setShowSuccessModal(false)}
              mode="contained"
              style={styles.successModalButton}
              textColor={theme.colors.text}
              buttonColor={theme.colors.primary}
            >
              OK
            </Button>
          </Surface>
        </Modal>
      </Portal>

      {/* Item Selector Modal */}
      {renderItemSelector()}

      {/* Duplicate Detection Dialog */}
      <Portal>
        <Dialog
          visible={showDuplicateDialog}
          onDismiss={() => setShowDuplicateDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Potential Duplicate Detected</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>
              {duplicateInfo && `${duplicateInfo.count} worker(s) on this task have already reported the same quantity (${duplicateInfo.quantity}) for ${duplicateInfo.itemName}. Do you want to continue?`}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowDuplicateDialog(false)}
              textColor={theme.colors.text}
            >
              Cancel
            </Button>
            <Button
              onPress={() => {
                setShowDuplicateDialog(false);
                proceedWithSubmission();
              }}
              textColor={theme.colors.primary}
            >
              Continue Anyway
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Over Limit Dialog */}
      <Portal>
        <Dialog
          visible={showOverLimitDialog}
          onDismiss={() => setShowOverLimitDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Request Exceeds Available Quantity</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>
              {overLimitMessage}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowOverLimitDialog(false)}
              textColor={theme.colors.primary}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Error</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>{dialogMessage}</Paragraph>
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

      {/* Report Usage Required Modal */}
      <Portal>
        <Modal
          visible={showReportUsageRequiredModal}
          onDismiss={() => setShowReportUsageRequiredModal(false)}
          contentContainerStyle={styles.blackModalContainer}
        >
          <Surface style={styles.blackModalContent}>
            <Title style={styles.blackModalTitle}>Report Usage Required</Title>
            <Paragraph style={styles.blackModalMessage}>
              You need to do the report usage before returning the equipment.
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => setShowReportUsageRequiredModal(false)}
              style={styles.blackModalButton}
              contentStyle={styles.blackModalButtonContent}
              labelStyle={styles.blackModalButtonLabel}
            >
              OK
            </Button>
          </Surface>
        </Modal>
      </Portal>

      {/* Fill Required Fields Modal */}
      <Portal>
        <Modal
          visible={showFillRequiredFieldsModal}
          onDismiss={() => setShowFillRequiredFieldsModal(false)}
          contentContainerStyle={styles.blackModalContainer}
        >
          <Surface style={styles.blackModalContent}>
            <Title style={styles.blackModalTitle}>Required Fields Missing</Title>
            <Paragraph style={styles.blackModalMessage}>
              Fill up the required text before submitting.
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => setShowFillRequiredFieldsModal(false)}
              style={styles.blackModalButton}
              contentStyle={styles.blackModalButtonContent}
              labelStyle={styles.blackModalButtonLabel}
            >
              OK
            </Button>
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
  content: {
    flex: 1,
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
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentedButtons: {
    backgroundColor: theme.colors.surface,
  },
  card: {
    margin: spacing.md,
    elevation: 2,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  reportButton: {
    backgroundColor: theme.colors.primary,
    marginBottom: spacing.sm,
  },
  reportButtonContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  instructions: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  divider: {
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  previewItem: {
    paddingVertical: spacing.xs,
  },
  viewAllButton: {
    marginTop: spacing.sm,
  },
  historyItem: {
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
  },
  statusChip: {
    height: 32,
    paddingHorizontal: spacing.lg,
    minWidth: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: fontSizes.sm,
  },
  selectedItemInfo: {
    padding: spacing.md,
    borderRadius: theme.roundness,
    marginVertical: spacing.sm,
    backgroundColor: '#1E1E1E',
  },
  selectedItemLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  selectedItemName: {
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  selectedItemDetails: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  photoPreview: {
    position: 'relative',
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
    elevation: 2,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.roundness,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  notesInput: {
    marginBottom: spacing.md,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  itemList: {
    maxHeight: 400,
    marginBottom: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  itemListItem: {
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  modalCloseButton: {
    marginTop: spacing.sm,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingBottom: spacing.md,
  },
  closeButton: {
    backgroundColor: constructionColors.urgent,
    margin: 0,
  },
  cameraTitle: {
    color: 'white',
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginLeft: spacing.md,
    flex: 1,
  },
  cameraActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 4,
    borderColor: theme.colors.primary,
  },
  materialCard: {
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: theme.roundness,
    elevation: 1,
    backgroundColor: theme.colors.background,
  },
  materialActions: {
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  reportUsedButton: {
    backgroundColor: theme.colors.primary,
    minWidth: 120,
  },
  reportUsedButtonContent: {
    paddingVertical: spacing.xs,
  },
  equipmentCard: {
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: theme.roundness,
    elevation: 1,
    backgroundColor: theme.colors.background,
  },
  equipmentActions: {
    flexDirection: 'column',
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  reportUsageButton: {
    backgroundColor: theme.colors.primary,
    width: '100%',
    marginBottom: spacing.sm,
  },
  reportDamageButton: {
    backgroundColor: constructionColors.urgent,
    width: '100%',
  },
  reportButtonLabel: {
    color: theme.colors.onPrimary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  quantitySection: {
    marginVertical: spacing.md,
  },
  quantityLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: theme.colors.onSurface,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  quantityButton: {
    backgroundColor: theme.colors.primary,
    margin: 0,
  },
  quantityInput: {
    width: 80,
    marginHorizontal: spacing.sm,
    textAlign: 'center',
    backgroundColor: theme.colors.background,
  },
  unitText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginLeft: spacing.xs,
    minWidth: 40,
  },
  photoSection: {
    marginVertical: spacing.md,
    backgroundColor: '#1E1E1E',
    padding: spacing.md,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  photoLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: theme.colors.onSurface,
  },
  cameraButton: {
    backgroundColor: theme.colors.primary,
  },
  cameraButtonContent: {
    paddingVertical: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
    borderColor: theme.colors.outline,
  },
  submitButton: {
    flex: 1,
    marginLeft: spacing.sm,
    backgroundColor: theme.colors.primary,
  },
  modalContent: {
    backgroundColor: '#000000',
    borderRadius: 16,
    width: screenWidth - (spacing.md * 2),
    maxHeight: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    padding: spacing.md,
  },
  modalScroll: {
    maxHeight: '100%',
    backgroundColor: 'transparent',
  },
  textInput: {
    marginBottom: spacing.md,
    backgroundColor: '#1E1E1E',
  },
  photoHeader: {
    marginBottom: spacing.sm,
    backgroundColor: 'transparent',
    padding: spacing.sm,
    borderRadius: theme.roundness,
  },
  photoTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  photoSubtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  photoActionButton: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonContent: {
    height: 40,
  },
  submitButtonContent: {
    paddingVertical: spacing.sm,
  },
  submitButtonLabel: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  uploadPhotoButton: {
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  uploadPhotoButtonContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  uploadPhotoButtonLabel: {
    color: theme.colors.onPrimary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  retakePhotoButton: {
    borderColor: theme.colors.primary,
    marginTop: spacing.sm,
  },
  detailModalContainer: {
    padding: spacing.md,
    justifyContent: 'center',
  },
  detailModalSurface: {
    backgroundColor: '#000000',
    borderRadius: theme.roundness,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailModalTitle: {
    color: theme.colors.text,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  detailModalContent: {
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  detailStatusChip: {
    height: 32,
    paddingHorizontal: spacing.lg,
    minWidth: 110,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailStatusChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.5,
  },
  detailPhoto: {
    width: '100%',
    height: 200,
    borderRadius: theme.roundness,
    marginTop: spacing.sm,
  },
  detailModalActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  detailModalButton: {
    backgroundColor: theme.colors.primary,
  },
  successModalContainer: {
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: '#000000',
    borderRadius: theme.roundness,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  successModalTitle: {
    color: theme.colors.primary,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successModalMessage: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  successModalButton: {
    marginTop: spacing.sm,
  },
  dialog: {
    backgroundColor: '#000000',
  },
  dialogTitle: {
    color: theme.colors.primary,
  },
  dialogMessage: {
    color: theme.colors.text,
  },
  blackModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  blackModalContent: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  blackModalTitle: {
    color: theme.colors.primary,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  blackModalMessage: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  blackModalButton: {
    backgroundColor: theme.colors.primary,
    marginTop: spacing.sm,
  },
  blackModalButtonContent: {
    paddingVertical: spacing.sm,
  },
  blackModalButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
