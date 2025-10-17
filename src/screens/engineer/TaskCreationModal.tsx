import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { 
  Modal,
  Portal,
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  Chip,
  Surface,
  List,
  Divider,
  RadioButton,
  Checkbox,
  IconButton
} from 'react-native-paper';
// DateTimePicker removed for now - using simple text inputs
import { Ionicons } from '@expo/vector-icons';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import { createTask } from '../../services/taskService';

// Category and SubTask definitions with exact Tagalog labels and CNN flags
const TASK_CATEGORIES = {
  'pre_construction': {
    label: 'Pre-Construction / Site Preparation',
    tagalog: 'Paghahanda ng Lupa at Lugar',
    subtasks: [
      { id: 'site_survey', label: 'Site survey and staking', tagalog: 'Pagsusukat at pagtatanda ng lugar', cnnEligible: false },
      { id: 'soil_testing', label: 'Soil testing', tagalog: 'Pagsusuri ng lupa', cnnEligible: false },
      { id: 'clearing_grubbing', label: 'Clearing and grubbing', tagalog: 'Paglilinis ng damo at basura sa lote', cnnEligible: false },
      { id: 'demolition', label: 'Demolition', tagalog: 'Pagbubuwag ng lumang istruktura', cnnEligible: false },
      { id: 'excavation_grading', label: 'Excavation and grading', tagalog: 'Paghuhukay at pagpatag ng lupa', cnnEligible: false },
      { id: 'temp_fence', label: 'Temporary fence / perimeter barricade', tagalog: 'Pansamantalang bakod', cnnEligible: false },
      { id: 'temp_facilities', label: 'Temporary facilities', tagalog: 'Pansamantalang opisina, CR, bodega', cnnEligible: false },
      { id: 'temp_utilities', label: 'Temporary power and water supply', tagalog: 'Pansamantalang kuryente at tubig', cnnEligible: false },
    ]
  },
  'foundation': {
    label: 'Foundation Works',
    tagalog: 'Pundasyon',
    subtasks: [
      { id: 'setting_layout', label: 'Setting out / layout', tagalog: 'Pagmamarka ng sukat sa lupa', cnnEligible: false },
      { id: 'excavation_footings', label: 'Excavation for footings', tagalog: 'Paghuhukay para sa pundasyon', cnnEligible: false },
      { id: 'blinding_concrete', label: 'Blinding / lean concrete', tagalog: 'Pagbubuhos ng unang halo ng semento sa hukay', cnnEligible: false },
      { id: 'rebar_cutting', label: 'Rebar cutting and bending', tagalog: 'Pagputol at pagbaluktot ng bakal', cnnEligible: false },
      { id: 'rebar_placement', label: 'Rebar placement', tagalog: 'Pag-aayos ng bakal sa hukay', cnnEligible: false },
      { id: 'formwork_install', label: 'Formwork installation', tagalog: 'Pagkakabit ng hulmahan', cnnEligible: false },
      { id: 'concrete_pouring', label: 'Concrete pouring', tagalog: 'Pagbubuhos ng semento', cnnEligible: true },
      { id: 'backfilling', label: 'Backfilling and compaction', tagalog: 'Pagtatambak at pagpapatag ng lupa', cnnEligible: false },
      { id: 'waterproofing_foundation', label: 'Waterproofing (foundation level)', tagalog: 'Paglalagay ng waterproof sa pundasyon', cnnEligible: false },
    ]
  },
  'structural': {
    label: 'Structural Works',
    tagalog: 'Balangkas ng Gusali',
    subtasks: [
      { id: 'column_works', label: 'Column formwork, rebar, concrete', tagalog: 'Haligi', cnnEligible: false },
      { id: 'beam_works', label: 'Beam formwork, rebar, concrete', tagalog: 'Bigkis', cnnEligible: false },
      { id: 'slab_works', label: 'Slab formwork, rebar, concrete', tagalog: 'Sahig', cnnEligible: false },
      { id: 'retaining_wall', label: 'Retaining wall', tagalog: 'Pader na humahawak ng lupa', cnnEligible: false },
      { id: 'staircase_works', label: 'Staircase formwork, rebar, concrete', tagalog: 'Hagdanan', cnnEligible: false },
      { id: 'steel_works', label: 'Structural steel works', tagalog: 'Bakalan / bakal na frame', cnnEligible: false },
    ]
  },
  'masonry': {
    label: 'Masonry Works',
    tagalog: 'Pagmamason',
    subtasks: [
      { id: 'chb_laying', label: 'CHB laying', tagalog: 'Pag-aayos ng hollow blocks', cnnEligible: true },
      { id: 'partition_wall', label: 'Partition wall installation', tagalog: 'Paglalagay ng panloob na pader', cnnEligible: false },
      { id: 'plastering', label: 'Plastering / rendering', tagalog: 'Pagpalitada', cnnEligible: true },
      { id: 'wall_reinforcements', label: 'Wall reinforcements', tagalog: 'Paglalagay ng dagdag na bakal sa pader', cnnEligible: false },
      { id: 'chasing', label: 'Chasing for electrical/plumbing', tagalog: 'Pag-ukit sa pader para sa tubo o kable', cnnEligible: false },
    ]
  },
  'roofing': {
    label: 'Roofing Works',
    tagalog: 'Bubungan',
    subtasks: [
      { id: 'roof_truss', label: 'Roof truss fabrication and installation', tagalog: 'Roof truss fabrication and installation', cnnEligible: false },
      { id: 'purlins', label: 'Purlins installation', tagalog: 'Purlins installation', cnnEligible: false },
      { id: 'roof_sheeting', label: 'Roof sheeting / panel installation', tagalog: 'Roof sheeting / panel installation', cnnEligible: false },
      { id: 'roof_insulation', label: 'Roof insulation', tagalog: 'Roof insulation', cnnEligible: false },
      { id: 'gutter_downspout', label: 'Gutter and downspout installation', tagalog: 'Gutter and downspout installation', cnnEligible: false },
      { id: 'roof_waterproofing', label: 'Roof waterproofing / sealant', tagalog: 'Roof waterproofing / sealant', cnnEligible: false },
    ]
  },
  'carpentry': {
    label: 'Carpentry and Joinery',
    tagalog: 'Pagkakarpintero',
    subtasks: [
      { id: 'ceiling_framing', label: 'Ceiling framing', tagalog: 'Ceiling framing', cnnEligible: false },
      { id: 'ceiling_board', label: 'Ceiling board installation', tagalog: 'Ceiling board installation', cnnEligible: false },
      { id: 'door_window_frame', label: 'Door and window frame installation', tagalog: 'Door and window frame installation', cnnEligible: false },
      { id: 'cabinets', label: 'Cabinets and built-in furniture', tagalog: 'Cabinets and built-in furniture', cnnEligible: false },
      { id: 'shelves_counters', label: 'Shelves and counters', tagalog: 'Shelves and counters', cnnEligible: false },
      { id: 'wood_trims', label: 'Wood trims, baseboards, moldings', tagalog: 'Wood trims, baseboards, moldings', cnnEligible: false },
    ]
  },
  'electrical': {
    label: 'Electrical Works',
    tagalog: 'Pagkakabit ng Kuryente',
    subtasks: [
      { id: 'conduit_box', label: 'Conduit and box installation', tagalog: 'Conduit and box installation', cnnEligible: false },
      { id: 'wiring_pulling', label: 'Wiring pulling', tagalog: 'Wiring pulling', cnnEligible: false },
      { id: 'switch_outlet', label: 'Switch and outlet installation', tagalog: 'Switch and outlet installation', cnnEligible: false },
      { id: 'lighting_fixture', label: 'Lighting fixture installation', tagalog: 'Lighting fixture installation', cnnEligible: false },
      { id: 'circuit_breaker', label: 'Circuit breaker panel installation', tagalog: 'Circuit breaker panel installation', cnnEligible: false },
      { id: 'grounding', label: 'Grounding', tagalog: 'Grounding', cnnEligible: false },
      { id: 'testing_commissioning', label: 'Testing and commissioning', tagalog: 'Testing and commissioning', cnnEligible: false },
    ]
  },
  'plumbing': {
    label: 'Plumbing and Sanitary Works',
    tagalog: 'Tubero at Tubig',
    subtasks: [
      { id: 'water_supply_pipe', label: 'Water supply pipe installation', tagalog: 'Water supply pipe installation', cnnEligible: false },
      { id: 'drainage_pipe', label: 'Drainage pipe installation', tagalog: 'Drainage pipe installation', cnnEligible: false },
      { id: 'vent_pipe', label: 'Vent pipe installation', tagalog: 'Vent pipe installation', cnnEligible: false },
      { id: 'plumbing_fixture', label: 'Plumbing fixture installation', tagalog: 'Plumbing fixture installation', cnnEligible: false },
      { id: 'septic_tank', label: 'Septic tank construction', tagalog: 'Septic tank construction', cnnEligible: false },
      { id: 'water_tank', label: 'Water tank installation', tagalog: 'Water tank installation', cnnEligible: false },
      { id: 'pressure_testing', label: 'Pressure testing', tagalog: 'Pressure testing', cnnEligible: false },
    ]
  },
  'finishing': {
    label: 'Finishing Works',
    tagalog: 'Panghuling Gawa',
    subtasks: [
      { id: 'tile_laying', label: 'Tile laying (floor and wall)', tagalog: 'Paglalagay ng tiles', cnnEligible: true },
      { id: 'grouting_sealing', label: 'Grouting and sealing', tagalog: 'Paglalagay ng grout', cnnEligible: false },
      { id: 'painting', label: 'Painting (primer, topcoat)', tagalog: 'Pagpintura', cnnEligible: true },
      { id: 'decorative_finishes', label: 'Decorative finishes', tagalog: 'Palamuti', cnnEligible: false },
      { id: 'window_glazing', label: 'Window glazing', tagalog: 'Pagkakabit ng salamin', cnnEligible: false },
      { id: 'door_hanging', label: 'Door hanging', tagalog: 'Pagkakabit ng pinto', cnnEligible: false },
      { id: 'final_floor_finish', label: 'Final floor finish (polish, varnish, epoxy)', tagalog: 'Panghuling sahig', cnnEligible: false },
    ]
  }
};

interface TaskCreationModalProps {
  visible: boolean;
  onDismiss: () => void;
  onTaskCreated: (taskData: any) => void;
}

export default function TaskCreationModal({ visible, onDismiss, onTaskCreated }: TaskCreationModalProps) {
  const { state } = useProjectData();
  
  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubTask, setSelectedSubTask] = useState<string>('');
  const [plannedStartDate, setPlannedStartDate] = useState(new Date());
  const [plannedEndDate, setPlannedEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [startDateText, setStartDateText] = useState(new Date().toISOString().split('T')[0]);
  const [endDateText, setEndDateText] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [isCreating, setIsCreating] = useState(false);

  // UI state
  const [currentStep, setCurrentStep] = useState<'category' | 'subtask' | 'details'>('category');

  const resetForm = () => {
    setSelectedCategory('');
    setSelectedSubTask('');
    setStartDateText(new Date().toISOString().split('T')[0]);
    setEndDateText(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setSelectedWorkers([]);
    setNotes('');
    setCurrentStep('category');
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubTask('');
    setCurrentStep('subtask');
  };

  const handleSubTaskSelect = (subtaskId: string) => {
    setSelectedSubTask(subtaskId);
    setCurrentStep('details');
  };

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkers(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const validateForm = () => {
    if (!selectedCategory || !selectedSubTask) {
      Alert.alert('Missing Selection', 'Please select a category and sub-task.');
      return false;
    }
    
    if (selectedWorkers.length === 0) {
      Alert.alert('Missing Workers', 'Please assign at least one worker to this task.');
      return false;
    }

    const startDate = new Date(startDateText);
    const endDate = new Date(endDateText);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      Alert.alert('Invalid Dates', 'Please enter valid dates in YYYY-MM-DD format.');
      return false;
    }
    
    if (endDate <= startDate) {
      Alert.alert('Invalid Dates', 'End date must be after start date.');
      return false;
    }

    return true;
  };

  const handleCreateTask = async () => {
    if (!validateForm()) return;

    setIsCreating(true);

    const category = TASK_CATEGORIES[selectedCategory as keyof typeof TASK_CATEGORIES];
    const subtask = category.subtasks.find(s => s.id === selectedSubTask);
    
    try {
      const taskData = {
        projectId: projectId,
        title: subtask?.label || selectedSubTask,
        category: selectedCategory,
        subTask: selectedSubTask,
        tagalogLabel: subtask?.tagalog || '',
        planned_start_date: startDateText,
        planned_end_date: endDateText,
        assigned_worker_ids: selectedWorkers,
        assigned_worker_names: selectedWorkers.map(id => {
          const worker = state.workers.find(w => w.id === id);
          return worker?.name || `Worker ${id}`;
        }),
        cnnEligible: subtask?.cnnEligible || false,
        notes,
      };

      // Save to Firebase
      const createdTask = await createTask(taskData);
      
      setIsCreating(false);
      onTaskCreated(createdTask);
      resetForm();
      onDismiss();
      Alert.alert(
        'Task Created',
        `Task "${subtask?.label}" has been created and saved to Firestore.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      setIsCreating(false);
      Alert.alert(
        'Error Creating Task',
        error.message || 'Failed to create task. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderCategoryStep = () => (
    <ScrollView style={styles.stepContent}>
      <Title style={styles.stepTitle}>Select Category</Title>
      <Paragraph style={styles.stepSubtitle}>Choose the work category for this task</Paragraph>
      
      {Object.entries(TASK_CATEGORIES).map(([categoryId, categoryData]) => (
        <TouchableOpacity 
          key={categoryId}
          onPress={() => handleCategorySelect(categoryId)}
        >
          <Card style={styles.categoryCard}>
            <Card.Content>
              <Title style={styles.categoryTitle}>{categoryData.label}</Title>
              <Paragraph style={styles.categoryTagalog}>{categoryData.tagalog}</Paragraph>
              <View style={styles.categoryMeta}>
                <Chip 
                  icon="list" 
                  style={styles.subtaskCountChip}
                  textStyle={{ fontSize: 12 }}
                >
                  {categoryData.subtasks.length} tasks
                </Chip>
                <Chip 
                  icon="brain" 
                  style={[styles.cnnCountChip, { backgroundColor: '#9C27B0' }]}
                  textStyle={{ color: 'white', fontSize: 12 }}
                >
                  {categoryData.subtasks.filter(s => s.cnnEligible).length} CNN
                </Chip>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSubTaskStep = () => {
    const category = TASK_CATEGORIES[selectedCategory as keyof typeof TASK_CATEGORIES];
    if (!category) return null;

    return (
      <ScrollView style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => setCurrentStep('category')}
          />
          <View>
            <Title style={styles.stepTitle}>Select Sub-Task</Title>
            <Paragraph style={styles.stepSubtitle}>{category.label}</Paragraph>
          </View>
        </View>
        
        {category.subtasks.map((subtask) => (
          <TouchableOpacity 
            key={subtask.id}
            onPress={() => handleSubTaskSelect(subtask.id)}
          >
            <Card style={styles.subtaskCard}>
              <Card.Content>
                <View style={styles.subtaskHeader}>
                  <View style={styles.subtaskInfo}>
                    <Title style={styles.subtaskTitle}>{subtask.label}</Title>
                    <Paragraph style={styles.subtaskTagalog}>{subtask.tagalog}</Paragraph>
                  </View>
                  {subtask.cnnEligible && (
                    <Chip 
                      icon="brain" 
                      style={[styles.cnnChip, { backgroundColor: '#9C27B0' }]}
                      textStyle={{ color: 'white', fontSize: 10 }}
                    >
                      CNN
                    </Chip>
                  )}
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderDetailsStep = () => {
    const category = TASK_CATEGORIES[selectedCategory as keyof typeof TASK_CATEGORIES];
    const subtask = category?.subtasks.find(s => s.id === selectedSubTask);
    if (!category || !subtask) return null;

    return (
      <ScrollView style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => setCurrentStep('subtask')}
          />
          <View>
            <Title style={styles.stepTitle}>Task Details</Title>
            <Paragraph style={styles.stepSubtitle}>{subtask.label}</Paragraph>
          </View>
        </View>

        {/* Selected Task Info */}
        <Surface style={styles.selectedTaskInfo}>
          <Title style={styles.selectedTaskTitle}>{subtask.label}</Title>
          <Paragraph style={styles.selectedTaskTagalog}>{subtask.tagalog}</Paragraph>
          {subtask.cnnEligible && (
            <Chip 
              icon="brain" 
              style={[styles.cnnChip, { backgroundColor: '#9C27B0' }]}
              textStyle={{ color: 'white', fontSize: 12 }}
            >
              CNN Eligible Task
            </Chip>
          )}
        </Surface>

        {/* Date Selection */}
        <View style={styles.dateSection}>
          <Title style={styles.sectionTitle}>Planned Timeline</Title>
          
          <TextInput
            label="Start Date * (YYYY-MM-DD)"
            value={startDateText}
            onChangeText={setStartDateText}
            style={styles.dateInput}
            placeholder="2024-01-30"
            right={<TextInput.Icon icon="calendar" />}
          />

          <TextInput
            label="End Date * (YYYY-MM-DD)"
            value={endDateText}
            onChangeText={setEndDateText}
            style={styles.dateInput}
            placeholder="2024-02-05"
            right={<TextInput.Icon icon="calendar" />}
          />

          <Paragraph style={styles.durationText}>
            Duration: {Math.ceil((new Date(endDateText).getTime() - new Date(startDateText).getTime()) / (1000 * 60 * 60 * 24)) || 0} days
          </Paragraph>
        </View>

        {/* Worker Assignment */}
        <View style={styles.workerSection}>
          <Title style={styles.sectionTitle}>Assign Workers *</Title>
          {state.workers.map((worker) => (
            <TouchableOpacity 
              key={worker.id}
              style={styles.workerItem}
              onPress={() => handleWorkerToggle(worker.id)}
            >
              <View style={styles.workerInfo}>
                <Checkbox
                  status={selectedWorkers.includes(worker.id) ? 'checked' : 'unchecked'}
                  onPress={() => handleWorkerToggle(worker.id)}
                />
                <View style={styles.workerDetails}>
                  <Paragraph style={styles.workerName}>{worker.name}</Paragraph>
                  <Paragraph style={styles.workerRole}>{worker.role}</Paragraph>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <TextInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.notesInput}
          placeholder="Additional details, requirements, or special instructions..."
        />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={styles.cancelButton}
            disabled={isCreating}
          >
            Cancel
          </Button>
          
          <Button
            mode="contained"
            onPress={handleCreateTask}
            style={styles.createButton}
            loading={isCreating}
            disabled={isCreating}
            icon="plus"
          >
            Create Task
          </Button>
        </View>
      </ScrollView>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Card style={styles.modalCard}>
          <Card.Content style={styles.modalContent}>
            {currentStep === 'category' && renderCategoryStep()}
            {currentStep === 'subtask' && renderSubTaskStep()}
            {currentStep === 'details' && renderDetailsStep()}
          </Card.Content>
        </Card>


      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: spacing.md,
    maxHeight: '90%',
  },
  modalCard: {
    flex: 1,
    borderRadius: theme.roundness,
  },
  modalContent: {
    flex: 1,
    padding: 0,
  },
  stepContent: {
    flex: 1,
    padding: spacing.md,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  stepSubtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  categoryCard: {
    marginBottom: spacing.sm,
    elevation: 1,
  },
  categoryTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  categoryTagalog: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  categoryMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  subtaskCountChip: {
    backgroundColor: theme.colors.primaryContainer,
    height: 28,
  },
  cnnCountChip: {
    height: 28,
  },
  subtaskCard: {
    marginBottom: spacing.sm,
    elevation: 1,
  },
  subtaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subtaskInfo: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  subtaskTagalog: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  cnnChip: {
    height: 28,
  },
  selectedTaskInfo: {
    padding: spacing.md,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
  },
  selectedTaskTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.onPrimaryContainer,
    marginBottom: spacing.xs,
  },
  selectedTaskTagalog: {
    fontSize: fontSizes.sm,
    color: theme.colors.onPrimaryContainer,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  dateSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  dateInput: {
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  durationText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  workerSection: {
    marginBottom: spacing.md,
  },
  workerItem: {
    marginBottom: spacing.xs,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerDetails: {
    marginLeft: spacing.sm,
  },
  workerName: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  workerRole: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
  },
  notesInput: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderColor: theme.colors.outline,
  },
  createButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
});
