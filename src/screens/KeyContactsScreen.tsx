import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainNavigator';

const contacts = [
  { label: 'Tourist Police', value: '1912', icon: 'shield-alt' },
  { label: 'Police Emergency', value: '119', icon: 'phone-square' },
  { label: 'Ambulance', value: '1990', icon: 'ambulance' },
  { label: 'Fire & Rescue', value: '110', icon: 'fire-extinguisher' },
  { label: 'General Info', value: '1919', icon: 'info-circle' },
];

export const KeyContactsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="pr-3">
          <FontAwesome5 name="arrow-left" size={18} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-gilroy-bold text-gray-900">Key contacts</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          {contacts.map(contact => (
            <View
              key={contact.label}
              className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                  <FontAwesome5 name={contact.icon as any} size={16} color="#F5840E" />
                </View>
                <Text className="text-sm font-gilroy-medium text-gray-800">{contact.label}</Text>
              </View>
              <Text className="text-base font-gilroy-bold text-primary">{contact.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
