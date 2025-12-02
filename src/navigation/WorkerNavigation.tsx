import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Appbar, Badge, Menu, IconButton, Text } from 'react-native-paper';
import { View, TouchableOpacity } from 'react-native';

import { User, Project } from '../types';
import { theme, softDarkOrange } from '../utils/theme';
import { getWorkerProjects } from '../services/assignmentService';
import { getProject } from '../services/projectService';
import { auth } from '../firebaseConfig';

// Worker Screens
import WorkerTasksScreen from '../screens/worker/WorkerTasksScreen';
import WorkerTaskDetailScreen from '../screens/worker/WorkerTaskDetailScreen';
import InventoryUseScreen from '../screens/worker/InventoryUseScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import NotificationsScreen from '../screens/worker/NotificationsScreen';
import SettingsScreen from '../screens/worker/SettingsScreen';
import UnassignedWorkerScreen from '../screens/worker/UnassignedWorkerScreen';
import PrivacyPolicyScreen from '../screens/shared/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/shared/TermsOfServiceScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

interface Props {
  user: User;
  project?: Project;
  onLogout?: () => void;
  onRefresh?: () => void;
}

// Custom header component for workers
const WorkerHeader = ({ user, project, onLogout, onProjectChange }: Props & { onProjectChange?: (projectId: string) => void }) => {
  const [projectMenuVisible, setProjectMenuVisible] = useState(false);
  const [workerProjects, setWorkerProjects] = useState<Array<{projectId: string, projectName: string}>>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(project || null);

  useEffect(() => {
    loadWorkerProjects();
  }, []);

  useEffect(() => {
    if (project) {
      setCurrentProject(project);
    }
  }, [project]);

  const loadWorkerProjects = async () => {
    try {
      if (!auth.currentUser) return;
      const projects = await getWorkerProjects(auth.currentUser.uid);
      const projectDetails = await Promise.all(
        projects.map(async (p) => {
          const projectData = await getProject(p.projectId);
          return {
            projectId: p.projectId,
            projectName: projectData?.name || p.projectName
          };
        })
      );
      setWorkerProjects(projectDetails);
    } catch (error) {
      console.error('Error loading worker projects:', error);
    }
  };

  const handleProjectSelect = async (projectId: string) => {
    setProjectMenuVisible(false);
    if (onProjectChange) {
      onProjectChange(projectId);
    }
    // Reload the project data
    try {
      const projectData = await getProject(projectId);
      if (projectData) {
        // Convert projectService.Project to types/index.Project
        const convertedProject: Project = {
          id: projectData.id,
          name: projectData.name,
          description: projectData.description,
          startDate: projectData.startDate || new Date().toISOString().split('T')[0],
          estimatedEndDate: projectData.estimatedEndDate || new Date().toISOString().split('T')[0],
          status: projectData.status === 'planning' || projectData.status === 'paused' ? 'paused' : projectData.status === 'completed' ? 'completed' : 'active',
        };
        setCurrentProject(convertedProject);
      } else {
        setCurrentProject(null);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };
  
  return (
    <Appbar.Header style={{ backgroundColor: softDarkOrange }}>
      <Appbar.Content 
        title="SITEPULSE" 
        titleStyle={{ 
          color: 'white', 
          fontWeight: '900', 
          fontSize: 20,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontFamily: 'Roboto'
        }}
        subtitle={`Worker • ${user.name}`}
        subtitleStyle={{ color: 'rgba(255,255,255,0.8)' }}
      />
      
      {/* Project Name Dropdown on the right */}
      {currentProject && workerProjects.length > 0 && (
        <Menu
          visible={projectMenuVisible}
          onDismiss={() => setProjectMenuVisible(false)}
          contentStyle={{ backgroundColor: theme.colors.background }}
          anchor={
            <TouchableOpacity
              onPress={() => setProjectMenuVisible(true)}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginRight: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 4
              }}
            >
              <Text style={{ 
                color: 'white', 
                fontWeight: 'bold',
                fontSize: 20,
                marginRight: 4 
              }}>
                {currentProject.name}
              </Text>
              <Ionicons name="chevron-down" size={16} color="white" />
            </TouchableOpacity>
          }
        >
          {workerProjects.map((p) => (
            <Menu.Item
              key={p.projectId}
              onPress={() => handleProjectSelect(p.projectId)}
              title={p.projectName}
              titleStyle={{ 
                color: currentProject?.id === p.projectId ? theme.colors.primary : theme.colors.text,
              }}
              style={{ backgroundColor: theme.colors.background }}
            />
          ))}
        </Menu>
      )}

    </Appbar.Header>
  );
};

// Stack navigator for Tasks to handle task detail navigation
const TasksStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="WorkerTasksList" component={WorkerTasksScreen} />
    <Stack.Screen name="WorkerTaskDetail" component={WorkerTaskDetailScreen} />
  </Stack.Navigator>
);

// Stack navigator for Settings to handle legal documents
const SettingsStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      animation: 'fade',
      contentStyle: { backgroundColor: theme.colors.background }
    }}
  >
    <Stack.Screen name="SettingsMain" component={SettingsScreen} />
    <Stack.Screen 
      name="PrivacyPolicy" 
      component={PrivacyPolicyScreen}
      options={{
        animation: 'fade',
        contentStyle: { backgroundColor: theme.colors.background }
      }}
    />
    <Stack.Screen 
      name="TermsOfService" 
      component={TermsOfServiceScreen}
      options={{
        animation: 'fade',
        contentStyle: { backgroundColor: theme.colors.background }
      }}
    />
  </Stack.Navigator>
);

export default function WorkerNavigation({ user, project, onLogout, onRefresh }: Props) {
  const [currentProject, setCurrentProject] = useState<Project | null>(project || null);
  const [notificationBadgeCount, setNotificationBadgeCount] = useState<number | undefined>(undefined);

  const handleProjectChange = async (projectId: string) => {
    try {
      const { getProject } = await import('../services/projectService');
      const projectData = await getProject(projectId);
      if (projectData) {
        // Convert projectService.Project to types/index.Project
        const convertedProject: Project = {
          id: projectData.id,
          name: projectData.name,
          description: projectData.description,
          startDate: projectData.startDate || new Date().toISOString().split('T')[0],
          estimatedEndDate: projectData.estimatedEndDate || new Date().toISOString().split('T')[0],
          status: projectData.status === 'planning' || projectData.status === 'paused' ? 'paused' : projectData.status === 'completed' ? 'completed' : 'active',
        };
        setCurrentProject(convertedProject);
      } else {
        setCurrentProject(null);
      }
      // Refresh the app data
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error changing project:', error);
    }
  };

  // If user doesn't have a project assigned, show unassigned screen
  if (!user.projectId || user.projectId === 'unassigned') {
    return (
      <View style={{ flex: 1 }}>
        <WorkerHeader user={user} project={currentProject || undefined} onLogout={onLogout} onProjectChange={handleProjectChange} />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: {
              backgroundColor: '#000000',
              borderTopWidth: 1,
              borderTopColor: '#2A2A2A',
              paddingBottom: 5,
              paddingTop: 5,
              height: 65,
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '500',
            },
          }}
        >
          <Tab.Screen 
            name="Home"
            options={{ 
              tabBarLabel: 'Home',
              tabBarIcon: ({ focused, color, size }) => (
                <Ionicons 
                  name={focused ? 'home' : 'home-outline'} 
                  size={size} 
                  color={color} 
                />
              ),
            }}
          >
            {() => <UnassignedWorkerScreen user={user} onRefresh={onRefresh} />}
          </Tab.Screen>
          <Tab.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{ 
              tabBarLabel: 'Notifications',
              tabBarIcon: ({ focused, color, size }) => (
                <Ionicons 
                  name={focused ? 'notifications' : 'notifications-outline'} 
                  size={size} 
                  color={color} 
                />
              ),
            }}
          />
          <Tab.Screen 
            name="Settings" 
            options={{ 
              tabBarLabel: 'Settings',
              tabBarIcon: ({ focused, color, size }) => (
                <Ionicons 
                  name={focused ? 'settings' : 'settings-outline'} 
                  size={size} 
                  color={color} 
                />
              ),
            }}
          >
            {() => <SettingsStack />}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    );
  }

  // Normal worker navigation with full features
  return (
    <View style={{ flex: 1 }}>
      <WorkerHeader user={user} project={currentProject || project} onLogout={onLogout} onProjectChange={handleProjectChange} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            switch (route.name) {
              case 'Tasks':
                iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
                break;
              case 'Inventory Use':
                iconName = focused ? 'cube' : 'cube-outline';
                break;
              case 'Chat':
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                break;
              case 'Notifications':
                iconName = focused ? 'notifications' : 'notifications-outline';
                break;
              case 'Settings':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              default:
                iconName = 'ellipse';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: '#2A2A2A',
            paddingBottom: 5,
            paddingTop: 5,
            height: 65,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
          },
        })}
      >
        <Tab.Screen 
          name="Tasks" 
          component={TasksStack}
          options={{ tabBarLabel: 'Tasks' }}
        />
        <Tab.Screen 
          name="Inventory Use" 
          component={InventoryUseScreen}
          options={{ tabBarLabel: 'Inventory' }}
        />
        <Tab.Screen 
          name="Chat" 
          component={ChatScreen}
          options={{ tabBarLabel: 'Chat' }}
        />
        <Tab.Screen 
          name="Notifications" 
          options={{
            tabBarLabel: 'Notifications',
            tabBarBadge: notificationBadgeCount && notificationBadgeCount > 0 ? notificationBadgeCount : undefined,
          }}
        >
          {() => <NotificationsScreen onAppRefresh={onRefresh} onBadgeUpdate={setNotificationBadgeCount} />}
        </Tab.Screen>
        <Tab.Screen 
          name="Settings" 
          options={{ tabBarLabel: 'Settings' }}
        >
          {() => <SettingsStack />}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

