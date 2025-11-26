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
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const quantity = parseFloat(formData.quantity);
    const pricePerUnit = parseFloat(formData.pricePerUnit);

    const materialData: Record<string, any> = {
      name: formData.name.trim(),
      quantity,
      unit: formData.unit,
      price: pricePerUnit, // Using 'price' to match context interface
      category: 'Construction Materials', // Default category
      dateAdded: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
    };

    const supplierValue = formData.supplier.trim();
    if (supplierValue) {
      materialData.supplier = supplierValue;
    } else if (editingMaterial && editingMaterial.supplier) {
      materialData.supplier = editingMaterial.supplier;
    }

    if (editingMaterial) {
      updateMaterial(editingMaterial.id, materialData);
      Alert.alert('Success', 'Material updated successfully');
    } else {
      addMaterial(materialData);
      Alert.alert('Success', 'Material added successfully');
    }
    
    setModalVisible(false);
    resetForm();
  };

  const handleDeleteMaterial = (materialId: string) => {
    Alert.alert(
      'Delete Material',
      'Are you sure you want to delete this material?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMaterialFromContext(materialId);
            Alert.alert('Success', 'Material deleted successfully');
          },
        },
      ]
    );
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
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <Text style={styles.detailValue}>
                      {material.quantity} {material.unit}
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
                      ₱{(material.quantity * material.price).toFixed(2)}
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

            <TextInput
              mode="outlined"
              label="Material Name *"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              style={styles.input}
            />

            <View style={styles.inputRow}>
              <TextInput
                mode="outlined"
                label="Quantity *"
                value={formData.quantity}
                onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                keyboardType="numeric"
                style={[styles.input, styles.inputHalf]}
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
              left={<TextInput.Icon icon="currency-usd" />}
            />

            <TextInput
              mode="outlined"
              label="Supplier (Optional)"
              value={formData.supplier}
              onChangeText={(text) => setFormData(prev => ({ ...prev, supplier: text }))}
              style={styles.input}
            />



            {formData.quantity && formData.pricePerUnit && (
              <View style={styles.costPreview}>
                <Text style={styles.costPreviewText}>
                  Total Cost: ₱{(parseFloat(formData.quantity) * parseFloat(formData.pricePerUnit)).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Button onPress={() => setModalVisible(false)}>Cancel</Button>
              <Button 
                mode="contained" 
                onPress={saveMaterial}
                buttonColor={constructionColors.complete}
              >
                {editingMaterial ? 'Update' : 'Add'} Material
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
    color: theme.colors.onSurface,
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
    backgroundColor: 'white',
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
    backgroundColor: 'white',
    elevation: 2,
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
    color: theme.colors.onSurface,
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
    color: theme.colors.onSurface,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalActionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});

