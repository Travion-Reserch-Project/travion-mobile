/**
 * InlineHitlBubble — Renders a HITL selection prompt (hotels, restaurants,
 * etc.) inside an assistant chat bubble. Wraps the existing
 * `SelectionCardList` carousel so the chat thread looks coherent and the
 * input bar stays available for free-text refinements.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import SelectionCardList from './SelectionCardList';
import type { SelectionCard } from '../../services/api/TourPlanService';

const C = {
  primary: '#F5840E',
  primaryDark: '#C2410C',
  aiBubble: '#FFFFFF',
  dark: '#1C1917',
  textMid: '#44403C',
  textSoft: '#78716C',
  white: '#FFFFFF',
};

interface Props {
  cards: SelectionCard[];
  promptText?: string | null;
  disabled?: boolean;
  loading?: boolean;
  onSelect: (cardId: string, label?: string) => void;
  onSkip?: () => void;
}

export const InlineHitlBubble: React.FC<Props> = ({
  cards,
  promptText,
  disabled,
  loading,
  onSelect,
  onSkip,
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
        <Text style={s.bubbleName}>Travion</Text>
        <View style={s.headerRow}>
          <Ionicons name="options-outline" size={16} color={C.primary} />
          <Text style={s.headerText}>
            {promptText || 'Pick one to continue'}
          </Text>
        </View>
        <Text style={s.subText}>
          Swipe through the options below. Tap a card to add it to your plan,
          or use Skip to keep my default ranking.
        </Text>

        <SelectionCardList
          cards={cards}
          onSelect={(cardId) => {
            const card = cards.find(c => c.card_id === cardId);
            onSelect(cardId, card?.title);
          }}
          onSkip={onSkip}
          disabled={disabled}
          loading={loading}
        />
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
    borderLeftColor: C.primary,
    padding: 12,
    elevation: 1,
  },
  bubbleName: {
    fontSize: 11.5,
    fontFamily: 'Gilroy-Bold',
    color: C.primary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: C.dark,
  },
  subText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: C.textMid,
    lineHeight: 17,
    marginBottom: 6,
  },
});

export default InlineHitlBubble;
