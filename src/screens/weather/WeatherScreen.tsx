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
  Animated,
  StyleSheet,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from '@react-native-community/geolocation';
import RNGeocoding from 'react-native-geocoding';
import Config from 'react-native-config';
import LinearGradient from 'react-native-linear-gradient';
import { weatherService } from '../../services/api/WeatherService';

if (Config.GOOGLE_MAPS_API_KEY) {
  RNGeocoding.init(Config.GOOGLE_MAPS_API_KEY);
}

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getUvColor = (uv: number): string => {
  if (uv <= 2) return '#22C55E';
  if (uv <= 5) return '#F59E0B';
  if (uv <= 7) return '#F97316';
  if (uv <= 10) return '#EF4444';
  return '#7C3AED';
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

interface WeatherScreenProps {
  onNavigateToSunProtection?: () => void;
}

export const WeatherScreen: React.FC<WeatherScreenProps> = ({ onNavigateToSunProtection }) => {
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
  const watchIdRef = useRef<number | null>(null);
  const weatherIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastGeocodeTsRef = useRef(0);
  const [locationTimezoneOffset, setLocationTimezoneOffset] = useState<number | null>(null);

  // Default fallback coordinates (Colombo, Sri Lanka)
  const DEFAULT_COORDS = { latitude: 6.9271, longitude: 79.8612 };

  // Minimum distance (meters) before re-fetching location name
  const MIN_MOVE_DISTANCE = 500;
  // Minimum interval (ms) between reverse-geocode calls
  const GEOCODE_THROTTLE = 30000;
  // Weather refresh interval (ms)
  const WEATHER_REFRESH_INTERVAL = 5 * 60 * 1000;

  // ── Live clock tick (uses location timezone when available) ──
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMountedRef.current) setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Haversine distance in meters between two coords
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Helper: fetch location name via reverse geocoding
  const resolveLocationName = useCallback(async (latitude: number, longitude: number) => {
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
        if (isMountedRef.current) {
          setLocationCity(displayCity);
          setLocationCountry(country);
          setLocationName(`${displayCity}, ${country}`);
        }
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      if (isMountedRef.current) {
        setLocationName('Unknown Location');
        setLocationCity('Unknown');
        setLocationCountry('');
      }
    }
  }, []);

  // Helper: fetch weather data from backend for given coordinates with retry
  const fetchWeatherForCoords = useCallback(async (latitude: number, longitude: number, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (!isMountedRef.current) return;

        const response = await weatherService.getWeatherData(latitude, longitude);
        console.log('Weather response:', response);

        if (!isMountedRef.current) return;

        const responseData = response?.data || response;
        if (responseData) {
          setWeatherData(responseData);

          // Extract timezone offset (seconds from UTC) if available
          const tzOffset = responseData.utcOffsetSeconds ?? responseData.utc_offset_seconds
            ?? responseData.timezone_offset ?? responseData.timezoneOffset ?? null;
          if (tzOffset !== null && tzOffset !== undefined) {
            setLocationTimezoneOffset(tzOffset);
          }

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
        break;
      } catch (err: any) {
        const isAbortError = err?.message === 'Aborted' || err?.name === 'AbortError';
        console.warn(
          `Weather fetch attempt ${attempt + 1}/${retries + 1} failed:`,
          err?.message || err,
        );

        if (attempt < retries && isAbortError) {
          await new Promise<void>(resolve => setTimeout(() => resolve(), 1000 * (attempt + 1)));
          continue;
        }

        console.error('Weather fetch error after all retries:', err);
      }
    }

    if (isMountedRef.current) {
      setLoading(false);
    }
  }, []);

  // Handle a new position from watchPosition
  const handleNewPosition = useCallback(async (latitude: number, longitude: number) => {
    if (!isMountedRef.current) return;

    const prev = lastCoordsRef.current;
    const now = Date.now();

    // Only re-geocode if moved significantly or enough time has passed
    const shouldReGeocode =
      !prev ||
      getDistance(prev.latitude, prev.longitude, latitude, longitude) > MIN_MOVE_DISTANCE ||
      now - lastGeocodeTsRef.current > GEOCODE_THROTTLE;

    if (shouldReGeocode) {
      lastGeocodeTsRef.current = now;
      await resolveLocationName(latitude, longitude);
    }

    // Always update coords and fetch weather on significant move or first load
    const shouldFetchWeather =
      !prev ||
      getDistance(prev.latitude, prev.longitude, latitude, longitude) > MIN_MOVE_DISTANCE;

    if (shouldFetchWeather) {
      lastCoordsRef.current = { latitude, longitude };
      await fetchWeatherForCoords(latitude, longitude);
    }
  }, [resolveLocationName, fetchWeatherForCoords]);

  // Fallback: use default coordinates when geolocation completely fails
  const fetchWeatherWithDefaults = useCallback(async () => {
    console.log('Using default location (Colombo, Sri Lanka)');
    if (isMountedRef.current) {
      setLocationName('Colombo, Sri Lanka (Default)');
      setLocationCity('Colombo');
      setLocationCountry('Sri Lanka');
    }
    lastCoordsRef.current = DEFAULT_COORDS;
    await fetchWeatherForCoords(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
  }, [fetchWeatherForCoords]);

  useEffect(() => {
    isMountedRef.current = true;

    const startLocationTracking = async () => {
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
            await fetchWeatherWithDefaults();
            return;
          }
        }

        // Get initial position quickly with high accuracy
        Geolocation.getCurrentPosition(
          async position => {
            if (!isMountedRef.current) return;
            const { latitude, longitude } = position.coords;
            await handleNewPosition(latitude, longitude);
          },
          _highAccuracyError => {
            if (!isMountedRef.current) return;
            console.warn('High accuracy geolocation failed, trying low accuracy...', _highAccuracyError);

            Geolocation.getCurrentPosition(
              async position => {
                if (!isMountedRef.current) return;
                const { latitude, longitude } = position.coords;
                await handleNewPosition(latitude, longitude);
              },
              async _lowAccuracyError => {
                if (!isMountedRef.current) return;
                console.warn('Low accuracy also failed, using defaults.', _lowAccuracyError);
                await fetchWeatherWithDefaults();
              },
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
            );
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
        );

        // Start watching position for real-time location updates
        watchIdRef.current = Geolocation.watchPosition(
          position => {
            if (!isMountedRef.current) return;
            const { latitude, longitude } = position.coords;
            handleNewPosition(latitude, longitude);
          },
          error => {
            console.warn('watchPosition error:', error);
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 100,
            interval: 30000,
            fastestInterval: 15000,
          },
        );

        // Periodic weather refresh even if location doesn't change
        weatherIntervalRef.current = setInterval(() => {
          if (isMountedRef.current && lastCoordsRef.current) {
            const { latitude, longitude } = lastCoordsRef.current;
            fetchWeatherForCoords(latitude, longitude);
          }
        }, WEATHER_REFRESH_INTERVAL);
      } catch (err) {
        console.error('Setup error:', err);
        if (isMountedRef.current) {
          await fetchWeatherWithDefaults();
        }
      }
    };

    startLocationTracking();

    return () => {
      isMountedRef.current = false;
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (weatherIntervalRef.current) {
        clearInterval(weatherIntervalRef.current);
        weatherIntervalRef.current = null;
      }
    };
  }, [handleNewPosition, fetchWeatherWithDefaults, fetchWeatherForCoords]);

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

  // ── Time formatting (location timezone when available) ──
  const locationTime = (() => {
    if (locationTimezoneOffset !== null) {
      // Convert current UTC time + location timezone offset to get location local time
      const utcMs = currentTime.getTime() + currentTime.getTimezoneOffset() * 60000;
      return new Date(utcMs + locationTimezoneOffset * 1000);
    }
    return currentTime;
  })();

  const hours = locationTime.getHours();
  const minutes = locationTime.getMinutes();
  const seconds = locationTime.getSeconds();
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
      <View style={ws.loadingContainer}>
        <View style={ws.loadingInner}>
          <ActivityIndicator size="large" color="#F5840E" />
          <Text style={ws.loadingText}>Fetching weather data...</Text>
        </View>
      </View>
    );
  }

  const tempValue = getConditionValue('temp', '32');
  const humidityValue = getConditionValue('humidity', '78');

  return (
    <View style={ws.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ws.scrollContent}>
        {/* Header */}
        <View style={ws.header}>
          <View style={ws.headerLeft}>
            <View style={ws.headerLabelRow}>
              <Text style={ws.headerLabel}>Current Location</Text>
              <View style={ws.trackingPill}>
                <View style={ws.trackingDot} />
                <Text style={ws.trackingText}>Live</Text>
              </View>
            </View>
            <View style={ws.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#F5840E" />
              <Text style={ws.locationCity} numberOfLines={1}>{locationCity || 'Detecting...'}</Text>
            </View>
            {locationCountry ? <Text style={ws.locationCountry}>{locationCountry}</Text> : null}
          </View>
          <TouchableOpacity
            style={ws.profileBtn}
            onPress={() => navigation.navigate('HealthProfileLanding')}
          >
            <FontAwesome5 name="user-shield" size={16} color="#F5840E" />
          </TouchableOpacity>
        </View>

        {/* UV Index Ring Card */}
        <View style={ws.uvCard}>
          <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={ringSize} height={ringSize} style={StyleSheet.absoluteFillObject}>
              <Circle
                cx={ringSize / 2} cy={ringSize / 2} r={radius}
                stroke="#F3F4F6" strokeWidth={strokeWidth} fill="none"
              />
              <Circle
                cx={ringSize / 2} cy={ringSize / 2} r={radius}
                stroke={uvColor} strokeWidth={strokeWidth} fill="none"
                strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round" rotation="-90" origin={`${ringSize / 2}, ${ringSize / 2}`}
              />
            </Svg>
            <View style={ws.uvCenter}>
              <Text style={[ws.uvNumber, { color: uvColor }]}>{uvIndex}</Text>
              <Text style={ws.uvLabel}>UV INDEX</Text>
              <View style={[ws.uvPill, { backgroundColor: getUvBg(uvNum), borderColor: uvColor }]}>
                <Text style={[ws.uvPillText, { color: uvColor }]}>{uvLevel}</Text>
              </View>
            </View>
          </View>

          {/* Alert Banner */}
          <LinearGradient
            colors={alertInfo.colors}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={ws.alertBanner}
          >
            <MaterialCommunityIcons name={alertInfo.icon} size={22} color="#FFFFFF" />
            <Text style={ws.alertText}>{alertInfo.text}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Current Conditions */}
        <View style={ws.conditionsSection}>
          <View style={ws.conditionsHeader}>
            <Text style={ws.sectionTitle}>Current Conditions</Text>
            <View style={ws.liveRow}>
              <View style={ws.liveDot} />
              <Text style={ws.liveText}>Live</Text>
            </View>
          </View>

          {/* Top row: Temp & Humidity */}
          <View style={ws.cardRow}>
            <View style={ws.condCard}>
              <View style={ws.condCardTop}>
                <View style={[ws.condIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialCommunityIcons name="thermometer" size={22} color="#3B82F6" />
                </View>
                <Text style={ws.condTag}>TEMP</Text>
              </View>
              <Text style={ws.condValue}>{tempValue}<Text style={ws.condUnit}>°C</Text></Text>
              <Text style={ws.condLabel}>Temperature</Text>
            </View>

            <View style={ws.condCard}>
              <View style={ws.condCardTop}>
                <View style={[ws.condIconWrap, { backgroundColor: '#F0F9FF' }]}>
                  <MaterialCommunityIcons name="water-percent" size={22} color="#0EA5E9" />
                </View>
                <Text style={ws.condTag}>HUM</Text>
              </View>
              <Text style={ws.condValue}>{humidityValue}<Text style={ws.condUnit}>%</Text></Text>
              <Text style={ws.condLabel}>Humidity</Text>
            </View>
          </View>

          {/* Bottom row: Sky & Clock */}
          <View style={ws.cardRow}>
            <View style={ws.condCard}>
              <View style={ws.condCardTop}>
                <View style={[ws.condIconWrap, { backgroundColor: '#FFF7ED' }]}>
                  <MaterialCommunityIcons name={getSkyIcon()} size={22} color="#F97316" />
                </View>
                <Text style={ws.condTag}>SKY</Text>
              </View>
              <Text style={ws.condValueSm} numberOfLines={1}>{skyCondition}</Text>
              <Text style={ws.condLabel}>Condition</Text>
            </View>

            <View style={ws.condCard}>
              <View style={ws.condCardTop}>
                <View style={[ws.condIconWrap, { backgroundColor: '#F5F3FF' }]}>
                  <MaterialCommunityIcons name="clock-outline" size={22} color="#7C3AED" />
                </View>
                <Text style={ws.condTag}>LOCAL</Text>
              </View>
              <View style={ws.clockRow}>
                <Text style={ws.clockTime}>{pad(displayHour)}:{pad(minutes)}</Text>
                <Text style={ws.clockSec}>:{pad(seconds)}</Text>
                <Text style={ws.clockAmPm}>{ampm}</Text>
              </View>
              <Text style={ws.condLabel}>{locationTimezoneOffset !== null ? `${locationCity || 'Location'} Time` : 'Local Time'}</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View style={ws.ctaSection}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => onNavigateToSunProtection ? onNavigateToSunProtection() : navigation.navigate('SunProtection')}>
            <LinearGradient
              colors={['#F5840E', '#E06D00']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={ws.ctaBtn}
            >
              <MaterialCommunityIcons name="shield-sun" size={20} color="#FFFFFF" />
              <Text style={ws.ctaText}>Check Sun Risk & Protection</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const ws = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  loadingInner: { alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#9CA3AF', fontSize: 15 },
  header: {
    backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: (StatusBar.currentHeight || 0) + 8, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft: { flex: 1 },
  headerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  trackingPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, gap: 4,
  },
  trackingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  trackingText: { fontSize: 10, fontWeight: '700', color: '#22C55E' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationCity: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginLeft: 4 },
  locationCountry: { fontSize: 13, color: '#9CA3AF', marginLeft: 24 },
  profileBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center',
  },
  uvCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 12, borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  uvCenter: { alignItems: 'center' },
  uvNumber: { fontSize: 48, fontWeight: '900' },
  uvLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 2 },
  uvPill: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  uvPillText: { fontSize: 13, fontWeight: '800' },
  alertBanner: {
    marginTop: 20, width: '100%', borderRadius: 16, paddingHorizontal: 20,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
  },
  alertText: { color: '#ffffff', fontWeight: '800', fontSize: 14, flex: 1, marginLeft: 12 },
  conditionsSection: { paddingHorizontal: 16, marginTop: 20 },
  conditionsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937' },
  liveRow: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 6 },
  liveText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  condCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  condCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  condIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  condTag: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  condValue: { fontSize: 30, fontWeight: '900', color: '#0f172a', marginTop: 12 },
  condValueSm: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  condUnit: { fontSize: 16, color: '#9CA3AF' },
  condLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  clockRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  clockTime: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  clockSec: { fontSize: 12, fontWeight: '800', color: '#9CA3AF' },
  clockAmPm: { fontSize: 12, fontWeight: '800', color: '#7C3AED', marginLeft: 4 },
  ctaSection: { paddingHorizontal: 16, marginTop: 8 },
  ctaBtn: {
    paddingVertical: 16, borderRadius: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#F5840E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  ctaText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
