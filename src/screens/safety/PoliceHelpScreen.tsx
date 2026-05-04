import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import MapView, { Marker, Circle, Callout, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import colors from '../../theme/colors';
import Config from 'react-native-config';
import { getCurrentPosition } from '@utils/geolocation';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  phone?: string;
};

// Calculates distance between user and station (Distance in meters) using Haversine formula
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const fetchNearbyStations = async ( // Fetches nearby police stations within a given radius
  lat: number,
  lng: number,
  setStations: (stations: Station[]) => void,
  setError: (error: string | null) => void,
) => {
  try {
    const radius = 8000; // Search within 8 km radius (Google Places API max is 50,000 meters, but we use a smaller radius for relevance)
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=police&keyword=police%20station&key=${Config.GOOGLE_MAPS_API_KEY}`; // Google Places API endpoint for nearby search with type=police and keyword=police station to increase relevance
    const res = await fetch(url);
    const json = await res.json();
    const results = json?.results || []; // Extract results array from response, default to empty array if not present
    const base: Station[] = results.map((r: any) => ({ //// Convert API response into station objects with distance
      id: r.place_id, 
      name: r.name, 
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
      distanceMeters: haversine(lat, lng, r.geometry?.location?.lat, r.geometry?.location?.lng),
    }));
    const top = base
      .filter(s => Number.isFinite(s.distanceMeters)) // Filter out any stations with invalid distance calculations
      .sort((a, b) => a.distanceMeters - b.distanceMeters) // Sort by nearest
      .slice(0, 5); // Take top 5 closest stations
    const detailed = await Promise.all(
      top.map(async s => {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.id}&fields=formatted_phone_number&key=${Config.GOOGLE_MAPS_API_KEY}`; // Fetch additional details like phone number for each station
          const dRes = await fetch(detailsUrl);
          const dJson = await dRes.json();
          return { ...s, phone: dJson?.result?.formatted_phone_number };
        } catch {
          return s;
        }
      }),
    );
    setStations(detailed);
  } catch {
    setError('Failed to fetch nearby police stations');
  }
};

export const PoliceHelpScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setError('Location permission denied');
            setLoading(false);
            return;
          }
        }

        const position = await getCurrentPosition({
          timeout: 15000,
          enableHighAccuracy: true,
          retryAttempts: 2,
        });
        const { latitude, longitude } = position;
        setUserLocation({ lat: latitude, lng: longitude });
        await fetchNearbyStations(latitude, longitude, setStations, setError);
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setLoading(false);
      } catch {
        setError('Unexpected error while getting location');
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!mapRegion && stations.length > 0) {
      const first = stations[0];
      setMapRegion({
        latitude: first.lat,
        longitude: first.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [mapRegion, stations]);

  const getRegion = (): Region => {
    if (mapRegion) return mapRegion;
    if (userLocation) {
      return {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (stations.length > 0) {
      return {
        latitude: stations[0].lat,
        longitude: stations[0].lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 6.9271,
      longitude: 79.8612,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  const animateToRegion = (region: Region) => { //Smooth map movement
    mapRef.current?.animateToRegion(region, 200);
    setMapRegion(region);
  };

  const handleZoom = (factor: number) => { //Changes map zoom level
    const region = getRegion();
    const next: Region = {
      ...region,
      latitudeDelta: Math.max(0.002, region.latitudeDelta * factor),
      longitudeDelta: Math.max(0.002, region.longitudeDelta * factor),
    };
    animateToRegion(next);
  };

  const handleZoomIn = () => handleZoom(0.5);
  const handleZoomOut = () => handleZoom(2);

  const handleCenterLocation = () => {
    if (userLocation) {
      animateToRegion({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      return;
    }
    if (stations.length > 0) {
      animateToRegion({
        latitude: stations[0].lat,
        longitude: stations[0].lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const handleCall = (phone?: string) => { //Opens phone dialer
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = (stationName: string, lat?: number, lng?: number) => {
    if (lat && lng) {
      const url = Platform.select({
        ios: `http://maps.apple.com/?daddr=${lat},${lng}`,
        android: `google.navigation:q=${lat},${lng}`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      });
      if (url) Linking.openURL(url);
      return;
    }
    const q = encodeURIComponent(stationName);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background.secondary }}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b" style={{ borderColor: colors.border.light }}>
        <View className="flex-row items-center justify-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute left-4"
            style={{ zIndex: 1 }}
          >
            <FontAwesome5 name="arrow-left" size={18} color={colors.gray[900]} />
          </TouchableOpacity>
          <Text className="text-xl font-gilroy-bold" style={{ color: colors.gray[900] }}>
            Nearby Police Stations
          </Text>
          {/* <TouchableOpacity className="absolute right-4" style={{ zIndex: 1 }}>
            <FontAwesome5 name="search" size={18} color={colors.gray[900]} />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Segmented Tab Bar */}
      <View className="bg-white px-4 py-6">
        <View
          className="flex-row items-center p-1 rounded-full"
          style={{ backgroundColor: colors.background.tertiary }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('list')}
            className="flex-1 rounded-full items-center justify-center"
            style={{
              paddingVertical: 10,
              backgroundColor: activeTab === 'list' ? colors.white : 'transparent',
              borderWidth: activeTab === 'list' ? 1 : 0,
              borderColor: activeTab === 'list' ? colors.border.light : 'transparent',
            }}
          >
            <Text
              className="font-gilroy-bold"
              style={{ color: activeTab === 'list' ? colors.gray[900] : colors.gray[600] }}
            >
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('map')}
            className="flex-1 rounded-full items-center justify-center"
            style={{
              paddingVertical: 10,
              backgroundColor: activeTab === 'map' ? colors.white : 'transparent',
              borderWidth: activeTab === 'map' ? 1 : 0,
              borderColor: activeTab === 'map' ? colors.border.light : 'transparent',
            }}
          >
            <Text
              className="font-gilroy-bold"
              style={{ color: activeTab === 'map' ? colors.gray[900] : colors.gray[600] }}
            >
              Map
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {activeTab === 'list' ? (
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          {loading && (
            <View className="items-center justify-center py-10">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-sm mt-3" style={{ color: colors.gray[600] }}>
                Finding nearby stations...
              </Text>
            </View>
          )}
          {!!error && !loading && (
            <View className="items-center justify-center py-10">
              <Text className="text-sm" style={{ color: colors.gray[600] }}>
                {error}
              </Text>
            </View>
          )}
          {!loading &&
            !error &&
            stations.map(station => (
              <View
                key={station.id}
                className="flex-row items-center bg-white rounded-3xl p-4 mb-3"
                style={{
                  //   borderRadius: 34,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                {/* Icon */}
                <View
                  className="rounded-full items-center justify-center mr-4"
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: `${colors.primary}15`,
                  }}
                >
                  <FontAwesome5 name="shield-alt" size={20} color={colors.primary} />
                </View>

                {/* Info */}
                <View className="flex-1">
                  <Text
                    className="text-base font-gilroy-bold mb-1"
                    style={{ color: colors.gray[900] }}
                  >
                    {station.name}
                  </Text>
                  <Text className="text-sm font-gilroy-regular" style={{ color: colors.gray[600] }}>
                    {station.distanceMeters < 1000
                      ? `${Math.round(station.distanceMeters)}m away`
                      : `${(station.distanceMeters / 1000).toFixed(1)}km away`}
                  </Text>
                </View>

                {/* Call Button */}
                <TouchableOpacity
                  onPress={() => handleCall(station.phone)}
                  className="rounded-full items-center justify-center mx-2"
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: colors.background.tertiary,
                    opacity: station.phone ? 1 : 0.5,
                  }}
                  disabled={!station.phone}
                >
                  <FontAwesome5 name="phone" size={16} color={colors.gray[700]} />
                </TouchableOpacity>

                {/* Navigate Button */}
                <TouchableOpacity
                  onPress={() => handleNavigate(station.name, station.lat, station.lng)}
                  className="rounded-full px-5 py-2.5"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="text-sm font-gilroy-bold" style={{ color: colors.white }}>
                    Navigate
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
        </ScrollView>
      ) : (
        <View className="flex-1">
          {loading && (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-sm mt-3" style={{ color: colors.gray[600] }}>
                Loading map...
              </Text>
            </View>
          )}
          {!loading && (userLocation || stations.length > 0) && (
            <View className="flex-1">
              <MapView
                ref={ref => {
                  mapRef.current = ref;
                }}
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1 }}
                initialRegion={getRegion()}
                onRegionChangeComplete={region => setMapRegion(region)}
                showsUserLocation
                showsMyLocationButton={false}
              >
                {/* User location marker (blue dot with accuracy circle) */}
                {userLocation && (
                  <>
                    {/* Accuracy circle */}
                    <Circle
                      center={{ latitude: userLocation.lat, longitude: userLocation.lng }}
                      radius={50}
                      fillColor="rgba(66, 133, 244, 0.2)"
                      strokeColor="rgba(66, 133, 244, 0.5)"
                      strokeWidth={1}
                    />
                    {/* Blue dot marker */}
                    <Marker
                      coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
                      anchor={{ x: 0.5, y: 0.5 }}
                      title="Your Location"
                      tracksViewChanges={false}
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
                  </>
                )}

                {/* Police station markers */}
                {stations.map(station => (
                  <Marker
                    key={station.id}
                    coordinate={{ latitude: station.lat, longitude: station.lng }}
                    pinColor="#FF6B6B"
                    tracksViewChanges={false}
                  >
                    <Callout tooltip>
                      <View
                        style={{
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: 'white',
                            padding: 14,
                            borderRadius: 10,
                            minWidth: 180,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.5,
                            shadowRadius: 12,
                            elevation: 16,
                          }}
                        >
                          <Text
                            className="font-gilroy-bold text-sm mb-1"
                            style={{ color: colors.gray[900] }}
                          >
                            {station.name}
                          </Text>
                          <Text
                            className="font-gilroy-regular text-xs"
                            style={{ color: colors.gray[600] }}
                          >
                            {station.distanceMeters < 1000
                              ? `${Math.round(station.distanceMeters)}m away`
                              : `${(station.distanceMeters / 1000).toFixed(1)}km away`}
                          </Text>
                        </View>
                        {/* Triangle pointer */}
                        <View
                          style={{
                            width: 0,
                            height: 0,
                            backgroundColor: 'transparent',
                            borderStyle: 'solid',
                            borderLeftWidth: 10,
                            borderRightWidth: 10,
                            borderTopWidth: 10,
                            borderLeftColor: 'transparent',
                            borderRightColor: 'transparent',
                            borderTopColor: 'white',
                            marginTop: -1,
                          }}
                        />
                      </View>
                    </Callout>
                  </Marker>
                ))}
              </MapView>

              {/* Map controls */}
              <View className="absolute right-4 top-1/3 gap-3">
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
                  <FontAwesome5 name="crosshairs" size={16} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {!loading && error && (
            <View className="flex-1 items-center justify-center px-4">
              <Text className="text-sm text-center" style={{ color: colors.gray[600] }}>
                {error}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};
