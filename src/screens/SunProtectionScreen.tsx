import { MainStackParamList } from '@navigation';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
const SunProtectionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ================= LOCATION ================= */}
        <View className="flex-row items-center justify-between px-6 pt-6">
          <View className="flex-row items-center">
            <View className="bg-orange-100 p-3 rounded-full mr-3">
              <FontAwesome name="map-marker" size={18} color="#f97316" />
            </View>
            <View>
              <Text className="text-xs text-gray-400 uppercase">Current Location</Text>
              <Text className="text-lg font-bold text-gray-900">Bali, Indonesia</Text>
            </View>
          </View>
          <Text className="text-orange-500 font-semibold">Edit</Text>
        </View>

        {/* ================= RISK METER ================= */}
        <View className="items-center mt-10 mb-6">
          <View className="w-72 h-36 overflow-hidden relative">
            <View className="absolute bottom-0 w-72 h-72 rounded-full bg-gray-200" />

            <View className="absolute bottom-0 left-0 w-72 h-72 overflow-hidden">
              <View
                className="w-72 h-72 rounded-full bg-primary"
                style={{ transform: [{ rotate: '-45deg' }] }}
              />
            </View>
          </View>

          <View className="absolute top-20 bg-orange-100 p-3 rounded-full">
            <FontAwesome name="exclamation-triangle" size={22} color="#f97316" />
          </View>
        </View>

        {/* ================= TITLE ================= */}
        <View className="items-center px-6 mb-10">
          <View className="bg-orange-100 px-4 py-1 rounded-full mb-3">
            <Text className="text-orange-600 text-xs font-semibold">HIGH RISK</Text>
          </View>

          <Text className="text-3xl font-extrabold text-center mb-3">
            Sun Protection{'\n'}Required
          </Text>

          <Text className="text-gray-500 text-center text-base">
            UV levels are currently dangerous. Limit direct exposure.
          </Text>
        </View>

        {/* ================= FACTORS ================= */}
        <View className="px-6 mb-6">
          <View className="flex-row justify-between mb-4">
            <Text className="text-lg font-bold">Contributing Factors</Text>
            <Text className="text-xs text-gray-400">Updated 2m ago</Text>
          </View>

          {/* Skin type */}
          <View className="bg-gray-50 rounded-2xl p-5 flex-row items-center mb-4">
            <View className="bg-orange-100 p-3 rounded-full mr-4">
              <FontAwesome name="user" size={16} color="#f97316" />
            </View>
            <View>
              <Text className="text-sm text-gray-400">Skin Type</Text>
              <Text className="font-bold text-gray-900">Type II (Fair)</Text>
            </View>
          </View>

          {/* UV + Time */}
          <View className="flex-row justify-between">
            <View className="bg-gray-50 rounded-2xl p-5 w-[48%]">
              <View className="flex-row items-center mb-2">
                <FontAwesome name="sun-o" size={18} color="#f97316" />
                <View className="ml-2 bg-orange-100 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-orange-600 font-semibold">Very High</Text>
                </View>
              </View>
              <Text className="text-3xl font-extrabold">8</Text>
              <Text className="text-gray-400 text-sm">UV Index</Text>
            </View>

            <View className="bg-gray-50 rounded-2xl p-5 w-[48%]">
              <View className="flex-row items-center mb-2">
                <FontAwesome name="clock-o" size={18} color="#2563eb" />
                <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-blue-600 font-semibold">Peak</Text>
                </View>
              </View>
              <Text className="text-xl font-extrabold">12:30 PM</Text>
              <Text className="text-gray-400 text-sm">Time of Day</Text>
            </View>
          </View>
        </View>

        {/* ================= ACTIONS ================= */}
        <View className="px-6">
          <Text className="text-lg font-bold mb-4">Immediate Actions</Text>

          {[
            'Apply broad-spectrum sunscreen SPF 50+',
            'Seek shade immediately',
            'Wear protective clothing & sunglasses',
          ].map((item, index) => (
            <View key={index} className="flex-row items-center mb-4">
              <View className="bg-orange-500 p-2 rounded-full mr-4">
                <FontAwesome name="check" size={12} color="#fff" />
              </View>
              <Text className="text-gray-700 text-base">{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ================= CTA (FIXED) ================= */}
      <View className="absolute bottom-0 left-0 right-0 bg-white px-6 pb-6 pt-3 border-t border-gray-100">
        <TouchableOpacity
          className="bg-primary py-4 rounded-2xl flex-row justify-center items-center"
          onPress={() => navigation.navigate('SafetyAdvisor')}
        >
          <Text className="text-white font-bold text-lg mr-2">View Recommendations</Text>
          <FontAwesome name="arrow-right" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SunProtectionScreen;
