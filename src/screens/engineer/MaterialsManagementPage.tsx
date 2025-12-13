import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Button,
  IconButton,
  Divider,
  Chip,
  FAB,
  Portal,
  Modal,
  Surface,
  Dialog,
  Paragraph,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import {
  getElectricalMaterials,
  searchElectricalMaterials,
  getElectricalMaterialCategories,
  ElectricalMaterial,
} from '../../services/electricalMaterialsService';

type ViewMode = 'electrical' | 'custom';

export default function MaterialsManagementPage() {
  const navigation = useNavigation();
  const { state, addMaterial, updateMaterial, deleteMaterial: deleteMaterialFromContext } = useProjectData();
  const materials = state.materials;
  
  // View mode: electrical materials list or custom materials
  const [viewMode, setViewMode] = useState<ViewMode>('electrical');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [selectedElectricalMaterial, setSelectedElectricalMaterial] = useState<ElectricalMaterial | null>(null);
  const [selectedMaterialGroup, setSelectedMaterialGroup] = useState<Array<{ material: ElectricalMaterial; hasVariants: boolean; variants?: ElectricalMaterial[] }>[number] | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [isError, setIsError] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    customPrice: '',
    useDefaultPrice: true,
    dimensions: '', // For mm size, length, etc.
  });

  // Get electrical materials from hardcoded list
  const electricalMaterials = useMemo(() => {
    if (searchQuery.trim()) {
      return searchElectricalMaterials(searchQuery);
    }
    return getElectricalMaterials();
  }, [searchQuery]);

  // Group materials by base name (for materials with different sizes like mm)
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, ElectricalMaterial[]> = {};
    
    electricalMaterials.forEach(material => {
      // Extract base name (remove size indicators like "20mm", "25mm", "14 AWG", etc.)
      let baseName = material.name;
      
      // Remove common size patterns
      baseName = baseName.replace(/\d+mm\s*/g, '').trim();
      baseName = baseName.replace(/\d+\/\d+\s*/g, '').trim(); // Remove "14/2", "12/2"
      baseName = baseName.replace(/\d+\s*AWG\s*/g, '').trim(); // Remove "14 AWG", "12 AWG"
      baseName = baseName.replace(/\([^)]*\)/g, '').trim(); // Remove parentheses content
      baseName = baseName.replace(/\s+/g, ' ').trim(); // Clean up multiple spaces
      
      // For materials like "PVC Conduit", "THHN Wire", group them
      if (!groups[baseName]) {
        groups[baseName] = [];
      }
      groups[baseName].push(material);
    });
    
    return groups;
  }, [electricalMaterials]);

  // Flatten grouped materials - if a material has variants, show it once; if not, show as is
  const displayMaterials = useMemo(() => {
    const result: Array<{ material: ElectricalMaterial; hasVariants: boolean; variants?: ElectricalMaterial[] }> = [];
    const processed = new Set<string>();
    
    Object.entries(groupedMaterials).forEach(([baseName, variants]) => {
      if (variants.length > 1) {
        // Group has multiple variants - show the first one as representative
        if (!processed.has(variants[0].material_id)) {
          result.push({
            material: variants[0],
            hasVariants: true,
            variants: variants,
          });
          variants.forEach(v => processed.add(v.material_id));
        }
      } else {
        // Single material, no variants
        if (!processed.has(variants[0].material_id)) {
          result.push({
            material: variants[0],
            hasVariants: false,
          });
          processed.add(variants[0].material_id);
        }
      }
    });
    
    // Sort alphabetically by material name
    return result.sort((a, b) => a.material.name.localeCompare(b.material.name));
  }, [groupedMaterials]);

  // Get custom materials (already in inventory)
  const customMaterials = useMemo(() => {
    const allMaterials = materials;
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      return allMaterials.filter(
        m => 
          m.name.toLowerCase().includes(searchLower) ||
          (m.category && m.category.toLowerCase().includes(searchLower))
      );
    }
    return allMaterials;
  }, [materials, searchQuery]);

  // Get low stock materials (quantity < 4)
  const lowStockMaterials = useMemo(() => {
    return customMaterials.filter(m => m.quantity < 4);
  }, [customMaterials]);

  const resetForm = () => {
    setFormData({
      name: '',
      quantity: '',
      customPrice: '',
      useDefaultPrice: true,
      dimensions: '',
    });
    setEditingMaterial(null);
    setSelectedElectricalMaterial(null);
  };

  const openAddElectricalModal = (electricalMaterial: ElectricalMaterial) => {
    setSelectedElectricalMaterial(electricalMaterial);
    setFormData({
      name: '',
      quantity: '',
      customPrice: '',
      useDefaultPrice: true,
      dimensions: '',
    });
    setModalVisible(true);
  };

  const openAddCustomModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (material: any) => {
    setEditingMaterial(material);
    setSelectedElectricalMaterial(null);
    setFormData({
      name: material.name || '',
      quantity: material.quantity.toString(),
      customPrice: material.price?.toString() || '',
      useDefaultPrice: false, // When editing, allow custom price
      dimensions: '',
    });
    setModalVisible(true);
  };

  const saveMaterial = () => {
    // Adding electrical material from hardcoded list
    if (selectedElectricalMaterial) {
      if (!formData.quantity.trim()) {
        setDialogTitle('Error');
        setDialogMessage('Please enter quantity');
        setIsError(true);
        setShowDialog(true);
        return;
      }

      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        setDialogTitle('Error');
        setDialogMessage('Please enter a valid quantity');
        setIsError(true);
        setShowDialog(true);
        return;
      }

      // Check if this electrical material is already in inventory
      const existingMaterial = customMaterials.find(m => (m as any).material_id === selectedElectricalMaterial.material_id);
      if (existingMaterial) {
        setDialogTitle('Material Already Exists');
        setDialogMessage(`${selectedElectricalMaterial.name} is already in inventory. Please edit the existing entry instead.`);
        setIsError(true);
        setShowDialog(true);
        return;
      }

      // Determine final price
      let finalPrice = selectedElectricalMaterial.unit_cost;
      if (!formData.useDefaultPrice) {
        const customPriceValue = parseFloat(formData.customPrice);
        if (isNaN(customPriceValue) || customPriceValue <= 0) {
          setDialogTitle('Error');
          setDialogMessage('Please enter a valid custom price');
          setIsError(true);
          setShowDialog(true);
          return;
        }
        finalPrice = customPriceValue;
      }

      // Build material name with dimensions if provided
      let materialName = selectedElectricalMaterial.name;
      if (formData.dimensions.trim()) {
        materialName = `${selectedElectricalMaterial.name} (${formData.dimensions.trim()})`;
      }

      const materialData: Record<string, any> = {
        name: materialName,
        quantity,
        unit: selectedElectricalMaterial.unit,
        price: finalPrice,
        category: selectedElectricalMaterial.category,
        dateAdded: new Date().toISOString().split('T')[0],
        totalBought: quantity,
        material_id: selectedElectricalMaterial.material_id,
        min_threshold: 4,
      };

      addMaterial(materialData as any);
      setDialogTitle('Success');
      setDialogMessage(`${selectedElectricalMaterial.name} added to inventory`);
      setIsError(false);
      setShowDialog(true);
      setModalVisible(false);
      resetForm();
      return;
    }

    // Editing existing material
    if (editingMaterial) {
      if (!formData.quantity.trim()) {
        setDialogTitle('Error');
        setDialogMessage('Please enter quantity');
        setIsError(true);
        setShowDialog(true);
        return;
      }

      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        setDialogTitle('Error');
        setDialogMessage('Please enter a valid quantity');
        setIsError(true);
        setShowDialog(true);
        return;
      }

      // Prevent decreasing quantity
      const currentQuantity = editingMaterial.quantity || 0;
      if (quantity < currentQuantity) {
        setDialogTitle('Error');
        setDialogMessage('Quantity cannot be decreased. You can only increase the quantity.');
        setIsError(true);
        setShowDialog(true);
        return;
      }

      // Update totalBought: ensure it's always >= quantity
      // When increasing quantity, add the difference to totalBought
      const currentTotalBought = (editingMaterial as any).totalBought || currentQuantity;
      const quantityDifference = quantity - currentQuantity;
      // Ensure totalBought is always at least equal to quantity (fixes any data inconsistencies)
      const newTotalBought = Math.max(currentTotalBought + quantityDifference, quantity);

      // Handle price update (only allow increasing price)
      const currentPrice = editingMaterial.price || 0;
      let newPrice = currentPrice;
      
      if (formData.customPrice.trim()) {
        const customPriceValue = parseFloat(formData.customPrice);
        if (isNaN(customPriceValue) || customPriceValue <= 0) {
          setDialogTitle('Error');
          setDialogMessage('Please enter a valid price');
          setIsError(true);
          setShowDialog(true);
          return;
        }
        
        // Prevent decreasing price
        if (customPriceValue < currentPrice) {
          setDialogTitle('Error');
          setDialogMessage('Price cannot be decreased. You can only increase the price.');
          setIsError(true);
          setShowDialog(true);
          return;
        }
        
        newPrice = customPriceValue;
      }

      const updates: Record<string, any> = {
        quantity,
        totalBought: newTotalBought, // Update totalBought when quantity increases
        price: newPrice, // Update price if changed
      };

      if (formData.name.trim()) {
        updates.name = formData.name.trim();
      }

      updateMaterial(editingMaterial.id, updates);
      setDialogTitle('Success');
      setDialogMessage('Material updated successfully');
      setIsError(false);
      setShowDialog(true);
      setModalVisible(false);
      resetForm();
      return;
    }

    // Adding custom material (for manual tasks)
    if (!formData.name.trim() || !formData.quantity.trim()) {
      setDialogTitle('Error');
      setDialogMessage('Please enter material name and quantity');
      setIsError(true);
      setShowDialog(true);
      return;
    }

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setDialogTitle('Error');
      setDialogMessage('Please enter a valid quantity');
      setIsError(true);
      setShowDialog(true);
      return;
    }

    const pricePerUnit = formData.customPrice ? parseFloat(formData.customPrice) : 0;
    if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
      setDialogTitle('Error');
      setDialogMessage('Please enter a valid price');
      setIsError(true);
      setShowDialog(true);
      return;
    }

    const materialData: Record<string, any> = {
      name: formData.name.trim(),
      quantity,
      unit: 'pcs', // Default unit for custom materials
      price: pricePerUnit,
      category: 'Custom',
      dateAdded: new Date().toISOString().split('T')[0],
      totalBought: quantity,
      min_threshold: 4,
    };

    addMaterial(materialData as any);
    setDialogTitle('Success');
    setDialogMessage('Custom material added successfully');
    setIsError(false);
    setShowDialog(true);
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

  // Calculate total value - match ResourcesScreen calculation exactly
  // Use the maximum of totalBought and quantity to ensure correct total value
  const totalCost = customMaterials.reduce((sum, material) => {
    const totalBought = (material as any).totalBought;
    // Use the higher value: if totalBought exists, use max(totalBought, quantity), otherwise use quantity
    // This ensures we always show the correct total value even if totalBought hasn't been updated yet
    const qty = totalBought !== undefined ? Math.max(totalBought, material.quantity) : material.quantity;
    return sum + (qty * material.price);
  }, 0);

  // Check if electrical material is already in inventory
  const isElectricalMaterialInInventory = (materialId: string) => {
    return customMaterials.some(m => (m as any).material_id === materialId);
  };

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
            <Text style={styles.title}>Materials Inventory</Text>
            <Text style={styles.subtitle}>Manage electrical materials and custom items</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          mode="outlined"
          placeholder="Search materials..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={
            searchQuery ? (
              <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} />
            ) : null
          }
          textColor={theme.colors.text}
        />
      </View>

      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
          buttons={[
            {
              value: 'electrical',
              label: 'Electrical',
              icon: 'flash',
              style: { minWidth: 100 },
              labelStyle: { fontSize: fontSizes.xs },
            },
            {
              value: 'custom',
              label: 'Inventory',
              icon: 'package-variant',
              style: { minWidth: 100 },
              labelStyle: { fontSize: fontSizes.xs },
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>


      {/* Summary Cards */}
      {viewMode === 'custom' && (
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <Text style={styles.summaryNumber}>{customMaterials.length}</Text>
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
      )}

      {/* Materials List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {viewMode === 'electrical' ? (
          // Electrical Materials List (from hardcoded list)
          electricalMaterials.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Ionicons 
                  name="flash-outline" 
                  size={48} 
                  color={theme.colors.onSurfaceDisabled} 
                />
                <Text style={styles.emptyText}>No materials found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your search
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.materialsGrid}>
              {displayMaterials.map((materialGroup) => {
                const material = materialGroup.material;
                const isInInventory = isElectricalMaterialInInventory(material.material_id);
                const existingMaterial = customMaterials.find(m => (m as any).material_id === material.material_id);
                const isLowStock = existingMaterial && existingMaterial.quantity < 4;

                return (
                  <TouchableOpacity
                    key={material.material_id}
                    style={[
                      styles.materialGridItem,
                      isInInventory && styles.materialGridItemInInventory,
                      isLowStock && styles.materialGridItemLowStock,
                    ]}
                    onPress={() => {
                      // If material is already in inventory, open edit modal instead
                      if (isInInventory && existingMaterial) {
                        openEditModal(existingMaterial);
                      } else if (materialGroup.hasVariants && materialGroup.variants) {
                        setSelectedMaterialGroup(materialGroup);
                        setVariantModalVisible(true);
                      } else {
                        openAddElectricalModal(material);
                      }
                    }}
                    disabled={isInInventory && !existingMaterial}
                  >
                    <View style={styles.materialGridContent}>
                      <Text style={styles.materialGridName} numberOfLines={3}>
                        {material.name}
                      </Text>
                      {materialGroup.hasVariants && (
                        <Text style={styles.materialGridVariantText}>
                          {materialGroup.variants?.length} sizes
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        ) : (
          // Custom Materials List (already in inventory)
          customMaterials.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                  <Ionicons 
                  name="cube-outline"
                  size={48} 
                  color={theme.colors.onSurfaceDisabled} 
                />
                <Text style={styles.emptyText}>No materials in inventory</Text>
                <Text style={styles.emptySubtext}>
                  Switch to "Electrical Materials" to add from the list
                </Text>
              </Card.Content>
            </Card>
          ) : (
            customMaterials.map((material, index) => {
              const threshold = (material as any).min_threshold || 4;
              const isLowStock = material.quantity < threshold;

              return (
                <Card key={material.id} style={styles.materialCard}>
                  <Card.Content>
                    <View style={styles.materialHeader}>
                      <View style={styles.materialNameContainer}>
                        <Text style={styles.materialName}>{material.name}</Text>
                      </View>
                      {isLowStock && (
                        <Chip 
                          icon="alert" 
                          style={[styles.lowStockChip, { backgroundColor: constructionColors.urgent }]}
                          textStyle={{ color: 'white', fontSize: 12 }}
                        >
                          LOW STOCK
                        </Chip>
                      )}
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
                        <Text style={styles.detailLabel}>Stock:</Text>
                        <Text style={[
                          styles.detailValue,
                          isLowStock && { color: constructionColors.urgent, fontWeight: 'bold' }
                        ]}>
                          {material.quantity} {material.unit} available
                          {(material as any).totalBought && (material as any).totalBought >= material.quantity && ` out of ${(material as any).totalBought}`}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Price per {material.unit}:</Text>
                        <Text style={styles.detailValue}>₱{material.price.toFixed(2)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total Value:</Text>
                        <Text style={[styles.detailValue, styles.totalCost]}>
                          ₱{(() => {
                            const totalBought = (material as any).totalBought;
                            // Use the higher value: max(totalBought, quantity) to ensure correct total
                            const qty = totalBought !== undefined ? Math.max(totalBought, material.quantity) : material.quantity;
                            return (qty * material.price).toFixed(2);
                          })()}
                        </Text>
                      </View>
                      {material.dateAdded && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Date Added:</Text>
                          <Text style={styles.detailValue}>
                            {new Date(material.dateAdded).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </Text>
                        </View>
                      )}
                      {material.supplier && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Supplier:</Text>
                          <Text style={styles.detailValue}>{material.supplier}</Text>
                        </View>
                      )}
                    </View>
                  </Card.Content>
                  {index < customMaterials.length - 1 && <Divider />}
                </Card>
              );
            })
          )
        )}
      </ScrollView>

      {/* Add Custom Material FAB (only in custom view) */}
      {viewMode === 'custom' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={openAddCustomModal}
          label="Add Custom"
        />
      )}

      {/* Variant Selection Modal */}
      <Portal>
        <Modal
          visible={variantModalVisible}
          onDismiss={() => {
            setVariantModalVisible(false);
            setSelectedMaterialGroup(null);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <Text style={styles.modalTitle}>Select Size/Variant</Text>
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedMaterialGroup?.variants?.map((variant: ElectricalMaterial) => {
                const variantInInventory = isElectricalMaterialInInventory(variant.material_id);
                const existingVariantMaterial = customMaterials.find(m => (m as any).material_id === variant.material_id);
                
                return (
                  <TouchableOpacity
                    key={variant.material_id}
                    style={[
                      styles.variantItem,
                      variantInInventory && styles.variantItemInInventory
                    ]}
                    onPress={() => {
                      setVariantModalVisible(false);
                      if (variantInInventory && existingVariantMaterial) {
                        openEditModal(existingVariantMaterial);
                      } else {
                        openAddElectricalModal(variant);
                      }
                      setSelectedMaterialGroup(null);
                    }}
                  >
                    <Text style={styles.variantItemName}>{variant.name}</Text>
                    <Text style={styles.variantItemUnit}>{variant.unit}</Text>
                    {variantInInventory && (
                      <Text style={styles.variantItemInInventoryText}>Already in inventory</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Button 
              onPress={() => {
                setVariantModalVisible(false);
                setSelectedMaterialGroup(null);
              }}
            >
              Cancel
            </Button>
          </Surface>
        </Modal>
      </Portal>

      {/* Add/Edit Material Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => {
            setModalVisible(false);
            resetForm();
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <Text style={styles.modalTitle}>
              {selectedElectricalMaterial 
                ? `Add ${selectedElectricalMaterial.name}`
                : editingMaterial 
                  ? 'Update Stock'
                  : 'Add Custom Material'
              }
            </Text>

            {selectedElectricalMaterial && (
              <Card style={styles.infoCard}>
                <Card.Content>
                  <Paragraph style={styles.infoText}>
                    <Text style={styles.infoLabel}>Unit:</Text> {selectedElectricalMaterial.unit}
                  </Paragraph>
                  <Paragraph style={styles.infoText}>
                    <Text style={styles.infoLabel}>Category:</Text> {selectedElectricalMaterial.category}
                  </Paragraph>
                  <Paragraph style={styles.infoText}>
                    <Text style={styles.infoLabel}>Default Price:</Text>
                  </Paragraph>
                  <Paragraph style={[styles.infoText, styles.priceText]}>
                    ₱{selectedElectricalMaterial.unit_cost.toFixed(2)} per {selectedElectricalMaterial.unit}
                  </Paragraph>
                </Card.Content>
              </Card>
            )}

            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                mode="outlined"
                label="Quantity *"
                value={formData.quantity}
                onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                keyboardType="numeric"
                style={styles.input}
                textColor={theme.colors.text}
                placeholder={selectedElectricalMaterial ? `Enter quantity in ${selectedElectricalMaterial.unit}` : "Enter quantity"}
              />

              {/* Dimensions/Specifications (for mm size, length, etc.) */}
              {selectedElectricalMaterial && (
                <TextInput
                  mode="outlined"
                  label="Dimensions/Specifications (Optional)"
                  value={formData.dimensions}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, dimensions: text }))}
                  style={styles.input}
                  textColor={theme.colors.text}
                  placeholder="e.g., 25mm, 6-inch, 12 AWG"
                />
              )}

              {/* Price Selection */}
              {selectedElectricalMaterial && (
                <View style={styles.priceSection}>
                  <Text style={styles.priceSectionLabel}>Price per {selectedElectricalMaterial.unit}</Text>
                  <View style={styles.priceOptions}>
                    <Button
                      mode={formData.useDefaultPrice ? "contained" : "outlined"}
                      onPress={() => setFormData(prev => ({ ...prev, useDefaultPrice: true, customPrice: '' }))}
                      style={styles.priceOptionButton}
                      buttonColor={formData.useDefaultPrice ? theme.colors.primary : undefined}
                      labelStyle={styles.priceButtonLabelSmall}
                    >
                      Default: ₱{selectedElectricalMaterial.unit_cost.toFixed(2)}
                    </Button>
                    <Button
                      mode={!formData.useDefaultPrice ? "contained" : "outlined"}
                      onPress={() => setFormData(prev => ({ ...prev, useDefaultPrice: false }))}
                      style={styles.priceOptionButton}
                      buttonColor={!formData.useDefaultPrice ? theme.colors.primary : undefined}
                      labelStyle={styles.priceButtonLabelSmall}
                    >
                      Custom
                    </Button>
                  </View>
                  {!formData.useDefaultPrice && (
                    <TextInput
                      mode="outlined"
                      label="Enter Custom Price (₱)"
                      value={formData.customPrice}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, customPrice: text }))}
                      keyboardType="numeric"
                      style={styles.input}
                      textColor={theme.colors.text}
                      placeholder={`Default: ₱${selectedElectricalMaterial.unit_cost.toFixed(2)}`}
                    />
                  )}
                </View>
              )}

              {/* Price Field for Editing Materials */}
              {editingMaterial && (
                <View style={styles.priceSection}>
                  <Text style={styles.priceSectionLabel}>Price per {editingMaterial.unit}</Text>
                  <TextInput
                    mode="outlined"
                    label="Price per Unit (₱) *"
                    value={formData.customPrice}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, customPrice: text }))}
                    keyboardType="numeric"
                    style={styles.input}
                    textColor={theme.colors.text}
                    placeholder={`Current: ₱${editingMaterial.price.toFixed(2)}`}
                  />
                  <Paragraph style={styles.priceHint}>
                    Current price: ₱{editingMaterial.price.toFixed(2)}. You can only increase the price.
                  </Paragraph>
                </View>
              )}

              {/* Custom Material Fields */}
              {!selectedElectricalMaterial && !editingMaterial && (
                <TextInput
                  mode="outlined"
                  label="Material Name *"
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  style={styles.input}
                  textColor={theme.colors.text}
                />
              )}

              {/* Custom Material Price */}
              {!selectedElectricalMaterial && !editingMaterial && (
                <TextInput
                  mode="outlined"
                  label="Price per Unit (₱) *"
                  value={formData.customPrice}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, customPrice: text }))}
                  keyboardType="numeric"
                  style={styles.input}
                  textColor={theme.colors.text}
                />
              )}

              {selectedElectricalMaterial && formData.quantity && (
                <View style={styles.costPreview}>
                  <Text style={styles.costPreviewText}>
                    Total Cost: ₱{(
                      parseFloat(formData.quantity) * 
                      (formData.useDefaultPrice 
                        ? selectedElectricalMaterial.unit_cost 
                        : (parseFloat(formData.customPrice) || selectedElectricalMaterial.unit_cost))
                    ).toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Cost Preview for Editing Materials */}
              {editingMaterial && formData.quantity && formData.customPrice && (
                <View style={styles.costPreview}>
                  <Text style={styles.costPreviewText}>
                    Total Value: ₱{(
                      parseFloat(formData.quantity) * 
                      (parseFloat(formData.customPrice) || editingMaterial.price)
                    ).toFixed(2)}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button 
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
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
                {editingMaterial ? 'Update' : selectedElectricalMaterial ? 'Add' : 'Save'}
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* Dialog */}
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
                    setShowDialog(false);
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
  },
  toggleContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  segmentedButtons: {
    backgroundColor: theme.colors.surface,
  },
  segmentedButtonLabel: {
    fontSize: fontSizes.xs,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
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
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  materialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  materialGridItem: {
    width: (Dimensions.get('window').width - spacing.md * 2 - spacing.xs * 4) / 3, // 3 columns: (screen - padding - gaps) / 3
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    minHeight: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  materialGridItemNoMargin: {
    marginRight: 0,
  },
  materialGridItemInInventory: {
    borderColor: constructionColors.complete,
    backgroundColor: constructionColors.complete + '10',
  },
  materialGridItemLowStock: {
    borderColor: constructionColors.urgent,
    backgroundColor: constructionColors.urgent + '10',
  },
  materialGridContent: {
    width: '100%',
    alignItems: 'center',
  },
  materialGridName: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs / 2,
    lineHeight: 15,
  },
  materialGridVariantText: {
    fontSize: fontSizes.xs - 2,
    color: theme.colors.primary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.xs / 2,
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  materialNameContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  materialName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    height: 24,
    backgroundColor: theme.colors.primary + '20',
  },
  categoryChipText: {
    fontSize: 10,
    color: theme.colors.primary,
  },
  inInventoryChip: {
    alignSelf: 'flex-start',
    height: 24,
    backgroundColor: constructionColors.complete + '20',
  },
  inInventoryChipText: {
    fontSize: 10,
    color: constructionColors.complete,
  },
  lowStockChip: {
    alignSelf: 'flex-start',
    height: 24,
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
  addButton: {
    marginTop: spacing.sm,
  },
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: theme.colors.primary,
  },
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
    maxHeight: 400,
    marginBottom: spacing.sm,
  },
  modalScrollContent: {
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: theme.colors.background,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  priceText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: spacing.xs,
  },
  variantItem: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  variantItemName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.xs / 2,
  },
  variantItemUnit: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  variantItemInInventory: {
    borderColor: constructionColors.complete,
    backgroundColor: constructionColors.complete + '10',
  },
  variantItemInInventoryText: {
    fontSize: fontSizes.xs,
    color: constructionColors.complete,
    fontWeight: '600',
    marginTop: spacing.xs / 2,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.background,
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
  priceSection: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness,
  },
  priceSectionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  priceOptions: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  priceOptionButton: {
    flex: 1,
  },
  priceButtonLabel: {
    fontSize: fontSizes.xs,
  },
  priceButtonLabelSmall: {
    fontSize: fontSizes.xs - 2,
  },
  priceHint: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  dialog: {
    backgroundColor: theme.colors.surface,
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
