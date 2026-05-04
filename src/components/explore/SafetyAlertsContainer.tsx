import React, { useState, useEffect, useCallback } from 'react';
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

//These are callbacks from parent component to handle user interactions with the safety alerts (e.g., viewing full map, reporting incidents, etc.)
interface SafetyAlertsContainerProps {
  onViewFullMap?: () => void;
  onReportIncident?: () => void;
  onPoliceHelp?: () => void;
  onViewAlerts?: () => void;
  onAlertSelected?: (alert: SafetyAlert) => void;
}

//Functional component with props 
export const SafetyAlertsContainer: React.FC<SafetyAlertsContainerProps> = ({
  onViewFullMap,
  onReportIncident,
  onPoliceHelp,
  onViewAlerts,
  onAlertSelected,
}) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null); //Stores user GPS location
  const [locationError, setLocationError] = useState<string | null>(null); //Stores error if location fails
  const [fetchingLocation, setFetchingLocation] = useState(true); //Tracks loading state for location fetching

  // Fetch safety alerts based on location
  const { alerts, loading, error } = useQuickSafetyAlerts(
    userLocation?.lat || 0, //If location is null → send 0 to trigger error handling in hook and show fallback alert
    userLocation?.lon || 0,
  );

  //Request location permission and get current position
  const requestLocationPermission = useCallback(async () => { //useCallback → prevents unnecessary re-creation of the function on every render, optimizing performance
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

      const position = await getCurrentPosition({ //Get location
        timeout: 15000,
        enableHighAccuracy: false,
        retryAttempts: 1,
      });
      const { latitude, longitude } = position;
      setUserLocation({ lat: latitude, lon: longitude }); //Store location in state to trigger safety alert fetching
      setFetchingLocation(false);
    } catch (error) {
      console.error('Permission error:', error);
      setLocationError('Permission error');
      setFetchingLocation(false);
    }
  }, []);

  // Request location permissions and get current location (Runs when component loads)
  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

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
