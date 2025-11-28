import React, { useState } from 'react';
import { View, StyleSheet, Alert, Image } from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Card, 
  Title, 
  Paragraph,
  Modal,
  Portal,
  Surface
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { User } from '../../types';
import { theme, spacing, fontSizes } from '../../utils/theme';
import { signIn, resetPassword } from '../../services/authService';

interface Props {
  onLogin: (user: User) => void;
  onNavigateToSignUp: () => void;
}

export default function LoginScreen({ onLogin, onNavigateToSignUp }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return;
    }
    if (!email.includes('@gmail.com')) {
      Alert.alert('Validation Error', 'Please use a Gmail address (@gmail.com)');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    
    try {
      const userData = await signIn(email, password);
      onLogin(userData);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return;
    }
    if (!forgotPasswordEmail.includes('@gmail.com')) {
      Alert.alert('Validation Error', 'Please use a Gmail address (@gmail.com)');
      return;
    }

    setForgotPasswordLoading(true);
    
    try {
      await resetPassword(forgotPasswordEmail);
      Alert.alert(
        'Password Reset Email Sent',
        'Please check your email for instructions to reset your password.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowForgotPassword(false);
              setForgotPasswordEmail('');
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setForgotPasswordLoading(false);
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
          <Paragraph style={styles.subtitle} numberOfLines={2}>
            Construction Task Monitoring
          </Paragraph>
        </View>

        {/* Login Form */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle} numberOfLines={1}>Welcome</Title>
            
            <Paragraph style={styles.roleInfo} numberOfLines={2}>
              Your role is detected automatically
            </Paragraph>

            {/* Gmail Input */}
            <TextInput
              label="Gmail Address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholder="your.name@gmail.com"
              right={<TextInput.Icon icon="gmail" />}
            />

            {/* Password Input */}
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              placeholder="Enter your password"
            />

            {/* Forgot Password Link */}
            <Button
              mode="text"
              onPress={() => setShowForgotPassword(true)}
              disabled={loading}
              style={styles.forgotPasswordButton}
              textColor={theme.colors.primary}
            >
              Forgot Password?
            </Button>

            {/* Login Button */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

            {/* Sign Up Link */}
            <Button
              mode="text"
              onPress={onNavigateToSignUp}
              disabled={loading}
              style={styles.signUpButton}
            >
              Don't have an account? Sign Up
            </Button>
          </Card.Content>
        </Card>
      </View>

      {/* Forgot Password Modal */}
      <Portal>
        <Modal
          visible={showForgotPassword}
          onDismiss={() => {
            setShowForgotPassword(false);
            setForgotPasswordEmail('');
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <Title style={styles.modalTitle}>Reset Password</Title>
            <Paragraph style={styles.modalSubtitle}>
              Enter your email address and we'll send you instructions to reset your password.
            </Paragraph>

            <TextInput
              label="Gmail Address"
              value={forgotPasswordEmail}
              onChangeText={setForgotPasswordEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.modalInput}
              placeholder="your.name@gmail.com"
              right={<TextInput.Icon icon="gmail" />}
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                }}
                disabled={forgotPasswordLoading}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleForgotPassword}
                loading={forgotPasswordLoading}
                disabled={forgotPasswordLoading}
                style={styles.sendButton}
              >
                Send Reset Link
              </Button>
            </View>
          </Surface>
        </Modal>
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
    paddingTop: spacing.xxl * 1.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
    marginTop: spacing.xl,
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
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
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
  cardTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: theme.colors.text,
  },
  roleInfo: {
    textAlign: 'center',
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  loginButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  loginButtonContent: {
    paddingVertical: spacing.sm,
  },
  signUpButton: {
    marginBottom: spacing.lg,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalSurface: {
    width: '90%',
    maxWidth: 400,
    padding: spacing.lg,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    elevation: 4,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
  },
});


