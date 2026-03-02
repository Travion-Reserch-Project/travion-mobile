import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import RNGeocoding from 'react-native-geocoding';
import { getCurrentPosition, LocationCoords } from '@utils/geolocation';
import Config from 'react-native-config';
import SafetyService from '@services/api/SafetyService';

// Initialize geocoding with API key
RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY as string);
export interface SafetyAlert {
  id: string;
  title: string;
  description: string;
  level: 'low' | 'medium' | 'high';
  location: string;
  incidentType:
    | 'Scam'
    | 'Pickpocket'
    | 'Theft'
    | 'Money Theft'
    | 'Harassment'
    | 'Bag Snatching'
    | 'Extortion';
}

interface SafetyAlertsProps {
  alerts?: SafetyAlert[];
  onViewFullMap?: () => void;
  onReportIncident?: () => void;
  onPoliceHelp?: () => void;
  onViewAlerts?: () => void;
  onAlertSelected?: (alert: SafetyAlert) => void;
  onAlertsLoaded?: (alerts: SafetyAlert[]) => void;
}

const defaultAlerts: SafetyAlert[] = [
  {
    id: '1',
    title: 'Scam Risk Level: High',
    description: 'Scam activity reported in this area. Stay alert and avoid strangers.',
    level: 'high',
    location: 'Current Location',
    incidentType: 'Scam',
  },
  {
    id: '2',
    title: 'Pickpocket Risk Level: Medium',
    description: 'Pickpocketing risk increases at this hour. Stay alert.',
    level: 'medium',
    location: 'Current Location',
    incidentType: 'Pickpocket',
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
  alerts: propsAlerts,
  onViewFullMap,
  onReportIncident,
  onPoliceHelp,
  onViewAlerts,
  onAlertSelected,
  onAlertsLoaded,
}) => {
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [locationName, setLocationName] = useState<string>('Current Location');
  const [locationLoading, setLocationLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [selectedAlertIndex, setSelectedAlertIndex] = useState(0);
  const [alerts, setAlerts] = useState<SafetyAlert[]>(propsAlerts || []);
  const [fetchingAlerts, setFetchingAlerts] = useState(true);

  const { width } = useWindowDimensions();
  // Account for horizontal padding (px-6 = 24 each side)
  // Reduce effective card width so next card peeks visibly
  const carouselWidth = Math.max(width - 46, 260);
  const cardHeight = 160;
  const scrollRef = useRef<Animated.ScrollView | null>(null);

  // Memoize filtered alerts to prevent infinite loop
  const filteredAlerts = useMemo(() => {
    // Check if there are any high or medium risk incidents
    const hasAnyRisk = alerts.some(alert => alert.level === 'high' || alert.level === 'medium');

    // Check if all alerts are low risk
    const allLowRisk = alerts.every(alert => alert.level === 'low');

    // Sort alerts by risk level: High → Medium → Low
    const sortedAlerts = [...alerts].sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return riskOrder[a.level] - riskOrder[b.level];
    });

    // Filter alerts based on risk levels
    if (allLowRisk) {
      return [
        {
          id: 'safe-1',
          title: 'Safe Area ✓',
          description: 'No significant risks detected in this location. You are safe!',
          level: 'low' as const,
          location: locationName,
          incidentType: 'Scam' as const,
        },
      ];
    }

    if (hasAnyRisk) {
      return sortedAlerts.filter(alert => alert.level !== 'low');
    }

    return sortedAlerts;
  }, [alerts, locationName]);

  // Animation for pulsing dot - must be declared before any conditional logic
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Get selected alert (or default if index out of range)
  const selectedAlert = filteredAlerts[selectedAlertIndex] || filteredAlerts[0] || defaultAlerts[0];
  const currentRiskLevel = selectedAlert.level;

  // Fetch safety predictions from backend
  const fetchSafetyPredictions = useCallback(async (latitude: number, longitude: number) => {
    try {
      setFetchingAlerts(true);
      console.log('Fetching safety predictions for:', latitude, longitude);

      const prediction = await SafetyService.getSafetyPredictions(latitude, longitude);

      if (prediction && prediction.alerts && prediction.alerts.length > 0) {
        console.log('Received alerts:', prediction.alerts);
        setAlerts(prediction.alerts);

        // Update location name from backend if available
        if (prediction.location && prediction.location.locationName) {
          setLocationName(prediction.location.locationName);
        }
      } else {
        console.log('No alerts received, using defaults');
        setAlerts(defaultAlerts);
      }
    } catch (error) {
      console.error('Error fetching safety predictions:', error);
      setAlerts(defaultAlerts);
    } finally {
      setFetchingAlerts(false);
    }
  }, []);

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
        return 300; // 300m radius for high risk
      case 'medium':
        return 200; // 200m radius for medium risk
      case 'low':
        return 200; // 100m radius for low risk
      default:
        return 150;
    }
  };

  const getMapZoomLevel = (radius: number) => {
    // Calculate appropriate latitudeDelta/longitudeDelta to show the full circle
    // Add padding factor to ensure circle is fully visible
    const paddingFactor = 6.0;
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

  // Notify parent when selected alert index changes
  useEffect(() => {
    if (onAlertSelected && selectedAlert) {
      onAlertSelected(selectedAlert);
    }
  }, [onAlertSelected, selectedAlert]);

  // Notify parent when alerts are loaded/changed
  useEffect(() => {
    if (onAlertsLoaded && filteredAlerts.length > 0) {
      onAlertsLoaded(filteredAlerts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAlerts]);

  // Request location permissions and get current location
  useEffect(() => {
    const getLocationAndFetchAlerts = async () => {
      try {
        console.log('[SafetyAlerts] Getting current position...');

        // Get current position using the utility (handles permissions internally)
        const position = await getCurrentPosition({
          timeout: 15000,
          enableHighAccuracy: true,
          retryAttempts: 2,
        });

        const { latitude, longitude } = position;
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

        // Fetch safety predictions from backend (includes location name)
        await fetchSafetyPredictions(latitude, longitude);

        // Reverse geocode to get location name (fallback if backend doesn't provide)
        try {
          console.log('Starting reverse geocoding for:', latitude, longitude);
          const results = await RNGeocoding.from(latitude, longitude);
          console.log('Geocoding results:', results);
          if (results && results.results && results.results.length > 0) {
            const address = results.results[0];
            const locationString = address.formatted_address || 'Current Location';
            console.log('Formatted address:', locationString);
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

            console.log('Extracted location name:', displayName);
            setLocationName(displayName);
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
      } catch (error: any) {
        console.error('[SafetyAlerts] Location error:', error);
        // Show error message to user
        setLocationName(error.message || 'Unable to get location');
        setLocationLoading(false);
      }
    };

    getLocationAndFetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // const fetchAlerts = useCallback(async () => {
  //   try {
  //     const lat = userLocation?.latitude || DEFAULT_REGION.latitude;
  //     const lon = userLocation?.longitude || DEFAULT_REGION.longitude;
  //     const fetchedAlerts = await SafetyService.getSafetyPredictions(lat, lon);
  //     setAlerts(fetchedAlerts ?? []);
  //   } catch (err: any) {
  //     console.error('Error fetching quick safety alerts:', err);
  //   }
  // }, [userLocation]);

  return (
    <View className="px-6">
      {/* Location Status */}
      <View className="flex-row items-center mb-6">
        <Text className="text-base font-gilroy-medium text-gray-700" numberOfLines={1}>
          {locationLoading
            ? 'Getting location...'
            : fetchingAlerts
            ? 'Loading predictions...'
            : locationName}
        </Text>
        {!locationLoading && !fetchingAlerts && (
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
      {fetchingAlerts ? (
        <View className="mb-6">
          <Animated.View
            className="rounded-2xl p-6"
            style={{
              backgroundColor: '#edeef0',
              height: cardHeight,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                {/* Animated skeleton for title */}
                <Animated.View
                  className="h-6 rounded-lg mb-3"
                  style={{
                    backgroundColor: '#D1D5DB',
                    width: '70%',
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  }}
                />
                {/* Animated skeleton for description line 1 */}
                <Animated.View
                  className="h-4 rounded-lg mb-2"
                  style={{
                    backgroundColor: '#D1D5DB',
                    width: '90%',
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  }}
                />
                {/* Animated skeleton for description line 2 */}
                <Animated.View
                  className="h-4 rounded-lg mb-2"
                  style={{
                    backgroundColor: '#D1D5DB',
                    width: '75%',
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  }}
                />
              </View>
              {/* Icon placeholder with pulsing animation */}
              <Animated.View
                className="w-12 h-12 rounded-full items-center justify-center ml-4"
                style={{
                  backgroundColor: '#D1D5DB',
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                }}
              >
                <FontAwesome5 name="shield-alt" size={20} color="#9CA3AF" />
              </Animated.View>
            </View>
            {/* Loading text at bottom */}
            <View className="absolute bottom-4 left-6 right-6 flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#6B7280" />
              <Text className="text-sm font-gilroy-medium text-gray-600 ml-2">
                Loading safety alerts...
              </Text>
            </View>
          </Animated.View>
        </View>
      ) : alerts.length > 0 ? (
        <View className="mb-6">
          {filteredAlerts.length === 1 ? (
            // Single card - full width, no carousel
            <View
              className="rounded-2xl p-6"
              style={{
                backgroundColor: getRiskLevelColor(filteredAlerts[0].level),
                height: cardHeight,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              {filteredAlerts[0].level === 'low' ? (
                // Safe Area Message
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-2xl font-gilroy-bold text-white mb-2">Safe Area ✓</Text>
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
                      {filteredAlerts[0].title}
                    </Text>
                    <Text className="text-base font-gilroy-regular text-white/90">
                      {filteredAlerts[0].description}
                    </Text>
                  </View>
                  <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center ml-4">
                    <FontAwesome5
                      name={
                        filteredAlerts[0].level === 'high'
                          ? 'exclamation-circle'
                          : 'exclamation-triangle'
                      }
                      size={20}
                      color="white"
                    />
                  </View>
                </View>
              )}
            </View>
          ) : (
            // Multiple cards - carousel with peek
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
                    style={{ width: carouselWidth, paddingHorizontal: 18 }}
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
                                alert.level === 'high'
                                  ? 'exclamation-circle'
                                  : 'exclamation-triangle'
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
          )}

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

      {/* <Button
        title="Refresh Alerts"
        onPress={() => fetchSafetyPredictions(userLocation?.latitude!, userLocation?.longitude!)}
        variant="primary"
        className="w-full"
      /> */}

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
            {
              icon: 'exclamation-triangle',
              label: 'Report Incident',
              color: '#F97316',
              onPress: onReportIncident,
            },
            { icon: 'bell', label: 'View Alerts', color: '#F97316', onPress: onViewAlerts },
            { icon: 'shield-alt', label: 'Police Help', color: '#F97316', onPress: onPoliceHelp },
          ].map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              className="flex-1 items-center mx-2"
            >
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
