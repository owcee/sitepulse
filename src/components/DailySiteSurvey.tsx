/**
 * SITEPULSE - Daily Site Survey Component
 * 
 * A modal component for engineers to submit daily site status reports.
 * This data feeds into the delay prediction model.
 * 
 * Dark mode styling matching the app's theme.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Title,
  Paragraph,
  Button,
  TextInput,
  Chip,
  ActivityIndicator,
  IconButton,
  Surface,
  Divider,
} from 'react-native-paper';

import { theme, constructionColors, spacing, fontSizes } from '../utils/theme';

// ============================================================================
// Types
// ============================================================================

interface Task {
  id: string;
  title: string;
  subTask?: string;
  status?: string;
}

interface TaskUpdate {
  status: 'productive' | 'non_productive';
  delayReason?: string;
  delayReasonOther?: string;
}

export interface SurveyData {
  projectId: string;
  date: string;
  engineerName: string;
  siteStatus: 'normal' | 'delayed' | 'closed';
  siteClosedReason?: string;
  siteClosedReasonOther?: string;
  taskUpdates: Record<string, TaskUpdate>;
}

// ============================================================================
// Constants
// ============================================================================

const SITE_CLOSED_REASONS = [
  'Weather Disruption',
  'Permit/Inspection Issue',
  'Material Delivery Failure',
  'Safety Hazard',
  'Holiday/No Work Scheduled',
  'Other'
];

const DELAY_REASONS = [
  'Bad Weather',
  'Material Delay',
  'Permit Issue',
  'Equipment Breakdown',
  'Manpower Shortage',
  'Safety/Hazard',
  'Other'
];

// ============================================================================
// Component: Daily Site Survey
// ============================================================================

interface DailySiteSurveyProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: SurveyData) => Promise<void>;
  onSkip?: () => void;
  engineerName: string;
  projectName: string;
  projectId: string;
  activeTasks: Task[];
}

export const DailySiteSurvey: React.FC<DailySiteSurveyProps> = ({
  isVisible,
  onClose,
  onSubmit,
  onSkip,
  engineerName,
  projectName,
  projectId,
  activeTasks
}) => {
  const [step, setStep] = useState<number>(1);
  const [siteStatus, setSiteStatus] = useState<'normal' | 'delayed' | 'closed' | null>(null);
  const [siteClosedReason, setSiteClosedReason] = useState<string | null>(null);
  const [siteClosedReasonOther, setSiteClosedReasonOther] = useState<string>('');
  const [taskUpdates, setTaskUpdates] = useState<Record<string, TaskUpdate>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset form when opening
  useEffect(() => {
    if (isVisible) {
      setStep(1);
      setSiteStatus(null);
      setSiteClosedReason(null);
      setSiteClosedReasonOther('');
      setTaskUpdates({});
    }
  }, [isVisible]);

  const handleSiteStatusSelect = (status: 'normal' | 'delayed' | 'closed') => {
    setSiteStatus(status);
    if (status === 'normal') {
      // If normal, all tasks are productive
      const updates: Record<string, TaskUpdate> = {};
      activeTasks.forEach(task => {
        updates[task.id] = { status: 'productive' };
      });
      setTaskUpdates(updates);
    } else if (status === 'closed') {
      // If closed, all tasks are non-productive
      const updates: Record<string, TaskUpdate> = {};
      activeTasks.forEach(task => {
        updates[task.id] = { status: 'non_productive' };
      });
      setTaskUpdates(updates);
    }
  };

  const handleTaskStatusChange = (taskId: string, isProductive: boolean) => {
    setTaskUpdates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        status: isProductive ? 'productive' : 'non_productive',
        delayReason: isProductive ? undefined : prev[taskId]?.delayReason
      }
    }));
  };

  const handleTaskDelayReasonChange = (taskId: string, reason: string) => {
    setTaskUpdates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        delayReason: reason
      }
    }));
  };

  const handleSubmit = async () => {
    if (!siteStatus) return;

    if (siteStatus === 'closed' && !siteClosedReason) return;

    if (siteStatus === 'delayed') {
      const missingReason = activeTasks.some(task => {
        const update = taskUpdates[task.id];
        return update?.status === 'non_productive' && !update.delayReason;
      });
      if (missingReason) return;
    }

    setIsSubmitting(true);

    try {
      const surveyData: SurveyData = {
        projectId,
        date: new Date().toISOString(),
        engineerName,
        siteStatus,
        siteClosedReason: siteClosedReason || undefined,
        siteClosedReasonOther: siteClosedReasonOther || undefined,
        taskUpdates
      };

      await onSubmit(surveyData);
      onClose();
    } catch (error) {
      console.error('Survey submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    onClose();
  };

  const renderStep1_Overview = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Title style={styles.sectionTitle}>Project Overview</Title>
      
      <Surface style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Project:</Text>
          <Text style={styles.value}>{projectName}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{new Date().toLocaleDateString()}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Engineer:</Text>
          <Text style={styles.value}>{engineerName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Active Tasks:</Text>
          <Text style={styles.value}>{activeTasks.length}</Text>
        </View>
      </Surface>

      <Title style={styles.sectionTitle}>Overall Site Status Today</Title>
      
      <TouchableOpacity 
        style={[styles.optionButton, siteStatus === 'normal' && styles.optionSelected]}
        onPress={() => handleSiteStatusSelect('normal')}
      >
        <View style={styles.optionContent}>
          <Text style={styles.optionEmoji}>✅</Text>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionText, siteStatus === 'normal' && styles.optionTextSelected]}>
              All Tasks Proceeding Normally
            </Text>
            <Text style={styles.optionSubtext}>All active tasks = productive work days</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.optionButton, siteStatus === 'delayed' && styles.optionSelectedWarning]}
        onPress={() => handleSiteStatusSelect('delayed')}
      >
        <View style={styles.optionContent}>
          <Text style={styles.optionEmoji}>⚠️</Text>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionText, siteStatus === 'delayed' && styles.optionTextSelectedWarning]}>
              Some Tasks are Delayed
            </Text>
            <Text style={styles.optionSubtext}>Only affected tasks = non-productive days</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.optionButton, siteStatus === 'closed' && styles.optionSelectedDanger]}
        onPress={() => handleSiteStatusSelect('closed')}
      >
        <View style={styles.optionContent}>
          <Text style={styles.optionEmoji}>🛑</Text>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionText, siteStatus === 'closed' && styles.optionTextSelectedDanger]}>
              Site Closed
            </Text>
            <Text style={styles.optionSubtext}>All tasks = non-productive days</Text>
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep2_SiteClosed = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Title style={styles.sectionTitle}>Reason for Site Closure</Title>
      <Paragraph style={styles.description}>
        This will affect all {activeTasks.length} active task(s).
      </Paragraph>

      {SITE_CLOSED_REASONS.map(reason => (
        <TouchableOpacity
          key={reason}
          style={[styles.radioOption, siteClosedReason === reason && styles.radioOptionSelected]}
          onPress={() => setSiteClosedReason(reason)}
        >
          <View style={[styles.radioCircle, siteClosedReason === reason && styles.radioCircleSelected]}>
            {siteClosedReason === reason && <View style={styles.radioInner} />}
          </View>
          <Text style={styles.radioText}>{reason}</Text>
        </TouchableOpacity>
      ))}

      {siteClosedReason === 'Other' && (
        <TextInput
          mode="outlined"
          style={styles.input}
          placeholder="Please specify..."
          placeholderTextColor={theme.colors.placeholder}
          value={siteClosedReasonOther}
          onChangeText={setSiteClosedReasonOther}
          outlineColor={theme.colors.disabled}
          activeOutlineColor={theme.colors.primary}
          textColor={theme.colors.text}
        />
      )}
    </ScrollView>
  );

  const renderStep2_TaskDetails = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Title style={styles.sectionTitle}>Task Status Updates</Title>
      <Paragraph style={styles.description}>
        Toggle OFF for tasks that were non-productive today, then select a reason.
      </Paragraph>

      {activeTasks.map(task => {
        const update = taskUpdates[task.id] || { status: 'productive' };
        const isProductive = update.status === 'productive';

        return (
          <Surface key={task.id} style={styles.taskCard}>
            <Text style={styles.taskName}>{task.title}</Text>
            {task.subTask && (
              <Text style={styles.taskSubtask}>{task.subTask}</Text>
            )}
            
            <View style={styles.switchContainer}>
              <Text style={isProductive ? styles.statusProductive : styles.statusNonProductive}>
                {isProductive ? '✓ Productive Day' : '✗ Non-Productive Day'}
              </Text>
              <Switch
                value={isProductive}
                onValueChange={(val) => handleTaskStatusChange(task.id, val)}
                trackColor={{ 
                  false: constructionColors.urgent + '80', 
                  true: constructionColors.complete + '80' 
                }}
                thumbColor={isProductive ? constructionColors.complete : constructionColors.urgent}
              />
            </View>

            {!isProductive && (
              <View style={styles.delayReasonContainer}>
                <Text style={styles.delayReasonLabel}>Delay Reason:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                  {DELAY_REASONS.map(reason => (
                    <Chip
                      key={reason}
                      selected={update.delayReason === reason}
                      onPress={() => handleTaskDelayReasonChange(task.id, reason)}
                      style={[
                        styles.chip,
                        update.delayReason === reason && styles.chipSelected
                      ]}
                      textStyle={[
                        styles.chipText,
                        update.delayReason === reason && styles.chipTextSelected
                      ]}
                      mode="flat"
                    >
                      {reason}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
            )}
          </Surface>
        );
      })}
    </ScrollView>
  );

  const canProceed = () => {
    if (step === 1) {
      return !!siteStatus;
    }
    if (step === 2 && siteStatus === 'closed') {
      return !!siteClosedReason;
    }
    if (step === 2 && siteStatus === 'delayed') {
      // Check if all non-productive tasks have a reason
      return !activeTasks.some(task => {
        const update = taskUpdates[task.id];
        return update?.status === 'non_productive' && !update.delayReason;
      });
    }
    return true;
  };

  return (
    <Portal>
      <Modal
        visible={isVisible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <IconButton
                icon="clipboard-text"
                size={24}
                iconColor={theme.colors.primary}
              />
              <Title style={styles.headerTitle}>Daily Site Survey</Title>
            </View>
            <IconButton
              icon="close"
              size={24}
              iconColor={theme.colors.onSurfaceVariant}
              onPress={handleSkip}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Content */}
          {step === 1 && renderStep1_Overview()}
          {step === 2 && siteStatus === 'closed' && renderStep2_SiteClosed()}
          {step === 2 && siteStatus === 'delayed' && renderStep2_TaskDetails()}

          <Divider style={styles.divider} />

          {/* Footer */}
          <View style={styles.footer}>
            {step === 2 && (
              <Button
                mode="outlined"
                onPress={() => {
                  setStep(1);
                  setSiteStatus(null);
                }}
                style={styles.backButton}
                textColor={theme.colors.onSurfaceVariant}
              >
                Back
              </Button>
            )}
            
            {step === 1 && (
              <Button
                mode="text"
                onPress={handleSkip}
                style={styles.skipButton}
                textColor={theme.colors.onSurfaceVariant}
              >
                Skip for Today
              </Button>
            )}
            
            <Button
              mode="contained"
              onPress={() => {
                if (step === 1) {
                  if (siteStatus === 'normal') {
                    handleSubmit();
                  } else {
                    setStep(2);
                  }
                } else {
                  handleSubmit();
                }
              }}
              disabled={!canProceed() || isSubmitting}
              loading={isSubmitting}
              style={styles.nextButton}
              buttonColor={theme.colors.primary}
            >
              {step === 1 && siteStatus !== 'normal' ? 'Next' : 'Submit Survey'}
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    maxHeight: '90%',
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: spacing.xs,
  },
  divider: {
    backgroundColor: '#2A2A2A',
  },
  content: {
    padding: spacing.md,
    maxHeight: 450,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    color: theme.colors.text,
  },
  infoCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  label: {
    width: 100,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
    fontSize: fontSizes.sm,
  },
  value: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '500',
    fontSize: fontSizes.sm,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: theme.roundness,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.background,
  },
  optionSelected: {
    borderColor: constructionColors.complete,
    backgroundColor: constructionColors.complete + '15',
  },
  optionSelectedWarning: {
    borderColor: constructionColors.warning,
    backgroundColor: constructionColors.warning + '15',
  },
  optionSelectedDanger: {
    borderColor: constructionColors.urgent,
    backgroundColor: constructionColors.urgent + '15',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  optionTextSelected: {
    color: constructionColors.complete,
  },
  optionTextSelectedWarning: {
    color: constructionColors.warning,
  },
  optionTextSelectedDanger: {
    color: constructionColors.urgent,
  },
  optionSubtext: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
  },
  description: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: theme.roundness,
    marginBottom: spacing.xs,
  },
  radioOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.disabled,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  radioText: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
  },
  input: {
    marginTop: spacing.md,
    backgroundColor: theme.colors.background,
  },
  taskCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
  },
  taskName: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  taskSubtask: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusProductive: {
    color: constructionColors.complete,
    fontWeight: '600',
    fontSize: fontSizes.sm,
  },
  statusNonProductive: {
    color: constructionColors.urgent,
    fontWeight: '600',
    fontSize: fontSizes.sm,
  },
  delayReasonContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  delayReasonLabel: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
  },
  chip: {
    marginRight: spacing.sm,
    backgroundColor: '#2A2A2A',
    marginBottom: spacing.xs,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: fontSizes.xs,
    color: theme.colors.onSurfaceVariant,
  },
  chipTextSelected: {
    color: 'white',
  },
  backButton: {
    borderColor: theme.colors.disabled,
  },
  skipButton: {
    marginRight: 'auto',
  },
  nextButton: {
    minWidth: 120,
  },
});

export default DailySiteSurvey;

