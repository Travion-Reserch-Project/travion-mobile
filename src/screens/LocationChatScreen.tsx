/**
 * LocationChatScreen
 * AI-powered chat screen focused on a specific location
 * Redesigned with app theme and enhanced UX
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
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Markdown from 'react-native-markdown-display';
import { useChatStore } from '@stores';
import type { ChatMessage } from '@types';

const { width, height } = Dimensions.get('window');
const BOTTOM_PADDING = Platform.OS === 'ios' ? 34 : 20;

// App Theme Colors
const THEME = {
  primary: '#F5840E',
  primaryLight: '#FFF7ED',
  primaryDark: '#C2410C',
  secondary: '#5856D6',
  accent: '#FF6B35',
  success: '#10B981',
  warning: '#FBBF24',
  error: '#EF4444',
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
};

// Loading animation
const typingAnimation = require('@assets/animations/onbord1.json');

interface LocationChatScreenProps {
  route: {
    params: {
      locationName: string;
    };
  };
  navigation: any;
}

// Message bubble component with enhanced styling
const MessageBubble: React.FC<{
  message: ChatMessage;
  isLast: boolean;
  isFirst: boolean;
}> = ({ message, isLast, isFirst }) => {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Markdown styles for assistant messages with orange theme
  const markdownStyles = {
    body: {
      fontSize: 15,
      fontFamily: 'Gilroy-Regular',
      color: THEME.dark,
      lineHeight: 23,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 10,
    },
    strong: {
      fontFamily: 'Gilroy-Bold',
      color: THEME.dark,
    },
    em: {
      fontFamily: 'Gilroy-Regular',
      fontStyle: 'italic' as const,
    },
    heading1: {
      fontSize: 18,
      fontFamily: 'Gilroy-Bold',
      color: THEME.primary,
      marginBottom: 10,
      marginTop: 8,
    },
    heading2: {
      fontSize: 16,
      fontFamily: 'Gilroy-Bold',
      color: THEME.primaryDark,
      marginBottom: 8,
      marginTop: 6,
    },
    heading3: {
      fontSize: 15,
      fontFamily: 'Gilroy-SemiBold',
      color: THEME.primary,
      marginBottom: 6,
      marginTop: 4,
    },
    bullet_list: {
      marginVertical: 6,
    },
    ordered_list: {
      marginVertical: 6,
    },
    list_item: {
      marginVertical: 3,
    },
    bullet_list_icon: {
      marginRight: 10,
      color: THEME.primary,
    },
    code_inline: {
      backgroundColor: THEME.primaryLight,
      fontFamily: 'monospace',
      fontSize: 13,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      color: THEME.primaryDark,
    },
    code_block: {
      backgroundColor: THEME.gray[100],
      padding: 12,
      borderRadius: 12,
      fontFamily: 'monospace',
      fontSize: 13,
    },
    link: {
      color: THEME.primary,
      textDecorationLine: 'underline' as const,
    },
    blockquote: {
      backgroundColor: THEME.primaryLight,
      borderLeftColor: THEME.primary,
      borderLeftWidth: 4,
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 8,
      borderRadius: 8,
    },
  };

  return (
    <Animated.View
      style={[
        styles.messageBubbleContainer,
        isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[THEME.primary, THEME.accent]}
            style={styles.aiAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="robot-happy-outline" size={16} color={THEME.white} />
          </LinearGradient>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {isUser ? (
          <LinearGradient
            colors={[THEME.primary, THEME.primaryDark]}
            style={styles.userBubbleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.userMessageText}>{message.content}</Text>
            <Text style={styles.userMessageTime}>{formatTime(message.timestamp)}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.assistantBubbleContent}>
            <Markdown style={markdownStyles}>{message.content}</Markdown>
            <View style={styles.assistantMessageFooter}>
              <MaterialCommunityIcons name="sparkles" size={12} color={THEME.primary} />
              <Text style={styles.assistantMessageTime}>{formatTime(message.timestamp)}</Text>
            </View>
          </View>
        )}
      </View>
      {isUser && (
        <View style={styles.userAvatarContainer}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={14} color={THEME.white} />
          </View>
        </View>
      )}
    </Animated.View>
  );
};

// Format timestamp
const formatTime = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Enhanced typing indicator component
const TypingIndicator: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={[THEME.primary, THEME.accent]}
          style={styles.aiAvatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="robot-happy-outline" size={16} color={THEME.white} />
        </LinearGradient>
      </View>
      <View style={styles.typingBubble}>
        <View style={styles.typingDotsContainer}>
          <Animated.View style={[styles.typingDot, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.typingDot, styles.typingDotMiddle, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.typingDot, { opacity: pulseAnim }]} />
        </View>
        <Text style={styles.typingText}>AI is thinking...</Text>
      </View>
    </View>
  );
};

// Quick suggestion chip component
const SuggestionChip: React.FC<{
  text: string;
  icon: string;
  onPress: () => void;
}> = ({ text, icon, onPress }) => (
  <TouchableOpacity style={styles.suggestionChip} onPress={onPress} activeOpacity={0.7}>
    <FontAwesome5 name={icon} size={12} color={THEME.primary} />
    <Text style={styles.suggestionChipText}>{text}</Text>
  </TouchableOpacity>
);

// Enhanced empty state component
const EmptyState: React.FC<{
  locationName: string;
  onSuggestionPress: (text: string) => void;
}> = ({ locationName, onSuggestionPress }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const suggestions = [
    { text: 'Best time to visit?', icon: 'clock' },
    { text: 'Tell me the history', icon: 'book' },
    { text: 'Photography tips', icon: 'camera' },
    { text: 'Hidden gems nearby', icon: 'gem' },
    { text: 'Local food to try', icon: 'utensils' },
    { text: 'Safety tips', icon: 'shield-alt' },
  ];

  return (
    <Animated.View
      style={[
        styles.emptyStateContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.emptyStateHeader}>
        <LinearGradient
          colors={[THEME.primary, THEME.accent]}
          style={styles.emptyStateIconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="robot-happy-outline" size={40} color={THEME.white} />
        </LinearGradient>
        <View style={styles.emptyStateBadge}>
          <MaterialCommunityIcons name="sparkles" size={10} color={THEME.primary} />
          <Text style={styles.emptyStateBadgeText}>AI Powered</Text>
        </View>
      </View>

      <Text style={styles.emptyStateTitle}>Your Personal Guide for</Text>
      <Text style={styles.emptyStateLocation}>{locationName}</Text>
      <Text style={styles.emptyStateSubtitle}>
        Ask me anything! I can help with history, best visiting times, photography tips, local cuisine, and hidden gems.
      </Text>

      <View style={styles.suggestionSection}>
        <View style={styles.suggestionLabelRow}>
          <View style={styles.suggestionLabelLine} />
          <Text style={styles.suggestionLabel}>Quick Questions</Text>
          <View style={styles.suggestionLabelLine} />
        </View>
        <View style={styles.suggestionGrid}>
          {suggestions.map((suggestion, index) => (
            <SuggestionChip
              key={index}
              text={suggestion.text}
              icon={suggestion.icon}
              onPress={() => onSuggestionPress(suggestion.text)}
            />
          ))}
        </View>
      </View>

      <View style={styles.featureCards}>
        <View style={styles.featureCard}>
          <View style={[styles.featureIconBg, { backgroundColor: '#D1FAE5' }]}>
            <FontAwesome5 name="brain" size={14} color="#059669" />
          </View>
          <Text style={styles.featureText}>Smart Responses</Text>
        </View>
        <View style={styles.featureCard}>
          <View style={[styles.featureIconBg, { backgroundColor: '#E0F2FE' }]}>
            <FontAwesome5 name="globe" size={14} color="#0EA5E9" />
          </View>
          <Text style={styles.featureText}>Local Knowledge</Text>
        </View>
        <View style={styles.featureCard}>
          <View style={[styles.featureIconBg, { backgroundColor: THEME.primaryLight }]}>
            <FontAwesome5 name="heart" size={14} color={THEME.primary} />
          </View>
          <Text style={styles.featureText}>Personalized</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export const LocationChatScreen: React.FC<LocationChatScreenProps> = ({
  route,
  navigation,
}) => {
  const { locationName } = route.params;
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* Enhanced Header */}
      <LinearGradient
        colors={[THEME.primary, THEME.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={THEME.white} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIconBg}>
            <MaterialCommunityIcons name="robot-happy-outline" size={20} color={THEME.primary} />
          </View>
          <View style={styles.headerTextContainer}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>AI Travel Guide</Text>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {locationName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleClearChat}
          activeOpacity={0.7}
          disabled={messages.length === 0}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={20}
            color={messages.length === 0 ? 'rgba(255,255,255,0.4)' : THEME.white}
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* Chat Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LottieView
              source={typingAnimation}
              autoPlay
              loop
              style={styles.loadingAnimation}
            />
            <Text style={styles.loadingText}>Loading your conversation...</Text>
          </View>
        ) : messages.length === 0 ? (
          <EmptyState locationName={locationName} onSuggestionPress={handleSuggestionPress} />
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScrollView}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Conversation Start Indicator */}
            <View style={styles.conversationStart}>
              <View style={styles.conversationStartLine} />
              <View style={styles.conversationStartBadge}>
                <MaterialCommunityIcons name="message-text-clock-outline" size={12} color={THEME.gray[400]} />
                <Text style={styles.conversationStartText}>Conversation about {locationName}</Text>
              </View>
              <View style={styles.conversationStartLine} />
            </View>

            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                isFirst={index === 0}
              />
            ))}
            {isSending && <TypingIndicator />}
          </ScrollView>
        )}

        {/* Enhanced Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={24} color={THEME.gray[400]} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Ask anything about this place..."
              placeholderTextColor={THEME.gray[400]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isSending}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
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
                <LinearGradient
                  colors={inputText.trim() ? [THEME.primary, THEME.primaryDark] : [THEME.gray[300], THEME.gray[300]]}
                  style={styles.sendButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="send" size={18} color={THEME.white} />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.inputFooter}>
            <MaterialCommunityIcons name="shield-check-outline" size={12} color={THEME.gray[400]} />
            <Text style={styles.inputHint}>
              AI responses are for guidance. Verify important details locally.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.gray[50],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerIconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Gilroy-Bold',
    color: THEME.white,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 10,
    fontFamily: 'Gilroy-SemiBold',
    color: THEME.white,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  menuButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // Content
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingAnimation: {
    width: 120,
    height: 120,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[500],
  },

  // Messages
  messagesScrollView: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  conversationStart: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  conversationStartLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.gray[200],
  },
  conversationStartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 12,
    gap: 6,
  },
  conversationStartText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[400],
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  assistantBubbleContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 10,
    marginBottom: 4,
  },
  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarContainer: {
    marginLeft: 10,
    marginBottom: 4,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: THEME.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: width * 0.72,
    borderRadius: 22,
    overflow: 'hidden',
  },
  userBubble: {
    marginLeft: 'auto',
  },
  userBubbleGradient: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: THEME.white,
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  assistantBubbleContent: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  userMessageText: {
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: THEME.white,
    lineHeight: 22,
  },
  userMessageTime: {
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'right',
  },
  assistantMessageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.gray[100],
    gap: 6,
  },
  assistantMessageTime: {
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[400],
  },

  // Typing Indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  typingDotMiddle: {
    marginHorizontal: 4,
  },
  typingText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: THEME.primary,
  },

  // Empty State
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyStateHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateIconBg: {
    width: 90,
    height: 90,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: -10,
    gap: 5,
  },
  emptyStateBadgeText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    color: THEME.primary,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[500],
    marginTop: 8,
  },
  emptyStateLocation: {
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[400],
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 21,
  },
  suggestionSection: {
    marginTop: 28,
    width: '100%',
  },
  suggestionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.gray[200],
  },
  suggestionLabel: {
    fontSize: 12,
    fontFamily: 'Gilroy-SemiBold',
    color: THEME.gray[400],
    marginHorizontal: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: THEME.gray[200],
    gap: 8,
  },
  suggestionChipText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[600],
  },
  featureCards: {
    flexDirection: 'row',
    marginTop: 28,
    gap: 12,
  },
  featureCard: {
    alignItems: 'center',
    gap: 8,
  },
  featureIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
    color: THEME.gray[500],
  },

  // Input Area
  inputContainer: {
    backgroundColor: THEME.white,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: BOTTOM_PADDING,
    borderTopWidth: 1,
    borderTopColor: THEME.gray[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: THEME.gray[50],
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: THEME.gray[200],
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: THEME.dark,
    maxHeight: 100,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  inputHint: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[400],
  },
});

export default LocationChatScreen;
