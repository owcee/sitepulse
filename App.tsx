import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { User } from './src/types';
import { theme } from './src/utils/theme';
import { ProjectDataProvider } from './src/context/ProjectDataContext';
import EngineerNavigation from './src/navigation/EngineerNavigation';
import WorkerNavigation from './src/navigation/WorkerNavigation';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import { onAuthStateChange, signOutUser } from './src/services/authService';
import CreateNewProjectScreen from './src/screens/engineer/CreateNewProjectScreen';
import { registerForPushNotifications, clearFCMToken } from './src/services/fcmService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [currentProject, setCurrentProject] = useState<any>(null);

  // Handle logout
  const handleLogout = async () => {
    try {
      await clearFCMToken(); // Clear push notification token
      await signOutUser();
      // setUser(null) will be called automatically by onAuthStateChange
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle refresh - re-check user authentication state
  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      // Force re-fetch user data from Firestore
      const { getCurrentUser } = await import('./src/services/authService');
      const refreshedUser = await getCurrentUser();
      setUser(refreshedUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (authUser: User | null) => {
      console.log('App.tsx - Auth state changed:', authUser);
      setUser(authUser);
      
      // Register for push notifications when user logs in
      if (authUser) {
        try {
          await registerForPushNotifications();
          console.log('✅ Push notifications registered');
        } catch (error) {
          console.error('Error registering for push notifications:', error);
        }
      }
      
      // Load user's project if they have one
      if (authUser && authUser.projectId) {
        try {
          console.log('📦 Loading project:', authUser.projectId);
          const { getProject } = await import('./src/services/projectService');
          
          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Project load timeout')), 10000)
          );
          
          const project = await Promise.race([
            getProject(authUser.projectId),
            timeoutPromise
          ]) as any;
          
          if (project) {
            console.log('✅ Project loaded successfully:', project.name);
            setCurrentProject(project);
          } else {
            console.error('❌ Project not found');
            setCurrentProject(null);
          }
        } catch (error) {
          console.error('❌ Error loading project:', error);
          // Set null to prevent infinite loading - user can create new project
          setCurrentProject(null);
        }
      } else {
        setCurrentProject(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Loading SitePulse...</Text>
          </View>
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  // Show authentication screens if not logged in
  if (!user) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <NavigationContainer>
            {showSignUp ? (
              <SignUpScreen 
                onSignUp={setUser}
                onBackToLogin={() => setShowSignUp(false)}
              />
            ) : (
              <LoginScreen 
                onLogin={setUser}
                onNavigateToSignUp={() => setShowSignUp(true)}
              />
            )}
            <StatusBar style="auto" />
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  // After auth check, before navigation return
  console.log('🔍 Full user object:', JSON.stringify(user, null, 2));
  console.log('🔍 Checking project assignment:', {
    role: user.role,
    projectId: user.projectId,
    typeOfProjectId: typeof user.projectId,
    hasProjectId: !!user.projectId,
    isNull: user.projectId === null,
    isUndefined: user.projectId === undefined,
    isEmpty: user.projectId === '',
    condition: user.role === 'engineer' && !user.projectId
  });
  
  if (user.role === 'engineer' && !user.projectId) {
    console.log('📝 Engineer has no projects - showing CreateNewProjectScreen');
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <CreateNewProjectScreen onProjectCreated={handleRefresh} />
        </SafeAreaProvider>
      </PaperProvider>
    );
  }
  
  console.log('✅ Engineer has project, showing dashboard');

  // For workers without projects, show unassigned worker screen
  if (user.role === 'worker' && !user.projectId) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <NavigationContainer>
            <WorkerNavigation 
              user={user} 
              project={undefined} 
              onLogout={handleLogout}
              onRefresh={handleRefresh}
            />
            <StatusBar style="auto" />
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  // User has a project, show full app
  if (currentProject) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <ProjectDataProvider 
            projectId={currentProject.id}
            userId={user.uid}
            userRole={user.role}
          >
            <NavigationContainer>
              {user.role === 'engineer' ? (
                <EngineerNavigation 
                  user={user} 
                  project={currentProject} 
                  onLogout={handleLogout}
                />
              ) : (
                <WorkerNavigation 
                  user={user} 
                  project={currentProject} 
                  onLogout={handleLogout}
                  onRefresh={handleRefresh}
                />
              )}
              <StatusBar style="auto" />
            </NavigationContainer>
          </ProjectDataProvider>
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  // Fallback: If user has projectId but project failed to load, show create screen
  if (user.projectId && !currentProject && !isLoading) {
    console.log('⚠️ Project ID exists but project not loaded - showing create screen');
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <CreateNewProjectScreen onProjectCreated={handleRefresh} />
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  // Loading project data
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading project data...</Text>
        </View>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

