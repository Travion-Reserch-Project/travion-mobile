import React, { useState } from 'react';
import { View, Text, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { SafetyAlerts, HealthTips, Activities } from '../components/explore';

type TabType = 'activities' | 'health' | 'safety';

export const ExploreScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('activities');

  const renderContent = () => {
    switch (activeTab) {
      case 'activities':
        return <Activities />;
      case 'health':
        return <HealthTips />;
      case 'safety':
        return <SafetyAlerts />;
      default:
        return <Activities />;
    }
  };

  return (
    <View className="flex-1">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <Text className="text-2xl font-gilroy-bold text-gray-900">Explore</Text>
        <Text className="text-sm font-gilroy-regular text-gray-600 mt-1">
          Discover activities, tips, and stay safe
        </Text>
      </View>

      {/* Tab Navigation */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-4">
            {[
              { key: 'activities', label: 'Activities', icon: 'compass' },
              { key: 'safety', label: 'Safety Alerts', icon: 'shield-alt' },
              { key: 'health', label: 'Health Tips', icon: 'heart' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                className={`flex-row items-center px-4 py-3 rounded-full ${
                  activeTab === tab.key ? 'bg-primary' : 'bg-gray-100'
                }`}
                onPress={() => setActiveTab(tab.key as TabType)}
              >
                <FontAwesome5
                  name={tab.icon}
                  size={14}
                  color={activeTab === tab.key ? 'white' : '#6B7280'}
                />
                <Text
                  className={`text-sm font-gilroy-medium ml-2 ${
                    activeTab === tab.key ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="py-6">{renderContent()}</View>
      </ScrollView>
    </View>
  );
};
