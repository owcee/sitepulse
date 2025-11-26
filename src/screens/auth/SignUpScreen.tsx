import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Card, 
  Title, 
  Paragraph,
  SegmentedButtons 
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
  const [role, setRole] = useState<'engineer' | 'worker'>('worker');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return false;
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
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
      Alert.alert(
        'Account Created Successfully! 🎉', 
        `Welcome to SitePulse, ${userData.name}!\n\nYour account has been created. Please sign in with your new credentials to continue.`,
        [
          {
            text: 'Sign In Now',
            onPress: () => {
              onBackToLogin();
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
      // Reset flag on error
      onSignUpComplete?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🏗️</Text>
          </View>
          <Title style={styles.title}>Join SitePulse</Title>
          <Paragraph style={styles.subtitle}>
            Create your construction management account
          </Paragraph>
        </View>

        {/* Sign Up Form */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Create Account</Title>
            
            {/* Role Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.roleLabel}>I am a:</Text>
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
              secureTextEntry
              style={styles.input}
              placeholder="At least 6 characters"
            />

            {/* Confirm Password Input */}
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              placeholder="Re-enter your password"
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
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: fontSizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
    textAlign: 'center',
  },
  card: {
    elevation: 4,
    borderRadius: theme.roundness,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: theme.colors.primary,
  },
  roleSection: {
    marginBottom: spacing.lg,
  },
  roleLabel: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
    color: theme.colors.text,
  },
  roleButtons: {
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  signUpButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  signUpButtonContent: {
    paddingVertical: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  gmailNotice: {
    backgroundColor: '#E8F5E8',
    padding: spacing.md,
    borderRadius: theme.roundness,
    alignItems: 'center',
  },
  gmailText: {
    fontSize: fontSizes.sm,
    color: '#2E7D32',
    fontWeight: '500',
    textAlign: 'center',
  },
});
