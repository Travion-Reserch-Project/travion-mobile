import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';
import { useNavigation } from '@react-navigation/native';
import type { SafetyAlert } from '../components/explore/SafetyAlerts';
import { getCurrentPosition } from '@utils/geolocation';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface RiskCircle {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  level: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

interface MapScreenProps {
  route?: { params?: { alerts?: SafetyAlert[]; selectedAlert?: SafetyAlert } };
}

const DEFAULT_REGION = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const HEADER_HEIGHT = 78;

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

const getRiskRadius = (level: string) => {
  switch (level) {
    case 'high':
      return 300; // 300m radius for high risk
    case 'medium':
      return 200; // 200m radius for medium risk
    case 'low':
      return 200; // 100m radius for low risk
    default:
      return 150;
  }
};

const getHighestRiskLevel = (alertsList: SafetyAlert[]): 'high' | 'medium' | 'low' => {
  if (alertsList.some(a => a.level === 'high')) return 'high';
  if (alertsList.some(a => a.level === 'medium')) return 'medium';
  return 'low';
};

// Sample alerts for demo - showing all 7 risk types for safe area display
const sampleAlerts: SafetyAlert[] = [
  {
    id: '1',
    title: 'Pickpocketing',
    description: 'Pickpocketing risk increases at this hour.',
    level: 'low',
    location: 'Colombo City Center',
    incidentType: 'Pickpocket',
  },
  {
    id: '2',
    title: 'Scam',
    description: 'Scam activities reported in this area.',
    level: 'low',
    location: 'Colombo City Center',
    incidentType: 'Scam',
  },
  {
    id: '3',
    title: 'Harassment',
    description: 'Harassment incidents reported nearby.',
    level: 'low',
    location: 'Colombo City Center',
    incidentType: 'Harassment',
  },
  {
    id: '4',
    title: 'Money Theft',
    description: 'Money theft incidents in this location.',
    level: 'low',
    location: 'Colombo City Center',
    incidentType: 'Money Theft',
  },
  {
    id: '5',
    title: 'Theft',
    description: 'Theft incidents in this location.',
    level: 'low',
    location: 'Colombo City Center',
    incidentType: 'Theft',
  },
  {
    id: '6',
    title: 'Bag Snatching',
    description: 'Bag snatching incidents reported.',
    level: 'low',
    location: 'Colombo City Center',
    incidentType: 'Bag Snatching',
  },
  {
    id: '7',
    title: 'Extortion',
    description: 'Extortion incidents in this location.',
    level: 'low',
    location: 'Colombo City Center',
    incidentType: 'Extortion',
  },
];

export const MapScreen: React.FC<MapScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const alerts =
    route?.params?.alerts && route.params.alerts.length > 0 ? route.params.alerts : sampleAlerts;
  const selectedAlert = route?.params?.selectedAlert;

  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [locationName, setLocationName] = useState<string>('Current Location');
  const [locationLoading, setLocationLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [showRiskCircle, setShowRiskCircle] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Determine which risk level to display
  // If selectedAlert is provided, use its level; otherwise use the highest risk
  const displayRiskLevel = selectedAlert ? selectedAlert.level : getHighestRiskLevel(alerts);

  // Single risk circle at user location
  const riskCircle: RiskCircle | null = userLocation
    ? {
        id: 'user-location-risk',
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: getRiskRadius(displayRiskLevel),
        level: displayRiskLevel,
        title: 'Risk Area',
        description: `Risk level: ${displayRiskLevel}`,
      }
    : null;

  // Sort alerts by risk level (high > medium > low)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.level] - riskOrder[b.level];
  });

  // For safe areas, show all 7 incident types
  const displayAlerts =
    displayRiskLevel === 'low'
      ? [
          { id: '1', incidentType: 'Scam' as const, level: 'low' as const },
          { id: '2', incidentType: 'Pickpocket' as const, level: 'low' as const },
          { id: '3', incidentType: 'Theft' as const, level: 'low' as const },
          { id: '4', incidentType: 'Money Theft' as const, level: 'low' as const },
          { id: '5', incidentType: 'Harassment' as const, level: 'low' as const },
          { id: '6', incidentType: 'Bag Snatching' as const, level: 'low' as const },
          { id: '7', incidentType: 'Extortion' as const, level: 'low' as const },
        ]
      : sortedAlerts;

  // Get current location
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        // Initialize geocoding with proper error handling
        if (Config.GOOGLE_MAPS_API_KEY && Config.GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY') {
          try {
            RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY as string);
          } catch (error) {
            console.warn('Failed to initialize RNGeocoding:', error);
          }
        } else {
          console.warn('Google Maps API Key not properly configured');
        }

        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Travion needs access to your location for full map view.',
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

        const position = await getCurrentPosition({
          timeout: 15000,
          enableHighAccuracy: true,
          retryAttempts: 2,
        });
        const { latitude, longitude } = position;
        const newLocation = { latitude, longitude };
        setUserLocation(newLocation);

        // Set map region to user location with appropriate zoom based on risk circle
        const radius = getRiskRadius(displayRiskLevel);
        const paddingFactor = 6.0;
        const degreesPerMeter = 0.00001;
        const delta = radius * degreesPerMeter * paddingFactor;

        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        });

        // Reverse geocode to get location name
        try {
          const results = await RNGeocoding.from(latitude, longitude);
          if (results && results.results && results.results.length > 0) {
            const address = results.results[0];
            const locationString = address.formatted_address || 'Current Location';
            // Extract location names, removing postal codes
            const parts = locationString.split(',').map(p => p.trim());
            // Filter and clean location parts
            const locationParts = parts
              .map(p => {
                // Remove trailing digits and spaces (postal codes like "Galle 80000" -> "Galle")
                return p.replace(/\s*\d+\s*$/, '').trim();
              })
              .filter(p => {
                // Skip if part is only digits (pure postal code like "94102")
                if (/^\d+$/.test(p)) return false;
                // Skip if part is only 2 chars (state codes like "CA", "NY")
                if (/^[A-Z]{2}$/.test(p)) return false;
                // Skip empty strings
                if (p === '') return false;
                return true;
              });

            // Get at least 2 location names
            let displayName = 'Current Location';
            if (locationParts.length >= 2) {
              displayName = `${locationParts[0]}, ${locationParts[1]}`;
            } else if (locationParts.length === 1) {
              displayName = locationParts[0];
            }

            setLocationName(displayName);
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
        }

        setLocationLoading(false);
      } catch (error) {
        console.error('Permission error:', error);
        setLocationLoading(false);
      }
    };

    requestLocationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCirclePress = () => {
    // Toggle show risk circle state to display tooltip
    setShowRiskCircle(true);
  };

  const handleZoomIn = () => {
    if (mapRef.current && mapRegion) {
      mapRef.current.animateToRegion({
        ...mapRegion,
        latitudeDelta: mapRegion.latitudeDelta / 2,
        longitudeDelta: mapRegion.longitudeDelta / 2,
      });
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current && mapRegion) {
      mapRef.current.animateToRegion({
        ...mapRegion,
        latitudeDelta: mapRegion.latitudeDelta * 2,
        longitudeDelta: mapRegion.longitudeDelta * 2,
      });
    }
  };

  const handleCenterLocation = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Modern floating header */}
      <View
        className="absolute left-0 right-0 top-0"
        style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderBottomLeftRadius: 26,
          borderBottomRightRadius: 26,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <View className="flex-row items-center px-5 py-4">
          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-white/60 rounded-full p-2 mr-3"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <FontAwesome5 name="arrow-left" size={16} color="#111827" />
          </TouchableOpacity>

          {/* Centered title */}
          <View className="flex-1 items-center">
            <Text className="text-xl font-gilroy-bold text-gray-900 tracking-tight">
              Live Safety Map
            </Text>

            <Text className="text-xs font-gilroy-medium text-gray-700 mt-1">{locationName}</Text>
          </View>

          {/* Placeholder for symmetry */}
          <View className="w-6" />
        </View>
      </View>

      {/* Map Container */}
      {locationLoading ? (
        <View className="flex-1 items-center justify-center bg-gray-50">
          <ActivityIndicator size="large" color="#F97316" />
          <Text className="text-sm text-gray-600 mt-4">Loading map...</Text>
        </View>
      ) : (
        <>
          <View className="flex-1 relative" style={{ marginTop: HEADER_HEIGHT }}>
            <MapView
              ref={mapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={mapRegion}
              className="flex-1"
            >
              {/* Render single risk circle at user location */}
              {riskCircle && (
                <View key={riskCircle.id}>
                  <Circle
                    center={{
                      latitude: riskCircle.latitude,
                      longitude: riskCircle.longitude,
                    }}
                    radius={riskCircle.radius}
                    fillColor={`${getRiskLevelColor(riskCircle.level)}40`}
                    strokeColor={getRiskLevelColor(riskCircle.level)}
                    strokeWidth={2}
                  />
                  {/* Marker at circle center for tapping */}
                  <Marker
                    coordinate={{
                      latitude: riskCircle.latitude,
                      longitude: riskCircle.longitude,
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    onPress={handleCirclePress}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: getRiskLevelColor(riskCircle.level),
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        elevation: 5,
                      }}
                    />
                  </Marker>
                </View>
              )}

              {/* User location marker */}
              {userLocation && (
                <Marker
                  coordinate={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  title={locationName}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#4285F4',
                      borderWidth: 3,
                      borderColor: '#FFFFFF',
                      shadowColor: '#000',
                      shadowOpacity: 0.3,
                      shadowRadius: 3,
                      elevation: 5,
                    }}
                  />
                </Marker>
              )}
            </MapView>

            {/* Control Buttons - Right Side */}
            <View className="absolute right-4 top-1/3 gap-3">
              {/* Zoom In */}
              <TouchableOpacity
                onPress={handleZoomIn}
                className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md border border-gray-200"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <FontAwesome5 name="plus" size={16} color="#374151" />
              </TouchableOpacity>

              {/* Zoom Out */}
              <TouchableOpacity
                onPress={handleZoomOut}
                className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md border border-gray-200"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <FontAwesome5 name="minus" size={16} color="#374151" />
              </TouchableOpacity>

              {/* Center Location */}
              <TouchableOpacity
                onPress={handleCenterLocation}
                className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md border border-gray-200"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <FontAwesome5 name="location-arrow" size={14} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Risk Info Panel - Positioned above circle with arrow */}
          {showRiskCircle && riskCircle && (
            <View className="absolute top-36 left-12 right-12 items-center">
              {/* Tooltip Card */}
              <View
                className="rounded-2xl p-4 bg-white border-l-4 w-full"
                style={{
                  borderLeftColor: getRiskLevelColor(displayRiskLevel),
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                {/* Header */}
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-base font-gilroy-bold text-gray-900">
                    {displayRiskLevel === 'low'
                      ? 'Safe Area'
                      : displayRiskLevel === 'medium'
                      ? 'Medium Risk Area'
                      : 'High Risk Area'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowRiskCircle(false)}>
                    <FontAwesome5 name="times" size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {/* Incident list */}
                <View>
                  {displayAlerts.map((alert, index) => (
                    <View
                      key={alert.id}
                      className={`flex-row items-center justify-between py-2 ${
                        index < displayAlerts.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      {/* Incident name */}
                      <Text className="text-sm font-gilroy-medium text-gray-800 flex-1">
                        {alert.incidentType || alert.title}
                      </Text>

                      {/* Risk level badge */}
                      <Text
                        className="text-xs font-gilroy-bold px-2 py-1 rounded ml-2"
                        style={{
                          backgroundColor: `${getRiskLevelColor(alert.level)}20`,
                          color: getRiskLevelColor(alert.level),
                        }}
                      >
                        {alert.level.charAt(0).toUpperCase() + alert.level.slice(1)} Risk
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Downward Arrow Pointer */}
              <View
                style={{
                  width: 0,
                  height: 0,
                  backgroundColor: 'transparent',
                  borderStyle: 'solid',
                  borderLeftWidth: 12,
                  borderRightWidth: 12,
                  borderTopWidth: 12,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: '#FFFFFF',
                  marginTop: -1,
                }}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
};
