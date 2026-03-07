/**
 * SelectionPrompt
 *
 * Bottom-bar selection UI for HITL flows – inspired by Claude Code's
 * "ask user" prompt. Option chips float above the message input field,
 * and the text box itself becomes a custom-answer field.
 * Designed to replace the regular input area when the AI needs a choice.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { SelectionCard } from '../../services/api/TourPlanService';

const { width: SCREEN_W } = Dimensions.get('window');
const BOTTOM_SAFE = Platform.OS === 'ios' ? 34 : 16;

// ── Palette (matches chat theme) ──
const C = {
  chatBg: '#ECE5DD',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#E2E8F0',
  primary: '#F5840E',
  primaryLight: '#FFF7ED',
  primaryDark: '#C2410C',
  text: '#1F2937',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  amber: '#F59E0B',
  emerald: '#059669',
  white: '#FFFFFF',
  selectedBg: '#FFF7ED',
  selectedBorder: '#F5840E',
};

// ── Mini helpers ──

const MiniStars: React.FC<{ rating: number }> = ({ rating }) => (
  <View style={s.metaChip}>
    <Ionicons name="star" size={9} color={C.amber} />
    <Text style={s.metaChipText}>{rating.toFixed(1)}</Text>
  </View>
);

const MiniPrice: React.FC<{ price: string }> = ({ price }) => (
  <View style={[s.metaChip, s.priceChip]}>
    <Text style={[s.metaChipText, { fontFamily: 'Gilroy-Bold', color: C.emerald }]}>{price}</Text>
  </View>
);

const MiniDist: React.FC<{ km: number }> = ({ km }) => (
  <View style={s.metaChip}>
    <Ionicons name="navigate-outline" size={9} color={C.textMuted} />
    <Text style={s.metaChipText}>
      {km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`}
    </Text>
  </View>
);

// ── Option Chip (compact card with optional small thumbnail) ──

const OptionChip: React.FC<{
  card: SelectionCard;
  index: number;
  isSelected: boolean;
  disabled: boolean;
  onPress: () => void;
}> = ({ card, index, isSelected, disabled, onPress }) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hasMeta = card.rating != null || card.price_range || card.distance_km != null;
  const hasImage = !!card.image_url;

  return (
    <Animated.View
      style={{ transform: [{ translateY: slideAnim }], opacity: opacityAnim }}
    >
      <TouchableOpacity
        style={[
          s.chip,
          isSelected && s.chipSelected,
          disabled && !isSelected && s.chipDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {/* Top row: thumbnail + radio + title + badge */}
        <View style={s.chipTopRow}>
          {hasImage ? (
            <Image
              source={{ uri: card.image_url }}
              style={s.chipThumb}
              resizeMode="cover"
            />
          ) : null}
          <View style={[s.chipRadio, isSelected && s.chipRadioActive]}>
            {isSelected && <View style={s.chipRadioDot} />}
          </View>
          <Text
            style={[s.chipTitle, isSelected && s.chipTitleActive]}
            numberOfLines={1}
          >
            {card.title}
          </Text>
          {card.badge && (
            <View style={s.chipBadge}>
              <Text style={s.chipBadgeText}>{card.badge}</Text>
            </View>
          )}
          {isSelected && (
            <Ionicons name="checkmark-circle" size={18} color={C.primary} />
          )}
        </View>

        {/* Subtitle */}
        {card.subtitle ? (
          <Text style={[s.chipSubtitle, hasImage && { marginLeft: 58 }]} numberOfLines={1}>
            {card.subtitle}
          </Text>
        ) : null}

        {/* Meta row */}
        {hasMeta && (
          <View style={[s.chipMetaRow, hasImage && { marginLeft: 58 }]}>
            {card.rating != null && <MiniStars rating={card.rating} />}
            {card.price_range ? <MiniPrice price={card.price_range} /> : null}
            {card.distance_km != null && <MiniDist km={card.distance_km} />}
            {card.vibe_match_score != null && (
              <View style={s.metaChip}>
                <MaterialCommunityIcons name="heart-pulse" size={9} color={C.primary} />
                <Text style={[s.metaChipText, { color: C.primary }]}>
                  {card.vibe_match_score}%
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <View style={[s.chipTags, hasImage && { marginLeft: 58 }]}>
            {card.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={s.chipTag}>
                <Text style={s.chipTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main Component ──

interface SelectionPromptProps {
  cards: SelectionCard[];
  onSelect: (cardId: string) => void;
  onSkip?: () => void;
  onCustomResponse?: (text: string) => void;
  disabled?: boolean;
  loading?: boolean;
  promptText?: string;
}

const SelectionPrompt: React.FC<SelectionPromptProps> = ({
  cards,
  onSelect,
  onSkip,
  onCustomResponse,
  disabled = false,
  loading = false,
  promptText,
}) => {
  const slideUpAnim = useRef(new Animated.Value(100)).current;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    Animated.spring(slideUpAnim, {
      toValue: 0,
      tension: 60,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSelect = (cardId: string) => {
    setSelectedId(cardId);
    onSelect(cardId);
  };

  const handleCustomSend = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    if (onCustomResponse) {
      onCustomResponse(trimmed);
    } else {
      onSelect(trimmed);
    }
    setCustomText('');
  };

  const isLocked = disabled || loading || selectedId !== null;

  return (
    <Animated.View
      style={[s.root, { transform: [{ translateY: slideUpAnim }] }]}
    >
      {/* ── Top edge: prompt + header bar ── */}
      <View style={s.topBar}>
        <View style={s.topBarRow}>
          <View style={s.topBarLeft}>
            <View style={s.topBarIcon}>
              <MaterialCommunityIcons
                name="checkbox-multiple-outline"
                size={13}
                color={C.primary}
              />
            </View>
            <Text style={s.topBarLabel}>
              {promptText || 'Pick one'}
            </Text>
            {loading && (
              <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 6 }} />
            )}
          </View>
          {onSkip && !selectedId && (
            <TouchableOpacity
              style={s.skipBtn}
              onPress={onSkip}
              disabled={isLocked}
              activeOpacity={0.7}
            >
              <Text style={s.skipBtnText}>Skip</Text>
              <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Options ── */}
      <ScrollView
        style={s.optionsScroll}
        contentContainerStyle={s.optionsContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {cards.map((card, index) => (
          <OptionChip
            key={card.card_id}
            card={card}
            index={index}
            isSelected={selectedId === card.card_id}
            disabled={isLocked}
            onPress={() => handleSelect(card.card_id)}
          />
        ))}
      </ScrollView>

      {/* ── Input bar (replaces normal chat input) ── */}
      {!selectedId ? (
        <View style={s.inputArea}>
          <View style={s.inputDivider}>
            <View style={s.inputDividerLine} />
            <Text style={s.inputDividerText}>or type below</Text>
            <View style={s.inputDividerLine} />
          </View>
          <View style={s.inputRow}>
            <View style={s.inputBox}>
              <TextInput
                style={s.textInput}
                placeholder="Type your preference..."
                placeholderTextColor={C.textMuted}
                value={customText}
                onChangeText={setCustomText}
                editable={!isLocked}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleCustomSend}
                blurOnSubmit={false}
              />
            </View>
            <TouchableOpacity
              style={[
                s.sendBtn,
                (!customText.trim() || isLocked) && s.sendBtnOff,
              ]}
              onPress={handleCustomSend}
              disabled={!customText.trim() || isLocked}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Ionicons name="send" size={16} color={C.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ── Confirmation strip ── */
        <View style={s.confirmStrip}>
          <Ionicons name="checkmark-circle" size={16} color={C.emerald} />
          <Text style={s.confirmText}>Choice submitted</Text>
        </View>
      )}
    </Animated.View>
  );
};

export default SelectionPrompt;

// ── Styles ──

const s = StyleSheet.create({
  root: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
    paddingBottom: BOTTOM_SAFE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Top bar ──
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topBarIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  topBarLabel: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: C.text,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: C.surfaceAlt,
    gap: 2,
  },
  skipBtnText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Medium',
    color: C.textMuted,
  },

  // ── Options scroll ──
  optionsScroll: {
    maxHeight: 280,
  },
  optionsContent: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },

  // ── Option chip ──
  chip: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: C.selectedBg,
    borderColor: C.selectedBorder,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  chipRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRadioActive: {
    borderColor: C.primary,
  },
  chipRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  chipTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: C.text,
  },
  chipTitleActive: {
    color: C.primaryDark,
  },
  chipBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipBadgeText: {
    fontSize: 9,
    fontFamily: 'Gilroy-Bold',
    color: C.primaryDark,
    letterSpacing: 0.2,
  },
  chipSubtitle: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: C.textSec,
    marginTop: 3,
    marginLeft: 26,
  },
  chipMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 26,
    gap: 6,
  },
  chipTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    marginLeft: 26,
    gap: 4,
  },
  chipTag: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  chipTagText: {
    fontSize: 10,
    fontFamily: 'Gilroy-Medium',
    color: C.textSec,
  },

  // ── Meta chip (stars, price, distance) ──
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.surface,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  priceChip: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  metaChipText: {
    fontSize: 10,
    fontFamily: 'Gilroy-Medium',
    color: C.textSec,
  },

  // ── Input area ──
  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 4,
  },
  inputDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  inputDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  inputDividerText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
    color: C.textMuted,
    marginHorizontal: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputBox: {
    flex: 1,
    backgroundColor: C.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: C.text,
    paddingVertical: Platform.OS === 'ios' ? 0 : 4,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: {
    backgroundColor: '#D1D5DB',
  },

  // ── Confirm strip ──
  confirmStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  confirmText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: C.emerald,
  },
});
