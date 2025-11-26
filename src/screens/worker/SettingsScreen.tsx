import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Avatar, 
  List, 
  Divider, 
  Button,
  IconButton,
  TextInput,
  Switch,
  Modal,
  Portal,
  Surface
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { User, Worker } from '../../types';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { getCurrentUser, signOutUser } from '../../services/authService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function SettingsScreen() {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Edit Profile Form
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Load user profile from Firestore
  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const user = await getCurrentUser() as User | null;
        if (user) {
          setUserProfile(user);
          setProfileName(user.name || '');
          setProfileEmail(user.email || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);
  
  // Change Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = async () => {
    if (!profileName.trim() || !profileEmail.trim()) {
      Alert.alert('Error', 'Please fill in name and email.');
      return;
    }

    if (!userProfile?.uid) {
      Alert.alert('Error', 'User not found. Please try again.');
      return;
    }

    try {
      // Determine which collection to update based on user role
      const collection = userProfile.role === 'engineer' ? 'engineer accounts' : 'worker accounts';
      
      await updateDoc(doc(db, collection, userProfile.uid), {
        name: profileName.trim(),
        email: profileEmail.trim(),
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      setUserProfile({
        ...userProfile,
        name: profileName.trim(),
        email: profileEmail.trim(),
      });

      Alert.alert('Success', 'Profile updated successfully!');
      setEditProfileVisible(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    // Simulate API call
    setTimeout(() => {
      Alert.alert('Success', 'Password changed successfully!');
      setChangePasswordVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1000);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutUser();
              // The auth state change will automatically redirect to login screen
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Paragraph>Loading profile...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Title style={styles.screenTitle}>Settings</Title>
          <Paragraph style={styles.subtitle}>
            Manage your profile and app preferences
          </Paragraph>
        </View>

        {/* Profile Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Worker Profile</Title>
            
            <View style={styles.profileHeader}>
              <Avatar.Image 
                size={80} 
                source={{ uri: userProfile?.profileImage || 'https://via.placeholder.com/150' }} 
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Title style={styles.name}>{userProfile?.name || 'Loading...'}</Title>
                <Paragraph style={styles.email}>{userProfile?.email || ''}</Paragraph>
                <Paragraph style={styles.role}>Construction Worker</Paragraph>
              </View>
            </View>
            
            <Button 
              mode="outlined" 
              onPress={() => setEditProfileVisible(true)}
              style={styles.editProfileButton}
            >
              Edit Profile
            </Button>
          </Card.Content>
        </Card>

        {/* Account Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Account</Title>
            
            <List.Item
              title="Change Password"
              description="Update your account password"
              left={() => <List.Icon icon="lock" color={theme.colors.primary} />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => setChangePasswordVisible(true)}
              style={styles.settingsItem}
            />
            
            <Divider />
            
          </Card.Content>
        </Card>

        {/* Notification Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Notifications</Title>
            
            <List.Item
              title="Enable Notifications"
              description="Receive app notifications"
              left={() => <List.Icon icon="bell" color={theme.colors.primary} />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                />
              )}
              style={styles.settingsItem}
            />
            
            <Divider />
            
          </Card.Content>
        </Card>


        {/* Support */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Support & Legal</Title>
            
            <List.Item
              title="Privacy Policy"
              description="Read our privacy policy"
              left={() => <List.Icon icon="shield-check" color={theme.colors.primary} />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => Alert.alert('Privacy Policy', 'Privacy policy would be opened here.')}
              style={styles.settingsItem}
            />
            
            <Divider />
            
            <List.Item
              title="Terms of Service"
              description="Read our terms of service"
              left={() => <List.Icon icon="file-document" color={theme.colors.primary} />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => Alert.alert('Terms of Service', 'Terms of service would be opened here.')}
              style={styles.settingsItem}
            />
            
            <Divider />
            
            <List.Item
              title="App Version"
              description="SitePulse v2.1.4"
              left={() => <List.Icon icon="information" color={theme.colors.primary} />}
              style={styles.settingsItem}
            />
          </Card.Content>
        </Card>

        {/* Logout */}
        <Card style={[styles.card, styles.logoutCard]}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={handleLogout}
              icon="logout"
              style={styles.logoutButton}
              contentStyle={styles.logoutButtonContent}
            >
              Logout
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Portal>
        <Modal
          visible={editProfileVisible}
          onDismiss={() => setEditProfileVisible(false)}
          contentContainerStyle={styles.innerModalContainer}
        >
          <Surface style={styles.modalSurface}>
            <Title style={styles.modalTitle}>Edit Profile</Title>
            
            <TextInput
              label="Full Name *"
              value={profileName}
              onChangeText={setProfileName}
              style={styles.modalInput}
              mode="outlined"
            />
            
            <TextInput
              label="Email *"
              value={profileEmail}
              onChangeText={setProfileEmail}
              keyboardType="email-address"
              style={styles.modalInput}
              mode="outlined"
            />
            
            
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setEditProfileVisible(false)}
                style={styles.modalCancelButton}
              >
                Cancel
              </Button>
              
              <Button
                mode="contained"
                onPress={handleSaveProfile}
                style={styles.modalSaveButton}
              >
                Save
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* Change Password Modal */}
      <Portal>
        <Modal
          visible={changePasswordVisible}
          onDismiss={() => setChangePasswordVisible(false)}
          contentContainerStyle={styles.innerModalContainer}
        >
          <Surface style={styles.modalSurface}>
            <Title style={styles.modalTitle}>Change Password</Title>
            
            <TextInput
              label="Current Password *"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              style={styles.modalInput}
              mode="outlined"
            />
            
            <TextInput
              label="New Password *"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              style={styles.modalInput}
              mode="outlined"
            />
            
            <TextInput
              label="Confirm New Password *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.modalInput}
              mode="outlined"
            />
            
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setChangePasswordVisible(false)}
                style={styles.modalCancelButton}
              >
                Cancel
              </Button>
              
              <Button
                mode="contained"
                onPress={handleChangePassword}
                style={styles.modalSaveButton}
              >
                Change Password
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
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  screenTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: theme.colors.placeholder,
  },
  card: {
    margin: spacing.md,
    elevation: 2,
    borderRadius: theme.roundness,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: fontSizes.md,
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  role: {
    fontSize: fontSizes.sm,
    color: constructionColors.complete,
    fontWeight: '500',
  },
  phone: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
  },
  editProfileButton: {
    marginTop: spacing.sm,
  },
  settingsItem: {
    paddingVertical: spacing.xs,
  },
  logoutCard: {
    marginBottom: spacing.xl,
  },
  logoutButton: {
    backgroundColor: constructionColors.urgent,
  },
  logoutButtonContent: {
    paddingVertical: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    marginTop: 40,
    marginHorizontal: 16,
    marginBottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  innerModalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalSurface: {
    padding: spacing.lg,
    borderRadius: theme.roundness,
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
});



