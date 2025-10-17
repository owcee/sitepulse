import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  TextInput, 
  IconButton, 
  Avatar, 
  Chip,
  ActivityIndicator
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatMessage, User } from '../../types';
import { theme, constructionColors, spacing, fontSizes } from '../../utils/theme';
import { subscribeToMessages, sendMessage } from '../../services/chatService';
import { useProjectData } from '../../context/ProjectDataContext';
import { auth } from '../../firebaseConfig';

// Mock chat messages
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    projectId: 'project-1',
    senderId: 'engineer-1',
    senderName: 'John Engineer',
    senderRole: 'engineer',
    content: 'Good morning team! Ready to start the concrete pour today?',
    type: 'text',
    timestamp: '2024-01-23T08:00:00Z',
  },
  {
    id: '2',
    projectId: 'project-1',
    senderId: 'worker-2',
    senderName: 'Mike Johnson',
    senderRole: 'worker',
    content: 'Morning! Yes, all equipment is ready and weather looks good.',
    type: 'text',
    timestamp: '2024-01-23T08:05:00Z',
  },
  {
    id: '3',
    projectId: 'project-1',
    senderId: 'worker-3',
    senderName: 'Sarah Davis',
    senderRole: 'worker',
    content: 'Concrete truck arrived early. Should we start prep work?',
    type: 'text',
    timestamp: '2024-01-23T08:10:00Z',
  },
  {
    id: '4',
    projectId: 'project-1',
    senderId: 'engineer-1',
    senderName: 'John Engineer',
    senderRole: 'engineer',
    content: 'Yes, please start with the site prep. I\'ll be there in 15 minutes.',
    type: 'text',
    timestamp: '2024-01-23T08:12:00Z',
  },
  {
    id: '5',
    projectId: 'project-1',
    senderId: 'worker-2',
    senderName: 'Mike Johnson',
    senderRole: 'worker',
    content: 'Here\'s the current site status',
    type: 'image',
    timestamp: '2024-01-23T08:30:00Z',
    imageUri: 'https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=Site+Ready',
  },
  {
    id: '6',
    projectId: 'project-1',
    senderId: 'engineer-1',
    senderName: 'John Engineer',
    senderRole: 'engineer',
    content: 'Perfect! Site looks ready. Please proceed with the pour.',
    type: 'text',
    timestamp: '2024-01-23T08:35:00Z',
  },
  {
    id: '7',
    projectId: 'project-1',
    senderId: 'worker-4',
    senderName: 'Carlos Rodriguez',
    senderRole: 'worker',
    content: 'Question about the reinforcement spacing in section B. Can someone clarify?',
    type: 'text',
    timestamp: '2024-01-23T09:00:00Z',
  },
  {
    id: '8',
    projectId: 'project-1',
    senderId: 'engineer-1',
    senderName: 'John Engineer',
    senderRole: 'engineer',
    content: 'Rebar spacing should be 12" on center. Check the latest blueprints.',
    type: 'text',
    timestamp: '2024-01-23T09:05:00Z',
  },
];

interface Props {
  user: User;
}

export default function ChatScreen({ user }: Props) {
  const { projectId } = useProjectData();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = subscribeToMessages(projectId, (updatedMessages) => {
      // Convert to ChatMessage format
      const formattedMessages = updatedMessages.map(msg => ({
        id: msg.id,
        projectId: msg.projectId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        content: msg.content,
        type: msg.type,
        timestamp: msg.timestamp.toISOString(),
        imageUrl: msg.imageUrl
      }));
      setMessages(formattedMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !projectId) return;

    setSending(true);

    try {
      await sendMessage(
        projectId,
        newMessage.trim(),
        user.name,
        user.role,
        'text'
      );
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleColor = (role: 'engineer' | 'worker') => {
    return role === 'engineer' ? theme.colors.primary : constructionColors.complete;
  };

  const renderMessage = (message: any, index: number) => {
    const isCurrentUser = message.senderId === auth.currentUser?.uid;
    const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
    const showTimestamp = index === messages.length - 1 || 
                         messages[index + 1]?.senderId !== message.senderId ||
                         new Date(messages[index + 1]?.timestamp || 0).getTime() - new Date(message.timestamp).getTime() > 300000; // 5 minutes

    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!isCurrentUser && showAvatar && (
          <Avatar.Text 
            size={32} 
            label={message.senderName.charAt(0)} 
            style={[styles.avatar, { backgroundColor: getRoleColor(message.senderRole) }]}
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          !isCurrentUser && !showAvatar && styles.messageBubbleWithoutAvatar
        ]}>
          {!isCurrentUser && showAvatar && (
            <View style={styles.messageHeader}>
              <Paragraph style={styles.senderName}>{message.senderName}</Paragraph>
              <Chip 
                style={[styles.roleChip, { backgroundColor: getRoleColor(message.senderRole) }]}
                textStyle={{ color: 'white', fontSize: 10 }}
              >
                {message.senderRole === 'engineer' ? 'ENG' : 'WKR'}
              </Chip>
            </View>
          )}
          

          
          <Paragraph style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {message.content}
          </Paragraph>
        </View>
        
        {showTimestamp && (
          <Paragraph style={[
            styles.timestamp,
            isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp
          ]}>
            {formatTimestamp(message.timestamp)}
          </Paragraph>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Title style={styles.screenTitle}>Team Chat</Title>
          <Paragraph style={styles.projectName}>Project Communication</Paragraph>
        </View>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Paragraph style={{ marginTop: spacing.md }}>Loading messages...</Paragraph>
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollToBottom()}
          >
            {/* Date Separator */}
            <View style={styles.dateSeparator}>
              <Paragraph style={styles.dateText}>Today</Paragraph>
            </View>

            {messages.length === 0 ? (
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
                  No messages yet. Start the conversation!
                </Paragraph>
              </View>
            ) : (
              messages.map((message, index) => renderMessage(message, index))
            )}
            
            {/* Typing Indicator (when someone else is typing) */}
            {sending && (
              <View style={styles.typingIndicator}>
                <Paragraph style={styles.typingText}>Sending...</Paragraph>
              </View>
            )}
          </ScrollView>
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              mode="outlined"
              style={styles.textInput}
              multiline
              onSubmitEditing={handleSendMessage}
              disabled={sending}
            />
            
            <View style={styles.actionButtons}>
              <IconButton
                icon="send"
                size={24}
                iconColor={newMessage.trim() ? theme.colors.primary : theme.colors.disabled}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                style={[
                  styles.sendButton,
                  newMessage.trim() && { backgroundColor: theme.colors.primary + '20' }
                ]}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    paddingVertical: spacing.sm,
    backgroundColor: 'white',
    elevation: 1,
  },
  headerInfo: {
    flex: 1,
  },
  screenTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  projectName: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dateText: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    backgroundColor: 'white',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    elevation: 1,
  },
  messageContainer: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: 16,
    elevation: 1,
  },
  currentUserBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
  },
  messageBubbleWithoutAvatar: {
    marginLeft: 44, // Avatar width + margin
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  senderName: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: spacing.sm,
  },
  roleChip: {
    height: 20,
  },

  messageText: {
    fontSize: fontSizes.md,
    lineHeight: 20,
  },
  currentUserText: {
    color: 'white',
  },
  otherUserText: {
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: fontSizes.xs,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  currentUserTimestamp: {
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  otherUserTimestamp: {
    textAlign: 'left',
    marginLeft: 44, // Avatar width + margin
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 44,
    marginTop: spacing.sm,
  },
  typingText: {
    fontSize: fontSizes.sm,
    color: theme.colors.placeholder,
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: 'white',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    elevation: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    marginRight: spacing.sm,
    maxHeight: 100,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendButton: {
    borderRadius: 20,
  },
});



