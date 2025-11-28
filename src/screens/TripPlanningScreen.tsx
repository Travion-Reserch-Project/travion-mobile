import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

interface TravelOption {
  id: string;
  label: string;
  icon: string;
}

const travelStyles: TravelOption[] = [
  { id: 'adventure', label: 'Adventure', icon: 'hiking' },
  { id: 'relaxation', label: 'Relaxation', icon: 'umbrella-beach' },
  { id: 'culture', label: 'Culture', icon: 'landmark' },
  { id: 'foodie', label: 'Foodie', icon: 'utensils' },
];

const travelCompanions: TravelOption[] = [
  { id: 'solo', label: 'Solo', icon: 'user' },
  { id: 'couple', label: 'Couple', icon: 'heart' },
  { id: 'family', label: 'Family', icon: 'users' },
  { id: 'friends', label: 'Friends', icon: 'user-friends' },
];

export const TripPlanningScreen: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState<string>('adventure');
  const [selectedCompanion, setSelectedCompanion] = useState<string>('family');

  const handleFinish = () => {
    console.log('Trip preferences:', { selectedStyle, selectedCompanion });
    // Navigate to main app
  };

  const handleSkip = () => {
    console.log('Skip onboarding');
    // Navigate to main app
  };

  const renderOption = (option: TravelOption, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={option.id}
      onPress={onPress}
      className={`flex-1 m-2 py-6 rounded-2xl items-center justify-center ${
        isSelected ? 'bg-white border-2 border-orange-500' : 'bg-gray-50 border-2 border-gray-200'
      }`}
      activeOpacity={0.7}
    >
      <Icon name={option.icon} size={48} color={isSelected ? '#f97316' : '#374151'} solid />
      <Text
        className={`text-base font-medium mt-2 ${isSelected ? 'text-orange-500' : 'text-gray-700'}`}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-16 pb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-4">Tell us about your trip</Text>
          <Text className="text-base text-gray-600 text-center leading-6">
            Help us personalize your experience by answering{'\n'}a few quick questions
          </Text>
        </View>

        {/* Travel Style Section */}
        <View className="px-6 mb-8">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            What's your travel style?
          </Text>
          <View className="flex-row flex-wrap -m-2">
            {travelStyles.map(style =>
              renderOption(style, selectedStyle === style.id, () => setSelectedStyle(style.id)),
            )}
          </View>
        </View>

        {/* Travel Companion Section */}
        <View className="px-6 mb-12">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            Who are you traveling with?
          </Text>
          <View className="flex-row flex-wrap -m-2">
            {travelCompanions.map(companion =>
              renderOption(companion, selectedCompanion === companion.id, () =>
                setSelectedCompanion(companion.id),
              ),
            )}
          </View>
        </View>

        {/* Pagination Dots */}
        <View className="flex-row justify-center mb-8">
          {[0, 1, 2, 3].map(index => (
            <View
              key={index}
              className={`h-2 w-2 rounded-full mx-1 ${
                index === 3 ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View className="px-6 pb-8 pt-4 bg-white">
        <TouchableOpacity
          onPress={handleFinish}
          className="bg-orange-500 rounded-2xl py-5 items-center mb-4 shadow-sm"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold">Finish</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} className="py-3 items-center" activeOpacity={0.7}>
          <Text className="text-orange-500 text-base font-medium">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
