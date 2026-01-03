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
    district: 'Galle',
    isRead: false,
    reportCount: 12,
  },
  {
    id: '2',
    title: 'Unawatuna Beach',
    description:
      'Scam artists posing as tour operators. Always verify credentials before booking any tours.',
    type: 'safety',
    severity: 'high',
    timestamp: '1 hour ago',
    location: 'Unawatuna, Galle',
    district: 'Galle',
    isRead: false,
    reportCount: 8,
  },
  // {
  //   id: '3',
  //   title: 'Nuwara Eliya',
  //   description:
  //     'Heavy rainfall and thunderstorms expected in the hill country. Plan indoor activities and avoid hiking trails.',
  //   type: 'weather',
  //   severity: 'medium',
  //   timestamp: '2 hours ago',
  //   location: 'Nuwara Eliya, Central Province',
  //   district: 'Nuwara Eliya',
  //   isRead: false,
  //   reportCount: 5,
  // },
  {
    id: '4',
    title: 'Hikkaduwa Scam Alert',
    description:
      'Multiple reports of overcharging at certain restaurants. Check prices before ordering.',
    type: 'safety',
    severity: 'medium',
    timestamp: '3 hours ago',
    location: 'Hikkaduwa, Galle',
    district: 'Galle',
    isRead: true,
    reportCount: 15,
  },
  {
    id: '8',
    title: 'Bentota Beach Harassment',
    description:
      'Reports of harassment from aggressive vendors and touts. Stay alert and firmly decline unwanted services.',
    type: 'safety',
    severity: 'high',
    timestamp: '30 min ago',
    location: 'Bentota Beach, Sri Lanka',
    district: 'Galle',
    isRead: false,
    reportCount: 6,
  },
  {
    id: '9',
    title: 'Colombo Fort Pickpocket Alert',
    description:
      'Increased pickpocketing incidents in crowded areas. Keep valuables secure and be aware of your surroundings.',
    type: 'safety',
    severity: 'high',
    timestamp: '15 min ago',
    location: 'Colombo Fort, Sri Lanka',
    district: 'Colombo',
    isRead: false,
    reportCount: 10,
  },
  // {
  //   id: '5',
  //   title: 'Kandy Train',
  //   description:
  //     'Delays expected on the Colombo to Kandy railway line due to signal maintenance work.',
  //   type: 'traffic',
  //   severity: 'medium',
  //   timestamp: 'Yesterday',
  //   location: 'Colombo-Kandy Railway',
  //   district: 'Kandy',
  //   isRead: true,
  //   reportCount: 3,
  // },
  // {
  //   id: '6',
  //   title: 'Galle Weather Advisory',
  //   description:
  //     'Strong winds and intermittent showers expected along the southern coast. Carry rain gear and avoid rough seas.',
  //   type: 'weather',
  //   severity: 'medium',
  //   timestamp: '30 min ago',
  //   location: 'Galle, Southern Province',
  //   district: 'Galle',
  //   isRead: false,
  //   reportCount: 9,
  // },
  // {
  //   id: '7',
  //   title: 'Galle–Matara Bus Delay',
  //   description:
  //     'Traffic congestion causing delays on the coastal bus route. Expect extended travel times during peak hours.',
  //   type: 'traffic',
  //   severity: 'medium',
  //   timestamp: '45 min ago',
  //   location: 'Galle–Matara Coastal Road',
  //   district: 'Galle',
  //   isRead: false,
  //   reportCount: 7,
  // },
];

export const AlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>(alertsData);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  const getFilteredAlerts = () => {
    let filtered = alerts;

    // Apply filters
    switch (filter) {
      case 'unread':
        return filtered.filter(alert => !alert.isRead);
      case 'critical':
        return filtered.filter(alert => alert.severity === 'critical' || alert.severity === 'high');
      default:
        return filtered;
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
