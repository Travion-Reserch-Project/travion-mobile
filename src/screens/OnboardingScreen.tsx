import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  color: string;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    color: '#86EFAC',
    title: 'Welcome to Sri Lanka',
    description: 'Your smart companion for a safe and enriching journey.',
  },
  {
    id: '2',
    color: '#93C5FD',
    title: 'Discover Hidden Gems',
    description: 'Explore the most beautiful places and authentic experiences.',
  },
  {
    id: '3',
    color: '#FCD34D',
    title: 'Plan Your Journey',
    description: 'Get personalized recommendations based on your preferences.',
  },
];

export const OnboardingScreen: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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
      // Navigate to trip planning screen
      console.log('Navigate to trip planning');
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View className="flex-1 items-center justify-between px-6" style={{ width }}>
      {/* Image Container */}
      <View className="w-full items-center mt-12">
        <View
          className="rounded-full items-center justify-center"
          style={{
            width: 280,
            height: 280,
            backgroundColor: item.color,
          }}
        >
          <Icon name="map-marked-alt" size={120} color="#ffffff" solid />
        </View>
      </View>

      {/* Content */}
      <View className="w-full items-center pb-32">
        <Text className="text-4xl font-bold text-gray-900 text-center mb-4">{item.title}</Text>
        <Text className="text-lg text-gray-600 text-center leading-7">{item.description}</Text>
      </View>
    </View>
  );

  return (
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
      <View className="absolute bottom-0 left-0 right-0 pb-12 px-6">
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
        <TouchableOpacity
          onPress={handleNext}
          className="bg-orange-500 rounded-2xl py-5 items-center shadow-sm"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold">
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
