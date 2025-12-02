import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  IconButton,
  Chip,
  Badge,
  Avatar,
  List,
  Divider,
  Portal,
  Modal,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  Notification as FirebaseNotification
} from '../../services/notificationService';

interface Notification {
  id: string;
  type: 'task_approval' | 'task_rejection' | 'delay_warning' | 'resource_alert' | 'chat_message' | 'worker_request' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  relatedId?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'task_approval',
    title: 'Task Photo Needs Review',
    message: 'Foundation excavation photos submitted by Mike Johnson require verification',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    isRead: false,
    priority: 'high',
    relatedId: 'task-1',
  },
  {
    id: '2',
    type: 'delay_warning',
    title: 'Project Delay Alert',
    message: 'Concrete pouring task is predicted to be 2 days behind schedule',
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
    isRead: false,
    priority: 'urgent',
    relatedId: 'task-2',
  },
  {
    id: '3',
    type: 'resource_alert',
    title: 'Low Inventory Alert',
    message: 'Steel rebar stock is running low (8 tons remaining, minimum: 15 tons)',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isRead: false,
    priority: 'medium',
  },
  {
    id: '4',
    type: 'worker_request',
    title: 'Worker Support Request',
    message: 'Sarah Davis requests assistance with concrete mixer operation',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    isRead: true,
    priority: 'medium',
    relatedId: 'worker-2',
  },
  {
    id: '5',
    type: 'chat_message',
    title: 'New Project Message',
    message: 'Carlos Rodriguez: "Electrical conduit installation completed ahead of schedule"',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    isRead: true,
    priority: 'low',
  },
  {
    id: '6',
    type: 'task_rejection',
    title: 'Task Photo Rejected',
    message: 'Framing installation photo was rejected due to insufficient lighting',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    isRead: true,
    priority: 'medium',
    relatedId: 'task-3',
  },
  {
    id: '7',
    type: 'system',
    title: 'System Update',
    message: 'SitePulse app has been updated to version 2.1.4 with new features',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    isRead: true,
    priority: 'low',
  },
];

interface NotificationsScreenProps {
  visible?: boolean;
  onDismiss?: () => void;
  onRefresh?: () => Promise<void>;
  currentProjectId?: string;
}

export default function NotificationsScreen({ visible, onDismiss, onRefresh, currentProjectId }: NotificationsScreenProps = {}) {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((updatedNotifications) => {
      // Convert to local format and filter out read notifications
      const formattedNotifications = updatedNotifications
        .filter(notif => !notif.read) // Only show unread notifications
        .map(notif => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.body,
          timestamp: notif.timestamp,
          projectId: notif.projectId, // Include projectId
          isRead: notif.read,
          priority: notif.status === 'pending' ? 'high' : 'medium',
          relatedId: notif.relatedId,
        }));
      setNotifications(formattedNotifications);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Notifications are already real-time, just set refreshing to false after a delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      // Remove notification from list immediately
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      // Delete all notifications
      const deletePromises = notifications.map(n => deleteNotification(n.id));
      await Promise.all(deletePromises);
      // Clear all notifications from list
      setNotifications([]);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Close the modal first
    if (onDismiss) {
      onDismiss();
    }
    
    // If notification has a projectId and it's different from current project, switch first
    if (notification.projectId && notification.projectId !== currentProjectId && onRefresh) {
      try {
        const { getAuth } = await import('firebase/auth');
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebaseConfig');
        
        const firebaseAuth = getAuth();
        const currentUser = firebaseAuth.currentUser;
        if (currentUser) {
          const engineerRef = doc(db, 'engineer_accounts', currentUser.uid);
          await updateDoc(engineerRef, {
            currentProjectId: notification.projectId,
            projectId: notification.projectId, // Legacy support
          });
          
          console.log('[Notification] Switched to project:', notification.projectId);
          
          // Wait for project switch to complete - longer delay to ensure data loads
          await onRefresh();
          
          // Wait longer to ensure project data is fully loaded before navigation
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error switching project for notification:', error);
        // Continue with navigation even if switch fails
      }
    }
    
    // Check if navigation is ready before navigating
    if (!navigation || !navigation.navigate) {
      console.warn('[Notification] Navigation not ready, delaying navigation...');
      // Retry after a short delay
      setTimeout(() => {
        if (navigation && navigation.navigate) {
          navigateToScreen(notification.type);
        } else {
          console.error('[Notification] Navigation still not available after delay');
        }
      }, 500);
      return;
    }
    
    navigateToScreen(notification.type);
  };

  const navigateToScreen = (notificationType: Notification['type']) => {
    try {
      // Navigate to source based on notification type
      if (notificationType === 'task_approval' || notificationType === 'task_rejection') {
        // Navigate to Report Logs (verification logs)
        // @ts-ignore - Navigation typing would be properly configured in production
        navigation.navigate('Report Logs');
      } else if (notificationType === 'delay_warning') {
        // Navigate to delay prediction screen
        // @ts-ignore
        navigation.navigate('Delay Prediction');
      } else if (notificationType === 'resource_alert') {
        // Navigate to resources screen
        // @ts-ignore
        navigation.navigate('Resources');
      } else if (notificationType === 'chat_message') {
        // Navigate to chat screen
        // @ts-ignore
        navigation.navigate('Chat');
      } else if (notificationType === 'worker_request') {
        // Navigate to workers management
        // @ts-ignore
        navigation.navigate('WorkersManagement');
      } else {
        // Default: navigate to Report Logs for other notification types
        // @ts-ignore
        navigation.navigate('Report Logs');
      }
    } catch (error) {
      console.error('[Notification] Error navigating:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task_approval':
        return 'check-circle';
      case 'task_rejection':
        return 'close-circle';
      case 'delay_warning':
        return 'alert';
      case 'resource_alert':
        return 'alert';
      case 'chat_message':
        return 'message';
      case 'worker_request':
        return 'account-plus';
      case 'system':
        return 'cog';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'urgent') return constructionColors.urgent;
    if (priority === 'high') return constructionColors.warning;
    
    switch (type) {
      case 'task_approval':
        return constructionColors.complete;
      case 'task_rejection':
        return constructionColors.urgent;
      case 'delay_warning':
        return constructionColors.urgent;
      case 'resource_alert':
        return constructionColors.warning;
      case 'chat_message':
        return theme.colors.primary;
      case 'worker_request':
        return constructionColors.inProgress;
      case 'system':
        return theme.colors.onSurface;
      default:
        return theme.colors.primary;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
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

  // If used as modal
  const content = (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onDismiss && (
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              iconColor={theme.colors.text}
            />
          )}
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
                      {formatTimestamp(notification.timestamp)}
                    </Text>
                    <View style={styles.notificationActions}>
                      <IconButton
                        {...props}
                        icon="delete"
                        size={20}
                        onPress={() => handleDeleteNotification(notification.id)}
                        iconColor={constructionColors.urgent}
                      />
                    </View>
                  </View>
                )}
                titleStyle={[
                  styles.notificationTitle,
                  !notification.isRead && styles.unreadTitle
                ]}
                descriptionStyle={styles.notificationDescription}
                onPress={() => handleNotificationPress(notification)}
              />
              {index < filteredNotifications.length - 1 && <Divider />}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );

  // Return as modal or standalone screen
  if (visible !== undefined) {
    return (
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          contentContainerStyle={styles.modalContainer}
        >
          {content}
        </Modal>
      </Portal>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalContainer: {
    flex: 1,
    marginTop: 40,
    marginHorizontal: 16,
    marginBottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
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
    color: theme.colors.text,
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
  timestamp: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  notificationActions: {
    flexDirection: 'row',
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
});















