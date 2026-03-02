/**
 * TourPlanCard Component
 * Displays an AI-generated tour plan with timeline view
 * Matches the chatbot interface styling with Accept/Modify buttons
 */

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    ScrollView,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import type { ItinerarySlot, TourPlanMetadata, ConstraintViolation } from '@services/api';

const { width } = Dimensions.get('window');

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

// Icon mapping for activities
const ACTIVITY_ICONS: Record<string, string> = {
    sunrise: 'weather-sunset-up',
    sunset: 'weather-sunset-down',
    photography: 'camera',
    walking: 'walk',
    hiking: 'hiking',
    food: 'food-fork-drink',
    temple: 'temple-hindu',
    beach: 'beach',
    wildlife: 'elephant',
    cultural: 'account-group',
    nature: 'nature',
    exploration: 'compass',
    rest: 'bed',
    default: 'map-marker',
};

interface TourPlanCardProps {
    itinerary: ItinerarySlot[];
    metadata: TourPlanMetadata;
    constraints?: ConstraintViolation[];
    warnings?: string[];
    tips?: string[];
    onAccept: () => void;
    onModify: () => void;
    isLoading?: boolean;
}

// Helper to get icon for activity
const getActivityIcon = (iconName?: string, activity?: string): string => {
    if (iconName && ACTIVITY_ICONS[iconName]) {
        return ACTIVITY_ICONS[iconName];
    }

    const activityLower = (activity || '').toLowerCase();

    if (activityLower.includes('sunrise')) return ACTIVITY_ICONS.sunrise;
    if (activityLower.includes('sunset')) return ACTIVITY_ICONS.sunset;
    if (activityLower.includes('photo')) return ACTIVITY_ICONS.photography;
    if (activityLower.includes('hik')) return ACTIVITY_ICONS.hiking;
    if (activityLower.includes('walk')) return ACTIVITY_ICONS.walking;
    if (activityLower.includes('food') || activityLower.includes('lunch') || activityLower.includes('dinner') || activityLower.includes('breakfast')) return ACTIVITY_ICONS.food;
    if (activityLower.includes('temple') || activityLower.includes('sacred')) return ACTIVITY_ICONS.temple;
    if (activityLower.includes('beach')) return ACTIVITY_ICONS.beach;
    if (activityLower.includes('wildlife') || activityLower.includes('safari')) return ACTIVITY_ICONS.wildlife;
    if (activityLower.includes('cultural')) return ACTIVITY_ICONS.cultural;
    if (activityLower.includes('nature')) return ACTIVITY_ICONS.nature;
    if (activityLower.includes('rest') || activityLower.includes('relax')) return ACTIVITY_ICONS.rest;

    return ACTIVITY_ICONS.default;
};

// Timeline item component
const TimelineItem: React.FC<{
    slot: ItinerarySlot;
    isFirst: boolean;
    isLast: boolean;
}> = ({ slot, isFirst, isLast }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay: (slot.order || 0) * 100,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                delay: (slot.order || 0) * 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const iconName = getActivityIcon(slot.icon, slot.activity);
    const isHighlight = slot.highlight;

    return (
        <Animated.View
            style={[
                styles.timelineItem,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            {/* Timeline connector */}
            <View style={styles.timelineConnector}>
                <View
                    style={[
                        styles.timelineDot,
                        isHighlight && styles.timelineDotHighlight,
                    ]}
                >
                    <MaterialCommunityIcons
                        name={iconName}
                        size={14}
                        color={isHighlight ? THEME.white : THEME.primary}
                    />
                </View>
                {!isLast && <View style={styles.timelineLine} />}
            </View>

            {/* Content */}
            <View style={[styles.timelineContent, isHighlight && styles.timelineContentHighlight]}>
                <View style={styles.timelineHeader}>
                    <View style={styles.timelineTimeContainer}>
                        <FontAwesome5 name="clock" size={10} color={THEME.gray[500]} />
                        <Text style={styles.timelineTime}>{slot.time}</Text>
                    </View>
                    <View style={styles.timelineDurationBadge}>
                        <Text style={styles.timelineDuration}>{slot.duration_minutes} min</Text>
                    </View>
                </View>

                <Text style={styles.timelineLocation}>{slot.location}</Text>
                <Text style={styles.timelineActivity}>{slot.activity}</Text>

                {/* Metrics row */}
                <View style={styles.metricsRow}>
                    {/* Crowd Level */}
                    <View style={styles.metricItem}>
                        <MaterialCommunityIcons
                            name="account-group"
                            size={12}
                            color={
                                slot.crowd_prediction <= 3
                                    ? THEME.success
                                    : slot.crowd_prediction <= 6
                                        ? THEME.warning
                                        : THEME.error
                            }
                        />
                        <Text style={styles.metricText}>
                            {slot.crowd_prediction <= 3 ? 'Low' : slot.crowd_prediction <= 6 ? 'Medium' : 'High'}
                        </Text>
                    </View>

                    {/* Lighting Quality */}
                    <View style={styles.metricItem}>
                        <MaterialCommunityIcons
                            name={
                                slot.lighting_quality === 'golden'
                                    ? 'white-balance-sunny'
                                    : slot.lighting_quality === 'good'
                                        ? 'weather-partly-cloudy'
                                        : 'weather-cloudy'
                            }
                            size={12}
                            color={
                                slot.lighting_quality === 'golden'
                                    ? THEME.primary
                                    : slot.lighting_quality === 'good'
                                        ? THEME.success
                                        : THEME.gray[500]
                            }
                        />
                        <Text style={styles.metricText}>{slot.lighting_quality || 'Good'}</Text>
                    </View>
                </View>

                {/* AI Insight */}
                {slot.ai_insight && (
                    <View style={styles.aiInsightContainer}>
                        <MaterialCommunityIcons name="lightbulb-outline" size={12} color={THEME.secondary} />
                        <Text style={styles.aiInsightText}>{slot.ai_insight}</Text>
                    </View>
                )}

                {/* Notes */}
                {slot.notes && (
                    <Text style={styles.timelineNotes}>{slot.notes}</Text>
                )}
            </View>
        </Animated.View>
    );
};

// Day header component
const DayHeader: React.FC<{ day: number; totalActivities: number }> = ({ day, totalActivities }) => (
    <View style={styles.dayHeader}>
        <LinearGradient
            colors={[THEME.primary, THEME.primaryDark]}
            style={styles.dayBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <Text style={styles.dayBadgeText}>Day {day}</Text>
        </LinearGradient>
        <Text style={styles.dayActivitiesCount}>{totalActivities} activities planned</Text>
    </View>
);

// Warning item component
const WarningItem: React.FC<{ text: string }> = ({ text }) => (
    <View style={styles.warningItem}>
        <Ionicons name="alert-circle" size={14} color={THEME.warning} />
        <Text style={styles.warningText}>{text}</Text>
    </View>
);

// Tip item component
const TipItem: React.FC<{ text: string }> = ({ text }) => (
    <View style={styles.tipItem}>
        <MaterialCommunityIcons name="lightbulb-on" size={14} color={THEME.success} />
        <Text style={styles.tipText}>{text}</Text>
    </View>
);

export const TourPlanCard: React.FC<TourPlanCardProps> = ({
    itinerary,
    metadata,
    constraints,
    warnings,
    tips,
    onAccept,
    onModify,
    isLoading = false,
}) => {
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
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
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Group itinerary by day
    const itineraryByDay = itinerary.reduce<Record<number, ItinerarySlot[]>>((acc, slot) => {
        const day = slot.day || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(slot);
        return acc;
    }, {});

    const sortedDays = Object.keys(itineraryByDay)
        .map(Number)
        .sort((a, b) => a - b);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            {/* Header with AI badge and match score */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.aiBadge}>
                        <MaterialCommunityIcons name="robot" size={12} color={THEME.white} />
                        <Text style={styles.aiBadgeText}>AI OPTIMIZED</Text>
                    </View>
                    <Text style={styles.planTitle}>Your Tour Plan</Text>
                </View>

                {/* Match Score */}
                <View style={styles.matchScoreContainer}>
                    <LinearGradient
                        colors={[THEME.success, '#059669']}
                        style={styles.matchScoreGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.matchScoreValue}>{Math.round(metadata.match_score * 100)}%</Text>
                        <Text style={styles.matchScoreLabel}>Match</Text>
                    </LinearGradient>
                </View>
            </View>

            {/* Summary stats */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="calendar-range" size={16} color={THEME.primary} />
                    <Text style={styles.statValue}>{metadata.total_days}</Text>
                    <Text style={styles.statLabel}>Days</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="map-marker-multiple" size={16} color={THEME.primary} />
                    <Text style={styles.statValue}>{metadata.total_locations}</Text>
                    <Text style={styles.statLabel}>Locations</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="clipboard-check" size={16} color={THEME.primary} />
                    <Text style={styles.statValue}>{itinerary.length}</Text>
                    <Text style={styles.statLabel}>Activities</Text>
                </View>
            </View>

            {/* Optimization badges */}
            <View style={styles.optimizationRow}>
                {metadata.golden_hour_optimized && (
                    <View style={[styles.optimizationBadge, { backgroundColor: '#FEF3C7' }]}>
                        <MaterialCommunityIcons name="weather-sunset" size={12} color="#D97706" />
                        <Text style={[styles.optimizationText, { color: '#D97706' }]}>Golden Hour</Text>
                    </View>
                )}
                {metadata.crowd_optimized && (
                    <View style={[styles.optimizationBadge, { backgroundColor: '#D1FAE5' }]}>
                        <MaterialCommunityIcons name="account-group-outline" size={12} color="#059669" />
                        <Text style={[styles.optimizationText, { color: '#059669' }]}>Crowd Optimized</Text>
                    </View>
                )}
                {metadata.event_aware && (
                    <View style={[styles.optimizationBadge, { backgroundColor: '#E0E7FF' }]}>
                        <MaterialCommunityIcons name="calendar-star" size={12} color="#4F46E5" />
                        <Text style={[styles.optimizationText, { color: '#4F46E5' }]}>Event Aware</Text>
                    </View>
                )}
            </View>

            {/* Timeline */}
            <View style={styles.timelineContainer}>
                {sortedDays.map((day) => (
                    <View key={day}>
                        <DayHeader day={day} totalActivities={itineraryByDay[day].length} />
                        {itineraryByDay[day].map((slot, index) => (
                            <TimelineItem
                                key={`${day}-${index}`}
                                slot={slot}
                                isFirst={index === 0}
                                isLast={index === itineraryByDay[day].length - 1}
                            />
                        ))}
                    </View>
                ))}
            </View>

            {/* Warnings */}
            {warnings && warnings.length > 0 && (
                <View style={styles.warningsContainer}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="warning" size={14} color={THEME.warning} /> Heads Up
                    </Text>
                    {warnings.map((warning, index) => (
                        <WarningItem key={index} text={warning} />
                    ))}
                </View>
            )}

            {/* Tips */}
            {tips && tips.length > 0 && (
                <View style={styles.tipsContainer}>
                    <Text style={styles.sectionTitle}>
                        <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={THEME.success} /> Pro Tips
                    </Text>
                    {tips.map((tip, index) => (
                        <TipItem key={index} text={tip} />
                    ))}
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.modifyButton}
                    onPress={onModify}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={THEME.primary} />
                    <Text style={styles.modifyButtonText}>Modify</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={onAccept}
                    activeOpacity={0.8}
                    disabled={isLoading}
                >
                    <LinearGradient
                        colors={[THEME.success, '#059669']}
                        style={styles.acceptButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="checkmark-circle" size={18} color={THEME.white} />
                        <Text style={styles.acceptButtonText}>Accept Plan</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: THEME.white,
        borderRadius: 20,
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    headerLeft: {
        flex: 1,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.secondary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        gap: 4,
    },
    aiBadgeText: {
        fontSize: 10,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
        letterSpacing: 0.5,
    },
    planTitle: {
        fontSize: 20,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
        marginTop: 8,
    },
    matchScoreContainer: {
        marginLeft: 12,
    },
    matchScoreGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    matchScoreValue: {
        fontSize: 16,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
    },
    matchScoreLabel: {
        fontSize: 9,
        fontFamily: 'Gilroy-Medium',
        color: THEME.white,
        opacity: 0.9,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: THEME.gray[50],
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
        marginTop: 4,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[500],
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: THEME.gray[200],
    },
    optimizationRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    optimizationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    optimizationText: {
        fontSize: 11,
        fontFamily: 'Gilroy-SemiBold',
    },
    timelineContainer: {
        marginTop: 8,
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
    },
    dayBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    dayBadgeText: {
        fontSize: 12,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
    },
    dayActivitiesCount: {
        fontSize: 12,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[500],
        marginLeft: 10,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    timelineConnector: {
        width: 36,
        alignItems: 'center',
    },
    timelineDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: THEME.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: THEME.primary,
    },
    timelineDotHighlight: {
        backgroundColor: THEME.primary,
        borderColor: THEME.primaryDark,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: THEME.gray[200],
        marginVertical: 2,
    },
    timelineContent: {
        flex: 1,
        backgroundColor: THEME.gray[50],
        borderRadius: 12,
        padding: 12,
        marginLeft: 8,
        marginBottom: 8,
    },
    timelineContentHighlight: {
        backgroundColor: THEME.primaryLight,
        borderWidth: 1,
        borderColor: THEME.primary,
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    timelineTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timelineTime: {
        fontSize: 12,
        fontFamily: 'Gilroy-SemiBold',
        color: THEME.gray[600],
    },
    timelineDurationBadge: {
        backgroundColor: THEME.gray[200],
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    timelineDuration: {
        fontSize: 10,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[600],
    },
    timelineLocation: {
        fontSize: 14,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
        marginBottom: 2,
    },
    timelineActivity: {
        fontSize: 13,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[600],
        marginBottom: 8,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 6,
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metricText: {
        fontSize: 11,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[600],
        textTransform: 'capitalize',
    },
    aiInsightContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#EDE9FE',
        padding: 8,
        borderRadius: 8,
        marginTop: 6,
        gap: 6,
    },
    aiInsightText: {
        fontSize: 11,
        fontFamily: 'Gilroy-Medium',
        color: THEME.secondary,
        flex: 1,
        lineHeight: 16,
    },
    timelineNotes: {
        fontSize: 11,
        fontFamily: 'Gilroy-Regular',
        color: THEME.gray[500],
        marginTop: 4,
        fontStyle: 'italic',
    },
    warningsContainer: {
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontFamily: 'Gilroy-Bold',
        color: THEME.dark,
        marginBottom: 8,
    },
    warningItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 6,
    },
    warningText: {
        fontSize: 12,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[700],
        flex: 1,
        lineHeight: 18,
    },
    tipsContainer: {
        backgroundColor: '#ECFDF5',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 6,
    },
    tipText: {
        fontSize: 12,
        fontFamily: 'Gilroy-Medium',
        color: THEME.gray[700],
        flex: 1,
        lineHeight: 18,
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    modifyButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: THEME.primary,
        gap: 6,
    },
    modifyButtonText: {
        fontSize: 14,
        fontFamily: 'Gilroy-Bold',
        color: THEME.primary,
    },
    acceptButton: {
        flex: 1.5,
        borderRadius: 14,
        overflow: 'hidden',
    },
    acceptButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
    },
    acceptButtonText: {
        fontSize: 14,
        fontFamily: 'Gilroy-Bold',
        color: THEME.white,
    },
});

export default TourPlanCard;
