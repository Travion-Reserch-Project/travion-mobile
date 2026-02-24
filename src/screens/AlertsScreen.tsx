import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Geolocation from '@react-native-community/geolocation';
import { AlertCard, FilterTabs, EmptyState, Alert } from '../components/alerts';
import SafetyService, { SafetyAlert } from '@services/api/SafetyService';

/**
 * Transform SafetyAlert from backend to Alert format for UI
 */
const transformSafetyAlertToAlert = (safetyAlert: SafetyAlert): Alert => {
  // Extract timestamp from title (e.g., "Reported 2 hours ago" -> "2 hours ago")
  const timestamp = safetyAlert.title.replace('Reported ', '');

  return {
    id: safetyAlert.id,
    title: safetyAlert.title,
    description: safetyAlert.description,
    type: 'safety',
    severity: safetyAlert.level,
    timestamp: timestamp || 'Recently',
    location: safetyAlert.location,
    district: safetyAlert.location.split(',')[0], // Extract first part as district
    isRead: false,
    reportCount: 1,
    incidentType: safetyAlert.incidentType, // Pass through the actual incident type
  };
};

export const AlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  /**
   * Request location permission and get current position
   */
  const requestLocationAndFetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Travion needs access to your location to show nearby incidents.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission denied');
          setError('Location permission is required to view nearby incidents');
          setLoading(false);
          return;
        }
      }

      // Get current position
      Geolocation.getCurrentPosition(
        async position => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });

          console.log('[AlertsScreen] Fetching incidents for location:', latitude, longitude);

          // Fetch nearby incidents from backend
          const incidents = await SafetyService.getNearbyIncidents(latitude, longitude, 10, 30);

          console.log('[AlertsScreen] Received incidents:', incidents.length);

          // Transform to Alert format
          const transformedAlerts = incidents.map(transformSafetyAlertToAlert);

          setAlerts(transformedAlerts);
          setLoading(false);
        },
        locationError => {
          console.error('[AlertsScreen] Geolocation error:', locationError);
          setError('Failed to get your location. Please check your GPS settings.');
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch (err) {
      console.error('[AlertsScreen] Error:', err);
      const errorMessage = (err as Error).message || 'Failed to fetch nearby incidents';

      // Check if it's an authentication error
      if (
        errorMessage.includes('Authentication required') ||
        errorMessage.includes('Authentication expired')
      ) {
        setError('Please log in to view nearby incidents');
      } else {
        setError(errorMessage);
      }
      setLoading(false);
    }
  };

  // Fetch incidents on mount
  useEffect(() => {
    requestLocationAndFetchIncidents();
  }, []);

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

  // Show loading state
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <Text className="text-2xl font-gilroy-bold text-gray-900">Alerts</Text>
          <Text className="text-sm font-gilroy-regular text-gray-600 mt-1">
            Loading nearby incidents...
          </Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0066CC" />
          <Text className="text-gray-600 font-gilroy-medium mt-4">
            Fetching nearby safety alerts
          </Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <Text className="text-2xl font-gilroy-bold text-gray-900">Alerts</Text>
          <Text className="text-sm font-gilroy-regular text-gray-600 mt-1">Error loading data</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <FontAwesome5 name="exclamation-circle" size={64} color="#EF4444" />
          <Text className="text-lg font-gilroy-bold text-gray-900 mt-6 text-center">{error}</Text>
          <TouchableOpacity
            onPress={requestLocationAndFetchIncidents}
            className="bg-primary rounded-full px-6 py-3 mt-6"
            activeOpacity={0.7}
          >
            <Text className="text-white font-gilroy-bold text-base">Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 ">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-gilroy-bold text-gray-900">Alerts</Text>
            <Text className="text-sm font-gilroy-regular text-gray-600 mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread notifications`
                : alerts.length > 0
                ? 'All caught up!'
                : 'No nearby incidents reported'}
            </Text>
          </View>
          {/* Refresh Button */}
          <TouchableOpacity
            onPress={requestLocationAndFetchIncidents}
            className="bg-gray-100 rounded-full p-3"
            activeOpacity={0.7}
          >
            <FontAwesome5 name="sync-alt" size={18} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <FilterTabs filter={filter} onFilterChange={setFilter} alertCounts={alertCounts} />

      {/* Alerts List */}
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-4">
          {filteredAlerts.length === 0 ? (
            alerts.length === 0 && filter === 'all' ? (
              // No incidents found nearby
              <View className="items-center justify-center py-12">
                <FontAwesome5 name="shield-alt" size={64} color="#D1D5DB" />
                <Text className="text-lg font-gilroy-bold text-gray-900 mt-6">
                  No Incidents Nearby
                </Text>
                <Text className="text-sm font-gilroy-regular text-gray-600 text-center mt-2 px-8">
                  Great news! No safety incidents have been reported in your area recently.
                </Text>
              </View>
            ) : (
              <EmptyState filter={filter} />
            )
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
