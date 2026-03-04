import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@navigation/MainNavigator';

type SafetyAdvisorScreenNavigationProp = NativeStackNavigationProp<
  MainStackParamList,
  'SafetyAdvisor'
>;

type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';

interface SafetyTip {
  icon: string;
  title: string;
  description: string;
}

const SAFETY_TIPS: Record<RiskLevel, SafetyTip[]> = {
  Low: [
    {
      icon: 'sun-o',
      title: 'Sunscreen SPF 30+ (Optional)',
      description: 'If outdoors for long periods, apply once.',
    },
    { icon: 'eye', title: 'Sunglasses', description: 'UV protection is still helpful.' },
    {
      icon: 'smile-o',
      title: 'Enjoy Outdoors',
      description: 'Low risk; normal activities are fine.',
    },
  ],
  Moderate: [
    {
      icon: 'sun-o',
      title: 'Sunscreen SPF 30+',
      description: 'Apply 15–20 minutes before going out; reapply every 2–3 hours.',
    },
    {
      icon: 'user',
      title: 'Protective Clothing',
      description: 'Light long sleeves if staying out.',
    },
    { icon: 'clock-o', title: 'Midday Caution', description: 'Reduce exposure around noon.' },
  ],
  High: [
    {
      icon: 'sun-o',
      title: 'Sunscreen SPF 50+',
      description: 'Reapply every 2 hours and after sweating/swimming.',
    },
    { icon: 'user', title: 'Protective Gear', description: 'Wide-brim hat + UV sunglasses.' },
    {
      icon: 'clock-o',
      title: 'Seek Shade',
      description: 'Avoid direct sun between 11 AM and 3 PM.',
    },
    { icon: 'tint', title: 'Stay Hydrated', description: 'Drink water regularly.' },
  ],
  'Very High': [
    {
      icon: 'sun-o',
      title: 'Sunscreen SPF 50+',
      description: 'Apply liberally every 2 hours; especially after swimming.',
    },
    {
      icon: 'user',
      title: 'Protective Gear',
      description: 'Wide-brim hat and UV-blocking sunglasses.',
    },
    {
      icon: 'clock-o',
      title: 'Seek Shade',
      description: 'Avoid direct sun between 11 AM and 3 PM.',
    },
    {
      icon: 'tint',
      title: 'Stay Hydrated',
      description: 'Heat risk is higher; drink water frequently.',
    },
    {
      icon: 'ban',
      title: 'Limit Outdoor Time',
      description: 'Prefer indoor/covered areas during peak hours.',
    },
  ],
  Extreme: [
    {
      icon: 'home',
      title: 'Avoid Sun Exposure',
      description: 'Stay indoors during peak UV hours if possible.',
    },
    {
      icon: 'sun-o',
      title: 'Maximum Protection SPF 50+',
      description: 'Apply and reapply strictly every 2 hours.',
    },
    {
      icon: 'user',
      title: 'Full Coverage Clothing',
      description: 'Long sleeves, hat, sunglasses.',
    },
    {
      icon: 'warning',
      title: 'Heat Safety',
      description: 'Watch for dizziness/headache; take cool breaks.',
    },
    { icon: 'bell', title: 'Enable Alerts', description: 'Encourage turning on high UV alerts.' },
  ],
};

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

const SafetyAdvisorScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<SafetyAdvisorScreenNavigationProp>();

  // Get params or use defaults
  const uvIndex = route.params?.uvIndex ?? 8;
  const initialRiskLevel = route.params?.riskLevel;

  const getRiskLevel = (uv: number): RiskLevel => {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
  };

  // If riskLevel is passed exactly, use it (case insensitive), otherwise calculate from UV
  const riskLevelRaw = initialRiskLevel || getRiskLevel(uvIndex);

  // Normalize risk level to match keys in SAFETY_TIPS
  const riskLevel: RiskLevel =
    riskLevelRaw.toLowerCase() === 'low'
      ? 'Low'
      : riskLevelRaw.toLowerCase() === 'moderate'
      ? 'Moderate'
      : riskLevelRaw.toLowerCase() === 'high'
      ? 'High'
      : riskLevelRaw.toLowerCase() === 'very high' || riskLevelRaw.toLowerCase() === 'v. high'
      ? 'Very High'
      : 'Extreme';

  const tips = SAFETY_TIPS[riskLevel];

  return (
    <SafeAreaView className="flex-1 bg-white">
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
          <View className="flex-row items-center bg-[#FFE2CC] px-4 py-1 rounded-full">
            <FontAwesome name="map-marker" size={14} color="#FF8C1A" />
            <Text className="ml-2 text-[#FF8C1A] font-semibold text-xs tracking-wide">
              MIRISSA, SRI LANKA
            </Text>
          </View>
        </View>

        {/* UV Index */}
        <View className="items-center mt-5">
          <Text className="text-4xl font-extrabold text-black">
            UV Index <Text className="text-[#FF8C1A]">{uvIndex}</Text>
          </Text>
          <Text className="text-[#8C7B6A] mt-2">{riskLevel} Risk • Protection Essential</Text>
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
                  className={`
                    w-10 h-16 rounded-2xl
                    ${item.active ? 'border-2 border-[#FF8C1A]' : ''}
                  `}
                  style={{ backgroundColor: item.color }}
                />

                <Text className={`text-xs mt-2 font-semibold`} style={{ color: item.color }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Safety Checklist */}
        <View className="mt-10 px-5 pb-24">
          <Text className="text-xl font-bold text-black">Safety Checklist</Text>
          <Text className="text-[#8C7B6A] mt-1 mb-4">
            Follow these guidelines to minimize sun exposure risks today.
          </Text>

          {tips.map((tip, index) => (
            <View
              key={index}
              className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-50"
            >
              <View className="flex-row items-start">
                <View className="bg-[#FFE2CC] p-3 rounded-full">
                  <FontAwesome name={tip.icon} size={18} color="#FF8C1A" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-bold text-black text-base">{tip.title}</Text>
                  <Text className="text-[#8C7B6A] mt-1 leading-5">{tip.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Enable Alerts Button */}
      <View className="absolute bottom-10 left-5 right-5">
        <TouchableOpacity className="bg-[#FF8C1A] py-4 rounded-full flex-row justify-center items-center shadow-lg">
          <FontAwesome name="bell" size={18} color="#fff" />
          <Text className="text-white font-bold ml-3 text-base">Enable High UV Alerts</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SafetyAdvisorScreen;
