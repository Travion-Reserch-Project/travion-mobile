import React from 'react';
import { View, Text } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {
  safetyChecklistByRisk,
  riskAccentColors,
  normalizeRiskLevel,
  type SafetyTip,
} from '../../data/safetyChecklistData';

interface SafetyChecklistProps {
  /** Current risk level string coming from the API (e.g. "Very High") */
  riskLevel: string;
  /** Optional subtitle override */
  subtitle?: string;
  /** Hide the section header (title + subtitle) if you want to render your own */
  hideHeader?: boolean;
}

/**
 * Renders a data-driven Safety Checklist section.
 *
 * Usage:
 * ```tsx
 * <SafetyChecklist riskLevel={riskLevel} />
 * ```
 */
const SafetyChecklist: React.FC<SafetyChecklistProps> = ({
  riskLevel,
  subtitle,
  hideHeader = false,
}) => {
  const level = normalizeRiskLevel(riskLevel);
  const tips: SafetyTip[] = safetyChecklistByRisk[level];
  const accent = riskAccentColors[level];

  return (
    <View className="mt-8 px-5">
      {/* ─── Section Header ─── */}
      {!hideHeader && (
        <>
          <Text className="text-xl font-bold text-black">Safety Checklist</Text>
          <Text className="text-[#8C7B6A] mt-1 mb-4">
            {subtitle ?? 'Follow these guidelines to minimize sun exposure risks today.'}
          </Text>
        </>
      )}

      {/* ─── Tip Cards ─── */}
      {tips.map((tip, index) => {
        const isLast = index === tips.length - 1;
        return (
          <View
            key={`${level}-${index}`}
            className={`bg-white rounded-2xl p-4 shadow-sm ${isLast ? 'mb-24' : 'mb-4'}`}
          >
            <View className="flex-row items-start">
              {/* Icon */}
              <View className="p-3 rounded-full" style={{ backgroundColor: accent.bg }}>
                <FontAwesome name={tip.icon} size={18} color={accent.tint} />
              </View>

              {/* Text */}
              <View className="ml-4 flex-1">
                <Text className="font-bold text-black">{tip.title}</Text>
                <Text className="text-[#8C7B6A] mt-1">{tip.description}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default SafetyChecklist;
