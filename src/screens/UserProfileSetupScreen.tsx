import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
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

  const updateProfileStatusToComplete = useCallback(async () => {
    try {
      const { user } = useAuthStore.getState();
      if (user) {
        const updatedUser = { ...user, profileStatus: 'Complete' as const };
        updateUser(updatedUser);
        await userService.updateProfile({ profileStatus: 'Complete' });
      }
    } catch (error) {
      console.error('Failed to update profile status:', error);
    }
  }, [updateUser]);

  useEffect(() => {
    if (showCompletion) {
      const timer = setTimeout(() => {
        updateProfileStatusToComplete();
        navigation.navigate('MainApp' as never);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showCompletion, navigation, updateProfileStatusToComplete]);

  const handleGetStarted = async () => {
    await updateProfileStatusToComplete();
    navigation.navigate('MainApp' as never);
  };

  if (showCompletion) {
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

      <ScrollView className="flex-1 px-6">
        <View className="pt-8 mt-5">
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
