import { MainStackParamList } from '@navigation/MainNavigator';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export const WeatherScreen: React.FC = () => {
  const uvIndex = 7;
  const uvLevel = 'Very High';
  const navigation = useNavigation<NavigationProp>();

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* 🔽 Scroll starts here */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <Text className="text-2xl font-gilroy-bold text-gray-900">
            Weather
          </Text>

          {/* Location */}
          <Text className="text-primary text-sm font-semibold mb-1">
            AUTO-DETECTED
          </Text>
          <Text className="text-3xl font-bold text-gray-900 mb-6">
            Mirissa, Sri Lanka
          </Text>

          {/* UV Ring */}
          <View className="items-center justify-center mb-6">
            <View className="w-64 h-64 rounded-full border-[16px] border-gray-200 items-center justify-center">
              {/* Fake progress overlay */}
              <View className="absolute w-64 h-64 rounded-full border-[16px] border-primary" />

              <View className="items-center">
                <Text className="text-5xl font-bold text-gray-900">
                  {uvIndex}
                </Text>
                <Text className="text-sm text-gray-500">UV INDEX</Text>
                <Text className="text-primary font-semibold mt-1">
                  {uvLevel}
                </Text>
              </View>
            </View>
          </View>

          {/* Alert */}
          <View className="bg-orange-100 px-6 py-2 rounded-full self-center mb-6 flex-row items-center">
            <FontAwesome5
              name="exclamation-triangle"
              size={14}
              color="#EA580C"
            />
            <Text className="text-orange-600 font-semibold ml-2">
              Protection Required
            </Text>
          </View>

          {/* Conditions Header */}
          <View className="flex-row justify-between mb-4">
            <Text className="text-base font-semibold text-gray-900">
              Current Conditions
            </Text>
            <Text className="text-sm text-gray-400">Updated 5m ago</Text>
          </View>

          {/* Conditions Grid */}
          <View className="flex-row flex-wrap justify-between">
            <ConditionCard
              icon="temperature-high"
              title="Temperature"
              value="32°C"
            />
            <ConditionCard
              icon="tint"
              title="Humidity"
              value="78%"
            />
            <ConditionCard
              icon="cloud-sun"
              title="Sky Condition"
              value="Partly Cloudy"
            />
            <ConditionCard
              icon="clock"
              title="Local Time"
              value="14:30"
            />
          </View>

          {/* CTA */}
          <TouchableOpacity
            className="bg-primary py-4 rounded-full items-center mt-6"
            onPress={() => navigation.navigate('SunProtection')}
          >
            <Text className="text-white text-lg font-bold">
              Check Risk
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* 🔼 Scroll ends here */}
    </View>
  );
};

/**
 * Reusable condition card
 */
const ConditionCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) => {
  return (
    <View className="w-[48%] bg-gray-50 p-5 rounded-2xl mb-4">
      <FontAwesome5 name={icon} size={18} color="#2563EB" />
      <Text className="text-xl font-bold text-gray-900 mt-2">
        {value}
      </Text>
      <Text className="text-sm text-gray-500 mt-1">
        {title}
      </Text>
    </View>
  );
};
