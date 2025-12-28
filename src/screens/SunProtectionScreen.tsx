import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";

const UV_PROGRESS = 0.75; // 75% (UV 8 / 11)

const SunProtectionScreen: React.FC = () => {
  return (
    <ScrollView className="flex-1 bg-white px-5 pt-6">
      {/* Location */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center">
          <View className="bg-orange-100 p-3 rounded-full mr-3">
            <FontAwesome name="map-marker" size={18} color="#f97316" />
          </View>
          <View>
            <Text className="text-xs text-gray-400 uppercase">
              Current Location
            </Text>
            <Text className="text-lg font-bold">Bali, Indonesia</Text>
          </View>
        </View>
        <Text className="text-orange-500 font-semibold">Edit</Text>
      </View>

      {/* Risk Meter */}
      <View className="items-center mb-6">
        <View className="w-60 h-32 overflow-hidden">
          {/* Background Arc */}
          <View className="absolute bottom-0 w-60 h-60 rounded-full border-[18px] border-gray-200" />

          {/* Progress Arc */}
          <View
            className="absolute bottom-0 w-60 h-60 rounded-full border-[18px] border-orange-500"
            style={{
              transform: [{ rotate: `${UV_PROGRESS * 180}deg` }],
              borderRightColor: "transparent",
              borderBottomColor: "transparent",
            }}
          />
        </View>

        {/* Warning Icon */}
        <View className="absolute top-14">
          <FontAwesome
            name="exclamation-triangle"
            size={28}
            color="#f97316"
          />
        </View>
      </View>

      {/* Risk Label */}
      <View className="items-center mb-3">
        <View className="bg-orange-100 px-4 py-1 rounded-full mb-2">
          <Text className="text-orange-600 font-semibold">HIGH RISK</Text>
        </View>
        <Text className="text-3xl font-extrabold text-center">
          Sun Protection{"\n"}Required
        </Text>
        <Text className="text-gray-500 text-center mt-2 px-4">
          UV levels are currently dangerous. Limit direct exposure.
        </Text>
      </View>

      {/* Contributing Factors */}
      <View className="flex-row justify-between items-center mt-6 mb-3">
        <Text className="text-lg font-bold">Contributing Factors</Text>
        <Text className="text-xs text-gray-400">Updated 2m ago</Text>
      </View>

      {/* Skin Type */}
      <View className="bg-gray-50 rounded-xl p-4 flex-row items-center mb-4">
        <View className="bg-orange-100 p-3 rounded-full mr-3">
          <FontAwesome name="user" size={16} color="#f97316" />
        </View>
        <View>
          <Text className="text-sm text-gray-400">Skin Type</Text>
          <Text className="font-bold">Type II (Fair)</Text>
        </View>
      </View>

      {/* UV + Time */}
      <View className="flex-row justify-between mb-5">
        {/* UV */}
        <View className="bg-gray-50 rounded-xl p-4 w-[48%]">
          <View className="flex-row items-center mb-2">
            <FontAwesome name="sun-o" size={18} color="#f97316" />
            <View className="ml-2 bg-orange-100 px-2 py-0.5 rounded-full">
              <Text className="text-xs text-orange-600 font-semibold">
                Very High
              </Text>
            </View>
          </View>
          <Text className="text-3xl font-extrabold">8</Text>
          <Text className="text-gray-400 text-sm">UV Index</Text>
        </View>

        {/* Time */}
        <View className="bg-gray-50 rounded-xl p-4 w-[48%]">
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

      {/* Immediate Actions */}
      <Text className="text-lg font-bold mb-3">Immediate Actions</Text>

      <View className="space-y-3 mb-6">
        {[
          "Apply broad-spectrum sunscreen SPF 50+",
          "Seek shade immediately",
          "Wear protective clothing & sunglasses",
        ].map((item, index) => (
          <View key={index} className="flex-row items-center">
            <View className="bg-orange-500 rounded-full p-1 mr-3">
              <FontAwesome name="check" size={12} color="#fff" />
            </View>
            <Text className="text-gray-700">{item}</Text>
          </View>
        ))}
      </View>

      {/* CTA Button */}
      <TouchableOpacity className="bg-orange-500 py-4 rounded-xl flex-row justify-center items-center mb-10">
        <Text className="text-white font-bold text-lg mr-2">
          View Recommendations
        </Text>
        <FontAwesome name="arrow-right" size={16} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SunProtectionScreen;
