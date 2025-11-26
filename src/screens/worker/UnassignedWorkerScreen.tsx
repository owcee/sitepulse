import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Text, ScrollView } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button,
  Avatar,
  Surface,
  ActivityIndicator
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { 
  getWorkerInvites, 
  acceptAssignment, 
  rejectAssignment,
  WorkerAssignment
} from '../../services/assignmentService';

interface UnassignedWorkerScreenProps {
  user: {
    uid: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  onRefresh?: () => void;
}

export default function UnassignedWorkerScreen({ user, onRefresh }: UnassignedWorkerScreenProps) {
  const [invitations, setInvitations] = useState<WorkerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Load worker invitations
  useEffect(() => {
    loadInvitations();
  }, [user.uid]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const invites = await getWorkerInvites(user.uid);
      setInvitations(invites);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invite: WorkerAssignment) => {
    // Check if this is a project switch
    if (invite.isProjectSwitch && user.projectId) {
      Alert.alert(
        'Switch Project?',
        `You are currently assigned to another project. Accepting this invitation will switch you to "${invite.projectName}".\n\nDo you want to continue?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Switch Project',
            onPress: async () => {
              setAccepting(true);
              try {
                await acceptAssignment(user.uid, invite.projectId);
                Alert.alert(
                  'Project Switched! 🎉',
                  `You've joined ${invite.projectName}. Refreshing...`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        if (onRefresh) onRefresh();
                      }
                    }
                  ]
                );
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to accept invitation');
              } finally {
                setAccepting(false);
              }
            }
          }
        ]
      );
      return;
    }

    // Regular acceptance (no existing project)
    setAccepting(true);
    try {
      await acceptAssignment(user.uid, invite.projectId);
      Alert.alert(
        'Invitation Accepted! 🎉',
        `You've joined ${invite.projectName}. Refreshing...`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onRefresh) onRefresh();
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async (invite: WorkerAssignment) => {
    Alert.alert(
      'Reject Invitation',
      `Are you sure you want to reject the invitation to ${invite.projectName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setRejecting(true);
            try {
              await rejectAssignment(user.uid);
              Alert.alert('Invitation Rejected', 'You can be invited to other projects.');
              loadInvitations();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject invitation');
            } finally {
              setRejecting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Avatar.Image
            size={80}
            source={{ uri: user.profileImage || 'https://via.placeholder.com/80' }}
            style={styles.avatar}
          />
          <Title style={styles.welcomeTitle}>Welcome, {user.name}!</Title>
          <Paragraph style={styles.welcomeSubtitle}>
            You're ready to start working
          </Paragraph>
        </View>

        {/* Invitations Section */}
        {loading ? (
          <Card style={styles.statusCard}>
            <Card.Content style={styles.statusContent}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Paragraph style={{ marginTop: spacing.md }}>Checking for invitations...</Paragraph>
            </Card.Content>
          </Card>
        ) : invitations.length > 0 ? (
          <>
            {invitations.length > 1 && (
              <Paragraph style={styles.invitationsCount}>
                You have {invitations.length} project invitation{invitations.length > 1 ? 's' : ''}
              </Paragraph>
            )}
            {invitations.map((invite, index) => (
              <Card key={invite.projectId} style={[styles.invitationCard, index < invitations.length - 1 && styles.invitationCardMargin]}>
                <Card.Content>
                  <View style={styles.invitationHeader}>
                    <Ionicons 
                      name="mail" 
                      size={32} 
                      color={theme.colors.primary} 
                    />
                    <Title style={styles.invitationTitle}>Project Invitation!</Title>
                  </View>
                  
                  <Paragraph style={styles.invitationText}>
                    <Text style={styles.boldText}>{invite.invitedByName}</Text> has invited you to join:
                  </Paragraph>
                  
                  <Title style={styles.projectName}>{invite.projectName}</Title>
                  
                  <Paragraph style={styles.invitationDate}>
                    Invited on {new Date(invite.invitedAt).toLocaleDateString()}
                  </Paragraph>
                  
                  <View style={styles.invitationActions}>
                    <Button
                      mode="contained"
                      onPress={() => handleAccept(invite)}
                      loading={accepting}
                      disabled={accepting || rejecting}
                      icon="check"
                      style={styles.acceptButton}
                    >
                      Accept
                    </Button>
                    
                    <Button
                      mode="outlined"
                      onPress={() => handleReject(invite)}
                      loading={rejecting}
                      disabled={accepting || rejecting}
                      icon="close"
                      style={styles.rejectButton}
                    >
                      Reject
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </>
        ) : (
          <Card style={styles.statusCard}>
            <Card.Content style={styles.statusContent}>
              <View style={styles.statusIconContainer}>
                <Ionicons 
                  name="time-outline" 
                  size={48} 
                  color={theme.colors.primary} 
                />
              </View>
              <Title style={styles.statusTitle}>Waiting for Project Assignment</Title>
              <Paragraph style={styles.statusMessage}>
                You're not currently assigned to any project. An engineer will invite you to join a project soon.
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        {/* What's Available Card */}
        <Card style={styles.availableCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>What You Can Do Now</Title>
            <View style={styles.availableActions}>
              <View style={styles.actionItem}>
                <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
                <View style={styles.actionText}>
                  <Paragraph style={styles.actionTitle}>Check Notifications</Paragraph>
                  <Paragraph style={styles.actionDescription}>
                    Project assignment requests will appear here
                  </Paragraph>
                </View>
              </View>
              
              <View style={styles.actionItem}>
                <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
                <View style={styles.actionText}>
                  <Paragraph style={styles.actionTitle}>Update Profile</Paragraph>
                  <Paragraph style={styles.actionDescription}>
                    Keep your information current and complete
                  </Paragraph>
                </View>
              </View>
              
              <View style={styles.actionItem}>
                <Ionicons name="chatbubbles-outline" size={24} color={theme.colors.primary} />
                <View style={styles.actionText}>
                  <Paragraph style={styles.actionTitle}>General Chat</Paragraph>
                  <Paragraph style={styles.actionDescription}>
                    Connect with other team members
                  </Paragraph>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Instructions Card */}
        <Card style={styles.instructionsCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>How Project Assignment Works</Title>
            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <Surface style={styles.stepNumber}>
                  <Paragraph style={styles.stepNumberText}>1</Paragraph>
                </Surface>
                <Paragraph style={styles.stepText}>
                  Engineer creates a new project
                </Paragraph>
              </View>
              
              <View style={styles.stepItem}>
                <Surface style={styles.stepNumber}>
                  <Paragraph style={styles.stepNumberText}>2</Paragraph>
                </Surface>
                <Paragraph style={styles.stepText}>
                  You receive an assignment notification
                </Paragraph>
              </View>
              
              <View style={styles.stepItem}>
                <Surface style={styles.stepNumber}>
                  <Paragraph style={styles.stepNumberText}>3</Paragraph>
                </Surface>
                <Paragraph style={styles.stepText}>
                  Accept the invitation to join the project
                </Paragraph>
              </View>
              
              <View style={styles.stepItem}>
                <Surface style={styles.stepNumber}>
                  <Paragraph style={styles.stepNumberText}>4</Paragraph>
                </Surface>
                <Paragraph style={styles.stepText}>
                  Start working on tasks and collaborate with your team
                </Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Refresh Button */}
        <Button
          mode="outlined"
          onPress={onRefresh}
          style={styles.refreshButton}
          icon="refresh"
        >
          Check for Updates
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  statusCard: {
    marginBottom: spacing.lg,
    elevation: 3,
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  statusContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statusIconContainer: {
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  availableCard: {
    marginBottom: spacing.lg,
    elevation: 2,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  availableActions: {
    marginVertical: -spacing.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    marginVertical: spacing.sm,
  },
  actionText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  actionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  instructionsCard: {
    marginBottom: spacing.lg,
    elevation: 2,
  },
  stepsList: {
    marginVertical: -spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: theme.colors.onPrimaryContainer,
    textAlign: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: theme.colors.onSurface,
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: spacing.md,
    borderColor: theme.colors.outline,
  },
  invitationsCount: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  invitationCard: {
    marginBottom: spacing.lg,
    elevation: 4,
    backgroundColor: theme.colors.primaryContainer,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  invitationCardMargin: {
    marginBottom: spacing.md,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  invitationTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: spacing.sm,
  },
  invitationText: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  boldText: {
    fontWeight: 'bold',
  },
  projectName: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginVertical: spacing.md,
  },
  invitationDate: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  invitationActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    flex: 1,
    marginRight: spacing.sm,
    backgroundColor: constructionColors.complete,
  },
  rejectButton: {
    flex: 1,
    borderColor: constructionColors.urgent,
  },
});
