import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, Text } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Chip, 
  Badge, 
  Searchbar,
  IconButton,
  FAB,
  Surface,
  Modal,
  Portal,
  TextInput,
  Button,
  Divider,
  List,
  SegmentedButtons,
  ActivityIndicator
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import TaskCreationModal from './TaskCreationModal';
import { subscribeToProjectTasks, Task as FirebaseTask, updateTask, updateTaskStatus, deleteTask } from '../../services/taskService';

// Task data model for Firestore
interface TaskData {
  id: string;
  projectId: string;
  category: string;
  subTask: string;
  tagalogLabel: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  assigned_worker_ids: string[];
  assigned_worker_names: string[];
  cnnEligible: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  notes?: string;
  verification?: {
    lastSubmissionId?: string;
    engineerStatus?: 'pending' | 'approved' | 'rejected';
    engineerNotes?: string;
    cnnResult?: {
      label: string;
      score: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

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
      { id: 'plastering', label: 'Plastering / rendering', tagalog: 'Pagpalitada', cnnEligible: false },
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
      { id: 'roof_sheeting', label: 'Roof sheeting / panel installation', tagalog: 'Roof sheeting / panel installation', cnnEligible: true },
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

type FolderView = 'folders' | 'not_started' | 'in_progress' | 'completed';

export default function TasksScreen() {
  const navigation = useNavigation();
  const { state, projectId } = useProjectData();
  const [currentView, setCurrentView] = useState<FolderView>('folders');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<FirebaseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<FirebaseTask | null>(null);
  const [showTaskActionModal, setShowTaskActionModal] = useState(false);
  const [dateChangeModalVisible, setDateChangeModalVisible] = useState(false);
  const [pendingStatusTarget, setPendingStatusTarget] = useState<'not_started' | 'in_progress' | null>(null);
  const [dateInputStart, setDateInputStart] = useState('');
  const [dateInputEnd, setDateInputEnd] = useState('');
  const [dateModalTitle, setDateModalTitle] = useState('');
  const [dateModalMessage, setDateModalMessage] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startCalendarMonth, setStartCalendarMonth] = useState(new Date().getMonth());
  const [startCalendarYear, setStartCalendarYear] = useState(new Date().getFullYear());
  const [endCalendarMonth, setEndCalendarMonth] = useState(new Date().getMonth());
  const [endCalendarYear, setEndCalendarYear] = useState(new Date().getFullYear());

  // Subscribe to real-time tasks
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = subscribeToProjectTasks(projectId, (updatedTasks) => {
      setTasks(updatedTasks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  // Auto-update task status based on dates
  useEffect(() => {
    const checkAndUpdateTaskStatuses = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      for (const task of tasks) {
        // Auto-update not_started to in_progress when start date arrives
        if (task.status === 'not_started' && task.planned_start_date <= today) {
          try {
            await updateTaskStatus(task.id, 'in_progress');
            console.log(`Auto-updated task ${task.id} to in_progress`);
          } catch (error) {
            console.error(`Failed to auto-update task ${task.id}:`, error);
          }
        }
        
        // Auto-update in_progress to completed when end date arrives
        if (task.status === 'in_progress' && task.planned_end_date <= today) {
          try {
            await updateTask(task.id, {
              status: 'completed',
              actual_end_date: today,
            });
            console.log(`Auto-completed task ${task.id}`);
          } catch (error) {
            console.error(`Failed to auto-complete task ${task.id}:`, error);
          }
        }
      }
    };

    if (tasks.length > 0) {
      checkAndUpdateTaskStatuses();
    }
  }, [tasks]);

  const formatDateValue = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
  };

  const openRegressionDateModal = (targetStatus: 'not_started' | 'in_progress', message: string) => {
    if (!selectedTask) return;
    
    const today = new Date().toISOString().split('T')[0];
    // Use task's current dates as base, or future dates if moving back
    const currentStart = selectedTask.planned_start_date;
    const currentEnd = selectedTask.planned_end_date;
    
    // If moving back, ensure dates are in the future
    let futureStart = currentStart > today ? currentStart : formatDateValue(1);
    let futureEnd = currentEnd > today ? currentEnd : formatDateValue(14);
    
    // Ensure end date is after start date
    if (futureEnd <= futureStart) {
      futureEnd = formatDateValue(14);
    }

    setPendingStatusTarget(targetStatus);
    setDateInputStart(futureStart);
    setDateInputEnd(futureEnd);
    setDateModalTitle(targetStatus === 'not_started' ? 'Move to Not Started' : 'Move to In Progress');
    setDateModalMessage(message);
    // Close the task action modal first, then open the date modal
    setShowTaskActionModal(false);
    // Use setTimeout to ensure the modal closes before opening the new one
    setTimeout(() => {
      setDateChangeModalVisible(true);
    }, 100);
  };

  const closeDateModal = () => {
    setDateChangeModalVisible(false);
    setPendingStatusTarget(null);
    setDateModalTitle('');
    setDateModalMessage('');
    setDateInputStart('');
    setDateInputEnd('');
  };

  const isValidDateFormat = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  const handleApplyDateChange = async () => {
    if (!selectedTask || !pendingStatusTarget) return;

    const today = new Date().toISOString().split('T')[0];

    // For completed → in_progress, only end date is required
    if (pendingStatusTarget === 'in_progress' && selectedTask.status === 'completed') {
      if (!isValidDateFormat(dateInputEnd)) {
        Alert.alert('Invalid Date', 'Please enter end date in YYYY-MM-DD format.');
        return;
      }

      if (dateInputEnd < today) {
        Alert.alert('Invalid Date', 'End date cannot be in the past.');
        return;
      }

      try {
        await updateTask(selectedTask.id, {
          status: pendingStatusTarget,
          planned_end_date: dateInputEnd,
          actual_end_date: undefined, // Clear completion date
        });
        closeDateModal();
        Alert.alert('Success', 'Task moved to In Progress with new end date.');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to update task');
      }
      return;
    }

    // For other transitions, both dates are required
    if (!isValidDateFormat(dateInputStart) || !isValidDateFormat(dateInputEnd)) {
      Alert.alert('Invalid Date', 'Please enter dates in YYYY-MM-DD format.');
      return;
    }

    if (dateInputStart <= today) {
      Alert.alert('Choose Later Start Date', 'Start date must be later than today before regressing.');
      return;
    }

    if (dateInputEnd <= dateInputStart) {
      Alert.alert('Invalid Range', 'End date must be after the start date.');
      return;
    }

    try {
      await updateTask(selectedTask.id, {
        status: pendingStatusTarget,
        planned_start_date: dateInputStart,
        planned_end_date: dateInputEnd,
        actual_end_date: undefined,
      });
      closeDateModal();
      setShowTaskActionModal(false);
      Alert.alert('Success', `Task moved to ${pendingStatusTarget === 'not_started' ? 'Not Started' : 'In Progress'} with new dates.`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update task');
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString;
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
      setDateInputStart(formattedDate);
      setShowStartDatePicker(false);
    } else {
      setDateInputEnd(formattedDate);
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
    const selectedDate = type === 'start' ? dateInputStart : dateInputEnd;
    
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

  // Task counts for folder badges
  const taskCounts = {
    not_started: tasks.filter(t => t.status === 'not_started').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const getStatusColor = (status: TaskData['status']) => {
    switch (status) {
      case 'completed': return constructionColors.complete;
      case 'in_progress': return constructionColors.inProgress;
      case 'not_started': return constructionColors.notStarted;
      default: return theme.colors.outline;
    }
  };

  const renderFolderCard = (folderType: 'not_started' | 'in_progress' | 'completed') => {
    const config = {
      not_started: {
        title: 'Not Started Tasks',
        icon: 'folder-outline' as keyof typeof Ionicons.glyphMap,
        color: constructionColors.notStarted,
        description: 'Tasks ready to begin'
      },
      in_progress: {
        title: 'In Progress Tasks',
        icon: 'folder-open-outline' as keyof typeof Ionicons.glyphMap,
        color: constructionColors.inProgress,
        description: 'Active tasks being worked on'
      },
      completed: {
        title: 'Completed Tasks',
        icon: 'checkmark-done-circle-outline' as keyof typeof Ionicons.glyphMap,
        color: constructionColors.complete,
        description: 'Finished and verified tasks'
      }
    }[folderType];

    return (
      <TouchableOpacity 
        key={folderType}
        style={styles.folderCard}
        onPress={() => setCurrentView(folderType)}
      >
        <Card style={[styles.card, { borderLeftColor: config.color, borderLeftWidth: 4 }]}>
          <Card.Content style={styles.folderContent}>
            <View style={styles.folderHeader}>
              <Ionicons name={config.icon} size={48} color={config.color} />
              <Badge 
                style={[styles.taskBadge, { backgroundColor: config.color }]}
                size={24}
              >
                {taskCounts[folderType]}
              </Badge>
            </View>
            <Title style={styles.folderTitle}>{config.title}</Title>
            <Paragraph style={styles.folderDescription}>{config.description}</Paragraph>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderTaskCard = (task: FirebaseTask) => {
    const category = TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES];
    const subtask = category?.subtasks.find(s => s.id === task.subTask);
    
    return (
      <TouchableOpacity 
        key={task.id}
        style={[styles.taskCard, { overflow: 'visible' }]}
        onPress={() => handleTaskPress(task)}
        activeOpacity={0.7}
      >
        <Card style={[styles.card, { overflow: 'visible' }]}>
          <Card.Content style={{ overflow: 'visible', paddingBottom: spacing.lg, paddingTop: spacing.md }}>
            <View style={styles.taskHeader}>
              <View style={styles.taskInfo}>
                <Title style={styles.taskTitle} numberOfLines={2} ellipsizeMode="tail">
                  {task.title || subtask?.label || task.subTask}
                </Title>
                <Paragraph style={styles.taskTagalog} numberOfLines={1} ellipsizeMode="tail">
                  {task.tagalogLabel}
                </Paragraph>
                <View style={styles.taskMeta}>
                  <View style={[styles.workerChipContainer, styles.customBadge]}>
                    <Ionicons name="people" size={14} color={theme.colors.primary} style={styles.badgeIcon} />
                    <Text style={styles.workerBadgeText} numberOfLines={1}>
                      {task.assigned_worker_names.length > 0 
                        ? task.assigned_worker_names[0] 
                        : 'Unassigned'}
                    </Text>
                  </View>
                  {task.cnnEligible && (
                    <View style={[styles.cnnChipContainer, styles.customBadge, styles.cnnBadge]}>
                      <Ionicons name="sparkles" size={14} color="#FFFFFF" style={styles.badgeIcon} />
                      <Text style={styles.cnnBadgeText}>AI</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.taskStatus}>
                <Ionicons 
                  name={task.status === 'completed' ? 'checkmark-circle' : 
                        task.status === 'in_progress' ? 'time' : 'ellipse-outline'} 
                  size={24} 
                  color={getStatusColor(task.status as 'not_started' | 'in_progress' | 'completed')} 
                />
              </View>
            </View>

            <View style={styles.taskDates}>
              <Paragraph style={styles.dateText} numberOfLines={2} ellipsizeMode="tail">
                {new Date(task.planned_start_date).toLocaleDateString()} - {new Date(task.planned_end_date).toLocaleDateString()}
              </Paragraph>
              {task.actual_end_date && (
                <Paragraph style={styles.dateText} numberOfLines={1}>
                  Done: {new Date(task.actual_end_date).toLocaleDateString()}
                </Paragraph>
              )}
            </View>

            {task.verification?.engineerStatus && (
              <View style={styles.verificationSection}>
                <Chip 
                  icon={task.verification.engineerStatus === 'approved' ? 'check' : 
                        task.verification.engineerStatus === 'rejected' ? 'close' : 'clock'}
                  style={[
                    styles.verificationChip,
                    { 
                      backgroundColor: task.verification.engineerStatus === 'approved' ? constructionColors.complete :
                                       task.verification.engineerStatus === 'rejected' ? constructionColors.urgent :
                                       constructionColors.warning 
                    }
                  ]}
                  textStyle={styles.verificationChipText}
                >
                  {task.verification.engineerStatus.toUpperCase()}
                </Chip>
                {task.verification.cnnResult && (
                  <Paragraph style={styles.cnnResult} numberOfLines={1} ellipsizeMode="tail">
                    {task.verification.cnnResult.label} ({Math.round(task.verification.cnnResult.score * 100)}%)
                  </Paragraph>
                )}
              </View>
            )}

            {task.notes && (
              <Paragraph style={styles.taskNotes} numberOfLines={2} ellipsizeMode="tail">
                {task.notes}
              </Paragraph>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const handleTaskPress = (task: FirebaseTask) => {
    setSelectedTask(task);
    setShowTaskActionModal(true);
  };

  const handleChangeStatus = async (newStatus: 'not_started' | 'in_progress' | 'completed') => {
    if (!selectedTask) return;

    const currentStatus = selectedTask.status;
    const today = new Date().toISOString().split('T')[0];

    // Workflow rules:
    // - Not Started: Can only move to In Progress
    // - In Progress: Can only move to Completed
    // - Completed: Can go back to In Progress

    // Validate transitions
    if (currentStatus === 'not_started' && newStatus !== 'in_progress') {
      Alert.alert('Invalid Transition', 'Not Started tasks can only be moved to In Progress.');
      return;
    }

    if (currentStatus === 'in_progress' && newStatus !== 'completed') {
      Alert.alert('Invalid Transition', 'In Progress tasks can only be moved to Completed.');
      return;
    }

    // Handle Completed status (direct update)
    if (newStatus === 'completed') {
      try {
        await updateTask(selectedTask.id, {
          status: newStatus,
          actual_end_date: today,
        });
        setShowTaskActionModal(false);
        Alert.alert('Success', `Task completed on ${today}!`);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to update task status');
      }
      return;
    }

    // Handle moving from Completed to In Progress (show date modal to set new end date)
    if (currentStatus === 'completed' && newStatus === 'in_progress') {
      const today = new Date().toISOString().split('T')[0];
      const futureEnd = formatDateValue(14);
      
      setPendingStatusTarget(newStatus);
      setDateInputStart(''); // No start date change needed
      setDateInputEnd(futureEnd);
      setDateModalTitle('Move to In Progress');
      setDateModalMessage('Please select a new end date for this task.');
      setShowTaskActionModal(false);
      setTimeout(() => {
        setDateChangeModalVisible(true);
      }, 100);
      return;
    }

    // Handle moving from Not Started to In Progress (direct update)
    if (currentStatus === 'not_started' && newStatus === 'in_progress') {
      try {
        await updateTask(selectedTask.id, {
          status: newStatus,
          actual_start_date: today,
        });
        setShowTaskActionModal(false);
        Alert.alert('Success', 'Task moved to In Progress.');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to update task status');
      }
      return;
    }

    // For any regression (moving backwards), require date change
    const message = 'Choose a later start and end date to move this task back in the workflow.';
    openRegressionDateModal(newStatus, message);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${selectedTask.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(selectedTask.id);
              setShowTaskActionModal(false);
              Alert.alert('Success', 'Task deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const filteredTasks = tasks.filter(task => {
    if (currentView === 'folders') return false;
    const matchesStatus = task.status === currentView;
    const matchesSearch = !searchQuery || 
      task.subTask.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tagalogLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assigned_worker_names.some(name => name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Loading state
  if (loading && currentView === 'folders') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Paragraph style={{ marginTop: spacing.md }}>Loading tasks...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  // Main folders view
  if (currentView === 'folders') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => navigation.goBack()}
              iconColor={theme.colors.primary}
            />
            <View style={styles.headerText}>
              <Title style={styles.screenTitle}>Task Management</Title>
              <Paragraph style={styles.subtitle}>
                Organize tasks by status with time-oriented workflow
              </Paragraph>
            </View>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderFolderCard('not_started')}
          {renderFolderCard('in_progress')}
          {renderFolderCard('completed')}
        </ScrollView>

        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => {
            console.log('FAB pressed, opening modal');
            setShowCreateModal(true);
          }}
          accessibilityLabel="Add new task"
        />

        <TaskCreationModal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          onTaskCreated={(taskData) => {
            console.log('New task created:', taskData);
            // Task will automatically appear via real-time subscription
          }}
        />

        {/* Task Action Modal */}
        <Portal>
          <Modal
            visible={showTaskActionModal}
            onDismiss={() => setShowTaskActionModal(false)}
            contentContainerStyle={styles.taskActionModal}
          >
            <Surface style={styles.taskActionSurface}>
              <View style={styles.taskActionHeader}>
                <Title style={styles.taskActionTitle}>{selectedTask?.title}</Title>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setShowTaskActionModal(false)}
                />
              </View>

              <View style={styles.taskActionContent}>
                <Paragraph style={styles.taskActionLabel}>Change Status:</Paragraph>
                
                {/* In Progress button - show for not_started and completed tasks */}
                {(selectedTask?.status === 'not_started' || selectedTask?.status === 'completed') && (
                  <Button
                    mode="contained"
                    icon="time"
                    onPress={() => handleChangeStatus('in_progress')}
                    style={[styles.statusButton, { backgroundColor: constructionColors.inProgress }]}
                  >
                    In Progress
                  </Button>
                )}

                {/* Completed button - only show for in_progress tasks */}
                {selectedTask?.status === 'in_progress' && (
                  <Button
                    mode="contained"
                    icon="check-circle"
                    onPress={() => handleChangeStatus('completed')}
                    style={[styles.statusButton, { backgroundColor: constructionColors.complete }]}
                  >
                    Completed
                  </Button>
                )}

                <Divider style={styles.divider} />

                {/* Delete button - show for not_started, in_progress, and completed tasks */}
                <Button
                  mode="contained"
                  icon="trash"
                  onPress={handleDeleteTask}
                  style={[styles.deleteButton, { backgroundColor: constructionColors.urgent }]}
                >
                  Delete Task
                </Button>
              </View>
            </Surface>
          </Modal>

          {/* Date Change Modal */}
          <Modal
            visible={dateChangeModalVisible}
            onDismiss={closeDateModal}
            contentContainerStyle={styles.dateModalContainer}
          >
            <Surface style={styles.dateModalSurface}>
              <Title style={styles.taskActionTitle}>{dateModalTitle}</Title>
              <Paragraph style={styles.dateModalMessage}>{dateModalMessage}</Paragraph>

              {/* Start Date - only show if not moving from completed to in_progress */}
              {pendingStatusTarget !== 'in_progress' || selectedTask?.status !== 'completed' ? (
                <View style={styles.dateInputContainer}>
                  <TextInput
                    label="Start Date (YYYY-MM-DD)"
                    value={dateInputStart}
                    onChangeText={setDateInputStart}
                    style={styles.dateModalInput}
                    textColor={theme.colors.text}
                    mode="outlined"
                    right={<TextInput.Icon icon="calendar" onPress={() => handleDateIconPress('start')} />}
                  />
                </View>
              ) : null}

              <View style={styles.dateInputContainer}>
                <TextInput
                  label="End Date (YYYY-MM-DD)"
                  value={dateInputEnd}
                  onChangeText={setDateInputEnd}
                  style={styles.dateModalInput}
                  textColor={theme.colors.text}
                  mode="outlined"
                  right={<TextInput.Icon icon="calendar" onPress={() => handleDateIconPress('end')} />}
                />
              </View>


              <View style={styles.dateModalActions}>
                <Button mode="outlined" onPress={closeDateModal}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleApplyDateChange}>
                  Save
                </Button>
              </View>
            </Surface>
          </Modal>
        </Portal>
      </SafeAreaView>
    );
  }

  // Task list view for specific status
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.detailHeader}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => setCurrentView('folders')}
        />
        <View style={styles.detailTitleContainer}>
          <Title style={styles.detailTitle}>
            {currentView === 'not_started' ? 'Not Started Tasks' :
             currentView === 'in_progress' ? 'In Progress Tasks' :
             'Completed Tasks'}
          </Title>
          <Paragraph style={styles.detailSubtitle}>
            {filteredTasks.length} tasks
          </Paragraph>
        </View>
      </View>

      <Searchbar
        placeholder="Search tasks..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <ScrollView style={styles.tasksList} showsVerticalScrollIndicator={false}>
        {filteredTasks.map(renderTaskCard)}
        
        {filteredTasks.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Ionicons name="clipboard-outline" size={48} color="#ccc" />
              <Title style={styles.emptyTitle}>No tasks found</Title>
              <Paragraph style={styles.emptyText}>
                {searchQuery ? 'No tasks match your search criteria' : 
                 `No ${currentView.replace('_', ' ')} tasks available`}
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          console.log('FAB pressed, opening modal');
          setShowCreateModal(true);
        }}
        accessibilityLabel="Add new task"
      />

      <TaskCreationModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        onTaskCreated={(taskData) => {
          console.log('New task created:', taskData);
          // Task will automatically appear via real-time subscription
        }}
      />

      {/* Task Action Modal */}
      <Portal>
        <Modal
          visible={showTaskActionModal}
          onDismiss={() => setShowTaskActionModal(false)}
          contentContainerStyle={styles.taskActionModal}
        >
          <Surface style={styles.taskActionSurface}>
            <View style={styles.taskActionHeader}>
              <Title style={styles.taskActionTitle}>{selectedTask?.title}</Title>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowTaskActionModal(false)}
              />
            </View>

            <View style={styles.taskActionContent}>
              <Paragraph style={styles.taskActionLabel}>Change Status:</Paragraph>
              
              {/* In Progress button - show for not_started and completed tasks */}
              {(selectedTask?.status === 'not_started' || selectedTask?.status === 'completed') && (
                <Button
                  mode="contained"
                  icon="time"
                  onPress={() => handleChangeStatus('in_progress')}
                  style={[styles.statusButton, { backgroundColor: constructionColors.inProgress }]}
                >
                  In Progress
                </Button>
              )}

              {/* Completed button - only show for in_progress tasks */}
              {selectedTask?.status === 'in_progress' && (
                <Button
                  mode="contained"
                  icon="check-circle"
                  onPress={() => handleChangeStatus('completed')}
                  style={[styles.statusButton, { backgroundColor: constructionColors.complete }]}
                >
                  Completed
                </Button>
              )}

              <Divider style={styles.divider} />

              {/* Delete button - show for all statuses including in_progress */}
              <Button
                mode="contained"
                icon="trash"
                onPress={handleDeleteTask}
                style={[styles.deleteButton, { backgroundColor: constructionColors.urgent }]}
              >
                Delete Task
              </Button>
            </View>
          </Surface>
        </Modal>

        {/* Date Change Modal */}
        <Modal
          visible={dateChangeModalVisible}
          onDismiss={closeDateModal}
          contentContainerStyle={styles.dateModalContainer}
        >
          <Surface style={styles.dateModalSurface}>
            <Title style={styles.taskActionTitle}>{dateModalTitle}</Title>
            <Paragraph style={styles.dateModalMessage}>{dateModalMessage}</Paragraph>

            {/* Start Date - only show if not moving from completed to in_progress */}
            {pendingStatusTarget !== 'in_progress' || selectedTask?.status !== 'completed' ? (
              <View style={styles.dateInputContainer}>
                <TextInput
                  label="Start Date (YYYY-MM-DD)"
                  value={dateInputStart}
                  onChangeText={setDateInputStart}
                  style={styles.dateModalInput}
                  textColor={theme.colors.text}
                  mode="outlined"
                    right={<TextInput.Icon icon="calendar" onPress={() => handleDateIconPress('start')} />}
                />
              </View>
            ) : null}

            <View style={styles.dateInputContainer}>
              <TextInput
                label="End Date (YYYY-MM-DD)"
                value={dateInputEnd}
                onChangeText={setDateInputEnd}
                style={styles.dateModalInput}
                textColor={theme.colors.text}
                mode="outlined"
                    right={<TextInput.Icon icon="calendar" onPress={() => handleDateIconPress('end')} />}
              />
            </View>

            <View style={styles.dateModalActions}>
              <Button mode="outlined" onPress={closeDateModal}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleApplyDateChange}>
                Save
              </Button>
            </View>
          </Surface>
        </Modal>

          {/* Date Picker Modals - Outside the date change modal */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  screenTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  folderCard: {
    marginBottom: spacing.md,
  },
  card: {
    elevation: 2,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    overflow: 'visible',
    marginHorizontal: spacing.xs,
  },
  folderContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  folderHeader: {
    position: 'relative',
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  taskBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  folderTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  folderDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  detailTitleContainer: {
    marginLeft: spacing.sm,
  },
  detailTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  detailSubtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  searchBar: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tasksList: {
    flex: 1,
    padding: spacing.md,
    paddingTop: 0,
  },
  taskCard: {
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    overflow: 'visible',
    minHeight: 0,
  },
  taskInfo: {
    flex: 1,
    overflow: 'visible',
    paddingRight: spacing.md,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  cnnChipText: {
    color: 'white',
    fontSize: 9,
  },
  verificationChipText: {
    color: 'white',
    fontSize: 10,
  },
  taskTagalog: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    overflow: 'visible',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  taskMetaChip: {
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
    flexShrink: 0,
  },
  customBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    marginVertical: spacing.xs,
    overflow: 'visible',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  workerChipContainer: {
    backgroundColor: theme.colors.primaryContainer,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  workerBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs / 2,
    flexShrink: 1,
    minWidth: 0,
  },
  badgeIcon: {
    marginRight: spacing.xs / 2,
  },
  cnnChipContainer: {
    backgroundColor: '#9C27B0',
  },
  cnnBadge: {
    paddingHorizontal: spacing.sm,
  },
  cnnBadgeText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  taskStatus: {
    marginLeft: spacing.sm,
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  taskDates: {
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.background,
    padding: spacing.sm,
    borderRadius: theme.roundness,
  },
  dateText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  verificationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    overflow: 'visible',
  },
  verificationChip: {
    marginRight: spacing.sm,
  },
  cnnResult: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  taskNotes: {
    fontSize: fontSizes.sm,
    color: theme.colors.text,
    fontStyle: 'italic',
    backgroundColor: theme.colors.background,
    padding: spacing.sm,
    borderRadius: theme.roundness,
  },
  emptyCard: {
    marginTop: spacing.lg,
  },
  emptyContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    zIndex: 999,
    elevation: 8,
  },
  taskActionModal: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  taskActionSurface: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    width: '90%',
    maxWidth: 400,
    padding: spacing.md,
    elevation: 4,
  },
  taskActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  taskActionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    flex: 1,
    color: theme.colors.text,
  },
  taskActionContent: {
    gap: spacing.sm,
  },
  taskActionLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  statusButton: {
    marginBottom: spacing.xs,
  },
  divider: {
    marginVertical: spacing.md,
  },
  deleteButton: {
    marginTop: spacing.xs,
  },
  dateModalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dateModalSurface: {
    width: '90%',
    maxWidth: 400,
    padding: spacing.md,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    elevation: 4,
  },
  dateModalMessage: {
    marginBottom: spacing.sm,
    color: theme.colors.onSurfaceVariant,
  },
  dateInputContainer: {
    marginBottom: spacing.sm,
  },
  dateModalInput: {
    backgroundColor: theme.colors.background,
  },
  dateModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
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
    marginTop: spacing.md,
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
    color: theme.colors.text, // White for current month
  },
  calendarDayTextOtherMonth: {
    color: theme.colors.onSurfaceDisabled, // Gray for other months
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