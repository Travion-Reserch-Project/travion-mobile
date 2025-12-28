import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const RiskAnalyticsScreen: React.FC = () => {
  const [tab, setTab] = useState<'Daily' | 'Weekly'>('Daily');

  return (
    <View className="flex-1 bg-[#faf7f3]">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4">
        <Text className="text-xl font-bold">Risk Analytics</Text>
        <FontAwesome name="share-square-o" size={20} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Tabs */}
        <View className="flex-row bg-[#eae5df] mx-5 rounded-xl p-1 mb-5">
          {['Daily', 'Weekly'].map(item => (
            <TouchableOpacity
              key={item}
              onPress={() => setTab(item as any)}
              className={`flex-1 py-2 rounded-lg ${tab === item ? 'bg-white' : ''}`}
            >
              <Text
                className={`text-center font-semibold ${
                  tab === item ? 'text-orange-500' : 'text-gray-500'
                }`}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* UV Exposure Trend */}
        <View className="px-5 mb-5">
          <Text className="text-xs text-gray-400 uppercase">UV Exposure Trend</Text>

          <View className="flex-row items-center justify-between mt-1">
            <View className="flex-row items-center">
              <Text className="text-3xl font-extrabold mr-2">High</Text>
              <Text className="text-orange-500 font-semibold">↑ +12%</Text>
            </View>

            <View className="flex-row items-center bg-orange-100 px-3 py-1 rounded-full">
              <View className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
              <Text className="text-xs text-orange-600">Live Update</Text>
            </View>
          </View>

          {/* Chart (NO SVG) */}
          <View className="bg-white rounded-2xl p-4 mt-4">
            <View className="h-32 flex-row items-end justify-between">
              {[30, 55, 75, 45, 65, 90, 60].map((height, index) => (
                <View key={index} className="items-center flex-1">
                  <View className="w-2 rounded-full bg-orange-500" style={{ height }} />
                </View>
              ))}
            </View>

            <View className="flex-row justify-between mt-3">
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
                <Text
                  key={i}
                  className={`text-xs ${day === 'THU' ? 'text-black font-bold' : 'text-gray-400'}`}
                >
                  {day}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Score Cards */}
        <View className="flex-row px-5 mb-6">
          {/* Safety Score */}
          <View className="bg-white rounded-2xl p-4 flex-1 mr-3">
            <View className="flex-row items-center mb-2">
              <FontAwesome name="shield" size={14} color="#f97316" />
              <Text className="ml-2 text-xs font-semibold">SAFETY SCORE</Text>
            </View>

            <Text className="text-3xl font-extrabold">
              85
              <Text className="text-base text-gray-400">/100</Text>
            </Text>

            <View className="h-2 bg-gray-200 rounded-full mt-3">
              <View className="h-2 w-[85%] bg-orange-500 rounded-full" />
            </View>

            <Text className="text-xs text-gray-500 mt-2">Top 10% of users</Text>
          </View>

          {/* Risk Profile */}
          <View className="bg-white rounded-2xl p-4 flex-1 items-center justify-center">
            <View className="w-24 h-24 rounded-full border-[10px] border-green-500 border-b-orange-400 border-l-gray-200 items-center justify-center">
              <Text className="text-xs text-gray-500">Risk</Text>
              <Text className="font-bold">Profile</Text>
            </View>
          </View>
        </View>

        {/* Insight */}
        <View className="px-5 mb-6">
          <View className="bg-white rounded-2xl p-4">
            <View className="flex-row justify-between mb-2">
              <View className="flex-row items-center">
                <View className="bg-orange-100 px-2 py-1 rounded mr-2">
                  <Text className="text-xs text-orange-600">INSIGHT</Text>
                </View>
                <Text className="text-xs text-gray-400">Today</Text>
              </View>
              <View className="bg-orange-100 p-2 rounded-full">
                <FontAwesome name="sun-o" size={14} color="#f97316" />
              </View>
            </View>

            <Text className="font-bold mb-1">Midday UV Alert</Text>
            <Text className="text-gray-500 text-sm">
              Highest risk recorded between{' '}
              <Text className="font-semibold">12:00 PM - 2:00 PM</Text>. Consider shifting outdoor
              activities to later afternoon.
            </Text>

            <View className="flex-row mt-4">
              <Image
                source={{ uri: 'https://picsum.photos/200/200' }}
                className="w-28 h-20 rounded-xl mr-3"
              />
              <Image
                source={{ uri: 'https://picsum.photos/201/200' }}
                className="w-28 h-20 rounded-xl"
              />
            </View>
          </View>
        </View>

        {/* History */}
        <View className="px-5">
          <View className="flex-row justify-between mb-3">
            <Text className="text-lg font-bold">History</Text>
            <Text className="text-orange-500 font-semibold">View All</Text>
          </View>

          {[
            { day: 'Yesterday', uv: 8, risk: 'High', color: 'red' },
            { day: 'Monday', uv: 5, risk: 'Moderate', color: 'orange' },
            { day: 'Sunday', uv: 2, risk: 'Low', color: 'green' },
          ].map((item, index) => (
            <View
              key={index}
              className="bg-white rounded-xl p-4 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    item.color === 'red'
                      ? 'bg-red-100'
                      : item.color === 'orange'
                      ? 'bg-orange-100'
                      : 'bg-green-100'
                  }`}
                >
                  <Text className="font-bold">UV {item.uv}</Text>
                </View>
                <View>
                  <Text className="font-semibold">{item.day}</Text>
                  <Text className="text-sm text-gray-500">{item.risk} Risk</Text>
                </View>
              </View>

              <FontAwesome
                name={item.color === 'orange' ? 'minus-circle' : 'check-circle'}
                size={18}
                color={
                  item.color === 'red' ? '#16a34a' : item.color === 'orange' ? '#9ca3af' : '#16a34a'
                }
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="flex-row justify-around items-center py-3 bg-white border-t border-gray-200">
        {[
          { icon: 'home', label: 'Home' },
          { icon: 'bar-chart', label: 'Analytics', active: true },
          { icon: 'sun-o', label: '' },
          { icon: 'map', label: 'Map' },
          { icon: 'user', label: 'Profile' },
        ].map((item, index) => (
          <View key={index} className="items-center">
            <FontAwesome
              name={item.icon}
              size={item.icon === 'sun-o' ? 28 : 18}
              color={item.active ? '#f97316' : '#9ca3af'}
            />
            {item.label !== '' && (
              <Text className={`text-xs mt-1 ${item.active ? 'text-orange-500' : 'text-gray-400'}`}>
                {item.label}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

export default RiskAnalyticsScreen;
