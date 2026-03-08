import { MainStackParamList } from '@navigation/MainNavigator';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from '@react-native-community/geolocation';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';
import LinearGradient from 'react-native-linear-gradient';
import { weatherService } from '../../services/api/WeatherService';

// Initialize geocoding with API key
if (Config.GOOGLE_MAPS_API_KEY) {
  RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY);
}

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

// ── UV level color mapping ──────────────────────────────────
const getUvColor = (uv: number): string => {
  if (uv <= 2) return '#22C55E';   // green – Low
  if (uv <= 5) return '#F59E0B';   // amber – Moderate
  if (uv <= 7) return '#F97316';   // orange – High
  if (uv <= 10) return '#EF4444';  // red – Very High
  return '#7C3AED';                // purple – Extreme
};

const getUvGradient = (uv: number): string[] => {
  if (uv <= 2) return ['#22C55E', '#16A34A'];
  if (uv <= 5) return ['#FBBF24', '#F59E0B'];
  if (uv <= 7) return ['#FB923C', '#F97316'];
  if (uv <= 10) return ['#F87171', '#EF4444'];
  return ['#A78BFA', '#7C3AED'];
};

const getUvBg = (uv: number): string => {
  if (uv <= 2) return '#F0FDF4';
  if (uv <= 5) return '#FFFBEB';
  if (uv <= 7) return '#FFF7ED';
  if (uv <= 10) return '#FEF2F2';
  return '#F5F3FF';
};

const getAlertInfo = (uv: number) => {
  if (uv <= 2) return { text: 'No Protection Needed', icon: 'shield-check', colors: ['#22C55E', '#16A34A'] };
  if (uv <= 5) return { text: 'Protection Recommended', icon: 'shield-alert', colors: ['#FBBF24', '#F59E0B'] };
  if (uv <= 7) return { text: 'Protection Required', icon: 'shield-alert', colors: ['#FB923C', '#EA580C'] };
  if (uv <= 10) return { text: 'Extra Protection Needed', icon: 'alert-octagon', colors: ['#F87171', '#DC2626'] };
  return { text: 'Avoid Sun Exposure!', icon: 'alert-decagram', colors: ['#A78BFA', '#7C3AED'] };
};

export const WeatherScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('Detecting location...');
  const [locationCity, setLocationCity] = useState('');
  const [locationCountry, setLocationCountry] = useState('');
  const [uvIndex, setUvIndex] = useState<number | string>('--');
  const [uvLevel, setUvLevel] = useState('Loading...');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Track whether the component is still mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Default fallback coordinates (Colombo, Sri Lanka)
  const DEFAULT_COORDS = { latitude: 6.9271, longitude: 79.8612 };

  // ── Live clock tick ───────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMountedRef.current) setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper: fetch location name via reverse geocoding
  const resolveLocationName = async (latitude: number, longitude: number) => {
    try {
      const results = await RNGeocoding.from(latitude, longitude);
      if (results && results.results && results.results.length > 0) {
        const address = results.results[0];
        const components = address.address_components || [];

        let city = '';
        let country = '';
        let area = '';

        for (const comp of components) {
          const types = comp.types || [];
          if (types.includes('locality')) city = comp.long_name;
          else if (types.includes('administrative_area_level_1') && !city) area = comp.long_name;
          if (types.includes('country')) country = comp.long_name;
        }

        const displayCity = city || area || 'Unknown';
        setLocationCity(displayCity);
        setLocationCountry(country);
        setLocationName(`${displayCity}, ${country}`);
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      setLocationName('Unknown Location');
      setLocationCity('Unknown');
      setLocationCountry('');
    }
  };

  // Helper: fetch weather data from backend for given coordinates with retry
  const fetchWeatherForCoords = async (latitude: number, longitude: number, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (!isMountedRef.current) return;

        const response = await weatherService.getWeatherData(latitude, longitude);
        console.log('Weather response:', response);

        if (!isMountedRef.current) return;

        // The response from handleApiResponse is the backend's JSON body
        // which has { success, data } structure
        const responseData = response?.data || response;
        if (responseData) {
          setWeatherData(responseData);

          const fetchedUvIndex = responseData.uvIndex || responseData.uv_index || 0;
          setUvIndex(fetchedUvIndex);

          if (responseData.uvLevel || responseData.uv_level) {
            setUvLevel(responseData.uvLevel || responseData.uv_level);
          } else {
            if (fetchedUvIndex <= 2) setUvLevel('Low');
            else if (fetchedUvIndex <= 5) setUvLevel('Moderate');
            else if (fetchedUvIndex <= 7) setUvLevel('High');
            else if (fetchedUvIndex <= 10) setUvLevel('Very High');
            else setUvLevel('Extreme');
          }
        }
        // Success — break out of retry loop
        break;
      } catch (err: any) {
        const isAbortError = err?.message === 'Aborted' || err?.name === 'AbortError';
        console.warn(
          `Weather fetch attempt ${attempt + 1}/${retries + 1} failed:`,
          err?.message || err,
        );

        if (attempt < retries && isAbortError) {
          // Wait before retrying (exponential backoff)
          await new Promise<void>(resolve => setTimeout(() => resolve(), 1000 * (attempt + 1)));
          continue;
        }

        // Final attempt failed — log but don't crash
        console.error('Weather fetch error after all retries:', err);
      }
    }

    if (isMountedRef.current) {
      setLoading(false);
    }
  };

  // Fallback: use default coordinates when geolocation completely fails
  const fetchWeatherWithDefaults = async () => {
    console.log('Using default location (Colombo, Sri Lanka)');
    setLocationName('Colombo, Sri Lanka (Default)');
    await fetchWeatherForCoords(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
  };

  useEffect(() => {
    isMountedRef.current = true;

    const fetchWeather = async () => {
      try {
        if (!isMountedRef.current) return;
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
            if (isMountedRef.current) setLocationName('Permission denied');
            // Still fetch weather with default coordinates
            await fetchWeatherWithDefaults();
            return;
          }
        }

        // Attempt 1: High accuracy (GPS via FusedLocationProvider)
        Geolocation.getCurrentPosition(
          async position => {
            if (!isMountedRef.current) return;
            const { latitude, longitude } = position.coords;
            await resolveLocationName(latitude, longitude);
            await fetchWeatherForCoords(latitude, longitude);
          },
          _highAccuracyError => {
            if (!isMountedRef.current) return;
            console.warn(
              'High accuracy geolocation failed, retrying with low accuracy...',
              _highAccuracyError,
            );

            // Attempt 2: Low accuracy (network-based location)
            Geolocation.getCurrentPosition(
              async position => {
                if (!isMountedRef.current) return;
                const { latitude, longitude } = position.coords;
                await resolveLocationName(latitude, longitude);
                await fetchWeatherForCoords(latitude, longitude);
              },
              async _lowAccuracyError => {
                if (!isMountedRef.current) return;
                console.warn(
                  'Low accuracy geolocation also failed, using default location.',
                  _lowAccuracyError,
                );
                // Attempt 3: Fallback to default coordinates
                await fetchWeatherWithDefaults();
              },
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
            );
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
        );
      } catch (err) {
        console.error('Setup error:', err);
        if (isMountedRef.current) {
          await fetchWeatherWithDefaults();
        }
      }
    };

    fetchWeather();

    // Cleanup: mark as unmounted so callbacks don't update state
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper to format conditions from data
  const getConditionValue = (type: string, defaultValue: string) => {
    if (!weatherData) return defaultValue;

    switch (type) {
      case 'temp':
        return weatherData.temperature
          ? `${weatherData.temperature?.degrees}`
          : weatherData.temp_c
          ? `${weatherData.temp_c}`
          : defaultValue;
      case 'humidity':
        return weatherData.relativeHumidity ? `${weatherData.relativeHumidity}` : defaultValue;
      case 'sky':
        return weatherData.cloudCover
          ? weatherData.cloudCover > 60
            ? 'Cloudy'
            : weatherData.cloudCover > 30
            ? 'Partly Cloudy'
            : 'Clear Sky'
          : defaultValue;
      default:
        return defaultValue;
    }
  };

  // ── UV ring dimensions ────────────────────────────────────
  const screenWidth = Dimensions.get('window').width;
  const ringSize = screenWidth * 0.55;
  const strokeWidth = 14;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const uvNum = typeof uvIndex === 'number' ? uvIndex : 0;
  const progress = Math.min(uvNum / 12, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const uvColor = getUvColor(uvNum);
  const alertInfo = getAlertInfo(uvNum);

  // ── Time formatting ───────────────────────────────────────
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  const pad = (n: number) => n.toString().padStart(2, '0');

  // ── Sky condition icon ────────────────────────────────────
  const skyCondition = getConditionValue('sky', 'Clear Sky');
  const getSkyIcon = () => {
    if (hours >= 19 || hours < 6) return 'weather-night';
    switch (skyCondition) {
      case 'Cloudy': return 'weather-cloudy';
      case 'Partly Cloudy': return 'weather-partly-cloudy';
      default: return 'weather-sunny';
    }
  };

  if (loading && !weatherData) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <View className="items-center">
          <ActivityIndicator size="large" color="#F5840E" />
          <Text className="mt-4 text-gray-500 font-gilroy-medium text-base">
            Fetching weather data...
          </Text>
        </View>
      </View>
    );
  }

  const tempValue = getConditionValue('temp', '32');
  const humidityValue = getConditionValue('humidity', '78');

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Header with location ─────────────────────────── */}
        <View className="bg-white px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs font-gilroy-medium text-gray-400 uppercase tracking-wider">
                Current Location
              </Text>
              <View className="flex-row items-center mt-1">
                <MaterialCommunityIcons name="map-marker" size={20} color="#F5840E" />
                <Text className="text-lg font-gilroy-bold text-gray-900 ml-1" numberOfLines={1}>
                  {locationCity || 'Detecting...'}
                </Text>
              </View>
              {locationCountry ? (
                <Text className="text-sm font-gilroy-regular text-gray-400 ml-6">
                  {locationCountry}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              className="bg-gray-100 w-10 h-10 rounded-full items-center justify-center"
              onPress={() => navigation.navigate('HealthProfileLanding')}
            >
              <FontAwesome5 name="user-shield" size={16} color="#F5840E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── UV Index Ring Section ────────────────────────── */}
        <View className="bg-white mx-4 mt-3 rounded-3xl px-5 py-6 items-center"
          style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8 }}>

          <View style={{ width: ringSize, height: ringSize }} className="items-center justify-center">
            {/* Background ring */}
            <Svg width={ringSize} height={ringSize} style={{ position: 'absolute' }}>
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke="#F3F4F6"
                strokeWidth={strokeWidth}
                fill="none"
              />
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke={uvColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${ringSize / 2}, ${ringSize / 2}`}
              />
            </Svg>

            {/* Center content */}
            <View className="items-center">
              <Text style={{ fontSize: 48, color: uvColor }} className="font-gilroy-bold">
                {uvIndex}
              </Text>
              <Text className="text-xs font-gilroy-medium text-gray-400 tracking-widest">
                UV INDEX
              </Text>
              <View
                style={{ backgroundColor: getUvBg(uvNum), borderColor: uvColor, borderWidth: 1 }}
                className="mt-2 px-4 py-1 rounded-full"
              >
                <Text style={{ color: uvColor }} className="text-sm font-gilroy-bold">
                  {uvLevel}
                </Text>
              </View>
            </View>
          </View>

          {/* Alert Banner */}
          <LinearGradient
            colors={alertInfo.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="mt-5 w-full rounded-2xl px-5 py-3 flex-row items-center"
          >
            <MaterialCommunityIcons name={alertInfo.icon} size={22} color="#FFFFFF" />
            <Text className="text-white font-gilroy-bold text-sm ml-3 flex-1">
              {alertInfo.text}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* ── Current Conditions ───────────────────────────── */}
        <View className="px-4 mt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-gilroy-bold text-gray-800">Current Conditions</Text>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-success mr-2" />
              <Text className="text-xs font-gilroy-medium text-gray-400">Live</Text>
            </View>
          </View>

          {/* ── Top row: Temp & Humidity ── */}
          <View className="flex-row mb-3">
            {/* Temperature Card */}
            <View className="flex-1 bg-white rounded-2xl p-4 mr-2"
              style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}>
              <View className="flex-row items-center justify-between">
                <View className="bg-blue-50 w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: '#EFF6FF' }}>
                  <MaterialCommunityIcons name="thermometer" size={22} color="#3B82F6" />
                </View>
                <Text className="text-xs font-gilroy-medium text-gray-400">TEMP</Text>
              </View>
              <Text className="text-3xl font-gilroy-bold text-gray-900 mt-3">
                {tempValue}
                <Text className="text-lg text-gray-400">°C</Text>
              </Text>
              <Text className="text-xs font-gilroy-regular text-gray-400 mt-1">Temperature</Text>
            </View>

            {/* Humidity Card */}
            <View className="flex-1 bg-white rounded-2xl p-4 ml-2"
              style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}>
              <View className="flex-row items-center justify-between">
                <View className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: '#F0F9FF' }}>
                  <MaterialCommunityIcons name="water-percent" size={22} color="#0EA5E9" />
                </View>
                <Text className="text-xs font-gilroy-medium text-gray-400">HUM</Text>
              </View>
              <Text className="text-3xl font-gilroy-bold text-gray-900 mt-3">
                {humidityValue}
                <Text className="text-lg text-gray-400">%</Text>
              </Text>
              <Text className="text-xs font-gilroy-regular text-gray-400 mt-1">Humidity</Text>
            </View>
          </View>

          {/* ── Bottom row: Sky & Clock ── */}
          <View className="flex-row">
            {/* Sky Condition Card */}
            <View className="flex-1 bg-white rounded-2xl p-4 mr-2"
              style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}>
              <View className="flex-row items-center justify-between">
                <View className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: '#FFF7ED' }}>
                  <MaterialCommunityIcons name={getSkyIcon()} size={22} color="#F97316" />
                </View>
                <Text className="text-xs font-gilroy-medium text-gray-400">SKY</Text>
              </View>
              <Text className="text-lg font-gilroy-bold text-gray-900 mt-3" numberOfLines={1}>
                {skyCondition}
              </Text>
              <Text className="text-xs font-gilroy-regular text-gray-400 mt-1">Condition</Text>
            </View>

            {/* Clock Card */}
            <View className="flex-1 bg-white rounded-2xl p-4 ml-2"
              style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}>
              <View className="flex-row items-center justify-between">
                <View className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: '#F5F3FF' }}>
                  <MaterialCommunityIcons name="clock-outline" size={22} color="#7C3AED" />
                </View>
                <Text className="text-xs font-gilroy-medium text-gray-400">LOCAL</Text>
              </View>
              <View className="flex-row items-baseline mt-3">
                <Text className="text-2xl font-gilroy-bold text-gray-900">
                  {pad(displayHour)}:{pad(minutes)}
                </Text>
                <Text className="text-xs font-gilroy-bold text-gray-400 ml-1">
                  :{pad(seconds)}
                </Text>
                <Text className="text-xs font-gilroy-bold ml-1" style={{ color: '#7C3AED' }}>
                  {ampm}
                </Text>
              </View>
              <Text className="text-xs font-gilroy-regular text-gray-400 mt-1">Local Time</Text>
            </View>
          </View>
        </View>

        {/* ── CTA Button ───────────────────────────────────── */}
        <View className="px-4 mt-6">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SunProtection')}
          >
            <LinearGradient
              colors={['#F5840E', '#E06D00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-4 rounded-2xl items-center flex-row justify-center"
              style={{ elevation: 4, shadowColor: '#F5840E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
            >
              <MaterialCommunityIcons name="shield-sun" size={20} color="#FFFFFF" />
              <Text className="text-white text-base font-gilroy-bold ml-2">
                Check Sun Risk & Protection
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
