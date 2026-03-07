import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import { getCurrentPosition } from '@utils';

interface TransportScreenProps {
  navigation?: NativeStackNavigationProp<MainStackParamList>;
}

export const TransportScreen: React.FC<TransportScreenProps> = ({ navigation }) => {
  const [locationName, setLocationName] = useState<string>('Detecting location...');
  const [locationLoading, setLocationLoading] = useState<boolean>(true);

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
        <Text className="text-2xl font-gilroy-bold text-gray-900">Transport</Text>
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

        {/* Tools */}
        <View className="rounded-2xl p-5 mb-5" style={styles.card}>
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 rounded-lg items-center justify-center bg-orange-100">
              <FontAwesome5 name="tools" size={14} color="#F5840E" />
            </View>
            <Text className="text-lg font-gilroy-bold text-gray-900 ml-3">Travel Tools</Text>
          </View>
          <View className="space-y-3">
            <TouchableOpacity
              className="rounded-xl p-4 flex-row items-center justify-between"
              activeOpacity={0.8}
              onPress={() => console.log('Fare guide coming soon')}
              style={styles.toolCard}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-11 h-11 rounded-xl items-center justify-center bg-orange-100">
                  <FontAwesome5 name="tags" size={16} color="#F5840E" />
                </View>
                <View className="ml-3.5 flex-1">
                  <Text className="text-sm font-gilroy-bold text-gray-900 mb-0.5">Fare guide</Text>
                  <Text className="text-xs font-gilroy-medium text-gray-600">
                    Metered tuk fares, airport taxis, buses
                  </Text>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={15} color="#C4C4C4" />
            </TouchableOpacity>

            <TouchableOpacity
              className="rounded-xl p-4 flex-row items-center justify-between"
              activeOpacity={0.8}
              onPress={() => console.log('Key contacts coming soon')}
              style={styles.toolCard}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-11 h-11 rounded-xl items-center justify-center bg-orange-100">
                  <FontAwesome5 name="phone-alt" size={16} color="#F5840E" />
                </View>
                <View className="ml-3.5 flex-1">
                  <Text className="text-sm font-gilroy-bold text-gray-900 mb-0.5">
                    Key contacts
                  </Text>
                  <Text className="text-xs font-gilroy-medium text-gray-600">
                    Tourist police and emergencies
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
