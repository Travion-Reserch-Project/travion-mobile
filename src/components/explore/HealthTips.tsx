import React from 'react';
import { View, Text } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

interface HealthTip {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

interface HealthTipsProps {
  tips?: HealthTip[];
}

const defaultTips: HealthTip[] = [
  {
    id: '1',
    title: 'Stay Hydrated',
    description:
      'Drink plenty of water, especially in hot climates. Carry a reusable water bottle.',
    icon: 'tint',
    category: 'Wellness',
  },
  {
    id: '2',
    title: 'Get Travel Insurance',
    description: 'Protect yourself with comprehensive travel insurance before departure.',
    icon: 'shield-alt',
    category: 'Insurance',
  },
  {
    id: '3',
    title: 'Pack Essential Medicines',
    description: 'Bring prescription medications and basic first-aid supplies.',
    icon: 'pills',
    category: 'Medical',
  },
  {
    id: '4',
    title: 'Sun Protection',
    description: 'Use sunscreen with SPF 30+ and wear protective clothing in sunny areas.',
    icon: 'sun',
    category: 'Wellness',
  },
];

export const HealthTips: React.FC<HealthTipsProps> = ({ tips = defaultTips }) => {
  return (
    <View className="px-6">
      <Text className="text-xl font-gilroy-bold text-gray-900 mb-6">Health Tips & Suggestions</Text>

      {tips.map(tip => (
        <View key={tip.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-start">
            <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mr-4">
              <FontAwesome5 name={tip.icon} size={18} color="#10B981" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-gilroy-bold text-gray-900">{tip.title}</Text>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-xs font-gilroy-medium text-green-700">{tip.category}</Text>
                </View>
              </View>
              <Text className="text-sm font-gilroy-regular text-gray-600 leading-5">
                {tip.description}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* Additional Health Resources */}
      <View className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 mt-4">
        <View className="flex-row items-center mb-3">
          <FontAwesome5 name="heartbeat" size={20} color="#10B981" />
          <Text className="text-lg font-gilroy-bold text-gray-900 ml-2">Health Resources</Text>
        </View>
        <Text className="text-sm font-gilroy-regular text-gray-600 mb-4">
          Access emergency contacts, nearby hospitals, and health services in your current location.
        </Text>
        <View className="flex-row justify-between">
          <View className="flex-1 items-center mx-2">
            <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mb-2">
              <FontAwesome5 name="ambulance" size={16} color="#DC2626" />
            </View>
            <Text className="text-xs font-gilroy-medium text-gray-700 text-center">Emergency</Text>
          </View>
          <View className="flex-1 items-center mx-2">
            <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-2">
              <FontAwesome5 name="hospital" size={16} color="#2563EB" />
            </View>
            <Text className="text-xs font-gilroy-medium text-gray-700 text-center">Hospitals</Text>
          </View>
          <View className="flex-1 items-center mx-2">
            <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mb-2">
              <FontAwesome5 name="user-md" size={16} color="#10B981" />
            </View>
            <Text className="text-xs font-gilroy-medium text-gray-700 text-center">Doctors</Text>
          </View>
        </View>
      </View>
    </View>
  );
};
