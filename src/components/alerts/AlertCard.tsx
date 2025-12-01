import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

export interface Alert {
  id: string;
  title: string;
  description: string;
  type: 'safety' | 'weather' | 'traffic' | 'health' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  location?: string;
  isRead: boolean;
  dataSource?: {
    reportedBy: string;
    confidence: string;
  };
}

interface AlertCardProps {
  alert: Alert;
  onToggleRead: (alertId: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onToggleRead }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rotateAnim] = useState(new Animated.Value(0));

  // const getAlertIcon = (type: Alert['type']) => {
  //   switch (type) {
  //     case 'safety':
  //       return 'shield-alt';
  //     case 'weather':
  //       return 'cloud-rain';
  //     case 'traffic':
  //       return 'car';
  //     case 'health':
  //       return 'heartbeat';
  //     case 'security':
  //       return 'lock';
  //     default:
  //       return 'exclamation-triangle';
  //   }
  // };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'low':
        return { dot: '#3B82F6', bg: '#EFF6FF' };
      case 'medium':
        return { dot: '#F97316', bg: '#FFF7ED' };
      case 'high':
        return { dot: '#EF4444', bg: '#FEF2F2' };
      case 'critical':
        return { dot: '#DC2626', bg: '#FEF2F2' };
      default:
        return { dot: '#6B7280', bg: '#F9FAFB' };
    }
  };

  const toggleExpansion = () => {
    const toValue = isExpanded ? 0 : 1;

    Animated.timing(rotateAnim, {
      toValue,
      duration: 200,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();

    setIsExpanded(!isExpanded);

    if (!alert.isRead && !isExpanded) {
      onToggleRead(alert.id);
    }
  };

  const rotateIcon = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const severityStyle = getSeverityColor(alert.severity);

  return (
    <View className="mb-3">
      <TouchableOpacity
        className="bg-white rounded-2xl px-4 py-4 shadow-sm"
        onPress={toggleExpansion}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {/* Severity Indicator Dot */}
            <View
              className="w-3 h-3 rounded-full mr-4"
              style={{ backgroundColor: severityStyle.dot }}
            />

            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-gilroy-bold text-gray-900 flex-1">
                  {alert.severity === 'high' || alert.severity === 'critical'
                    ? `${
                        alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)
                      } Scam Risk – ${alert.title}`
                    : alert.title}
                </Text>
                {!alert.isRead && <View className="w-2 h-2 bg-primary rounded-full ml-2" />}
              </View>

              <Text className="text-sm font-gilroy-regular text-gray-500 mt-1">
                {alert.timestamp}
              </Text>
            </View>
          </View>

          <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
            <FontAwesome5
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#6B7280"
            />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View className="bg-white mt-1 rounded-2xl px-4 py-4 shadow-sm">
          <Text className="text-sm font-gilroy-regular text-gray-700 leading-5 mb-4">
            {alert.description}
          </Text>

          {/* Data Source Section */}
          {alert.dataSource && (
            <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: severityStyle.bg }}>
              <Text className="text-sm font-gilroy-bold text-gray-900 mb-3">DATA SOURCE</Text>
              <View className="flex-row flex-wrap">
                <View className="flex-1 min-w-0 mr-2 mb-1">
                  <Text className="text-sm font-gilroy-medium text-gray-700" numberOfLines={2}>
                    {alert.dataSource.reportedBy}
                  </Text>
                </View>
                <View className="flex-1 min-w-0 ml-2 mb-1">
                  <Text className="text-sm font-gilroy-medium text-gray-700" numberOfLines={2}>
                    {alert.dataSource.confidence}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Location */}
          {alert.location && (
            <View className="flex-row items-center mb-4">
              <FontAwesome5 name="map-marker-alt" size={12} color="#6B7280" />
              <Text className="text-sm font-gilroy-medium text-gray-600 ml-2">
                {alert.location}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row space-x-3">
            <TouchableOpacity className="flex-1 bg-gray-100 rounded-full py-3 items-center">
              <Text className="text-sm font-gilroy-medium text-gray-700">View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-primary rounded-full py-3 items-center">
              <Text className="text-sm font-gilroy-medium text-white">Take Action</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};
