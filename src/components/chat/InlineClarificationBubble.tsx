/**
 * InlineClarificationBubble — Claude-style clarification question shown
 * as an assistant message inside TourGuideChatScreen. Renders the question
 * text plus a list of selectable option chips. Tapping an option fires
 * `onSelect(label)` so the caller can send the answer back to the agent.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import type { ClarificationQuestion } from '../../services/api/TourPlanService';

const C = {
  primary: '#F5840E',
  primaryDark: '#C2410C',
  aiBubble: '#FFFFFF',
  dark: '#1C1917',
  textMid: '#44403C',
  textSoft: '#78716C',
  border: '#E7E0D8',
  white: '#FFFFFF',
  recommendedBg: '#FFF7ED',
  recommendedBorder: '#F5840E',
};

interface Props {
  question: ClarificationQuestion;
  disabled?: boolean;
  selectedLabel?: string | null;
  onSelect: (label: string) => void;
}

const TravionAvatar: React.FC = () => (
  <LinearGradient
    colors={[C.primary, C.primaryDark]}
    style={s.avatar}
  >
    <Text style={s.avatarLetter}>T</Text>
  </LinearGradient>
);

export const InlineClarificationBubble: React.FC<Props> = ({
  question,
  disabled = false,
  selectedLabel = null,
  onSelect,
}) => {
  return (
    <View style={s.row}>
      <TravionAvatar />
      <View style={s.bubble}>
        <Text style={s.bubbleName}>Travion</Text>
        <View style={s.questionRow}>
          <Ionicons name="help-circle-outline" size={16} color={C.primary} />
          <Text style={s.questionText}>{question.question}</Text>
        </View>
        {question.context ? (
          <Text style={s.contextText}>{question.context}</Text>
        ) : null}

        <View style={s.optionsLabel}>
          <View style={s.optionsLabelLine} />
          <Text style={s.optionsLabelText}>
            {question.type === 'multi_select' ? 'PICK SEVERAL' : 'QUICK OPTIONS'}
          </Text>
          <View style={s.optionsLabelLine} />
        </View>

        <View style={{ gap: 8 }}>
          {(question.options || []).map((opt, i) => {
            const isSelected = selectedLabel === opt.label;
            const isDisabled = disabled && !isSelected;
            return (
              <TouchableOpacity
                key={`${opt.label}-${i}`}
                disabled={isDisabled}
                activeOpacity={0.75}
                style={[
                  s.option,
                  opt.recommended && s.optionRecommended,
                  isSelected && s.optionSelected,
                  isDisabled && s.optionDisabled,
                ]}
                onPress={() => onSelect(opt.label)}
              >
                <View style={s.optionContent}>
                  <View style={s.optionHeader}>
                    <Text
                      style={[
                        s.optionLabel,
                        isSelected && { color: C.white },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {opt.recommended && !isSelected ? (
                      <View style={s.recommendedBadge}>
                        <Ionicons name="star" size={10} color={C.primary} />
                        <Text style={s.recommendedText}>Recommended</Text>
                      </View>
                    ) : null}
                  </View>
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
                  style={{ marginLeft: 8 }}
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
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  questionText: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: 'Gilroy-SemiBold',
    color: C.dark,
    lineHeight: 20,
  },
  contextText: {
    fontSize: 12.5,
    fontFamily: 'Gilroy-Regular',
    color: C.textMid,
    lineHeight: 18,
    marginBottom: 8,
    marginTop: 2,
  },
  optionsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  optionsLabelLine: { flex: 1, height: 1, backgroundColor: C.border },
  optionsLabelText: {
    fontSize: 10.5,
    fontFamily: 'Gilroy-Bold',
    color: C.primary,
    letterSpacing: 1.2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFAF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,132,14,0.28)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionRecommended: {
    backgroundColor: C.recommendedBg,
    borderColor: C.recommendedBorder,
  },
  optionSelected: {
    backgroundColor: C.primary,
    borderColor: C.primaryDark,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionContent: { flex: 1 },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionLabel: {
    fontSize: 13.5,
    fontFamily: 'Gilroy-Bold',
    color: C.dark,
    flexShrink: 1,
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: C.textSoft,
    marginTop: 2,
    lineHeight: 16,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.white,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(245,132,14,0.4)',
  },
  recommendedText: {
    fontSize: 9.5,
    fontFamily: 'Gilroy-Bold',
    color: C.primary,
    letterSpacing: 0.3,
  },
});

export default InlineClarificationBubble;
