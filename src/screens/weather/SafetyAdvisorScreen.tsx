import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '@navigation';
import SafetyChecklist from '../../components/weather/SafetyChecklist';
import { normalizeRiskLevel, riskAccentColors } from '../../data/safetyChecklistData';

type ForecastItem = {
  time: string;
  label: string;
  color: string;
  active?: boolean;
};

const forecastData: ForecastItem[] = [
  { time: '10 AM', label: 'Low', color: '#9BE7B4' },
  { time: 'Now', label: 'High', color: '#FF8C1A', active: true },
  { time: '12 PM', label: 'V. High', color: '#FF8C1A' },
  { time: '1 PM', label: 'V. High', color: '#FF8C1A' },
  { time: '2 PM', label: 'High', color: '#FF8C1A' },
  { time: '3 PM', label: 'Mod', color: '#FFB36B' },
  { time: '4 PM', label: 'Low', color: '#4CD964' },
];

/** Human-readable labels per risk level */
const riskLabels: Record<string, string> = {
  low: 'Low Risk • Enjoy Your Day',
  moderate: 'Moderate Risk • Stay Cautious',
  high: 'High Risk • Protection Needed',
  'very high': 'Very High Risk • Protection Essential',
  extreme: 'Extreme Risk • Avoid Sun Exposure',
};

const SafetyAdvisorScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MainStackParamList, 'SafetyAdvisor'>>();

  // Read from route params with sensible defaults
  const riskLevel = (route.params as any)?.riskLevel ?? 'Very High';
  const uvIndex = (route.params as any)?.uvIndex ?? 8;
  const locationName = (route.params as any)?.locationName ?? 'MIRISSA, SRI LANKA';

  const level = normalizeRiskLevel(riskLevel);
  const accent = riskAccentColors[level];

  return (
    <SafeAreaView className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={20} color="#111" />
        </TouchableOpacity>

        <Text className="text-lg font-semibold text-black">Safety Advisor</Text>

        <TouchableOpacity>
          <FontAwesome name="cog" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Location */}
        <View className="items-center mt-2">
          <View
            className="flex-row items-center px-4 py-1 rounded-full"
            style={{ backgroundColor: accent.bg }}
          >
            <FontAwesome name="map-marker" size={14} color={accent.tint} />
            <Text
              className="ml-2 font-semibold text-xs tracking-wide"
              style={{ color: accent.tint }}
            >
              {locationName.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* UV Index */}
        <View className="items-center mt-5">
          <Text className="text-4xl font-extrabold text-black">
            UV Index <Text style={{ color: accent.tint }}>{uvIndex}</Text>
          </Text>
          <Text className="text-[#8C7B6A] mt-2">
            {riskLabels[level] ?? 'Protection Recommended'}
          </Text>
        </View>

        {/* Daily Forecast */}
        <View className="mt-8 px-5">
          <Text className="text-lg font-bold text-black mb-4">Daily Forecast</Text>

          <View className="flex-row justify-between">
            {forecastData.map((item, index) => (
              <View key={index} className="items-center">
                <Text
                  className={`text-xs mb-2 ${
                    item.active ? 'text-[#FF8C1A] font-bold' : 'text-gray-400'
                  }`}
                >
                  {item.time}
                </Text>

                <View
                  className={`w-10 h-16 rounded-2xl ${
                    item.active ? 'border-2 border-[#FF8C1A]' : ''
                  }`}
                  style={{ backgroundColor: item.color }}
                />

                <Text className="text-xs mt-2 font-semibold" style={{ color: item.color }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══════ Dynamic Safety Checklist ═══════ */}
        <SafetyChecklist riskLevel={riskLevel} />
      </ScrollView>

      {/* Enable Alerts Button */}
      <View className="absolute bottom-16 left-5 right-5">
        <TouchableOpacity className="bg-[#FF8C1A] py-4 rounded-full flex-row justify-center items-center">
          <FontAwesome name="bell" size={18} color="#fff" />
          <Text className="text-white font-bold ml-3 text-base">Enable High UV Alerts</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SafetyAdvisorScreen;
