import { BottomNav } from '@components/onboarding/BottomNav';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useAuthStore } from '@stores';

// Lottie animation imports
const mapAnimation = require('@assets/animations/onbord4.json');
const discoverAnimation = require('@assets/animations/onbord2.json');
const planAnimation = require('@assets/animations/onbord3.json');

const { width } = Dimensions.get('window');
interface OnboardingSlide {
  id: string;
  color: string;
  title: string;
  description: string;
  animation?: any;
}

type OnboardingScreenProps = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const slides: OnboardingSlide[] = [
  {
    id: '1',
    color: '#86EFAC',
    title: 'Step Into Paradise',
    description: 'Your smart companion for a safe and enriching journey.',
    animation: mapAnimation,
  },
  {
    id: '2',
    color: '#93C5FD',
    title: 'Discover Hidden Gems',
    description: 'Explore the most beautiful places and authentic experiences.',
    animation: discoverAnimation,
  },
  {
    id: '3',
    color: '#FCD34D',
    title: 'Plan Your Journey',
    description: 'Get personalized recommendations based on your preferences.',
    animation: planAnimation,
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { completeOnboarding } = useAuthStore();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // Mark onboarding as complete and navigate to login screen
      completeOnboarding();
      navigation.navigate('Login');
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => {
    const padding = 0;
    const animationSize = width - padding;

    return (
      <View className="flex-1 items-center justify-between " style={{ width }}>
        <View className="w-full items-center mt-10">
          <View className="items-center justify-center">
            <LottieView
              source={item.animation}
              autoPlay
              loop
              style={{
                width: animationSize,
                height: animationSize,
              }}
            />
          </View>
        </View>

        {/* Content */}
        <View className="w-full items-center pb-32 px-10">
          <Text className="text-4xl font-gilroy-bold text-gray-900 text-center mb-4">
            {item.title}
          </Text>
          <Text className="text-lg font-gilroy-regular text-gray-600 text-center leading-7">
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 bg-white">
        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyExtractor={item => item.id}
        />

        {/* Bottom Section */}
        <View className="bottom-0 left-0 right-0 bg-white">
          <View className=" px-6">
            {/* Pagination Dots */}
            <View className="flex-row justify-center mb-8">
              {slides.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 rounded-full mx-1 ${
                    index === currentIndex ? 'w-8 bg-gray-900' : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </View>

            {/* Get Started Button */}
            <BottomNav
              onBack={() => {
                if (currentIndex > 0) {
                  flatListRef.current?.scrollToIndex({
                    index: currentIndex - 1,
                    animated: true,
                  });
                }
              }}
              onNext={handleNext}
              isFirstStep={currentIndex === 0}
              isLastStep={currentIndex === slides.length - 1}
              isNextDisabled={false}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};
