import React, { useEffect } from 'react';
import { View, Text, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { Button } from '@components/common';

const youAreInAnimation = require('@assets/animations/you-are-in.json');

interface ProfileCompletionProps {
  onGetStarted: () => void;
}

export const ProfileCompletionScreen: React.FC<ProfileCompletionProps> = ({ onGetStarted }) => {
  const { width } = Dimensions.get('window');
  const imageSize = width * 1;

  // Auto-redirect to home after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onGetStarted();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onGetStarted]);

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
            All Set Up!
          </Text>
          <View className="w-16 h-1 bg-primary mb-6" />
          <Text className="text-base font-gilroy-regular text-gray-600 text-center leading-6 px-4">
            Your profile has been created successfully.{'\n'}
            Get ready to explore amazing travel destinations and plan your perfect vacation!
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <View className="w-full px-4 pb-20">
        <Button
          title="Let's Start Exploring!"
          onPress={onGetStarted}
          variant="primary"
          className="w-full"
        />
        {/* Optional Footer Text */}
        <View className="mt-8">
          <Text className="text-sm font-gilroy-regular text-gray-400 text-center">
            Welcome to your travel companion
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};
