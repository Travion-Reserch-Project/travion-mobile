import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainNavigator';

const ISSUE_TYPES = [
  { id: 'block', label: 'Road block', icon: 'ban' },
  { id: 'damage', label: 'Road damage', icon: 'road' },
  { id: 'accident', label: 'Accident', icon: 'car-crash' },
  { id: 'debris', label: 'Debris', icon: 'exclamation-triangle' },
  { id: 'flood', label: 'Flooding', icon: 'water' },
  { id: 'other', label: 'Other', icon: 'question-circle' },
];

export const RoadIssueReportScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [issueType, setIssueType] = useState<string>('block');
  const [location, setLocation] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = () => {
    if (!location.trim() || !details.trim()) {
      Alert.alert('Missing info', 'Please add a location and short description.');
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
          <FontAwesome5 name="check" size={28} color="#F5840E" />
        </View>
        <Text className="text-xl font-gilroy-bold text-gray-900 mb-2">Thanks for reporting</Text>
        <Text className="text-sm font-gilroy-regular text-gray-600 text-center mb-6">
          Your report helps others reroute. We will surface it on the incident map.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-primary rounded-xl px-5 py-3"
          activeOpacity={0.9}
        >
          <Text className="text-white font-gilroy-bold text-sm">Back to transport</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="pr-3">
          <FontAwesome5 name="arrow-left" size={18} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-gilroy-bold text-gray-900">Report road issue</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="mb-5">
          <Text className="text-sm font-gilroy-bold text-gray-900 mb-3">Issue type</Text>
          <View className="flex-row flex-wrap -mx-1">
            {ISSUE_TYPES.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setIssueType(item.id)}
                className="px-3 py-2 m-1 rounded-full border flex-row items-center"
                activeOpacity={0.9}
                style={{
                  backgroundColor: issueType === item.id ? '#F5840E' : '#FFFFFF',
                  borderColor: issueType === item.id ? '#F5840E' : '#E5E7EB',
                }}
              >
                <FontAwesome5
                  name={item.icon as any}
                  size={12}
                  color={issueType === item.id ? '#FFFFFF' : '#4B5563'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  className="text-xs font-gilroy-medium"
                  style={{ color: issueType === item.id ? '#FFFFFF' : '#374151' }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-5">
          <Text className="text-sm font-gilroy-bold text-gray-900 mb-2">Location</Text>
          <View className="bg-white rounded-xl border border-gray-200 px-3 py-2">
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Galle Road near Kollupitiya signal"
              placeholderTextColor="#9CA3AF"
              className="text-sm font-gilroy-regular text-gray-900"
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-gilroy-bold text-gray-900 mb-2">Details</Text>
          <View className="bg-white rounded-xl border border-gray-200 px-3 py-2">
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Short description (lanes blocked, debris, police on site, etc.)"
              placeholderTextColor="#9CA3AF"
              className="text-sm font-gilroy-regular text-gray-900"
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          className="bg-primary rounded-xl py-4 items-center"
          activeOpacity={0.9}
        >
          <Text className="text-white font-gilroy-bold text-sm">Submit report</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
