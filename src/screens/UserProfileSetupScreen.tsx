import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { UserProfileForm, UserProfileData } from '@components/forms';
import { Button } from '@components/common';
import { useAuthStore } from '@stores';
import { userService } from '@services/api';
import { useNavigation } from '@react-navigation/native';

const youAreInAnimation = require('@assets/animations/you-are-in.json');

interface UserProfileSetupProps {}

export const UserProfileSetupScreen: React.FC<UserProfileSetupProps> = () => {
  const navigation = useNavigation();
  const { updateUser } = useAuthStore();
  const [_isLoading, _setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

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

      // Show completion screen
      setShowCompletion(true);
    } catch (error: any) {
      console.error('Profile update failed:', error);
      Alert.alert('Update Failed', error.message || 'Failed to update profile. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-redirect after completion
  useEffect(() => {
    if (showCompletion) {
      const timer = setTimeout(() => {
        navigation.navigate('MainApp' as never);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showCompletion, navigation]);

  const handleGetStarted = () => {
    navigation.navigate('MainApp' as never);
  };

  // Show completion screen
  if (showCompletion) {
    const { width } = Dimensions.get('window');
    const imageSize = width * 1;

    // This screen only handles new profile completions now
    const title = 'All Set Up!';
    const description =
      'Your profile has been created successfully.\nGet ready to explore amazing travel destinations and plan your perfect vacation!';
    const buttonText = "Let's Start Exploring!";
    const footerText = 'Welcome to your travel companion';

    console.log('UserProfileSetupScreen - New profile completion screen');

    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View className="flex-1 top-8">
          {/* Setup Complete Animation */}
          <View className="items-center">
            <LottieView
              source={youAreInAnimation}
              autoPlay
              loop
              style={{
                width: imageSize,
                height: imageSize,
              }}
            />
          </View>

          {/* Title and Description */}
          <View className="items-center mb-12">
            <Text className="text-3xl font-gilroy-bold text-gray-900 text-center mb-4">
              {title}
            </Text>
            <View className="w-16 h-1 bg-primary mb-6" />
            <Text className="text-base font-gilroy-regular text-gray-600 text-center leading-6 px-4">
              {description}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <View className="w-full px-4 pb-20">
          <Button
            title={buttonText}
            onPress={handleGetStarted}
            variant="primary"
            className="w-full"
          />
          {/* Optional Footer Text */}
          <View className="mt-8">
            <Text className="text-sm font-gilroy-regular text-gray-400 text-center">
              {footerText}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            initialData={null}
            _isSubmitting={isSubmitting}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
