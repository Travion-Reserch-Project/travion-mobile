import React from 'react';
import { View, Text, StatusBar, ScrollView } from 'react-native';

export const GuideScreen: React.FC = () => {
  return (
    <View className="flex-1">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <Text className="text-2xl font-gilroy-bold text-gray-900">Guide</Text>
        <Text className="text-sm font-gilroy-regular text-gray-600 mt-1">
          Travel tips and guides
        </Text>
      </View>
      <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-base font-gilroy-medium text-gray-800">
            Guide content coming soon.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};
