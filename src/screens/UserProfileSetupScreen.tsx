import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserProfileForm, UserProfileData } from '@components/forms';
import { useAuthStore } from '@stores';
import { userService } from '@services/api';
import { User } from '@types';

interface UserProfileSetupProps {
  onComplete: (profileData: UserProfileData) => void;
}

export const UserProfileSetupScreen: React.FC<UserProfileSetupProps> = ({ onComplete }) => {
  const { updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingData, setExistingData] = useState<UserProfileData | null>(null);

  const fetchExistingProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const profileData = await userService.getProfile();

      if (profileData) {
        // Check if profile is already complete
        if (profileData.profileStatus === 'Complete') {
          onComplete({
            name: profileData.name || '',
            userName: (profileData as any).userName || profileData.name || '',
            dob: (profileData as any).dob ? new Date((profileData as any).dob) : new Date(),
            gender: ((profileData as any).gender || '') as 'Male' | 'Female' | 'Other' | '',
            country: (profileData as any).country || '',
            preferredLanguage: (profileData as any).preferredLanguage || '',
          });
          return;
        }

        // Map User data to UserProfileData format
        const formData: UserProfileData = {
          name: profileData.name || '',
          userName: profileData.name || '',
          dob: new Date(),
          gender: '',
          country: '',
          preferredLanguage: '',
        };

        setExistingData(formData);
        updateUser(profileData as User);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Continue with empty form if fetch fails
      setExistingData(null);
    } finally {
      setIsLoading(false);
    }
  }, [updateUser, onComplete]);

  useEffect(() => {
    fetchExistingProfile();
  }, [fetchExistingProfile]);

  const handleProfileSubmit = async (profileData: UserProfileData) => {
    try {
      setIsSubmitting(true);

      // Call update profile API
      const updatedUser = await userService.updateProfile({
        ...profileData,
        profileStatus: 'Complete',
      });

      // Update local state
      updateUser(updatedUser);

      Alert.alert('Profile Updated', 'Your profile has been successfully updated!', [
        { text: 'OK', onPress: () => onComplete(profileData) },
      ]);
    } catch (error: any) {
      console.error('Profile update failed:', error);
      Alert.alert('Update Failed', error.message || 'Failed to update profile. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F5840E" />
          <Text className="mt-4 text-base font-gilroy-medium text-gray-600">
            Loading your profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <UserProfileForm
            onSubmit={handleProfileSubmit}
            initialData={existingData}
            _isSubmitting={isSubmitting}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
