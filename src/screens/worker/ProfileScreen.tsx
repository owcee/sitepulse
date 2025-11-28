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
  Chip,
  ProgressBar,
  Badge 
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { User, Worker } from '../../types';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';

// Mock worker profile data
const mockWorkerProfile: Worker & User = {
  id: 'worker-2',
  name: 'Mike Johnson',
  email: 'mike.johnson@sitepulse.com',
  role: 'worker',
  projectId: 'project-1',
  hourlyRate: 35,
  hoursWorked: 168,
  totalPay: 5880,
  contactInfo: '+1 (555) 123-4567',
  profileImage: 'https://via.placeholder.com/150',
};

// Mock additional profile data
const mockProfileData = {
  joinDate: '2023-08-15',
  specialties: ['Concrete Work', 'General Construction', 'Site Safety'],
  certifications: [
    { name: 'OSHA 30-Hour', issued: '2023-07-01', expires: '2026-07-01' },
    { name: 'Forklift Operator', issued: '2023-09-15', expires: '2025-09-15' },
    { name: 'First Aid/CPR', issued: '2024-01-10', expires: '2026-01-10' },
  ],
  recentAchievements: [
    { title: 'Perfect Safety Record', description: '6 months without incidents', date: '2024-01-01' },
    { title: 'Quality Work Award', description: 'Excellent concrete work on Building A', date: '2023-12-15' },
    { title: 'Team Player', description: 'Helped train 2 new workers', date: '2023-11-30' },
  ],
  projectStats: {
    totalProjects: 12,
    completedTasks: 89,
    approvalRate: 0.94,
    averageRating: 4.7,
  },
  emergencyContact: {
    name: 'Sarah Johnson',
    relationship: 'Spouse',
    phone: '+1 (555) 987-6543',
  },
  supervisor: {
    name: 'John Engineer',
    email: 'john@sitepulse.com',
    phone: '+1 (555) 456-7890',
  },
};

export default function ProfileScreen() {
  const [showEmergencyContact, setShowEmergencyContact] = useState(false);

  const handleEditProfile = () => {
    Alert.alert(
      'Edit Profile',
      'Profile editing would open a dedicated form in a real application.',
      [{ text: 'OK' }]
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Password change form would be implemented here.',
      [{ text: 'OK' }]
    );
  };

  const handleContactSupervisor = () => {
    Alert.alert(
      'Contact Supervisor',
      `Would you like to call or email ${mockProfileData.supervisor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => console.log('Calling supervisor') },
        { text: 'Email', onPress: () => console.log('Emailing supervisor') },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCertificationStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: constructionColors.urgent };
    if (daysUntilExpiry <= 30) return { status: 'expiring', color: constructionColors.warning };
    return { status: 'valid', color: constructionColors.complete };
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Title style={styles.screenTitle}>My Profile</Title>
        <IconButton
          icon="cog"
          size={24}
          iconColor={theme.colors.primary}
          onPress={handleEditProfile}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <Avatar.Image 
                size={80} 
                source={{ uri: mockWorkerProfile.profileImage }}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Title style={styles.name}>{mockWorkerProfile.name}</Title>
                <Paragraph style={styles.email}>{mockWorkerProfile.email}</Paragraph>
                <Paragraph style={styles.phone}>{mockWorkerProfile.contactInfo}</Paragraph>
                
                <View style={styles.profileChips}>
                  <Chip 
                    icon="account-hard-hat" 
                    style={styles.roleChip}
                    textStyle={{ color: 'white' }}
                  >
                    Construction Worker
                  </Chip>
                </View>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Paragraph style={styles.statNumber}>{mockWorkerProfile.hoursWorked}</Paragraph>
                <Paragraph style={styles.statLabel}>Hours This Month</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statNumber}>₱{mockWorkerProfile.hourlyRate}</Paragraph>
                <Paragraph style={styles.statLabel}>Hourly Rate</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Paragraph style={styles.statNumber}>{mockProfileData.projectStats.completedTasks}</Paragraph>
                <Paragraph style={styles.statLabel}>Tasks Completed</Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Work Summary Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Work Summary</Title>
            
            <View style={styles.workSummary}>
              <View style={styles.summaryRow}>
                <Paragraph style={styles.summaryLabel}>Join Date:</Paragraph>
                <Paragraph style={styles.summaryValue}>{formatDate(mockProfileData.joinDate)}</Paragraph>
              </View>
              
              <View style={styles.summaryRow}>
                <Paragraph style={styles.summaryLabel}>Total Projects:</Paragraph>
                <Paragraph style={styles.summaryValue}>{mockProfileData.projectStats.totalProjects}</Paragraph>
              </View>
              
              <View style={styles.summaryRow}>
                <Paragraph style={styles.summaryLabel}>Approval Rate:</Paragraph>
                <View style={styles.approvalRate}>
                  <Paragraph style={styles.summaryValue}>
                    {Math.round(mockProfileData.projectStats.approvalRate * 100)}%
                  </Paragraph>
                  <ProgressBar 
                    progress={mockProfileData.projectStats.approvalRate} 
                    color={constructionColors.complete}
                    style={styles.progressBar}
                  />
                </View>
              </View>
              
              <View style={styles.summaryRow}>
                <Paragraph style={styles.summaryLabel}>Average Rating:</Paragraph>
                <View style={styles.rating}>
                  <Paragraph style={styles.summaryValue}>{mockProfileData.projectStats.averageRating}</Paragraph>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <IconButton
                        key={star}
                        icon={star <= mockProfileData.projectStats.averageRating ? 'star' : 'star-outline'}
                        size={16}
                        iconColor={constructionColors.warning}
                        style={styles.star}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Specialties Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Specialties</Title>
            
            <View style={styles.specialties}>
              {mockProfileData.specialties.map((specialty, index) => (
                <Chip 
                  key={index}
                  icon="hammer"
                  style={styles.specialtyChip}
                  textStyle={styles.specialtyText}
                >
                  {specialty}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Certifications Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.certificationsHeader}>
              <Title style={styles.cardTitle}>Certifications</Title>
              <IconButton icon="certificate" size={20} iconColor={theme.colors.primary} />
            </View>
            
            {mockProfileData.certifications.map((cert, index) => {
              const status = getCertificationStatus(cert.expires);
              
              return (
                <View key={index}>
                  <List.Item
                    title={cert.name}
                    description={`Issued: ${formatDate(cert.issued)} • Expires: ${formatDate(cert.expires)}`}
                    left={() => (
                      <List.Icon 
                        icon="certificate" 
                        color={status.color}
                      />
                    )}
                    right={() => (
                      <Badge 
                        style={[styles.certBadge, { backgroundColor: status.color }]}
                      >
                        {status.status.toUpperCase()}
                      </Badge>
                    )}
                    titleStyle={styles.certTitle}
                    descriptionStyle={styles.certDescription}
                  />
                  {index < mockProfileData.certifications.length - 1 && <Divider />}
                </View>
              );
            })}
          </Card.Content>
        </Card>

        {/* Recent Achievements Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.achievementsHeader}>
              <Title style={styles.cardTitle}>Recent Achievements</Title>
              <IconButton icon="trophy" size={20} iconColor={constructionColors.warning} />
            </View>
            
            {mockProfileData.recentAchievements.map((achievement, index) => (
              <View key={index}>
                <List.Item
                  title={achievement.title}
                  description={achievement.description}
                  left={() => (
                    <List.Icon 
                      icon="trophy" 
                      color={constructionColors.warning}
                    />
                  )}
                  right={() => (
                    <Paragraph style={styles.achievementDate}>
                      {formatDate(achievement.date)}
                    </Paragraph>
                  )}
                  titleStyle={styles.achievementTitle}
                  descriptionStyle={styles.achievementDescription}
                />
                {index < mockProfileData.recentAchievements.length - 1 && <Divider />}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Contact Information Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Contact Information</Title>
            
            {/* Supervisor Contact */}
            <List.Item
              title="Supervisor"
              description={`${mockProfileData.supervisor.name} • ${mockProfileData.supervisor.email}`}
              left={() => <List.Icon icon="account-tie" color={theme.colors.primary} />}
              right={() => (
                <IconButton
                  icon="phone"
                  size={20}
                  iconColor={theme.colors.primary}
                  onPress={handleContactSupervisor}
                />
              )}
              titleStyle={styles.contactTitle}
              descriptionStyle={styles.contactDescription}
              onPress={handleContactSupervisor}
            />

            <Divider />

            {/* Emergency Contact */}
            <List.Item
              title="Emergency Contact"
              description={showEmergencyContact 
                ? `${mockProfileData.emergencyContact.name} (${mockProfileData.emergencyContact.relationship})`
                : 'Tap to view'
              }
              left={() => <List.Icon icon="phone-alert" color={constructionColors.urgent} />}
              right={() => (
                <IconButton
                  icon={showEmergencyContact ? 'eye-off' : 'eye'}
                  size={20}
                  iconColor={theme.colors.primary}
                  onPress={() => setShowEmergencyContact(!showEmergencyContact)}
                />
              )}
              titleStyle={styles.contactTitle}
              descriptionStyle={styles.contactDescription}
              onPress={() => setShowEmergencyContact(!showEmergencyContact)}
            />
            
            {showEmergencyContact && (
              <View style={styles.emergencyDetails}>
                <Paragraph style={styles.emergencyPhone}>
                  📞 {mockProfileData.emergencyContact.phone}
                </Paragraph>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Account Actions Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Account Settings</Title>
            
            <View style={styles.accountActions}>
              <Button
                mode="outlined"
                onPress={handleEditProfile}
                icon="account-edit"
                style={styles.actionButton}
              >
                Edit Profile
              </Button>
              
              <Button
                mode="outlined"
                onPress={handleChangePassword}
                icon="lock"
                style={styles.actionButton}
              >
                Change Password
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => Alert.alert('Help', 'Help section would be implemented here.')}
                icon="help-circle"
                style={styles.actionButton}
              >
                Help & Support
              </Button>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: theme.colors.surface,
    elevation: 1,
  },
  screenTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
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
    marginBottom: spacing.lg,
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
  phone: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    marginBottom: spacing.sm,
  },
  profileChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  roleChip: {
    backgroundColor: theme.colors.primary,
    height: 28,
  },
  divider: {
    marginVertical: spacing.md,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  workSummary: {
    marginVertical: -spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSizes.md,
    color: theme.colors.placeholder,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: fontSizes.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  approvalRate: {
    alignItems: 'flex-end',
    width: 120,
  },
  progressBar: {
    width: 80,
    height: 6,
    borderRadius: 3,
    marginTop: spacing.xs,
  },
  rating: {
    alignItems: 'flex-end',
  },
  stars: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  star: {
    margin: 0,
    padding: 0,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  specialtyChipWrapper: {
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  specialtyChip: {
    backgroundColor: theme.colors.primaryContainer,
  },
  specialtyText: {
    color: theme.colors.primary,
    fontSize: fontSizes.sm,
  },
  certificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  certBadge: {
    alignSelf: 'center',
  },
  certTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  certDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  achievementTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: constructionColors.warning,
  },
  achievementDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
  },
  achievementDate: {
    fontSize: fontSizes.xs,
    color: theme.colors.placeholder,
    alignSelf: 'center',
  },
  contactTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  contactDescription: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
  },
  emergencyDetails: {
    backgroundColor: constructionColors.urgent + '20',
    padding: spacing.md,
    borderRadius: theme.roundness,
    marginTop: spacing.sm,
  },
  emergencyPhone: {
    fontSize: fontSizes.md,
    color: constructionColors.urgent,
    fontWeight: '500',
    textAlign: 'center',
  },
  accountActions: {
    marginVertical: -spacing.xs,
  },
  actionButton: {
    marginVertical: spacing.xs,
  },
});
































