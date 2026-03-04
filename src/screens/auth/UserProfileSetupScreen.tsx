import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
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
  const [isLoading, _setIsLoading] = useState(false);
  const [_isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const handleProfileSubmit = async (profileData: UserProfileData) => {
    try {
      setIsSubmitting(true);

      const updatedUser = await userService.updateProfile({
        ...profileData,
      });

      updateUser({ ...updatedUser, profileStatus: 'Incomplete' });
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

  useEffect(() => {
    if (showCompletion) {
      const timer = setTimeout(() => {
        navigation.navigate('PreferencesOnboarding' as never);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showCompletion, navigation]);

  const handleGetStarted = () => {
    navigation.navigate('PreferencesOnboarding' as never);
  };

  const handleSkipProfile = () => {
    Alert.alert(
      'Skip Profile Setup?',
      'You can always complete your profile later from the Profile section.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => {
            navigation.navigate('PreferencesOnboarding' as never);
          },
        },
      ],
    );
  };

  if (showCompletion) {
    const title = 'Profile Complete!';
    const description =
      "Great job! Now let's personalize your travel experience by setting your preferences.";
    const buttonText = 'Set Travel Preferences';
    const footerText = 'One more step to get started';

    console.log('UserProfileSetupScreen - New profile completion screen');

    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View className="flex-1 top-8">
          <View className="items-center">
            <LottieView source={youAreInAnimation} autoPlay loop style={styles.animation} />
          </View>

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

        <View className="w-full px-4 pb-20">
          <Button
            title={buttonText}
            onPress={handleGetStarted}
            variant="primary"
            className="w-full"
          />
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

      {/* Skip button */}
      <View className="flex-row justify-end px-6 pt-4">
        <TouchableOpacity onPress={handleSkipProfile}>
          <Text className="text-sm font-gilroy-medium text-gray-400">Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={true} bounces={false}>
        <View className="pt-4 pb-32">
          <View className="mb-8">
            <Text className="text-3xl font-gilroy-bold text-gray-900 mb-2">
              Complete Your Profile
            </Text>
            <View className="w-16 h-1 bg-primary mb-4" />
            <Text className="text-base font-gilroy-regular text-gray-600">
              Help us personalize your travel experience
            </Text>
          </View>

          <UserProfileForm onSubmit={handleProfileSubmit} initialData={null} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  animation: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width,
  },
});
