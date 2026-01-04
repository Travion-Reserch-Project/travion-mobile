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
import { chatService } from '@services';

interface TransportRecommendation {
  service_id: string;
  mode: string;
  operator: string;
  duration_min: number;
  distance_km: number;
  fare_lkr: number;
  reliability_stars: number;
  is_recommended: boolean;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  recommendations?: TransportRecommendation[];
  recommendationData?: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    departureTime?: string;
  };
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

  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    const messageToSend = inputText;
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await chatService.sendMessage(messageToSend);

      let displayText = '';
      let recommendations: TransportRecommendation[] | undefined;
      let recommendationData: any;

      if (response.success && response.data) {
        // Check if we have recommendations (ready status)
        if (
          response.data.recommendation?.recommendations &&
          response.data.recommendation.recommendations.length > 0
        ) {
          displayText = `Great! I found ${response.data.recommendation.recommendations.length} transport options for you from ${response.data.recommendation.origin} to ${response.data.recommendation.destination}.`;
          recommendations = response.data.recommendation.recommendations.map((rec: any) => ({
            ...rec,
            reliability_stars:
              typeof rec.reliability_stars === 'string'
                ? parseFloat(rec.reliability_stars)
                : rec.reliability_stars,
          }));
          recommendationData = {
            origin: response.data.recommendation.origin,
            destination: response.data.recommendation.destination,
            departureDate: response.data.recommendation.departure_date,
            departureTime: response.data.recommendation.departure_time,
          };
        } else if (response.data.nextQuestion) {
          // Prefer the direct next question when provided
          displayText = response.data.nextQuestion;
        } else if (response.data.clarificationPrompt) {
          displayText = response.data.clarificationPrompt;
        } else if (response.data.status === 'needs_clarification') {
          displayText =
            'I need more information to help you better. ' +
            (response.data.nextQuestion || 'Please provide more details.');
        } else if (response.data.message) {
          displayText = response.data.message;
        } else {
          displayText = 'Unable to process your request. Please try again.';
        }
      } else {
        displayText =
          response.error || "I'm having trouble processing your request. Please try again.";
      }

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: displayText,
        isUser: false,
        timestamp: new Date(),
        recommendations,
        recommendationData,
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setInputText(suggestion);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTransportIcon = (mode: string): string => {
    switch (mode.toLowerCase()) {
      case 'ridehailing':
        return 'car';
      case 'bus':
        return 'bus';
      case 'train':
        return 'train';
      case 'taxi':
        return 'taxi';
      default:
        return 'shuttle-van';
    }
  };

  const renderRecommendationCard = (rec: TransportRecommendation) => (
    <View
      key={rec.service_id}
      className={`rounded-xl p-4 mb-3 border-2 ${
        rec.is_recommended ? 'bg-green-50 border-green-400' : 'bg-white border-gray-200'
      }`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <View
            className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
              rec.is_recommended ? 'bg-green-100' : 'bg-primary/10'
            }`}
          >
            <FontAwesome5
              name={getTransportIcon(rec.mode)}
              size={18}
              color={rec.is_recommended ? '#16A34A' : '#F5840E'}
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-gilroy-bold text-gray-900">{rec.operator}</Text>
            <Text className="text-xs font-gilroy-regular text-gray-600 capitalize">{rec.mode}</Text>
          </View>
        </View>
        {rec.is_recommended && (
          <View className="bg-green-500 px-3 py-1.5 rounded-full">
            <Text className="text-xs font-gilroy-bold text-white">✓ Recommended</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderMessage = (message: Message) => (
    <View key={message.id}>
      <View className={`flex-row mb-4 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
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

      {/* Render recommendations if available */}
      {message.recommendations && message.recommendations.length > 0 && (
        <View className="mb-4 px-3">
          {message.recommendations.map(rec => renderRecommendationCard(rec))}
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
