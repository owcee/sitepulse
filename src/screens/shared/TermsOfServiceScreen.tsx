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

export default function TermsOfServiceScreen() {
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
        <Title style={styles.headerTitle}>Terms of Service</Title>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>SitePulse Terms of Service</Title>

            <Paragraph style={styles.intro}>
              Please read these Terms of Service ("Terms") carefully before using the SitePulse mobile application and services. By accessing or using SitePulse, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the service.
            </Paragraph>

            <Title style={styles.sectionTitle}>1. Acceptance of Terms</Title>
            <Paragraph style={styles.text}>
              By creating an account, accessing, or using SitePulse, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. These Terms apply to all users of the service, including engineers, workers, and any other individuals who access or use SitePulse.
            </Paragraph>

            <Title style={styles.sectionTitle}>2. Description of Service</Title>
            <Paragraph style={styles.text}>
              SitePulse is a construction project management platform that provides tools for:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Project planning and task management</Text>
              <Text style={styles.bulletPoint}>• Budget tracking and financial management</Text>
              <Text style={styles.bulletPoint}>• Inventory and resource management</Text>
              <Text style={styles.bulletPoint}>• Worker assignment and communication</Text>
              <Text style={styles.bulletPoint}>• Document and photo management</Text>
              <Text style={styles.bulletPoint}>• Progress tracking and reporting</Text>
            </View>

            <Title style={styles.sectionTitle}>3. User Accounts</Title>
            <Paragraph style={styles.subsectionTitle}>3.1 Account Creation</Paragraph>
            <Paragraph style={styles.text}>
              To use SitePulse, you must create an account by providing accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </Paragraph>

            <Paragraph style={styles.subsectionTitle}>3.2 Account Responsibilities</Paragraph>
            <Paragraph style={styles.text}>
              You agree to:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Provide accurate and truthful information</Text>
              <Text style={styles.bulletPoint}>• Maintain the security of your account credentials</Text>
              <Text style={styles.bulletPoint}>• Notify us immediately of any unauthorized access</Text>
              <Text style={styles.bulletPoint}>• Accept responsibility for all activities under your account</Text>
              <Text style={styles.bulletPoint}>• Use the service only for lawful purposes</Text>
            </View>

            <Title style={styles.sectionTitle}>4. User Conduct</Title>
            <Paragraph style={styles.text}>
              You agree not to:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Use the service for any illegal or unauthorized purpose</Text>
              <Text style={styles.bulletPoint}>• Violate any laws, regulations, or third-party rights</Text>
              <Text style={styles.bulletPoint}>• Transmit any viruses, malware, or harmful code</Text>
              <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to the service or other accounts</Text>
              <Text style={styles.bulletPoint}>• Interfere with or disrupt the service or servers</Text>
              <Text style={styles.bulletPoint}>• Use automated systems to access the service without permission</Text>
              <Text style={styles.bulletPoint}>• Harass, abuse, or harm other users</Text>
              <Text style={styles.bulletPoint}>• Upload false, misleading, or fraudulent information</Text>
            </View>

            <Title style={styles.sectionTitle}>5. Project Data and Content</Title>
            <Paragraph style={styles.subsectionTitle}>5.1 Ownership</Paragraph>
            <Paragraph style={styles.text}>
              You retain ownership of all project data, documents, photos, and content you upload to SitePulse. By uploading content, you grant us a limited, non-exclusive license to store, process, and display your content solely for the purpose of providing the service.
            </Paragraph>

            <Paragraph style={styles.subsectionTitle}>5.2 Data Accuracy</Paragraph>
            <Paragraph style={styles.text}>
              You are solely responsible for the accuracy, completeness, and legality of all data and content you upload. We are not responsible for any errors, omissions, or inaccuracies in user-provided content.
            </Paragraph>

            <Paragraph style={styles.subsectionTitle}>5.3 Data Backup</Paragraph>
            <Paragraph style={styles.text}>
              While we implement backup systems, you are responsible for maintaining your own backups of critical project data. We are not liable for any data loss.
            </Paragraph>

            <Title style={styles.sectionTitle}>6. Intellectual Property</Title>
            <Paragraph style={styles.text}>
              The SitePulse application, including its design, features, functionality, and all related software, is owned by SitePulse and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our service without our express written permission.
            </Paragraph>

            <Title style={styles.sectionTitle}>7. Payment and Billing</Title>
            <Paragraph style={styles.text}>
              If SitePulse offers paid features or subscriptions:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• All fees are stated in the applicable currency</Text>
              <Text style={styles.bulletPoint}>• Payments are processed through secure third-party payment processors</Text>
              <Text style={styles.bulletPoint}>• Subscription fees are billed in advance on a recurring basis</Text>
              <Text style={styles.bulletPoint}>• Refunds are subject to our refund policy</Text>
              <Text style={styles.bulletPoint}>• We reserve the right to change pricing with notice</Text>
            </View>

            <Title style={styles.sectionTitle}>8. Service Availability</Title>
            <Paragraph style={styles.text}>
              We strive to provide reliable service but do not guarantee that SitePulse will be available at all times. The service may be unavailable due to maintenance, technical issues, or circumstances beyond our control. We are not liable for any damages resulting from service unavailability.
            </Paragraph>

            <Title style={styles.sectionTitle}>9. Limitation of Liability</Title>
            <Paragraph style={styles.text}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SITEPULSE AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </Paragraph>
            <Paragraph style={styles.text}>
              Our total liability for any claims arising from your use of the service shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.
            </Paragraph>

            <Title style={styles.sectionTitle}>10. Indemnification</Title>
            <Paragraph style={styles.text}>
              You agree to indemnify, defend, and hold harmless SitePulse, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
            </Paragraph>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Your use of the service</Text>
              <Text style={styles.bulletPoint}>• Your violation of these Terms</Text>
              <Text style={styles.bulletPoint}>• Your violation of any third-party rights</Text>
              <Text style={styles.bulletPoint}>• Any content you upload or transmit</Text>
            </View>

            <Title style={styles.sectionTitle}>11. Termination</Title>
            <Paragraph style={styles.subsectionTitle}>11.1 Termination by You</Paragraph>
            <Paragraph style={styles.text}>
              You may terminate your account at any time by deleting it through the app settings or contacting us. Upon termination, your access to the service will cease immediately.
            </Paragraph>

            <Paragraph style={styles.subsectionTitle}>11.2 Termination by Us</Paragraph>
            <Paragraph style={styles.text}>
              We reserve the right to suspend or terminate your account at any time, with or without notice, for any violation of these Terms, fraudulent activity, or any other reason we deem necessary to protect the service and its users.
            </Paragraph>

            <Paragraph style={styles.subsectionTitle}>11.3 Effect of Termination</Paragraph>
            <Paragraph style={styles.text}>
              Upon termination, your right to use the service will immediately cease. We may delete your account and data, subject to our data retention policies and legal obligations.
            </Paragraph>

            <Title style={styles.sectionTitle}>12. Dispute Resolution</Title>
            <Paragraph style={styles.text}>
              Any disputes arising from these Terms or your use of SitePulse shall be resolved through binding arbitration in accordance with applicable arbitration rules, except where prohibited by law. You waive any right to participate in a class-action lawsuit or class-wide arbitration.
            </Paragraph>

            <Title style={styles.sectionTitle}>13. Changes to Terms</Title>
            <Paragraph style={styles.text}>
              We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms in the app and updating the "Last Updated" date. Your continued use of the service after such changes constitutes acceptance of the modified Terms.
            </Paragraph>

            <Title style={styles.sectionTitle}>14. Governing Law</Title>
            <Paragraph style={styles.text}>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which SitePulse operates, without regard to its conflict of law provisions.
            </Paragraph>

            <Title style={styles.sectionTitle}>15. Severability</Title>
            <Paragraph style={styles.text}>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </Paragraph>

            <Title style={styles.sectionTitle}>16. Entire Agreement</Title>
            <Paragraph style={styles.text}>
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and SitePulse regarding your use of the service and supersede all prior agreements and understandings.
            </Paragraph>

            <Title style={styles.sectionTitle}>17. Contact Information</Title>
            <Paragraph style={styles.text}>
              For account termination or any questions about these Terms of Service, please contact us:
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

