import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Appbar, Avatar, Badge, Menu, IconButton, Text } from 'react-native-paper';
import { View, TouchableOpacity } from 'react-native';

import { User, Project } from '../types';
import { theme } from '../utils/theme';
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
  const [menuVisible, setMenuVisible] = useState(false);
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
      setCurrentProject(projectData);
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };
  
  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
      <Appbar.Content 
        title="SitePulse" 
        titleStyle={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}
        subtitle={`Worker • ${user.name}`}
        subtitleStyle={{ color: 'rgba(255,255,255,0.8)' }}
      />
      
      {/* Project Name Dropdown on the right */}
      {currentProject && workerProjects.length > 0 && (
        <Menu
          visible={projectMenuVisible}
          onDismiss={() => setProjectMenuVisible(false)}
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
                color: currentProject?.id === p.projectId ? theme.colors.primary : theme.colors.text 
              }}
            />
          ))}
        </Menu>
      )}
      
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Avatar.Image 
            size={32} 
            source={{ uri: user.profileImage || 'https://via.placeholder.com/32' }}
            style={{ marginRight: 16 }}
            onTouchEnd={() => setMenuVisible(true)}
          />
        }
      >
        <Menu.Item 
          onPress={() => {
            setMenuVisible(false);
            onLogout && onLogout();
          }} 
          title="Logout" 
        />
      </Menu>

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

export default function WorkerNavigation({ user, project, onLogout, onRefresh }: Props) {
  const [currentProject, setCurrentProject] = useState<Project | null>(project || null);

  const handleProjectChange = async (projectId: string) => {
    try {
      const { getProject } = await import('../services/projectService');
      const projectData = await getProject(projectId);
      setCurrentProject(projectData);
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
        <WorkerHeader user={user} project={currentProject} onLogout={onLogout} onProjectChange={handleProjectChange} />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: {
              backgroundColor: 'white',
              borderTopWidth: 1,
              borderTopColor: '#E0E0E0',
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
            component={SettingsScreen}
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
          />
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
                iconName = 'circle';
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
          component={NotificationsScreen}
          options={({ route }) => {
            // Get unread count from route params if available
            const unreadCount = (route.params as any)?.unreadCount;
            return {
              tabBarLabel: 'Notifications',
              tabBarBadge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
            };
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ tabBarLabel: 'Settings' }}
        />
      </Tab.Navigator>
    </View>
  );
}

