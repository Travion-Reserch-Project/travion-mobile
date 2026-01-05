import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    StatusBar,
    Animated,
    StyleSheet,
    Alert,
    Platform,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import { aiService, locationService } from '@services/api';
import { useAuthStore } from '@stores';
import { haversineDistance, calculateMatchScore } from '@utils';
import { TourPlanModal } from '@components/modals/TourPlanModal';
import type { TravelPreferenceScores } from '@types';
import type {
    SimpleCrowdPredictionResponse,
    SimpleGoldenHourResponse,
    SimpleDescriptionResponse,
} from '@services/api/AIService';
import type { LocationDetailsResponse } from '@services/api/LocationService';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.45;
const BOTTOM_BAR_HEIGHT = Platform.OS === 'ios' ? 100 : 85;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24;

// Loading animation
const loadingAnimation = require('@assets/animations/onbord1.json');

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

// Category colors with gradients - updated with theme colors
const CATEGORY_CONFIG: Record<string, { color: string; bgColor: string; icon: string; gradient: string[] }> = {
    history: { color: '#9333EA', bgColor: '#F3E8FF', icon: 'landmark', gradient: ['#A855F7', '#9333EA'] },
    adventure: { color: '#F5840E', bgColor: '#FFF7ED', icon: 'hiking', gradient: ['#FB923C', '#F5840E'] },
    nature: { color: '#059669', bgColor: '#D1FAE5', icon: 'leaf', gradient: ['#10B981', '#059669'] },
    relaxation: { color: '#0EA5E9', bgColor: '#E0F2FE', icon: 'spa', gradient: ['#38BDF8', '#0EA5E9'] },
};

// Crowd level colors with enhanced styling
const CROWD_COLORS: Record<string, { color: string; bg: string; lightBg: string; icon: string; label: string; emoji: string }> = {
    LOW: { color: '#059669', bg: '#D1FAE5', lightBg: '#ECFDF5', icon: 'account-group-outline', label: 'Low', emoji: '😊' },
    MODERATE: { color: '#F5840E', bg: '#FFF7ED', lightBg: '#FFFBEB', icon: 'account-group', label: 'Medium', emoji: '😐' },
    HIGH: { color: '#DC2626', bg: '#FEE2E2', lightBg: '#FEF2F2', icon: 'account-multiple', label: 'High', emoji: '😰' },
    EXTREME: { color: '#991B1B', bg: '#FEE2E2', lightBg: '#FEF2F2', icon: 'account-multiple', label: 'Very High', emoji: '🔥' },
};

interface LocationDetailsScreenProps {
    route: {
        params: {
            locationName: string;
            distance?: number;
            matchScore?: number;
            userLatitude?: number;
            userLongitude?: number;
        };
    };
    navigation: any;
}

export const LocationDetailsScreen: React.FC<LocationDetailsScreenProps> = ({
    route,
    navigation,
}) => {
    const { locationName, distance: providedDistance, matchScore: providedMatchScore, userLatitude, userLongitude } = route.params;
    const { user } = useAuthStore();

    const [isLoading, setIsLoading] = useState(true);
    const [locationDetails, setLocationDetails] = useState<LocationDetailsResponse | null>(null);
    const [crowdData, setCrowdData] = useState<SimpleCrowdPredictionResponse | null>(null);
    const [goldenHourData, setGoldenHourData] = useState<SimpleGoldenHourResponse | null>(null);
    const [description, setDescription] = useState<SimpleDescriptionResponse | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'reviews'>('overview');
    const [showTourPlanModal, setShowTourPlanModal] = useState(false);

    // Calculated values when not provided
    const [calculatedDistance, setCalculatedDistance] = useState<number | undefined>(providedDistance);
    const [calculatedMatchScore, setCalculatedMatchScore] = useState<number | undefined>(providedMatchScore);

    const scrollY = useRef(new Animated.Value(0)).current;
    const imageScrollRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // All interpolations must be defined before any conditional returns
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, IMAGE_HEIGHT - 140],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const headerBgOpacity = scrollY.interpolate({
        inputRange: [0, IMAGE_HEIGHT - 160, IMAGE_HEIGHT - 100],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp',
    });

    const imageScale = scrollY.interpolate({
        inputRange: [-100, 0],
        outputRange: [1.4, 1],
        extrapolate: 'clamp',
    });

    const imageTranslateY = scrollY.interpolate({
        inputRange: [0, IMAGE_HEIGHT],
        outputRange: [0, -IMAGE_HEIGHT / 2.5],
        extrapolate: 'clamp',
    });

    const titleOpacity = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const overlayOpacity = scrollY.interpolate({
        inputRange: [0, IMAGE_HEIGHT - 100],
        outputRange: [0.4, 0.7],
        extrapolate: 'clamp',
    });

    useEffect(() => {
        loadLocationData();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isLoading]);

    const loadLocationData = async () => {
        try {
            setIsLoading(true);

            const [details, crowd, goldenHour, desc] = await Promise.all([
                locationService.getLocationDetails(locationName),
                aiService.getSimpleCrowdPrediction(locationName).catch(() => null),
                aiService.getSimpleGoldenHour(locationName).catch(() => null),
                aiService
                    .getSimpleDescription(locationName, {
                        history: 0.5,
                        adventure: 0.5,
                        nature: 0.5,
                        relaxation: 0.5,
                    })
                    .catch(() => null),
            ]);

            setLocationDetails(details);
            setCrowdData(crowd);
            setGoldenHourData(goldenHour);
            setDescription(desc);

            // Calculate distance if not provided
            if (providedDistance === undefined && details) {
                if (userLatitude && userLongitude) {
                    try {
                        const dist = haversineDistance(
                            userLatitude,
                            userLongitude,
                            details.coordinates.latitude,
                            details.coordinates.longitude
                        );
                        setCalculatedDistance(dist);
                    } catch (distError) {
                        console.log('Failed to calculate distance:', distError);
                    }
                }
            } else if (providedDistance !== undefined) {
                setCalculatedDistance(providedDistance);
            }

            // Calculate match score if not provided
            if (providedMatchScore === undefined && details) {
                const userPrefs: TravelPreferenceScores = user?.preferences || {
                    history: 0.5,
                    adventure: 0.5,
                    nature: 0.5,
                    relaxation: 0.5,
                };
                try {
                    const match = calculateMatchScore(userPrefs, details.preferenceScores);
                    setCalculatedMatchScore(match);
                } catch (matchError) {
                    console.log('Failed to calculate match score:', matchError);
                    const avgScore = (
                        details.preferenceScores.history * 0.25 +
                        details.preferenceScores.adventure * 0.25 +
                        details.preferenceScores.nature * 0.25 +
                        details.preferenceScores.relaxation * 0.25
                    );
                    setCalculatedMatchScore(avgScore);
                }
            } else if (providedMatchScore !== undefined) {
                setCalculatedMatchScore(providedMatchScore);
            }
        } catch (error) {
            console.error('Error loading location data:', error);
            Alert.alert('Error', 'Failed to load location details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageScroll = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / width);
        setCurrentImageIndex(index);
    };

    const getPrimaryCategory = () => {
        if (!locationDetails) return 'nature';
        const scores = locationDetails.preferenceScores;
        return Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />
                <View style={styles.loadingContent}>
                    <LottieView
                        source={loadingAnimation}
                        autoPlay
                        loop
                        style={styles.loadingAnimation}
                    />
                    <Text style={styles.loadingTitle}>Discovering {locationName}...</Text>
                    <Text style={styles.loadingSubtitle}>Getting personalized insights for you</Text>
                    <View style={styles.loadingDots}>
                        <View style={[styles.loadingDot, styles.loadingDotActive]} />
                        <View style={styles.loadingDot} />
                        <View style={styles.loadingDot} />
                    </View>
                </View>
            </View>
        );
    }

    const distance = calculatedDistance;
    const matchScore = calculatedMatchScore;

    if (!locationDetails) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />
                <View style={styles.errorContent}>
                    <View style={styles.errorIconContainer}>
                        <LinearGradient
                            colors={[THEME.primary, THEME.primaryDark]}
                            style={styles.errorIconGradient}
                        >
                            <FontAwesome5 name="map-marked-alt" size={36} color={THEME.white} />
                        </LinearGradient>
                    </View>
                    <Text style={styles.errorTitle}>Location Not Found</Text>
                    <Text style={styles.errorSubtitle}>
                        We couldn't find details for this location. Please try again later.
                    </Text>
                    <TouchableOpacity
                        style={styles.errorButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[THEME.primary, THEME.primaryDark]}
                            style={styles.errorButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="arrow-back" size={18} color={THEME.white} />
                            <Text style={styles.errorButtonText}>Go Back</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const primaryCategory = getPrimaryCategory();
    const categoryConfig = CATEGORY_CONFIG[primaryCategory];
    const crowdColor = crowdData ? CROWD_COLORS[crowdData.crowd_status] : null;
    const images = locationDetails.imageUrls || [];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Animated Sticky Header */}
            <Animated.View style={[styles.stickyHeader, { opacity: headerBgOpacity }]}>
                <LinearGradient
                    colors={[THEME.primary, THEME.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.stickyHeaderGradient}
                >
                    <View style={styles.stickyHeaderContent}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.stickyHeaderButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={24} color={THEME.white} />
                        </TouchableOpacity>
                        <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
                            {locationName}
                        </Text>
                        <TouchableOpacity
                            style={styles.stickyHeaderButton}
                            onPress={() => setIsFavorite(!isFavorite)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isFavorite ? 'heart' : 'heart-outline'}
                                size={22}
                                color={isFavorite ? '#FF6B6B' : THEME.white}
                            />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </Animated.View>

            <Animated.ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + 30 }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            >
                {/* Hero Image Section */}
                <Animated.View
                    style={[
                        styles.heroContainer,
                        { transform: [{ translateY: imageTranslateY }, { scale: imageScale }] },
                    ]}
                >
                    {images.length > 0 ? (
                        <>
                            <ScrollView
                                ref={imageScrollRef}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onScroll={handleImageScroll}
                                scrollEventThrottle={16}
                            >
                                {images.map((imageUrl, index) => (
                                    <Image
                                        key={index}
                                        source={{ uri: imageUrl }}
                                        style={styles.heroImage}
                                        resizeMode="cover"
                                    />
                                ))}
                            </ScrollView>

                            {/* Image Pagination Dots */}
                            {images.length > 1 && (
                                <View style={styles.paginationContainer}>
                                    <View style={styles.paginationBg}>
                                        <Text style={styles.paginationText}>
                                            {currentImageIndex + 1} / {images.length}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </>
                    ) : (
                        <LinearGradient
                            colors={[THEME.gray[200], THEME.gray[300]]}
                            style={styles.noImageContainer}
                        >
                            <MaterialCommunityIcons name="image-off-outline" size={56} color={THEME.gray[400]} />
                            <Text style={styles.noImageText}>No images available</Text>
                        </LinearGradient>
                    )}

                    {/* Gradient Overlays */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.5)', 'transparent']}
                        style={styles.heroGradientTop}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.heroGradientBottom}
                    />

                    {/* Top Navigation */}
                    <View style={styles.topNavigation}>
                        <TouchableOpacity
                            style={styles.navButton}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="chevron-back" size={24} color={THEME.white} />
                        </TouchableOpacity>

                        <View style={styles.navRightButtons}>
                            <TouchableOpacity
                                style={styles.navButton}
                                onPress={() => setIsFavorite(!isFavorite)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={isFavorite ? 'heart' : 'heart-outline'}
                                    size={22}
                                    color={isFavorite ? '#FF6B6B' : THEME.white}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.navButton} activeOpacity={0.8}>
                                <Ionicons name="share-social-outline" size={22} color={THEME.white} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Hero Bottom Info */}
                    <Animated.View style={[styles.heroBottomInfo, { opacity: titleOpacity }]}>
                        <View style={styles.heroTitleContainer}>
                            <Text style={styles.heroTitle} numberOfLines={2}>
                                {locationName}
                            </Text>
                            {distance !== undefined && (
                                <View style={styles.locationRow}>
                                    <View style={styles.distanceBadge}>
                                        <Ionicons name="navigate" size={14} color={THEME.primary} />
                                        <Text style={styles.distanceText}>{distance.toFixed(1)} km away</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                        {matchScore !== undefined && (
                            <View style={styles.matchScoreContainer}>
                                <LinearGradient
                                    colors={[THEME.primary, THEME.accent]}
                                    style={styles.matchScoreBadge}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Text style={styles.matchScoreValue}>{Math.round(matchScore * 100)}%</Text>
                                    <Text style={styles.matchScoreLabel}>Match</Text>
                                </LinearGradient>
                            </View>
                        )}
                    </Animated.View>
                </Animated.View>

                {/* Main Content Card */}
                <Animated.View
                    style={[
                        styles.contentCard,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandle} />

                    {/* Category Tags */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.tagsScrollView}
                        contentContainerStyle={styles.tagsContainer}
                    >
                        {Object.entries(locationDetails.preferenceScores)
                            .filter(([_, score]) => score > 0.4)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category]) => {
                                const config = CATEGORY_CONFIG[category];
                                if (!config) return null;
                                return (
                                    <View
                                        key={category}
                                        style={[styles.categoryTag, { backgroundColor: config.bgColor }]}
                                    >
                                        <FontAwesome5 name={config.icon} size={12} color={config.color} />
                                        <Text style={[styles.categoryTagText, { color: config.color }]}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </Text>
                                    </View>
                                );
                            })}
                        {locationDetails.isOutdoor && (
                            <View style={[styles.categoryTag, { backgroundColor: '#D1FAE5' }]}>
                                <MaterialCommunityIcons name="pine-tree" size={14} color="#059669" />
                                <Text style={[styles.categoryTagText, { color: '#059669' }]}>Outdoor</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Quick Stats Grid */}
                    <View style={styles.quickStatsContainer}>
                        <Text style={styles.sectionLabel}>Live Status</Text>
                        <View style={styles.quickStatsGrid}>
                            {/* Crowd Level Card */}
                            <View style={[styles.statCard, { backgroundColor: crowdColor?.lightBg || THEME.gray[50] }]}>
                                <View style={[styles.statIconWrapper, { backgroundColor: crowdColor?.bg || THEME.gray[100] }]}>
                                    {crowdColor ? (
                                        <Text style={styles.statEmoji}>{crowdColor.emoji}</Text>
                                    ) : (
                                        <MaterialCommunityIcons name="account-group-outline" size={22} color={THEME.gray[400]} />
                                    )}
                                </View>
                                <View style={styles.statInfo}>
                                    <Text style={styles.statLabel}>Crowd Level</Text>
                                    <Text style={[styles.statValue, { color: crowdColor?.color || THEME.gray[600] }]}>
                                        {crowdColor ? crowdColor.label : 'Unknown'}
                                    </Text>
                                    {crowdData && (
                                        <View style={styles.progressWrapper}>
                                            <View style={styles.progressBarBg}>
                                                <View
                                                    style={[
                                                        styles.progressBarFill,
                                                        {
                                                            width: `${crowdData.crowd_percentage}%`,
                                                            backgroundColor: crowdColor?.color,
                                                        },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={[styles.progressText, { color: crowdColor?.color }]}>
                                                {crowdData.crowd_percentage}%
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Best Time Card */}
                            <View style={[styles.statCard, { backgroundColor: THEME.primaryLight }]}>
                                <View style={[styles.statIconWrapper, { backgroundColor: '#FFEDD5' }]}>
                                    <FontAwesome5 name="camera-retro" size={18} color={THEME.primary} />
                                </View>
                                <View style={styles.statInfo}>
                                    <Text style={styles.statLabel}>Best Photo Time</Text>
                                    <Text style={[styles.statValue, { color: THEME.primary }]}>Golden Hour</Text>
                                    <View style={styles.goldenHourTimes}>
                                        <View style={styles.goldenHourItem}>
                                            <FontAwesome5 name="sun" size={10} color={THEME.primary} />
                                            <Text style={styles.goldenHourText}>
                                                {goldenHourData?.sunrise || '6:00'}
                                            </Text>
                                        </View>
                                        <Text style={styles.goldenHourDivider}>•</Text>
                                        <View style={styles.goldenHourItem}>
                                            <FontAwesome5 name="moon" size={10} color={THEME.primaryDark} />
                                            <Text style={styles.goldenHourText}>
                                                {goldenHourData?.sunset || '5:30'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* AI Insights Section */}
                    {description && description.description && (
                        <View style={styles.aiSection}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionTitleRow}>
                                    <LinearGradient
                                        colors={[THEME.primary, THEME.accent]}
                                        style={styles.aiIconBg}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <MaterialCommunityIcons name="robot-happy-outline" size={18} color={THEME.white} />
                                    </LinearGradient>
                                    <Text style={styles.sectionTitle}>AI Travel Insights</Text>
                                </View>
                                <View style={styles.aiBadge}>
                                    <MaterialCommunityIcons name="sparkles" size={12} color={THEME.primary} />
                                    <Text style={styles.aiBadgeText}>Smart</Text>
                                </View>
                            </View>
                            <View style={styles.aiCard}>
                                <LinearGradient
                                    colors={['#FFF7ED', '#FFFFFF']}
                                    style={styles.aiCardGradient}
                                >
                                    <Text style={styles.aiText}>{description.description}</Text>
                                    <View style={styles.aiFooter}>
                                        <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={THEME.primary} />
                                        <Text style={styles.aiFooterText}>Personalized for your travel style</Text>
                                    </View>
                                </LinearGradient>
                            </View>
                        </View>
                    )}

                    {/* Detailed Info Section */}
                    <View style={styles.detailSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <View style={[styles.sectionIconBg, { backgroundColor: '#E0F2FE' }]}>
                                    <Ionicons name="information-circle" size={18} color="#0EA5E9" />
                                </View>
                                <Text style={styles.sectionTitle}>Visit Details</Text>
                            </View>
                        </View>

                        <View style={styles.detailCards}>
                            {/* Morning Golden Hour */}
                            <View style={styles.detailCard}>
                                <View style={styles.detailCardIcon}>
                                    <LinearGradient
                                        colors={['#FCD34D', '#F59E0B']}
                                        style={styles.detailIconGradient}
                                    >
                                        <FontAwesome5 name="sun" size={16} color={THEME.white} />
                                    </LinearGradient>
                                </View>
                                <View style={styles.detailCardContent}>
                                    <Text style={styles.detailCardTitle}>Morning Golden Hour</Text>
                                    <Text style={styles.detailCardValue}>
                                        {goldenHourData?.golden_hour_morning?.start || '6:00'} - {goldenHourData?.golden_hour_morning?.end || '7:00'}
                                    </Text>
                                    <Text style={styles.detailCardDesc}>Best for warm, soft lighting</Text>
                                </View>
                            </View>

                            {/* Evening Golden Hour */}
                            <View style={styles.detailCard}>
                                <View style={styles.detailCardIcon}>
                                    <LinearGradient
                                        colors={['#FB923C', '#EA580C']}
                                        style={styles.detailIconGradient}
                                    >
                                        <FontAwesome5 name="cloud-sun" size={16} color={THEME.white} />
                                    </LinearGradient>
                                </View>
                                <View style={styles.detailCardContent}>
                                    <Text style={styles.detailCardTitle}>Evening Golden Hour</Text>
                                    <Text style={styles.detailCardValue}>
                                        {goldenHourData?.golden_hour_evening?.start || '5:30'} - {goldenHourData?.golden_hour_evening?.end || '6:30'}
                                    </Text>
                                    <Text style={styles.detailCardDesc}>Perfect for sunset shots</Text>
                                </View>
                            </View>

                            {/* Crowd Forecast */}
                            <View style={styles.detailCard}>
                                <View style={styles.detailCardIcon}>
                                    <LinearGradient
                                        colors={crowdColor ? [crowdColor.color, crowdColor.color] : ['#9CA3AF', '#6B7280']}
                                        style={styles.detailIconGradient}
                                    >
                                        <MaterialCommunityIcons name="account-group" size={18} color={THEME.white} />
                                    </LinearGradient>
                                </View>
                                <View style={styles.detailCardContent}>
                                    <Text style={styles.detailCardTitle}>Current Crowd</Text>
                                    <Text style={[styles.detailCardValue, { color: crowdColor?.color }]}>
                                        {crowdData?.crowd_percentage || 0}% Capacity
                                    </Text>
                                    <Text style={styles.detailCardDesc}>
                                        {crowdData?.crowd_status === 'LOW' ? 'Great time to visit!' :
                                            crowdData?.crowd_status === 'MODERATE' ? 'Moderate activity' :
                                                crowdData?.crowd_status === 'HIGH' ? 'Consider off-peak hours' : 'Check back later'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Tips Section */}
                    <View style={styles.tipsSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <View style={[styles.sectionIconBg, { backgroundColor: '#D1FAE5' }]}>
                                    <FontAwesome5 name="lightbulb" size={16} color="#059669" />
                                </View>
                                <Text style={styles.sectionTitle}>Pro Tips</Text>
                            </View>
                        </View>

                        <View style={styles.tipCard}>
                            <View style={styles.tipItem}>
                                <View style={styles.tipBullet}>
                                    <Text style={styles.tipBulletText}>1</Text>
                                </View>
                                <Text style={styles.tipText}>
                                    Visit during golden hour for the best photography conditions
                                </Text>
                            </View>
                            <View style={styles.tipItem}>
                                <View style={styles.tipBullet}>
                                    <Text style={styles.tipBulletText}>2</Text>
                                </View>
                                <Text style={styles.tipText}>
                                    {crowdData?.crowd_status === 'HIGH' || crowdData?.crowd_status === 'EXTREME'
                                        ? 'Consider visiting early morning or late afternoon to avoid crowds'
                                        : 'Current crowd levels are manageable - good time to visit!'}
                                </Text>
                            </View>
                            <View style={styles.tipItem}>
                                <View style={styles.tipBullet}>
                                    <Text style={styles.tipBulletText}>3</Text>
                                </View>
                                <Text style={styles.tipText}>
                                    Ask our AI Guide for personalized recommendations and hidden gems
                                </Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </Animated.ScrollView>

            {/* Fixed Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <View style={styles.bottomBarContent}>
                    <TouchableOpacity
                        style={styles.secondaryActionButton}
                        activeOpacity={0.85}
                        onPress={() => setShowTourPlanModal(true)}
                    >
                        <View style={styles.secondaryButtonInner}>
                            <MaterialCommunityIcons name="map-marker-path" size={20} color={THEME.primary} />
                            <Text style={styles.secondaryButtonText}>Visit</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.primaryActionButton}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('LocationChat', { locationName })}
                    >
                        <LinearGradient
                            colors={[THEME.primary, THEME.primaryDark]}
                            style={styles.primaryButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <MaterialCommunityIcons name="robot-happy-outline" size={22} color={THEME.white} />
                            <Text style={styles.primaryButtonText}>Chat with AI Guide</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tour Plan Modal */}
            <TourPlanModal
                visible={showTourPlanModal && locationDetails !== null}
                onClose={() => setShowTourPlanModal(false)}
                selectedLocation={{
                    name: locationDetails?.name || locationName,
                    coordinates: locationDetails?.coordinates || { latitude: 0, longitude: 0 },
                    imageUrls: locationDetails?.imageUrls,
                }}
                onGeneratePlan={(planData) => {
                    console.log('Tour Plan Data:', planData);
                    // Close the modal first
                    setShowTourPlanModal(false);

                    // Format dates to YYYY-MM-DD format
                    const formatDateToYYYYMMDD = (date: Date): string => {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    };

                    // Navigate to tour plan chat screen with the data
                    navigation.navigate('TourPlanChat', {
                        selectedLocations: planData.selectedLocations.map(loc => ({
                            name: loc.name,
                            latitude: loc.latitude,
                            longitude: loc.longitude,
                            imageUrl: loc.imageUrl,
                            distance_km: loc.distance_km,
                        })),
                        startDate: formatDateToYYYYMMDD(planData.startDate),
                        endDate: formatDateToYYYYMMDD(planData.endDate),
                        preferences: [], // Can be enhanced to collect preferences from user
                    });
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.gray[100],
    },
    scrollView: {
        flex: 1,
    },

    // Loading State
    loadingContainer: {
        flex: 1,
        backgroundColor: THEME.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContent: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingAnimation: {
        width: 200,
        height: 200,
    },
    loadingTitle: {
        fontSize: 22,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
        marginTop: 20,
        textAlign: 'center',
    },
    loadingSubtitle: {
        fontSize: 15,
        fontFamily: 'Gilroy-Regular',
        color: THEME.gray[500],
        marginTop: 8,
        textAlign: 'center',
    },
    loadingDots: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 8,
    },
    loadingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: THEME.gray[300],
    },
    loadingDotActive: {
        backgroundColor: THEME.primary,
        width: 24,
    },

    // Error State
    errorContainer: {
        flex: 1,
        backgroundColor: THEME.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContent: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorIconContainer: {
        marginBottom: 24,
    },
    errorIconGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorTitle: {
        fontSize: 24,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 15,
        fontFamily: 'Gilroy-Regular',
        color: THEME.gray[500],
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22,
    },
    errorButton: {
        marginTop: 32,
        borderRadius: 50,
        overflow: 'hidden',
    },
    errorButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 16,
        gap: 10,
    },
    errorButtonText: {
        fontSize: 16,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
    },

    // Sticky Header
    stickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    stickyHeaderGradient: {
        paddingTop: STATUS_BAR_HEIGHT,
    },
    stickyHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    stickyHeaderButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stickyHeaderTitle: {
        flex: 1,
        fontSize: 18,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
        textAlign: 'center',
        marginHorizontal: 8,
    },

    // Hero Section
    heroContainer: {
        height: IMAGE_HEIGHT,
        width: '100%',
        backgroundColor: THEME.gray[200],
    },
    heroImage: {
        width: width,
        height: IMAGE_HEIGHT,
    },
    noImageContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noImageText: {
        fontSize: 14,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[500],
        marginTop: 12,
    },
    heroGradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    heroGradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
    },

    // Pagination
    paginationContainer: {
        position: 'absolute',
        bottom: 85,
        alignSelf: 'center',
    },
    paginationBg: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    paginationText: {
        fontSize: 12,
        fontFamily: 'Gilroy-SemiBold',
        color: THEME.white,
    },

    // Top Navigation
    topNavigation: {
        position: 'absolute',
        top: STATUS_BAR_HEIGHT + 8,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    navButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navRightButtons: {
        flexDirection: 'row',
        gap: 12,
    },

    // Hero Bottom Info
    heroBottomInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    heroTitleContainer: {
        flex: 1,
        marginRight: 16,
    },
    heroTitle: {
        fontSize: 28,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
        lineHeight: 34,
    },
    locationRow: {
        flexDirection: 'row',
        marginTop: 10,
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.white,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 22,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    distanceText: {
        fontSize: 13,
        fontFamily: 'Gilroy-SemiBold',
        color: THEME.dark,
    },
    matchScoreContainer: {},
    matchScoreBadge: {
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 18,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    matchScoreValue: {
        fontSize: 28,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
        lineHeight: 32,
    },
    matchScoreLabel: {
        fontSize: 11,
        fontFamily: 'Gilroy-SemiBold',
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: -2,
    },

    // Content Card
    contentCard: {
        backgroundColor: THEME.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -28,
        paddingTop: 14,
        paddingBottom: 24,
        minHeight: height * 0.65,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 16,
    },
    dragHandle: {
        width: 44,
        height: 5,
        backgroundColor: THEME.gray[300],
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 18,
    },

    // Tags
    tagsScrollView: {
        marginBottom: 24,
    },
    tagsContainer: {
        paddingHorizontal: 20,
        gap: 10,
        flexDirection: 'row',
    },
    categoryTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        gap: 8,
    },
    categoryTagText: {
        fontSize: 13,
        fontFamily: 'Gilroy-SemiBold',
    },

    // Quick Stats
    quickStatsContainer: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    sectionLabel: {
        fontSize: 12,
        fontFamily: 'Gilroy-Bold',
        color: THEME.gray[400],
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 14,
    },
    quickStatsGrid: {
        gap: 12,
    },
    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        gap: 14,
    },
    statIconWrapper: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statEmoji: {
        fontSize: 24,
    },
    statInfo: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[500],
        marginBottom: 2,
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
        marginBottom: 6,
    },
    progressWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 13,
        fontFamily: 'Gilroy-Bold',
        minWidth: 35,
    },
    goldenHourTimes: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    goldenHourItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    goldenHourText: {
        fontSize: 13,
        fontFamily: 'Gilroy-SemiBold',
        color: THEME.gray[600],
    },
    goldenHourDivider: {
        fontSize: 10,
        color: THEME.gray[400],
    },

    // AI Section
    aiSection: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    aiIconBg: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionIconBg: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 5,
    },
    aiBadgeText: {
        fontSize: 11,
        fontFamily: 'Gilroy-Bold',
        color: THEME.primary,
    },
    aiCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    aiCardGradient: {
        padding: 20,
    },
    aiText: {
        fontSize: 15,
        fontFamily: 'Gilroy-Regular',
        color: THEME.gray[700],
        lineHeight: 24,
    },
    aiFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#FFEDD5',
        gap: 8,
    },
    aiFooterText: {
        fontSize: 12,
        fontFamily: 'Gilroy-Medium',
        color: THEME.primary,
    },

    // Detail Section
    detailSection: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    detailCards: {
        gap: 12,
    },
    detailCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.gray[50],
        padding: 16,
        borderRadius: 18,
        gap: 14,
    },
    detailCardIcon: {},
    detailIconGradient: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailCardContent: {
        flex: 1,
    },
    detailCardTitle: {
        fontSize: 13,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[500],
        marginBottom: 2,
    },
    detailCardValue: {
        fontSize: 17,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
        marginBottom: 4,
    },
    detailCardDesc: {
        fontSize: 12,
        fontFamily: 'Gilroy-Regular',
        color: THEME.gray[400],
    },

    // Tips Section
    tipsSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    tipCard: {
        backgroundColor: '#F0FDF4',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
        gap: 12,
    },
    tipBullet: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#059669',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tipBulletText: {
        fontSize: 12,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Gilroy-Regular',
        color: THEME.gray[700],
        lineHeight: 20,
    },

    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: THEME.white,
        borderTopWidth: 1,
        borderTopColor: THEME.gray[200],
        paddingTop: 14,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 24,
    },
    bottomBarContent: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryActionButton: {
        borderWidth: 2,
        borderColor: THEME.primary,
        borderRadius: 18,
        overflow: 'hidden',
    },
    secondaryButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontFamily: 'Gilroy-Bold',
        color: THEME.primary,
    },
    primaryActionButton: {
        flex: 1,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    primaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 17,
        paddingHorizontal: 20,
        gap: 10,
    },
    primaryButtonText: {
        fontSize: 15,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
    },
});

export default LocationDetailsScreen;
