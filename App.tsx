import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Animated } from 'react-native';
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
  const [isSigningUp, setIsSigningUp] = useState(false);

  const [currentProject, setCurrentProject] = useState<any>(null);

  // Animation for smooth transition between login and signup
  // Must be declared before any conditional returns
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      
      // Small delay to ensure Firestore updates have propagated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force re-fetch user data from Firestore
      const { getCurrentUser } = await import('./src/services/authService');
      const refreshedUser = await getCurrentUser();
      console.log('🔄 Refreshed user:', refreshedUser);
      setUser(refreshedUser);
      
      // If user has a project, load it
      if (refreshedUser && refreshedUser.projectId) {
        try {
          const { getProject } = await import('./src/services/projectService');
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Project loading timeout after 10 seconds')), 10000)
          );
          
          const projectPromise = getProject(refreshedUser.projectId);
          const project = await Promise.race([projectPromise, timeoutPromise]) as any;
          
          if (project) {
            setCurrentProject(project);
            console.log('✅ Project loaded after refresh:', project.id, project.name);
          } else {
            console.warn('⚠️ Project not found after refresh');
            setCurrentProject(null);
          }
        } catch (error) {
          console.error('Error loading project after refresh:', error);
          setCurrentProject(null);
        }
      } else {
        console.log('ℹ️ User has no projectId');
        setCurrentProject(null);
      }
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
      // Skip during sign-up process to avoid errors (user gets signed out immediately)
      if (authUser && !isSigningUp) {
        try {
          await registerForPushNotifications();
          console.log('✅ Push notifications registered');
        } catch (error) {
          console.error('Error registering for push notifications:', error);
        }
      }
      
      // Load user's project if they have one (with timeout to prevent freezing)
      if (authUser && authUser.projectId) {
        try {
          const { getProject } = await import('./src/services/projectService');
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Project loading timeout after 10 seconds')), 10000)
          );
          
          const projectPromise = getProject(authUser.projectId);
          const project = await Promise.race([projectPromise, timeoutPromise]) as any;
          
          if (project) {
            setCurrentProject(project);
          } else {
            setCurrentProject(null);
          }
        } catch (error) {
          console.error('Error loading project:', error);
          // Set to null on error/timeout so app can continue
          setCurrentProject(null);
        }
      } else {
        setCurrentProject(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isSigningUp]);

  // Animation effect for smooth transition between login and signup
  useEffect(() => {
    // Start fade animation when showSignUp changes
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showSignUp]);

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.text }}>Loading SitePulse...</Text>
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
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
              <Animated.View
                style={{
                  flex: 1,
                  opacity: fadeAnim,
                  backgroundColor: theme.colors.background,
                }}
              >
              {showSignUp ? (
                <SignUpScreen 
                  onSignUp={(user) => {
                    // Don't set user here - let auth state change handle it
                    // The sign-out will happen in SignUpScreen, which will trigger auth state change
                  }}
                  onBackToLogin={() => {
                    setShowSignUp(false);
                    setIsSigningUp(false);
                  }}
                  onSignUpStart={() => setIsSigningUp(true)}
                  onSignUpComplete={() => {
                    // Reset flag after sign-out completes (handled by auth state change)
                    setTimeout(() => setIsSigningUp(false), 1000);
                  }}
                />
              ) : (
                <LoginScreen 
                  onLogin={setUser}
                  onNavigateToSignUp={() => setShowSignUp(true)}
                />
              )}
              </Animated.View>
            </View>
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
    condition: user.role === 'engineer' && !user.projectId,
    isSigningUp: isSigningUp
  });
  
  // Don't show CreateNewProjectScreen if we're in the middle of sign-up process
  // This prevents the flash of CreateNewProjectScreen before sign-out
  if (user.role === 'engineer' && !user.projectId && !isSigningUp) {
    console.log('📝 Engineer has no projects - showing CreateNewProjectScreen');
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <NavigationContainer>
            <CreateNewProjectScreen onProjectCreated={handleRefresh} />
            <StatusBar style="auto" />
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    );
  }
  
  // If signing up, show loading to prevent navigation flash
  if (isSigningUp) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 16, color: theme.colors.text }}>Creating account...</Text>
          </View>
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

  // Loading project data
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.text }}>Loading project data...</Text>
        </View>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

