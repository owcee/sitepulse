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
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    type: 'owned' as 'owned' | 'rental',
    condition: 'good' as 'excellent' | 'good' | 'fair' | 'needs_repair',
    status: 'available' as 'available' | 'in_use' | 'maintenance',
    dailyRate: '',
    weeklyRate: '',
    monthlyRate: '',
  });

  const equipmentTypes = [
    'Excavator', 'Bulldozer', 'Crane', 'Loader', 'Dump Truck', 'Concrete Mixer',
    'Scaffolding', 'Generator', 'Compressor', 'Welding Equipment', 'Power Tools', 'Other'
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      type: 'owned',
      condition: 'good',
      status: 'available',
      dailyRate: '',
      weeklyRate: '',
      monthlyRate: '',
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
      dailyRate: equip.dailyRate?.toString() || '',
      weeklyRate: equip.weeklyRate?.toString() || '',
      monthlyRate: equip.monthlyRate?.toString() || '',
    });
    setEditingEquipment(equip);
    setModalVisible(true);
  };

  const saveEquipment = () => {
    if (!formData.name.trim() || !formData.category.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // If rental, at least one rate must be provided
    if (formData.type === 'rental' && 
        !formData.dailyRate && !formData.weeklyRate && !formData.monthlyRate) {
      Alert.alert('Error', 'For rental equipment, please provide at least one rate (daily, weekly, or monthly)');
      return;
    }

    const equipmentData: Record<string, any> = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      type: formData.type,
      condition: formData.condition,
      status: formData.status,
      dateAcquired: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
    };

    if (formData.dailyRate) {
      equipmentData.dailyRate = parseFloat(formData.dailyRate);
    }
    if (formData.weeklyRate) {
      equipmentData.weeklyRate = parseFloat(formData.weeklyRate);
    }
    if (formData.monthlyRate) {
      equipmentData.monthlyRate = parseFloat(formData.monthlyRate);
    }

    if (editingEquipment) {
      updateEquipment(editingEquipment.id, equipmentData);
      Alert.alert('Success', 'Equipment updated successfully');
    } else {
      addEquipment(equipmentData);
      Alert.alert('Success', 'Equipment added successfully');
    }
    
    setModalVisible(false);
    resetForm();
  };

  const handleDeleteEquipment = (equipmentId: string) => {
    Alert.alert(
      'Delete Equipment',
      'Are you sure you want to delete this equipment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteEquipmentFromContext(equipmentId);
            Alert.alert('Success', 'Equipment deleted successfully');
          },
        },
      ]
    );
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
      case 'excellent':
        return constructionColors.complete;
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

  const getPreferredRentalRate = (equip: any) => {
    if (equip.dailyRate) {
      return { label: 'Daily', value: equip.dailyRate };
    }
    if (equip.weeklyRate) {
      return { label: 'Weekly', value: equip.weeklyRate };
    }
    if (equip.monthlyRate) {
      return { label: 'Monthly', value: equip.monthlyRate };
    }
    return null;
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

                  {/* Rental Rates */}
                  {equip.type === 'rental' && (
                    <View style={styles.ratesContainer}>
                      <Text style={styles.ratesTitle}>Rental Rate:</Text>
                      {(() => {
                        const preferredRate = getPreferredRentalRate(equip);
                        return preferredRate ? (
                          <Text style={styles.rateText}>
                            {preferredRate.label}: ₱{preferredRate.value.toLocaleString()}
                          </Text>
                        ) : (
                          <Text style={styles.rateText}>N/A</Text>
                        );
                      })()}
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
                        style={styles.typeChip}
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

              {/* Rental Rates (only show if rental) */}
              {formData.type === 'rental' && (
                <View style={styles.ratesSection}>
                  <Text style={styles.ratesLabel}>Rental Rates (at least one required)</Text>
                  <View style={styles.ratesInputs}>
                    <TextInput
                      mode="outlined"
                      label="Daily Rate (₱)"
                      value={formData.dailyRate}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, dailyRate: text }))}
                      keyboardType="numeric"
                      style={[styles.input, styles.rateInput]}
                      left={<TextInput.Icon icon="currency-usd" />}
                    />
                    <TextInput
                      mode="outlined"
                      label="Weekly Rate (₱)"
                      value={formData.weeklyRate}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, weeklyRate: text }))}
                      keyboardType="numeric"
                      style={[styles.input, styles.rateInput]}
                      left={<TextInput.Icon icon="currency-usd" />}
                    />
                    <TextInput
                      mode="outlined"
                      label="Monthly Rate (₱)"
                      value={formData.monthlyRate}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, monthlyRate: text }))}
                      keyboardType="numeric"
                      style={[styles.input, styles.rateInput]}
                      left={<TextInput.Icon icon="currency-usd" />}
                    />
                  </View>
                </View>
              )}

              <View style={styles.statusSection}>
                <Text style={styles.statusLabel}>Current Status</Text>
                <SegmentedButtons
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                  buttons={[
                    { value: 'available', label: 'Available' },
                    { value: 'in_use', label: 'In Use' },
                    { value: 'maintenance', label: 'Maintenance' },
                  ]}
                  style={styles.statusButtons}
                />
              </View>

              <View style={styles.conditionSection}>
                <Text style={styles.conditionLabel}>Condition</Text>
                <SegmentedButtons
                  value={formData.condition}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value as any }))}
                  buttons={[
                    { value: 'excellent', label: 'Excellent' },
                    { value: 'good', label: 'Good' },
                    { value: 'fair', label: 'Fair' },
                    { value: 'needs_repair', label: 'Needs Repair' },
                  ]}
                  style={styles.conditionButtons}
                />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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

  // Summary
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
    backgroundColor: 'white',
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
    backgroundColor: 'white',
    elevation: 2,
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
    color: theme.colors.onSurface,
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
    color: 'white',
    fontWeight: 'bold',
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
    color: theme.colors.onSurface,
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
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  rateText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurface,
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
    backgroundColor: 'white',
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
    backgroundColor: constructionColors.complete,
  },

  // Modal
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalSurface: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
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
  conditionButtons: {
    marginBottom: spacing.md,
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
});

