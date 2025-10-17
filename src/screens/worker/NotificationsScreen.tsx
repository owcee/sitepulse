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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      if (!auth.currentUser) return;
      
      setLoading(true);
      const userNotifications = await getUserNotifications();
      setNotifications(userNotifications);
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

  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, isRead: true } : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(notification => markNotificationAsRead(notification.id))
      );
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleAcceptAssignment = async (notification: Notification) => {
    if (!notification.assignmentId || !notification.projectId) return;
    
    try {
      await acceptProjectAssignment(
        notification.id, 
        notification.assignmentId, 
        notification.projectId
      );
      
      // Refresh notifications to show updated status
      await loadNotifications();
      
      Alert.alert(
        'Assignment Accepted!',
        'You have successfully joined the project. Welcome to the team!',
        [{ text: 'OK' }]
      );
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

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.isRead);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.headerActions}>
            <Badge style={styles.unreadBadge}>{unreadCount}</Badge>
            <IconButton
              icon="check-all"
              size={24}
              onPress={markAllAsRead}
              iconColor={theme.colors.primary}
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
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredNotifications.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Ionicons 
                name="notifications-off" 
                size={48} 
                color={theme.colors.onSurfaceDisabled} 
              />
              <Text style={styles.emptyText}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          filteredNotifications.map((notification, index) => (
            <Card 
              key={notification.id} 
              style={[
                styles.notificationCard,
                !notification.isRead && styles.unreadCard
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
                      <View style={styles.assignmentActions}>
                        <IconButton
                          icon="check"
                          size={20}
                          onPress={() => handleAcceptAssignment(notification)}
                          iconColor={constructionColors.complete}
                          style={styles.acceptButton}
                        />
                        <IconButton
                          icon="close"
                          size={20}
                          onPress={() => handleRejectAssignment(notification)}
                          iconColor={constructionColors.urgent}
                          style={styles.rejectButton}
                        />
                      </View>
                    ) : !notification.isRead ? (
                      <IconButton
                        {...props}
                        icon="check"
                        size={20}
                        onPress={() => markAsRead(notification.id)}
                        iconColor={theme.colors.primary}
                      />
                    ) : null}
                  </View>
                )}
                titleStyle={[
                  styles.notificationTitle,
                  !notification.isRead && styles.unreadTitle
                ]}
                descriptionStyle={styles.notificationDescription}
                onPress={() => markAsRead(notification.id)}
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterChip: {
    marginRight: spacing.sm,
    backgroundColor: '#F0F0F0',
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
    backgroundColor: 'white',
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  notificationIcon: {
    marginLeft: spacing.sm,
  },
  notificationMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  timestamp: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    fontWeight: '600',
    fontSize: fontSizes.md,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  emptyCard: {
    marginTop: spacing.xl,
    backgroundColor: 'white',
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
