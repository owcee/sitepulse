import React, { useState } from 'react';
import { View, StyleSheet, Alert, Image, ScrollView } from 'react-native';
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
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
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
    fontSize: fontSizes.xxxl,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 3,
    textShadowColor: 'rgba(255, 107, 53, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  card: {
    elevation: 4,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
    color: theme.colors.text,
    fontSize: fontSizes.xl,
  },
  roleSection: {
    marginBottom: spacing.md,
  },
  roleLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
    color: theme.colors.text,
  },
  roleButtons: {
    marginBottom: spacing.sm,
  },
  input: {
    marginBottom: spacing.sm,
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
});
