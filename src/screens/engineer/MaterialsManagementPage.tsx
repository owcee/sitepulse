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
  Dialog,
  Paragraph,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';

export default function MaterialsManagementPage() {
  const navigation = useNavigation();
  const { state, addMaterial, updateMaterial, deleteMaterial: deleteMaterialFromContext } = useProjectData();
  const materials = state.materials;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [isError, setIsError] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'pcs',
    pricePerUnit: '',
    supplier: '',
  });

  const units = ['pcs', 'kg', 'lbs', 'ft', 'm', 'bags', 'boxes', 'pallets'];

  const resetForm = () => {
    setFormData({
      name: '',
      quantity: '',
      unit: 'pcs',
      pricePerUnit: '',
      supplier: '',
    });
    setEditingMaterial(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (material: any) => {
    setFormData({
      name: material.name,
      quantity: material.quantity.toString(),
      unit: material.unit,
      pricePerUnit: material.price.toString(), // Using 'price' from context
      supplier: material.supplier || '',
    });
    setEditingMaterial(material);
    setModalVisible(true);
  };

  const saveMaterial = () => {
    if (!formData.name.trim() || !formData.quantity || !formData.pricePerUnit) {
      setDialogTitle('Error');
      setDialogMessage('Please fill in all required fields');
      setIsError(true);
      setShowDialog(true);
      return;
    }

    const quantity = parseFloat(formData.quantity);
    const pricePerUnit = parseFloat(formData.pricePerUnit);

    // Prevent decreasing quantity when editing
    if (editingMaterial) {
      const currentQuantity = editingMaterial.quantity || 0;
      if (quantity < currentQuantity) {
        setDialogTitle('Error');
        setDialogMessage('Quantity cannot be decreased. You can only increase the quantity.');
        setIsError(true);
        setShowDialog(true);
        return;
      }
    }

    const materialData: Record<string, any> = {
      name: formData.name.trim(),
      quantity,
      unit: formData.unit,
      price: pricePerUnit, // Using 'price' to match context interface
      category: 'Construction Materials', // Default category
      dateAdded: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
    };

    if (!editingMaterial) {
      // Initial purchase quantity - set totalBought to the initial quantity
      materialData.totalBought = quantity;
    }
    // When editing, do NOT include totalBought in materialData
    // This ensures totalBought is preserved and not updated when editing

    const supplierValue = formData.supplier.trim();
    if (supplierValue) {
      materialData.supplier = supplierValue;
    } else if (editingMaterial && editingMaterial.supplier) {
      materialData.supplier = editingMaterial.supplier;
    }

    if (editingMaterial) {
      updateMaterial(editingMaterial.id, materialData as any);
      setDialogTitle('Success');
      setDialogMessage('Material updated successfully');
      setIsError(false);
      setShowDialog(true);
    } else {
      addMaterial(materialData as any);
      setDialogTitle('Success');
      setDialogMessage('Material added successfully');
      setIsError(false);
      setShowDialog(true);
    }
    
    setModalVisible(false);
    resetForm();
  };

  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);

  const handleDeleteMaterial = (materialId: string) => {
    setDeleteMaterialId(materialId);
    setIsDeleteConfirm(true);
    setDialogTitle('Delete Material');
    setDialogMessage('Are you sure you want to delete this material?');
    setIsError(false);
    setShowDialog(true);
  };

  const confirmDelete = () => {
    if (deleteMaterialId) {
      deleteMaterialFromContext(deleteMaterialId);
      setDeleteMaterialId(null);
      setIsDeleteConfirm(false);
      setDialogTitle('Success');
      setDialogMessage('Material deleted successfully');
      setIsError(false);
    }
  };

  const totalCost = materials.reduce((sum, material) => sum + (material.quantity * material.price), 0);

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
            <Text style={styles.title}>Materials Management</Text>
            <Text style={styles.subtitle}>Add and manage construction materials</Text>
          </View>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>{materials.length}</Text>
            <Text style={styles.summaryLabel}>Total Items</Text>
          </Card.Content>
        </Card>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>₱{totalCost.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Total Value</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Materials List */}
      <ScrollView style={styles.scrollView}>
        {materials.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Ionicons 
                name="cube-outline" 
                size={48} 
                color={theme.colors.onSurfaceDisabled} 
              />
              <Text style={styles.emptyText}>No materials added yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to add your first material
              </Text>
            </Card.Content>
          </Card>
        ) : (
          materials.map((material, index) => (
            <Card key={material.id} style={styles.materialCard}>
              <Card.Content>
                <View style={styles.materialHeader}>
                  <Text style={styles.materialName}>{material.name}</Text>
                  <View style={styles.materialActions}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => openEditModal(material)}
                      iconColor={theme.colors.primary}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteMaterial(material.id)}
                      iconColor={constructionColors.urgent}
                    />
                  </View>
                </View>

                <View style={styles.materialDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>
                      <Text style={{ fontWeight: 'bold', color: constructionColors.complete }}>
                        {material.quantity} available out of {material.totalBought || material.quantity}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Price per {material.unit}:</Text>
                    <Text style={styles.detailValue}>
                      ₱{material.price.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Cost:</Text>
                    <Text style={[styles.detailValue, styles.totalCost]}>
                      ₱{((material.totalBought || material.quantity) * material.price).toFixed(2)}
                    </Text>
                  </View>
                  {material.supplier && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Supplier:</Text>
                      <Text style={styles.detailValue}>{material.supplier}</Text>
                    </View>
                  )}

                </View>

                <Text style={styles.dateAdded}>
                  Added: {new Date(material.dateAdded).toLocaleDateString()}
                </Text>
              </Card.Content>
              {index < materials.length - 1 && <Divider />}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add Material FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openAddModal}
        label="Add Material"
      />

      {/* Add/Edit Material Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <Text style={styles.modalTitle}>
              {editingMaterial ? 'Edit Material' : 'Add New Material'}
            </Text>

            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                mode="outlined"
                label="Material Name *"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                style={styles.input}
                textColor={theme.colors.text}
              />

              <View style={styles.inputRow}>
                <TextInput
                  mode="outlined"
                  label="Quantity *"
                  value={formData.quantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                  keyboardType="numeric"
                  style={[styles.input, styles.inputHalf]}
                  textColor={theme.colors.text}
                />
                
                <View style={styles.unitSelector}>
                  <Text style={styles.unitLabel}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.unitChips}>
                      {units.map((unit) => (
                        <Chip
                          key={unit}
                          selected={formData.unit === unit}
                          onPress={() => setFormData(prev => ({ ...prev, unit }))}
                          style={styles.unitChip}
                          textStyle={formData.unit === unit ? styles.selectedChipText : styles.chipText}
                        >
                          {unit}
                        </Chip>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <TextInput
                mode="outlined"
                label="Price per Unit (₱) *"
                value={formData.pricePerUnit}
                onChangeText={(text) => setFormData(prev => ({ ...prev, pricePerUnit: text }))}
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Icon icon="cash" />}
                textColor={theme.colors.text}
              />

              <TextInput
                mode="outlined"
                label="Supplier (Optional)"
                value={formData.supplier}
                onChangeText={(text) => setFormData(prev => ({ ...prev, supplier: text }))}
                style={styles.input}
                textColor={theme.colors.text}
              />

              {formData.quantity && formData.pricePerUnit && (
                <View style={styles.costPreview}>
                  <Text style={styles.costPreviewText}>
                    Total Cost: ₱{(parseFloat(formData.quantity) * parseFloat(formData.pricePerUnit)).toFixed(2)}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button 
                onPress={() => setModalVisible(false)}
                style={styles.modalActionButton}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={saveMaterial}
                buttonColor={constructionColors.complete}
                style={styles.modalActionButton}
              >
                {editingMaterial ? 'Update' : 'Add'}
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* Dark Mode Dialog */}
      <Portal>
        <Dialog 
          visible={showDialog} 
          onDismiss={() => {
            setShowDialog(false);
            if (deleteMaterialId && dialogTitle !== 'Delete Material') {
              setDeleteMaterialId(null);
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
                    setDeleteMaterialId(null);
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
                  if (deleteMaterialId) {
                    setDeleteMaterialId(null);
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
    color: theme.colors.text,
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
    marginHorizontal: spacing.sm,
    backgroundColor: theme.colors.surface,
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

  // Materials List
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  materialCard: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.surface,
    elevation: 2,
    borderRadius: theme.roundness,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  materialName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  materialActions: {
    flexDirection: 'row',
  },
  materialDetails: {
    marginBottom: spacing.md,
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
  totalCost: {
    color: constructionColors.complete,
    fontWeight: 'bold',
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
    maxHeight: '95%',
  },
  modalScrollView: {
    maxHeight: 450,
    marginBottom: spacing.sm,
  },
  modalScrollContent: {
    paddingBottom: spacing.sm,
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
  inputRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  inputHalf: {
    flex: 1,
    marginBottom: 0,
    marginHorizontal: spacing.xs,
  },
  unitSelector: {
    flex: 1,
  },
  unitLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  unitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  unitChip: {
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  chipText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: fontSizes.xs,
  },
  selectedChipText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: fontSizes.xs,
  },
  costPreview: {
    backgroundColor: constructionColors.complete + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  costPreviewText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: constructionColors.complete,
    textAlign: 'center',
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  modalActionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
    minWidth: 120,
  },
});

