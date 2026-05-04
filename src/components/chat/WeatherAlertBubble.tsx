/**
 * WeatherAlertBubble — Inline weather decision prompt rendered when the
 * shadow monitor detects severe weather (rain >80%, wind >60 km/h, etc.)
 * and pauses the planning agent. The user picks one of three options;
 * the screen calls /chat/sessions/.../resume-weather to resume the graph.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import type { WeatherPromptOption } from '../../services/api/TourPlanService';

const C = {
  primary: '#F5840E',
  primaryDark: '#C2410C',
  aiBubble: '#FFFFFF',
  dark: '#1C1917',
  textMid: '#44403C',
  textSoft: '#78716C',
  white: '#FFFFFF',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  rainBlue: '#3B82F6',
};

const ICON_BY_CHOICE: Record<string, string> = {
  switch_indoor: 'home',
  reschedule: 'calendar',
  keep: 'umbrella',
};

interface Props {
  message: string;
  options: WeatherPromptOption[];
  disabled?: boolean;
  selectedId?: string | null;
  onChoose: (id: 'switch_indoor' | 'reschedule' | 'keep', label: string) => void;
}

export const WeatherAlertBubble: React.FC<Props> = ({
  message,
  options,
  disabled = false,
  selectedId = null,
  onChoose,
}) => {
  return (
    <View style={s.row}>
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        style={s.avatar}
      >
        <Text style={s.avatarLetter}>T</Text>
      </LinearGradient>
      <View style={s.bubble}>
        <View style={s.headerRow}>
          <View style={s.iconWrap}>
            <Ionicons name="rainy" size={18} color={C.rainBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerLabel}>Weather alert</Text>
            <Text style={s.headerMessage}>{message}</Text>
          </View>
        </View>

        <View style={{ gap: 8, marginTop: 6 }}>
          {options.map(opt => {
            const isSelected = selectedId === opt.id;
            const icon = ICON_BY_CHOICE[opt.id] || 'help-circle';
            return (
              <TouchableOpacity
                key={opt.id}
                disabled={disabled}
                style={[
                  s.option,
                  isSelected && s.optionSelected,
                  disabled && !isSelected && s.optionDisabled,
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  onChoose(
                    opt.id as 'switch_indoor' | 'reschedule' | 'keep',
                    opt.label,
                  )
                }
              >
                <View
                  style={[
                    s.optionIconWrap,
                    isSelected && { backgroundColor: 'rgba(255,255,255,0.25)' },
                  ]}
                >
                  <Ionicons
                    name={icon as any}
                    size={16}
                    color={isSelected ? C.white : C.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[s.optionLabel, isSelected && { color: C.white }]}
                  >
                    {opt.label}
                  </Text>
                  {opt.description ? (
                    <Text
                      style={[
                        s.optionDesc,
                        isSelected && { color: 'rgba(255,255,255,0.85)' },
                      ]}
                    >
                      {opt.description}
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                  size={isSelected ? 18 : 14}
                  color={isSelected ? C.white : C.primary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
    marginTop: 2,
    gap: 7,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: C.white,
  },
  bubble: {
    flex: 1,
    backgroundColor: C.aiBubble,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245,132,14,0.18)',
    borderLeftWidth: 3,
    borderLeftColor: C.warning,
    padding: 12,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Bold',
    color: C.warning,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerMessage: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-SemiBold',
    color: C.dark,
    lineHeight: 19,
    marginTop: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFAF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,132,14,0.28)',
    padding: 10,
  },
  optionSelected: {
    backgroundColor: C.primary,
    borderColor: C.primaryDark,
  },
  optionDisabled: { opacity: 0.5 },
  optionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-Bold',
    color: C.dark,
  },
  optionDesc: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Regular',
    color: C.textSoft,
    marginTop: 1,
    lineHeight: 16,
  },
});

export default WeatherAlertBubble;
