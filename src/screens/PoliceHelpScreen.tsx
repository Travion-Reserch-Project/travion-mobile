import React, { useEffect, useState } from 'react';
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
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainNavigator';
import colors from '../theme/colors';
import Geolocation from '@react-native-community/geolocation';
import Config from 'react-native-config';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  phone?: string;
};

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

const fetchNearbyStations = async (
  lat: number,
  lng: number,
  setStations: (stations: Station[]) => void,
  setError: (error: string | null) => void,
) => {
  try {
    const radius = 8000;
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=police&keyword=police%20station&key=${Config.GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const results = json?.results || [];
    const base: Station[] = results.map((r: any) => ({
      id: r.place_id,
      name: r.name,
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
      distanceMeters: haversine(lat, lng, r.geometry?.location?.lat, r.geometry?.location?.lng),
    }));
    const top = base
      .filter(s => Number.isFinite(s.distanceMeters))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 5);
    const detailed = await Promise.all(
      top.map(async s => {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.id}&fields=formatted_phone_number&key=${Config.GOOGLE_MAPS_API_KEY}`;
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
        Geolocation.getCurrentPosition(
          async pos => {
            const { latitude, longitude } = pos.coords;
            await fetchNearbyStations(latitude, longitude, setStations, setError);
            setLoading(false);
          },
          () => {
            setError('Unable to get current location');
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 },
        );
      } catch {
        setError('Unexpected error while getting location');
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleCall = (phone?: string) => {
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
      <View className="bg-white px-4 py-12">
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
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-base font-gilroy-regular" style={{ color: colors.gray[600] }}>
            Map view coming soon
          </Text>
        </View>
      )}
    </View>
  );
};
