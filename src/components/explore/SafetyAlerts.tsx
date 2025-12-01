import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

interface SafetyAlert {
  id: string;
  title: string;
  description: string;
  level: 'low' | 'medium' | 'high';
  location: string;
}

interface SafetyAlertsProps {
  alerts?: SafetyAlert[];
}

const defaultAlerts: SafetyAlert[] = [
  {
    id: '1',
    title: 'Current Risk Level: Medium',
    description: 'Pickpocketing risk increases at this hour.',
    level: 'medium',
    location: 'Colombo, Sri Lanka',
  },
];

export const SafetyAlerts: React.FC<SafetyAlertsProps> = ({ alerts = defaultAlerts }) => {
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#DC2626';
      case 'medium':
        return '#F97316';
      case 'low':
        return '#16A34A';
      default:
        return '#6B7280';
    }
  };

  return (
    <View className="px-6">
      {/* Location Status */}
      <View className="flex-row items-center mb-6">
        <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
        <Text className="text-base font-gilroy-medium text-gray-700">
          Colombo, Sri Lanka • Live
        </Text>
      </View>

      {/* Risk Alert Card */}
      {alerts.map(alert => (
        <View
          key={alert.id}
          className="rounded-2xl p-6 mb-6"
          style={{ backgroundColor: getRiskLevelColor(alert.level) }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-xl font-gilroy-bold text-white mb-2">{alert.title}</Text>
              <Text className="text-base font-gilroy-regular text-white/90">
                {alert.description}
              </Text>
            </View>
            <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center ml-4">
              <FontAwesome5 name="shield-alt" size={20} color="white" />
            </View>
          </View>
        </View>
      ))}

      {/* Live Map Preview */}
      <View className="bg-white rounded-2xl overflow-hidden mb-6 shadow-sm">
        {/* Map Placeholder - In real app, this would be an actual map */}
        <View className="h-48 bg-blue-100 items-center justify-center">
          <View className="absolute inset-0 bg-gradient-to-b from-blue-200 to-blue-300" />
          {/* Map markers */}
          <View className="absolute top-12 left-16">
            <View className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white" />
          </View>
          <View className="absolute bottom-16 right-20">
            <View className="w-6 h-6 bg-red-500 rounded-full border-2 border-white" />
          </View>
          <View className="absolute top-20 right-12">
            <View className="w-6 h-6 bg-green-500 rounded-full border-2 border-white" />
          </View>

          {/* Location label */}
          <View className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full">
            <Text className="text-sm font-gilroy-bold text-gray-900">Colombo</Text>
          </View>
        </View>

        <View className="p-4">
          <Text className="text-lg font-gilroy-bold text-gray-900 mb-1">Live Map Preview</Text>
          <Text className="text-sm font-gilroy-regular text-gray-600">Tap to view full map</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="mb-6">
        <Text className="text-lg font-gilroy-bold text-gray-900 mb-4">Quick Actions</Text>
        <View className="flex-row justify-between">
          {[
            { icon: 'exclamation-triangle', label: 'Report Incident', color: '#F97316' },
            { icon: 'bell', label: 'View Alerts', color: '#F97316' },
            { icon: 'shield-alt', label: 'Police Help', color: '#F97316' },
          ].map((action, index) => (
            <TouchableOpacity key={index} className="flex-1 items-center mx-2">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: `${action.color}20` }}
              >
                <FontAwesome5 name={action.icon} size={20} color={action.color} />
              </View>
              <Text className="text-sm font-gilroy-medium text-gray-700 text-center">
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};
