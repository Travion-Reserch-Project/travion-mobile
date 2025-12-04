import React, { useEffect } from 'react';
import { View, Text, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { Button } from '@components/common';

const youAreInAnimation = require('@assets/animations/you-are-in.json');
const welcomeBackAnimation = require('@assets/animations/success.json'); // Add this animation

interface ProfileCompletionProps {
  onGetStarted: () => void;
  isProfileComplete?: boolean;
}

export const ProfileCompletionScreen: React.FC<ProfileCompletionProps> = ({
  onGetStarted,
  isProfileComplete = false,
}) => {
  const { width } = Dimensions.get('window');
  const imageSize = width * 1;

  // Debug logging
  console.log('ProfileCompletionScreen - isProfileComplete:', isProfileComplete);

  // Auto-redirect to home after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onGetStarted();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onGetStarted]);

  // Choose animation and content based on profile completion status
  const animationSource = isProfileComplete ? welcomeBackAnimation : youAreInAnimation;
  const title = isProfileComplete ? 'Welcome Back!' : 'All Set Up!';
  const description = isProfileComplete
    ? 'Great to see you again!\nReady to continue your travel journey?'
    : 'Your profile has been created successfully.\nGet ready to explore amazing travel destinations and plan your perfect vacation!';
  const buttonText = isProfileComplete ? 'Continue Exploring' : "Let's Start Exploring!";
  const footerText = isProfileComplete
    ? 'Your adventure continues...'
    : 'Welcome to your travel companion';

  console.log(
    'Animation source:',
    animationSource === welcomeBackAnimation ? 'welcomeBack' : 'youAreIn',
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View className="flex-1 top-8">
        {/* Setup Complete Animation */}
        <View className="items-center">
          <LottieView
            source={animationSource}
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
          <Text className="text-3xl font-gilroy-bold text-gray-900 text-center mb-4">{title}</Text>
          <View className="w-16 h-1 bg-primary mb-6" />
          <Text className="text-base font-gilroy-regular text-gray-600 text-center leading-6 px-4">
            {description}
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <View className="w-full px-4 pb-20">
        <Button title={buttonText} onPress={onGetStarted} variant="primary" className="w-full" />
        {/* Optional Footer Text */}
        <View className="mt-8">
          <Text className="text-sm font-gilroy-regular text-gray-400 text-center">
            {footerText}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};
