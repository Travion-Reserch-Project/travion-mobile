/**
 * TourPlanChatScreen
 * AI-powered chat screen for tour plan generation and refinement
 * Similar to LocationChatScreen but focused on tour planning workflow
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
import { TourPlanCard } from '@components/chat';
import { ApiError } from '@services/api/client';
import {
    tourPlanService,
    type TourPlanResponse,
    type SelectedLocation,
    type ItinerarySlot,
    type TourPlanMetadata,
} from '@services/api';

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
    role: 'user' | 'assistant' | 'plan';
    content: string;
    timestamp: Date;
    planData?: {
        itinerary: ItinerarySlot[];
        metadata: TourPlanMetadata;
        warnings?: string[];
        tips?: string[];
    };
}

// Format timestamp
const formatTime = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date range
const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
};

// Message bubble component
const MessageBubble: React.FC<{
    message: ChatMessage;
    onAcceptPlan: () => void;
    onModifyPlan: () => void;
    isAccepting: boolean;
}> = ({ message, onAcceptPlan, onModifyPlan, isAccepting }) => {
    const isUser = message.role === 'user';
    const isPlan = message.role === 'plan';
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

    // Markdown styles
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
        heading1: {
            fontSize: 18,
            fontFamily: 'Gilroy-Bold',
            color: THEME.primary,
            marginBottom: 10,
        },
        heading2: {
            fontSize: 16,
            fontFamily: 'Gilroy-Bold',
            color: THEME.primaryDark,
            marginBottom: 8,
        },
        bullet_list_icon: {
            marginRight: 10,
            color: THEME.primary,
        },
    };

    if (isPlan && message.planData) {
        return (
            <View style={styles.planBubbleContainer}>
                <TourPlanCard
                    itinerary={message.planData.itinerary}
                    metadata={message.planData.metadata}
                    warnings={message.planData.warnings}
                    tips={message.planData.tips}
                    onAccept={onAcceptPlan}
                    onModify={onModifyPlan}
                    isLoading={isAccepting}
                />
            </View>
        );
    }

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

// Typing indicator
const TypingIndicator: React.FC<{ message?: string }> = ({ message = 'AI is creating your plan...' }) => {
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
                <Text style={styles.typingText}>{message}</Text>
            </View>
        </View>
    );
};

// Quick suggestion chip
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

export const TourPlanChatScreen: React.FC<TourPlanChatScreenProps> = ({
    route,
    navigation,
}) => {
    const { selectedLocations, startDate, endDate, preferences } = route.params;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [currentPlan, setCurrentPlan] = useState<TourPlanResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const inputRef = useRef<TextInput>(null);

    // Initial plan generation
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
            Alert.alert('Error', error, [
                { text: 'OK', onPress: () => setError(null) },
            ]);
        }
    }, [error]);

    const generateInitialPlan = async () => {
        setIsLoading(true);

        // Add initial system message
        const welcomeMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `🎯 **Creating your personalized tour plan!**\n\nI'm analyzing your ${selectedLocations.length} selected locations for ${formatDateRange(startDate, endDate)}. I'll optimize for:\n\n• 🌅 Best lighting conditions\n• 👥 Crowd avoidance\n• 🗓️ Local events\n• 🚗 Efficient routes\n\nPlease wait while I craft the perfect itinerary...`,
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
            setCurrentPlan(response);

            // Add plan message
            const planMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'plan',
                content: response.response,
                timestamp: new Date(),
                planData: {
                    itinerary: response.itinerary,
                    metadata: response.metadata,
                    warnings: response.warnings,
                    tips: response.tips,
                },
            };

            setMessages(prev => [...prev, planMessage]);
        } catch (err: any) {
            console.error('Plan generation failed:', err);

            // Check if it's an authentication error
            const isAuthError =
                (err instanceof ApiError && (err.status === 401 || err.code === 'AUTH_EXPIRED')) ||
                err.message?.toLowerCase().includes('auth') ||
                err.message?.toLowerCase().includes('expired') ||
                err.message?.toLowerCase().includes('401') ||
                err.message?.toLowerCase().includes('unauthorized');

            let errorContent: string;
            if (isAuthError) {
                errorContent = `❌ **Session Expired**\n\nYour session has expired. Please go back and log in again to continue planning your tour.\n\n_Tip: After logging in, navigate back to this location and try generating the plan again._`;
            } else {
                errorContent = `❌ **Oops! Something went wrong.**\n\nI couldn't generate your tour plan right now. Please try again or go back and adjust your selections.\n\n_Error: ${err.message || 'Unknown error'}_`;
            }

            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: errorContent,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);

            // If auth error, show alert with option to go back
            if (isAuthError) {
                Alert.alert(
                    'Session Expired',
                    'Your session has expired. Please log in again to continue.',
                    [
                        {
                            text: 'Go Back',
                            onPress: () => navigation.goBack(),
                        },
                    ]
                );
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

        // Add user message
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

            setCurrentPlan(response);

            // Add plan message
            const planMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'plan',
                content: response.response,
                timestamp: new Date(),
                planData: {
                    itinerary: response.itinerary,
                    metadata: response.metadata,
                    warnings: response.warnings,
                    tips: response.tips,
                },
            };

            setMessages(prev => [...prev, planMessage]);
        } catch (err: any) {
            console.error('Plan refinement failed:', err);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `I couldn't update your plan. Please try again.\n\n_Error: ${err.message || 'Unknown error'}_`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsSending(false);
        }
    }, [inputText, isSending, threadId, selectedLocations, startDate, endDate, preferences]);

    const handleSuggestionPress = useCallback((text: string) => {
        setInputText(text);
        setTimeout(() => {
            const trimmedText = text.trim();
            if (trimmedText && !isSending && threadId) {
                setInputText('');
                // Trigger send with the suggestion
                handleSendWithText(trimmedText);
            }
        }, 100);
    }, [isSending, threadId]);

    const handleSendWithText = async (text: string) => {
        setIsSending(true);

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            const response = await tourPlanService.refinePlan({
                threadId: threadId!,
                message: text,
                selectedLocations,
                startDate,
                endDate,
                preferences,
            });

            setCurrentPlan(response);

            const planMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'plan',
                content: response.response,
                timestamp: new Date(),
                planData: {
                    itinerary: response.itinerary,
                    metadata: response.metadata,
                    warnings: response.warnings,
                    tips: response.tips,
                },
            };

            setMessages(prev => [...prev, planMessage]);
        } catch (err: any) {
            console.error('Plan refinement failed:', err);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `I couldn't update your plan. Please try again.`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsSending(false);
        }
    };

    const handleAcceptPlan = useCallback(async () => {
        if (!currentPlan || !threadId) return;

        setIsAccepting(true);

        try {
            const result = await tourPlanService.acceptPlan({
                threadId,
                title: `Trip to ${selectedLocations[0]?.name || 'Sri Lanka'}`,
                description: `AI-optimized tour from ${formatDateRange(startDate, endDate)}`,
                itinerary: currentPlan.itinerary,
                metadata: currentPlan.metadata,
            });

            Alert.alert(
                '🎉 Plan Saved!',
                'Your tour plan has been saved successfully. You can find it in your trips.',
                [
                    {
                        text: 'View Trips',
                        onPress: () => navigation.navigate('Trips'),
                    },
                    {
                        text: 'Done',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (err: any) {
            console.error('Plan acceptance failed:', err);
            setError(`Failed to save plan: ${err.message || 'Unknown error'}`);
        } finally {
            setIsAccepting(false);
        }
    }, [currentPlan, threadId, selectedLocations, startDate, endDate, navigation]);

    const handleModifyPlan = useCallback(() => {
        // Focus on input and show suggestions
        inputRef.current?.focus();
    }, []);

    const suggestions = [
        { text: 'Add more photography time', icon: 'camera' },
        { text: 'Avoid crowded times', icon: 'users' },
        { text: 'Include local food spots', icon: 'utensils' },
        { text: 'More relaxation time', icon: 'spa' },
        { text: 'Start later in the morning', icon: 'clock' },
        { text: 'Add sunrise viewing', icon: 'sun' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

            {/* Header */}
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
                        <MaterialCommunityIcons name="map-marker-path" size={20} color={THEME.primary} />
                    </View>
                    <View style={styles.headerTextContainer}>
                        <View style={styles.headerTitleRow}>
                            <Text style={styles.headerTitle}>Tour Planner</Text>
                            <View style={styles.onlineBadge}>
                                <View style={styles.onlineDot} />
                                <Text style={styles.onlineText}>AI Active</Text>
                            </View>
                        </View>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            {formatDateRange(startDate, endDate)} • {selectedLocations.length} locations
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.menuButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="ellipsis-vertical" size={20} color={THEME.white} />
                </TouchableOpacity>
            </LinearGradient>

            {/* Chat Content */}
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesScrollView}
                    contentContainerStyle={styles.messagesContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Trip Summary Header */}
                    <View style={styles.tripSummaryCard}>
                        <View style={styles.tripSummaryHeader}>
                            <MaterialCommunityIcons name="map-legend" size={20} color={THEME.primary} />
                            <Text style={styles.tripSummaryTitle}>Trip Planning Session</Text>
                        </View>
                        <View style={styles.tripSummaryLocations}>
                            {selectedLocations.slice(0, 3).map((loc, index) => (
                                <View key={index} style={styles.locationChip}>
                                    <MaterialCommunityIcons name="map-marker" size={12} color={THEME.primary} />
                                    <Text style={styles.locationChipText} numberOfLines={1}>{loc.name}</Text>
                                </View>
                            ))}
                            {selectedLocations.length > 3 && (
                                <View style={[styles.locationChip, styles.moreChip]}>
                                    <Text style={styles.moreChipText}>+{selectedLocations.length - 3} more</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Messages */}
                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            onAcceptPlan={handleAcceptPlan}
                            onModifyPlan={handleModifyPlan}
                            isAccepting={isAccepting}
                        />
                    ))}

                    {/* Loading / Typing Indicator */}
                    {(isLoading || isSending) && (
                        <TypingIndicator
                            message={isLoading ? 'AI is creating your plan...' : 'AI is refining your plan...'}
                        />
                    )}

                    {/* Quick Suggestions (after plan is generated) */}
                    {!isLoading && !isSending && currentPlan && (
                        <View style={styles.suggestionsSection}>
                            <Text style={styles.suggestionsLabel}>Quick modifications:</Text>
                            <View style={styles.suggestionsGrid}>
                                {suggestions.slice(0, 4).map((suggestion, index) => (
                                    <SuggestionChip
                                        key={index}
                                        text={suggestion.text}
                                        icon={suggestion.icon}
                                        onPress={() => handleSuggestionPress(suggestion.text)}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            ref={inputRef}
                            style={styles.textInput}
                            placeholder="Ask to modify your plan..."
                            placeholderTextColor={THEME.gray[400]}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                            editable={!isSending && !isLoading && !!threadId}
                            onSubmitEditing={handleSend}
                            blurOnSubmit={false}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                (!inputText.trim() || isSending || isLoading || !threadId) && styles.sendButtonDisabled,
                            ]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || isSending || isLoading || !threadId}
                            activeOpacity={0.7}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color={THEME.white} />
                            ) : (
                                <LinearGradient
                                    colors={inputText.trim() && threadId ? [THEME.primary, THEME.primaryDark] : [THEME.gray[300], THEME.gray[300]]}
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
                            Describe changes you'd like to make to your tour plan
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
    messagesScrollView: {
        flex: 1,
    },
    messagesContainer: {
        paddingVertical: 20,
        paddingHorizontal: 16,
    },

    // Trip Summary
    tripSummaryCard: {
        backgroundColor: THEME.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    tripSummaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    tripSummaryTitle: {
        fontSize: 15,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
    },
    tripSummaryLocations: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    locationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
        maxWidth: '45%',
    },
    locationChipText: {
        fontSize: 12,
        fontFamily: 'Gilroy-Medium',
        color: THEME.primaryDark,
        flex: 1,
    },
    moreChip: {
        backgroundColor: THEME.gray[100],
    },
    moreChipText: {
        fontSize: 12,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[600],
    },

    // Messages
    planBubbleContainer: {
        marginBottom: 16,
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
        marginHorizontal: 2,
    },
    typingDotMiddle: {
        marginHorizontal: 4,
    },
    typingText: {
        fontSize: 13,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[500],
    },

    // Suggestions
    suggestionsSection: {
        marginTop: 8,
        marginBottom: 20,
    },
    suggestionsLabel: {
        fontSize: 12,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[500],
        marginBottom: 10,
        marginLeft: 4,
    },
    suggestionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.white,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: THEME.gray[200],
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    suggestionChipText: {
        fontSize: 13,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[700],
    },

    // Input Area
    inputContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: BOTTOM_PADDING,
        backgroundColor: THEME.white,
        borderTopWidth: 1,
        borderTopColor: THEME.gray[100],
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: THEME.gray[50],
        borderRadius: 28,
        paddingHorizontal: 6,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: THEME.gray[200],
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Gilroy-Regular',
        color: THEME.dark,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        maxHeight: 100,
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

export default TourPlanChatScreen;
