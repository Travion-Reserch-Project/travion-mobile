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
  ActivityIndicator,
  Modal,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Geolocation from '@react-native-community/geolocation';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import { API_CONFIG } from '@constants';
import { useAuthStore } from '@stores';
import { chatService } from '@services';

interface Timetable {
  departure_time: string;
  arrival_time: string;
  duration: string;
  stops: number;
  seat_availability: number;
  price: number;
}

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
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "👋 Hi! I'm your travel assistant. Where do you want to go?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [timetableModalVisible, setTimetableModalVisible] = useState(false);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<TransportRecommendation | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { tokens } = useAuthStore();
  const [_conversationId, _setConversationId] = useState<string | null>(null);
  const [_currentLocation, _setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  const quickSuggestions = [
    'Best destinations for winter',
    'Budget travel tips',
    'Flight booking help',
    'Hotel recommendations',
  ];

  // Initialize geocoding
  useEffect(() => {
    if (Config.GOOGLE_MAPS_API_KEY) {
      RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY as string);
    }
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Fetch current location and send it to chatbot
  const fetchCurrentLocation = async () => {
    try {
      setIsTyping(true);
      Geolocation.getCurrentPosition(
        async position => {
          const { latitude, longitude } = position.coords;
          try {
            const results = await RNGeocoding.from(latitude, longitude);
            const address =
              results?.results?.[0]?.formatted_address ||
              `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;

            _setCurrentLocation({ latitude, longitude, address });

            // Send location to chatbot
            const message = `I'm currently at ${address}`;
            await handleSendMessage(message);
          } catch (err) {
            console.error('Geocoding error:', err);
            _setCurrentLocation({
              latitude,
              longitude,
              address: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
            });
            const message = `I'm at ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
            await handleSendMessage(message);
          }
        },
        _error => {
          setIsTyping(false);
          const errorMsg: Message = {
            id: Date.now().toString(),
            text: 'Unable to get your location. Please check your location settings.',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMsg]);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch (error) {
      setIsTyping(false);
      console.error('Error fetching location:', error);
    }
  };

  const handleSelectLocationOnMap = () => {
    // Navigate to map screen to select location
    navigation.navigate('MapScreen', {});
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText.trim();
    if (!textToSend) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // Call chatbot service
      console.log('Sending message to chatbot...');

      const response = await chatService.sendChatbotMessage(textToSend);

      if (response.success && 'data' in response && response.data) {
        const botData = response.data;
        _setConversationId(botData.conversation_id);

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: botData.message,
          isUser: false,
          timestamp: new Date(),
          recommendations: botData.metadata?.transport_recommendations?.ranked_routes?.map(
            (route: any) => ({
              service_id: route.route_id,
              mode: route.transport_type,
              operator: route.operator_name,
              duration_min: route.dynamic?.duration_min || 0,
              distance_km: route.dynamic?.distance_km || 0,
              fare_lkr: route.static?.base_fare_lkr || 0,
              reliability_stars: 4.5,
              is_recommended: route.ml_confidence > 0.7,
            }),
          ),
          recommendationData: {
            origin: botData.metadata?.locations_identified?.[0]?.name || 'Origin',
            destination: botData.metadata?.locations_identified?.[1]?.name || 'Destination',
          },
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text:
            'error' in response
              ? response.error
              : 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);

      const errorText =
        error.response?.status === 401
          ? '🔐 Authentication failed. Please log in again.'
          : '⚠️ Network connection error. Please check your connection and try again.';

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
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

  const fetchTimetables = async (service: TransportRecommendation, recommendationData: any) => {
    setTimetableLoading(true);
    setSelectedService(service);
    try {
      const baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}`;
      const response = await fetch(
        `${baseUrl}/chat/timetable?service_id=${service.service_id}&departure_date=${recommendationData.departureDate}&departure_time=${recommendationData.departureTime}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokens?.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setTimetables(data.timetables || []);
        setTimetableModalVisible(true);
      } else {
        console.error('Failed to fetch timetables:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching timetables:', error);
    } finally {
      setTimetableLoading(false);
    }
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

  const renderRecommendationCard = (rec: TransportRecommendation, recommendationData?: any) => (
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

      {/* View Timetable Button */}
      <TouchableOpacity
        className="bg-primary rounded-lg py-2 px-4 mt-3"
        onPress={() => recommendationData && fetchTimetables(rec, recommendationData)}
      >
        <View className="flex-row items-center justify-center">
          <FontAwesome5 name="clock" size={14} color="white" />
          <Text className="text-white font-gilroy-bold ml-2">View Timetable</Text>
        </View>
      </TouchableOpacity>
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
          {message.recommendations.map(rec =>
            renderRecommendationCard(rec, message.recommendationData),
          )}
        </View>
      )}

      {/* Show timetable button even if recommendations structure isn't populated */}
      {!message.isUser &&
        message.text.includes('transport options') &&
        message.recommendationData && (
          <TouchableOpacity
            className="mx-3 mt-3 mb-4 bg-primary rounded-lg py-3 px-4"
            onPress={() => {
              const dummyService: TransportRecommendation = {
                service_id: 'SLR_Colombo_Fort_Maradana',
                mode: 'bus',
                operator: 'SLTB',
                duration_min: 45,
                distance_km: 12,
                fare_lkr: 85,
                reliability_stars: 4,
                is_recommended: true,
              };
              fetchTimetables(dummyService, message.recommendationData);
            }}
          >
            <View className="flex-row items-center justify-center">
              <FontAwesome5 name="clock" size={16} color="white" />
              <Text className="text-white font-gilroy-bold ml-2">View Timetables</Text>
            </View>
          </TouchableOpacity>
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
          {/* Location Buttons */}
          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-blue-50 rounded-full py-3 gap-2"
              onPress={handleSelectLocationOnMap}
            >
              <FontAwesome5 name="map" size={14} color="#2563EB" />
              <Text className="text-sm font-gilroy-medium text-blue-600">Select on Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-orange-50 rounded-full py-3 gap-2"
              onPress={fetchCurrentLocation}
              disabled={isTyping}
            >
              <FontAwesome5 name="location-arrow" size={14} color="#F5840E" />
              <Text className="text-sm font-gilroy-medium text-orange-600">My Location</Text>
            </TouchableOpacity>
          </View>

          {/* Text Input */}
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
            <TextInput
              className="flex-1 text-base font-gilroy-regular text-gray-900 py-2"
              placeholder="Where do you want to go?"
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={() => handleSendMessage()}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              className={`ml-3 w-10 h-10 rounded-full items-center justify-center ${
                inputText.trim() ? 'bg-primary' : 'bg-gray-300'
              }`}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim()}
            >
              <FontAwesome5 name="paper-plane" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Timetable Modal */}
      <Modal visible={timetableModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50">
          <View className="flex-1 bg-white rounded-t-3xl mt-16">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <Text className="text-lg font-gilroy-bold text-gray-900">
                {selectedService?.operator} - Timetable
              </Text>
              <TouchableOpacity onPress={() => setTimetableModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Timetable List */}
            {timetableLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#F5840E" />
                <Text className="text-gray-600 mt-3 font-gilroy-regular">
                  Loading timetables...
                </Text>
              </View>
            ) : timetables.length > 0 ? (
              <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
                {timetables.map((timetable, index) => (
                  <View
                    key={index}
                    className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-200"
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View>
                        <Text className="text-base font-gilroy-bold text-gray-900">
                          {timetable.departure_time}
                        </Text>
                        <Text className="text-xs font-gilroy-regular text-gray-600">Departure</Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="w-8 h-0.5 bg-primary mr-2" />
                        <Text className="text-xs font-gilroy-regular text-gray-600">
                          {timetable.duration}
                        </Text>
                        <View className="w-8 h-0.5 bg-primary ml-2" />
                      </View>
                      <View>
                        <Text className="text-base font-gilroy-bold text-gray-900">
                          {timetable.arrival_time}
                        </Text>
                        <Text className="text-xs font-gilroy-regular text-gray-600">Arrival</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between pt-3 border-t border-gray-300">
                      <View className="flex-row items-center">
                        <FontAwesome5 name="chair" size={12} color="#666" />
                        <Text className="text-xs font-gilroy-regular text-gray-600 ml-2">
                          {timetable.seat_availability} seats
                        </Text>
                      </View>
                      <Text className="text-base font-gilroy-bold text-primary">
                        Rs. {timetable.price}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View className="flex-1 items-center justify-center px-6">
                <FontAwesome5 name="calendar-times" size={48} color="#ccc" />
                <Text className="text-center text-gray-600 mt-4 font-gilroy-regular">
                  No timetables available for this service.
                </Text>
              </View>
            )}

            {/* Close Button */}
            <View className="px-6 py-4 border-t border-gray-200">
              <TouchableOpacity
                className="bg-primary rounded-lg py-3"
                onPress={() => setTimetableModalVisible(false)}
              >
                <Text className="text-white font-gilroy-bold text-center">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
