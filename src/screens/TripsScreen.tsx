import React from 'react';
import { View, Text, SafeAreaView, StatusBar } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

export const TripsScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-6">
          <FontAwesome5 name="map-marked-alt" size={32} color="#F5840E" />
        </View>

        <Text className="text-2xl font-gilroy-bold text-gray-900 text-center mb-4">My Trips</Text>

        <Text className="text-base font-gilroy-regular text-gray-600 text-center leading-6">
          View and manage your upcoming and past trips. Your travel history is here.
        </Text>
      </View>
    </SafeAreaView>
  );
};
