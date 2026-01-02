import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export type TabKey = 'home' | 'transport' | 'guide' | 'safety' | 'weather';

interface TabItem {
  key: TabKey;
  label: string;
  icon: string;
  iconType?: 'solid' | 'regular';
  iconFamily?: 'fa5' | 'mci';
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
    iconFamily: 'fa5',
  },
  {
    key: 'safety',
    label: 'Safety',
    icon: 'shield-alt',
    iconType: 'solid',
    iconFamily: 'fa5',
  },
  {
    key: 'weather',
    label: 'Weather',
    icon: 'cloud-showers-heavy',
    iconType: 'solid',
    iconFamily: 'fa5',
  },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabPress }) => {
  const renderIcon = (tab: TabItem, isActive: boolean) => {
    const color = isActive ? '#F5840E' : '#6B7280';

    if (tab.iconFamily === 'mci') {
      return <MaterialCommunityIcons name={tab.icon} size={22} color={color} />;
    }

    return (
      <FontAwesome5
        name={tab.icon}
        size={20}
        color={color}
        solid={tab.iconType === 'solid'}
      />
    );
  };

  return (
    <View className="flex-row bg-white border-t border-gray-200 px-2 py-2 shadow-lg">
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            className={`flex-1 items-center py-2 ${isActive ? 'transform scale-105' : ''}`}
            onPress={() => onTabPress(tab.key)}
          >
            <View className="items-center">
              {renderIcon(tab, isActive)}
              <Text
                className={`text-xs font-gilroy-medium mt-1 ${isActive ? 'text-primary font-bold' : 'text-gray-500'
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
