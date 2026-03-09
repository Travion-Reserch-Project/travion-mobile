import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import { getCurrentPosition } from '@utils';

interface TransportScreenProps {
  navigation?: NativeStackNavigationProp<MainStackParamList>;
}

export const TransportScreen: React.FC<TransportScreenProps> = ({ navigation }) => {
  const [locationName, setLocationName] = useState<string>('Detecting location...');
  const [locationLoading, setLocationLoading] = useState<boolean>(true);
  const [locationCoords, setLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Initialize geocoding once
  useEffect(() => {
    if (Config.GOOGLE_MAPS_API_KEY) {
      RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY as string);
    }
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      setLocationLoading(true);
      try {
        const position = await getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          retryAttempts: 1,
        });
        const { latitude, longitude } = position;
        setLocationCoords({ latitude, longitude });
        try {
          if (Config.GOOGLE_MAPS_API_KEY) {
            const results = await RNGeocoding.from(latitude, longitude);
            if (results?.results?.length) {
              const address = results.results[0];
              const parts = (address.formatted_address || '').split(',').map(p => p.trim());
              const cleaned = parts.filter(p => p && !/^\d+$/.test(p));
              const city = cleaned[0] || 'Current location';
              const region = cleaned[1] || '';
              setLocationName(region ? `${city}, ${region}` : city);
            } else {
              setLocationName(`Lat ${latitude.toFixed(3)}, Lng ${longitude.toFixed(3)}`);
            }
          } else {
            setLocationName(`Lat ${latitude.toFixed(3)}, Lng ${longitude.toFixed(3)}`);
          }
        } catch (err) {
          console.error('Geocoding error:', err);
          setLocationName(`Lat ${latitude.toFixed(3)}, Lng ${longitude.toFixed(3)}`);
        } finally {
          setLocationLoading(false);
        }
      } catch {
        setLocationName('Location unavailable');
        setLocationLoading(false);
      }
    };

    fetchLocation();
  }, []);

  const isPeakNow = () => {
    const hour = new Date().getHours();
    // Typical SL urban peak windows
    return (hour >= 7 && hour < 9) || (hour >= 16 && hour < 19);
  };

  const nextPeak = () => {
    const hour = new Date().getHours();
    if (hour < 7) return 'Peaks start ~7:00 AM';
    if (hour < 16) return 'Next peak ~4:00 PM';
    return 'Peak easing after 7:00 PM';
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View className="bg-white px-6 pt-4 pb-5" style={styles.header}>
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-gilroy-bold text-gray-900">Transport</Text>
          <View className="px-3 py-1 rounded-full" style={styles.headerBadge}>
            <Text className="text-[11px] font-gilroy-semibold text-emerald-800">LIVE</Text>
          </View>
        </View>
        <Text className="text-sm font-gilroy-regular text-gray-600 mt-1.5">
          Navigate Sri Lanka with ease
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={styles.scrollContent}>
        {/* Location & peak traffic */}
        <View className="rounded-2xl p-5 mb-5" style={[styles.card, styles.gradientCard]}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-gilroy-bold text-gray-900">Live local travel</Text>
            <View
              className={`w-2 h-2 rounded-full ${isPeakNow() ? 'bg-red-600' : 'bg-green-600'}`}
            />
          </View>
          {locationLoading ? (
            <View className="flex-row items-center py-2">
              <ActivityIndicator size="small" color="#F5840E" />
              <Text className="text-sm font-gilroy-medium text-gray-700 ml-3">
                Detecting your location...
              </Text>
            </View>
          ) : (
            <View>
              <View className="flex-row items-center mb-3 bg-white/60 rounded-xl p-3">
                <View className="w-9 h-9 rounded-full items-center justify-center bg-orange-100">
                  <FontAwesome5 name="map-marker-alt" size={14} color="#F5840E" />
                </View>
                <Text className="text-sm font-gilroy-semibold text-gray-900 ml-3 flex-1">
                  {locationName}
                </Text>
              </View>

              {locationCoords ? (
                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.mapPreview}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    initialRegion={{
                      latitude: locationCoords.latitude,
                      longitude: locationCoords.longitude,
                      latitudeDelta: 0.02,
                      longitudeDelta: 0.02,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    toolbarEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: locationCoords.latitude,
                        longitude: locationCoords.longitude,
                      }}
                      title="You are here"
                    />
                  </MapView>
                </View>
              ) : null}

              <View className="flex-row items-start mb-2">
                <FontAwesome5
                  name={isPeakNow() ? 'exclamation-circle' : 'check-circle'}
                  size={15}
                  color={isPeakNow() ? '#DC2626' : '#16A34A'}
                  style={styles.iconMargin}
                />
                <Text className="text-sm font-gilroy-medium text-gray-800 ml-2.5 flex-1 leading-5">
                  {isPeakNow()
                    ? 'Peak traffic now (7-9 AM / 4-7 PM). Allow extra time.'
                    : 'Off-peak right now. Smooth rides expected.'}
                </Text>
              </View>
              <View className="bg-white/40 rounded-lg px-3 py-2 mt-1">
                <Text className="text-xs font-gilroy-medium text-gray-600">{nextPeak()}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Smart commute */}
        <View className="rounded-2xl p-5 mb-5" style={styles.card}>
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 rounded-lg items-center justify-center bg-cyan-100">
              <FontAwesome5 name="bolt" size={14} color="#0E7490" />
            </View>
            <Text className="text-lg font-gilroy-bold text-gray-900 ml-3">Smart commute</Text>
          </View>

          <View className="rounded-xl p-4 mb-3" style={styles.smartCard}>
            <Text className="text-sm font-gilroy-bold text-gray-900 mb-1">AI trip assistant</Text>
            <Text className="text-xs font-gilroy-medium text-gray-700 leading-5">
              Ask for the fastest route, public transport options, and travel tips for your area.
            </Text>

            <TouchableOpacity
              className="rounded-xl mt-3 p-3.5 flex-row items-center justify-between"
              activeOpacity={0.8}
              onPress={() => navigation && navigation.navigate('ChatbotScreen')}
              style={styles.accentButton}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-9 h-9 rounded-lg items-center justify-center bg-white/70">
                  <FontAwesome5 name="robot" size={15} color="#0E7490" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-gilroy-bold text-cyan-900 mb-0.5">
                    Plan my trip
                  </Text>
                  <Text className="text-xs font-gilroy-medium text-cyan-700">
                    Open AI transport chat
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={15} color="#0E7490" />
            </TouchableOpacity>
          </View>

          <View className="space-y-3">
            <TouchableOpacity
              className="rounded-xl p-4 flex-row items-center justify-between"
              activeOpacity={0.8}
              onPress={() => navigation && navigation.navigate('ChatbotScreen')}
              style={styles.accentGhost}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-11 h-11 rounded-xl items-center justify-center bg-blue-100">
                  <FontAwesome5 name="history" size={16} color="#1D4ED8" />
                </View>
                <View className="ml-3.5 flex-1">
                  <Text className="text-sm font-gilroy-bold text-gray-900 mb-0.5">
                    Previous trips
                  </Text>
                  <Text className="text-xs font-gilroy-medium text-gray-600">
                    Open your recent trip conversations
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={15} color="#C4C4C4" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reports & map */}
        <View className="rounded-2xl p-5" style={styles.card}>
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 rounded-lg items-center justify-center bg-red-100">
              <FontAwesome5 name="map-marked-alt" size={14} color="#DC2626" />
            </View>
            <Text className="text-lg font-gilroy-bold text-gray-900 ml-3">Reports & Map</Text>
          </View>
          <View className="space-y-3">
            <TouchableOpacity
              className="rounded-xl p-4 flex-row items-center justify-between"
              activeOpacity={0.8}
              onPress={() => navigation && navigation.navigate('ReportRoadIssueScreen')}
              style={styles.reportCard}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-11 h-11 rounded-xl items-center justify-center bg-white">
                  <FontAwesome5 name="exclamation-triangle" size={17} color="#DC2626" />
                </View>
                <View className="ml-3.5 flex-1">
                  <Text className="text-sm font-gilroy-bold text-gray-900 mb-0.5">
                    Report road issue
                  </Text>
                  <Text className="text-xs font-gilroy-medium text-gray-600">
                    Block, damage, accident, debris
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={15} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity
              className="rounded-xl p-4 flex-row items-center justify-between"
              activeOpacity={0.8}
              onPress={() => navigation && navigation.navigate('IncidentMapScreen')}
              style={styles.toolCard}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-11 h-11 rounded-xl items-center justify-center bg-blue-100">
                  <FontAwesome5 name="map-marked-alt" size={16} color="#2563EB" />
                </View>
                <View className="ml-3.5 flex-1">
                  <Text className="text-sm font-gilroy-bold text-gray-900 mb-0.5">
                    Incidents map
                  </Text>
                  <Text className="text-xs font-gilroy-medium text-gray-600">
                    See latest reports pinned on map
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={15} color="#C4C4C4" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  iconMargin: {
    marginTop: 2,
  },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  gradientCard: {
    backgroundColor: '#FFF9F5',
    borderWidth: 1,
    borderColor: '#FFE5D0',
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FDE9D8',
    marginBottom: 12,
  },
  mapPreview: {
    width: '100%',
    height: 148,
  },
  headerBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  smartCard: {
    backgroundColor: '#F0FDFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  accentButton: {
    backgroundColor: '#A5F3FC',
    borderWidth: 1,
    borderColor: '#67E8F9',
  },
  accentGhost: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  toolCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reportCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
  },
});
