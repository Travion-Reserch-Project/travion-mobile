/**
 * WeatherDecisionModal
 *
 * Minimalist alert card rendered in the chat flow when the AI Engine
 * enters a USER_PROMPT_REQUIRED state due to weather constraints.
 *
 * Heading: "Environmental Change Detected"
 * Design: Slate-900 text · Indigo-600 actions · Animated rain icon
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { WeatherPromptOption } from '../../services/api/TourPlanService';

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
  sky600: '#0284C7',
  sky50: '#F0F9FF',
  emerald600: '#059669',
  emerald50: '#ECFDF5',
  rose500: '#F43F5E',
  white: '#FFFFFF',
};

// ── Animated Weather Icon ──
const AnimatedRainCloud: React.FC = () => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const dropAnim1 = useRef(new Animated.Value(0)).current;
  const dropAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle cloud bob
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -3, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 3, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();

    // Rain drop 1
    Animated.loop(
      Animated.sequence([
        Animated.timing(dropAnim1, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(dropAnim1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ).start();

    // Rain drop 2 (staggered)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dropAnim2, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(dropAnim2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ).start();
    }, 400);
  }, [bounceAnim, dropAnim1, dropAnim2]);

  return (
    <View style={s.iconWrapper}>
      <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
        <MaterialCommunityIcons name="weather-pouring" size={32} color={P.sky600} />
      </Animated.View>
      {/* Drop animations */}
      <Animated.View
        style={[
          s.raindrop,
          { left: 18 },
          {
            opacity: dropAnim1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateY: dropAnim1.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          s.raindrop,
          { left: 28 },
          {
            opacity: dropAnim2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateY: dropAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) },
            ],
          },
        ]}
      />
    </View>
  );
};

// ── Config per option ──
const OPTION_CONFIG: Record<string, { icon: string; iconFamily: 'ion' | 'mci'; accent: string; bg: string }> = {
  switch_indoor: { icon: 'home-outline', iconFamily: 'ion', accent: P.indigo600, bg: P.indigo50 },
  keep: { icon: 'shield-checkmark-outline', iconFamily: 'ion', accent: P.emerald600, bg: P.emerald50 },
  reschedule: { icon: 'calendar-clock', iconFamily: 'mci', accent: P.amber500, bg: P.amber50 },
};

const defaultConfig = { icon: 'help-circle-outline', iconFamily: 'ion' as const, accent: P.slate500, bg: P.slate50 };

// ── Main Component ──

interface WeatherDecisionModalProps {
  message: string;
  options: WeatherPromptOption[];
  onSelect: (optionId: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

const WeatherDecisionModal: React.FC<WeatherDecisionModalProps> = ({
  message,
  options,
  onSelect,
  disabled = false,
  loading = false,
}) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  return (
    <Animated.View
      style={[
        s.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Header */}
      <View style={s.header}>
        <AnimatedRainCloud />
        <View style={s.headerText}>
          <Text style={s.heading}>Environmental Change Detected</Text>
          <Text style={s.subheading}>Weather advisory for your itinerary</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Prompt */}
      <Text style={s.promptMessage}>{message}</Text>

      {/* Option Buttons */}
      <View style={s.optionsWrap}>
        {options.map(option => {
          const cfg = OPTION_CONFIG[option.id] || defaultConfig;
          return (
            <TouchableOpacity
              key={option.id}
              style={[s.optionBtn, disabled && s.optionBtnDisabled]}
              onPress={() => onSelect(option.id)}
              disabled={disabled || loading}
              activeOpacity={0.7}
            >
              <View style={[s.optionIcon, { backgroundColor: cfg.bg }]}>
                {cfg.iconFamily === 'mci' ? (
                  <MaterialCommunityIcons name={cfg.icon} size={20} color={cfg.accent} />
                ) : (
                  <Ionicons name={cfg.icon as any} size={20} color={cfg.accent} />
                )}
              </View>
              <View style={s.optionBody}>
                <Text style={s.optionLabel}>{option.label}</Text>
                <Text style={s.optionDesc} numberOfLines={2}>{option.description}</Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color={P.indigo600} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={P.slate200} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

export default WeatherDecisionModal;

// ── Styles ──

const s = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 4,
    backgroundColor: P.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: P.slate100,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: P.sky50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  raindrop: {
    position: 'absolute',
    bottom: 4,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: P.sky600,
  },
  headerText: {
    flex: 1,
  },
  heading: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: P.slate900,
    letterSpacing: -0.2,
  },
  subheading: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: P.slate400,
    marginTop: 2,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: P.slate100,
    marginVertical: 16,
  },

  // Prompt
  promptMessage: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: P.slate700,
    lineHeight: 21,
    marginBottom: 18,
  },

  // Options
  optionsWrap: {
    gap: 10,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.slate50,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.slate100,
  },
  optionBtnDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionBody: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: P.slate900,
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: P.slate500,
    marginTop: 2,
    lineHeight: 16,
  },
});
