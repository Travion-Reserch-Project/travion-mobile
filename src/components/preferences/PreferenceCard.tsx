import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface PreferenceLevel {
  label: string;
  value: number;
  emoji: string;
  description: string;
}

const PREFERENCE_LEVELS: PreferenceLevel[] = [
  { label: 'Not Interested', value: 0.1, emoji: '😐', description: 'Skip this' },
  { label: 'Slightly', value: 0.3, emoji: '🙂', description: 'A little curious' },
  { label: 'Moderately', value: 0.5, emoji: '😊', description: 'Sounds good' },
  { label: 'Very', value: 0.7, emoji: '😃', description: 'Love it!' },
  { label: 'Extremely', value: 0.9, emoji: '🤩', description: "Can't wait!" },
];

interface PreferenceCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  value: number;
  onValueChange: (value: number) => void;
}

export const PreferenceCard: React.FC<PreferenceCardProps> = ({
  title,
  description,
  icon,
  color,
  value,
  onValueChange,
}) => {
  const getSelectedLevel = () => {
    return PREFERENCE_LEVELS.reduce((prev, curr) =>
      Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
    );
  };

  const selectedLevel = getSelectedLevel();

  return (
    <View className="flex-1 px-4">
      {/* Header */}
      <View className="items-center mb-8">
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: `${color}20` }}
        >
          <Text className="text-5xl">{icon}</Text>
        </View>
        <Text className="text-2xl font-gilroy-bold text-gray-900 text-center mb-2">
          {title}
        </Text>
        <Text className="text-base font-gilroy-regular text-gray-500 text-center px-4">
          {description}
        </Text>
      </View>

      {/* Selection Feedback */}
      <View className="items-center mb-8">
        <Text className="text-6xl mb-2">{selectedLevel.emoji}</Text>
        <Text
          className="text-xl font-gilroy-bold text-center"
          style={{ color }}
        >
          {selectedLevel.label}
        </Text>
        <Text className="text-sm font-gilroy-regular text-gray-400 text-center">
          {selectedLevel.description}
        </Text>
      </View>

      {/* Selection Options */}
      <View className="flex-row justify-center flex-wrap gap-2">
        {PREFERENCE_LEVELS.map((level, index) => {
          const isSelected = Math.abs(level.value - value) < 0.05;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => onValueChange(level.value)}
              className={`px-4 py-3 rounded-2xl border-2 mb-2`}
              style={{
                backgroundColor: isSelected ? color : 'transparent',
                borderColor: isSelected ? color : '#E5E7EB',
                minWidth: (width - 64) / 3,
              }}
            >
              <Text
                className={`text-center font-gilroy-medium text-sm ${
                  isSelected ? 'text-white' : 'text-gray-600'
                }`}
              >
                {level.emoji} {level.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Visual Indicator Bar */}
      <View className="mt-8 px-4">
        <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${value * 100}%`,
              backgroundColor: color,
            }}
          />
        </View>
        <View className="flex-row justify-between mt-2">
          <Text className="text-xs font-gilroy-regular text-gray-400">Not my thing</Text>
          <Text className="text-xs font-gilroy-regular text-gray-400">Absolutely love it!</Text>
        </View>
      </View>
    </View>
  );
};

export default PreferenceCard;


