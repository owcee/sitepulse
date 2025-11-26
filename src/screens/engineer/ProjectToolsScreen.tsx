import React, { useRef, useState } from 'react';
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
  'Delay Prediction': undefined;
  Resources: { tab?: string };
  WorkerLogs: undefined;
  CreateNewProject: undefined;
  MaterialsManagement: undefined;
  WorkersManagement: undefined;
  EquipmentManagement: undefined;
  BudgetLogsManagement: undefined;
};

interface ProjectToolsScreenProps {
  user?: any;
  project?: any;
  onLogout?: () => void;
}

export default function ProjectToolsScreen({ user, project, onLogout }: ProjectToolsScreenProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const chartScrollRef = useRef<FlatList>(null);
  const [projectMenuVisible, setProjectMenuVisible] = useState(false);

  // Use passed props or fallback to mock data
  const currentProject = project || {
    name: 'Downtown Office Complex',
    description: 'Construction of 12-story office building'
  };

  // Chart data for carousel
  const chartCards = [
    {
      id: 'delays',
      component: (
        <DelayPredictionChart 
          onPress={() => navigation.navigate('Delay Prediction')}
        />
      ),
    },
    {
      id: 'budget',
      component: (
        <BudgetChart 
          onPress={() => navigation.navigate('BudgetLogsManagement')}
        />
      ),
    },
  ];

  // Project tools configuration
  const projectTools: ProjectTool[] = [
    {
      id: 'task-management',
      title: 'Task Management',
      icon: 'clipboard-outline',
      color: constructionColors.inProgress,
      description: 'Manage project tasks',
      onPress: () => navigation.navigate('Tasks'),
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
      description: 'Workers & payroll',
      onPress: () => navigation.navigate('WorkersManagement'),
    },
    {
      id: 'equipment',
      title: 'Manage Equipment',
      icon: 'construct',
      color: '#FF9800',
      description: 'Equipment & rental costs',
      onPress: () => navigation.navigate('EquipmentManagement'),
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
            <TouchableOpacity style={styles.titleRow} onPress={() => setProjectMenuVisible(true)}>
              <Text style={styles.projectTitle}>{currentProject.name}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          }
          contentStyle={styles.menuContent}
        >
          <Menu.Item 
            onPress={() => {
              setProjectMenuVisible(false);
            }} 
            title={currentProject.name}
            titleStyle={styles.currentProjectTitle}
          />
          <Divider />
          <Menu.Item 
            onPress={() => {
              setProjectMenuVisible(false);
              Alert.alert(
                'Switch Project',
                'Project switching functionality would be implemented here.',
                [{ text: 'OK' }]
              );
            }} 
            title="Switch Project" 
          />
          <Menu.Item 
            onPress={() => {
              setProjectMenuVisible(false);
              onLogout && onLogout();
            }} 
            title="Switch to Worker View" 
          />
          <Menu.Item 
            onPress={() => {
              setProjectMenuVisible(false);
              onLogout && onLogout();
            }} 
            title="Logout" 
          />
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
    backgroundColor: '#F5F5F5',
  },
  projectHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    color: theme.colors.onSurface,
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
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    color: theme.colors.onSurface,
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
    backgroundColor: 'white',
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
    color: theme.colors.onSurface,
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
