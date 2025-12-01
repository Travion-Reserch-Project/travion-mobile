import React, { useState } from 'react';
import { View, Text, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { AlertCard, FilterTabs, EmptyState, Alert } from '../components/alerts';

const alertsData: Alert[] = [
  {
    id: '1',
    title: 'Galle Fort',
    description:
      'Be cautious of unofficial guides offering unsolicited tours. Stick to authorized vendors to avoid overpaying.',
    type: 'safety',
    severity: 'high',
    timestamp: '5 min ago',
    location: 'Galle Fort, Sri Lanka',
    isRead: false,
    dataSource: {
      reportedBy: 'Reported by 12 tourists',
      confidence: 'AI Prediction: 85% Confidence',
    },
  },
  {
    id: '2',
    title: 'Nuwara Eliya',
    description:
      'Heavy rainfall and thunderstorms expected in the hill country. Plan indoor activities and avoid hiking trails.',
    type: 'weather',
    severity: 'medium',
    timestamp: '2 hours ago',
    location: 'Nuwara Eliya, Central Province',
    isRead: false,
    dataSource: {
      reportedBy: 'Meteorological Department',
      confidence: 'Weather Station: 95% Accuracy',
    },
  },
  {
    id: '3',
    title: 'Kandy Train',
    description:
      'Delays expected on the Colombo to Kandy railway line due to signal maintenance work.',
    type: 'traffic',
    severity: 'medium',
    timestamp: 'Yesterday',
    location: 'Colombo-Kandy Railway',
    isRead: true,
    dataSource: {
      reportedBy: 'Sri Lanka Railways',
      confidence: 'Official Source: 100% Confirmed',
    },
  },
  {
    id: '4',
    title: 'Colombo Airport Security',
    description:
      'Enhanced security screening at Bandaranaike International Airport. Allow extra time for check-in.',
    type: 'security',
    severity: 'low',
    timestamp: '6 hours ago',
    location: 'Bandaranaike International Airport',
    isRead: true,
  },
  {
    id: '5',
    title: 'Dengue Prevention Alert',
    description:
      'Increased dengue cases reported in urban areas. Use mosquito repellent and avoid stagnant water.',
    type: 'health',
    severity: 'high',
    timestamp: '1 day ago',
    location: 'Colombo Metropolitan Area',
    isRead: false,
    dataSource: {
      reportedBy: 'Ministry of Health',
      confidence: 'Health Ministry: Official Advisory',
    },
  },
];

export const AlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>(alertsData);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  const getFilteredAlerts = () => {
    switch (filter) {
      case 'unread':
        return alerts.filter(alert => !alert.isRead);
      case 'critical':
        return alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high');
      default:
        return alerts;
    }
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev =>
      prev.map(alert => (alert.id === alertId ? { ...alert, isRead: true } : alert)),
    );
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
  };

  const unreadCount = alerts.filter(alert => !alert.isRead).length;
  const criticalCount = alerts.filter(
    alert => alert.severity === 'critical' || alert.severity === 'high',
  ).length;

  const alertCounts = {
    all: alerts.length,
    unread: unreadCount,
    critical: criticalCount,
  };

  const filteredAlerts = getFilteredAlerts();

  return (
    <View className="flex-1 ">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <Text className="text-2xl font-gilroy-bold text-gray-900">Alerts</Text>
        <Text className="text-sm font-gilroy-regular text-gray-600 mt-1">
          {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
        </Text>
      </View>

      {/* Filter Tabs */}
      <FilterTabs filter={filter} onFilterChange={setFilter} alertCounts={alertCounts} />

      {/* Alerts List */}
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-4">
          {filteredAlerts.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            filteredAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onToggleRead={markAsRead} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Quick Actions */}
      {unreadCount > 0 && (
        <View className="bg-white border-t border-gray-100 px-6 py-4">
          <TouchableOpacity
            className="bg-primary rounded-full py-3 items-center"
            onPress={markAllAsRead}
          >
            <Text className="text-white font-gilroy-bold text-base">Mark All as Read</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
