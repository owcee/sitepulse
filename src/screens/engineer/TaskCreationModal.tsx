import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
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
import { getProjectWorkers } from '../../services/firebaseService';

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
  const { state, projectId } = useProjectData();
  
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
  const [projectWorkers, setProjectWorkers] = useState<any[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [taskStatus, setTaskStatus] = useState<'not_started' | 'in_progress' | 'completed'>('not_started');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startCalendarMonth, setStartCalendarMonth] = useState(new Date().getMonth());
  const [startCalendarYear, setStartCalendarYear] = useState(new Date().getFullYear());
  const [endCalendarMonth, setEndCalendarMonth] = useState(new Date().getMonth());
  const [endCalendarYear, setEndCalendarYear] = useState(new Date().getFullYear());

  // UI state
  const [currentStep, setCurrentStep] = useState<'category' | 'subtask' | 'details'>('category');

  // Load project workers when modal opens
  React.useEffect(() => {
    if (visible && projectId) {
      loadProjectWorkers();
    }
  }, [visible, projectId]);

  const loadProjectWorkers = async () => {
    try {
      setLoadingWorkers(true);
      const workers = await getProjectWorkers(projectId);
      setProjectWorkers(workers);
    } catch (error) {
      console.error('Error loading project workers:', error);
      setProjectWorkers([]);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setSelectedSubTask('');
    setStartDateText(new Date().toISOString().split('T')[0]);
    setEndDateText(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setTaskStatus('not_started');
    setSelectedWorkers([]);
    setNotes('');
    setCurrentStep('category');
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    setStartCalendarMonth(new Date().getMonth());
    setStartCalendarYear(new Date().getFullYear());
    setEndCalendarMonth(new Date().getMonth());
    setEndCalendarYear(new Date().getFullYear());
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
          const worker = projectWorkers.find(w => w.id === id);
          return worker?.name || `Worker ${id}`;
        }),
        cnnEligible: subtask?.cnnEligible || false,
        status: taskStatus,
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

  const handleDateIconPress = (type: 'start' | 'end') => {
    if (type === 'start') {
      setShowStartDatePicker(true);
    } else {
      setShowEndDatePicker(true);
    }
  };

  const handleDateSelect = (type: 'start' | 'end', date: Date) => {
    // Format date in local timezone to avoid timezone conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    if (type === 'start') {
      setStartDateText(formattedDate);
      setShowStartDatePicker(false);
    } else {
      setEndDateText(formattedDate);
      setShowEndDatePicker(false);
    }
  };

  const renderCalendar = (type: 'start' | 'end') => {
    const currentMonth = type === 'start' ? startCalendarMonth : endCalendarMonth;
    const currentYear = type === 'start' ? startCalendarYear : endCalendarYear;
    const setCurrentMonth = type === 'start' ? setStartCalendarMonth : setEndCalendarMonth;
    const setCurrentYear = type === 'start' ? setStartCalendarYear : setEndCalendarYear;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const getDaysArray = () => {
      const days = [];
      
      // Previous month days
      const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
        date.setHours(0, 0, 0, 0);
        days.push({ date, isCurrentMonth: false, isToday: false });
      }
      
      // Current month days
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        date.setHours(0, 0, 0, 0);
        const isToday = date.getTime() === today.getTime();
        days.push({ date, isCurrentMonth: true, isToday });
      }
      
      // Next month days to fill the grid
      const remainingDays = 42 - days.length; // 6 rows * 7 days
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(currentYear, currentMonth + 1, day);
        date.setHours(0, 0, 0, 0);
        days.push({ date, isCurrentMonth: false, isToday: false });
      }
      
      return days;
    };
    
    const navigateMonth = (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        if (currentMonth === 0) {
          setCurrentMonth(11);
          setCurrentYear(currentYear - 1);
        } else {
          setCurrentMonth(currentMonth - 1);
        }
      } else {
        if (currentMonth === 11) {
          setCurrentMonth(0);
          setCurrentYear(currentYear + 1);
        } else {
          setCurrentMonth(currentMonth + 1);
        }
      }
    };
    
    const days = getDaysArray();
    const selectedDate = type === 'start' ? startDateText : endDateText;
    
    return (
      <View style={styles.calendarContainer}>
        {/* Month/Year Header */}
        <View style={styles.calendarHeader}>
          <IconButton
            icon="chevron-left"
            size={24}
            onPress={() => navigateMonth('prev')}
            iconColor={theme.colors.text}
          />
          <Title style={styles.calendarMonthYear}>
            {monthNames[currentMonth]} {currentYear}
          </Title>
          <IconButton
            icon="chevron-right"
            size={24}
            onPress={() => navigateMonth('next')}
            iconColor={theme.colors.text}
          />
        </View>
        
        {/* Days of Week Header */}
        <View style={styles.daysOfWeekContainer}>
          {daysOfWeek.map((day, index) => (
            <View key={index} style={styles.dayOfWeekHeader}>
              <Text style={styles.dayOfWeekText}>{day}</Text>
            </View>
          ))}
        </View>
        
        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {days.map((dayInfo, index) => {
            // Format date in local timezone to match selection
            const year = dayInfo.date.getFullYear();
            const month = String(dayInfo.date.getMonth() + 1).padStart(2, '0');
            const day = String(dayInfo.date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const isSelected = selectedDate === dateStr;
            const isPast = dayInfo.date < today && !dayInfo.isToday;
            const isLastInRow = (index + 1) % 7 === 0;
            const isLastRow = index >= 35;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  !dayInfo.isCurrentMonth && styles.calendarDayOtherMonth,
                  isSelected && styles.calendarDaySelected,
                  dayInfo.isToday && !isSelected && styles.calendarDayToday,
                  isLastInRow && { borderRightWidth: 0 },
                  isLastRow && { borderBottomWidth: 0 },
                ]}
                onPress={() => {
                  if (!isPast || dayInfo.isToday) {
                    handleDateSelect(type, dayInfo.date);
                  }
                }}
                disabled={isPast && !dayInfo.isToday}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    !dayInfo.isCurrentMonth && styles.calendarDayTextOtherMonth,
                    isSelected && styles.calendarDayTextSelected,
                    isPast && !dayInfo.isToday && styles.calendarDayTextPast,
                    dayInfo.isToday && !isSelected && styles.calendarDayTextToday,
                  ]}
                >
                  {dayInfo.date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCategoryStep = () => (
    <ScrollView 
      style={styles.stepContent}
      contentContainerStyle={styles.stepContentContainer}
      showsVerticalScrollIndicator={true}
    >
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
                  icon="format-list-bulleted" 
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
      <ScrollView 
        style={styles.stepContent}
        contentContainerStyle={styles.stepContentContainer}
        showsVerticalScrollIndicator={true}
      >
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
      <View style={styles.detailsContainer}>
        <ScrollView 
          style={styles.stepContent}
          contentContainerStyle={styles.stepContentContainer}
          showsVerticalScrollIndicator={true}
        >
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
              right={<TextInput.Icon icon="calendar" onPress={() => handleDateIconPress('start')} />}
            />

            <TextInput
              label="End Date * (YYYY-MM-DD)"
              value={endDateText}
              onChangeText={setEndDateText}
              style={styles.dateInput}
              placeholder="2024-02-05"
              right={<TextInput.Icon icon="calendar" onPress={() => handleDateIconPress('end')} />}
            />

            <Paragraph style={styles.durationText}>
              Duration: {Math.ceil((new Date(endDateText).getTime() - new Date(startDateText).getTime()) / (1000 * 60 * 60 * 24)) || 0} days
            </Paragraph>
          </View>

          {/* Worker Assignment */}
          <View style={styles.workerSection}>
            <Title style={styles.sectionTitle}>Assign Workers *</Title>
            {loadingWorkers ? (
              <View style={styles.loadingWorkers}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Paragraph style={styles.loadingText}>Loading workers...</Paragraph>
              </View>
            ) : projectWorkers.length === 0 ? (
              <View style={styles.emptyWorkers}>
                <Ionicons name="people-outline" size={32} color={theme.colors.onSurfaceDisabled} />
                <Paragraph style={styles.emptyText}>No workers assigned to this project yet.</Paragraph>
                <Paragraph style={styles.emptySubtext}>Please assign workers from Workers Management first.</Paragraph>
              </View>
            ) : (
              projectWorkers.map((worker) => (
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
                      <Paragraph style={styles.workerRole}>{worker.email}</Paragraph>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Task Status Selection */}
          <View style={styles.statusSection}>
            <Title style={styles.sectionTitle}>Task Status *</Title>
            <Paragraph style={styles.sectionSubtitle}>Select the current status of this task</Paragraph>
            
            <RadioButton.Group onValueChange={value => setTaskStatus(value as any)} value={taskStatus}>
              <TouchableOpacity 
                style={styles.statusOption}
                onPress={() => setTaskStatus('not_started')}
              >
                <View style={styles.statusOptionContent}>
                  <RadioButton value="not_started" />
                  <View style={styles.statusInfo}>
                    <Paragraph style={styles.statusLabel}>Not Started</Paragraph>
                    <Paragraph style={styles.statusDescription}>Task has not begun yet</Paragraph>
                  </View>
                </View>
                <Chip 
                  style={{ backgroundColor: constructionColors.notStarted }}
                  textStyle={{ color: 'white', fontSize: 10 }}
                >
                  NOT STARTED
                </Chip>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.statusOption}
                onPress={() => setTaskStatus('in_progress')}
              >
                <View style={styles.statusOptionContent}>
                  <RadioButton value="in_progress" />
                  <View style={styles.statusInfo}>
                    <Paragraph style={styles.statusLabel}>In Progress</Paragraph>
                    <Paragraph style={styles.statusDescription}>Task is currently being worked on</Paragraph>
                  </View>
                </View>
                <Chip 
                  style={{ backgroundColor: constructionColors.inProgress }}
                  textStyle={{ color: 'white', fontSize: 10 }}
                >
                  IN PROGRESS
                </Chip>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.statusOption}
                onPress={() => setTaskStatus('completed')}
              >
                <View style={styles.statusOptionContent}>
                  <RadioButton value="completed" />
                  <View style={styles.statusInfo}>
                    <Paragraph style={styles.statusLabel}>Completed</Paragraph>
                    <Paragraph style={styles.statusDescription}>Task has been finished</Paragraph>
                  </View>
                </View>
                <Chip 
                  style={{ backgroundColor: constructionColors.complete }}
                  textStyle={{ color: 'white', fontSize: 10 }}
                >
                  COMPLETED
                </Chip>
              </TouchableOpacity>
            </RadioButton.Group>
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
        </ScrollView>

        {/* Action Buttons - OUTSIDE ScrollView */}
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
      </View>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.modalCard}>
          {currentStep === 'category' && renderCategoryStep()}
          {currentStep === 'subtask' && renderSubTaskStep()}
          {currentStep === 'details' && renderDetailsStep()}
        </View>
      </Modal>

      {/* Date Picker Modals */}
      <Portal>
        {/* Calendar Date Picker Modal for Start Date */}
        <Modal
          visible={showStartDatePicker}
          onDismiss={() => setShowStartDatePicker(false)}
          contentContainerStyle={styles.datePickerContainer}
        >
          <Surface style={styles.datePickerSurface}>
            <Title style={styles.datePickerTitle}>Select Start Date</Title>
            {renderCalendar('start')}
            <View style={styles.datePickerActions}>
              <Button onPress={() => setShowStartDatePicker(false)}>Cancel</Button>
            </View>
          </Surface>
        </Modal>

        {/* Calendar Date Picker Modal for End Date */}
        <Modal
          visible={showEndDatePicker}
          onDismiss={() => setShowEndDatePicker(false)}
          contentContainerStyle={styles.datePickerContainer}
        >
          <Surface style={styles.datePickerSurface}>
            <Title style={styles.datePickerTitle}>Select End Date</Title>
            {renderCalendar('end')}
            <View style={styles.datePickerActions}>
              <Button onPress={() => setShowEndDatePicker(false)}>Cancel</Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: spacing.md,
    height: '85%',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    height: '100%',
    elevation: 4,
  },
  modalContent: {
    flex: 1,
    padding: 0,
  },
  detailsContainer: {
    flex: 1,
    height: '100%',
  },
  stepContent: {
    flex: 1,
  },
  stepContentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
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
    backgroundColor: theme.colors.background,
  },
  categoryTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.text,
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
    backgroundColor: theme.colors.background,
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
    color: theme.colors.text,
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
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: theme.roundness,
    marginBottom: spacing.md,
  },
  selectedTaskTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  selectedTaskTagalog: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  dateSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  dateInput: {
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.background,
  },
  durationText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  workerSection: {
    marginBottom: spacing.md,
  },
  statusSection: {
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness,
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  statusLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusDescription: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.text,
  },
  workerRole: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
  },
  loadingWorkers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  loadingText: {
    marginLeft: spacing.sm,
    color: theme.colors.onSurfaceVariant,
  },
  emptyWorkers: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness,
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceDisabled,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  notesInput: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.background,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    backgroundColor: theme.colors.surface,
  },
  cancelButton: {
    flex: 1,
    borderColor: theme.colors.outline,
  },
  createButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  datePickerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  datePickerSurface: {
    width: '85%',
    maxWidth: 350,
    padding: spacing.md,
    paddingBottom: spacing.sm,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.background,
    elevation: 4,
  },
  datePickerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  datePickerActions: {
    marginTop: spacing.sm,
    alignItems: 'flex-end',
  },
  calendarContainer: {
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  calendarMonthYear: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  dayOfWeekHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dayOfWeekText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.background,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: theme.colors.background,
  },
  calendarDayOtherMonth: {
    backgroundColor: theme.colors.background,
  },
  calendarDaySelected: {
    backgroundColor: theme.colors.primary,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  calendarDayText: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
  },
  calendarDayTextOtherMonth: {
    color: theme.colors.onSurfaceDisabled,
  },
  calendarDayTextSelected: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  calendarDayTextPast: {
    color: theme.colors.onSurfaceDisabled,
  },
  calendarDayTextToday: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
