import React from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';
import { Button } from '@components/common';
import { logger } from '@utils';

export const HomeScreen: React.FC = () => {
  const handlePress = () => {
    logger.info('Button pressed!');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="flex-1 p-6">
        <View className="bg-red-500 p-4 rounded-lg mb-4">
          <Text className="text-white text-xl font-bold">NativeWind Test</Text>
          <Text className="text-white">
            If you see red background and white text, it's working!
          </Text>
        </View>

        <View className="mt-8 mb-12">
          <Text className="text-4xl font-bold text-gray-900 mb-2">Welcome to Travion</Text>
          <Text className="text-lg text-gray-600">Your journey starts here</Text>
        </View>

        <View className="flex-1">
          <Button title="Get Started" onPress={handlePress} fullWidth />
          <View className="h-4" />
          <Button title="Learn More" variant="outline" onPress={handlePress} fullWidth />
        </View>
      </View>
    </SafeAreaView>
  );
};
