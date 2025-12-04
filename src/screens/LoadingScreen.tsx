import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const LoadingScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#F5840E" />
        <Text className="mt-4 text-base font-gilroy-medium text-gray-600">Loading...</Text>
      </View>
    </SafeAreaView>
  );
};
