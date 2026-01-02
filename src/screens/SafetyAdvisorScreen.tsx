import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

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
  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F3]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity>
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
            UV Index <Text className="text-[#FF8C1A]">8</Text>
          </Text>
          <Text className="text-[#8C7B6A] mt-2">Very High Risk • Protection Essential</Text>
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
        <View className="mt-10 px-5">
          <Text className="text-xl font-bold text-black">Safety Checklist</Text>
          <Text className="text-[#8C7B6A] mt-1 mb-4">
            Follow these guidelines to minimize sun exposure risks today.
          </Text>

          {/* Card 1 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <View className="flex-row items-start">
              <View className="bg-[#FFE2CC] p-3 rounded-full">
                <FontAwesome name="sun-o" size={18} color="#FF8C1A" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-bold text-black">Sunscreen SPF 50+</Text>
                <Text className="text-[#8C7B6A] mt-1">
                  Apply liberally every 2 hours, especially after swimming.
                </Text>
              </View>
            </View>
          </View>

          {/* Card 2 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <View className="flex-row items-start">
              <View className="bg-[#FFE2CC] p-3 rounded-full">
                <FontAwesome name="user" size={18} color="#FF8C1A" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-bold text-black">Protective Gear</Text>
                <Text className="text-[#8C7B6A] mt-1">
                  Wear a wide-brimmed hat and UV-blocking sunglasses.
                </Text>
              </View>
            </View>
          </View>

          {/* Card 3 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <View className="flex-row items-start">
              <View className="bg-[#FFE2CC] p-3 rounded-full">
                <FontAwesome name="clock-o" size={18} color="#FF8C1A" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-bold text-black">Seek Shade</Text>
                <Text className="text-[#8C7B6A] mt-1">
                  Avoid direct sun between 11 AM and 3 PM.
                </Text>
              </View>
            </View>
          </View>

          {/* Card 4 */}
          <View className="bg-white rounded-2xl p-4 mb-24 shadow-sm">
            <View className="flex-row items-start">
              <View className="bg-[#FFE2CC] p-3 rounded-full">
                <FontAwesome name="tint" size={18} color="#FF8C1A" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-bold text-black">Stay Hydrated</Text>
                <Text className="text-[#8C7B6A] mt-1">
                  Heat index is high. Drink water regularly.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Enable Alerts Button */}
      <View className="absolute bottom-16 left-5 right-5">
        <TouchableOpacity className="bg-[#FF8C1A] py-4 rounded-full flex-row justify-center items-center">
          <FontAwesome name="bell" size={18} color="#fff" />
          <Text className="text-white font-bold ml-3 text-base">Enable High UV Alerts</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View className="flex-row justify-around items-center h-14 bg-white border-t border-gray-200">
        <View className="items-center">
          <FontAwesome name="home" size={20} color="#FF8C1A" />
          <Text className="text-xs text-[#FF8C1A] mt-1">Home</Text>
        </View>

        <View className="items-center">
          <FontAwesome name="sun-o" size={20} color="#9CA3AF" />
          <Text className="text-xs text-gray-400 mt-1">Forecast</Text>
        </View>

        <View className="items-center">
          <FontAwesome name="user" size={20} color="#9CA3AF" />
          <Text className="text-xs text-gray-400 mt-1">Profile</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SafetyAdvisorScreen;
