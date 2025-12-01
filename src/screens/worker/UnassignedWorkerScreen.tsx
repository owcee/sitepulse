import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button,
  Avatar,
  Surface,
  ActivityIndicator,
  Portal,
  Dialog
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme, constructionColors, spacing, fontSizes, softDarkOrange } from '../../utils/theme';
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
  const navigation = useNavigation();
  const [invitations, setInvitations] = useState<WorkerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogTitle, setDialogTitle] = useState('');
  const [pendingInvite, setPendingInvite] = useState<WorkerAssignment | null>(null);

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
    if (invite.isProjectSwitch && (user as any).projectId) {
      setPendingInvite(invite);
      setShowSwitchDialog(true);
      return;
    }

    // Regular acceptance (no existing project)
    setAccepting(true);
    try {
      await acceptAssignment(user.uid, invite.projectId);
      setDialogTitle('Invitation Accepted! 🎉');
      setDialogMessage(`You've joined ${invite.projectName}. Refreshing...`);
      setShowSuccessDialog(true);
    } catch (error: any) {
      setDialogTitle('Error');
      setDialogMessage(error.message || 'Failed to accept invitation');
      setShowErrorDialog(true);
    } finally {
      setAccepting(false);
    }
  };

  const handleSwitchProject = async () => {
    if (!pendingInvite) return;
    setShowSwitchDialog(false);
    setAccepting(true);
    try {
      await acceptAssignment(user.uid, pendingInvite.projectId);
      setDialogTitle('Project Switched! 🎉');
      setDialogMessage(`You've joined ${pendingInvite.projectName}. Refreshing...`);
      setShowSuccessDialog(true);
    } catch (error: any) {
      setDialogTitle('Error');
      setDialogMessage(error.message || 'Failed to accept invitation');
      setShowErrorDialog(true);
    } finally {
      setAccepting(false);
      setPendingInvite(null);
    }
  };

  const handleReject = async (invite: WorkerAssignment) => {
    setPendingInvite(invite);
    setShowRejectDialog(true);
  };

  const confirmReject = async () => {
    if (!pendingInvite) return;
    setShowRejectDialog(false);
    setRejecting(true);
    try {
      await rejectAssignment(user.uid);
      setDialogTitle('Invitation Rejected');
      setDialogMessage('You can be invited to other projects.');
      setShowSuccessDialog(true);
      loadInvitations();
    } catch (error: any) {
      setDialogTitle('Error');
      setDialogMessage(error.message || 'Failed to reject invitation');
      setShowErrorDialog(true);
    } finally {
      setRejecting(false);
      setPendingInvite(null);
    }
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
          <Avatar.Text
            size={80}
            label={user.name?.charAt(0).toUpperCase() || 'U'}
            style={styles.avatar}
            labelStyle={{ color: '#000000' }}
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
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  // @ts-ignore
                  navigation.navigate('Notifications');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={24} color={softDarkOrange} />
                <View style={styles.actionText}>
                  <Paragraph style={styles.actionTitle}>Check Notifications</Paragraph>
                  <Paragraph style={styles.actionDescription}>
                    Project assignment requests will appear here
                  </Paragraph>
                </View>
              </TouchableOpacity>
              
              <View style={styles.actionItem}>
                <Ionicons name="person-outline" size={24} color={softDarkOrange} />
                <View style={styles.actionText}>
                  <Paragraph style={styles.actionTitle}>Update Profile</Paragraph>
                  <Paragraph style={styles.actionDescription}>
                    Keep your information current and complete
                  </Paragraph>
                </View>
              </View>
              
              <View style={styles.actionItem}>
                <Ionicons name="chatbubbles-outline" size={24} color={softDarkOrange} />
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

      {/* Switch Project Dialog */}
      <Portal>
        <Dialog
          visible={showSwitchDialog}
          onDismiss={() => {
            setShowSwitchDialog(false);
            setPendingInvite(null);
          }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Switch Project?</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>
              You are currently assigned to another project. Accepting this invitation will switch you to "{pendingInvite?.projectName}".{'\n\n'}Do you want to continue?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowSwitchDialog(false);
                setPendingInvite(null);
              }}
              textColor={theme.colors.onSurfaceVariant}
            >
              Cancel
            </Button>
            <Button
              onPress={handleSwitchProject}
              textColor={theme.colors.primary}
              labelStyle={styles.dialogButtonText}
            >
              Switch Project
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => {
            setShowSuccessDialog(false);
            if (onRefresh) onRefresh();
          }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{dialogTitle}</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>{dialogMessage}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowSuccessDialog(false);
                if (onRefresh) onRefresh();
              }}
              textColor={theme.colors.primary}
              labelStyle={styles.dialogButtonText}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{dialogTitle}</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>{dialogMessage}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowErrorDialog(false)}
              textColor={theme.colors.primary}
              labelStyle={styles.dialogButtonText}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Reject Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showRejectDialog}
          onDismiss={() => {
            setShowRejectDialog(false);
            setPendingInvite(null);
          }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Reject Invitation</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>
              Are you sure you want to reject the invitation to {pendingInvite?.projectName}?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowRejectDialog(false);
                setPendingInvite(null);
              }}
              textColor={theme.colors.onSurfaceVariant}
            >
              Cancel
            </Button>
            <Button
              onPress={confirmReject}
              textColor={constructionColors.urgent}
              labelStyle={styles.dialogButtonText}
            >
              Reject
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#000000',
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
  dialog: {
    backgroundColor: '#000000',
    borderRadius: theme.roundness,
  },
  dialogTitle: {
    color: theme.colors.primary,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  dialogMessage: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
  },
  dialogButtonText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
});
