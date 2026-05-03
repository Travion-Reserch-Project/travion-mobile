/**
 * TourPlanChatScreen
 * WhatsApp-style AI-powered chat screen for tour plan generation and refinement
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
import SelectionPrompt from '../../components/chat/SelectionPrompt';
import TimelineItinerary from '../../components/chat/TimelineItinerary';
import TourPlanMapView from '../../components/chat/TourPlanMapView';
import { useInterruptResume } from '../../hooks/useInterruptResume';
import { ApiError } from '../../services/api/client';
import {
  tourPlanService,
  type TourPlanResponse,
  type SelectedLocation,
  type ItinerarySlot,
  type TourPlanMetadata,
  type ClarificationQuestion,
  type CulturalTip,
  type EventInfo,
  type FinalItinerary,
  type HotelSearchResult,
  type SelectionCard,
  type WeatherPromptOption,
} from '../../services/api';

const { width } = Dimensions.get('window');
const BOTTOM_PADDING = Platform.OS === 'ios' ? 34 : 16;

// WhatsApp-inspired theme
const THEME = {
  primary: '#F5840E', // Brand orange (header only)
  primaryDark: '#C2410C',
  chatBg: '#ECE5DD', // WhatsApp chat background
  userBubble: '#DCF8C6', // WhatsApp green bubble
  aiBubble: '#FFFFFF', // White AI bubble
  headerBg: '#075E54', // WhatsApp dark green header (or keep brand)
  inputBg: '#FFFFFF',
  sendBtn: '#075E54',
  tickColor: '#4FC3F7', // Blue double-tick
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
  poya: '#7C3AED', // Purple for Poya events
  holiday: '#3B82F6', // Blue for holidays
  festival: '#F59E0B', // Amber for festivals
};

interface TourPlanChatScreenProps {
  route: {
    params: {
      selectedLocations: SelectedLocation[];
      startDate: string;
      endDate: string;
      preferences?: string[];
    };
  };
  navigation: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'plan' | 'clarification' | 'event' | 'weather_alert' | 'hotel_results' | 'selection_cards' | 'weather_decision';
  content: string;
  timestamp: Date;
  planData?: {
    itinerary: ItinerarySlot[];
    metadata: TourPlanMetadata;
    warnings?: string[];
    tips?: string[];
    culturalTips?: CulturalTip[];
    finalItinerary?: FinalItinerary;
    weatherData?: Record<string, any>;
  };
  clarificationData?: ClarificationQuestion;
  events?: EventInfo[];
  interruptReason?: string;
  hotelResults?: HotelSearchResult[];
  // HITL selection & weather interrupt data
  selectionCards?: SelectionCard[];
  weatherPromptMessage?: string;
  weatherPromptOptions?: WeatherPromptOption[];
  threadId?: string;
}

// Format timestamp like WhatsApp (HH:MM)
const formatTime = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date range
const formatDateRange = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString(
    'en-US',
    options,
  )}`;
};

// Date separator component (WhatsApp style)
const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
  <View style={styles.dateSeparator}>
    <View style={styles.dateSeparatorPill}>
      <Text style={styles.dateSeparatorText}>{date}</Text>
    </View>
  </View>
);

// Event info bubble
const EventBubble: React.FC<{ events: EventInfo[] }> = ({ events }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const getEventColor = (type: string): string => {
    if (type === 'poya') return THEME.poya;
    if (type === 'holiday') return THEME.holiday;
    if (type === 'festival') return THEME.festival;
    return THEME.gray[600];
  };

  const getEventIcon = (type: string): string => {
    if (type === 'poya') return 'moon-waning-crescent';
    if (type === 'holiday') return 'flag-variant';
    if (type === 'festival') return 'party-popper';
    return 'calendar';
  };

  return (
    <Animated.View style={[styles.eventContainer, { opacity: fadeAnim }]}>
      <View style={styles.eventBubble}>
        <View style={styles.eventHeader}>
          <MaterialCommunityIcons name="calendar-alert" size={16} color={THEME.poya} />
          <Text style={styles.eventHeaderText}>Special Events</Text>
        </View>
        {events.map((event, index) => (
          <View key={index} style={styles.eventItem}>
            <View style={[styles.eventDot, { backgroundColor: getEventColor(event.type) }]}>
              <MaterialCommunityIcons
                name={getEventIcon(event.type)}
                size={12}
                color={THEME.white}
              />
            </View>
            <View style={styles.eventContent}>
              <Text style={styles.eventName}>{event.name}</Text>
              {event.date ? <Text style={styles.eventDate}>{event.date}</Text> : null}
              {event.impact ? <Text style={styles.eventImpact}>{event.impact}</Text> : null}
              {event.warnings && event.warnings.length > 0 && (
                <View style={styles.eventWarnings}>
                  {event.warnings.map((w, i) => (
                    <Text key={i} style={styles.eventWarningText}>
                      {w}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

// Weather alert bubble (shown when constraint interrupt is weather-related)
const WeatherAlertBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const reason = message.interruptReason || '';
  const isRain = reason.includes('rain');
  const isHeat = reason.includes('heat');
  const isPoya = reason.includes('poya');

  const getAlertConfig = () => {
    if (isRain) return { icon: 'weather-pouring', color: '#3B82F6', label: 'Rain Alert' };
    if (isHeat) return { icon: 'weather-sunny-alert', color: '#EF4444', label: 'Heat Alert' };
    if (isPoya) return { icon: 'moon-waning-crescent', color: '#7C3AED', label: 'Poya Day Alert' };
    return { icon: 'alert-circle', color: '#F59E0B', label: 'Weather Alert' };
  };

  const config = getAlertConfig();

  return (
    <Animated.View style={[styles.aiBubbleRow, { opacity: fadeAnim }]}>
      <View style={[styles.weatherAlertBubble, { borderLeftColor: config.color }]}>
        <View style={styles.weatherAlertHeader}>
          <MaterialCommunityIcons name={config.icon} size={18} color={config.color} />
          <Text style={[styles.weatherAlertLabel, { color: config.color }]}>{config.label}</Text>
        </View>
        <Text style={styles.weatherAlertText}>{message.content}</Text>
        <Text style={styles.bubbleTime}>{formatTime(message.timestamp)}</Text>
      </View>
    </Animated.View>
  );
};

// Hotel search results card
const HotelSearchCard: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (!message.hotelResults || message.hotelResults.length === 0) return null;

  const getTypeIcon = (type: string): string => {
    if (type === 'restaurant') return 'food-fork-drink';
    if (type === 'bar') return 'glass-cocktail';
    return 'bed';
  };

  const getPriceColor = (price?: string): string => {
    if (price === '$$$') return '#EF4444';
    if (price === '$$') return '#F59E0B';
    return '#10B981';
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <FontAwesome5
          key={i}
          name="star"
          solid={i < fullStars}
          size={10}
          color={i < fullStars ? '#F59E0B' : THEME.gray[300]}
          style={{ marginRight: 1 }}
        />,
      );
    }
    return <View style={{ flexDirection: 'row', marginTop: 2 }}>{stars}</View>;
  };

  return (
    <Animated.View style={[styles.aiBubbleRow, { opacity: fadeAnim }]}>
      <View style={styles.hotelSearchBubble}>
        <View style={styles.hotelSearchHeader}>
          <MaterialCommunityIcons name="magnify" size={16} color={THEME.primary} />
          <Text style={styles.hotelSearchTitle}>
            {message.hotelResults[0]?.type === 'restaurant' ? 'Restaurants' :
              message.hotelResults[0]?.type === 'bar' ? 'Nightlife' : 'Hotels'} Found
          </Text>
        </View>
        {message.hotelResults.map((result, index) => (
          <View key={index} style={styles.hotelResultItem}>
            <View style={styles.hotelResultIcon}>
              <MaterialCommunityIcons
                name={getTypeIcon(result.type)}
                size={16}
                color={THEME.primary}
              />
            </View>
            <View style={styles.hotelResultContent}>
              <View style={styles.hotelResultNameRow}>
                <Text style={styles.hotelResultName} numberOfLines={1}>{result.name}</Text>
                {result.price_range && (
                  <Text style={[styles.hotelPriceBadge, { color: getPriceColor(result.price_range) }]}>
                    {result.price_range}
                  </Text>
                )}
              </View>
              {renderStars(result.rating)}
              <Text style={styles.hotelResultDesc} numberOfLines={2}>{result.description}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.bubbleTime}>{formatTime(message.timestamp)}</Text>
      </View>
    </Animated.View>
  );
};

// Clarification question bubble
const ClarificationBubble: React.FC<{
  message: ChatMessage;
  onSelectOption: (optionLabel: string) => void;
  disabled: boolean;
}> = ({ message, onSelectOption, disabled }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (!message.clarificationData) return null;

  const { question, options, context } = message.clarificationData;

  return (
    <Animated.View style={[styles.aiBubbleRow, { opacity: fadeAnim }]}>
      <View style={styles.clarificationBubble}>
        <View style={styles.clarificationHeader}>
          <MaterialCommunityIcons name="help-circle" size={16} color={THEME.primary} />
          <Text style={styles.clarificationLabel}>Quick Question</Text>
        </View>
        <Text style={styles.clarificationQuestion}>{question}</Text>
        {context ? <Text style={styles.clarificationContext}>{context}</Text> : null}
        <View style={styles.clarificationOptions}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.clarificationOption,
                option.recommended && styles.clarificationOptionRecommended,
              ]}
              onPress={() => onSelectOption(option.label)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <View style={styles.clarificationOptionRow}>
                <Text
                  style={[
                    styles.clarificationOptionLabel,
                    option.recommended && styles.clarificationOptionLabelHighlight,
                  ]}
                >
                  {option.label}
                </Text>
                {option.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>Recommended</Text>
                  </View>
                )}
              </View>
              <Text style={styles.clarificationOptionDesc}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.bubbleTime}>{formatTime(message.timestamp)}</Text>
      </View>
    </Animated.View>
  );
};

// WhatsApp-style message bubble
const MessageBubble: React.FC<{
  message: ChatMessage;
  onSave?: () => void;
  isSaving?: boolean;
}> = ({ message, onSave, isSaving }) => {
  const isUser = message.role === 'user';
  const isPlan = message.role === 'plan';
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Markdown styles for AI messages
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
    bullet_list_icon: { marginRight: 8, color: THEME.primary },
  };

  if (isPlan && message.planData) {
    return (
      <Animated.View style={[styles.planBubbleContainer, { opacity: fadeAnim }]}>
        {/* Embedded map view with stops grouped by time-of-day */}
        {message.planData.finalItinerary && message.planData.finalItinerary.stops?.length > 0 ? (
          <TourPlanMapView finalItinerary={message.planData.finalItinerary} />
        ) : message.planData.finalItinerary ? (
          <TimelineItinerary itinerary={message.planData.finalItinerary} />
        ) : (
          /* Fallback: show plan summary as markdown when finalItinerary is missing */
          <View style={styles.assistantBubble}>
            <Markdown style={markdownStyles}>{message.content}</Markdown>
          </View>
        )}
        {/* Save Tour Plan button */}
        {onSave && (
          <TouchableOpacity
            style={[styles.savePlanButton, isSaving && styles.savePlanButtonDisabled]}
            onPress={onSave}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            <LinearGradient
              colors={['#F5840E', '#C2410C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.savePlanButtonGradient}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="bookmark" size={18} color="#fff" />
              )}
              <Text style={styles.savePlanButtonText}>
                {isSaving ? 'Saving...' : 'Save Tour Plan'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }

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
            <Text style={styles.bubbleTime}>{formatTime(message.timestamp)}</Text>
          </>
        )}
      </View>
    </Animated.View>
  );
};

// Typing indicator (WhatsApp style)
const TypingIndicator: React.FC<{ message?: string }> = () => {
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

export const TourPlanChatScreen: React.FC<TourPlanChatScreenProps> = ({ route, navigation }) => {
  const { selectedLocations, startDate, endDate, preferences } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<TourPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{
    cards: SelectionCard[];
    promptText?: string;
  } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // HITL interrupt/resume hook
  const {
    interruptState,
    isResuming,
    detectInterrupt,
    clearInterrupt,
    resumeSelection,
    resumeWeather,
  } = useInterruptResume(threadId);

  // Initial plan generation - runs once on mount
  useEffect(() => {
    generateInitialPlan();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isSending]);

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: () => setError(null) }]);
    }
  }, [error]);

  const handleApiResponse = (response: TourPlanResponse) => {
    setCurrentPlan(response);
    const newMessages: ChatMessage[] = [];

    // Show events if available
    if (response.events && response.events.length > 0) {
      newMessages.push({
        id: (Date.now() + 1).toString(),
        role: 'event',
        content: 'Special events detected',
        timestamp: new Date(),
        events: response.events,
      });
    }

    // Show weather alert if constraint interrupt triggered
    if (response.interruptReason) {
      const alertText = response.interruptReason.includes('rain')
        ? 'Heavy rain is predicted for some locations. The AI has flagged this for your review.'
        : response.interruptReason.includes('heat')
          ? 'Extreme heat conditions detected. Consider adjusting outdoor activities.'
          : response.interruptReason.includes('poya')
            ? 'A Poya day falls within your trip dates. Some restrictions may apply.'
            : 'A weather or safety constraint has been detected for your trip.';

      newMessages.push({
        id: (Date.now() + 0.5).toString(),
        role: 'weather_alert',
        content: alertText,
        timestamp: new Date(),
        interruptReason: response.interruptReason,
      });
    }

    // Check if clarification is needed
    if (response.clarificationQuestion) {
      newMessages.push({
        id: (Date.now() + 2).toString(),
        role: 'clarification',
        content: response.clarificationQuestion.question,
        timestamp: new Date(),
        clarificationData: response.clarificationQuestion,
      });
    } else if (response.pendingUserSelection && response.selectionCards && response.selectionCards.length > 0) {
      // HITL: Agent paused for selection — show only bottom panel, no chat bubble
      setPendingSelection({
        cards: response.selectionCards,
        promptText: response.promptText,
      });
    } else if (response.weatherInterrupt && response.weatherPromptOptions && response.weatherPromptOptions.length > 0) {
      // HITL: Agent paused for weather decision — show as selection prompt
      const weatherCards: SelectionCard[] = response.weatherPromptOptions.map((opt) => ({
        card_id: `weather_${opt.id}`,
        title: opt.label,
        subtitle: opt.description || '',
        badge: opt.id === 'switch_indoor' ? 'Recommended' : undefined,
        image_url: undefined,
        rating: undefined,
        price_range: undefined,
        description: opt.description || '',
        tags: [],
        distance_km: undefined,
        vibe_match_score: undefined,
      }));
      // Show weather alert as a chat bubble first
      if (response.weatherPromptMessage) {
        newMessages.push({
          id: (Date.now() + 1.5).toString(),
          role: 'weather_alert',
          content: response.weatherPromptMessage,
          timestamp: new Date(),
          interruptReason: response.interruptReason,
        });
      }
      setPendingSelection({
        cards: weatherCards,
        promptText: 'How to handle the weather?',
      });
    } else if (response.itinerary && response.itinerary.length > 0) {
      // Add plan message
      newMessages.push({
        id: (Date.now() + 3).toString(),
        role: 'plan',
        content: response.response,
        timestamp: new Date(),
        planData: {
          itinerary: response.itinerary,
          metadata: response.metadata,
          warnings: response.warnings,
          tips: response.tips,
          culturalTips: response.culturalTips,
          finalItinerary: response.finalItinerary,
          weatherData: response.weatherData,
        },
      });
    } else {
      // Just a text response
      newMessages.push({
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      });
    }

    setMessages(prev => [...prev, ...newMessages]);
  };

  const generateInitialPlan = async () => {
    setIsLoading(true);

    // Add initial welcome message
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Creating your personalized tour plan for **${selectedLocations.length
        } locations** (${formatDateRange(
          startDate,
          endDate,
        )}).\n\nOptimizing for golden hour, crowd levels, and local events...`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);

    try {
      const response = await tourPlanService.generatePlan({
        selectedLocations,
        startDate,
        endDate,
        preferences,
        message: 'Generate an optimized tour plan for my trip',
      });

      setThreadId(response.threadId);
      handleApiResponse(response);
    } catch (err: any) {
      console.error('Plan generation failed:', err);

      const isAuthError =
        (err instanceof ApiError && (err.status === 401 || err.code === 'AUTH_EXPIRED')) ||
        err.message?.toLowerCase().includes('auth') ||
        err.message?.toLowerCase().includes('expired') ||
        err.message?.toLowerCase().includes('401');

      const errorContent = isAuthError
        ? `Session expired. Please go back and log in again.`
        : `Something went wrong. Please try again.\n\n_${err.message || 'Unknown error'}_`;

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
        },
      ]);

      if (isAuthError) {
        Alert.alert('Session Expired', 'Please log in again.', [
          { text: 'Go Back', onPress: () => navigation.goBack() },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isSending || !threadId) return;

    setInputText('');
    setIsSending(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await tourPlanService.refinePlan({
        threadId,
        message: trimmedText,
        selectedLocations,
        startDate,
        endDate,
        preferences,
      });

      handleApiResponse(response);
    } catch (err: any) {
      console.error('Plan refinement failed:', err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Couldn't update your plan. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, threadId, selectedLocations, startDate, endDate, preferences]);

  const handleQuickReply = useCallback(
    (text: string) => {
      if (isSending || !threadId) return;
      setIsSending(true);

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      tourPlanService
        .refinePlan({
          threadId,
          message: text,
          selectedLocations,
          startDate,
          endDate,
          preferences,
        })
        .then(response => {
          handleApiResponse(response);
        })
        .catch(err => {
          console.error('Quick reply failed:', err);
          setMessages(prev => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `Couldn't update your plan. Please try again.`,
              timestamp: new Date(),
            },
          ]);
        })
        .finally(() => {
          setIsSending(false);
        });
    },
    [isSending, threadId, selectedLocations, startDate, endDate, preferences],
  );

  const handleAcceptPlan = useCallback(async () => {
    if (!currentPlan || !threadId) return;
    setIsAccepting(true);

    try {
      await tourPlanService.acceptPlan({
        threadId,
        title: `Trip to ${selectedLocations[0]?.name || 'Sri Lanka'}`,
        description: `AI-optimized tour from ${formatDateRange(startDate, endDate)}`,
        itinerary: currentPlan.itinerary,
        metadata: currentPlan.metadata,
      });

      Alert.alert('Plan Saved!', 'Your tour plan has been saved. You can find it in your trips.', [
        { text: 'View Trips', onPress: () => navigation.navigate('Trips') },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.error('Plan acceptance failed:', err);
      setError(`Failed to save plan: ${err.message || 'Unknown error'}`);
    } finally {
      setIsAccepting(false);
    }
  }, [currentPlan, threadId, selectedLocations, startDate, endDate, navigation]);

  const handleModifyPlan = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleClarificationAnswer = useCallback(
    async (optionLabel: string) => {
      if (!threadId || isSending) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: optionLabel,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setIsSending(true);

      try {
        const response = await tourPlanService.refinePlan({
          threadId,
          message: `User selected: ${optionLabel}`,
          selectedLocations,
          startDate,
          endDate,
          preferences,
        });

        handleApiResponse(response);
      } catch (err: any) {
        console.error('Clarification response failed:', err);
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Couldn't process your selection. Please try again.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [threadId, isSending, selectedLocations, startDate, endDate, preferences],
  );

  // Hotel search handler
  const handleHotelSearch = useCallback(
    async (searchQuery: string) => {
      if (isSending) return;
      setIsSending(true);

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: searchQuery,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      try {
        const firstLocation = selectedLocations[0]?.name;
        const response = await tourPlanService.searchHotels(searchQuery, firstLocation);

        const resultsMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'hotel_results',
          content: `Found ${response.total_results} options`,
          timestamp: new Date(),
          hotelResults: response.results,
        };
        setMessages(prev => [...prev, resultsMessage]);
      } catch (err: any) {
        console.error('Hotel search failed:', err);
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Couldn't find results. Please try again.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, selectedLocations],
  );

  // HITL: Handle user selecting a hotel/restaurant card
  const handleSelectionChoice = useCallback(
    async (cardId: string) => {
      if (!threadId || isSending) return;
      setIsSending(true);

      // Clear the pending selection from the bottom bar
      setPendingSelection(null);

      // Weather cards (weather_switch_indoor, weather_reschedule, weather_keep)
      if (cardId.startsWith('weather_')) {
        const weatherChoice = cardId.replace('weather_', '');
        const weatherLabels: Record<string, string> = {
          switch_indoor: 'Switch to indoor alternatives',
          reschedule: 'Reschedule affected activities',
          keep: 'Keep the original plan',
        };
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: weatherLabels[weatherChoice] || weatherChoice,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        try {
          const response = await tourPlanService.resumeWeather({
            threadId,
            userWeatherChoice: weatherChoice,
          });
          setThreadId(response.threadId);
          handleApiResponse(response);
        } catch (err: any) {
          console.error('Weather resume failed:', err);
          setMessages(prev => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `Couldn't process your weather choice. Please try again.`,
              timestamp: new Date(),
            },
          ]);
        } finally {
          setIsSending(false);
        }
        return;
      }

      // Map known card IDs to friendly labels
      const knownLabels: Record<string, string> = {
        pref_dining: '🍽️ Dining Only',
        pref_accommodation: '🏨 Stays Only',
        pref_both: '🍽️🏨 Both — Restaurants & Accommodations',
        pref_none: '⏩ Activities Only',
        budget_low: '💰 Budget Friendly',
        budget_medium: '💎 Mid-Range',
        budget_high: '👑 Premium',
        __SKIP__: 'Skipped this step',
      };
      const selectionLabel = knownLabels[cardId] || `Selected: ${cardId}`;

      // Show user's selection as a message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: selectionLabel,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      try {
        const response = await tourPlanService.resumeSelection({
          threadId,
          selectedCandidateId: cardId,
        });

        setThreadId(response.threadId);
        handleApiResponse(response);
      } catch (err: any) {
        console.error('Selection resume failed:', err);
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Couldn't process your selection. Please try again.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [threadId, isSending],
  );

  // HITL: Handle user skipping restaurant selection
  const handleSkipSelection = useCallback(async () => {
    if (!threadId || isSending) return;
    // Use a sentinel ID that the backend recognises as "skip"
    handleSelectionChoice('__SKIP__');
  }, [threadId, isSending, handleSelectionChoice]);

  // HITL: Handle user's weather decision
  const quickReplies = [
    { text: 'More photo time', icon: 'camera' },
    { text: 'Avoid crowds', icon: 'users' },
    { text: 'Add food spots', icon: 'utensils' },
    { text: 'Start later', icon: 'clock' },
    { text: 'Find hotels nearby', icon: 'hotel', isHotelSearch: true },
    { text: 'Find restaurants', icon: 'utensils', isHotelSearch: true },
    { text: 'Add sunrise spot', icon: 'sun' },
    { text: 'More relaxation', icon: 'spa' },
  ];

  // Build location subtitle text
  const locationNames = selectedLocations
    .slice(0, 2)
    .map(l => l.name)
    .join(', ');
  const moreCount = selectedLocations.length > 2 ? ` +${selectedLocations.length - 2}` : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* WhatsApp-style Header — extends behind safe area */}
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
          <Text style={styles.headerTitle}>Tour Planner AI</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {isLoading || isSending
              ? 'typing...'
              : `${locationNames}${moreCount} \u00B7 ${formatDateRange(startDate, endDate)}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={18} color={THEME.white} />
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

          {/* Messages */}
          {messages.map(message => {
            if (message.role === 'event' && message.events) {
              return <EventBubble key={message.id} events={message.events} />;
            }
            if (message.role === 'weather_alert') {
              return <WeatherAlertBubble key={message.id} message={message} />;
            }
            if (message.role === 'hotel_results') {
              return <HotelSearchCard key={message.id} message={message} />;
            }
            if (message.role === 'clarification' && message.clarificationData) {
              return (
                <ClarificationBubble
                  key={message.id}
                  message={message}
                  onSelectOption={handleClarificationAnswer}
                  disabled={isSending}
                />
              );
            }
            return (
              <MessageBubble
                key={message.id}
                message={message}
                onSave={message.role === 'plan' ? handleAcceptPlan : undefined}
                isSaving={message.role === 'plan' ? isAccepting : undefined}
              />
            );
          })}

          {/* Typing indicator */}
          {(isLoading || isSending) && <TypingIndicator />}
        </ScrollView>

        {/* Quick replies (above input, after plan generated) */}
        {!isLoading && !isSending && currentPlan && currentPlan.itinerary?.length > 0 && (
          <View style={styles.quickRepliesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRepliesScroll}
            >
              {quickReplies.map((qr, index) => (
                <QuickReply
                  key={index}
                  text={qr.text}
                  icon={qr.icon}
                  onPress={() => (qr as any).isHotelSearch ? handleHotelSearch(qr.text) : handleQuickReply(qr.text)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Area — swap for SelectionPrompt when pending */}
        {pendingSelection && pendingSelection.cards.length > 0 ? (
          <SelectionPrompt
            cards={pendingSelection.cards}
            promptText={pendingSelection.promptText || 'Pick one'}
            onSelect={handleSelectionChoice}
            onSkip={handleSkipSelection}
            onCustomResponse={(text) => handleSelectionChoice(text)}
            disabled={isSending}
            loading={isSending}
          />
        ) : (
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
                editable={!isSending && !isLoading && !!threadId}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending || isLoading || !threadId) &&
                styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending || isLoading || !threadId}
              activeOpacity={0.7}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={THEME.white} />
              ) : (
                <Ionicons name="send" size={18} color={THEME.white} />
              )}
            </TouchableOpacity>
          </View>
        )}
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

  // Plan
  planBubbleContainer: {
    marginVertical: 8,
  },
  savePlanButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  savePlanButtonDisabled: {
    opacity: 0.7,
  },
  savePlanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  savePlanButtonText: {
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Events
  eventContainer: {
    marginVertical: 6,
  },
  eventBubble: {
    backgroundColor: THEME.white,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    borderLeftWidth: 3,
    borderLeftColor: THEME.poya,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  eventHeaderText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: THEME.poya,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  eventItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  eventDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  eventContent: {
    flex: 1,
  },
  eventName: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
  },
  eventDate: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    marginTop: 1,
  },
  eventImpact: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[600],
    marginTop: 3,
    lineHeight: 17,
  },
  eventWarnings: {
    marginTop: 4,
  },
  eventWarningText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
    color: THEME.warning,
    lineHeight: 16,
  },

  // Clarification
  clarificationBubble: {
    maxWidth: width * 0.85,
    backgroundColor: THEME.white,
    borderRadius: 8,
    borderTopLeftRadius: 2,
    padding: 12,
    marginLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  clarificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  clarificationLabel: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: THEME.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  clarificationQuestion: {
    fontSize: 14.5,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    lineHeight: 20,
    marginBottom: 4,
  },
  clarificationContext: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    lineHeight: 17,
    marginBottom: 10,
  },
  clarificationOptions: {
    gap: 6,
  },
  clarificationOption: {
    backgroundColor: THEME.gray[50],
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.gray[200],
  },
  clarificationOptionRecommended: {
    backgroundColor: '#FFF7ED',
    borderColor: THEME.primary,
  },
  clarificationOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  clarificationOptionLabel: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
  },
  clarificationOptionLabelHighlight: {
    color: THEME.primaryDark,
  },
  recommendedBadge: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontFamily: 'Gilroy-Bold',
    color: THEME.white,
  },
  clarificationOptionDesc: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[600],
    lineHeight: 16,
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

  // Weather Alert Bubble
  weatherAlertBubble: {
    backgroundColor: THEME.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    maxWidth: width * 0.82,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  weatherAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  weatherAlertLabel: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 6,
  },
  weatherAlertText: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-Regular',
    color: THEME.dark,
    lineHeight: 19,
  },

  // Hotel Search Results
  hotelSearchBubble: {
    backgroundColor: THEME.white,
    borderRadius: 12,
    padding: 12,
    maxWidth: width * 0.85,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  hotelSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  hotelSearchTitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    marginLeft: 6,
  },
  hotelResultItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.gray[100],
  },
  hotelResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hotelResultContent: {
    flex: 1,
  },
  hotelResultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hotelResultName: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-Bold',
    color: THEME.dark,
    flex: 1,
  },
  hotelPriceBadge: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 6,
  },
  hotelResultDesc: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: THEME.gray[500],
    marginTop: 3,
    lineHeight: 16,
  },
});

export default TourPlanChatScreen;
