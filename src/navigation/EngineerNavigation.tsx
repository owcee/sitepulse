import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Appbar, IconButton, Badge, ActivityIndicator, Text, Snackbar } from 'react-native-paper';
import { View, Alert } from 'react-native';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getUnreadCount } from '../services/notificationService';
import { getProjectTasks, Task } from '../services/taskService';
import { shouldShowSurvey, submitSurvey, recordSurveySubmission, skipSurveyForToday, SurveyData } from '../services/surveyService';
import DailySiteSurvey from '../components/DailySiteSurvey';

import { User, Project } from '../types';
import { theme, constructionColors, softDarkOrange } from '../utils/theme';

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
import DelayPredictionScreen from '../screens/engineer/DelayPredictionScreen';
import ResourcesScreen from '../screens/engineer/ResourcesScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import NotificationsScreen from '../screens/engineer/NotificationsScreen';
import SettingsScreen from '../screens/engineer/SettingsScreen';
import PrivacyPolicyScreen from '../screens/shared/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/shared/TermsOfServiceScreen';

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
      // Filter out deleted notifications
      const unreadCount = snapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.deleted; // Exclude deleted notifications
      }).length;
      setUnreadNotifications(unreadCount);
    });

    return () => unsubscribe();
  }, [user.uid]);

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
        subtitle={project?.name || 'Project'}
        subtitleStyle={{ color: 'rgba(255,255,255,0.9)' }}
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
              backgroundColor: theme.colors.background 
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

// Stack navigator for Tasks
const TasksStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TasksList" component={TasksScreen} />
  </Stack.Navigator>
);

// Stack navigator for Project Tools and related screens
const ProjectToolsStack = ({ user, project, onLogout }: Props) => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      animation: 'fade',
      contentStyle: { backgroundColor: theme.colors.background }
    }}
  >
    <Stack.Screen name="ProjectToolsMain">
      {(props) => <ProjectToolsScreen {...props} user={user} project={project} onLogout={onLogout} />}
    </Stack.Screen>
    <Stack.Screen name="Tasks" component={TasksStack} />
    <Stack.Screen name="CreateNewProject" component={CreateNewProjectScreen} />
    <Stack.Screen name="WorkerAssignment" component={WorkerAssignmentScreen as any} />
    <Stack.Screen name="MaterialsManagement" component={MaterialsManagementPage} />
    <Stack.Screen name="WorkersManagement" component={WorkersManagementPage} />
    <Stack.Screen name="EquipmentManagement" component={EquipmentManagementPage} />
    <Stack.Screen name="BudgetLogsManagement" component={BudgetLogsManagementPage} />
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

export default function EngineerNavigation({ user, project, onLogout }: Props) {
  const [hasProjects, setHasProjects] = useState<boolean | null>(null);
  const [isCheckingProjects, setIsCheckingProjects] = useState(true);
  
  // Daily Survey State
  const [showSurvey, setShowSurvey] = useState(false);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [surveyChecked, setSurveyChecked] = useState(false);
  
  // Success Snackbar State (dark mode styled)
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

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

  // Check if we should show the daily survey
  useEffect(() => {
    const checkDailySurvey = async () => {
      if (!project?.id || !user?.uid || surveyChecked) return;
      
      try {
        console.log('[Survey] Checking if survey should be shown...');
        const shouldShow = await shouldShowSurvey(user.uid);
        
        if (shouldShow) {
          // Load active tasks for the survey
          const tasks = await getProjectTasks(project.id);
          const activeTasksList = tasks.filter(
            t => t.status === 'in_progress' || t.status === 'not_started'
          );
          
          if (activeTasksList.length > 0) {
            console.log('[Survey] Showing survey with', activeTasksList.length, 'active tasks');
            setActiveTasks(activeTasksList);
            setShowSurvey(true);
          } else {
            console.log('[Survey] No active tasks, skipping survey');
          }
        } else {
          console.log('[Survey] Survey already completed today');
        }
        
        setSurveyChecked(true);
      } catch (error) {
        console.error('[Survey] Error checking survey:', error);
        setSurveyChecked(true);
      }
    };

    if (hasProjects && !isCheckingProjects) {
      checkDailySurvey();
    }
  }, [project?.id, user?.uid, hasProjects, isCheckingProjects, surveyChecked]);

  // Handle survey submission
  const handleSurveySubmit = async (surveyData: SurveyData) => {
    try {
      console.log('[Survey] Submitting survey...');
      await submitSurvey(surveyData);
      await recordSurveySubmission(user.uid, project.id);
      // Show dark-mode styled snackbar instead of white Alert
      setSnackbarMessage('✅ Daily survey submitted! Delay predictions updated.');
      setSnackbarVisible(true);
    } catch (error: any) {
      console.error('[Survey] Submission error:', error);
      setSnackbarMessage('❌ ' + (error.message || 'Failed to submit survey'));
      setSnackbarVisible(true);
      throw error; // Re-throw to keep modal open
    }
  };

  // Handle survey skip
  const handleSurveySkip = async () => {
    try {
      await skipSurveyForToday(user.uid);
      console.log('[Survey] Survey skipped for today');
    } catch (error) {
      console.error('[Survey] Error skipping survey:', error);
    }
  };

  // Show loading while checking for projects
  if (isCheckingProjects) {
    return (
      <View style={{ flex: 1 }}>
        <CustomHeader user={user} project={project} onLogout={onLogout} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.text }}>
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
      
      {/* Daily Site Survey Modal */}
      <DailySiteSurvey
        isVisible={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSubmit={handleSurveySubmit}
        onSkip={handleSurveySkip}
        engineerName={user.displayName || user.email || 'Engineer'}
        projectName={project?.name || 'Project'}
        projectId={project?.id || ''}
        activeTasks={activeTasks.map(t => ({
          id: t.id,
          title: t.title,
          subTask: t.subTask,
          status: t.status
        }))}
      />
      
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
          tabBarInactiveTintColor: '#9E9E9E',
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: '#2A2A2A',
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
      
      {/* Dark Mode Success/Error Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: constructionColors.complete,
        }}
        action={{
          label: 'OK',
          textColor: theme.colors.primary,
          onPress: () => setSnackbarVisible(false),
        }}
      >
        <Text style={{ color: theme.colors.text }}>{snackbarMessage}</Text>
      </Snackbar>
    </View>
  );
}

