import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Card, 
  Title, 
  Paragraph
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { User } from '../../types';
import { theme, spacing, fontSizes } from '../../utils/theme';
import { signIn } from '../../services/authService';

interface Props {
  onLogin: (user: User) => void;
  onNavigateToSignUp: () => void;
}

export default function LoginScreen({ onLogin, onNavigateToSignUp }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🏗️</Text>
          </View>
          <Title style={styles.title} numberOfLines={1}>SitePulse</Title>
          <Paragraph style={styles.subtitle} numberOfLines={2}>
            Construction Task Monitoring
          </Paragraph>
        </View>

        {/* Login Form */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle} numberOfLines={1}>Welcome Back</Title>
            
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

            {/* Gmail Notice */}
            <View style={styles.gmailNotice}>
              <Text style={styles.gmailText} numberOfLines={2}>
                📧 Gmail only - secure auth
              </Text>
            </View>
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
    marginBottom: spacing.sm,
    color: theme.colors.primary,
  },
  roleInfo: {
    textAlign: 'center',
    fontSize: fontSizes.sm,
    color: theme.colors.secondary,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  loginButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  loginButtonContent: {
    paddingVertical: spacing.sm,
  },
  signUpButton: {
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


