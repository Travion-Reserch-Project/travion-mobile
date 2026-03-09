import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    ActivityIndicator,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import { aiService, locationService } from '../../services/api';
import { useAuthStore } from '../../stores';
import { haversineDistance, calculateMatchScore } from '../../utils';
import { TourPlanModal } from '../../components/modals/TourPlanModal';
import type { TravelPreferenceScores } from '../../types';
import type {
    SimpleCrowdPredictionResponse,
    SimpleGoldenHourResponse,
    SimpleDescriptionResponse,
} from '../../services/api/AIService';
import type { LocationDetailsResponse } from '../../services/api/LocationService';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.48;
const BOTTOM_BAR_HEIGHT = Platform.OS === 'ios' ? 100 : 85;

const loadingAnimation = require('../../assets/animations/onbord1.json');

// ── Theme ──────────────────────────────────────────────────────
const T = {
    primary: '#F5840E',
    primaryLight: '#FFF7ED',
    primaryDark: '#C2410C',
    accent: '#FF6B35',
    success: '#10B981',
    warning: '#FBBF24',
    error: '#EF4444',
    dark: '#111827',
    card: '#FFFFFF',
    bg: '#F8F7F4',
    white: '#FFFFFF',
    g: {
        50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB',
        400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151', 800: '#1F2937',
    },
};

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400';
const IMAGE_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
};

const CATEGORY_CONFIG: Record<string, { color: string; bgColor: string; icon: string; gradient: string[] }> = {
    history: { color: '#7C3AED', bgColor: '#EDE9FE', icon: 'landmark', gradient: ['#A78BFA', '#7C3AED'] },
    adventure: { color: '#F5840E', bgColor: '#FFF7ED', icon: 'hiking', gradient: ['#FB923C', '#F5840E'] },
    nature: { color: '#059669', bgColor: '#D1FAE5', icon: 'leaf', gradient: ['#34D399', '#059669'] },
    relaxation: { color: '#0EA5E9', bgColor: '#E0F2FE', icon: 'spa', gradient: ['#38BDF8', '#0EA5E9'] },
};

const CROWD_COLORS: Record<string, { color: string; bg: string; lightBg: string; label: string; emoji: string }> = {
    LOW: { color: '#059669', bg: '#D1FAE5', lightBg: '#ECFDF5', label: 'Low Crowd', emoji: '😊' },
    MODERATE: { color: '#D97706', bg: '#FEF3C7', lightBg: '#FFFBEB', label: 'Moderate', emoji: '😐' },
    HIGH: { color: '#DC2626', bg: '#FEE2E2', lightBg: '#FEF2F2', label: 'Crowded', emoji: '😰' },
    EXTREME: { color: '#991B1B', bg: '#FEE2E2', lightBg: '#FEF2F2', label: 'Very Crowded', emoji: '🔥' },
};

// ── Date Helpers ───────────────────────────────────────────────
const generateDateRange = (days: number = 7): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d);
    }
    return dates;
};

const fmtDateAPI = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

const dayName = (d: Date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
const monthName = (d: Date) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
const isToday = (d: Date) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
};

// ── Component ──────────────────────────────────────────────────
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

export const LocationDetailsScreen: React.FC<LocationDetailsScreenProps> = ({ route, navigation }) => {
    const { locationName, distance: providedDistance, matchScore: providedMatchScore, userLatitude, userLongitude } = route.params;
    const { user } = useAuthStore();

    // ── State ───────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(true);
    const [locationDetails, setLocationDetails] = useState<LocationDetailsResponse | null>(null);
    const [crowdData, setCrowdData] = useState<SimpleCrowdPredictionResponse | null>(null);
    const [goldenHourData, setGoldenHourData] = useState<SimpleGoldenHourResponse | null>(null);
    const [description, setDescription] = useState<SimpleDescriptionResponse | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showTourPlanModal, setShowTourPlanModal] = useState(false);
    const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

    // Date-driven insights
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [dateRanges] = useState<Date[]>(generateDateRange(7));
    const [dateCrowdData, setDateCrowdData] = useState<SimpleCrowdPredictionResponse | null>(null);
    const [dateGoldenHourData, setDateGoldenHourData] = useState<SimpleGoldenHourResponse | null>(null);
    const [isDateLoading, setIsDateLoading] = useState(false);

    const [calculatedDistance, setCalculatedDistance] = useState<number | undefined>(providedDistance);
    const [calculatedMatchScore, setCalculatedMatchScore] = useState<number | undefined>(providedMatchScore);

    // ── Animations ──────────────────────────────────────────
    const scrollY = useRef(new Animated.Value(0)).current;
    const imageScrollRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;

    const headerBgOpacity = scrollY.interpolate({
        inputRange: [0, IMAGE_HEIGHT - 160, IMAGE_HEIGHT - 90],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp',
    });
    const imageScale = scrollY.interpolate({
        inputRange: [-100, 0],
        outputRange: [1.5, 1],
        extrapolate: 'clamp',
    });
    const imageTranslateY = scrollY.interpolate({
        inputRange: [0, IMAGE_HEIGHT],
        outputRange: [0, -IMAGE_HEIGHT / 2.5],
        extrapolate: 'clamp',
    });
    const titleOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    // ── Effects ─────────────────────────────────────────────
    useEffect(() => { loadLocationData(); }, []);

    useEffect(() => {
        if (!isLoading) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
            ]).start();
        }
    }, [isLoading]);

    const fetchDateSpecificData = useCallback(async (date: Date) => {
        try {
            setIsDateLoading(true);
            const dateStr = fmtDateAPI(date);
            const [crowd, golden] = await Promise.all([
                aiService.getSimpleCrowdPrediction(locationName, dateStr).catch(() => null),
                aiService.getSimpleGoldenHour(locationName, dateStr).catch(() => null),
            ]);
            setDateCrowdData(crowd);
            setDateGoldenHourData(golden);
        } catch { /* silent */ } finally {
            setIsDateLoading(false);
        }
    }, [locationName]);

    useEffect(() => {
        if (!isLoading) fetchDateSpecificData(selectedDate);
    }, [selectedDate, isLoading]);

    // ── Data Loading ────────────────────────────────────────
    const loadLocationData = async () => {
        try {
            setIsLoading(true);
            const [details, crowd, golden, desc] = await Promise.all([
                locationService.getLocationDetails(locationName),
                aiService.getSimpleCrowdPrediction(locationName).catch(() => null),
                aiService.getSimpleGoldenHour(locationName).catch(() => null),
                aiService.getSimpleDescription(locationName, { history: 0.5, adventure: 0.5, nature: 0.5, relaxation: 0.5 }).catch(() => null),
            ]);

            setLocationDetails(details);
            setCrowdData(crowd);
            setGoldenHourData(golden);
            setDescription(desc);
            setDateCrowdData(crowd);
            setDateGoldenHourData(golden);

            if (providedDistance === undefined && details && userLatitude && userLongitude) {
                try {
                    setCalculatedDistance(haversineDistance(userLatitude, userLongitude, details.coordinates.latitude, details.coordinates.longitude));
                } catch { /* skip */ }
            } else if (providedDistance !== undefined) {
                setCalculatedDistance(providedDistance);
            }

            if (providedMatchScore === undefined && details) {
                const prefs: TravelPreferenceScores = user?.preferences || { history: 0.5, adventure: 0.5, nature: 0.5, relaxation: 0.5 };
                try {
                    setCalculatedMatchScore(calculateMatchScore(prefs, details.preferenceScores));
                } catch {
                    const s = details.preferenceScores;
                    setCalculatedMatchScore((s.history + s.adventure + s.nature + s.relaxation) * 0.25);
                }
            } else if (providedMatchScore !== undefined) {
                setCalculatedMatchScore(providedMatchScore);
            }
        } catch (err) {
            console.error('Error loading location data:', err);
            Alert.alert('Error', 'Failed to load location details');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Helpers ─────────────────────────────────────────────
    const handleImageScroll = (e: any) => setCurrentImageIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    const matchColor = (s: number) => s >= 0.8 ? T.success : s >= 0.6 ? T.primary : s >= 0.4 ? T.warning : T.g[400];

    // ── Loading Screen ──────────────────────────────────────
    if (isLoading) {
        return (
            <View style={s.loadingRoot}>
                <StatusBar barStyle="dark-content" backgroundColor={T.white} />
                <LottieView source={loadingAnimation} autoPlay loop style={s.loadingLottie} />
                <Text style={s.loadingTitle}>Discovering {locationName}...</Text>
                <Text style={s.loadingSub}>Getting personalized insights for you</Text>
                <View style={s.loadingDots}>
                    <View style={[s.dot, s.dotActive]} />
                    <View style={s.dot} />
                    <View style={s.dot} />
                </View>
            </View>
        );
    }

    // ── Error Screen ────────────────────────────────────────
    if (!locationDetails) {
        return (
            <View style={s.loadingRoot}>
                <StatusBar barStyle="dark-content" backgroundColor={T.white} />
                <LinearGradient colors={[T.primary, T.primaryDark]} style={s.errIcon}>
                    <FontAwesome5 name="map-marked-alt" size={36} color={T.white} />
                </LinearGradient>
                <Text style={[s.loadingTitle, { marginTop: 24 }]}>Location Not Found</Text>
                <Text style={s.loadingSub}>We couldn't find details for this location.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={{ marginTop: 28 }}>
                    <LinearGradient colors={[T.primary, T.primaryDark]} style={s.errBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Ionicons name="arrow-back" size={18} color={T.white} />
                        <Text style={s.errBtnText}>Go Back</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Derived values ──────────────────────────────────────
    const distance = calculatedDistance;
    const matchScore = calculatedMatchScore;
    const crowdColor = crowdData ? CROWD_COLORS[crowdData.crowd_status] : null;
    const dateCrowdColor = dateCrowdData ? CROWD_COLORS[dateCrowdData.crowd_status] : null;
    const images = locationDetails.imageUrls || [];
    const matchPct = matchScore !== undefined ? Math.round(matchScore * 100) : null;

    // ── Render ──────────────────────────────────────────────
    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* ─── Sticky Header ─── */}
            <Animated.View style={[s.stickyHeader, { opacity: headerBgOpacity }]}>
                <LinearGradient colors={[T.primary, T.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.stickyGrad}>
                    <View style={s.stickyRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.stickyBtn} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={24} color={T.white} />
                        </TouchableOpacity>
                        <Text style={s.stickyTitle} numberOfLines={1}>{locationName}</Text>
                        <TouchableOpacity style={s.stickyBtn} onPress={() => setIsFavorite(!isFavorite)} activeOpacity={0.7}>
                            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? '#FF6B6B' : T.white} />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* ─── Scrollable Content ─── */}
            <Animated.ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + 30 }}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            >
                {/* ──── Hero Image ──── */}
                <Animated.View style={[s.hero, { transform: [{ translateY: imageTranslateY }, { scale: imageScale }] }]}>
                    {images.length > 0 ? (
                        <>
                            <ScrollView ref={imageScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={handleImageScroll} scrollEventThrottle={16}>
                                {images.map((url, i) => {
                                    const src = failedImages.has(i) ? PLACEHOLDER_IMAGE : url;
                                    const proxied = src.includes('/image-proxy');
                                    return (
                                        <Image
                                            key={i}
                                            source={proxied ? { uri: src } : { uri: src, headers: IMAGE_HEADERS }}
                                            style={s.heroImg}
                                            resizeMode="cover"
                                            onError={() => { if (!failedImages.has(i)) setFailedImages(p => new Set(p).add(i)); }}
                                        />
                                    );
                                })}
                            </ScrollView>
                            {images.length > 1 && (
                                <View style={s.pagination}>
                                    {images.map((_, i) => (
                                        <View key={i} style={[s.pagDot, i === currentImageIndex && s.pagDotActive]} />
                                    ))}
                                </View>
                            )}
                        </>
                    ) : (
                        <LinearGradient colors={[T.g[200], T.g[300]]} style={s.noImg}>
                            <MaterialCommunityIcons name="image-off-outline" size={56} color={T.g[400]} />
                        </LinearGradient>
                    )}

                    {/* Gradient overlays */}
                    <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={s.gradTop} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.gradBot} />

                    {/* Nav buttons */}
                    <View style={s.topNav}>
                        <TouchableOpacity style={s.navBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                            <Ionicons name="chevron-back" size={22} color={T.white} />
                        </TouchableOpacity>
                        <View style={s.navRight}>
                            <TouchableOpacity style={s.navBtn} onPress={() => setIsFavorite(!isFavorite)} activeOpacity={0.8}>
                                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#FF6B6B' : T.white} />
                            </TouchableOpacity>
                            <TouchableOpacity style={s.navBtn} activeOpacity={0.8}>
                                <Ionicons name="share-social-outline" size={20} color={T.white} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Hero bottom overlay info */}
                    <Animated.View style={[s.heroBottom, { opacity: titleOpacity }]}>
                        <Text style={s.heroName} numberOfLines={2}>{locationName}</Text>
                        <View style={s.heroBadges}>
                            {distance !== undefined && (
                                <View style={s.heroBadge}>
                                    <Ionicons name="navigate" size={13} color={T.primary} />
                                    <Text style={s.heroBadgeText}>{distance.toFixed(1)} km</Text>
                                </View>
                            )}
                            {crowdColor && (
                                <View style={[s.heroBadge, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                                    <Text style={{ fontSize: 13 }}>{crowdColor.emoji}</Text>
                                    <Text style={[s.heroBadgeText, { color: crowdColor.color }]}>{crowdColor.label}</Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </Animated.View>

                {/* ──── Content Sheet ──── */}
                <Animated.View style={[s.sheet, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={s.handle} />

                    {/* ── Quick Glance Strip (floating cards) ── */}
                    <View style={s.glanceRow}>
                        {/* Match Score */}
                        {matchPct !== null && (
                            <View style={s.glanceCard}>
                                <LinearGradient colors={[T.primary, T.accent]} style={s.glanceIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                    <Ionicons name="heart" size={16} color={T.white} />
                                </LinearGradient>
                                <Text style={[s.glanceVal, { color: matchColor(matchScore!) }]}>{matchPct}%</Text>
                                <Text style={s.glanceLbl}>Match</Text>
                            </View>
                        )}
                        {/* Crowd Now */}
                        <View style={s.glanceCard}>
                            <View style={[s.glanceIconBg, { backgroundColor: crowdColor?.bg || T.g[100] }]}>
                                {crowdColor ? (
                                    <Text style={{ fontSize: 16 }}>{crowdColor.emoji}</Text>
                                ) : (
                                    <MaterialCommunityIcons name="account-group-outline" size={16} color={T.g[400]} />
                                )}
                            </View>
                            <Text style={[s.glanceVal, { color: crowdColor?.color || T.g[600] }]}>{crowdData?.crowd_percentage ?? 0}%</Text>
                            <Text style={s.glanceLbl}>Crowd</Text>
                        </View>
                        {/* Sunrise */}
                        <View style={s.glanceCard}>
                            <LinearGradient colors={['#FCD34D', '#F59E0B']} style={s.glanceIconBg}>
                                <FontAwesome5 name="sun" size={13} color={T.white} />
                            </LinearGradient>
                            <Text style={[s.glanceVal, { color: '#B45309' }]}>{goldenHourData?.sunrise || '6:00'}</Text>
                            <Text style={s.glanceLbl}>Sunrise</Text>
                        </View>
                        {/* Sunset */}
                        <View style={s.glanceCard}>
                            <LinearGradient colors={['#FB923C', '#EA580C']} style={s.glanceIconBg}>
                                <FontAwesome5 name="cloud-sun" size={12} color={T.white} />
                            </LinearGradient>
                            <Text style={[s.glanceVal, { color: '#C2410C' }]}>{goldenHourData?.sunset || '6:00'}</Text>
                            <Text style={s.glanceLbl}>Sunset</Text>
                        </View>
                    </View>

                    {/* ── Category Tags ── */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tagRow}>
                        {Object.entries(locationDetails.preferenceScores)
                            .filter(([_, v]) => v > 0.4)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat]) => {
                                const c = CATEGORY_CONFIG[cat];
                                if (!c) return null;
                                return (
                                    <LinearGradient key={cat} colors={c.gradient} style={s.tag} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                        <FontAwesome5 name={c.icon} size={11} color={T.white} />
                                        <Text style={s.tagText}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                                    </LinearGradient>
                                );
                            })}
                        {locationDetails.isOutdoor && (
                            <LinearGradient colors={['#34D399', '#059669']} style={s.tag} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                <MaterialCommunityIcons name="pine-tree" size={13} color={T.white} />
                                <Text style={s.tagText}>Outdoor</Text>
                            </LinearGradient>
                        )}
                    </ScrollView>

                    {/* ── AI Insights Card ── */}
                    {description?.description && (
                        <View style={s.section}>
                            <View style={s.secHead}>
                                <LinearGradient colors={[T.primary, T.accent]} style={s.secIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                    <MaterialCommunityIcons name="robot-happy-outline" size={16} color={T.white} />
                                </LinearGradient>
                                <Text style={s.secTitle}>AI Travel Insight</Text>
                                <View style={s.aiBadge}>
                                    <MaterialCommunityIcons name="sparkles" size={11} color={T.primary} />
                                    <Text style={s.aiBadgeText}>Smart</Text>
                                </View>
                            </View>
                            <View style={s.aiCard}>
                                <Text style={s.aiText}>{description.description}</Text>
                                <View style={s.aiFooter}>
                                    <MaterialCommunityIcons name="lightbulb-on-outline" size={13} color={T.primary} />
                                    <Text style={s.aiFooterText}>Personalized for your travel style</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ── Day Planner / Date Insights ── */}
                    <View style={s.section}>
                        <View style={s.secHead}>
                            <View style={[s.secIconBg, { backgroundColor: '#DBEAFE' }]}>
                                <Ionicons name="calendar" size={16} color="#2563EB" />
                            </View>
                            <Text style={s.secTitle}>Plan Your Visit</Text>
                        </View>

                        {/* Date strip */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateStrip} style={{ marginHorizontal: -20 }}>
                            {dateRanges.map((date, i) => {
                                const sel = fmtDateAPI(date) === fmtDateAPI(selectedDate);
                                const today = isToday(date);
                                return (
                                    <TouchableOpacity key={i} onPress={() => setSelectedDate(date)} activeOpacity={0.7}>
                                        {sel ? (
                                            <LinearGradient colors={[T.primary, T.primaryDark]} style={s.dateChip} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                                                <Text style={[s.dateDayTxt, { color: 'rgba(255,255,255,0.85)' }]}>{today ? 'Today' : dayName(date)}</Text>
                                                <Text style={[s.dateNumTxt, { color: T.white }]}>{date.getDate()}</Text>
                                                <Text style={[s.dateMonTxt, { color: 'rgba(255,255,255,0.7)' }]}>{monthName(date)}</Text>
                                            </LinearGradient>
                                        ) : (
                                            <View style={[s.dateChip, s.dateChipIdle, today && { borderColor: T.primary, borderWidth: 1.5 }]}>
                                                <Text style={[s.dateDayTxt, today && { color: T.primary }]}>{today ? 'Today' : dayName(date)}</Text>
                                                <Text style={[s.dateNumTxt, today && { color: T.primary }]}>{date.getDate()}</Text>
                                                <Text style={s.dateMonTxt}>{monthName(date)}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Day content */}
                        {isDateLoading ? (
                            <View style={s.dateLoading}>
                                <ActivityIndicator size="small" color={T.primary} />
                                <Text style={s.dateLoadText}>Loading insights...</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 14 }}>
                                {/* Crowd Forecast Card */}
                                <View style={s.forecastCard}>
                                    <LinearGradient
                                        colors={dateCrowdColor ? [dateCrowdColor.lightBg, T.white] : [T.g[50], T.white]}
                                        style={s.forecastGrad}
                                    >
                                        <View style={s.forecastTop}>
                                            <View style={[s.forecastEmojiBg, { backgroundColor: dateCrowdColor?.bg || T.g[100] }]}>
                                                {dateCrowdColor ? (
                                                    <Text style={{ fontSize: 26 }}>{dateCrowdColor.emoji}</Text>
                                                ) : (
                                                    <MaterialCommunityIcons name="account-group-outline" size={24} color={T.g[400]} />
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.forecastLabel}>Expected Crowd Level</Text>
                                                <View style={s.forecastValRow}>
                                                    <Text style={[s.forecastVal, { color: dateCrowdColor?.color || T.g[600] }]}>
                                                        {dateCrowdColor?.label || 'Unknown'}
                                                    </Text>
                                                    <View style={[s.forecastPill, { backgroundColor: dateCrowdColor?.bg || T.g[100] }]}>
                                                        <Text style={[s.forecastPillTxt, { color: dateCrowdColor?.color || T.g[500] }]}>
                                                            {dateCrowdData?.crowd_percentage ?? 0}%
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                        {/* Progress bar */}
                                        <View style={s.forecastBarBg}>
                                            <View style={[s.forecastBarFill, { width: `${dateCrowdData?.crowd_percentage ?? 0}%`, backgroundColor: dateCrowdColor?.color || T.g[300] }]} />
                                        </View>
                                        {dateCrowdData?.recommendation && (
                                            <View style={s.forecastTip}>
                                                <Ionicons name="bulb-outline" size={14} color={dateCrowdColor?.color || T.g[500]} />
                                                <Text style={[s.forecastTipText, { color: T.g[600] }]}>{dateCrowdData.recommendation}</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                </View>

                                {/* Golden Hour Duo */}
                                <View style={s.goldenRow}>
                                    <View style={s.goldenCard}>
                                        <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={s.goldenGrad}>
                                            <LinearGradient colors={['#FCD34D', '#F59E0B']} style={s.goldenIcon}>
                                                <FontAwesome5 name="sun" size={14} color={T.white} />
                                            </LinearGradient>
                                            <Text style={s.goldenLabel}>Morning</Text>
                                            <Text style={s.goldenTime}>{dateGoldenHourData?.golden_hour_morning?.start || '6:00'}</Text>
                                            <Text style={s.goldenTimeSub}>to {dateGoldenHourData?.golden_hour_morning?.end || '7:00'}</Text>
                                            <View style={s.goldenTagRow}>
                                                <FontAwesome5 name="camera" size={9} color="#B45309" />
                                                <Text style={s.goldenTagText}>Best light</Text>
                                            </View>
                                        </LinearGradient>
                                    </View>
                                    <View style={s.goldenCard}>
                                        <LinearGradient colors={['#FFF1E6', '#FFEDD5']} style={s.goldenGrad}>
                                            <LinearGradient colors={['#FB923C', '#EA580C']} style={s.goldenIcon}>
                                                <FontAwesome5 name="cloud-sun" size={13} color={T.white} />
                                            </LinearGradient>
                                            <Text style={s.goldenLabel}>Evening</Text>
                                            <Text style={s.goldenTime}>{dateGoldenHourData?.golden_hour_evening?.start || '5:30'}</Text>
                                            <Text style={s.goldenTimeSub}>to {dateGoldenHourData?.golden_hour_evening?.end || '6:30'}</Text>
                                            <View style={s.goldenTagRow}>
                                                <FontAwesome5 name="camera" size={9} color="#C2410C" />
                                                <Text style={[s.goldenTagText, { color: '#C2410C' }]}>Sunset glow</Text>
                                            </View>
                                        </LinearGradient>
                                    </View>
                                </View>

                                {/* Poya Day */}
                                {dateCrowdData?.is_poya_day && (
                                    <View style={s.poya}>
                                        <Text style={{ fontSize: 22 }}>🌕</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.poyaTitle}>Poya Day</Text>
                                            <Text style={s.poyaDesc}>Expect higher crowds at religious sites</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* ── Pro Tips ── */}
                    <View style={s.section}>
                        <View style={s.secHead}>
                            <View style={[s.secIconBg, { backgroundColor: '#D1FAE5' }]}>
                                <FontAwesome5 name="lightbulb" size={14} color="#059669" />
                            </View>
                            <Text style={s.secTitle}>Pro Tips</Text>
                        </View>
                        <View style={s.tipsCard}>
                            {[
                                { icon: 'camera-retro', text: 'Visit during golden hour for stunning photography' },
                                {
                                    icon: 'clock',
                                    text: crowdData?.crowd_status === 'HIGH' || crowdData?.crowd_status === 'EXTREME'
                                        ? 'Try early morning or late afternoon to avoid crowds'
                                        : 'Crowd levels are comfortable — great time to visit!',
                                },
                                { icon: 'robot', text: 'Chat with our AI Guide for hidden gems & local secrets' },
                            ].map((tip, i) => (
                                <View key={i} style={[s.tipRow, i < 2 && s.tipBorder]}>
                                    <View style={s.tipNumBg}>
                                        <FontAwesome5 name={tip.icon} size={12} color={T.white} />
                                    </View>
                                    <Text style={s.tipText}>{tip.text}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </Animated.View>
            </Animated.ScrollView>

            {/* ─── Bottom Action Bar ─── */}
            <View style={s.bottomBar}>
                <TouchableOpacity style={s.btnSecondary} activeOpacity={0.85} onPress={() => setShowTourPlanModal(true)}>
                    <MaterialCommunityIcons name="map-marker-path" size={20} color={T.primary} />
                    <Text style={s.btnSecText}>Plan Visit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnPrimary} activeOpacity={0.85} onPress={() => navigation.navigate('LocationChat', { locationName })}>
                    <LinearGradient colors={[T.primary, T.primaryDark]} style={s.btnPriGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <MaterialCommunityIcons name="robot-happy-outline" size={20} color={T.white} />
                        <Text style={s.btnPriText}>AI Guide Chat</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* ─── Tour Plan Modal ─── */}
            {showTourPlanModal && locationDetails !== null && (
                <TourPlanModal
                    visible={true}
                    onClose={() => setShowTourPlanModal(false)}
                    selectedLocation={{ name: locationDetails.name, coordinates: locationDetails.coordinates, imageUrls: locationDetails.imageUrls }}
                    onGeneratePlan={(planData) => {
                        const fmt = (d: Date) => { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${dd}`; };
                        navigation.navigate('TourPlanChat', {
                            selectedLocations: planData.selectedLocations.map(l => ({ name: l.name, latitude: l.latitude, longitude: l.longitude, imageUrl: l.imageUrl, distance_km: l.distance_km })),
                            startDate: fmt(planData.startDate),
                            endDate: fmt(planData.endDate),
                            preferences: [],
                        });
                    }}
                />
            )}
        </View>
    );
};

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
    // Root
    root: { flex: 1, backgroundColor: T.bg },

    // Loading / Error
    loadingRoot: { flex: 1, backgroundColor: T.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    loadingLottie: { width: 200, height: 200 },
    loadingTitle: { fontSize: 22, fontFamily: 'Gilroy-Bold', color: T.dark, marginTop: 20, textAlign: 'center' },
    loadingSub: { fontSize: 15, fontFamily: 'Gilroy-Regular', color: T.g[500], marginTop: 8, textAlign: 'center' },
    loadingDots: { flexDirection: 'row', marginTop: 24, gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.g[300] },
    dotActive: { backgroundColor: T.primary, width: 24 },
    errIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
    errBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 50, gap: 10 },
    errBtnText: { fontSize: 16, fontFamily: 'Gilroy-Bold', color: T.white },

    // Sticky Header
    stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
    stickyGrad: { paddingTop: 0 },
    stickyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12 },
    stickyBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    stickyTitle: { flex: 1, fontSize: 18, fontFamily: 'Gilroy-Bold', color: T.white, textAlign: 'center', marginHorizontal: 8 },

    // Hero
    hero: { height: IMAGE_HEIGHT, width: '100%', backgroundColor: T.g[200] },
    heroImg: { width, height: IMAGE_HEIGHT },
    noImg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    gradTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
    gradBot: { position: 'absolute', bottom: 0, left: 0, right: 0, height: IMAGE_HEIGHT * 0.55 },
    pagination: { position: 'absolute', bottom: 80, alignSelf: 'center', flexDirection: 'row', gap: 6 },
    pagDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
    pagDotActive: { backgroundColor: T.white, width: 22, borderRadius: 4 },

    // Nav buttons
    topNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
    navBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    navRight: { flexDirection: 'row', gap: 10 },

    // Hero bottom info
    heroBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 28 },
    heroName: { fontSize: 30, fontFamily: 'Gilroy-Bold', color: T.white, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, lineHeight: 36 },
    heroBadges: { flexDirection: 'row', gap: 8, marginTop: 10 },
    heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 5 },
    heroBadgeText: { fontSize: 12, fontFamily: 'Gilroy-SemiBold', color: T.dark },

    // Content Sheet
    sheet: { backgroundColor: T.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, paddingTop: 12, paddingBottom: 24, minHeight: height * 0.6, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 16 },
    handle: { width: 40, height: 4, backgroundColor: T.g[300], borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

    // Quick Glance Strip
    glanceRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 20 },
    glanceCard: { flex: 1, alignItems: 'center', backgroundColor: T.g[50], borderRadius: 18, paddingVertical: 14, paddingHorizontal: 6, borderWidth: 1, borderColor: T.g[100] },
    glanceIconBg: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    glanceVal: { fontSize: 18, fontFamily: 'Gilroy-Bold', color: T.dark, marginBottom: 1 },
    glanceLbl: { fontSize: 10, fontFamily: 'Gilroy-Medium', color: T.g[400], textTransform: 'uppercase', letterSpacing: 0.5 },

    // Category Tags
    tagRow: { paddingHorizontal: 20, gap: 8, flexDirection: 'row', marginBottom: 24 },
    tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
    tagText: { fontSize: 12, fontFamily: 'Gilroy-SemiBold', color: T.white },

    // Section shared
    section: { paddingHorizontal: 20, marginBottom: 26 },
    secHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
    secIconBg: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    secTitle: { fontSize: 17, fontFamily: 'Gilroy-Bold', color: T.dark, flex: 1 },

    // AI Card
    aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 },
    aiBadgeText: { fontSize: 10, fontFamily: 'Gilroy-Bold', color: T.primary },
    aiCard: { backgroundColor: T.white, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#FFEDD5', shadowColor: T.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
    aiText: { fontSize: 14, fontFamily: 'Gilroy-Regular', color: T.g[700], lineHeight: 23 },
    aiFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FFF7ED', gap: 6 },
    aiFooterText: { fontSize: 11, fontFamily: 'Gilroy-Medium', color: T.primary },

    // Date Strip
    dateStrip: { paddingHorizontal: 20, gap: 8, marginBottom: 18 },
    dateChip: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, minWidth: 62 },
    dateChipIdle: { backgroundColor: T.g[50], borderWidth: 1, borderColor: T.g[200] },
    dateDayTxt: { fontSize: 10, fontFamily: 'Gilroy-SemiBold', color: T.g[500], textTransform: 'uppercase', marginBottom: 3 },
    dateNumTxt: { fontSize: 20, fontFamily: 'Gilroy-Bold', color: T.dark, marginBottom: 1 },
    dateMonTxt: { fontSize: 9, fontFamily: 'Gilroy-Medium', color: T.g[400], textTransform: 'uppercase' },
    dateLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 10 },
    dateLoadText: { fontSize: 14, fontFamily: 'Gilroy-Medium', color: T.g[500] },

    // Forecast Card
    forecastCard: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
    forecastGrad: { padding: 18 },
    forecastTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
    forecastEmojiBg: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    forecastLabel: { fontSize: 12, fontFamily: 'Gilroy-Medium', color: T.g[500], marginBottom: 4 },
    forecastValRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    forecastVal: { fontSize: 18, fontFamily: 'Gilroy-Bold' },
    forecastPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    forecastPillTxt: { fontSize: 13, fontFamily: 'Gilroy-Bold' },
    forecastBarBg: { height: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
    forecastBarFill: { height: '100%', borderRadius: 3 },
    forecastTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)' },
    forecastTipText: { flex: 1, fontSize: 12, fontFamily: 'Gilroy-Regular', lineHeight: 18 },

    // Golden Hour Duo
    goldenRow: { flexDirection: 'row', gap: 10 },
    goldenCard: { flex: 1, borderRadius: 20, overflow: 'hidden' },
    goldenGrad: { padding: 16, alignItems: 'center' },
    goldenIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    goldenLabel: { fontSize: 11, fontFamily: 'Gilroy-SemiBold', color: T.g[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    goldenTime: { fontSize: 22, fontFamily: 'Gilroy-Bold', color: T.dark },
    goldenTimeSub: { fontSize: 12, fontFamily: 'Gilroy-Medium', color: T.g[500], marginTop: 2 },
    goldenTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: 'rgba(0,0,0,0.04)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    goldenTagText: { fontSize: 10, fontFamily: 'Gilroy-SemiBold', color: '#B45309' },

    // Poya
    poya: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: '#FDE68A' },
    poyaTitle: { fontSize: 14, fontFamily: 'Gilroy-Bold', color: '#92400E' },
    poyaDesc: { fontSize: 12, fontFamily: 'Gilroy-Regular', color: '#B45309', marginTop: 2 },

    // Tips
    tipsCard: { backgroundColor: T.white, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: T.g[100] },
    tipRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    tipBorder: { borderBottomWidth: 1, borderBottomColor: T.g[100] },
    tipNumBg: { width: 32, height: 32, borderRadius: 11, backgroundColor: T.success, alignItems: 'center', justifyContent: 'center' },
    tipText: { flex: 1, fontSize: 13, fontFamily: 'Gilroy-Regular', color: T.g[700], lineHeight: 20 },

    // Bottom Bar
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: T.white, flexDirection: 'row', gap: 10, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: T.g[100], shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 20 },
    btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, gap: 7 },
    btnSecText: { fontSize: 14, fontFamily: 'Gilroy-Bold', color: T.primary },
    btnPrimary: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: T.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
    btnPriGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 9 },
    btnPriText: { fontSize: 14, fontFamily: 'Gilroy-Bold', color: T.white },
});

export default LocationDetailsScreen;
