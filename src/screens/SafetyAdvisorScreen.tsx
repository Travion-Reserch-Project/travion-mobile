import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';

type UVLevel = 'low' | 'moderate' | 'high' | 'veryHigh';

type ForecastItem = {
  time: string;
  label: string;
  level: UVLevel;
  active?: boolean;
};

const forecastData: ForecastItem[] = [
  { time: '10 AM', label: 'Low', level: 'low' },
  { time: 'Now', label: 'High', level: 'high', active: true },
  { time: '12 PM', label: 'V. High', level: 'veryHigh' },
  { time: '1 PM', label: 'V. High', level: 'veryHigh' },
  { time: '2 PM', label: 'High', level: 'high' },
  { time: '3 PM', label: 'Mod', level: 'moderate' },
  { time: '4 PM', label: 'Low', level: 'low' },
];

const getBarColor = (level: UVLevel) => {
  switch (level) {
    case 'low':
      return 'bg-green-400';
    case 'moderate':
      return 'bg-orange-200';
    case 'high':
      return 'bg-orange-400';
    case 'veryHigh':
      return 'bg-orange-500';
    default:
      return 'bg-gray-300';
  }
};

const getTextColor = (level: UVLevel) => {
  switch (level) {
    case 'low':
      return 'text-green-600';
    case 'moderate':
      return 'text-orange-400';
    default:
      return 'text-orange-600';
  }
};

const SafetyAdvisorScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-[#faf7f3]">
      {/* ================= HEADER ================= */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <FontAwesome name="arrow-left" size={18} color="#111827" />
        <Text className="text-lg font-bold text-gray-900">Safety Advisor</Text>
        <FontAwesome name="cog" size={18} color="#111827" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* ================= LOCATION ================= */}
        <View className="items-center mt-2 mb-6">
          <View className="flex-row items-center bg-orange-100 px-4 py-2 rounded-full">
            <FontAwesome name="map-marker" size={14} color="#f97316" />
            <Text className="ml-2 text-orange-600 font-semibold text-xs">BARCELONA, SPAIN</Text>
          </View>
        </View>

        {/* ================= UV INDEX ================= */}
        <View className="items-center mb-8">
          <Text className="text-4xl font-extrabold text-gray-900">
            UV Index <Text className="text-orange-500">8</Text>
          </Text>
          <Text className="text-gray-500 mt-2 text-sm">Very High Risk • Protection Essential</Text>
        </View>

        {/* ================= DAILY FORECAST ================= */}
        {/* ================= DAILY FORECAST ================= */}
<View className="px-5 mb-10">
  <Text className="text-lg font-bold text-gray-900 mb-5">
    Daily Forecast
  </Text>

  <View className="flex-row justify-between">
    {forecastData.map((item, index) => (
      <View key={index} className="items-center w-10">
        {/* Time */}
        <Text
          className={`text-xs mb-2 ${
            item.active
              ? 'text-orange-500 font-bold'
              : 'text-gray-400'
          }`}
        >
          {item.time}
        </Text>

        {/* Bar */}
        <View
          className={`
            w-8 h-20 rounded-full
            ${getBarColor(item.level)}
            ${item.active ? 'border-2 border-orange-500' : ''}
            flex items-center justify-center
          `}
        >
          {/* Inner highlight for "Now" */}
          {item.active && (
            <View className="w-4 h-14 bg-white rounded-full opacity-90" />
          )}
        </View>

        {/* Label */}
        <Text
          className={`text-xs mt-2 ${getTextColor(item.level)}`}
        >
          {item.label}
        </Text>
      </View>
    ))}
  </View>
</View>


        {/* ================= SAFETY CHECKLIST ================= */}
        <View className="px-5">
          <Text className="text-xl font-bold text-gray-900 mb-1">Safety Checklist</Text>
          <Text className="text-gray-500 mb-5">
            Follow these guidelines to minimize sun exposure risks today.
          </Text>

          {[
            {
              icon: 'sun-o',
              title: 'Sunscreen SPF 50+',
              desc: 'Apply liberally every 2 hours, especially after swimming.',
            },
            {
              icon: 'user',
              title: 'Protective Gear',
              desc: 'Wear a wide-brimmed hat and UV-blocking sunglasses.',
            },
            {
              icon: 'clock-o',
              title: 'Seek Shade',
              desc: 'Avoid direct sun between 11 AM and 3 PM.',
            },
            {
              icon: 'tint',
              title: 'Stay Hydrated',
              desc: 'Heat index is high. Drink water regularly.',
            },
          ].map((item, index) => (
            <View key={index} className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
              <View className="flex-row items-start">
                <View className="bg-orange-100 p-3 rounded-full mr-4">
                  <FontAwesome name={item.icon} size={16} color="#f97316" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 mb-1">{item.title}</Text>
                  <Text className="text-gray-500 text-sm">{item.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ================= CTA (FIXED VISIBILITY) ================= */}
      <View className="absolute bottom-24 left-0 right-0 px-6">
        <TouchableOpacity
          activeOpacity={0.9}
          className="
      bg-orange-500
      h-16
      rounded-full
      flex-row
      justify-center
      items-center
      border
      border-orange-300
      shadow-lg
      elevation-6
    "
        >
          <FontAwesome name="bell" size={20} color="#ffffff" />
          <Text className="text-white font-extrabold text-lg ml-3">Enable High UV Alerts</Text>
        </TouchableOpacity>
      </View>

      {/* ================= BOTTOM NAV ================= */}
      <View className="flex-row justify-around items-center py-3 border-t border-gray-200 bg-white">
        {[
          { icon: 'home', label: 'Home', active: true },
          { icon: 'sun-o', label: 'Forecast' },
          { icon: 'user', label: 'Profile' },
        ].map((item, index) => (
          <View key={index} className="items-center">
            <FontAwesome name={item.icon} size={18} color={item.active ? '#f97316' : '#9ca3af'} />
            <Text className={`text-xs mt-1 ${item.active ? 'text-orange-500' : 'text-gray-400'}`}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

export default SafetyAdvisorScreen;
