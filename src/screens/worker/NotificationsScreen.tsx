import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  IconButton,
  Chip,
  FAB,
  Badge,
  Avatar,
  List,
  Divider,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  acceptProjectAssignment, 
  rejectProjectAssignment 
} from '../../services/firebaseService';
import { auth } from '../../firebaseConfig';

interface Notification {
  id: string;
  type: 'task' | 'safety' | 'weather' | 'system' | 'message' | 'project_assignment';
  title: string;
  message: string;
  timestamp?: Date;
  createdAt?: Date;
  isRead: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  projectId?: string;
  assignmentId?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'completed' | 'info';
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'task',
    title: 'New Task Assigned',
    message: 'Foundation Pour - Section A has been assigned to you',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    isRead: false,
    priority: 'high',
  },
  {
    id: '2',
    type: 'safety',
    title: 'Safety Alert',
    message: 'High wind warning in effect. Secure all loose materials.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isRead: false,
    priority: 'urgent',
  },
  {
    id: '3',
    type: 'weather',
    title: 'Weather Update',
    message: 'Rain expected at 3 PM. Plan indoor activities.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    isRead: true,
    priority: 'medium',
  },
  {
    id: '4',
    type: 'message',
    title: 'Message from Engineer',
    message: 'Please update progress on concrete curing process',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    isRead: true,
    priority: 'medium',
  },
  {
    id: '5',
    type: 'system',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight from 11 PM to 1 AM',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    isRead: true,
    priority: 'low',
  },
];

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  // Update tab badge when unread count changes
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    navigation.setOptions({
      tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
    });
  }, [notifications, navigation]);

  const loadNotifications = async () => {
    try {
      if (!auth.currentUser) return;
      
      setLoading(true);
      const userNotifications = await getUserNotifications();
      
      // Filter out read notifications and project_assignment notifications for accepted assignments
      const filteredNotifications = await Promise.all(
        userNotifications.map(async (n) => {
          // Filter out read notifications
          if (n.isRead) return null;
          
          // For project_assignment notifications, check if assignment has been accepted
          // The assignmentId in notification is the workerId (document ID in worker_assignments)
          if (n.type === 'project_assignment') {
            try {
              const { getDoc, doc } = await import('firebase/firestore');
              const { db } = await import('../../firebaseConfig');
              // Check if this worker's assignment has been accepted
              const assignmentRef = doc(db, 'worker_assignments', auth.currentUser.uid);
              const assignmentDoc = await getDoc(assignmentRef);
              
              if (assignmentDoc.exists()) {
                const assignmentData = assignmentDoc.data();
                // If assignment is accepted or rejected, filter out the notification
                if (assignmentData.status === 'accepted' || assignmentData.status === 'rejected') {
                  return null;
                }
              }
            } catch (error) {
              console.error('Error checking assignment status:', error);
              // If we can't check, keep the notification to be safe
            }
          }
          
          return n;
        })
      );
      
      // Remove null values (filtered out notifications)
      const validNotifications = filteredNotifications.filter(n => n !== null) as Notification[];
      setNotifications(validNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await markNotificationAsRead(id); // Mark as read when deleting
      // Remove notification from list immediately
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      // Mark all as read and remove from list
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(notification => markNotificationAsRead(notification.id))
      );
      // Clear all notifications from list
      setNotifications([]);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Navigate to source based on notification type
    if (notification.type === 'task') {
      // @ts-ignore
      navigation.navigate('Tasks');
    } else if (notification.type === 'message') {
      // @ts-ignore
      navigation.navigate('Chat');
    } else if (notification.type === 'project_assignment') {
      // Could navigate to project details or do nothing
      return;
    } else {
      // Default: navigate to Tasks for other notification types
      // @ts-ignore
      navigation.navigate('Tasks');
    }
  };

  const handleAcceptAssignment = async (notification: Notification) => {
    if (!notification.assignmentId || !notification.projectId) return;
    
    // Check if worker already has a project (get from auth user)
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
      // Get worker's current project status
      const { getCurrentUser } = await import('../../services/authService');
      const user = await getCurrentUser();
      const hasExistingProject = user?.projectId && user.projectId !== null;
      
      if (hasExistingProject) {
        // Show warning for project switch
        Alert.alert(
          'Switch Project?',
          `You are currently assigned to another project. Accepting this invitation will switch you to the new project.\n\nDo you want to continue?`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Switch Project',
              onPress: async () => {
                try {
                  await acceptProjectAssignment(
                    notification.id, 
                    notification.assignmentId, 
                    notification.projectId
                  );
                  
                  // Remove notification from list immediately
                  setNotifications(prev => prev.filter(n => n.id !== notification.id));
                  
                  Alert.alert(
                    'Project Switched!',
                    'You have successfully switched to the new project. Welcome to the team!',
                    [{ text: 'OK' }]
                  );
                } catch (error: any) {
                  Alert.alert('Error', `Failed to accept assignment: ${error.message}`);
                }
              }
            }
          ]
        );
      } else {
        // Regular acceptance
        await acceptProjectAssignment(
          notification.id, 
          notification.assignmentId, 
          notification.projectId
        );
        
        // Remove notification from list immediately
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        
        Alert.alert(
          'Assignment Accepted!',
          'You have successfully joined the project. Welcome to the team!',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to accept assignment: ${error.message}`);
    }
  };

  const handleRejectAssignment = async (notification: Notification) => {
    if (!notification.assignmentId || !notification.projectId) return;
    
    Alert.alert(
      'Reject Assignment',
      'Are you sure you want to reject this project assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectProjectAssignment(
                notification.id,
                notification.assignmentId!,
                notification.projectId!
              );
              
              // Refresh notifications to show updated status
              await loadNotifications();
              
              Alert.alert(
                'Assignment Rejected',
                'You have declined the project assignment.',
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              Alert.alert('Error', `Failed to reject assignment: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task':
        return 'checkmark-circle';
      case 'safety':
        return 'warning';
      case 'weather':
        return 'rainy';
      case 'system':
        return 'settings';
      case 'message':
        return 'chatbubble';
      case 'project_assignment':
        return 'briefcase';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: Notification['type'], priority?: Notification['priority']) => {
    if (priority === 'urgent') return constructionColors.urgent;
    if (priority === 'high') return constructionColors.inProgress;
    
    switch (type) {
      case 'task':
        return theme.colors.primary;
      case 'safety':
        return constructionColors.urgent;
      case 'weather':
        return theme.colors.primary;
      case 'system':
        return theme.colors.onSurface;
      case 'message':
        return constructionColors.complete;
      case 'project_assignment':
        return constructionColors.inProgress;
      default:
        return theme.colors.primary;
    }
  };

  const formatTimestamp = (notification: Notification) => {
    const timestamp = notification.createdAt || notification.timestamp;
    if (!timestamp) return 'Recently';
    
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'urgent') return notification.priority === 'urgent' || notification.priority === 'high';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = notifications.filter(n => (n.priority === 'urgent' || n.priority === 'high') && !n.isRead).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Notifications</Text>
        </View>
        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            <Badge style={styles.unreadBadge}>{unreadCount}</Badge>
            <IconButton
              icon="delete"
              size={24}
              onPress={handleDeleteAllNotifications}
              iconColor={constructionColors.urgent}
            />
          </View>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={styles.filterChip}
          textStyle={filter === 'all' ? styles.selectedChipText : styles.chipText}
        >
          All ({notifications.length})
        </Chip>
        <Chip
          selected={filter === 'unread'}
          onPress={() => setFilter('unread')}
          style={styles.filterChip}
          textStyle={filter === 'unread' ? styles.selectedChipText : styles.chipText}
        >
          Unread ({unreadCount})
        </Chip>
        <Chip
          selected={filter === 'urgent'}
          onPress={() => setFilter('urgent')}
          style={styles.filterChip}
          textStyle={filter === 'urgent' ? styles.selectedChipText : styles.chipText}
        >
          Urgent ({urgentCount})
        </Chip>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: spacing.md, color: theme.colors.onSurfaceVariant }}>
              Loading notifications...
            </Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Ionicons 
                name="notifications-off" 
                size={48} 
                color={theme.colors.onSurfaceDisabled} 
              />
              <Text style={styles.emptyText}>
                {filter === 'unread' ? 'No unread notifications' : 
                 filter === 'urgent' ? 'No urgent notifications' : 'No notifications'}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          filteredNotifications.map((notification, index) => (
            <Card 
              key={notification.id} 
              style={[
                styles.notificationCard,
                !notification.isRead && styles.unreadCard,
                notification.priority === 'urgent' && styles.urgentCard
              ]}
            >
              <List.Item
                title={notification.title}
                description={notification.message}
                left={(props) => (
                  <Avatar.Icon
                    {...props}
                    icon={getNotificationIcon(notification.type)}
                    style={[
                      styles.notificationIcon,
                      { backgroundColor: getNotificationColor(notification.type, notification.priority) }
                    ]}
                    color="white"
                    size={48}
                  />
                )}
                right={(props) => (
                  <View style={styles.notificationMeta}>
                    <Text style={styles.timestamp}>
                      {formatTimestamp(notification)}
                    </Text>
                    {notification.type === 'project_assignment' && notification.status === 'pending' ? (
                      <View style={styles.notificationActions}>
                        <IconButton
                          icon="check"
                          size={20}
                          onPress={() => handleAcceptAssignment(notification)}
                          iconColor={constructionColors.complete}
                        />
                      </View>
                    ) : (
                      <View style={styles.notificationActions}>
                        <IconButton
                          {...props}
                          icon="delete"
                          size={20}
                          onPress={() => handleDeleteNotification(notification.id)}
                          iconColor={constructionColors.urgent}
                        />
                      </View>
                    )}
                  </View>
                )}
                titleStyle={[
                  styles.notificationTitle,
                  !notification.isRead && styles.unreadTitle
                ]}
                descriptionStyle={styles.notificationDescription}
                onPress={() => {
                  if (notification.type === 'project_assignment') {
                    return;
                  }
                  handleNotificationPress(notification);
                }}
              />
              {index < filteredNotifications.length - 1 && <Divider />}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: constructionColors.urgent,
    marginRight: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  filterChip: {
    marginRight: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  chipText: {
    color: theme.colors.onSurfaceVariant,
  },
  selectedChipText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
  },
  notificationCard: {
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.surface,
    elevation: 2,
    borderRadius: theme.roundness,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: constructionColors.urgent,
  },
  notificationIcon: {
    marginLeft: spacing.sm,
  },
  notificationMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  notificationActions: {
    flexDirection: 'row',
  },
  timestamp: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    fontWeight: '600',
    fontSize: fontSizes.md,
    color: theme.colors.text,
  },
  unreadTitle: {
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  notificationDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  emptyCard: {
    marginTop: spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceDisabled,
    marginTop: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.md,
  },
  assignmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    margin: 0,
    marginRight: spacing.xs,
  },
  rejectButton: {
    margin: 0,
  },
});
