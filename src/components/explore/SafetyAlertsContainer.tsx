import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafetyAlerts, SafetyAlert } from './SafetyAlerts';
import { useQuickSafetyAlerts } from '../../hooks/useSafetyAlerts';
import { getCurrentPosition } from '@utils/geolocation';

interface SafetyAlertsContainerProps {
  onViewFullMap?: () => void;
  onReportIncident?: () => void;
  onPoliceHelp?: () => void;
  onViewAlerts?: () => void;
  onAlertSelected?: (alert: SafetyAlert) => void;
}

export const SafetyAlertsContainer: React.FC<SafetyAlertsContainerProps> = ({
  onViewFullMap,
  onReportIncident,
  onPoliceHelp,
  onViewAlerts,
  onAlertSelected,
}) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(true);

  // Fetch safety alerts based on location
  const { alerts, loading, error } = useQuickSafetyAlerts(
    userLocation?.lat || 0,
    userLocation?.lon || 0,
  );

  // Request location permissions and get current location
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Travion needs access to your location for safety alerts.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setLocationError('Location permission denied');
            setFetchingLocation(false);
            return;
          }
        }

        const position = await getCurrentPosition({
          timeout: 15000,
          enableHighAccuracy: true,
          retryAttempts: 2,
        });
        const { latitude, longitude } = position;
        setUserLocation({ lat: latitude, lon: longitude });
        setFetchingLocation(false);
      } catch (error) {
        console.error('Permission error:', error);
        setLocationError('Permission error');
        setFetchingLocation(false);
      }
    };

    requestLocationPermission();
  }, []);

  // Show loading state while fetching location or alerts
  if (fetchingLocation || (loading && !alerts.length)) {
    return (
      <View className="px-6 py-12 items-center">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="text-sm text-gray-600 mt-4 font-gilroy-medium">
          {fetchingLocation ? 'Getting your location...' : 'Fetching safety predictions...'}
        </Text>
      </View>
    );
  }

  // Show error state if location couldn't be retrieved
  if (locationError && !userLocation) {
    return (
      <View className="px-6 py-12 items-center">
        <Text className="text-lg font-gilroy-bold text-gray-900 mb-2">Location Required</Text>
        <Text className="text-sm text-gray-600 text-center mb-4 font-gilroy-regular">
          Please enable location permissions to view safety alerts for your area.
        </Text>
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-full"
          onPress={() => {
            setFetchingLocation(true);
            setLocationError(null);
            // Re-trigger permission request
            requestLocationPermission();
          }}
        >
          <Text className="text-white font-gilroy-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationError('Location permission denied');
          setFetchingLocation(false);
          return;
        }
      }

      const position = await getCurrentPosition({
        timeout: 15000,
        enableHighAccuracy: true,
        retryAttempts: 2,
      });
      const { latitude, longitude } = position;
      setUserLocation({ lat: latitude, lon: longitude });
      setFetchingLocation(false);
    } catch (error) {
      console.error('Permission error:', error);
      setLocationError('Permission error');
      setFetchingLocation(false);
    }
  };

  return (
    <>
      {error && (
        <View className="px-6 mb-4">
          <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <Text className="text-sm text-yellow-800 font-gilroy-medium">
              ⚠️ Using cached predictions. {error}
            </Text>
          </View>
        </View>
      )}
      <SafetyAlerts
        alerts={alerts}
        onViewFullMap={onViewFullMap}
        onReportIncident={onReportIncident}
        onPoliceHelp={onPoliceHelp}
        onViewAlerts={onViewAlerts}
        onAlertSelected={onAlertSelected}
      />
    </>
  );
};
