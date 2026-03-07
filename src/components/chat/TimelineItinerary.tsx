/**
 * TimelineItinerary
 *
 * Minimalist vertical timeline displaying the finalized tour plan.
 * Differentiates Sightseeing / Dining / Hotel stops with distinct icons.
 * Shows "Best for Photos" golden-hour badges and "View on Map" links.
 *
 * Design: Slate-900 text · Indigo-600 accents · Clean card UI
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { FinalItinerary, FinalItineraryStop } from '../../services/api/TourPlanService';

// ── Minimalist Palette ──
const P = {
  slate900: '#0F172A',
  slate700: '#334155',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  indigo600: '#4F46E5',
  indigo50: '#EEF2FF',
  amber500: '#F59E0B',
  amber50: '#FFFBEB',
  emerald600: '#059669',
  emerald50: '#ECFDF5',
  sky600: '#0284C7',
  sky50: '#F0F9FF',
  rose500: '#F43F5E',
  rose50: '#FFF1F2',
  white: '#FFFFFF',
};

// ── Activity type inference ──
type ActivityType = 'sightseeing' | 'dining' | 'hotel' | 'transport';

const inferActivityType = (stop: FinalItineraryStop): ActivityType => {
  const a = (stop.activity || '').toLowerCase();
  const l = (stop.location || '').toLowerCase();
  const icon = (stop.icon || '').toLowerCase();

  if (icon === 'bed' || icon === 'rest' || a.includes('check-in') || a.includes('hotel') || a.includes('accommodation') || l.includes('hotel') || l.includes('resort'))
    return 'hotel';
  if (icon === 'food' || a.includes('lunch') || a.includes('dinner') || a.includes('breakfast') || a.includes('dining') || a.includes('restaurant') || a.includes('food') || a.includes('cafe') || a.includes('eat'))
    return 'dining';
  return 'sightseeing';
};

const ACTIVITY_STYLE: Record<ActivityType, { icon: string; family: 'ion' | 'mci'; color: string; bg: string; label: string }> = {
  sightseeing: { icon: 'eye-outline', family: 'ion', color: P.indigo600, bg: P.indigo50, label: 'Sightseeing' },
  dining: { icon: 'restaurant-outline', family: 'ion', color: P.amber500, bg: P.amber50, label: 'Dining' },
  hotel: { icon: 'bed-outline', family: 'ion', color: P.emerald600, bg: P.emerald50, label: 'Hotel' },
  transport: { icon: 'car-outline', family: 'ion', color: P.sky600, bg: P.sky50, label: 'Transport' },
};

// ── Map launcher ──
const openInMaps = (lat: number, lng: number, label: string) => {
  const encodedLabel = encodeURIComponent(label);
  const url = Platform.select({
    ios: `maps:0,0?q=${encodedLabel}&ll=${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`,
  });
  if (url) Linking.openURL(url).catch(() => { });
};

// ── Sub-components ──

const DayDivider: React.FC<{ day: number; stopCount: number }> = ({ day, stopCount }) => (
  <View style={s.dayDivider}>
    <View style={s.dayPill}>
      <Text style={s.dayPillText}>Day {day}</Text>
    </View>
    <View style={s.dayLine} />
    <Text style={s.dayMeta}>{stopCount} stops</Text>
  </View>
);

interface StopCardProps {
  stop: FinalItineraryStop;
  isLast: boolean;
  index: number;
}

const StopCard: React.FC<StopCardProps> = ({ stop, isLast, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const type = inferActivityType(stop);
  const cfg = ACTIVITY_STYLE[type];
  const isGoldenHour = stop.lighting_quality === 'golden' || stop.best_for_photos;
  const hasCoords = stop.coordinates?.lat != null && stop.coordinates?.lng != null;

  // Crowd level label
  const crowdLabel =
    stop.crowd_prediction <= 25 ? 'Very Low' :
      stop.crowd_prediction <= 50 ? 'Low' :
        stop.crowd_prediction <= 70 ? 'Moderate' :
          stop.crowd_prediction <= 85 ? 'High' : 'Very High';

  const crowdColor =
    stop.crowd_prediction <= 50 ? P.emerald600 :
      stop.crowd_prediction <= 75 ? P.amber500 : P.rose500;

  return (
    <Animated.View
      style={[
        s.stopRow,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Timeline rail */}
      <View style={s.rail}>
        <View style={[s.railDot, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
          {cfg.family === 'mci' ? (
            <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.color} />
          ) : (
            <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
          )}
        </View>
        {!isLast && <View style={s.railLine} />}
      </View>

      {/* Content card */}
      <View style={[s.stopCard, isGoldenHour && s.stopCardGolden]}>
        {/* Top bar: time + duration + type badge */}
        <View style={s.topBar}>
          <Text style={s.timeText}>{stop.time}</Text>
          <View style={s.durationPill}>
            <Ionicons name="time-outline" size={10} color={P.slate400} />
            <Text style={s.durationText}>{stop.duration_minutes} min</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={[s.typeBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Location & Activity */}
        <Text style={s.locationName}>{stop.location}</Text>
        <Text style={s.activityText}>{stop.activity}</Text>

        {/* Badges row */}
        <View style={s.badgesRow}>
          {/* Golden Hour */}
          {isGoldenHour && (
            <View style={s.goldenBadge}>
              <MaterialCommunityIcons name="white-balance-sunny" size={12} color={P.amber500} />
              <Text style={s.goldenText}>Best for Photos</Text>
              {stop.best_photo_time ? (
                <Text style={s.goldenTime}>{stop.best_photo_time}</Text>
              ) : null}
            </View>
          )}

          {/* Visual Hierarchy */}
          {stop.visual_hierarchy === 1 && (
            <View style={[s.hierBadge, { backgroundColor: P.indigo50 }]}>
              <Ionicons name="diamond-outline" size={10} color={P.indigo600} />
              <Text style={[s.hierText, { color: P.indigo600 }]}>Must-See</Text>
            </View>
          )}
          {stop.visual_hierarchy === 2 && (
            <View style={[s.hierBadge, { backgroundColor: P.emerald50 }]}>
              <Ionicons name="thumbs-up-outline" size={10} color={P.emerald600} />
              <Text style={[s.hierText, { color: P.emerald600 }]}>Recommended</Text>
            </View>
          )}
        </View>

        {/* Metrics strip */}
        <View style={s.metricsStrip}>
          {/* Crowd */}
          <View style={s.metric}>
            <Ionicons name="people-outline" size={12} color={crowdColor} />
            <Text style={[s.metricValue, { color: crowdColor }]}>{crowdLabel}</Text>
          </View>

          {/* Lighting */}
          <View style={s.metric}>
            <MaterialCommunityIcons
              name={
                stop.lighting_quality === 'golden' ? 'white-balance-sunny'
                  : stop.lighting_quality === 'good' ? 'weather-partly-cloudy'
                    : 'weather-cloudy'
              }
              size={12}
              color={P.slate400}
            />
            <Text style={s.metricLabel}>
              {stop.lighting_quality ? stop.lighting_quality.charAt(0).toUpperCase() + stop.lighting_quality.slice(1) : 'Good'}
            </Text>
          </View>

          {/* Weather */}
          {stop.weather_summary && (
            <View style={s.metric}>
              <MaterialCommunityIcons name="weather-partly-cloudy" size={12} color={P.sky600} />
              <Text style={s.metricLabel} numberOfLines={1}>{stop.weather_summary}</Text>
            </View>
          )}
        </View>

        {/* AI Insight */}
        {stop.ai_insight && (
          <View style={s.insightRow}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={12} color={P.indigo600} />
            <Text style={s.insightText}>{stop.ai_insight}</Text>
          </View>
        )}

        {/* Cultural / Ethical tips */}
        {stop.cultural_tip && (
          <View style={s.insightRow}>
            <MaterialCommunityIcons name="hand-heart" size={12} color={P.amber500} />
            <Text style={s.insightText}>{stop.cultural_tip}</Text>
          </View>
        )}

        {/* View on Map */}
        {hasCoords && (
          <TouchableOpacity
            style={s.mapLink}
            onPress={() => openInMaps(stop.coordinates.lat, stop.coordinates.lng, stop.location)}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={13} color={P.indigo600} />
            <Text style={s.mapLinkText}>View on Map</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

// ── Main Component ──

interface TimelineItineraryProps {
  itinerary: FinalItinerary;
  onViewMap?: (lat: number, lng: number, label: string) => void;
}

const TimelineItinerary: React.FC<TimelineItineraryProps> = ({
  itinerary,
  onViewMap,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Group stops by day
  const byDay = (itinerary.stops || []).reduce<Record<number, FinalItineraryStop[]>>((acc, stop) => {
    const d = stop.day || 1;
    if (!acc[d]) acc[d] = [];
    acc[d].push(stop);
    return acc;
  }, {});
  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);

  return (
    <Animated.View style={[s.root, { opacity: fadeAnim }]}>
      {/* Summary header */}
      <View style={s.summaryHeader}>
        <View style={s.summaryIcon}>
          <MaterialCommunityIcons name="map-marker-path" size={18} color={P.indigo600} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.summaryTitle}>Your Itinerary</Text>
          <Text style={s.summaryMeta}>
            {itinerary.total_days} day{itinerary.total_days > 1 ? 's' : ''} · {itinerary.stops.length} stops · {itinerary.total_distance_km?.toFixed(0)} km
          </Text>
        </View>
      </View>

      {/* Summary text */}
      {itinerary.summary ? (
        <Text style={s.summaryText}>{itinerary.summary}</Text>
      ) : null}

      {/* Warnings */}
      {itinerary.warnings && itinerary.warnings.length > 0 && (
        <View style={s.warningBox}>
          {itinerary.warnings.map((w, i) => (
            <View key={i} style={s.warningRow}>
              <Ionicons name="alert-circle" size={13} color={P.amber500} />
              <Text style={s.warningText}>{w}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Timeline */}
      {days.map(day => {
        const stops = byDay[day];
        return (
          <View key={day}>
            <DayDivider day={day} stopCount={stops.length} />
            {stops.map((stop, idx) => (
              <StopCard
                key={`${day}-${idx}`}
                stop={stop}
                isLast={idx === stops.length - 1}
                index={idx}
              />
            ))}
          </View>
        );
      })}

      {/* Tips */}
      {itinerary.tips && itinerary.tips.length > 0 && (
        <View style={s.tipsBox}>
          <View style={s.tipsHeader}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={P.emerald600} />
            <Text style={s.tipsHeaderText}>Pro Tips</Text>
          </View>
          {itinerary.tips.map((tip, i) => (
            <Text key={i} style={s.tipItem}>• {tip}</Text>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

export default TimelineItinerary;

// ── Styles ──

const s = StyleSheet.create({
  root: {
    paddingBottom: 8,
  },

  // Summary
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: P.indigo50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 17,
    fontFamily: 'Gilroy-Bold',
    color: P.slate900,
    letterSpacing: -0.3,
  },
  summaryMeta: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: P.slate400,
    marginTop: 1,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: P.slate500,
    lineHeight: 19,
    marginBottom: 12,
  },

  // Warnings
  warningBox: {
    backgroundColor: P.amber50,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: P.slate700,
    lineHeight: 17,
  },

  // Day Divider
  dayDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
    gap: 10,
  },
  dayPill: {
    backgroundColor: P.slate900,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 100,
  },
  dayPillText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: P.white,
    letterSpacing: 0.3,
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: P.slate100,
  },
  dayMeta: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: P.slate400,
  },

  // Stop row
  stopRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },

  // Rail
  rail: {
    width: 36,
    alignItems: 'center',
  },
  railDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.white,
    zIndex: 1,
  },
  railLine: {
    width: 2,
    flex: 1,
    backgroundColor: P.slate100,
    marginTop: -2,
    marginBottom: -2,
  },

  // Card
  stopCard: {
    flex: 1,
    backgroundColor: P.white,
    borderRadius: 14,
    padding: 14,
    marginLeft: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: P.slate100,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stopCardGolden: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  timeText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: P.slate900,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.slate50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  durationText: {
    fontSize: 10,
    fontFamily: 'Gilroy-Medium',
    color: P.slate400,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: 'Gilroy-Bold',
    letterSpacing: 0.3,
  },

  // Location
  locationName: {
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: P.slate900,
    letterSpacing: -0.2,
  },
  activityText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: P.slate500,
    marginTop: 2,
    lineHeight: 18,
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  goldenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.amber50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  goldenText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    color: P.amber500,
  },
  goldenTime: {
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
    color: P.slate400,
  },
  hierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  hierText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
  },

  // Metrics strip
  metricsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: P.slate400,
  },

  // Insight
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 6,
    backgroundColor: P.slate50,
    padding: 8,
    borderRadius: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: P.slate700,
    lineHeight: 17,
  },

  // Map link
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  mapLinkText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: P.indigo600,
  },

  // Tips
  tipsBox: {
    backgroundColor: P.emerald50,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  tipsHeaderText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: P.emerald600,
  },
  tipItem: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: P.slate700,
    lineHeight: 18,
    marginBottom: 4,
  },
});
