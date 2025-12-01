import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

interface EmptyStateProps {
  filter: 'all' | 'unread' | 'critical';
}

export const EmptyState: React.FC<EmptyStateProps> = ({ filter }) => {
  const getEmptyStateContent = () => {
    switch (filter) {
      case 'unread':
        return {
          icon: 'check-circle',
          title: "You're all caught up!",
          description: 'No unread alerts at the moment. Stay tuned for updates.',
        };
      case 'critical':
        return {
          icon: 'shield-alt',
          title: 'No critical alerts',
          description: 'All clear! No critical alerts requiring immediate attention.',
        };
      default:
        return {
          icon: 'bell-slash',
          title: 'No alerts found',
          description: 'No alerts match your current filter. Check back later.',
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <View className="items-center justify-center py-16 px-8">
      <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
        <FontAwesome5 name={content.icon} size={24} color="#9CA3AF" />
      </View>
      <Text className="text-lg font-gilroy-bold text-gray-900 mb-2 text-center">
        {content.title}
      </Text>
      <Text className="text-sm font-gilroy-regular text-gray-500 text-center leading-5">
        {content.description}
      </Text>

      <TouchableOpacity className="mt-6 bg-primary/10 px-6 py-3 rounded-full">
        <Text className="text-sm font-gilroy-medium text-primary">Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};
