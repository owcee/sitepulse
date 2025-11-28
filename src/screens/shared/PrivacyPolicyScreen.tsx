import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Paragraph, 
  IconButton,
  Surface
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme, spacing, fontSizes } from '../../utils/theme';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.onSurface}
        />
        <Title style={styles.headerTitle}>Privacy Policy</Title>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>SitePulse Privacy Policy</Title>

            <Paragraph style={styles.intro}>
              Welcome to SitePulse. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our construction management application.
            </Paragraph>

            <Title style={styles.sectionTitle}>1. Information We Collect</Title>
            
            <Paragraph style={styles.subsectionTitle}>1.1 Personal Information</Paragraph>
            <Paragraph style={styles.text}>
              We collect personal information that you provide directly to us, including:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Name and email address</Text>
              <Text style={styles.bulletPoint}>• Professional role (Engineer or Worker)</Text>
              <Text style={styles.bulletPoint}>• Profile information and preferences</Text>
              <Text style={styles.bulletPoint}>• Authentication credentials</Text>
            </View>

            <Paragraph style={styles.subsectionTitle}>1.2 Project Data</Paragraph>
            <Paragraph style={styles.text}>
              We collect and store project-related information, including:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Project details, tasks, and assignments</Text>
              <Text style={styles.bulletPoint}>• Budget and financial information</Text>
              <Text style={styles.bulletPoint}>• Materials, equipment, and inventory data</Text>
              <Text style={styles.bulletPoint}>• Worker assignments and schedules</Text>
              <Text style={styles.bulletPoint}>• Photos and documentation uploaded to the platform</Text>
            </View>

            <Paragraph style={styles.subsectionTitle}>1.3 Usage Information</Paragraph>
            <Paragraph style={styles.text}>
              We automatically collect certain information about your device and how you interact with our app, including:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Device information (model, operating system, unique identifiers)</Text>
              <Text style={styles.bulletPoint}>• Log data (IP address, access times, app features used)</Text>
            </View>

            <Title style={styles.sectionTitle}>2. How We Use Your Information</Title>
            <Paragraph style={styles.text}>
              We use the information we collect to:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Provide, maintain, and improve our services</Text>
              <Text style={styles.bulletPoint}>• Process transactions and manage your account</Text>
              <Text style={styles.bulletPoint}>• Send you notifications, updates, and important communications</Text>
              <Text style={styles.bulletPoint}>• Facilitate communication between engineers and workers</Text>
              <Text style={styles.bulletPoint}>• Monitor and analyze usage patterns to enhance user experience</Text>
              <Text style={styles.bulletPoint}>• Detect, prevent, and address technical issues and security threats</Text>
              <Text style={styles.bulletPoint}>• Comply with legal obligations and enforce our terms</Text>
            </View>

            <Title style={styles.sectionTitle}>3. Data Storage and Security</Title>
            <Paragraph style={styles.text}>
              We implement industry-standard security measures to protect your information:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Data encryption in transit and at rest</Text>
              <Text style={styles.bulletPoint}>• Secure authentication using Firebase Authentication</Text>
              <Text style={styles.bulletPoint}>• Regular security audits and updates</Text>
              <Text style={styles.bulletPoint}>• Access controls and user authentication</Text>
              <Text style={styles.bulletPoint}>• Secure cloud storage through Firebase/Firestore</Text>
            </View>
            <Paragraph style={styles.text}>
              While we strive to protect your personal information, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </Paragraph>

            <Title style={styles.sectionTitle}>4. Data Sharing and Disclosure</Title>
            <Paragraph style={styles.text}>
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• With other users within your project (engineers and workers)</Text>
              <Text style={styles.bulletPoint}>• With service providers who assist us in operating our app (e.g., Firebase, cloud hosting)</Text>
              <Text style={styles.bulletPoint}>• When required by law or to respond to legal processes</Text>
              <Text style={styles.bulletPoint}>• To protect our rights, privacy, safety, or property</Text>
              <Text style={styles.bulletPoint}>• In connection with a business transfer or merger (with notice to users)</Text>
            </View>

            <Title style={styles.sectionTitle}>5. Your Rights and Choices</Title>
            <Paragraph style={styles.text}>
              You have the right to:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Access and review your personal information</Text>
              <Text style={styles.bulletPoint}>• Update or correct inaccurate information</Text>
              <Text style={styles.bulletPoint}>• Request deletion of your account and data</Text>
              <Text style={styles.bulletPoint}>• Opt-out of certain communications</Text>
              <Text style={styles.bulletPoint}>• Export your project data</Text>
            </View>
            <Paragraph style={styles.text}>
              To exercise these rights, including account termination, please contact us at sitepulse02@gmail.com.
            </Paragraph>

            <Title style={styles.sectionTitle}>6. Data Retention</Title>
            <Paragraph style={styles.text}>
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal, regulatory, or legitimate business purposes.
            </Paragraph>

            <Title style={styles.sectionTitle}>7. Children's Privacy</Title>
            <Paragraph style={styles.text}>
              SitePulse is not intended for users under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child under 18, we will take steps to delete such information promptly.
            </Paragraph>

            <Title style={styles.sectionTitle}>8. International Data Transfers</Title>
            <Paragraph style={styles.text}>
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using our app, you consent to the transfer of your information to these countries.
            </Paragraph>

            <Title style={styles.sectionTitle}>9. Changes to This Privacy Policy</Title>
            <Paragraph style={styles.text}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
            </Paragraph>

            <Title style={styles.sectionTitle}>10. Contact Us</Title>
            <Paragraph style={styles.text}>
              For account termination or any questions about this Privacy Policy, please contact us:
            </Paragraph>
            <View style={styles.contactInfo}>
              <Text style={styles.contactText}>Email: sitepulse02@gmail.com</Text>
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
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingVertical: spacing.sm,
    paddingTop: spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: spacing.xs,
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.lg,
  },
  intro: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurface,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  text: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurface,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  bulletList: {
    marginLeft: spacing.md,
    marginBottom: spacing.md,
  },
  bulletPoint: {
    fontSize: fontSizes.sm,
    color: theme.colors.onSurface,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  contactInfo: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  contactText: {
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
});

