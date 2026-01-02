import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { PreferenceCard } from '@components/preferences';
import { Button } from '@components/common';
import { useAuthStore } from '@stores';
import { userService } from '@services/api';
import type { TravelPreferenceScores } from '@types';

const successAnimation = require('@assets/animations/success.json');
const discoverAnimation = require('@assets/animations/onbord2.json');

const { width } = Dimensions.get('window');

interface PreferenceCategory {
  id: keyof TravelPreferenceScores;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  examples: string[];
}

const PREFERENCE_CATEGORIES: PreferenceCategory[] = [
  {
    id: 'history',
    title: 'History & Culture',
    subtitle: 'Ancient ruins, temples, museums',
    description: 'How interested are you in exploring historical sites, ancient civilizations, and cultural heritage?',
    icon: '🏛️',
    color: '#8B5CF6',
    examples: ['Sigiriya Rock', 'Temple of the Tooth', 'Galle Fort'],
  },
  {
    id: 'adventure',
    title: 'Adventure & Thrills',
    subtitle: 'Hiking, surfing, wildlife safaris',
    description: 'How excited are you about adrenaline-pumping activities and outdoor adventures?',
    icon: '🏄',
    color: '#F59E0B',
    examples: ['White Water Rafting', 'Hiking', 'Safari Tours'],
  },
  {
    id: 'nature',
    title: 'Nature & Wildlife',
    subtitle: 'National parks, beaches, waterfalls',
    description: 'How much do you enjoy being surrounded by natural beauty and wildlife?',
    icon: '🌿',
    color: '#10B981',
    examples: ['Yala Safari', 'Horton Plains', 'Mirissa Whales'],
  },
  {
    id: 'relaxation',
    title: 'Relaxation & Wellness',
    subtitle: 'Spas, yoga, peaceful retreats',
    description: 'How important is unwinding and finding inner peace during your travels?',
    icon: '🧘',
    color: '#3B82F6',
    examples: ['Ayurveda Spas', 'Beach Resorts', 'Meditation Retreats'],
  },
];

type SlideType = 'intro' | 'preference' | 'summary' | 'complete';

interface Slide {
  type: SlideType;
  category?: PreferenceCategory;
}

export const PreferencesOnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateUser } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferences, setPreferences] = useState<TravelPreferenceScores>({
    history: 0.5,
    adventure: 0.5,
    nature: 0.5,
    relaxation: 0.5,
  });

  // Build slides array: intro + preferences + summary + complete
  const slides: Slide[] = [
    { type: 'intro' },
    ...PREFERENCE_CATEGORIES.map(cat => ({ type: 'preference' as SlideType, category: cat })),
    { type: 'summary' },
    { type: 'complete' },
  ];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  };

  const handlePreferenceChange = useCallback((categoryId: keyof TravelPreferenceScores, value: number) => {
    setPreferences(prev => ({
      ...prev,
      [categoryId]: value,
    }));
  }, []);

  const handleSubmitPreferences = async () => {
    try {
      setIsSubmitting(true);

      // Call API to save travel preferences using the correct endpoint
      console.log('Submitting preferences:', preferences);
      await userService.updateTravelPreferences(preferences);

      // Update local user state
      if (user) {
        await updateUser({
          ...user,
          hasSetPreferences: true,
        });
      }

      // Move to completion slide
      goToNext();
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      Alert.alert(
        'Oops!',
        error.message || 'Failed to save your preferences. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' as never }],
    });
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Preferences?',
      'You can always set your preferences later in settings. We\'ll use default preferences for now.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            if (user) {
              await updateUser({
                ...user,
                hasSetPreferences: true,
              });
            }
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainApp' as never }],
            });
          },
        },
      ]
    );
  };

  const renderIntroSlide = () => (
    <View className="flex-1 justify-center items-center px-6" style={{ width }}>
      <LottieView
        source={discoverAnimation}
        autoPlay
        loop
        style={styles.introAnimation}
      />
      <Text className="text-3xl font-gilroy-bold text-gray-900 text-center mb-4">
        Personalize Your Journey
      </Text>
      <Text className="text-base font-gilroy-regular text-gray-500 text-center leading-6 mb-8">
        Tell us what excites you! We'll use this to recommend perfect destinations just for you.
      </Text>
      <View className="flex-row items-center gap-2 mb-4">
        <Text className="text-2xl">🎯</Text>
        <Text className="text-sm font-gilroy-medium text-gray-600">
          Takes only 2 minutes
        </Text>
      </View>
    </View>
  );

  const renderPreferenceSlide = (category: PreferenceCategory) => (
    <View className="flex-1 pt-8" style={{ width }}>
      <PreferenceCard
        title={category.title}
        description={category.description}
        icon={category.icon}
        color={category.color}
        value={preferences[category.id]}
        onValueChange={(value) => handlePreferenceChange(category.id, value)}
      />
      <View className="px-6 mt-4">
        <Text className="text-xs font-gilroy-medium text-gray-400 text-center mb-2">
          Popular in Sri Lanka:
        </Text>
        <View className="flex-row flex-wrap justify-center gap-2">
          {category.examples.map((example, idx) => (
            <View
              key={idx}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: `${category.color}15` }}
            >
              <Text
                className="text-xs font-gilroy-medium"
                style={{ color: category.color }}
              >
                {example}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderSummarySlide = () => (
    <View className="flex-1 px-6 pt-12" style={{ width }}>
      <Text className="text-2xl font-gilroy-bold text-gray-900 text-center mb-2">
        Your Travel Profile
      </Text>
      <Text className="text-sm font-gilroy-regular text-gray-500 text-center mb-8">
        Here's what we learned about you
      </Text>

      {PREFERENCE_CATEGORIES.map((category) => {
        const value = preferences[category.id];
        const percentage = Math.round(value * 100);
        return (
          <View key={category.id} className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-2">{category.icon}</Text>
                <Text className="text-base font-gilroy-medium text-gray-800">
                  {category.title}
                </Text>
              </View>
              <Text
                className="text-base font-gilroy-bold"
                style={{ color: category.color }}
              >
                {percentage}%
              </Text>
            </View>
            <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: category.color,
                }}
              />
            </View>
          </View>
        );
      })}

      <View className="mt-8 p-4 bg-orange-50 rounded-2xl">
        <Text className="text-sm font-gilroy-medium text-orange-800 text-center">
          ✨ Based on your preferences, we'll recommend the best places to visit, optimal times to go, and activities you'll love!
        </Text>
      </View>
    </View>
  );

  const renderCompleteSlide = () => (
    <View className="flex-1 justify-center items-center px-6" style={{ width }}>
      <LottieView
        source={successAnimation}
        autoPlay
        loop={false}
        style={styles.completeAnimation}
      />
      <Text className="text-3xl font-gilroy-bold text-gray-900 text-center mb-4">
        You're All Set! 🎉
      </Text>
      <Text className="text-base font-gilroy-regular text-gray-500 text-center leading-6 mb-8">
        Your personalized Sri Lanka adventure awaits. Let's discover amazing places together!
      </Text>
      <Button
        title="Start Exploring"
        onPress={handleComplete}
        variant="primary"
        className="w-full"
      />
    </View>
  );

  const renderSlide = ({ item }: { item: Slide }) => {
    switch (item.type) {
      case 'intro':
        return renderIntroSlide();
      case 'preference':
        return renderPreferenceSlide(item.category!);
      case 'summary':
        return renderSummarySlide();
      case 'complete':
        return renderCompleteSlide();
      default:
        return null;
    }
  };

  const currentSlide = slides[currentIndex];
  const isIntro = currentSlide.type === 'intro';
  const isSummary = currentSlide.type === 'summary';
  const isComplete = currentSlide.type === 'complete';
  const totalPreferenceSlides = PREFERENCE_CATEGORIES.length;
  const preferenceIndex = currentIndex - 1; // -1 for intro slide

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with Skip button */}
      {!isComplete && (
        <View className="flex-row justify-between items-center px-6 py-3">
          <View>
            {!isIntro && preferenceIndex >= 0 && preferenceIndex < totalPreferenceSlides && (
              <Text className="text-sm font-gilroy-medium text-gray-400">
                {preferenceIndex + 1} of {totalPreferenceSlides}
              </Text>
            )}
          </View>
          {!isSummary && !isComplete && (
            <TouchableOpacity onPress={handleSkip}>
              <Text className="text-sm font-gilroy-medium text-gray-400">Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Progress Bar */}
      {!isComplete && (
        <View className="px-6 mb-4">
          <View className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{
                width: `${((currentIndex + 1) / (slides.length - 1)) * 100}%`,
              }}
            />
          </View>
        </View>
      )}

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
        keyExtractor={(_, index) => index.toString()}
        scrollEnabled={!isSubmitting}
      />

      {/* Bottom Navigation */}
      {!isComplete && (
        <View className="px-6 pb-6">
          {/* Pagination Dots */}
          <View className="flex-row justify-center mb-6">
            {slides.slice(0, -1).map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full mx-1 ${
                  index === currentIndex
                    ? 'w-8 bg-primary'
                    : index < currentIndex
                    ? 'w-2 bg-primary opacity-50'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </View>

          {/* Navigation Buttons */}
          <View className="flex-row gap-3">
            {!isIntro && (
              <Button
                title="Back"
                onPress={goBack}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              />
            )}
            {isSummary ? (
              <Button
                title={isSubmitting ? 'Saving...' : 'Save & Continue'}
                onPress={handleSubmitPreferences}
                variant="primary"
                className="flex-1"
                disabled={isSubmitting}
              />
            ) : (
              <Button
                title={isIntro ? "Let's Go!" : 'Next'}
                onPress={goToNext}
                variant="primary"
                className={isIntro ? 'flex-1' : 'flex-1'}
              />
            )}
          </View>
        </View>
      )}

      {/* Loading Overlay */}
      {isSubmitting && (
        <View className="absolute inset-0 bg-black/30 items-center justify-center">
          <View className="bg-white p-6 rounded-2xl items-center">
            <ActivityIndicator size="large" color="#F5840E" />
            <Text className="mt-3 text-base font-gilroy-medium text-gray-700">
              Saving your preferences...
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  introAnimation: {
    width: width * 0.8,
    height: width * 0.8,
  },
  completeAnimation: {
    width: 200,
    height: 200,
  },
});

export default PreferencesOnboardingScreen;

