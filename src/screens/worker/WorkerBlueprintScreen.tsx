import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Alert, Dimensions, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  IconButton,
  ActivityIndicator,
  Dialog,
  Portal,
  Text,
  Chip,
  Divider,
  List,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import { 
  getBlueprintsByProjectId, 
  Blueprint, 
  BlueprintPin,
  PinType,
  incrementPinVerification 
} from '../../services/blueprintService';
import { getWorkerTasks, Task } from '../../services/taskService';
import { getMaterials } from '../../services/firebaseDataService';
import { auth } from '../../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { uploadTaskPhoto } from '../../services/firebaseService';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// Pin types configuration
const PIN_TYPES: Array<{ value: PinType; label: string; icon: string; color: string }> = [
  { value: 'conduit_installation', label: 'Conduit', icon: 'pipe', color: '#FF6B6B' },
  { value: 'electrical_box_wires', label: 'Box & Wires', icon: 'cube', color: '#4ECDC4' },
  { value: 'cable_pulling', label: 'Cable Pulling', icon: 'git-branch', color: '#45B7D1' },
  { value: 'outlet_switch_installation', label: 'Outlet/Switch', icon: 'flash', color: '#FFA07A' },
  { value: 'light_fixture_installation', label: 'Light Fixture', icon: 'bulb', color: '#FFD93D' },
  { value: 'manual_task', label: 'Manual Task', icon: 'construct', color: '#95E1D3' },
];

function getPinStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return constructionColors.success;
    case 'in_progress':
      return constructionColors.warning;
    case 'pending':
    default:
      return constructionColors.urgent;
  }
}

export default function WorkerBlueprintScreen() {
  const navigation = useNavigation();
  const { projectId } = useProjectData();
  const [loading, setLoading] = useState(true);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [currentBlueprint, setCurrentBlueprint] = useState<Blueprint | null>(null);
  const [showFloorSelector, setShowFloorSelector] = useState(false);
  const [selectedPin, setSelectedPin] = useState<BlueprintPin | null>(null);
  const [showPinDetails, setShowPinDetails] = useState(false);
  const [pinTask, setPinTask] = useState<Task | null>(null);
  const [pinMaterials, setPinMaterials] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);

  // Zoom and pan state
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastTranslate = useRef({ x: 0, y: 0 });

  // Image dimensions
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });
  const [imageContainerDimensions, setImageContainerDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (projectId && auth.currentUser) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    if (!projectId || !auth.currentUser) return;

    try {
      setLoading(true);

      // Load blueprints, tasks, and materials in parallel
      const [blueprintsData, tasksData, materialsData] = await Promise.all([
        getBlueprintsByProjectId(projectId),
        getWorkerTasks(auth.currentUser.uid),
        getMaterials(projectId),
      ]);

      // Filter tasks to current project
      const projectTasks = tasksData.filter(t => t.projectId === projectId);
      setAllTasks(projectTasks);
      setAllMaterials(materialsData);

      // Filter blueprints to only those with pins assigned to this worker
      const workerTaskIds = new Set(projectTasks.map(t => t.id));
      const filteredBlueprints = blueprintsData.map(bp => ({
        ...bp,
        pins: bp.pins.filter(pin => {
          // Show pin if it has a task assigned to this worker
          return pin.taskId && workerTaskIds.has(pin.taskId);
        }),
      })).filter(bp => bp.pins.length > 0); // Only show blueprints with assigned pins

      setBlueprints(filteredBlueprints);

      if (filteredBlueprints.length > 0) {
        setSelectedFloor(filteredBlueprints[0].floor);
        setCurrentBlueprint(filteredBlueprints[0]);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', `Failed to load blueprints: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle container layout
  const handleContainerLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setImageContainerDimensions({ width, height });
  };

  // Handle image load
  const handleImageLoad = (event: any) => {
    if (!currentBlueprint?.imageUrl) return;

    Image.getSize(
      currentBlueprint.imageUrl,
      (imgWidth, imgHeight) => {
        setImageDimensions({ width: imgWidth, height: imgHeight });
        
        const containerWidth = imageContainerDimensions.width || screenWidth - spacing.sm * 2;
        const containerHeight = imageContainerDimensions.height || screenHeight * 0.65;
        
        if (containerWidth > 0 && containerHeight > 0) {
          const imageAspect = imgWidth / imgHeight;
          const containerAspect = containerWidth / containerHeight;
          
          let displayWidth, displayHeight;
          if (imageAspect > containerAspect) {
            displayWidth = containerWidth;
            displayHeight = containerWidth / imageAspect;
          } else {
            displayHeight = containerHeight;
            displayWidth = containerHeight * imageAspect;
          }
          
          setDisplayDimensions({ width: displayWidth, height: displayHeight });
        }
      },
      (error) => console.error('Error getting image size:', error)
    );
  };

  // Convert percentage to screen coordinates
  const percentageToScreen = (xPercent: number, yPercent: number) => {
    const displayWidth = displayDimensions.width || imageContainerDimensions.width || screenWidth - spacing.sm * 2;
    const displayHeight = displayDimensions.height || imageContainerDimensions.height || screenHeight * 0.65;
    
    return {
      x: (xPercent / 100) * displayWidth,
      y: (yPercent / 100) * displayHeight,
    };
  };

  // Gesture handlers
  const onPinchGestureEvent = (event: any) => {
    const newScale = lastScale.current * event.nativeEvent.scale;
    scale.setValue(newScale);
  };

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current *= event.nativeEvent.scale;
      
      // Clamp scale between 1 and 3
      if (lastScale.current < 1) {
        lastScale.current = 1;
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      } else if (lastScale.current > 3) {
        lastScale.current = 3;
        Animated.spring(scale, {
          toValue: 3,
          useNativeDriver: true,
        }).start();
      } else {
        scale.setValue(lastScale.current);
      }
    }
  };

  const onPanGestureEvent = (event: any) => {
    translateX.setValue(lastTranslate.current.x + event.nativeEvent.translationX);
    translateY.setValue(lastTranslate.current.y + event.nativeEvent.translationY);
  };

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastTranslate.current.x += event.nativeEvent.translationX;
      lastTranslate.current.y += event.nativeEvent.translationY;
      translateX.setValue(lastTranslate.current.x);
      translateY.setValue(lastTranslate.current.y);
    }
  };

  // Handle pin press
  const handlePinPress = async (pin: BlueprintPin) => {
    setSelectedPin(pin);
    
    // Find associated task
    if (pin.taskId) {
      const task = allTasks.find(t => t.id === pin.taskId);
      setPinTask(task || null);

      // Get materials for this task (if task has materialIds, otherwise show all project materials)
      // For now, show all project materials as available
      setPinMaterials(allMaterials);
    } else {
      setPinTask(null);
      setPinMaterials(allMaterials);
    }

    setShowPinDetails(true);
  };

  // Handle photo upload
  const handleUploadPhoto = async () => {
    if (!selectedPin) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploadingPhoto(true);

      // Upload photo
      const taskId = selectedPin.taskId;
      if (!taskId) {
        Alert.alert('Error', 'This pin is not linked to a task');
        setUploadingPhoto(false);
        return;
      }

      await uploadTaskPhoto(taskId, result.assets[0].uri, '');

      // Increment pin verification
      if (currentBlueprint) {
        await incrementPinVerification(currentBlueprint.id, selectedPin.id);
      }

      // Reload data
      await loadData();

      setUploadingPhoto(false);
      setShowPinDetails(false);
      Alert.alert('Success', 'Photo uploaded successfully');
    } catch (error: any) {
      setUploadingPhoto(false);
      Alert.alert('Error', `Failed to upload photo: ${error.message}`);
    }
  };

  // Handle floor selection
  const handleFloorSelect = (floor: string) => {
    const blueprint = blueprints.find(bp => bp.floor === floor);
    if (blueprint) {
      setSelectedFloor(floor);
      setCurrentBlueprint(blueprint);
      setShowFloorSelector(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Paragraph style={styles.loadingText}>Loading blueprints...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  if (blueprints.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color={theme.colors.onSurfaceVariant} />
          <Title style={styles.emptyTitle}>No Blueprints Assigned</Title>
          <Paragraph style={styles.emptyText}>
            You don't have any tasks assigned on blueprints yet.
          </Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  const blueprintPins = currentBlueprint?.pins || [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Title style={styles.screenTitle}>My Blueprints</Title>
          <Paragraph style={styles.subtitle}>
            {currentBlueprint?.floor || selectedFloor} • {blueprintPins.length} task(s)
          </Paragraph>
        </View>
        <IconButton
          icon="layers"
          size={24}
          onPress={() => setShowFloorSelector(!showFloorSelector)}
          iconColor={theme.colors.primary}
        />
      </View>

      {/* Floor Selector */}
      {showFloorSelector && (
        <Card style={styles.floorSelectorCard}>
          <Card.Content>
            <View style={styles.floorSelectorHeader}>
              <Paragraph style={styles.floorSelectorTitle}>Select Floor</Paragraph>
              <IconButton
                icon="close"
                size={20}
                onPress={() => setShowFloorSelector(false)}
                iconColor={theme.colors.text}
              />
            </View>
            <ScrollView style={styles.floorList} showsVerticalScrollIndicator={false}>
              {blueprints.map((bp) => (
                <TouchableOpacity
                  key={bp.id}
                  style={[
                    styles.floorItem,
                    selectedFloor === bp.floor && styles.floorItemSelected,
                  ]}
                  onPress={() => handleFloorSelect(bp.floor)}
                >
                  <Ionicons 
                    name="business-outline" 
                    size={20} 
                    color={selectedFloor === bp.floor ? theme.colors.primary : theme.colors.onSurfaceVariant} 
                  />
                  <View style={styles.floorItemContent}>
                    <Paragraph style={[
                      styles.floorItemName,
                      selectedFloor === bp.floor && styles.floorItemNameSelected,
                    ]}>
                      {bp.floor}
                    </Paragraph>
                    <Paragraph style={styles.floorItemPins}>
                      {bp.pins.length} task(s)
                    </Paragraph>
                  </View>
                  {selectedFloor === bp.floor && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>
      )}

      {/* Blueprint Image with Pins */}
      <View style={styles.content}>
        <GestureHandlerRootView style={styles.gestureRootView}>
          <View
            style={styles.imageScrollContainer}
            onLayout={handleContainerLayout}
          >
            <PanGestureHandler
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanHandlerStateChange}
              minPointers={1}
              maxPointers={1}
            >
              <Animated.View style={styles.gestureContainer}>
                <PinchGestureHandler
                  onGestureEvent={onPinchGestureEvent}
                  onHandlerStateChange={onPinchHandlerStateChange}
                >
                  <Animated.View
                    style={[
                      styles.zoomableContainer,
                      {
                        transform: [
                          { translateX },
                          { translateY },
                          { scale },
                        ],
                      },
                    ]}
                  >
                    {currentBlueprint?.imageUrl ? (
                      <Image
                        source={{ uri: currentBlueprint.imageUrl }}
                        style={[
                          styles.blueprintImage,
                          {
                            width: displayDimensions.width || imageContainerDimensions.width || screenWidth - spacing.sm * 2,
                            height: displayDimensions.height || imageContainerDimensions.height || screenHeight * 0.65,
                          },
                        ]}
                        resizeMode="contain"
                        onLoad={handleImageLoad}
                      />
                    ) : (
                      <View style={styles.noImageContainer}>
                        <Ionicons name="image-outline" size={48} color={theme.colors.onSurfaceVariant} />
                        <Paragraph style={styles.noImageText}>No blueprint image</Paragraph>
                      </View>
                    )}
                    
                    {/* Pins Overlay */}
                    <View style={styles.pinsOverlay} pointerEvents="box-none">
                      {blueprintPins.map((pin) => {
                        const screenPos = percentageToScreen(pin.x, pin.y);
                        const pinType = PIN_TYPES.find((t) => t.value === pin.pinType);
                        const statusColor = getPinStatusColor(pin.status);

                        return (
                          <TouchableOpacity
                            key={pin.id}
                            style={[
                              styles.pinMarker,
                              {
                                left: screenPos.x - 12,
                                top: screenPos.y - 12,
                                backgroundColor: statusColor,
                              },
                            ]}
                            onPress={() => handlePinPress(pin)}
                          >
                            <Ionicons
                              name={pinType?.icon as any || 'location'}
                              size={16}
                              color="white"
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </GestureHandlerRootView>
      </View>

      {/* Pin Details Modal */}
      <Portal>
        <Dialog
          visible={showPinDetails}
          onDismiss={() => {
            setShowPinDetails(false);
            setSelectedPin(null);
            setPinTask(null);
          }}
          style={styles.dialog}
        >
          <Dialog.Title>Task Details</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView>
              {selectedPin && (
                <>
                  {/* Pin Type */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Task Type:</Text>
                    <Chip 
                      icon={PIN_TYPES.find(t => t.value === selectedPin.pinType)?.icon}
                      style={styles.chip}
                    >
                      {PIN_TYPES.find(t => t.value === selectedPin.pinType)?.label || selectedPin.pinType}
                    </Chip>
                  </View>

                  {/* Component Type */}
                  {selectedPin.componentType && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Component:</Text>
                      <Text style={styles.detailValue}>{selectedPin.componentType}</Text>
                    </View>
                  )}

                  {/* Description */}
                  {selectedPin.description && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Description:</Text>
                      <Text style={styles.detailValue}>{selectedPin.description}</Text>
                    </View>
                  )}

                  {/* Quantity */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <Text style={styles.detailValue}>
                      {selectedPin.verifiedCount} / {selectedPin.totalRequired} completed
                    </Text>
                  </View>

                  <Divider style={styles.divider} />

                  {/* Task Info */}
                  {pinTask && (
                    <>
                      <Text style={styles.sectionTitle}>Task Information</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Task Name:</Text>
                        <Text style={styles.detailValue}>{pinTask.title}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Status:</Text>
                        <Chip 
                          style={[
                            styles.chip,
                            { backgroundColor: getPinStatusColor(pinTask.status) + '20' }
                          ]}
                        >
                          {pinTask.status}
                        </Chip>
                      </View>
                    </>
                  )}

                  <Divider style={styles.divider} />

                  {/* Available Materials */}
                  <Text style={styles.sectionTitle}>Available Materials</Text>
                  {pinMaterials.length === 0 ? (
                    <Text style={styles.emptyMaterialsText}>No materials available</Text>
                  ) : (
                    <View style={styles.materialsList}>
                      {pinMaterials.slice(0, 5).map((material) => (
                        <View key={material.id} style={styles.materialItem}>
                          <Text style={styles.materialName}>{material.name}</Text>
                          <Text style={styles.materialQuantity}>
                            {material.quantity} {material.unit} available
                          </Text>
                        </View>
                      ))}
                      {pinMaterials.length > 5 && (
                        <Text style={styles.moreMaterialsText}>
                          +{pinMaterials.length - 5} more materials
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Upload Photo Button */}
                  <Button
                    mode="contained"
                    icon="camera"
                    onPress={handleUploadPhoto}
                    style={styles.uploadButton}
                    loading={uploadingPhoto}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </Button>
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowPinDetails(false);
              setSelectedPin(null);
              setPinTask(null);
            }}>
              Close
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  screenTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    color: theme.colors.text,
  },
  emptyText: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
  },
  floorSelectorCard: {
    margin: spacing.sm,
    marginBottom: spacing.xs,
  },
  floorSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  floorSelectorTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  floorList: {
    maxHeight: 200,
  },
  floorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginVertical: spacing.xs / 2,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  floorItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  floorItemContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  floorItemName: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
  floorItemNameSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  floorItemPins: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs / 2,
  },
  content: {
    flex: 1,
    padding: spacing.sm,
    paddingTop: spacing.xs,
  },
  gestureRootView: {
    flex: 1,
    width: '100%',
  },
  imageScrollContainer: {
    width: screenWidth - spacing.sm * 2,
    height: screenHeight * 0.65,
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
    borderRadius: 0,
    alignSelf: 'center',
  },
  gestureContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  zoomableContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueprintImage: {
    // Dimensions set dynamically
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: spacing.sm,
    color: theme.colors.onSurfaceVariant,
  },
  pinsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  pinMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dialog: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
  },
  dialogScrollArea: {
    maxHeight: screenHeight * 0.6,
    paddingHorizontal: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  detailValue: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
    flex: 2,
    textAlign: 'right',
  },
  chip: {
    alignSelf: 'flex-start',
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
  materialsList: {
    marginTop: spacing.xs,
  },
  materialItem: {
    padding: spacing.sm,
    marginVertical: spacing.xs / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  materialName: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  materialQuantity: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs / 2,
  },
  emptyMaterialsText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  moreMaterialsText: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  uploadButton: {
    marginTop: spacing.md,
  },
});

