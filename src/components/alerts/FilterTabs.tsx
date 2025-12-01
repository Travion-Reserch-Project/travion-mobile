import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface FilterTabsProps {
  filter: 'all' | 'unread' | 'critical';
  onFilterChange: (filter: 'all' | 'unread' | 'critical') => void;
  alertCounts: {
    all: number;
    unread: number;
    critical: number;
  };
}

export const FilterTabs: React.FC<FilterTabsProps> = ({ filter, onFilterChange, alertCounts }) => {
  const tabs = [
    { key: 'all' as const, label: 'All Alerts', count: alertCounts.all },
    { key: 'unread' as const, label: 'Unread', count: alertCounts.unread },
    { key: 'critical' as const, label: 'Critical', count: alertCounts.critical },
  ];

  return (
    <View className="bg-white px-6 py-4 border-b border-gray-200">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row space-x-4">
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              className={`flex-row items-center px-4 py-2 rounded-full ${
                filter === tab.key ? 'bg-primary' : 'bg-gray-100'
              }`}
              onPress={() => onFilterChange(tab.key)}
            >
              <Text
                className={`text-sm font-gilroy-medium ${
                  filter === tab.key ? 'text-white' : 'text-gray-700'
                }`}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View
                  className={`ml-2 px-2 py-1 rounded-full ${
                    filter === tab.key ? 'bg-white/20' : 'bg-primary'
                  }`}
                >
                  <Text
                    className={`text-xs font-gilroy-bold ${
                      filter === tab.key ? 'text-white' : 'text-white'
                    }`}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
