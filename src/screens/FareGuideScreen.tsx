import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainNavigator';

const fares = [
  { label: 'Tuk-tuk meter (city)', value: 'Rs.100–120 base, Rs.90–120/km' },
  { label: 'Ride-hailing (car)', value: 'Rs.120–160/km; surge in peak hours' },
  { label: 'Airport taxi (CMB→Colombo)', value: 'Rs.7,000–9,000 (fixed counters)' },
  { label: 'Intercity A/C bus', value: 'Rs.40–60 per km approx.' },
  { label: 'Highway tolls', value: 'Usually included in airport cab quotes; confirm first' },
];

const quickActions = [
  {
    icon: 'car',
    title: 'Ride-hailing',
    desc: 'PickMe, Uber in major cities',
    detail:
      'PickMe & Uber work in Colombo/Kandy/Galle. Check surge at peaks; plates and driver pic should match; share trip when alone.',
  },
  {
    icon: 'plane-arrival',
    title: 'Airport taxi',
    desc: 'Fixed fares from CMB',
    detail:
      'Counters in arrivals quote fixed Colombo fares (Rs.7k–9k). Agree price before leaving. Highway tolls usually included.',
  },
  {
    icon: 'train',
    title: 'Train times',
    desc: 'Colombo–Kandy/Ella daily',
    detail:
      'Popular scenic trains sell out. Reserve 1st/2nd class early; observation cars limited. Expect delays; carry water and snacks.',
  },
  {
    icon: 'bus',
    title: 'Bus routes',
    desc: 'Express A/C & intercity',
    detail:
      'Highway A/C buses run Colombo↔Galle/Matara/Kandy. Buy tickets onboard, keep small change, and secure luggage overhead.',
  },
];

export const FareGuideScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [selectedAction, setSelectedAction] = useState<(typeof quickActions)[number] | null>(null);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="pr-3">
          <FontAwesome5 name="arrow-left" size={18} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-gilroy-bold text-gray-900">Fare guide</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Quick picks */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <Text className="text-lg font-gilroy-bold text-gray-900 mb-3">Quick picks</Text>
          <View className="flex-row flex-wrap -mx-2">
            {quickActions.map(item => (
              <View key={item.title} className="w-1/2 px-2 mb-3">
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setSelectedAction(item)}
                  className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                >
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-2">
                    <FontAwesome5 name={item.icon as any} size={16} color="#F5840E" />
                  </View>
                  <Text className="text-sm font-gilroy-bold text-gray-900">{item.title}</Text>
                  <Text className="text-xs font-gilroy-regular text-gray-600 mt-1">
                    {item.desc}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 shadow-sm">
          {fares.map(item => (
            <View
              key={item.label}
              className="flex-row justify-between items-start py-3 border-b border-gray-100 last:border-b-0"
            >
              <Text className="text-sm font-gilroy-medium text-gray-800 flex-1 mr-2">
                {item.label}
              </Text>
              <Text className="text-sm font-gilroy-bold text-gray-900 text-right flex-1">
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Quick pick detail modal */}
      <Modal transparent visible={!!selectedAction} animationType="fade">
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-5 w-full max-w-md">
            <View className="flex-row items-center mb-3">
              {selectedAction ? (
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                  <FontAwesome5 name={selectedAction.icon as any} size={16} color="#F5840E" />
                </View>
              ) : null}
              <Text className="text-lg font-gilroy-bold text-gray-900 flex-1">
                {selectedAction?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedAction(null)}>
                <FontAwesome5 name="times" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text className="text-sm font-gilroy-regular text-gray-700 leading-5">
              {selectedAction?.detail}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedAction(null)}
              className="mt-4 bg-primary rounded-xl py-3 items-center"
              activeOpacity={0.9}
            >
              <Text className="text-sm font-gilroy-bold text-white">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
