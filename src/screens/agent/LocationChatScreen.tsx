/**
 * LocationChatScreen
 * WhatsApp-style AI-powered chat screen focused on a specific location
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import Markdown from 'react-native-markdown-display';
import { useChatStore } from '@stores';
import type { ChatMessage } from '@types';

const { width } = Dimensions.get('window');
const BOTTOM_PADDING = Platform.OS === 'ios' ? 34 : 16;

// WhatsApp-inspired theme (matches TourPlanChatScreen)
const THEME = {
  primary: '#F5840E',
  primaryDark: '#C2410C',
  chatBg: '#ECE5DD',
  userBubble: '#DCF8C6',
  aiBubble: '#FFFFFF',
  inputBg: '#FFFFFF',
  sendBtn: '#075E54',
  tickColor: '#4FC3F7',
  dark: '#1F2937',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
  },
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#FBBF24',
  error: '#EF4444',
};

interface LocationChatScreenProps {
  route: {
    params: {
      locationName: string;
    };
  };
  navigation: any;
}

// Format timestamp like WhatsApp (HH:MM)
const formatTime = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Date separator component (WhatsApp style)
const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
  <View style={styles.dateSeparator}>
    <View style={styles.dateSeparatorPill}>
      <Text style={styles.dateSeparatorText}>{date}</Text>
    </View>
  </View>
);

// AI response metadata badge
const MetadataBadge: React.FC<{
  icon: string;
  label: string;
  color: string;
}> = ({ icon, label, color }) => (
  <View style={[styles.metadataBadge, { backgroundColor: `${color}12` }]}>
    <Ionicons name={icon as any} size={11} color={color} />
    <Text style={[styles.metadataBadgeText, { color }]}>{label}</Text>
  </View>
);

// WhatsApp-style message bubble
const MessageBubble: React.FC<{
  message: ChatMessage;
}> = ({ message }) => {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const markdownStyles = {
    body: {
      fontSize: 14.5,
      fontFamily: 'Gilroy-Regular',
      color: THEME.dark,
      lineHeight: 21,
    },
    paragraph: { marginTop: 0, marginBottom: 6 },
    strong: { fontFamily: 'Gilroy-Bold', color: THEME.dark },
    heading1: { fontSize: 16, fontFamily: 'Gilroy-Bold', color: THEME.primary, marginBottom: 6 },
    heading2: {
      fontSize: 15,
      fontFamily: 'Gilroy-Bold',
      color: THEME.primaryDark,
      marginBottom: 4,
    },
    heading3: {
      fontSize: 14.5,
      fontFamily: 'Gilroy-Bold',
      color: THEME.dark,
      marginBottom: 3,
    },
    bullet_list_icon: { marginRight: 8, color: THEME.primary },
    bullet_list: { marginBottom: 4 },
    ordered_list: { marginBottom: 4 },
    link: { color: THEME.primary, textDecorationLine: 'underline' as const },
    blockquote: {
      backgroundColor: '#FFF7ED',
      borderLeftColor: THEME.primary,
      borderLeftWidth: 3,
      paddingLeft: 10,
      paddingVertical: 4,
      marginVertical: 4,
    },
  };

  const meta = message.metadata;
  const hasMetadata = !isUser && !!meta && !!(meta.documentsRetrieved || meta.webSearchUsed || meta.reasoningLoops);

  return (
    <Animated.View
      style={[isUser ? styles.userBubbleRow : styles.aiBubbleRow, { opacity: fadeAnim }]}
    >
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {/* Bubble tail */}
        <View style={isUser ? styles.userBubbleTail : styles.aiBubbleTail} />

        {isUser ? (
          <>
            <Text style={styles.userMessageText}>{message.content}</Text>
            <View style={styles.userBubbleFooter}>
              <Text style={styles.bubbleTimeUser}>{formatTime(message.timestamp)}</Text>
              <Ionicons
                name="checkmark-done"
                size={14}
                color={THEME.tickColor}
                style={{ marginLeft: 4 }}
              />
            </View>
          </>
        ) : (
          <>
            <Markdown style={markdownStyles}>{message.content}</Markdown>

            {/* AI Source & Metadata Footer */}
            {hasMetadata && (
              <View style={styles.metadataContainer}>
                <View style={styles.metadataDivider} />
                <View style={styles.metadataBadgeRow}>
                  {meta!.documentsRetrieved != null && meta!.documentsRetrieved > 0 ? (
                    <MetadataBadge
                      icon="library-outline"
                      label={`${meta!.documentsRetrieved} sources`}
                      color="#7C3AED"
                    />
                  ) : null}
                  {meta!.webSearchUsed === true ? (
                    <MetadataBadge
                      icon="globe-outline"
                      label="Web search"
                      color="#0891B2"
                    />
                  ) : null}
                  {meta!.reasoningLoops != null && meta!.reasoningLoops > 0 ? (
                    <MetadataBadge
                      icon="sparkles-outline"
                      label={meta!.reasoningLoops > 1 ? `${meta!.reasoningLoops}x verified` : 'Verified'}
                      color="#059669"
                    />
                  ) : null}
                </View>
              </View>
            )}

            <Text style={styles.bubbleTime}>{formatTime(message.timestamp)}</Text>
          </>
        )}
      </View>
    </Animated.View>
  );
};

// Typing indicator (WhatsApp style)
const TypingIndicator: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.aiBubbleRow}>
      <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
        <View style={styles.aiBubbleTail} />
        <View style={styles.typingDotsRow}>
          <Animated.View style={[styles.typingDot, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.typingDot, { opacity: pulseAnim, marginHorizontal: 4 }]} />
          <Animated.View style={[styles.typingDot, { opacity: pulseAnim }]} />
        </View>
      </View>
    </View>
  );
};

// Quick reply chip
const QuickReply: React.FC<{
  text: string;
  icon: string;
  onPress: () => void;
}> = ({ text, icon, onPress }) => (
  <TouchableOpacity style={styles.quickReply} onPress={onPress} activeOpacity={0.7}>
    <FontAwesome5 name={icon} size={11} color={THEME.primary} />
    <Text style={styles.quickReplyText}>{text}</Text>
  </TouchableOpacity>
);

export const LocationChatScreen: React.FC<LocationChatScreenProps> = ({
  route,
  navigation,
}) => {
  const { locationName } = route.params;
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const {
    setCurrentLocation,
    loadLocationSession,
    sendMessage,
    clearChat,
    clearError,
  } = useChatStore();

  const chatState = useChatStore(state => state.locationChats[locationName]);
  const messages = chatState?.messages || [];
  const isLoading = chatState?.isLoading || false;
  const isSending = chatState?.isSending || false;
  const error = chatState?.error || null;

  useEffect(() => {
    setCurrentLocation(locationName);
    loadLocationSession(locationName);
  }, [locationName, setCurrentLocation, loadLocationSession]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isSending]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => clearError(locationName) },
      ]);
    }
  }, [error, clearError, locationName]);

  const handleSend = useCallback(() => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isSending) return;

    setInputText('');
    sendMessage(locationName, trimmedText);
  }, [inputText, isSending, locationName, sendMessage]);

  const handleSuggestionPress = useCallback((text: string) => {
    setInputText(text);
    setTimeout(() => {
      sendMessage(locationName, text);
      setInputText('');
    }, 100);
  }, [locationName, sendMessage]);

  const handleClearChat = useCallback(() => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear all messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearChat(locationName),
        },
      ]
    );
  }, [locationName, clearChat]);

  const suggestions = [
    { text: 'Best time to visit?', icon: 'clock' },
    { text: 'Tell me the history', icon: 'book' },
    { text: 'Photography tips', icon: 'camera' },
    { text: 'Hidden gems nearby', icon: 'gem' },
    { text: 'Local food to try', icon: 'utensils' },
    { text: 'Safety tips', icon: 'shield-alt' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* WhatsApp-style Header */}
      <LinearGradient
        colors={[THEME.primary, THEME.primaryDark]}
        style={[styles.header, { marginTop: -insets.top, paddingTop: insets.top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.white} />
        </TouchableOpacity>

        {/* AI Avatar with online dot */}
        <View style={styles.headerAvatar}>
          <MaterialCommunityIcons name="robot-happy-outline" size={20} color={THEME.white} />
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>AI Travel Guide</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {isLoading || isSending ? 'typing...' : locationName}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleClearChat}
          activeOpacity={0.7}
          disabled={messages.length === 0}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={messages.length === 0 ? 'rgba(255,255,255,0.4)' : THEME.white}
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* Chat Content */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date separator */}
          <DateSeparator date="Today" />

          {isLoading ? (
            <View style={styles.aiBubbleRow}>
              <View style={[styles.messageBubble, styles.assistantBubble, { paddingVertical: 12 }]}>
                <View style={styles.aiBubbleTail} />
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={[styles.bubbleTime, { marginTop: 6 }]}>Loading conversation...</Text>
              </View>
            </View>
          ) : messages.length === 0 ? (
            /* Empty state as a centered chat prompt */
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIconBg}>
                <MaterialCommunityIcons name="robot-happy-outline" size={36} color={THEME.white} />
              </View>
              <Text style={styles.emptyStateTitle}>Your AI Guide for</Text>
              <Text style={styles.emptyStateLocation}>{locationName}</Text>
              <Text style={styles.emptyStateSubtitle}>
                Ask me anything about this place — history, tips, food, hidden gems, and more!
              </Text>
              <View style={styles.suggestionsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsScroll}
                >
                  {suggestions.map((s, i) => (
                    <QuickReply
                      key={i}
                      text={s.text}
                      icon={s.icon}
                      onPress={() => handleSuggestionPress(s.text)}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : (
            <>
              {messages.map(message => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isSending && <TypingIndicator />}
            </>
          )}
        </ScrollView>

        {/* Quick suggestions (shown when messages exist and not sending) */}
        {!isLoading && !isSending && messages.length > 0 && messages.length <= 2 && (
          <View style={styles.quickRepliesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRepliesScroll}
            >
              {suggestions.map((s, i) => (
                <QuickReply
                  key={i}
                  text={s.text}
                  icon={s.icon}
                  onPress={() => handleSuggestionPress(s.text)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* WhatsApp-style Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={THEME.gray[400]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isSending}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={THEME.white} />
            ) : (
              <Ionicons name="send" size={18} color={THEME.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.primary,
    overflow: 'visible',
  },

  // Header (WhatsApp style)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: THEME.white,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chat area
  chatArea: {
    flex: 1,
    backgroundColor: THEME.chatBg,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 10,
    flexGrow: 1,
  },

  // Date separator
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateSeparatorPill: {
    backgroundColor: 'rgba(225,218,208,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[700],
  },

  // Message rows
  userBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  aiBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },

  // Message bubble
  messageBubble: {
    maxWidth: width * 0.78,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: THEME.userBubble,
    borderTopRightRadius: 2,
    marginRight: 4,
  },
  assistantBubble: {
    backgroundColor: THEME.aiBubble,
    borderTopLeftRadius: 2,
    marginLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },

  // Bubble tails
  userBubbleTail: {
    position: 'absolute',
    top: 0,
    right: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: THEME.userBubble,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  aiBubbleTail: {
    position: 'absolute',
    top: 0,
    left: -6,
    width: 0,
    height: 0,
    borderRightWidth: 6,
    borderRightColor: THEME.aiBubble,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },

  // User message
  userMessageText: {
    fontSize: 14.5,
    fontFamily: 'Gilroy-Regular',
    color: THEME.dark,
    lineHeight: 20,
  },
  userBubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  bubbleTimeUser: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
  },
  bubbleTime: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[400],
    textAlign: 'right',
    marginTop: 3,
  },

  // Typing
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.gray[400],
  },

  // Empty state
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  emptyStateIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[500],
  },
  emptyStateLocation: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 19,
  },
  suggestionsContainer: {
    marginTop: 20,
    width: '100%',
  },
  suggestionsScroll: {
    paddingHorizontal: 4,
    gap: 8,
  },

  // Quick replies
  quickRepliesContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    backgroundColor: THEME.chatBg,
    paddingVertical: 8,
  },
  quickRepliesScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickReply: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.primary,
    gap: 6,
  },
  quickReplyText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: THEME.primary,
  },

  // Input area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: BOTTOM_PADDING,
    backgroundColor: THEME.chatBg,
    gap: 6,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: THEME.white,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: THEME.dark,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 4 : 6,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: THEME.gray[300],
  },

  // Metadata badges
  metadataContainer: {
    marginTop: 6,
  },
  metadataDivider: {
    height: 1,
    backgroundColor: THEME.gray[200],
    marginBottom: 6,
  },
  metadataBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  metadataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  metadataBadgeText: {
    fontSize: 10.5,
    fontFamily: 'Gilroy-Medium',
  },
});

export default LocationChatScreen;
