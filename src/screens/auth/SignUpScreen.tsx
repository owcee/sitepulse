import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Card, 
  Title, 
  Paragraph,
  SegmentedButtons,
  Portal,
  Dialog
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { User } from '../../types';
import { theme, spacing, fontSizes } from '../../utils/theme';
import { signUp } from '../../services/authService';

interface Props {
  onSignUp: (user: User) => void;
  onBackToLogin: () => void;
  onSignUpStart?: () => void;
  onSignUpComplete?: () => void;
}

export default function SignUpScreen({ onSignUp, onBackToLogin, onSignUpStart, onSignUpComplete }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<'engineer' | 'worker'>('worker');
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [successUserName, setSuccessUserName] = useState('');

  const validateForm = () => {
    if (!name.trim()) {
      setDialogMessage('Please enter your full name');
      setShowValidationDialog(true);
      return false;
    }
    if (!email.trim()) {
      setDialogMessage('Please enter your email address');
      setShowValidationDialog(true);
      return false;
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setDialogMessage('Please enter a valid email address');
      setShowValidationDialog(true);
      return false;
    }
    if (password.length < 6) {
      setDialogMessage('Password must be at least 6 characters long');
      setShowValidationDialog(true);
      return false;
    }
    if (password !== confirmPassword) {
      setDialogMessage('Passwords do not match');
      setShowValidationDialog(true);
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    // Notify parent that sign-up is starting (to prevent navigation flash)
    onSignUpStart?.();
    
    try {
      const userData = await signUp(email, password, {
        name: name.trim(),
        role,
        projectId: null // No default project - engineer creates, worker gets invited
      }) as User;

      // Sign out immediately after signup (since signUp auto-logs in)
      // This must happen BEFORE showing alert to prevent navigation flash
      const { signOutUser } = require('../../services/authService');
      await signOutUser();

      // Clear form
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRole('worker');

      // Small delay to ensure sign-out state has propagated
      await new Promise(resolve => setTimeout(resolve, 200));

      // Notify parent that sign-up is complete
      onSignUpComplete?.();

      // Show success message after sign-out
      setSuccessUserName(userData.name);
      setShowSuccessDialog(true);
    } catch (error: any) {
      setDialogMessage(error.message);
      setShowErrorDialog(true);
      // Reset flag on error
      onSignUpComplete?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Logo and Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../assets/sitepulse-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.titleContainer}>
            <View style={styles.titleAccent} />
            <Title style={styles.title} numberOfLines={1} adjustsFontSizeToFit>SITEPULSE</Title>
            <View style={styles.titleAccent} />
          </View>
          <Paragraph style={styles.subtitle}>
            Create your construction account
          </Paragraph>
        </View>

        {/* Sign Up Form */}
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            {/* Role Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.roleLabel} numberOfLines={2}>I am a:</Text>
              <SegmentedButtons
                value={role}
                onValueChange={(value) => setRole(value as 'engineer' | 'worker')}
                buttons={[
                  {
                    value: 'engineer',
                    label: 'Engineer/PM',
                    icon: 'account-tie',
                  },
                  {
                    value: 'worker',
                    label: 'Worker',
                    icon: 'hard-hat',
                  },
                ]}
                style={styles.roleButtons}
                density="medium"
              />
            </View>

            {/* Full Name Input */}
            <TextInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              autoCapitalize="words"
              style={styles.input}
              placeholder="Enter your full name"
            />

            {/* Email Input */}
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholder="your.email@example.com"
              right={<TextInput.Icon icon="email" />}
            />

            {/* Password Input */}
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              placeholder="At least 6 characters"
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            {/* Confirm Password Input */}
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry={!showConfirmPassword}
              style={styles.input}
              placeholder="Re-enter your password"
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
            />

            {/* Sign Up Button */}
            <Button
              mode="contained"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
              style={styles.signUpButton}
              contentStyle={styles.signUpButtonContent}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            {/* Back to Login */}
            <Button
              mode="text"
              onPress={onBackToLogin}
              disabled={loading}
              style={styles.backButton}
            >
              Already have an account? Sign In
            </Button>
          </Card.Content>
        </Card>
      </View>

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => {
            setShowSuccessDialog(false);
            onBackToLogin();
          }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            Account Created Successfully! 🎉
          </Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>
              Welcome to SitePulse, {successUserName}!
            </Paragraph>
            <Paragraph style={styles.dialogMessage}>
              Your account has been created. Please sign in with your new credentials to continue.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowSuccessDialog(false);
                onBackToLogin();
              }}
              textColor={theme.colors.primary}
              labelStyle={styles.dialogButtonText}
            >
              Sign In Now
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
          <Dialog.Title style={styles.dialogTitle}>Sign Up Failed</Dialog.Title>
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

      {/* Validation Dialog */}
      <Portal>
        <Dialog
          visible={showValidationDialog}
          onDismiss={() => setShowValidationDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Validation Error</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogMessage}>{dialogMessage}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowValidationDialog(false)}
              textColor={theme.colors.primary}
              labelStyle={styles.dialogButtonText}
            >
              OK
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
    width: '100%',
  },
  titleAccent: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.primary,
    marginHorizontal: spacing.md,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 3,
    textShadowColor: 'rgba(255, 107, 53, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  card: {
    elevation: 4,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    marginBottom: spacing.xl,
  },
  cardContent: {
    paddingVertical: spacing.sm,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: theme.colors.text,
    fontSize: fontSizes.sm,
  },
  roleSection: {
    marginBottom: spacing.lg,
  },
  roleLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '400',
    marginBottom: spacing.xs,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  roleButtons: {
    marginBottom: 0,
  },
  input: {
    marginBottom: spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  signUpButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.primary,
  },
  signUpButtonContent: {
    paddingVertical: spacing.xs,
  },
  backButton: {
    marginBottom: spacing.sm,
  },
  gmailNotice: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: spacing.md,
    borderRadius: theme.roundness,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  gmailText: {
    fontSize: fontSizes.sm,
    color: theme.colors.success,
    fontWeight: '500',
    textAlign: 'center',
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
