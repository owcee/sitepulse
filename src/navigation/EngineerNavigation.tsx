import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Appbar, IconButton, Badge, ActivityIndicator, Text } from 'react-native-paper';
import { View } from 'react-native';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getUnreadCount } from '../services/notificationService';

import { User, Project } from '../types';
import { theme, constructionColors } from '../utils/theme';

// Engineer Screens
import ProjectToolsScreen from '../screens/engineer/ProjectToolsScreen';
import ReportLogsScreen from '../screens/engineer/ReportLogsScreen';
import CreateNewProjectScreen from '../screens/engineer/CreateNewProjectScreen';
import WorkerAssignmentScreen from '../screens/engineer/WorkerAssignmentScreen';
import MaterialsManagementPage from '../screens/engineer/MaterialsManagementPage';
import WorkersManagementPage from '../screens/engineer/WorkersManagementPage';
import EquipmentManagementPage from '../screens/engineer/EquipmentManagementPage';
import BudgetLogsManagementPage from '../screens/engineer/BudgetLogsManagementPage';
import TasksScreen from '../screens/engineer/TasksScreen';
import TaskDetailScreen from '../screens/engineer/TaskDetailScreen';
import DelayPredictionScreen from '../screens/engineer/DelayPredictionScreen';
import ResourcesScreen from '../screens/engineer/ResourcesScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import NotificationsScreen from '../screens/engineer/NotificationsScreen';
import SettingsScreen from '../screens/engineer/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

interface Props {
  user: User;
  project: Project;
  onLogout?: () => void;
}

// Custom header component with SitePulse branding
const CustomHeader = ({ user, project, onLogout }: Props) => {
  const [notificationsVisible, setNotificationsVisible] = React.useState(false);
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Subscribe to unread notifications
  useEffect(() => {
    if (!user.uid) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    return () => unsubscribe();
  }, [user.uid]);

  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
      <Appbar.Content 
        title="SitePulse" 
        titleStyle={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}
        subtitle={`Engineer • ${user.name}`}
        subtitleStyle={{ color: 'rgba(255,255,255,0.8)' }}
      />
      
      {/* Notifications Icon */}
      <View style={{ position: 'relative', marginRight: 0 }}>
        <IconButton
          icon="bell"
          iconColor="white"
          size={24}
          onPress={() => setNotificationsVisible(true)}
        />
        {unreadNotifications > 0 && (
          <Badge 
            size={16} 
            style={{ 
              position: 'absolute', 
              top: 8, 
              right: 8,
              backgroundColor: theme.colors.error 
            }}
          >
            {unreadNotifications}
          </Badge>
        )}
      </View>

      {/* Settings Icon */}
      <IconButton
        icon="cog"
        iconColor="white"
        size={24}
        onPress={() => setSettingsVisible(true)}
        style={{ marginRight: 8 }}
      />

      {/* Notifications Modal */}
      <NotificationsScreen 
        visible={notificationsVisible}
        onDismiss={() => setNotificationsVisible(false)}
      />

      {/* Settings Modal */}
      <SettingsScreen 
        visible={settingsVisible}
        onDismiss={() => setSettingsVisible(false)}
      />
    </Appbar.Header>
  );
};

// Stack navigator for Tasks to handle task detail navigation
const TasksStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TasksList" component={TasksScreen} />
    <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
  </Stack.Navigator>
);

// Stack navigator for Project Tools and related screens
const ProjectToolsStack = ({ user, project, onLogout }: Props) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProjectToolsMain">
      {(props) => <ProjectToolsScreen {...props} user={user} project={project} onLogout={onLogout} />}
    </Stack.Screen>
    <Stack.Screen name="Tasks" component={TasksStack} />
    <Stack.Screen name="CreateNewProject" component={CreateNewProjectScreen} />
    <Stack.Screen name="WorkerAssignment" component={WorkerAssignmentScreen} />
    <Stack.Screen name="MaterialsManagement" component={MaterialsManagementPage} />
    <Stack.Screen name="WorkersManagement" component={WorkersManagementPage} />
    <Stack.Screen name="EquipmentManagement" component={EquipmentManagementPage} />
    <Stack.Screen name="BudgetLogsManagement" component={BudgetLogsManagementPage} />
  </Stack.Navigator>
);

export default function EngineerNavigation({ user, project, onLogout }: Props) {
  const [hasProjects, setHasProjects] = useState<boolean | null>(null);
  const [isCheckingProjects, setIsCheckingProjects] = useState(true);

  useEffect(() => {
    console.log('🔍 Checking if engineer has projects...');
    
    // Query projects where managerId equals the engineer's UID
    const projectsQuery = query(
      collection(db, 'projects'),
      where('engineerId', '==', user.uid)
    );

    // Check for projects (one-time fetch, no real-time)
    const checkProjects = async () => {
      try {
        const snapshot = await getDocs(projectsQuery);
        const projectCount = snapshot.size;
        console.log(`✅ Engineer has ${projectCount} project(s)`);
        setHasProjects(projectCount > 0);
        setIsCheckingProjects(false);
      } catch (error) {
        console.error('❌ Error checking projects:', error);
        // On error, assume they have projects to avoid blocking access
        setHasProjects(true);
        setIsCheckingProjects(false);
      }
    };

    checkProjects();
  }, [user.uid]);

  // Show loading while checking for projects
  if (isCheckingProjects) {
    return (
      <View style={{ flex: 1 }}>
        <CustomHeader user={user} project={project} onLogout={onLogout} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onSurface }}>
            Loading your projects...
          </Text>
        </View>
      </View>
    );
  }

  // If engineer has no projects, show the Create Project screen directly
  if (!hasProjects) {
    console.log('📝 Engineer has no projects - showing CreateNewProjectScreen');
    return (
      <View style={{ flex: 1 }}>
        <CustomHeader user={user} project={project} onLogout={onLogout} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="CreateNewProject">
            {(props) => <CreateNewProjectScreen {...props} />}
          </Stack.Screen>
        </Stack.Navigator>
      </View>
    );
  }

  // Engineer has projects - show full navigation
  return (
    <View style={{ flex: 1 }}>
      <CustomHeader user={user} project={project} onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            switch (route.name) {
              case 'Project Tools':
                iconName = focused ? 'construct' : 'construct-outline';
                break;
              case 'Report Logs':
                iconName = focused ? 'document-text' : 'document-text-outline';
                break;
              case 'Delay Prediction':
                iconName = focused ? 'analytics' : 'analytics-outline';
                break;
              case 'Resources':
                iconName = focused ? 'wallet' : 'wallet-outline';
                break;
              case 'Chat':
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                break;
              default:
                iconName = 'ellipse-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        })}
      >
        <Tab.Screen 
          name="Project Tools" 
          options={{ tabBarLabel: 'Tools' }}
        >
          {(props) => <ProjectToolsStack {...props} user={user} project={project} onLogout={onLogout} />}
        </Tab.Screen>
        <Tab.Screen 
          name="Report Logs" 
          component={ReportLogsScreen}
          options={{ tabBarLabel: 'Reports' }}
        />
        <Tab.Screen 
          name="Delay Prediction" 
          component={DelayPredictionScreen}
          options={{ tabBarLabel: 'Delays' }}
        />
        <Tab.Screen 
          name="Resources" 
          component={ResourcesScreen}
          options={{ tabBarLabel: 'Resources' }}
        />
        <Tab.Screen 
          name="Chat" 
          component={ChatScreen}
          options={{ tabBarLabel: 'Chat' }}
        />
      </Tab.Navigator>
    </View>
  );
}

