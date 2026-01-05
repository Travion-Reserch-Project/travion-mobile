import React from 'react';
import { View, Text, StatusBar, ScrollView } from 'react-native';

export const TransportScreen: React.FC = () => {
  return (
    <View className="flex-1">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <Text className="text-2xl font-gilroy-bold text-gray-900">Transport</Text>
        <Text className="text-sm font-gilroy-regular text-gray-600 mt-1">
          Plan your rides and transit updates
        </Text>
      </View>
      <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-base font-gilroy-medium text-gray-800">
            Transport features coming soon.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};
