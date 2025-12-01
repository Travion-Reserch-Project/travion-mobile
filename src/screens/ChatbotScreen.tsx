import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const ChatbotScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI travel assistant. How can I help you plan your next adventure?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const quickSuggestions = [
    'Best destinations for winter',
    'Budget travel tips',
    'Flight booking help',
    'Hotel recommendations',
  ];

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputText),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getBotResponse = (_input: string): string => {
    const responses = [
      "Great question! Based on your preferences, I'd recommend exploring these amazing destinations...",
      'Let me help you with that. Here are some personalized travel recommendations for you.',
      "That's an excellent choice! I can suggest some fantastic options that match your travel style.",
      "I'd be happy to assist you with travel planning. Here's what I recommend...",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setInputText(suggestion);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      className={`flex-row mb-4 ${message.isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!message.isUser && (
        <View className="w-10 h-10 bg-primary rounded-full items-center justify-center mr-3">
          <FontAwesome5 name="robot" size={16} color="white" />
        </View>
      )}

      <View
        className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
          message.isUser
            ? 'bg-primary rounded-br-md'
            : 'bg-white border border-gray-200 rounded-bl-md'
        }`}
      >
        <Text
          className={`text-base font-gilroy-regular ${
            message.isUser ? 'text-white' : 'text-gray-900'
          }`}
        >
          {message.text}
        </Text>
        <Text
          className={`text-xs font-gilroy-regular mt-1 ${
            message.isUser ? 'text-white/70' : 'text-gray-500'
          }`}
        >
          {formatTime(message.timestamp)}
        </Text>
      </View>

      {message.isUser && (
        <View className="w-10 h-10 bg-gray-600 rounded-full items-center justify-center ml-3">
          <FontAwesome5 name="user" size={16} color="white" />
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 ">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-primary rounded-full items-center justify-center mr-4">
            <FontAwesome5 name="robot" size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-gilroy-bold text-gray-900">Travel Assistant</Text>
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-sm font-gilroy-regular text-gray-600">Online</Text>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-6 pt-5 pb-5"
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}

          {/* Typing Indicator */}
          {isTyping && (
            <View className="flex-row justify-start mb-4">
              <View className="w-10 h-10 bg-primary rounded-full items-center justify-center mr-3">
                <FontAwesome5 name="robot" size={16} color="white" />
              </View>
              <View className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                <View className="flex-row items-center">
                  <View className="flex-row space-x-1">
                    <View className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                    <View className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                    <View className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestions */}
        {messages.length === 1 && (
          <View className="px-4 pb-4">
            <Text className="text-sm font-gilroy-medium text-gray-600 mb-3">
              Quick suggestions:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-3">
                {quickSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    className="bg-white border border-gray-300 rounded-full px-4 py-2"
                    onPress={() => handleQuickSuggestion(suggestion)}
                  >
                    <Text className="text-sm font-gilroy-regular text-gray-700">{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Input Area */}
        <View className="bg-white px-4 py-4 border-t border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
            <TextInput
              className="flex-1 text-base font-gilroy-regular text-gray-900 py-2"
              placeholder="Type your message..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              className={`ml-3 w-10 h-10 rounded-full items-center justify-center ${
                inputText.trim() ? 'bg-primary' : 'bg-gray-300'
              }`}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
            >
              <FontAwesome5 name="paper-plane" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
