/**
 * LocationChatScreen
 * AI-powered chat screen focused on a specific location
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { useChatStore } from '@stores';
import type { ChatMessage } from '@types';

const { width } = Dimensions.get('window');
const BOTTOM_PADDING = Platform.OS === 'ios' ? 34 : 20;

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

// Message bubble component
const MessageBubble: React.FC<{
  message: ChatMessage;
  isLast: boolean;
}> = ({ message, isLast }) => {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.messageBubbleContainer,
        isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.aiAvatar}>
            <MaterialCommunityIcons name="robot-happy" size={18} color="#8B5CF6" />
          </View>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          isLast && !isUser && styles.lastAssistantBubble,
        ]}
      >
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {message.content}
        </Text>
        <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
};

// Format timestamp
const formatTime = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Typing indicator component
const TypingIndicator: React.FC = () => (
  <View style={styles.typingContainer}>
    <View style={styles.avatarContainer}>
      <View style={styles.aiAvatar}>
        <MaterialCommunityIcons name="robot-happy" size={18} color="#8B5CF6" />
      </View>
    </View>
    <View style={styles.typingBubble}>
      <LottieView
        source={typingAnimation}
        autoPlay
        loop
        style={styles.typingAnimation}
      />
      <Text style={styles.typingText}>AI is thinking...</Text>
    </View>
  </View>
);

// Empty state component
const EmptyState: React.FC<{ locationName: string }> = ({ locationName }) => (
  <View style={styles.emptyStateContainer}>
    <View style={styles.emptyStateIcon}>
      <MaterialCommunityIcons name="chat-question-outline" size={48} color="#8B5CF6" />
    </View>
    <Text style={styles.emptyStateTitle}>Ask me anything about</Text>
    <Text style={styles.emptyStateLocation}>{locationName}</Text>
    <Text style={styles.emptyStateSubtitle}>
      I can help you with history, best times to visit, activities, tips, and more!
    </Text>

    <View style={styles.suggestionContainer}>
      <Text style={styles.suggestionLabel}>Try asking:</Text>
      <View style={styles.suggestionChips}>
        <View style={styles.suggestionChip}>
          <Text style={styles.suggestionText}>"What's the best time to visit?"</Text>
        </View>
        <View style={styles.suggestionChip}>
          <Text style={styles.suggestionText}>"Tell me about the history"</Text>
        </View>
        <View style={styles.suggestionChip}>
          <Text style={styles.suggestionText}>"What should I wear?"</Text>
        </View>
      </View>
    </View>
  </View>
);

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
    // Scroll to bottom when messages change
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

  const handleClearChat = useCallback(() => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIconBg}>
            <MaterialCommunityIcons name="robot-happy" size={18} color="#8B5CF6" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              AI Guide
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {locationName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearChat}
          activeOpacity={0.7}
          disabled={messages.length === 0}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={messages.length === 0 ? '#D1D5DB' : '#6B7280'}
          />
        </TouchableOpacity>
      </View>

      {/* Chat Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading chat history...</Text>
          </View>
        ) : messages.length === 0 ? (
          <EmptyState locationName={locationName} />
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScrollView}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}
            {isSending && <TypingIndicator />}
          </ScrollView>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Ask about this location..."
              placeholderTextColor="#9CA3AF"
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
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.inputHint}>
            AI responses are based on travel knowledge and may not be 100% accurate
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  clearButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: '#6B7280',
  },

  // Messages
  messagesScrollView: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  assistantBubbleContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 6,
    marginLeft: 'auto',
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lastAssistantBubble: {
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: '#1F2937',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: '#9CA3AF',
    marginTop: 6,
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  typingAnimation: {
    width: 32,
    height: 24,
  },
  typingText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: '#8B5CF6',
    marginLeft: 4,
  },

  // Empty State
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Medium',
    color: '#6B7280',
  },
  emptyStateLocation: {
    fontSize: 22,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  suggestionContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  suggestionLabel: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: '#6B7280',
    marginBottom: 12,
  },
  suggestionChips: {
    alignItems: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Input Area
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: BOTTOM_PADDING,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: '#1F2937',
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  inputHint: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default LocationChatScreen;
