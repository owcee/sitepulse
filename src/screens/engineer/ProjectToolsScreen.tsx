import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  TouchableOpacity,
  FlatList,
  Alert
} from 'react-native';
import { 
  Text, 
  Card, 
  IconButton,
  Surface,
  Menu,
  Divider
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';

import { TaskManagementChart, DelayPredictionChart, BudgetChart } from '../../components/ChartCards';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { useProjectData } from '../../context/ProjectDataContext';
import { getEngineerProjects } from '../../services/projectService';
import { getProjectTasks } from '../../services/taskService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { getAuth } from 'firebase/auth';
import { getBudget } from '../../services/firebaseDataService';
import { ProjectBudget } from '../../context/ProjectDataContext';

const screenWidth = Dimensions.get('window').width;

interface ProjectTool {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
  onPress: () => void;
}

type RootStackParamList = {
  Tasks: undefined;
  BlueprintEditor: undefined;
  'Delay Prediction': undefined;
  Resources: { tab?: string };
  WorkerLogs: undefined;
  CreateNewProject: undefined;
  MaterialsManagement: undefined;
  WorkersManagement: undefined;
  BudgetLogsManagement: undefined;
};

interface ProjectToolsScreenProps {
  user?: any;
  project?: any;
  onLogout?: () => void;
  onRefresh?: () => Promise<void>;
}

export default function ProjectToolsScreen({ user, project, onLogout, onRefresh }: ProjectToolsScreenProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { state, projectId, setBudget } = useProjectData();
  
  // Load budget from Firebase on mount if not in shared state
  // This ensures budget is available even if ProjectDataContext hasn't loaded it yet
  useEffect(() => {
    if (!projectId) return;
    
    // Only load if budget is not in state or if it's empty/undefined
    if (state.budget && state.budget.categories && state.budget.categories.length > 0) {
      return; // Budget already loaded
    }
    
    let isMounted = true;
    const loadBudget = async () => {
      try {
        const savedBudget = await getBudget(projectId);
        if (isMounted && savedBudget) {
          setBudget(savedBudget as ProjectBudget);
          console.log('✅ Budget loaded in ProjectToolsScreen');
        }
      } catch (error) {
        console.error('Error loading budget in ProjectToolsScreen:', error);
      }
    };
    
    loadBudget();
    return () => { isMounted = false; };
  }, [projectId, state.budget]); // Run when projectId changes or if budget is not loaded
  const chartScrollRef = useRef<FlatList>(null);
  const [projectMenuVisible, setProjectMenuVisible] = useState(false);
  const [engineerProjects, setEngineerProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [delayData, setDelayData] = useState({
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    total: 0,
  });

  // Use passed props or fallback to mock data
  const currentProject = project || {
    name: 'Downtown Office Complex',
    description: 'Construction of 12-story office building'
  };

  // Load task delay prediction data
  useEffect(() => {
    if (!projectId) return;
    
    let isMounted = true;
    const loadTaskDelayData = async () => {
      try {
        // Fetch delay predictions from cloud function
        const { predictAllDelays } = await import('../../services/delayPredictionService');
        const result = await predictAllDelays(projectId);
        
        // Count tasks by risk level
        let highRisk = 0;
        let mediumRisk = 0;
        let lowRisk = 0;
        
        result.predictions.forEach(prediction => {
          if (prediction.riskLevel === 'High') {
            highRisk++;
          } else if (prediction.riskLevel === 'Medium') {
            mediumRisk++;
          } else {
            lowRisk++;
          }
        });
        
        if (isMounted) {
          setDelayData({
            highRisk,
            mediumRisk,
            lowRisk,
            total: result.totalTasks || result.predictions.length,
          });
        }
      } catch (error) {
        console.error('Error loading task delay prediction data:', error);
        // Fallback to zeros if prediction fails
        if (isMounted) {
          setDelayData({
            highRisk: 0,
            mediumRisk: 0,
            lowRisk: 0,
            total: 0,
          });
        }
      }
    };
    
    loadTaskDelayData();
    return () => { isMounted = false; };
  }, [projectId]);

  // Load engineer's projects when menu opens
  useEffect(() => {
    if (projectMenuVisible && user?.uid) {
      loadEngineerProjects();
    }
  }, [projectMenuVisible, user?.uid]);

  const loadEngineerProjects = async () => {
    try {
      setLoadingProjects(true);
      const projects = await getEngineerProjects(user?.uid);
      setEngineerProjects(projects);
    } catch (error: any) {
      console.error('Error loading engineer projects:', error);
      const errorMessage = error?.message || 'Failed to load projects';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectMenuPress = () => {
    // Open menu immediately - projects will load via useEffect
    setProjectMenuVisible(true);
  };

  const handleProjectSelect = async (selectedProject: any) => {
    try {
      setProjectMenuVisible(false);
      
      // Update engineer's currentProjectId in Firestore
      const firebaseAuth = getAuth();
      const currentUser = firebaseAuth.currentUser;
      if (currentUser && selectedProject.id) {
        const engineerRef = doc(db, 'engineer_accounts', currentUser.uid);
        await updateDoc(engineerRef, {
          currentProjectId: selectedProject.id,
          projectId: selectedProject.id, // Legacy support
        });
        
        // Auto-refresh the app to load the new project
        if (onRefresh) {
          await onRefresh();
        }
      }
    } catch (error) {
      console.error('Error switching project:', error);
      Alert.alert('Error', 'Failed to switch project');
    }
  };

  // ALWAYS use shared budget from BudgetLogsManagementPage - no fallback calculations
  // This ensures consistency across all screens (carousel, resource screen, etc.)
  const budget = state.budget;
  
  // Prepare budget data for BudgetChart
  // If budget is not loaded yet, use defaults (will be updated once BudgetLogsManagementPage loads)
  let budgetDataForChart;
  if (budget && budget.categories.length > 0) {
    // Use budget from BudgetLogsManagementPage (single source of truth)
    budgetDataForChart = {
      totalBudget: budget.totalBudget,
      totalSpent: budget.totalSpent,
      categories: budget.categories.map(cat => ({
        name: cat.name,
        allocatedAmount: cat.allocatedAmount,
        spentAmount: cat.spentAmount,
      })),
    };
  } else {
    // Only use defaults if budget hasn't been loaded yet
    // This will be updated once BudgetLogsManagementPage loads the budget
    budgetDataForChart = {
      totalBudget: 250000,
      totalSpent: 0,
      categories: [
        { name: 'Equipment', allocatedAmount: 50000, spentAmount: 0 },
        { name: 'Materials', allocatedAmount: 150000, spentAmount: 0 },
      ],
    };
  }

  // Chart data for carousel
  const chartCards = [
    {
      id: 'delays',
      component: (
        <DelayPredictionChart 
          onPress={() => navigation.navigate('Delay Prediction')}
          delayData={delayData}
        />
      ),
    },
    {
      id: 'budget',
      component: (
        <BudgetChart 
          key={`budget-${budget?.lastUpdated?.getTime() || Date.now()}`}
          onPress={() => navigation.navigate('BudgetLogsManagement')}
          budgetData={budgetDataForChart}
        />
      ),
    },
  ];

  // Project tools configuration
  const projectTools: ProjectTool[] = [
    {
      id: 'blueprint-method',
      title: 'Blueprint Method',
      icon: 'map-outline',
      color: constructionColors.inProgress,
      description: 'Edit tasks on blueprint',
      onPress: () => navigation.navigate('BlueprintEditor'),
    },
    {
      id: 'materials',
      title: 'Materials',
      icon: 'cube',
      color: '#2196F3',
      description: 'Manage materials inventory',
      onPress: () => navigation.navigate('MaterialsManagement'),
    },
    {
      id: 'workers',
      title: 'Manage Workers',
      icon: 'people',
      color: constructionColors.complete,
      description: 'Workers & Project Team',
      onPress: () => navigation.navigate('WorkersManagement'),
    },
    {
      id: 'budget-logs',
      title: 'Manage Budget Logs',
      icon: 'wallet',
      color: '#4CAF50',
      description: 'Edit budget data',
      onPress: () => navigation.navigate('BudgetLogsManagement'),
    },

    {
      id: 'new-project',
      title: 'Create New Project',
      icon: 'add-circle',
      color: constructionColors.urgent,
      description: 'Start a new project',
      onPress: () => navigation.navigate('CreateNewProject'),
    },
  ];

  const renderChartCard = ({ item }: { item: typeof chartCards[0] }) => (
    <View key={item.id} style={styles.chartCardContainer}>
      {item.component}
    </View>
  );

  const renderToolButton = (tool: ProjectTool) => (
    <TouchableOpacity key={tool.id} style={styles.toolButton} onPress={tool.onPress}>
      <Surface style={[styles.toolSurface, { backgroundColor: tool.color }]} elevation={2}>
        <Ionicons name={tool.icon} size={32} color="white" />
      </Surface>
      <Text style={styles.toolTitle}>{tool.title}</Text>
      <Text style={styles.toolDescription}>{tool.description}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Project Header with Dropdown */}
      <View style={styles.projectHeader}>
        <Menu
          visible={projectMenuVisible}
          onDismiss={() => setProjectMenuVisible(false)}
          anchor={
            <TouchableOpacity 
              style={styles.titleRow} 
              onPress={() => setProjectMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.projectTitle}>{currentProject.name}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          }
          contentStyle={[styles.menuContent, { backgroundColor: theme.colors.background }]}
        >
          <Menu.Item 
            onPress={() => {
              setProjectMenuVisible(false);
            }} 
            title={currentProject.name}
            titleStyle={[styles.currentProjectTitle, { color: theme.colors.primary }]}
            style={{ backgroundColor: theme.colors.background }}
          />
          <Divider />
          {loadingProjects ? (
            <Menu.Item 
              title="Loading projects..." 
              titleStyle={{ color: theme.colors.onSurfaceVariant }}
              style={{ backgroundColor: theme.colors.background }}
              disabled
            />
          ) : engineerProjects.length === 0 ? (
            <Menu.Item 
              title="No projects available" 
              titleStyle={{ color: theme.colors.onSurfaceVariant }}
              style={{ backgroundColor: theme.colors.background }}
              disabled
            />
          ) : (() => {
            // Filter out the current project
            const otherProjects = engineerProjects.filter(p => p.id !== project?.id);
            
            if (otherProjects.length === 0) {
              return (
                <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: theme.colors.background, minWidth: 280 }}>
                  <Text style={{ 
                    color: theme.colors.onSurfaceVariant,
                    fontSize: fontSizes.sm,
                  }}>
                    You don't have any other projects
                  </Text>
                </View>
              );
            }
            
            return otherProjects.map((p) => (
              <Menu.Item
                key={p.id}
                onPress={() => handleProjectSelect(p)}
                title={p.name}
                titleStyle={{ 
                  color: theme.colors.text,
                }}
                style={{ backgroundColor: theme.colors.background }}
              />
            ));
          })()}
        </Menu>

        <Text style={styles.projectSubtitle}>{currentProject.description}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Charts Carousel */}
        <View style={styles.chartsSection}>
          
          <FlatList
            ref={chartScrollRef}
            data={chartCards}
            renderItem={renderChartCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={screenWidth - 20}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.chartsCarousel}
            pagingEnabled
            getItemLayout={(data, index) => ({
              length: screenWidth - 20,
              offset: (screenWidth - 20) * index,
              index,
            })}
          />
        </View>

        {/* Project Tools Grid */}
        <View style={styles.toolsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Project Management Tools</Text>
            <Text style={styles.sectionSubtitle}>Manage all aspects of your construction project</Text>
          </View>

          <View style={styles.toolsGrid}>
            {projectTools.map(renderToolButton)}
          </View>
        </View>

        {/* Bottom spacing for better scroll experience */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  projectHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  projectTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  projectSubtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuAnchor: {
    position: 'absolute',
    top: 0,
    right: spacing.lg,
    width: 1,
    height: 1,
  },
  menuContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 280,
  },
  currentProjectTitle: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },

  // Charts Section
  chartsSection: {
    paddingVertical: spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  chartsCarousel: {
    paddingLeft: spacing.sm,
  },
  chartCardContainer: {
    marginRight: spacing.sm,
  },

  // Tools Section
  toolsSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  toolButton: {
    width: (screenWidth - spacing.lg * 2 - spacing.md) / 2,
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  toolSurface: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  toolTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  toolDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});
