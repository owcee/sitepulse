import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
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
import { subscribeToProjectTasks, Task as FirebaseTask } from '../../services/taskService';

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

type FolderView = 'folders' | 'not_started' | 'in_progress' | 'completed';

export default function TasksScreen() {
  const navigation = useNavigation();
  const { state, projectId } = useProjectData();
  const [currentView, setCurrentView] = useState<FolderView>('folders');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<FirebaseTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time tasks
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = subscribeToProjectTasks(projectId, (updatedTasks) => {
      setTasks(updatedTasks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

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
        icon: 'folder-check-outline' as keyof typeof Ionicons.glyphMap,
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
        style={styles.taskCard}
        onPress={() => handleTaskPress(task)}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.taskHeader}>
              <View style={styles.taskInfo}>
                <Title style={styles.taskTitle}>{task.title || subtask?.label || task.subTask}</Title>
                <Paragraph style={styles.taskTagalog}>{task.tagalogLabel}</Paragraph>
                <View style={styles.taskMeta}>
                  <Chip 
                    icon="account-group" 
                    style={styles.workerChip}
                    textStyle={{ fontSize: 12 }}
                  >
                    {task.assigned_worker_names.join(', ') || 'Unassigned'}
                  </Chip>
                  {task.cnnEligible && (
                    <Chip 
                      icon="brain" 
                      style={[styles.cnnChip, { backgroundColor: '#9C27B0' }]}
                      textStyle={{ color: 'white', fontSize: 10 }}
                    >
                      CNN
                    </Chip>
                  )}
                </View>
              </View>
              <View style={styles.taskStatus}>
                <Ionicons 
                  name={task.status === 'completed' ? 'checkmark-circle' : 
                        task.status === 'in_progress' ? 'time' : 'ellipse-outline'} 
                  size={24} 
                  color={getStatusColor(task.status)} 
                />
              </View>
            </View>

            <View style={styles.taskDates}>
              <Paragraph style={styles.dateText}>
                Planned: {new Date(task.planned_start_date).toLocaleDateString()} - {new Date(task.planned_end_date).toLocaleDateString()}
              </Paragraph>
              {task.actual_end_date && (
                <Paragraph style={styles.dateText}>
                  Completed: {new Date(task.actual_end_date).toLocaleDateString()}
                </Paragraph>
              )}
            </View>

            {task.verification?.engineerStatus && (
              <View style={styles.verificationSection}>
                <Chip 
                  icon={task.verification.engineerStatus === 'approved' ? 'check' : 
                        task.verification.engineerStatus === 'rejected' ? 'close' : 'clock'}
                  style={{ 
                    backgroundColor: task.verification.engineerStatus === 'approved' ? constructionColors.complete :
                                     task.verification.engineerStatus === 'rejected' ? constructionColors.urgent :
                                     constructionColors.warning 
                  }}
                  textStyle={{ color: 'white', fontSize: 12 }}
                >
                  {task.verification.engineerStatus.toUpperCase()}
                </Chip>
                {task.verification.cnnResult && (
                  <Paragraph style={styles.cnnResult}>
                    CNN: {task.verification.cnnResult.label} ({Math.round(task.verification.cnnResult.score * 100)}%)
                  </Paragraph>
                )}
              </View>
            )}

            {task.notes && (
              <Paragraph style={styles.taskNotes}>{task.notes}</Paragraph>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const handleTaskPress = (task: FirebaseTask) => {
    Alert.alert(
      'Task Details',
      `Task: ${task.title}\nStatus: ${task.status}\nWorkers: ${task.assigned_worker_names.join(', ')}`,
      [{ text: 'OK' }]
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
      <SafeAreaView style={styles.container}>
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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Title style={styles.screenTitle}>Task Management</Title>
          <Paragraph style={styles.subtitle}>
            Organize tasks by status with time-oriented workflow
          </Paragraph>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderFolderCard('not_started')}
          {renderFolderCard('in_progress')}
          {renderFolderCard('completed')}
        </ScrollView>

        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
        />

        <TaskCreationModal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          onTaskCreated={(taskData) => {
            console.log('New task created:', taskData);
            // Task will automatically appear via real-time subscription
          }}
        />
      </SafeAreaView>
    );
  }

  // Task list view for specific status
  return (
    <SafeAreaView style={styles.container}>
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
        onPress={() => setShowCreateModal(true)}
      />

      <TaskCreationModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        onTaskCreated={(taskData) => {
          console.log('New task created:', taskData);
          // Task will automatically appear via real-time subscription
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
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
  },
  folderContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  folderHeader: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  taskBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 1,
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
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  taskTagalog: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  workerChip: {
    backgroundColor: theme.colors.primaryContainer,
    height: 28,
  },
  cnnChip: {
    height: 28,
  },
  taskStatus: {
    marginLeft: spacing.sm,
  },
  taskDates: {
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
  },
  verificationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cnnResult: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  taskNotes: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurface,
    fontStyle: 'italic',
    backgroundColor: theme.colors.surfaceVariant,
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
  },
});