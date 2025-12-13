// Blueprint Editor Screen for SitePulse: Electrical
// Allows engineers to place, edit, and manage pins on blueprints

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  Platform,
  Text,
  Animated,
} from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Card,
  Title,
  Paragraph,
  Button,
  IconButton,
  Portal,
  Dialog,
  TextInput,
  Menu,
  Chip,
  ActivityIndicator,
  Surface,
  ProgressBar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import {
  getBlueprintByProjectId,
  getBlueprintsByProjectId,
  getBlueprintByProjectIdAndFloor,
  createBlueprint,
  deleteBlueprint,
  updateBlueprintImage,
  addPinToBlueprint,
  updatePinInBlueprint,
  deletePinFromBlueprint,
  PinType,
  BlueprintPin,
  Blueprint,
} from '../../services/blueprintService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { uploadWithProgress } from '../../services/storageUploadHelperV2';
import { getProjectWorkers } from '../../services/assignmentService';

// Default blueprint image
const DEFAULT_BLUEPRINT_IMAGE = require('../../blueprint.jpg');

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// Pin type configurations
const PIN_TYPES: { value: PinType; label: string; icon: string; color: string }[] = [
  { value: 'conduit_installation', label: 'Conduit Installation', icon: 'construct-outline', color: '#FF6B6B' },
  { value: 'electrical_box_wires', label: 'Electrical Box with Wires', icon: 'cube-outline', color: '#4ECDC4' },
  { value: 'cable_pulling', label: 'Cable Pulling', icon: 'git-branch-outline', color: '#45B7D1' },
  { value: 'outlet_switch_installation', label: 'Outlet/Switch Installation', icon: 'flash-outline', color: '#FFA07A' },
  { value: 'light_fixture_installation', label: 'Light Fixture Installation', icon: 'bulb-outline', color: '#FFD93D' },
  { value: 'manual_task', label: 'Manual Task (Not Automated)', icon: 'hand-left-outline', color: '#95A5A6' },
];

// Get pin color based on status
const getPinStatusColor = (status: 'pending' | 'in_progress' | 'completed'): string => {
  switch (status) {
    case 'completed':
      return constructionColors.complete;
    case 'in_progress':
      return constructionColors.inProgress;
    case 'pending':
    default:
      return constructionColors.notStarted;
  }
};

export default function BlueprintEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { projectId } = useProjectData();

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [allBlueprints, setAllBlueprints] = useState<Blueprint[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('Ground Floor');
  const [showFloorSelector, setShowFloorSelector] = useState(false);
  const [showCreateFloorModal, setShowCreateFloorModal] = useState(false);
  const [showRenameFloorModal, setShowRenameFloorModal] = useState(false);
  const [showDeleteFloorModal, setShowDeleteFloorModal] = useState(false);
  const [floorToRename, setFloorToRename] = useState<Blueprint | null>(null);
  const [floorToDelete, setFloorToDelete] = useState<Blueprint | null>(null);
  const [newFloorName, setNewFloorName] = useState('');
  const [renameFloorName, setRenameFloorName] = useState('');
  const [newFloorImageUri, setNewFloorImageUri] = useState<string | null>(null);
  const [uploadingNewFloorImage, setUploadingNewFloorImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imageContainerDimensions, setImageContainerDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });
  
  // Zoom and pan state
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastTranslate = useRef({ x: 0, y: 0 });
  const [selectedPin, setSelectedPin] = useState<BlueprintPin | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showEditPinModal, setShowEditPinModal] = useState(false);
  const [pinPlacementMode, setPinPlacementMode] = useState(false);
  const [selectedPinType, setSelectedPinType] = useState<PinType | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pinTypeExpanded, setPinTypeExpanded] = useState(true);
  const [workerMenuVisible, setWorkerMenuVisible] = useState(false);

  // Pin form state
  const [pinForm, setPinForm] = useState({
    taskName: '',
    assignedWorkerId: '',
    description: '',
    totalRequired: '1',
    selectedMaterials: [] as string[], // Array of material IDs
  });

  // Get materials from project
  const { state } = useProjectData();
  const projectMaterials = state.materials;
  
  // Workers state
  const [projectWorkers, setProjectWorkers] = useState<any[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  const loadProjectWorkers = async () => {
    if (!projectId) return;
    try {
      setLoadingWorkers(true);
      const workers = await getProjectWorkers(projectId);
      setProjectWorkers(workers);
    } catch (error: any) {
      console.error('Error loading project workers:', error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const loadBlueprint = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      
      // Load all blueprints for the project
      const blueprints = await getBlueprintsByProjectId(projectId);
      setAllBlueprints(blueprints);
      
      // Load the selected floor's blueprint
      const blueprintData = await getBlueprintByProjectIdAndFloor(projectId, selectedFloor);
      
      if (blueprintData) {
        setBlueprint(blueprintData);
      } else if (blueprints.length > 0) {
        // If selected floor doesn't exist, use first available floor
        setSelectedFloor(blueprints[0].floor);
        setBlueprint(blueprints[0]);
      } else {
        // No blueprints exist, create default "Ground Floor" if needed
        setBlueprint(null);
      }
    } catch (error: any) {
      console.error('Error loading blueprint:', error);
      setBlueprint(null);
    } finally {
      setLoading(false);
    }
  };

  // Load blueprint and workers on mount and when floor/project changes
  useEffect(() => {
    loadBlueprint();
    loadProjectWorkers();
  }, [projectId, selectedFloor]);

  // Handle image load to get dimensions
  const handleImageLoad = (event: any) => {
    const { width, height } = event.nativeEvent.source;
    
    // Get actual image dimensions
    const imageSource = blueprint?.imageUrl || Image.resolveAssetSource(DEFAULT_BLUEPRINT_IMAGE).uri;
    
    Image.getSize(
      imageSource,
      (imgWidth, imgHeight) => {
        setImageDimensions({ 
          width: imgWidth,  
          height: imgHeight 
        });
        
        // Calculate display dimensions to fit container
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
      (error) => {
        console.error('Error getting image size:', error);
        if (width && height) {
          setImageDimensions({ width, height });
          const containerWidth = imageContainerDimensions.width || screenWidth - spacing.sm * 2;
          const containerHeight = imageContainerDimensions.height || screenHeight * 0.65;
          
          if (containerWidth > 0 && containerHeight > 0) {
            const imageAspect = width / height;
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
        }
      }
    );
  };

  // Handle container layout to get container dimensions
  const handleContainerLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setImageContainerDimensions({ width, height });
    
    // Recalculate display dimensions if image is already loaded
    if (imageDimensions.width > 0 && imageDimensions.height > 0) {
      const imageAspect = imageDimensions.width / imageDimensions.height;
      const containerAspect = width / height;
      
      let displayWidth, displayHeight;
      if (imageAspect > containerAspect) {
        displayWidth = width;
        displayHeight = width / imageAspect;
      } else {
        displayHeight = height;
        displayWidth = height * imageAspect;
      }
      
      setDisplayDimensions({ width: displayWidth, height: displayHeight });
    }
  };

  // Handle pinch gesture for zoom
  const onPinchGestureEvent = (event: any) => {
    const newScale = lastScale.current * event.nativeEvent.scale;
    scale.setValue(newScale);
  };

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current *= event.nativeEvent.scale;
      
      // Clamp scale between 1 and 5
      if (lastScale.current < 1) {
        lastScale.current = 1;
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      } else if (lastScale.current > 5) {
        lastScale.current = 5;
        Animated.spring(scale, {
          toValue: 5,
          useNativeDriver: true,
        }).start();
      } else {
        scale.setValue(lastScale.current);
      }
    }
  };

  // Handle pan gesture for moving
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

  // Reset zoom and pan
  const resetZoom = () => {
    lastScale.current = 1;
    lastTranslate.current = { x: 0, y: 0 };
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  // Convert screen coordinates to percentage (accounting for zoom and pan)
  const screenToPercentage = (x: number, y: number): { x: number; y: number } => {
    const containerWidth = imageContainerDimensions.width || (screenWidth - spacing.sm * 2);
    const containerHeight = imageContainerDimensions.height || (screenHeight * 0.65);
    const displayWidth = displayDimensions.width || containerWidth;
    const displayHeight = displayDimensions.height || containerHeight;
    
    // Account for current zoom and pan
    const currentScale = lastScale.current;
    const currentTranslateX = lastTranslate.current.x;
    const currentTranslateY = lastTranslate.current.y;
    
    // Reverse transform: subtract translation and divide by scale
    const imageX = (x - containerWidth / 2 - currentTranslateX) / currentScale + containerWidth / 2;
    const imageY = (y - containerHeight / 2 - currentTranslateY) / currentScale + containerHeight / 2;
    
    // Convert to percentage based on display dimensions
    const percentX = (imageX / displayWidth) * 100;
    const percentY = (imageY / displayHeight) * 100;
    
    return {
      x: Math.max(0, Math.min(100, percentX)),
      y: Math.max(0, Math.min(100, percentY)),
    };
  };

  // Convert percentage to screen coordinates (accounting for zoom and pan)
  const percentageToScreen = (x: number, y: number): { x: number; y: number } => {
    const containerWidth = imageContainerDimensions.width || (screenWidth - spacing.sm * 2);
    const containerHeight = imageContainerDimensions.height || (screenHeight * 0.65);
    const displayWidth = displayDimensions.width || containerWidth;
    const displayHeight = displayDimensions.height || containerHeight;
    
    // Get current transform values
    const currentScale = lastScale.current;
    const currentTranslateX = lastTranslate.current.x;
    const currentTranslateY = lastTranslate.current.y;
    
    // Convert percentage to image coordinates
    const imageX = (x / 100) * displayWidth;
    const imageY = (y / 100) * displayHeight;
    
    // Apply transform: scale and translate
    const screenX = (imageX - containerWidth / 2) * currentScale + containerWidth / 2 + currentTranslateX;
    const screenY = (imageY - containerHeight / 2) * currentScale + containerHeight / 2 + currentTranslateY;
    
    return {
      x: screenX,
      y: screenY,
    };
  };

  // Handle blueprint image tap
  const handleBlueprintTap = (event: any) => {
    if (!pinPlacementMode || !selectedPinType) return;

    const { locationX, locationY } = event.nativeEvent;
    const percentage = screenToPercentage(locationX, locationY);

    // Show pin placement modal
    setPinForm({
      taskName: '',
      assignedWorkerId: '',
      description: '',
      totalRequired: '1',
      selectedMaterials: [],
    });
    setShowPinModal(true);
    // Store tap coordinates for pin creation
    (handleBlueprintTap as any).tapX = percentage.x;
    (handleBlueprintTap as any).tapY = percentage.y;
  };

  // Handle pin selection
  const handlePinPress = (pin: BlueprintPin) => {
    setSelectedPin(pin);
    setPinForm({
      taskName: '',
      assignedWorkerId: '',
      description: pin.description || '',
      totalRequired: pin.totalRequired?.toString() || '1',
      selectedMaterials: [],
    });
    setShowEditPinModal(true);
  };

  // Create new pin
  const handleCreatePin = async () => {
    if (!selectedPinType || !projectId) return;

    // If no blueprint document exists for this floor, create one first
    let blueprintId = blueprint?.id;
    
    if (!blueprintId) {
      // Create blueprint document for the selected floor
      try {
        const newBlueprint = await createBlueprint(projectId, selectedFloor);
        blueprintId = newBlueprint.id;
        // Reload blueprint
        await loadBlueprint();
      } catch (error: any) {
        Alert.alert('Error', `Failed to create blueprint document: ${error.message}`);
        return;
      }
    }
    
    if (!blueprintId) {
      Alert.alert('Error', 'Could not create blueprint document');
      return;
    }

    const tapX = (handleBlueprintTap as any).tapX;
    const tapY = (handleBlueprintTap as any).tapY;

    if (tapX === undefined || tapY === undefined) {
      Alert.alert('Error', 'Please tap on the blueprint to place a pin');
      return;
    }

    try {
      const newPin = await addPinToBlueprint(blueprintId, {
        projectId,
        pinType: selectedPinType,
        x: tapX,
        y: tapY,
        description: pinForm.description || undefined,
        totalRequired: parseInt(pinForm.totalRequired) || 1,
      });

      // Reload blueprint to get updated pins
      await loadBlueprint();

      setShowPinModal(false);
      setPinPlacementMode(false);
      setSelectedPinType(null);
      Alert.alert('Success', 'Pin created successfully');
    } catch (error: any) {
      Alert.alert('Error', `Failed to create pin: ${error.message}`);
    }
  };

  // Update pin
  const handleUpdatePin = async () => {
    if (!blueprint || !selectedPin) return;

    try {
      await updatePinInBlueprint(blueprint.id, selectedPin.id, {
        description: pinForm.description || undefined,
        totalRequired: parseInt(pinForm.totalRequired) || 1,
      });

      await loadBlueprint();
      setShowEditPinModal(false);
      setSelectedPin(null);
      Alert.alert('Success', 'Pin updated successfully');
    } catch (error: any) {
      Alert.alert('Error', `Failed to update pin: ${error.message}`);
    }
  };

  // Delete pin
  const handleDeletePin = async () => {
    if (!blueprint || !selectedPin) return;

    Alert.alert(
      'Delete Pin',
      'Are you sure you want to delete this pin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePinFromBlueprint(blueprint.id, selectedPin.id);
              await loadBlueprint();
              setShowEditPinModal(false);
              setSelectedPin(null);
              Alert.alert('Success', 'Pin deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', `Failed to delete pin: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  // Upload new blueprint image
  const handleUploadBlueprint = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets[0]) return;

      // If no blueprint document exists, we can't upload
      if (!blueprint) {
        Alert.alert(
          'No Blueprint Document',
          'A blueprint document is required. Please create a project with a blueprint first.',
          [{ text: 'OK' }]
        );
        return;
      }

      setUploadingImage(true);
      setUploadProgress(0);

      const imageUrl = await updateBlueprintImage(blueprint.id, result.assets[0].uri);
      
      await loadBlueprint();
      setUploadingImage(false);
      Alert.alert('Success', 'Blueprint image updated successfully');
    } catch (error: any) {
      setUploadingImage(false);
      Alert.alert('Error', `Failed to upload blueprint: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Paragraph style={styles.loadingText}>Loading blueprint...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  // Use default blueprint if no blueprint exists
  const blueprintPins = blueprint?.pins || [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.primary}
        />
        <View style={styles.headerText}>
          <Title style={styles.screenTitle}>Blueprint Editor</Title>
          <Paragraph style={styles.subtitle}>
            {blueprint?.floor || selectedFloor} • {blueprintPins.length} pins placed
          </Paragraph>
        </View>
        <IconButton
          icon="layers"
          size={24}
          onPress={() => setShowFloorSelector(!showFloorSelector)}
          iconColor={theme.colors.primary}
        />
      </View>

      {/* Floor Selector - Dark Mode */}
      {showFloorSelector && (
        <Card style={[styles.floorSelectorCard, styles.darkFloorSelectorCard]} theme={{ colors: { surface: '#1E1E1E' } }}>
          <Card.Content>
            <View style={styles.floorSelectorHeader}>
              <Paragraph style={styles.darkFloorSelectorTitle}>Select Floor</Paragraph>
              <IconButton
                icon="close"
                size={20}
                onPress={() => setShowFloorSelector(false)}
                iconColor="#FFFFFF"
              />
            </View>
            <ScrollView style={styles.floorList} showsVerticalScrollIndicator={false}>
              {allBlueprints.map((bp) => (
                <View
                  key={bp.id}
                  style={[
                    styles.floorItem,
                    styles.darkFloorItem,
                    selectedFloor === bp.floor && styles.darkFloorItemSelected,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.floorItemMain}
                    onPress={() => {
                      setSelectedFloor(bp.floor);
                      setShowFloorSelector(false);
                    }}
                  >
                    <Ionicons 
                      name="business-outline" 
                      size={20} 
                      color={selectedFloor === bp.floor ? theme.colors.primary : '#888888'} 
                    />
                    <View style={styles.floorItemContent}>
                      <Paragraph style={[
                        styles.darkFloorItemName,
                        selectedFloor === bp.floor && styles.darkFloorItemNameSelected,
                      ]}>
                        {bp.floor}
                      </Paragraph>
                      <Paragraph style={styles.darkFloorItemPins}>
                        {bp.pins.length} pins
                      </Paragraph>
                    </View>
                    {selectedFloor === bp.floor && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                  <View style={styles.floorItemActions}>
                    <IconButton
                      icon="pencil"
                      size={18}
                      iconColor={theme.colors.primary}
                      onPress={() => {
                        setFloorToRename(bp);
                        setRenameFloorName(bp.floor);
                        setShowRenameFloorModal(true);
                        setShowFloorSelector(false);
                      }}
                    />
                    <IconButton
                      icon="delete"
                      size={18}
                      iconColor={constructionColors.urgent}
                      onPress={() => {
                        setFloorToDelete(bp);
                        setShowDeleteFloorModal(true);
                        setShowFloorSelector(false);
                      }}
                    />
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.darkAddFloorButton}
                onPress={() => setShowCreateFloorModal(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                <Paragraph style={styles.darkAddFloorText}>Add New Floor</Paragraph>
              </TouchableOpacity>
            </ScrollView>
          </Card.Content>
        </Card>
      )}

      {/* Pin Type Selection - Collapsible - Dark Mode */}
      <Card style={[styles.pinTypeCard, styles.darkPinTypeCard]} theme={{ colors: { surface: '#1E1E1E' } }}>
        <Card.Content style={styles.pinTypeCardContent}>
          <TouchableOpacity
            onPress={() => setPinTypeExpanded(!pinTypeExpanded)}
            style={styles.pinTypeHeader}
          >
            <Paragraph style={styles.darkPinTypeLabel}>Select Pin Type:</Paragraph>
            <IconButton
              icon={pinTypeExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              iconColor={theme.colors.primary}
              style={styles.chevronButton}
            />
          </TouchableOpacity>
          
          {pinTypeExpanded && (
            <>
              <View style={styles.pinTypeGrid}>
                {PIN_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => {
                      setSelectedPinType(type.value);
                      setPinPlacementMode(true);
                    }}
                    style={[
                      styles.pinTypeButton,
                      styles.darkPinTypeButton,
                      selectedPinType === type.value && styles.darkPinTypeButtonSelected,
                      { borderColor: selectedPinType === type.value ? type.color : '#444444' },
                    ]}
                  >
                    <Ionicons name={type.icon as any} size={16} color={type.color} />
                    <Paragraph
                      style={[
                        styles.darkPinTypeText,
                        selectedPinType === type.value && styles.darkPinTypeTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {type.label}
                    </Paragraph>
                  </TouchableOpacity>
                ))}
              </View>
              {pinPlacementMode && (
                <Button
                  mode="outlined"
                  onPress={() => {
                    setPinPlacementMode(false);
                    setSelectedPinType(null);
                  }}
                  style={styles.darkCancelPlacementButton}
                  textColor="#FFFFFF"
                  compact
                >
                  Cancel Placement
                </Button>
              )}
            </>
          )}
        </Card.Content>
      </Card>

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
              avgTouches
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
                    <Image
                      source={blueprint?.imageUrl ? { uri: blueprint.imageUrl } : DEFAULT_BLUEPRINT_IMAGE}
                      style={[
                        {
                          width: displayDimensions.width || imageContainerDimensions.width || screenWidth - spacing.sm * 2,
                          height: displayDimensions.height || imageContainerDimensions.height || screenHeight * 0.65,
                        },
                      ]}
                      resizeMode="contain"
                      onLoad={handleImageLoad}
                    />
                    
                    {/* Pins Overlay - Inside zoom container so they move with image */}
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

                      {/* Tap Handler */}
                      {pinPlacementMode && (
                        <TouchableOpacity
                          style={StyleSheet.absoluteFill}
                          onPress={handleBlueprintTap}
                          activeOpacity={1}
                        />
                      )}
                    </View>
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </GestureHandlerRootView>
      </View>

      {/* Pin Placement Modal - Enhanced */}
      <Portal>
        <Dialog
          visible={showPinModal}
          onDismiss={() => setShowPinModal(false)}
          style={[styles.dialog, styles.dialogLarge]}
          theme={{
            colors: {
              surface: theme.colors.surface,
              onSurface: theme.colors.text,
              primary: theme.colors.primary,
            },
          }}
        >
          <Dialog.Title style={styles.dialogTitle}>Create Task Pin</Dialog.Title>
          <Dialog.Content style={[styles.dialogContent, styles.dialogContentScrollable]}>
            <ScrollView 
              contentContainerStyle={styles.dialogContentInner}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {/* Task Name - First Field */}
              <TextInput
                label="Task Name *"
                value={pinForm.taskName}
                onChangeText={(text) => setPinForm({ ...pinForm, taskName: text })}
                style={styles.input}
                placeholder="e.g., Install Outlet in Living Room"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                textColor={theme.colors.text}
                mode="outlined"
                theme={{
                  colors: {
                    onSurface: theme.colors.text,
                    onSurfaceVariant: theme.colors.onSurfaceVariant,
                    primary: theme.colors.primary,
                  },
                }}
              />

              {/* Worker Assignment */}
              <View style={styles.section}>
                <Paragraph style={styles.sectionLabel}>Assign to Worker *</Paragraph>
                {loadingWorkers ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : projectWorkers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Paragraph style={styles.emptyText}>No workers assigned to project</Paragraph>
                    <Button
                      mode="outlined"
                      onPress={() => (navigation as any).navigate('WorkersManagement')}
                      compact
                    >
                      Go to Workers Management
                    </Button>
                  </View>
                ) : (
                  <Menu
                    visible={workerMenuVisible}
                    onDismiss={() => setWorkerMenuVisible(false)}
                    anchor={
                      <TouchableOpacity
                        onPress={() => setWorkerMenuVisible(true)}
                        style={styles.workerSelectButton}
                      >
                        <Text style={styles.workerSelectText} numberOfLines={1}>
                          {pinForm.assignedWorkerId
                            ? projectWorkers.find((w) => w.id === pinForm.assignedWorkerId)?.name || 'Select Worker'
                            : 'Select Worker *'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                    }
                    contentStyle={styles.menuContent}
                    theme={{
                      colors: {
                        surface: theme.colors.surface,
                        onSurface: theme.colors.text,
                        primary: theme.colors.primary,
                      },
                    }}
                  >
                    {projectWorkers.map((worker) => (
                      <Menu.Item
                        key={worker.id}
                        onPress={() => {
                          setPinForm({ ...pinForm, assignedWorkerId: worker.id });
                          setWorkerMenuVisible(false);
                        }}
                        title={worker.name}
                        titleStyle={styles.menuItemText}
                      />
                    ))}
                  </Menu>
                )}
              </View>

              {/* Description */}
              <TextInput
                label="Description (Optional)"
                value={pinForm.description}
                onChangeText={(text) => setPinForm({ ...pinForm, description: text })}
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Additional notes about this location"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                textColor={theme.colors.text}
                mode="outlined"
                theme={{
                  colors: {
                    onSurface: theme.colors.text,
                    onSurfaceVariant: theme.colors.onSurfaceVariant,
                    primary: theme.colors.primary,
                  },
                }}
              />

              {/* Total Required */}
              <TextInput
                label="Total Required *"
                value={pinForm.totalRequired}
                onChangeText={(text) => setPinForm({ ...pinForm, totalRequired: text })}
                keyboardType="numeric"
                style={styles.input}
                placeholder="Number of items needed"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                textColor={theme.colors.text}
                mode="outlined"
                theme={{
                  colors: {
                    onSurface: theme.colors.text,
                    onSurfaceVariant: theme.colors.onSurfaceVariant,
                    primary: theme.colors.primary,
                  },
                }}
              />

              {/* Materials Usage */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Paragraph style={styles.sectionLabel}>Materials Usage (Optional)</Paragraph>
                  <Button
                    mode="text"
                    onPress={() => {
                      (navigation as any).navigate('MaterialsManagement');
                    }}
                    compact
                    textColor={theme.colors.primary}
                  >
                    Add to Inventory
                  </Button>
                </View>
                {projectMaterials.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Paragraph style={styles.emptyText}>No materials in inventory</Paragraph>
                    <Button
                      mode="outlined"
                      onPress={() => (navigation as any).navigate('MaterialsManagement')}
                      compact
                    >
                      Go to Materials Management
                    </Button>
                  </View>
                ) : (
                  <View style={styles.materialsList}>
                    {projectMaterials.map((material) => (
                      <TouchableOpacity
                        key={material.id}
                        onPress={() => {
                          const isSelected = pinForm.selectedMaterials.includes(material.id);
                          setPinForm({
                            ...pinForm,
                            selectedMaterials: isSelected
                              ? pinForm.selectedMaterials.filter((id) => id !== material.id)
                              : [...pinForm.selectedMaterials, material.id],
                          });
                        }}
                        style={[
                          styles.materialItem,
                          pinForm.selectedMaterials.includes(material.id) && styles.materialItemSelected,
                        ]}
                      >
                        <View style={styles.materialItemContent}>
                          <Paragraph style={styles.materialName}>{material.name}</Paragraph>
                          <Paragraph style={styles.materialQuantity}>
                            Stock: {material.quantity} {material.unit}
                          </Paragraph>
                        </View>
                        {pinForm.selectedMaterials.includes(material.id) && (
                          <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setShowPinModal(false)} textColor={theme.colors.onSurface}>
              Cancel
            </Button>
            <Button
              onPress={handleCreatePin}
              mode="contained"
              buttonColor={theme.colors.primary}
              disabled={!pinForm.taskName || !pinForm.assignedWorkerId}
            >
              Create Pin
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit Pin Modal */}
      <Portal>
        <Dialog
          visible={showEditPinModal}
          onDismiss={() => setShowEditPinModal(false)}
          style={styles.dialog}
          theme={{
            colors: {
              surface: theme.colors.surface,
              onSurface: theme.colors.text,
              primary: theme.colors.primary,
            },
          }}
        >
          <Dialog.Title style={styles.dialogTitle}>Edit Pin</Dialog.Title>
          <Dialog.Content style={styles.dialogContentInner}>
            {selectedPin && (
              <>
                <Chip
                  icon={() => (
                    <Ionicons
                      name={PIN_TYPES.find((t) => t.value === selectedPin.pinType)?.icon as any || 'location'}
                      size={16}
                      color={theme.colors.primary}
                    />
                  )}
                  style={styles.pinTypeChip}
                >
                  {PIN_TYPES.find((t) => t.value === selectedPin.pinType)?.label}
                </Chip>
                <Paragraph style={styles.pinInfo}>
                  Status: {selectedPin.status} • Verified: {selectedPin.verifiedCount} / {selectedPin.totalRequired}
                </Paragraph>
              </>
            )}
            <TextInput
              label="Description"
              value={pinForm.description}
              onChangeText={(text) => setPinForm({ ...pinForm, description: text })}
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              textColor={theme.colors.text}
              theme={{
                colors: {
                  onSurface: theme.colors.text,
                  onSurfaceVariant: theme.colors.onSurfaceVariant,
                  primary: theme.colors.primary,
                },
              }}
            />
            <TextInput
              label="Total Required"
              value={pinForm.totalRequired}
              onChangeText={(text) => setPinForm({ ...pinForm, totalRequired: text })}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              textColor={theme.colors.text}
              theme={{
                colors: {
                  onSurface: theme.colors.text,
                  onSurfaceVariant: theme.colors.onSurfaceVariant,
                  primary: theme.colors.primary,
                },
              }}
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={handleDeletePin} textColor={constructionColors.urgent}>
              Delete
            </Button>
            <Button onPress={() => setShowEditPinModal(false)} textColor={theme.colors.onSurface}>
              Cancel
            </Button>
            <Button onPress={handleUpdatePin} mode="contained" buttonColor={theme.colors.primary}>
              Update
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Create New Floor Modal - Dark Mode */}
      <Portal>
        <Dialog
          visible={showCreateFloorModal}
          onDismiss={() => {
            setShowCreateFloorModal(false);
            setNewFloorName('');
            setNewFloorImageUri(null);
          }}
          style={[styles.dialog, styles.darkDialog]}
          theme={{
            colors: {
              surface: '#1E1E1E',
              onSurface: '#FFFFFF',
              primary: theme.colors.primary,
            },
          }}
        >
          <Dialog.Title style={styles.darkDialogTitle}>Create New Floor</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Floor Name *"
              value={newFloorName}
              onChangeText={setNewFloorName}
              placeholder="e.g., 1st Floor, 2nd Floor, Basement"
              mode="outlined"
              style={[styles.input, styles.darkInput]}
              textColor="#FFFFFF"
              placeholderTextColor="#888888"
              theme={{
                colors: {
                  onSurface: '#FFFFFF',
                  onSurfaceVariant: '#888888',
                  primary: theme.colors.primary,
                  outline: '#444444',
                },
              }}
            />
            <Paragraph style={styles.darkFloorHint}>
              Examples: Ground Floor, 1st Floor, 2nd Floor, Basement, Roof
            </Paragraph>

            {/* Blueprint Image Upload - Required */}
            <View style={styles.imageUploadSection}>
              <Paragraph style={styles.darkSectionLabel}>Blueprint Image *</Paragraph>
              {!newFloorImageUri && (
                <Paragraph style={styles.darkRequiredHint}>
                  A blueprint image is required for each floor
                </Paragraph>
              )}
              {newFloorImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: newFloorImageUri }} 
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <View style={styles.imagePreviewActions}>
                    <Button
                      mode="outlined"
                      onPress={async () => {
                        try {
                          const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: false,
                            quality: 0.9,
                          });

                          if (!result.canceled && result.assets[0]) {
                            setNewFloorImageUri(result.assets[0].uri);
                          }
                        } catch (error: any) {
                          Alert.alert('Error', `Failed to select image: ${error.message}`);
                        }
                      }}
                      textColor="#FFFFFF"
                      style={styles.imageActionButton}
                      compact
                    >
                      Change
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => setNewFloorImageUri(null)}
                      textColor={constructionColors.urgent}
                      style={styles.imageActionButton}
                      compact
                    >
                      Remove
                    </Button>
                  </View>
                </View>
              ) : (
                <Button
                  mode="outlined"
                  icon="upload"
                  onPress={async () => {
                    try {
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: false,
                        quality: 0.9,
                      });

                      if (!result.canceled && result.assets[0]) {
                        setNewFloorImageUri(result.assets[0].uri);
                      }
                    } catch (error: any) {
                      Alert.alert('Error', `Failed to select image: ${error.message}`);
                    }
                  }}
                  textColor="#FFFFFF"
                  style={styles.uploadButton}
                >
                  Upload Blueprint Image *
                </Button>
              )}
            </View>
          </Dialog.Content>
          <Dialog.Actions style={styles.darkDialogActions}>
            <Button
              onPress={() => {
                setShowCreateFloorModal(false);
                setNewFloorName('');
                setNewFloorImageUri(null);
              }}
              textColor="#FFFFFF"
            >
              Cancel
            </Button>
            <Button
              onPress={async () => {
                if (!newFloorName.trim()) {
                  Alert.alert('Error', 'Please enter a floor name');
                  return;
                }

                if (!newFloorImageUri) {
                  Alert.alert('Error', 'Please upload a blueprint image. Each floor requires a unique blueprint.');
                  return;
                }

                // Check if floor already exists
                const existing = allBlueprints.find(bp => bp.floor.toLowerCase() === newFloorName.trim().toLowerCase());
                if (existing) {
                  Alert.alert('Error', `Floor "${newFloorName}" already exists`);
                  return;
                }

                try {
                  setUploadingNewFloorImage(true);
                  await createBlueprint(projectId, newFloorName.trim(), newFloorImageUri);
                  setSelectedFloor(newFloorName.trim());
                  setShowCreateFloorModal(false);
                  setNewFloorName('');
                  setNewFloorImageUri(null);
                  await loadBlueprint();
                  setUploadingNewFloorImage(false);
                  Alert.alert('Success', `Floor "${newFloorName}" created successfully`);
                } catch (error: any) {
                  setUploadingNewFloorImage(false);
                  Alert.alert('Error', `Failed to create floor: ${error.message}`);
                }
              }}
              mode="contained"
              buttonColor={theme.colors.primary}
              disabled={uploadingNewFloorImage || !newFloorImageUri}
              loading={uploadingNewFloorImage}
            >
              {uploadingNewFloorImage ? 'Creating...' : 'Create'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Rename Floor Modal - Dark Mode */}
      <Portal>
        <Dialog
          visible={showRenameFloorModal}
          onDismiss={() => {
            setShowRenameFloorModal(false);
            setFloorToRename(null);
            setRenameFloorName('');
          }}
          style={[styles.dialog, styles.darkDialog]}
          theme={{
            colors: {
              surface: '#1E1E1E',
              onSurface: '#FFFFFF',
              primary: theme.colors.primary,
            },
          }}
        >
          <Dialog.Title style={styles.darkDialogTitle}>Rename Floor</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Floor Name *"
              value={renameFloorName}
              onChangeText={setRenameFloorName}
              placeholder="e.g., 1st Floor, 2nd Floor, Basement"
              mode="outlined"
              style={[styles.input, styles.darkInput]}
              textColor="#FFFFFF"
              placeholderTextColor="#888888"
              theme={{
                colors: {
                  onSurface: '#FFFFFF',
                  onSurfaceVariant: '#888888',
                  primary: theme.colors.primary,
                  outline: '#444444',
                },
              }}
            />
            <Paragraph style={styles.darkFloorHint}>
              Current name: {floorToRename?.floor}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions style={styles.darkDialogActions}>
            <Button
              onPress={() => {
                setShowRenameFloorModal(false);
                setFloorToRename(null);
                setRenameFloorName('');
              }}
              textColor="#FFFFFF"
            >
              Cancel
            </Button>
            <Button
              onPress={async () => {
                if (!renameFloorName.trim() || !floorToRename) {
                  Alert.alert('Error', 'Please enter a floor name');
                  return;
                }

                if (renameFloorName.trim() === floorToRename.floor) {
                  Alert.alert('Info', 'Floor name unchanged');
                  setShowRenameFloorModal(false);
                  setFloorToRename(null);
                  setRenameFloorName('');
                  return;
                }

                // Check if new name already exists
                const existing = allBlueprints.find(
                  bp => bp.id !== floorToRename.id && 
                  bp.floor.toLowerCase() === renameFloorName.trim().toLowerCase()
                );
                if (existing) {
                  Alert.alert('Error', `Floor "${renameFloorName}" already exists`);
                  return;
                }

                try {
                  const blueprintRef = doc(db, 'blueprints', floorToRename.id);
                  await updateDoc(blueprintRef, {
                    floor: renameFloorName.trim(),
                    updatedAt: serverTimestamp()
                  });

                  // Update selected floor if it was the renamed one
                  if (selectedFloor === floorToRename.floor) {
                    setSelectedFloor(renameFloorName.trim());
                  }

                  setShowRenameFloorModal(false);
                  setFloorToRename(null);
                  setRenameFloorName('');
                  await loadBlueprint();
                  Alert.alert('Success', `Floor renamed to "${renameFloorName}" successfully`);
                } catch (error: any) {
                  Alert.alert('Error', `Failed to rename floor: ${error.message}`);
                }
              }}
              mode="contained"
              buttonColor={theme.colors.primary}
            >
              Rename
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Floor Modal - Dark Mode */}
      <Portal>
        <Dialog
          visible={showDeleteFloorModal}
          onDismiss={() => {
            setShowDeleteFloorModal(false);
            setFloorToDelete(null);
          }}
          style={[styles.dialog, styles.darkDialog]}
          theme={{
            colors: {
              surface: '#1E1E1E',
              onSurface: '#FFFFFF',
              primary: theme.colors.primary,
            },
          }}
        >
          <Dialog.Title style={styles.darkDialogTitle}>Delete Floor</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.darkDialogText}>
              Are you sure you want to delete "{floorToDelete?.floor}"?
            </Paragraph>
            {floorToDelete && floorToDelete.pins.length > 0 && (
              <Paragraph style={styles.darkDialogWarning}>
                ⚠️ This floor has {floorToDelete.pins.length} pin(s). All pins will be deleted.
              </Paragraph>
            )}
            <Paragraph style={styles.darkDialogText}>
              This action cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions style={styles.darkDialogActions}>
            <Button
              onPress={() => {
                setShowDeleteFloorModal(false);
                setFloorToDelete(null);
              }}
              textColor="#FFFFFF"
            >
              Cancel
            </Button>
            <Button
              onPress={async () => {
                if (!floorToDelete) return;

                try {
                  // If this is the selected floor, switch to another floor first
                  if (selectedFloor === floorToDelete.floor) {
                    const otherFloors = allBlueprints.filter(bp => bp.id !== floorToDelete.id);
                    if (otherFloors.length > 0) {
                      setSelectedFloor(otherFloors[0].floor);
                    }
                  }

                  await deleteBlueprint(floorToDelete.id);
                  setShowDeleteFloorModal(false);
                  setFloorToDelete(null);
                  await loadBlueprint();
                  Alert.alert('Success', `Floor "${floorToDelete.floor}" deleted successfully`);
                } catch (error: any) {
                  Alert.alert('Error', `Failed to delete floor: ${error.message}`);
                }
              }}
              mode="contained"
              buttonColor={constructionColors.urgent}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Upload Progress */}
      {uploadingImage && (
        <View style={styles.uploadOverlay}>
          <Surface style={styles.uploadCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Paragraph style={styles.uploadText}>Uploading blueprint...</Paragraph>
            <ProgressBar progress={uploadProgress / 100} color={theme.colors.primary} />
          </Surface>
        </View>
      )}
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
  emptyTextMain: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
  },
  backButton: {
    marginTop: spacing.lg,
  },
  pinTypeCard: {
    margin: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: theme.colors.surface,
    elevation: 1,
  },
  darkPinTypeCard: {
    backgroundColor: '#1E1E1E',
  },
  pinTypeCardContent: {
    backgroundColor: theme.colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pinTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  chevronButton: {
    margin: 0,
  },
  pinTypeLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  darkPinTypeLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pinTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -spacing.xs,
    gap: spacing.xs,
  },
  pinTypeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    paddingVertical: spacing.sm,
    margin: spacing.xs / 2,
    borderRadius: theme.roundness,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    width: (screenWidth - spacing.sm * 4 - spacing.xs * 4) / 2, // 2 columns with smaller margins
    minHeight: 65,
    backgroundColor: theme.colors.background,
  },
  darkPinTypeButton: {
    backgroundColor: '#2A2A2A',
    borderColor: '#444444',
  },
  pinTypeButtonSelected: {
    borderWidth: 3,
    backgroundColor: theme.colors.primaryContainer,
  },
  darkPinTypeButtonSelected: {
    borderWidth: 3,
    backgroundColor: '#2A3A4A',
  },
  pinTypeText: {
    marginTop: spacing.xs / 3,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  darkPinTypeText: {
    marginTop: spacing.xs / 3,
    fontSize: fontSizes.xs - 2,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  pinTypeTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  darkPinTypeTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  cancelPlacementButton: {
    marginTop: spacing.md,
  },
  darkCancelPlacementButton: {
    marginTop: spacing.md,
    borderColor: '#444444',
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
  zoomableContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: screenWidth - spacing.sm * 2,
    minHeight: screenHeight * 0.65,
  },
  blueprintImage: {
    // Dimensions set dynamically in component - must match contentContainerStyle for zoom
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
  dialogContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    borderWidth: 0,
  },
  dialogLarge: {
    maxWidth: screenWidth * 0.95,
  },
  dialogContentLarge: {
    maxHeight: screenHeight * 0.75,
    padding: 0,
  },
  dialogContentScrollable: {
    maxHeight: screenHeight * 0.55,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  dialogContentInner: {
    backgroundColor: theme.colors.surface,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  dialogTitle: {
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  dialogActions: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  pinTypeChip: {
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  pinInfo: {
    marginBottom: spacing.md,
    color: theme.colors.onSurfaceVariant,
    fontSize: fontSizes.sm,
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
  },
  uploadCard: {
    padding: spacing.xl,
    borderRadius: theme.roundness,
    alignItems: 'center',
    minWidth: 200,
  },
  uploadText: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: theme.colors.text,
  },
  section: {
    marginVertical: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  workerSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
  },
  workerSelectText: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
  },
  materialsList: {
    maxHeight: 200,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    marginVertical: spacing.xs / 2,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
  },
  materialItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  materialItemContent: {
    flex: 1,
  },
  materialName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  materialQuantity: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs / 2,
  },
  menuContent: {
    backgroundColor: theme.colors.surface,
  },
  menuItemText: {
    color: theme.colors.text,
    fontSize: fontSizes.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.md,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: fontSizes.sm,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floorSelectorCard: {
    margin: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  darkFloorSelectorCard: {
    backgroundColor: '#1E1E1E',
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
  darkFloorSelectorTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  darkFloorItem: {
    backgroundColor: '#2A2A2A',
    borderColor: '#444444',
  },
  floorItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  darkFloorItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#2A3A4A',
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
  darkFloorItemName: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  floorItemNameSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  darkFloorItemNameSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  floorItemPins: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs / 2,
  },
  darkFloorItemPins: {
    fontSize: fontSizes.xs,
    color: '#888888',
    marginTop: spacing.xs / 2,
  },
  addFloorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginTop: spacing.sm,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.primaryContainer + '20',
  },
  darkAddFloorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginTop: spacing.sm,
    borderRadius: theme.roundness,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    backgroundColor: '#2A3A4A20',
  },
  addFloorText: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: theme.colors.primary,
    marginLeft: spacing.sm,
  },
  darkAddFloorText: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: theme.colors.primary,
    marginLeft: spacing.sm,
  },
  floorHint: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  floorItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  floorItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  darkDialog: {
    backgroundColor: '#1E1E1E',
    borderRadius: theme.roundness,
  },
  darkDialogTitle: {
    color: '#FFFFFF',
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  darkDialogText: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    marginBottom: spacing.sm,
  },
  darkDialogWarning: {
    color: constructionColors.urgent,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  darkDialogActions: {
    backgroundColor: '#1E1E1E',
  },
  darkInput: {
    backgroundColor: '#2A2A2A',
  },
  darkFloorHint: {
    fontSize: fontSizes.xs,
    color: '#888888',
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  imageUploadSection: {
    marginTop: spacing.md,
  },
  darkSectionLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  darkRequiredHint: {
    fontSize: fontSizes.xs,
    color: '#FFA07A',
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  imagePreviewContainer: {
    marginTop: spacing.sm,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: theme.roundness,
    marginBottom: spacing.sm,
  },
  imagePreviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  imageActionButton: {
    flex: 1,
    borderColor: '#444444',
  },
  uploadButton: {
    marginTop: spacing.sm,
    borderColor: '#444444',
  },
});

