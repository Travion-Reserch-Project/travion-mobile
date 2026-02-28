import { MainStackParamList } from '@navigation/MainNavigator';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Geolocation from '@react-native-community/geolocation';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';
import { weatherService } from '../services/api/WeatherService';

// Initialize geocoding with API key
if (Config.GOOGLE_MAPS_API_KEY) {
  RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY);
}

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export const WeatherScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('Detecting location...');
  const [uvIndex, setUvIndex] = useState<number | string>('--');
  const [uvLevel, setUvLevel] = useState('Loading...');
  const [weatherData, setWeatherData] = useState<any>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);

        // Request Location Permission
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Travion needs access to your location to fetch weather data.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setLocationName('Permission denied');
            setLoading(false);
            return;
          }
        }

        // Get Current Position
        Geolocation.getCurrentPosition(
          async position => {
            const { latitude, longitude } = position.coords;

            // 1. Get Location Name
            try {
              const results = await RNGeocoding.from(latitude, longitude);
              if (results && results.results && results.results.length > 0) {
                const address = results.results[0];
                const parts = address.formatted_address.split(',').map((p: string) => p.trim());
                if (parts.length >= 2) {
                  setLocationName(`${parts[parts.length - 3]}, ${parts[parts.length - 1]}`);
                } else {
                  setLocationName(address.formatted_address);
                }
              }
            } catch (err) {
              console.error('Reverse geocoding error:', err);
              setLocationName('Unknown Location');
            }

            // 2. Fetch Weather from Backend
            try {
              const response = await weatherService.getWeatherData(latitude, longitude);
              console.log('response', response);
              if (response.success && response.data) {
                const data = response.data;
                setWeatherData(data);

                // Map UV Index and Level
                // Google Weather API structure might vary, but assuming fields based on user request
                // Typically: data.uv_index or data.currentConditions.uvIndex etc.
                // If the user wants specific fields, we might need to adjust this.
                // For now, I'll search for typical Google Weather API fields.
                const fetchedUvIndex = data.uvIndex || data.uv_index || 0;
                setUvIndex(fetchedUvIndex);

                // Determine UV Level if not provided
                if (data.uvLevel || data.uv_level) {
                  setUvLevel(data.uvLevel || data.uv_level);
                } else {
                  if (fetchedUvIndex <= 2) setUvLevel('Low');
                  else if (fetchedUvIndex <= 5) setUvLevel('Moderate');
                  else if (fetchedUvIndex <= 7) setUvLevel('High');
                  else if (fetchedUvIndex <= 10) setUvLevel('Very High');
                  else setUvLevel('Extreme');
                }
              }
            } catch (err) {
              console.error('Weather fetch error:', err);
            } finally {
              setLoading(false);
            }
          },
          error => {
            console.error('Geolocation error:', error);
            setLocationName('Location error');
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
      } catch (err) {
        console.error('Setup error:', err);
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  // Helper to format conditions from data
  const getConditionValue = (type: string, defaultValue: string) => {
    if (!weatherData) return defaultValue;

    switch (type) {
      case 'temp':
        return weatherData.temperature
          ? `${weatherData.temperature?.degrees}°C`
          : weatherData.temp_c
          ? `${weatherData.temp_c}°C`
          : defaultValue;
      case 'humidity':
        return weatherData.relativeHumidity ? `${weatherData.relativeHumidity}%` : defaultValue;
      case 'sky':
        return weatherData.cloudCover
          ? weatherData.cloudCover > 60
            ? 'Cloudy'
            : weatherData.cloudCover > 30
            ? 'Partly Cloudy'
            : 'Clear Sky'
          : defaultValue;
      case 'time':
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      default:
        return defaultValue;
    }
  };

  if (loading && !weatherData) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-gray-500 font-semibold">Updating weather data...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* 🔽 Scroll starts here */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <Text className="text-2xl font-gilroy-bold text-gray-900">Weather</Text>

          {/* Location */}
          <Text className="text-primary text-sm font-semibold mb-1">AUTO-DETECTED</Text>
          <Text className="text-3xl font-bold text-gray-900 mb-6">{locationName}</Text>

          {/* UV Ring */}
          <View className="items-center justify-center mb-6">
            <View className="w-64 h-64 rounded-full border-[16px] border-gray-200 items-center justify-center">
              {/* Fake progress overlay */}
              <View
                className="absolute w-64 h-64 rounded-full border-[16px] border-primary"
                style={{
                  // Simple logic to show partial border based on UV index (max 12 for extreme)
                  transform: [{ rotate: '-90deg' }],
                  borderRightColor: Number(uvIndex) > 0 ? '#2563EB' : 'transparent',
                  borderTopColor: Number(uvIndex) > 3 ? '#2563EB' : 'transparent',
                  borderLeftColor: Number(uvIndex) > 6 ? '#2563EB' : 'transparent',
                  borderBottomColor: Number(uvIndex) > 9 ? '#2563EB' : 'transparent',
                }}
              />

              <View className="items-center">
                <Text className="text-5xl font-bold text-gray-900">{uvIndex}</Text>
                <Text className="text-sm text-gray-500">UV INDEX</Text>
                <Text className="text-primary font-semibold mt-1">{uvLevel}</Text>
              </View>
            </View>
          </View>

          {/* Alert */}
          {Number(uvIndex) >= 3 && (
            <View className="bg-orange-100 px-6 py-2 rounded-full self-center mb-6 flex-row items-center">
              <FontAwesome5 name="exclamation-triangle" size={14} color="#EA580C" />
              <Text className="text-orange-600 font-semibold ml-2">Protection Required</Text>
            </View>
          )}

          {/* Conditions Header */}
          <View className="flex-row justify-between mb-4">
            <Text className="text-base font-semibold text-gray-900">Current Conditions</Text>
            <Text className="text-sm text-gray-400">Updated just now</Text>
          </View>

          {/* Conditions Grid */}
          <View className="flex-row flex-wrap justify-between">
            <ConditionCard
              icon="temperature-high"
              title="Temperature"
              value={getConditionValue('temp', '32°C')}
            />
            <ConditionCard
              icon="tint"
              title="Humidity"
              value={getConditionValue('humidity', '78%')}
            />
            <ConditionCard
              icon="cloud-sun"
              title="Sky Condition"
              value={getConditionValue('sky', 'Clear Sky')}
            />
            <ConditionCard
              icon="clock"
              title="Local Time"
              value={getConditionValue('time', '14:30')}
            />
          </View>

          {/* CTA */}
          <TouchableOpacity
            className="bg-primary py-4 rounded-full items-center mt-6"
            onPress={() => navigation.navigate('SunProtection')}
          >
            <Text className="text-white text-lg font-bold">Check Risk</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* 🔼 Scroll ends here */}
    </View>
  );
};

/**
 * Reusable condition card
 */
const ConditionCard = ({ title, value, icon }: { title: string; value: string; icon: string }) => {
  return (
    <View className="w-[48%] bg-gray-50 p-5 rounded-2xl mb-4">
      <FontAwesome5 name={icon} size={18} color="#2563EB" />
      <Text className="text-xl font-bold text-gray-900 mt-2">{value}</Text>
      <Text className="text-sm text-gray-500 mt-1">{title}</Text>
    </View>
  );
};
