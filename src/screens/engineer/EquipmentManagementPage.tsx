import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Button,
  IconButton,
  List,
  Divider,
  Chip,
  FAB,
  Portal,
  Modal,
  Surface,
  SegmentedButtons,
  Dialog,
  Paragraph,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';

export default function EquipmentManagementPage() {
  const navigation = useNavigation();
  const { state, addEquipment, updateEquipment, deleteEquipment: deleteEquipmentFromContext } = useProjectData();
  const equipment = state.equipment;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [deleteEquipmentId, setDeleteEquipmentId] = useState<string | null>(null);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    type: 'owned' as 'owned' | 'rental',
    condition: 'good' as 'good' | 'fair' | 'needs_repair',
    status: 'available' as 'available' | 'in_use' | 'maintenance',
    rentalCost: '',
  });

  const equipmentTypes = [
    'Other', 'Excavator', 'Bulldozer', 'Crane', 'Loader', 'Dump Truck', 'Concrete Mixer',
    'Scaffolding', 'Generator', 'Compressor', 'Welding Equipment', 'Power Tools'
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      type: 'owned',
      condition: 'good' as 'good' | 'fair' | 'needs_repair',
      status: 'available',
      rentalCost: '',
    });
    setEditingEquipment(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (equip: any) => {
    setFormData({
      name: equip.name,
      category: equip.category,
      type: equip.type,
      condition: equip.condition,
      status: equip.status,
      rentalCost: equip.rentalCost?.toString() || '',
    });
    setEditingEquipment(equip);
    setModalVisible(true);
  };

  const saveEquipment = () => {
    if (!formData.name.trim() || !formData.category.trim()) {
      setDialogTitle('Error');
      setDialogMessage('Please fill in all required fields');
      setIsError(true);
      setShowDialog(true);
      return;
    }

    // If rental, rental cost must be provided
    if (formData.type === 'rental' && !formData.rentalCost) {
      setDialogTitle('Error');
      setDialogMessage('For rental equipment, please provide the rental cost');
      setIsError(true);
      setShowDialog(true);
      return;
    }

    // Prevent decreasing rental cost when editing
    if (editingEquipment && editingEquipment.type === 'rental' && formData.type === 'rental') {
      const currentRentalCost = editingEquipment.rentalCost || 0;
      const newRentalCost = parseFloat(formData.rentalCost);
      if (newRentalCost < currentRentalCost) {
        setDialogTitle('Error');
        setDialogMessage('Rental cost cannot be decreased. You can only increase the rental cost.');
        setIsError(true);
        setShowDialog(true);
        return;
      }
    }

    const equipmentData: Record<string, any> = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      type: formData.type,
      condition: formData.condition,
      status: formData.status,
      dateAcquired: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
    };

    if (formData.type === 'rental' && formData.rentalCost) {
      equipmentData.rentalCost = parseFloat(formData.rentalCost);
    }

    if (editingEquipment) {
      updateEquipment(editingEquipment.id, equipmentData);
      setDialogTitle('Success');
      setDialogMessage('Equipment updated successfully');
      setIsError(false);
      setShowDialog(true);
    } else {
      addEquipment(equipmentData);
      setDialogTitle('Success');
      setDialogMessage('Equipment added successfully');
      setIsError(false);
      setShowDialog(true);
    }
    
    setModalVisible(false);
    resetForm();
  };

  const handleDeleteEquipment = (equipmentId: string) => {
    setDeleteEquipmentId(equipmentId);
    setIsDeleteConfirm(true);
    setDialogTitle('Delete Equipment');
    setDialogMessage('Are you sure you want to delete this equipment?');
    setIsError(false);
    setShowDialog(true);
  };

  const confirmDelete = () => {
    if (deleteEquipmentId) {
      deleteEquipmentFromContext(deleteEquipmentId);
      setDeleteEquipmentId(null);
      setIsDeleteConfirm(false);
      setDialogTitle('Success');
      setDialogMessage('Equipment deleted successfully');
      setIsError(false);
    }
  };

  const getUsageColor = (usage: any) => {
    switch (usage) {
      case 'available':
        return constructionColors.complete;
      case 'in_use':
        return constructionColors.inProgress;
      case 'maintenance':
        return constructionColors.urgent;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getConditionColor = (condition: any) => {
    switch (condition) {
      case 'good':
        return constructionColors.inProgress;
      case 'fair':
        return constructionColors.warning;
      case 'needs_repair':
        return constructionColors.urgent;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };


  const ownedEquipment = equipment.filter(e => e.type === 'owned');
  const rentalEquipment = equipment.filter(e => e.type === 'rental');
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
            <Text style={styles.title}>Equipment Management</Text>
            <Text style={styles.subtitle}>Manage owned and rental equipment</Text>
          </View>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>{ownedEquipment.length}</Text>
            <Text style={styles.summaryLabel}>Owned</Text>
          </Card.Content>
        </Card>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>{rentalEquipment.length}</Text>
            <Text style={styles.summaryLabel}>Rental</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Equipment List */}
      <ScrollView style={styles.scrollView}>
        {equipment.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Ionicons 
                name="construct-outline" 
                size={48} 
                color={theme.colors.onSurfaceDisabled} 
              />
              <Text style={styles.emptyText}>No equipment added yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to add your first equipment
              </Text>
            </Card.Content>
          </Card>
        ) : (
          equipment.map((equip, index) => (
            <Card key={equip.id} style={styles.equipmentCard}>
              <Card.Content>
                <View style={styles.equipmentHeader}>
                  <View style={styles.equipmentInfo}>
                    <Text style={styles.equipmentName}>{equip.name}</Text>
                    <Text style={styles.equipmentType}>{equip.category}</Text>
                  </View>
                  <View style={styles.equipmentBadges}>
                    <Chip
                      style={[
                        styles.ownershipChip,
                        { backgroundColor: equip.type === 'owned' ? constructionColors.complete : constructionColors.inProgress }
                      ]}
                      textStyle={styles.chipText}
                    >
                      {equip.type === 'owned' ? 'Owned' : 'Rental'}
                    </Chip>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => openEditModal(equip)}
                      iconColor={theme.colors.primary}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteEquipment(equip.id)}
                      iconColor={constructionColors.urgent}
                    />
                  </View>
                </View>

                <View style={styles.equipmentDetails}>
                  <View style={styles.statusRow}>
                    <Chip
                      style={[styles.statusChip, { backgroundColor: getUsageColor(equip.status) }]}
                      textStyle={styles.statusText}
                    >
                      {equip.status.replace('_', ' ').toUpperCase()}
                    </Chip>
                    <Chip
                      style={[styles.statusChip, { backgroundColor: getConditionColor(equip.condition) }]}
                      textStyle={styles.statusText}
                    >
                      {equip.condition.replace('_', ' ').toUpperCase()}
                    </Chip>
                  </View>

                  {/* Rental Cost */}
                  {equip.type === 'rental' && (
                    <View style={styles.ratesContainer}>
                      <Text style={styles.ratesTitle}>Rental Cost:</Text>
                      <Text style={styles.rateText}>
                        ₱{equip.rentalCost ? equip.rentalCost.toLocaleString() : 'N/A'}
                      </Text>
                    </View>
                  )}


                </View>

                <Text style={styles.dateAdded}>
                  Added: {new Date(equip.dateAcquired).toLocaleDateString()}
                </Text>
              </Card.Content>
              {index < equipment.length - 1 && <Divider />}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add Equipment FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openAddModal}
        label="Add Equipment"
      />

      {/* Add/Edit Equipment Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
              </Text>

              <TextInput
                mode="outlined"
                label="Equipment Name *"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                style={styles.input}
              />

              <View style={styles.typeSelector}>
                <Text style={styles.typeLabel}>Equipment Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.typeChips}>
                    {equipmentTypes.map((cat) => (
                      <Chip
                        key={cat}
                        selected={formData.category === cat}
                        onPress={() => setFormData(prev => ({ ...prev, category: cat }))}
                        style={[
                          styles.typeChip,
                          formData.category === cat ? styles.selectedTypeChip : styles.unselectedTypeChip
                        ]}
                        textStyle={formData.category === cat ? styles.selectedChipText : styles.chipText}
                      >
                        {cat}
                      </Chip>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  mode="outlined"
                  label="Custom Category"
                  value={formData.category}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, category: text }))}
                  style={styles.customTypeInput}
                />
              </View>

              <View style={styles.ownershipSection}>
                <Text style={styles.ownershipLabel}>Ownership Status *</Text>
                <SegmentedButtons
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
                  buttons={[
                    { value: 'owned', label: 'Owned' },
                    { value: 'rental', label: 'Rental' },
                  ]}
                  style={styles.ownershipButtons}
                />
              </View>

              {/* Rental Cost (only show if rental) */}
              {formData.type === 'rental' && (
                <View style={styles.ratesSection}>
                  <TextInput
                    mode="outlined"
                    label="Rental Cost (₱) *"
                    value={formData.rentalCost}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, rentalCost: text }))}
                    keyboardType="numeric"
                    style={styles.input}
                    left={<TextInput.Icon icon="cash" />}
                    textColor={theme.colors.text}
                  />
                </View>
              )}

              <View style={styles.statusSection}>
                <Text style={styles.statusLabel}>Current Status</Text>
                <SegmentedButtons
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                  buttons={[
                    { value: 'available', label: 'Available', labelStyle: styles.segmentedButtonLabel },
                    { value: 'in_use', label: 'In Use', labelStyle: styles.segmentedButtonLabel },
                    { value: 'maintenance', label: 'Maintenance', labelStyle: styles.segmentedButtonLabel },
                  ]}
                  style={styles.statusButtons}
                />
              </View>

              <View style={styles.conditionSection}>
                <Text style={styles.conditionLabel}>Condition</Text>
                <View style={styles.conditionButtonsContainer}>
                  <SegmentedButtons
                    value={formData.condition}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value as any }))}
                    buttons={[
                      { value: 'good', label: 'Good', labelStyle: styles.segmentedButtonLabel },
                      { value: 'fair', label: 'Fair', labelStyle: styles.segmentedButtonLabel },
                      { value: 'needs_repair', label: 'Needs Repair', labelStyle: styles.segmentedButtonLabel },
                    ]}
                    style={styles.conditionButtons}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <Button onPress={() => setModalVisible(false)}>Cancel</Button>
                <Button 
                  mode="contained" 
                  onPress={saveEquipment}
                  buttonColor={constructionColors.complete}
                >
                  {editingEquipment ? 'Update' : 'Add'} Equipment
                </Button>
              </View>
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>

      {/* Dark Mode Dialog */}
      <Portal>
        <Dialog 
          visible={showDialog} 
          onDismiss={() => {
            setShowDialog(false);
            if (deleteEquipmentId && dialogTitle !== 'Delete Equipment') {
              setDeleteEquipmentId(null);
            }
          }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{dialogTitle}</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>{dialogMessage}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            {isDeleteConfirm ? (
              <>
                <Button 
                  onPress={() => {
                    setShowDialog(false);
                    setDeleteEquipmentId(null);
                    setIsDeleteConfirm(false);
                  }}
                  textColor={theme.colors.text}
                >
                  Cancel
                </Button>
                <Button 
                  onPress={() => {
                    confirmDelete();
                    // Keep dialog open to show success
                  }}
                  textColor={constructionColors.urgent}
                >
                  Delete
                </Button>
              </>
            ) : (
              <Button 
                onPress={() => {
                  setShowDialog(false);
                  if (deleteEquipmentId) {
                    setDeleteEquipmentId(null);
                    setIsDeleteConfirm(false);
                  }
                }}
                textColor={theme.colors.primary}
              >
                OK
              </Button>
            )}
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
  header: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
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

  // Summary
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  summaryContent: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryNumber: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // Equipment List
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  equipmentCard: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.surface,
    elevation: 2,
    borderRadius: theme.roundness,
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  equipmentType: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  equipmentBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownershipChip: {
    marginRight: spacing.sm,
  },
  equipmentDetails: {
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    marginHorizontal: -spacing.xs,
    overflow: 'visible',
  },
  statusChip: {
    paddingHorizontal: spacing.xs,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: fontSizes.xs,
  },
  chipText: {
    color: theme.colors.text,
    fontWeight: 'normal',
    fontSize: fontSizes.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  detailValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: theme.colors.text,
  },
  ratesContainer: {
    backgroundColor: constructionColors.inProgress + '20',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  ratesTitle: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  rateText: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
  },
  notesContainer: {
    marginTop: spacing.sm,
  },
  notesText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  dateAdded: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },

  // Empty state
  emptyCard: {
    marginTop: spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceDisabled,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: theme.colors.primary,
  },

  // Modal
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalSurface: {
    backgroundColor: theme.colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.background,
  },
  typeSelector: {
    marginBottom: spacing.md,
  },
  typeLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: spacing.sm,
    marginHorizontal: -spacing.xs,
  },
  typeChip: {
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  unselectedTypeChip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  selectedTypeChip: {
    backgroundColor: theme.colors.primaryContainer,
    borderWidth: 0,
  },
  customTypeInput: {
    marginTop: spacing.sm,
  },
  selectedChipText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: fontSizes.xs,
  },
  ownershipSection: {
    marginBottom: spacing.md,
  },
  ownershipLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  ownershipButtons: {
    marginBottom: spacing.md,
  },
  ratesSection: {
    marginBottom: spacing.md,
  },
  ratesLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  ratesInputs: {
    marginVertical: -spacing.xs,
  },
  rateInput: {
    flex: 1,
    marginVertical: spacing.xs,
  },
  statusSection: {
    marginBottom: spacing.md,
  },
  statusLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  statusButtons: {
    marginBottom: spacing.md,
  },
  conditionSection: {
    marginBottom: spacing.md,
  },
  conditionLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  conditionButtonsContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  conditionButtons: {
    marginBottom: spacing.md,
  },
  segmentedButtonLabel: {
    fontSize: 10,
    paddingHorizontal: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  modalActionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
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
});

