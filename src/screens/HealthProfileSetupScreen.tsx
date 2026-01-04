import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const HealthProfileSetupScreen: React.FC = () => {
  return (
    <View className="flex-1 bg-[#0f0f0f] px-6">
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      {/* Header */}
      <View className="flex-row items-center mt-6 mb-8">
        <TouchableOpacity className="mr-4">
          <FontAwesome name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Profile Setup</Text>
      </View>

      {/* Progress Dots */}
      <View className="flex-row justify-center mb-8">
        <View className="w-10 h-2 rounded-full bg-orange-500 mr-2" />
        <View className="w-2 h-2 rounded-full bg-gray-600 mr-2" />
        <View className="w-2 h-2 rounded-full bg-gray-600" />
      </View>

      {/* Title */}
      <Text className="text-white text-3xl font-extrabold mb-3">Let's get to know you</Text>
      <Text className="text-gray-400 text-base mb-10">
        We need a few details to personalize your UV safety plan and predictions.
      </Text>

      {/* Image Upload */}
      <View className="items-center mb-10">
        <View className="w-44 h-44 rounded-full border-2 border-dashed border-gray-600 items-center justify-center bg-[#1a1a1a]">
          <FontAwesome name="camera" size={32} color="#fff" />
        </View>

        {/* Edit Button */}
        <TouchableOpacity className="absolute bottom-2 right-[38%] bg-orange-500 w-12 h-12 rounded-full items-center justify-center border-4 border-[#0f0f0f]">
          <FontAwesome name="pencil" size={18} color="#fff" />
        </TouchableOpacity>

        <Text className="text-white mt-5 font-semibold">Tap to add photo</Text>
      </View>

      {/* Age Input */}
      <Text className="text-white mb-2 font-semibold">How old are you?</Text>

      <View className="flex-row items-center bg-[#1a1a1a] rounded-full px-5 py-4 mb-4">
        <TextInput
          placeholder="16+"
          placeholderTextColor="#6b7280"
          keyboardType="numeric"
          className="flex-1 text-white text-base"
        />
        <FontAwesome name="calendar" size={18} color="#9ca3af" />
      </View>

      {/* Info */}
      <View className="flex-row items-start mb-10">
        <View className="bg-orange-500 w-6 h-6 rounded-full items-center justify-center mr-3 mt-0.5">
          <FontAwesome name="shield" size={12} color="#000" />
        </View>
        <Text className="text-gray-400 text-sm flex-1">
          Strictly for tourists aged 16+. Used to calculate skin sensitivity and sun exposure
          limits.
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity className="bg-orange-500 rounded-full py-5 flex-row justify-center items-center shadow-lg mb-4">
        <Text className="text-black font-extrabold text-lg mr-3">Upload Image & Continue</Text>
        <FontAwesome name="arrow-right" size={18} color="#000" />
      </TouchableOpacity>

      {/* Privacy */}
      <Text className="text-center text-gray-500 text-xs tracking-widest">
        YOUR HEALTH DATA IS PRIVATE
      </Text>
    </View>
  );
};

export default HealthProfileSetupScreen;