import React from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserProfileForm, UserProfileData } from '@components/forms';

interface UserProfileSetupProps {
  onComplete: (profileData: UserProfileData) => void;
}

export const UserProfileSetupScreen: React.FC<UserProfileSetupProps> = ({ onComplete }) => {
  const handleProfileSubmit = (profileData: UserProfileData) => {
    onComplete(profileData);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView className="flex-1 px-6">
        <View className="pt-8 mt-5">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-gilroy-bold text-gray-900 mb-2">
              Complete Your Profile
            </Text>
            <View className="w-16 h-1 bg-primary mb-4" />
            <Text className="text-base font-gilroy-regular text-gray-600">
              Help us personalize your travel experience
            </Text>
          </View>

          {/* Profile Form */}
          <UserProfileForm onSubmit={handleProfileSubmit} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
