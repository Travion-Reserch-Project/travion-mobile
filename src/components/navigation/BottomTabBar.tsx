import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

export type TabKey = 'home' | 'transport' | 'guide' | 'safety' | 'weather';

interface TabItem {
  key: TabKey;
  label: string;
  icon: string;
  iconType?: 'solid' | 'regular';
}

interface BottomTabBarProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
}

const tabs: TabItem[] = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home',
    iconType: 'solid',
  },
  {
    key: 'transport',
    label: 'Transport',
    icon: 'bus',
    iconType: 'solid',
  },
  {
    key: 'guide',
    label: 'Guide',
    icon: 'compass',
    iconType: 'regular',
  },
  {
    key: 'safety',
    label: 'Safety',
    icon: 'shield-alt',
    iconType: 'solid',
  },
  {
    key: 'weather',
    label: 'Weather',
    icon: 'cloud-sun',
    iconType: 'solid',
  },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabPress }) => {
  return (
    <View className="flex-row bg-white border-t border-gray-200 px-4 py-2">
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            className={`flex-1 items-center py-2 ${isActive ? 'transform scale-105' : ''}`}
            onPress={() => onTabPress(tab.key)}
          >
            <View className="items-center">
              <FontAwesome5
                name={tab.icon}
                size={20}
                color={isActive ? '#F5840E' : '#6B7280'}
                solid={tab.iconType === 'solid'}
              />
              <Text
                className={`text-xs font-gilroy-medium mt-1 ${
                  isActive ? 'text-primary font-bold' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
