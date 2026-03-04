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
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import { API_CONFIG } from '@constants';
import { useAuthStore } from '@stores';
import { chatService, type Conversation } from '@services';
import { getCurrentPosition } from '@utils';
import { RouteMapModal, type ChatMapData } from '@components/transport/RouteMapModal';

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

interface RouteDetails {
  route_id: string;
  transport_type: string;
  operator_name: string;
  score: number;
  duration_min: number;
  distance_km: number;
  fare_lkr: number;
  congestion?: string;
  weather_conditions?: string;
  navigation_steps?: Array<{
    instruction: string;
    distance: number;
    duration: number;
    travel_mode: string;
  }>;
}

// Enhanced Route Card Component
const RouteCard: React.FC<{ route: RouteDetails; index: number }> = ({ route, index }) => {
  const [expanded, setExpanded] = useState(false);

  const getMedalEmoji = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return '📍';
  };

  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  return (
    <View className="mb-3 mx-3">
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        className={`bg-white rounded-xl border-2 overflow-hidden shadow-sm ${
          index === 0 ? 'border-green-500' : 'border-gray-200'
        }`}
      >
        {/* Header */}
        <View className={`p-4 ${index === 0 ? 'bg-green-50' : 'bg-white'}`}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              <Text className="text-2xl mr-2">{getMedalEmoji(index)}</Text>
              <View className="flex-1">
                <Text className="text-base font-gilroy-bold text-gray-900" numberOfLines={1}>
                  {route.operator_name}
                </Text>
                <Text className="text-xs font-gilroy-medium text-gray-600 capitalize">
                  {route.transport_type}
                </Text>
              </View>
            </View>
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-sm font-gilroy-bold text-blue-700">{route.score}/100</Text>
            </View>
          </View>

          {/* Key Metrics */}
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <View className="flex-1 items-center">
              <FontAwesome5 name="clock" size={14} color="#6B7280" />
              <Text className="text-xs font-gilroy-bold text-gray-900 mt-1">
                {formatDuration(route.duration_min)}
              </Text>
              <Text className="text-xs font-gilroy-regular text-gray-500">Duration</Text>
            </View>
            <View className="flex-1 items-center">
              <FontAwesome5 name="road" size={14} color="#6B7280" />
              <Text className="text-xs font-gilroy-bold text-gray-900 mt-1">
                {route.distance_km.toFixed(1)} km
              </Text>
              <Text className="text-xs font-gilroy-regular text-gray-500">Distance</Text>
            </View>
            <View className="flex-1 items-center">
              <FontAwesome5 name="money-bill-wave" size={14} color="#6B7280" />
              <Text className="text-xs font-gilroy-bold text-gray-900 mt-1">
                LKR {route.fare_lkr}
              </Text>
              <Text className="text-xs font-gilroy-regular text-gray-500">Fare</Text>
            </View>
          </View>

          {/* Status Badges */}
          <View className="flex-row items-center mt-3 gap-2">
            {route.weather_conditions && (
              <View className="bg-green-100 px-2 py-1 rounded-full">
                <Text className="text-xs font-gilroy-medium text-green-700">
                  ✅ {route.weather_conditions}
                </Text>
              </View>
            )}
            {route.congestion && (
              <View className="bg-green-100 px-2 py-1 rounded-full">
                <Text className="text-xs font-gilroy-medium text-green-700">
                  🟢 {route.congestion} traffic
                </Text>
              </View>
            )}
          </View>

          {/* Expand/Collapse Indicator */}
          <View className="flex-row items-center justify-center mt-3 pt-2 border-t border-gray-200">
            <Text className="text-xs font-gilroy-medium text-gray-500 mr-1">
              {expanded ? 'Hide' : 'View'} turn-by-turn directions
            </Text>
            <FontAwesome5
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={10}
              color="#6B7280"
            />
          </View>
        </View>

        {/* Expandable Directions */}
        {expanded && route.navigation_steps && route.navigation_steps.length > 0 && (
          <View className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
            <Text className="text-sm font-gilroy-bold text-gray-900 mb-3 mt-3">
              🗺️ Turn-by-Turn Directions
            </Text>
            {route.navigation_steps.map((step, idx) => (
              <View key={idx} className="flex-row mb-3">
                <View className="w-6 h-6 rounded-full bg-primary items-center justify-center mr-3 mt-1">
                  <Text className="text-xs font-gilroy-bold text-white">{idx + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-gilroy-regular text-gray-800">
                    {step.instruction.split('\n')[0]}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-xs font-gilroy-medium text-gray-500">
                      {(step.distance / 1000).toFixed(1)} km • {Math.round(step.duration / 60)} min
                    </Text>
                    <View className="ml-2 bg-gray-200 px-2 py-0.5 rounded">
                      <Text className="text-xs font-gilroy-medium text-gray-700 capitalize">
                        {step.travel_mode.toLowerCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

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
  routeSummary?: {
    departureTime?: string;
    distance?: string;
    reasoning?: string;
  };
  routeDetails?: RouteDetails[];
  mapData?: ChatMapData;
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
  const [routeMapVisible, setRouteMapVisible] = useState(false);
  const [activeMapData, setActiveMapData] = useState<ChatMapData | null>(null);
  const [selectedMapRouteId, setSelectedMapRouteId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { tokens } = useAuthStore();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentTripTitle, setCurrentTripTitle] = useState<string>('New Trip');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showConversationsModal, setShowConversationsModal] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
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
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Create new trip/conversation
  const handleNewTrip = async () => {
    try {
      setIsTyping(true);
      const response = await chatService.createNewTrip();

      if (response.success && 'data' in response) {
        setConversationId(response.data.conversation_id);
        setCurrentTripTitle(response.data.title);
        setMessages([
          {
            id: '1',
            text:
              response.data.message || "👋 Hi! I'm your travel assistant. Where do you want to go?",
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      } else {
        console.error(
          'Failed to create new trip:',
          'error' in response ? response.error : 'Unknown error',
        );
      }
    } catch (error) {
      console.error('Error creating new trip:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Load conversation history
  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const response = await chatService.getConversations();

      if (response.success && 'data' in response) {
        setConversations(response.data.conversations);
      } else {
        console.error(
          'Failed to load conversations:',
          'error' in response ? response.error : 'Unknown error',
        );
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Load messages from a specific conversation
  const loadConversation = async (conversation: Conversation) => {
    try {
      setIsTyping(true);
      setShowConversationsModal(false);
      const response = await chatService.getConversationMessages(conversation.conversation_id);

      if (response.success && 'data' in response) {
        setConversationId(conversation.conversation_id);
        setCurrentTripTitle(conversation.title);

        // Convert backend messages to UI message format
        const loadedMessages: Message[] = response.data.messages.map((msg: any, idx: number) => ({
          id: `${msg.message_id}-${idx}`,
          text: msg.message,
          isUser: msg.sender === 'user',
          timestamp: new Date(msg.created_at),
          // Add metadata if available for bot messages
          ...(msg.sender === 'bot' && msg.metadata
            ? {
                routeSummary: extractRouteSummary(msg.message),
                routeDetails: msg.metadata.transport_recommendations?.ranked_routes?.map(
                  (route: any) => ({
                    route_id: route.route_id,
                    transport_type: route.transport_type,
                    operator_name: route.operator_name,
                    score: Math.round((route.score || 0) * 100),
                    duration_min:
                      route.dynamic?.duration_min || route.static?.estimated_duration_min || 0,
                    distance_km: route.dynamic?.distance_km || route.static?.distance_km || 0,
                    fare_lkr: route.static?.base_fare_lkr || 0,
                    congestion: route.dynamic?.congestion,
                    weather_conditions:
                      route.dynamic?.weather_risk < 0.2 ? 'Good weather' : 'Check weather',
                    navigation_steps: route.static?.navigation_steps,
                  }),
                ),
                mapData: extractMapData(msg.metadata),
              }
            : {}),
        }));

        setMessages(loadedMessages);
      } else {
        console.error(
          'Failed to load conversation messages:',
          'error' in response ? response.error : 'Unknown error',
        );
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper function to extract route summary
  const extractRouteSummary = (messageText: string) => {
    const summaryMatch = messageText.match(
      /\*\*Route Summary:\*\*([\s\S]*?)\*\*Detailed Route Options:\*\*/,
    );
    if (!summaryMatch) return undefined;

    const summaryText = summaryMatch[1];
    const departureTimeMatch = summaryText.match(/Departure time considered: ([^\n]+)/);
    const distanceMatch = summaryText.match(/Estimated trip distance: ([^\n]+)/);
    const reasoningMatch = summaryText.match(/Reasoning: ([^\n]+)/);

    return {
      departureTime: departureTimeMatch?.[1]?.trim(),
      distance: distanceMatch?.[1]?.trim(),
      reasoning: reasoningMatch?.[1]?.trim(),
    };
  };

  // Helper function to extract map data
  const extractMapData = (metadata: any): ChatMapData | undefined => {
    const mapData = metadata?.map_data;
    if (!mapData?.origin || !mapData?.destination || !Array.isArray(mapData.routes)) {
      return undefined;
    }

    return {
      origin: {
        lat: mapData.origin.lat,
        lng: mapData.origin.lng,
      },
      destination: {
        lat: mapData.destination.lat,
        lng: mapData.destination.lng,
      },
      routes: mapData.routes
        .filter((route: any) => typeof route?.polyline === 'string' && route.polyline.length > 0)
        .map((route: any, index: number) => ({
          route_id: route.route_id,
          transport_type: route.transport_type,
          polyline: route.polyline,
          color: route.color || ['#3B82F6', '#F97316', '#10B981'][index % 3],
          navigation_steps: route.navigation_steps || [],
        })),
    };
  };

  // Fetch current location and send it to chatbot
  const fetchCurrentLocation = async () => {
    try {
      setIsTyping(true);
      const position = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
        retryAttempts: 1,
      });

      const { latitude, longitude } = position;

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
    } catch (error) {
      setIsTyping(false);
      console.error('Error fetching location:', error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        text: 'Unable to get your location. Please check your location settings.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
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
        setConversationId(botData.conversation_id);

        // Extract route summary from message
        const fullMessageText = botData.message;
        const summaryMatch = fullMessageText.match(
          /\*\*Route Summary:\*\*([\s\S]*?)\*\*Detailed Route Options:\*\*/,
        );
        let routeSummary;

        if (summaryMatch) {
          const summaryText = summaryMatch[1];
          const departureTimeMatch = summaryText.match(/Departure time considered: ([^\n]+)/);
          const distanceMatch = summaryText.match(/Estimated trip distance: ([^\n]+)/);
          const reasoningMatch = summaryText.match(/Reasoning: ([^\n]+)/);

          routeSummary = {
            departureTime: departureTimeMatch?.[1]?.trim(),
            distance: distanceMatch?.[1]?.trim(),
            reasoning: reasoningMatch?.[1]?.trim(),
          };
        }

        // Extract simplified message (just the intro)
        const simplifiedMessage =
          fullMessageText.split('**Route Summary:**')[0]?.trim() || fullMessageText;

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: simplifiedMessage,
          isUser: false,
          timestamp: new Date(),
          routeSummary,
          routeDetails: botData.metadata?.transport_recommendations?.ranked_routes?.map(
            (route: any) => ({
              route_id: route.route_id,
              transport_type: route.transport_type,
              operator_name: route.operator_name,
              score: Math.round((route.score || 0) * 100),
              duration_min:
                route.dynamic?.duration_min || route.static?.estimated_duration_min || 0,
              distance_km: route.dynamic?.distance_km || route.static?.distance_km || 0,
              fare_lkr: route.static?.base_fare_lkr || 0,
              congestion: route.dynamic?.congestion,
              weather_conditions:
                route.dynamic?.weather_risk < 0.2 ? 'Good weather' : 'Check weather',
              navigation_steps: route.static?.navigation_steps,
            }),
          ),
          mapData: (() => {
            const mapData = botData.metadata?.map_data;
            if (!mapData?.origin || !mapData?.destination || !Array.isArray(mapData.routes)) {
              return undefined;
            }

            return {
              origin: {
                lat: mapData.origin.lat,
                lng: mapData.origin.lng,
              },
              destination: {
                lat: mapData.destination.lat,
                lng: mapData.destination.lng,
              },
              routes: mapData.routes
                .filter(
                  (route: any) => typeof route?.polyline === 'string' && route.polyline.length > 0,
                )
                .map((route: any, index: number) => ({
                  route_id: route.route_id,
                  transport_type: route.transport_type,
                  polyline: route.polyline,
                  color: route.color || ['#3B82F6', '#F97316', '#10B981'][index % 3],
                  navigation_steps: route.navigation_steps || [],
                })),
            } as ChatMapData;
          })(),
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

  const openRouteMap = (mapData: ChatMapData, routeId?: string) => {
    setActiveMapData(mapData);
    setSelectedMapRouteId(routeId || mapData.routes?.[0]?.route_id || null);
    setRouteMapVisible(true);
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

      {/* Render Route Summary if available */}
      {!message.isUser && message.routeSummary && (
        <View className="mb-3">
          <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <View className="flex-row items-center mb-2">
              <FontAwesome5 name="info-circle" size={16} color="#2563EB" />
              <Text className="ml-2 text-sm font-gilroy-bold text-blue-900">Trip Summary</Text>
            </View>
            {message.routeSummary.departureTime && (
              <View className="flex-row items-center mb-1">
                <FontAwesome5 name="clock" size={12} color="#6B7280" />
                <Text className="ml-2 text-sm font-gilroy-regular text-gray-700">
                  {message.routeSummary.departureTime}
                </Text>
              </View>
            )}
            {message.routeSummary.distance && (
              <View className="flex-row items-center mb-1">
                <FontAwesome5 name="route" size={12} color="#6B7280" />
                <Text className="ml-2 text-sm font-gilroy-regular text-gray-700">
                  {message.routeSummary.distance}
                </Text>
              </View>
            )}
            {message.routeSummary.reasoning && (
              <View className="mt-2 p-3 bg-blue-100 rounded-lg">
                <Text className="text-xs font-gilroy-medium text-blue-900">
                  💡 {message.routeSummary.reasoning}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Render Enhanced Route Cards */}
      {!message.isUser && message.routeDetails && message.routeDetails.length > 0 && (
        <View className="mb-4">
          {message.routeDetails.slice(0, 3).map((route, index) => {
            const hasMapRoute = Boolean(
              message.mapData?.routes?.some(mapRoute => mapRoute.route_id === route.route_id),
            );

            return (
              <View key={route.route_id}>
                <RouteCard route={route} index={index} />
                {hasMapRoute && (
                  <TouchableOpacity
                    className="mx-3 -mt-1 mb-3 bg-blue-600 rounded-lg py-2.5 px-4"
                    onPress={() => openRouteMap(message.mapData as ChatMapData, route.route_id)}
                  >
                    <View className="flex-row items-center justify-center">
                      <FontAwesome5 name="map-marked-alt" size={14} color="white" />
                      <Text className="text-white font-gilroy-bold ml-2">Display on Map</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Render recommendations if available (fallback for old format) */}
      {message.recommendations && message.recommendations.length > 0 && !message.routeDetails && (
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
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 bg-primary rounded-full items-center justify-center mr-4">
              <FontAwesome5 name="robot" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-gilroy-bold text-gray-900">{currentTripTitle}</Text>
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-sm font-gilroy-regular text-gray-600">
                  {conversationId ? 'Active Trip' : 'Ready to plan'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            className="ml-2"
            onPress={() => {
              loadConversations();
              setShowConversationsModal(true);
            }}
          >
            <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
              <FontAwesome5 name="history" size={18} color="#6B7280" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 bg-primary rounded-lg py-2.5 px-3"
            onPress={handleNewTrip}
          >
            <View className="flex-row items-center justify-center">
              <FontAwesome5 name="plus-circle" size={14} color="white" />
              <Text className="text-white font-gilroy-bold ml-2">New Trip</Text>
            </View>
          </TouchableOpacity>
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

      {/* Conversations Modal */}
      <Modal visible={showConversationsModal} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50">
          <View className="flex-1 bg-white rounded-t-3xl mt-16">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <Text className="text-lg font-gilroy-bold text-gray-900">My Trips</Text>
              <TouchableOpacity onPress={() => setShowConversationsModal(false)}>
                <FontAwesome5 name="times" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Conversations List */}
            {loadingConversations ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#F5840E" />
                <Text className="text-gray-600 mt-3 font-gilroy-regular">Loading trips...</Text>
              </View>
            ) : conversations.length > 0 ? (
              <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
                {conversations.map(conversation => (
                  <TouchableOpacity
                    key={conversation.conversation_id}
                    className={`bg-gray-50 rounded-xl p-4 mb-3 border ${
                      conversationId === conversation.conversation_id
                        ? 'border-primary'
                        : 'border-gray-200'
                    }`}
                    onPress={() => {
                      loadConversation(conversation);
                      setShowConversationsModal(false);
                    }}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <Text className="text-base font-gilroy-bold text-gray-900 flex-1">
                        {conversation.title}
                      </Text>
                      {conversationId === conversation.conversation_id && (
                        <View className="bg-primary rounded-full px-2 py-1">
                          <Text className="text-xs font-gilroy-bold text-white">Active</Text>
                        </View>
                      )}
                    </View>

                    {conversation.last_message && (
                      <Text
                        className="text-sm font-gilroy-regular text-gray-600 mb-2"
                        numberOfLines={2}
                      >
                        {conversation.last_message}
                      </Text>
                    )}

                    <View className="flex-row items-center justify-between pt-2 border-t border-gray-300">
                      <View className="flex-row items-center">
                        <FontAwesome5 name="comments" size={12} color="#666" />
                        <Text className="text-xs font-gilroy-regular text-gray-600 ml-2">
                          {conversation.message_count} messages
                        </Text>
                      </View>
                      <Text className="text-xs font-gilroy-regular text-gray-500">
                        {new Date(conversation.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View className="flex-1 items-center justify-center px-6">
                <FontAwesome5 name="map-marked-alt" size={48} color="#ccc" />
                <Text className="text-center text-gray-600 mt-4 font-gilroy-bold">
                  No trips yet
                </Text>
                <Text className="text-center text-gray-500 mt-2 font-gilroy-regular">
                  Start planning your first trip by tapping "New Trip"
                </Text>
              </View>
            )}

            {/* Close Button */}
            <View className="px-6 py-4 border-t border-gray-200">
              <TouchableOpacity
                className="bg-primary rounded-lg py-3"
                onPress={() => setShowConversationsModal(false)}
              >
                <Text className="text-white font-gilroy-bold text-center">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <RouteMapModal
        visible={routeMapVisible}
        mapData={activeMapData}
        selectedRouteId={selectedMapRouteId}
        onSelectRoute={setSelectedMapRouteId}
        onClose={() => setRouteMapVisible(false)}
      />
    </View>
  );
};
