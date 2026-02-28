import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import { AlertCard, FilterTabs, EmptyState, Alert } from '../components/alerts';
import Geolocation from '@react-native-community/geolocation';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';

// Initialize geocoding with API key
RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY as string);

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
  {
    id: '3',
    title: 'Nuwara Eliya',
    description:
      'Heavy rainfall and thunderstorms expected in the hill country. Plan indoor activities and avoid hiking trails.',
    type: 'weather',
    severity: 'medium',
    timestamp: '2 hours ago',
    location: 'Nuwara Eliya, Central Province',
    district: 'Nuwara Eliya',
    isRead: false,
    reportCount: 5,
  },
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
    id: '5',
    title: 'Kandy Train',
    description:
      'Delays expected on the Colombo to Kandy railway line due to signal maintenance work.',
    type: 'traffic',
    severity: 'medium',
    timestamp: 'Yesterday',
    location: 'Colombo-Kandy Railway',
    district: 'Kandy',
    isRead: true,
    reportCount: 3,
  },
  {
    id: '6',
    title: 'Galle Weather Advisory',
    description:
      'Strong winds and intermittent showers expected along the southern coast. Carry rain gear and avoid rough seas.',
    type: 'weather',
    severity: 'medium',
    timestamp: '30 min ago',
    location: 'Galle, Southern Province',
    district: 'Galle',
    isRead: false,
    reportCount: 9,
  },
  {
    id: '7',
    title: 'Galle–Matara Bus Delay',
    description:
      'Traffic congestion causing delays on the coastal bus route. Expect extended travel times during peak hours.',
    type: 'traffic',
    severity: 'medium',
    timestamp: '45 min ago',
    location: 'Galle–Matara Coastal Road',
    district: 'Galle',
    isRead: false,
    reportCount: 7,
  },
];

export const AlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>(alertsData);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [userDistrict, setUserDistrict] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Get user's current location and extract district
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Travion needs access to your location to show relevant alerts.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setLocationLoading(false);
            return;
          }
        }

        Geolocation.getCurrentPosition(
          async position => {
            const { latitude, longitude } = position.coords;

            try {
              const results = await RNGeocoding.from(latitude, longitude);
              if (results && results.results && results.results.length > 0) {
                const address = results.results[0];
                const addressComponents = address.address_components;

                // Extract district from address components
                const districtComponent = addressComponents.find(
                  component =>
                    component.types.includes('administrative_area_level_2') ||
                    component.types.includes('locality'),
                );

                if (districtComponent) {
                  setUserDistrict(districtComponent.long_name);
                  console.log('User district:', districtComponent.long_name);
                }
              }
            } catch (err) {
              console.error('Geocoding error:', err);
            }

            setLocationLoading(false);
          },
          error => {
            console.log('Geolocation error:', error);
            setLocationLoading(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
      } catch (error) {
        console.error('Permission error:', error);
        setLocationLoading(false);
      }
    };

    getUserLocation();
  }, []);

  const allAlerts = alerts;

  const getFilteredAlerts = () => {
    let filtered = allAlerts;

    // Filter by user's district if available
    if (userDistrict) {
      filtered = filtered.filter(alert => alert.district === userDistrict);
    }

    // Apply additional filters
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

  const visibleAlerts = userDistrict
    ? allAlerts.filter(alert => alert.district === userDistrict)
    : allAlerts;

  const visibleUnreadCount = visibleAlerts.filter(alert => !alert.isRead).length;
  const visibleCriticalCount = visibleAlerts.filter(
    alert => alert.severity === 'critical' || alert.severity === 'high',
  ).length;

  const alertCounts = {
    all: visibleAlerts.length,
    unread: visibleUnreadCount,
    critical: visibleCriticalCount,
  };

  const filteredAlerts = getFilteredAlerts();

  return (
    <View className="flex-1 ">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <Text className="text-2xl font-gilroy-bold text-gray-900">Alerts</Text>
        <Text className="text-sm font-gilroy-regular text-gray-600 mt-1">
          {locationLoading
            ? 'Getting your location...'
            : userDistrict
            ? `Showing alerts for ${userDistrict} district`
            : visibleUnreadCount > 0
            ? `${visibleUnreadCount} unread notifications`
            : 'All caught up!'}
        </Text>
      </View>

      {/* Filter Tabs */}
      <FilterTabs filter={filter} onFilterChange={setFilter} alertCounts={alertCounts} />

      {/* Alerts List */}
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-4">
          {locationLoading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color="#F97316" />
              <Text className="text-sm text-gray-600 mt-4">Finding alerts near you...</Text>
            </View>
          ) : filteredAlerts.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            filteredAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onToggleRead={markAsRead} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Quick Actions */}
      {visibleUnreadCount > 0 && (
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
