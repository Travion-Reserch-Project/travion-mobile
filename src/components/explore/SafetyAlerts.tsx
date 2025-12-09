import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';

// Initialize geocoding with API key
RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY as string);

interface SafetyAlert {
  id: string;
  title: string;
  description: string;
  level: 'low' | 'medium' | 'high';
  location: string;
}

interface SafetyAlertsProps {
  alerts?: SafetyAlert[];
  onViewFullMap?: () => void;
}
interface LocationCoords {
  latitude: number;
  longitude: number;
}

const defaultAlerts: SafetyAlert[] = [
  {
    id: '1',
    title: 'Current Risk Level: High',
    description: 'Gang activity reported in this area. Avoid traveling alone.',
    level: 'high',
    location: 'Current Location',
  },
  {
    id: '2',
    title: 'Current Risk Level: Medium',
    description: 'Pickpocketing risk increases at this hour. Stay alert.',
    level: 'medium',
    location: 'Current Location',
  },
];

// Default fallback region (Colombo)
const DEFAULT_REGION = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const SafetyAlerts: React.FC<SafetyAlertsProps> = ({
  alerts = defaultAlerts,
  onViewFullMap,
}) => {
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [locationName, setLocationName] = useState<string>('Current Location');
  const [locationLoading, setLocationLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [selectedAlertIndex, setSelectedAlertIndex] = useState(0);
  const { width } = useWindowDimensions();
  // Account for horizontal padding (px-6 = 24 each side)
  const carouselWidth = Math.max(width - 48, 280);
  const cardHeight = 160;
  const scrollRef = useRef<Animated.ScrollView | null>(null);

  // Check if there are any high or medium risk incidents
  const hasAnyRisk = alerts.some(alert => alert.level === 'high' || alert.level === 'medium');

  // Filter alerts: if there are risks, exclude low-risk "Safe Area" cards
  const filteredAlerts = hasAnyRisk ? alerts.filter(alert => alert.level !== 'low') : alerts;

  // Get selected alert (or default if index out of range)
  const selectedAlert = filteredAlerts[selectedAlertIndex] || filteredAlerts[0] || defaultAlerts[0];
  const currentRiskLevel = selectedAlert.level;

  // Animation for pulsing dot
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Helper functions
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
    // Radius in meters for the risk circle
    switch (level) {
      case 'high':
        return 600; // 600m radius for high risk
      case 'medium':
        return 400; // 400m radius for medium risk
      case 'low':
        return 200; // 200m radius for low risk
      default:
        return 300;
    }
  };

  const getMapZoomLevel = (radius: number) => {
    // Calculate appropriate latitudeDelta/longitudeDelta to show the full circle
    // Add padding factor to ensure circle is fully visible
    const paddingFactor = 2.5;
    // Convert radius in meters to degrees (roughly)
    const degreesPerMeter = 0.00001;
    const delta = radius * degreesPerMeter * paddingFactor;
    return { latitudeDelta: delta, longitudeDelta: delta };
  };

  // Pulsing animation effect
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

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
            setLocationLoading(false);
            return;
          }
        }

        // Get current position
        Geolocation.getCurrentPosition(
          async position => {
            const { latitude, longitude } = position.coords;
            const newLocation = { latitude, longitude };
            setUserLocation(newLocation);

            // Calculate zoom level based on risk radius
            const radius = getRiskRadius(currentRiskLevel);
            const zoomLevel = getMapZoomLevel(radius);

            setMapRegion({
              latitude,
              longitude,
              ...zoomLevel,
            });

            // Reverse geocode to get location name
            try {
              console.log('Starting reverse geocoding for:', latitude, longitude);
              const results = await RNGeocoding.from(latitude, longitude);
              console.log('Geocoding results:', results);
              if (results && results.results && results.results.length > 0) {
                const address = results.results[0];
                const locationString = address.formatted_address || 'Current Location';
                console.log('Formatted address:', locationString);
                // Extract city from formatted address
                const parts = locationString.split(',');
                const cityName = parts.length > 1 ? parts[parts.length - 2].trim() : parts[0];
                console.log('Extracted city name:', cityName);
                setLocationName(cityName);
              } else {
                console.log('No results found from geocoding');
                setLocationName(`Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
              }
            } catch (err) {
              console.error('Reverse geocoding error:', err);
              // Fallback: show coordinates if geocoding fails
              setLocationName(`Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
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

    requestLocationPermission();
  }, [selectedAlertIndex, currentRiskLevel]);

  return (
    <View className="px-6">
      {/* Location Status */}
      <View className="flex-row items-center mb-6">
        <Text className="text-base font-gilroy-medium text-gray-700" numberOfLines={1}>
          {locationLoading ? 'Getting location...' : locationName}
        </Text>
        {!locationLoading && (
          <View className="flex-row items-center ml-2">
            <Animated.View
              className="w-2 h-2 rounded-full mr-1"
              style={{
                backgroundColor: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#6EE7B7', '#10B981'], // Light green to normal green
                }),
              }}
            />
            <Text className="text-base font-gilroy-medium text-gray-700">Live</Text>
          </View>
        )}
      </View>

      {/* Risk Alert Carousel */}
      {alerts.length > 0 ? (
        <View className="mb-6">
          <View className="-mx-6">
            <Animated.ScrollView
              ref={scrollRef as any}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={carouselWidth}
              snapToAlignment="start"
              contentContainerStyle={{ paddingHorizontal: 0 }}
              onMomentumScrollEnd={event => {
                const index = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
                setSelectedAlertIndex(Math.min(Math.max(index, 0), filteredAlerts.length - 1));
              }}
            >
              {filteredAlerts.map((alert, index) => (
                <View
                  key={alert.id || index}
                  style={{ width: carouselWidth, paddingHorizontal: 24 }}
                >
                  <View
                    className="rounded-2xl p-6"
                    style={{
                      backgroundColor: getRiskLevelColor(alert.level),
                      height: cardHeight,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 12,
                      elevation: 6,
                    }}
                  >
                    {alert.level === 'low' ? (
                      // Safe Area Message
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <Text className="text-2xl font-gilroy-bold text-white mb-2">
                            Safe Area ✓
                          </Text>
                          <Text className="text-base font-gilroy-regular text-white/90">
                            No risks detected in this location. You are safe!
                          </Text>
                        </View>
                        <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center ml-4">
                          <FontAwesome5 name="check-circle" size={20} color="white" />
                        </View>
                      </View>
                    ) : (
                      // High/Medium Risk Message
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <Text className="text-xl font-gilroy-bold text-white mb-2">
                            {alert.title}
                          </Text>
                          <Text className="text-base font-gilroy-regular text-white/90">
                            {alert.description}
                          </Text>
                        </View>
                        <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center ml-4">
                          <FontAwesome5
                            name={
                              alert.level === 'high' ? 'exclamation-circle' : 'exclamation-triangle'
                            }
                            size={20}
                            color="white"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </Animated.ScrollView>
          </View>

          {/* Carousel Indicators - Only show if multiple alerts */}
          {filteredAlerts.length > 1 && (
            <View className="mt-4">
              {/* Page Indicator Dots */}
              <View className="flex-row justify-center items-center gap-2">
                {filteredAlerts.map((alert, index) => (
                  <TouchableOpacity
                    key={alert.id || index}
                    onPress={() => {
                      setSelectedAlertIndex(index);
                      scrollRef.current?.scrollTo({
                        x: index * carouselWidth,
                        y: 0,
                        animated: true,
                      });
                    }}
                    className="transition-all"
                  >
                    <View
                      className={`rounded-full ${
                        index === selectedAlertIndex ? 'w-8 h-2' : 'w-2 h-2'
                      }`}
                      style={{
                        backgroundColor:
                          index === selectedAlertIndex ? getRiskLevelColor(alert.level) : '#D1D5DB',
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Counter Text */}
              <Text className="text-center text-xs font-gilroy-medium text-gray-500 mt-2">
                {selectedAlertIndex + 1} of {filteredAlerts.length} alerts
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Live Map Preview */}
      <View className="bg-white rounded-2xl overflow-hidden mb-6 shadow-sm">
        {/* Real Map */}
        <View className="w-full h-52">
          {locationLoading ? (
            <View className="flex-1 items-center justify-center bg-gray-100">
              <ActivityIndicator size="large" color="#F97316" />
              <Text className="text-sm text-gray-600 mt-2">Loading your location...</Text>
            </View>
          ) : (
            <MapView
              className="flex-1"
              provider={PROVIDER_GOOGLE}
              initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              {/* Risk circle around current location */}
              {userLocation && (
                <>
                  <Circle
                    center={{
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    }}
                    radius={getRiskRadius(currentRiskLevel)}
                    fillColor={`${getRiskLevelColor(currentRiskLevel)}40`}
                    strokeColor={getRiskLevelColor(currentRiskLevel)}
                    strokeWidth={2}
                  />
                  {/* Blue dot for current location */}
                  <Marker
                    coordinate={{
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View
                      className="w-5 h-5 rounded-full"
                      style={{
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
                </>
              )}
            </MapView>
          )}
        </View>

        {/* Map caption */}
        <TouchableOpacity onPress={onViewFullMap} className="p-4">
          <Text className="text-lg font-gilroy-bold text-gray-900 mb-1">Live Map Preview</Text>
          <Text className="text-sm font-gilroy-regular text-gray-600">Tap to view full map →</Text>
        </TouchableOpacity>
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
