import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userService } from '@services/api/UserService';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from '@react-native-community/geolocation';
import RNGeocoding from 'react-native-geocoding';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@navigation/MainNavigator';

type SafetyAdvisorScreenNavigationProp = NativeStackNavigationProp<
  MainStackParamList,
  'SafetyAdvisor'
>;

type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';

interface SafetyTip {
  icon: string;
  title: string;
  description: string;
}

const SAFETY_TIPS: Record<RiskLevel, SafetyTip[]> = {
  Low: [
    {
      icon: 'white-balance-sunny',
      title: 'Sunscreen SPF 30+ (Optional)',
      description: 'If outdoors for long periods, apply once.',
    },
    { icon: 'sunglasses', title: 'Sunglasses', description: 'UV protection is still helpful.' },
    {
      icon: 'emoticon-happy',
      title: 'Enjoy Outdoors',
      description: 'Low risk; normal activities are fine.',
    },
  ],
  Moderate: [
    {
      icon: 'white-balance-sunny',
      title: 'Sunscreen SPF 30+',
      description: 'Apply 15–20 min before going out; reapply every 2–3 hours.',
    },
    {
      icon: 'tshirt-crew',
      title: 'Protective Clothing',
      description: 'Light long sleeves if staying out.',
    },
    { icon: 'clock-alert-outline', title: 'Midday Caution', description: 'Reduce exposure around noon.' },
  ],
  High: [
    {
      icon: 'white-balance-sunny',
      title: 'Sunscreen SPF 50+',
      description: 'Reapply every 2 hours and after sweating/swimming.',
    },
    { icon: 'hat-fedora', title: 'Protective Gear', description: 'Wide-brim hat + UV sunglasses.' },
    {
      icon: 'weather-sunny-off',
      title: 'Seek Shade',
      description: 'Avoid direct sun between 11 AM and 3 PM.',
    },
    { icon: 'water', title: 'Stay Hydrated', description: 'Drink water regularly.' },
  ],
  'Very High': [
    {
      icon: 'white-balance-sunny',
      title: 'Sunscreen SPF 50+',
      description: 'Apply liberally every 2 hours; especially after swimming.',
    },
    {
      icon: 'hat-fedora',
      title: 'Protective Gear',
      description: 'Wide-brim hat and UV-blocking sunglasses.',
    },
    {
      icon: 'weather-sunny-off',
      title: 'Seek Shade',
      description: 'Avoid direct sun between 11 AM and 3 PM.',
    },
    {
      icon: 'water',
      title: 'Stay Hydrated',
      description: 'Heat risk is higher; drink water frequently.',
    },
    {
      icon: 'cancel',
      title: 'Limit Outdoor Time',
      description: 'Prefer indoor/covered areas during peak hours.',
    },
  ],
  Extreme: [
    {
      icon: 'home',
      title: 'Avoid Sun Exposure',
      description: 'Stay indoors during peak UV hours if possible.',
    },
    {
      icon: 'white-balance-sunny',
      title: 'Maximum Protection SPF 50+',
      description: 'Apply and reapply strictly every 2 hours.',
    },
    {
      icon: 'tshirt-crew',
      title: 'Full Coverage Clothing',
      description: 'Long sleeves, hat, sunglasses.',
    },
    {
      icon: 'alert',
      title: 'Heat Safety',
      description: 'Watch for dizziness/headache; take cool breaks.',
    },
    { icon: 'bell-ring', title: 'Enable Alerts', description: 'Turn on high UV alerts for safety.' },
  ],
};

// ── Risk color config ──────────────────────────────────────
const RISK_COLORS: Record<RiskLevel, { color: string; gradient: string[]; bgLight: string }> = {
  Low: { color: '#22C55E', gradient: ['#22C55E', '#16A34A'], bgLight: '#F0FDF4' },
  Moderate: { color: '#F59E0B', gradient: ['#FBBF24', '#F59E0B'], bgLight: '#FFFBEB' },
  High: { color: '#F97316', gradient: ['#FB923C', '#EA580C'], bgLight: '#FFF7ED' },
  'Very High': { color: '#EF4444', gradient: ['#F87171', '#DC2626'], bgLight: '#FEF2F2' },
  Extreme: { color: '#7C3AED', gradient: ['#A78BFA', '#7C3AED'], bgLight: '#F5F3FF' },
};

const getUvColor = (uv: number) => {
  if (uv <= 2) return '#22C55E';
  if (uv <= 5) return '#F59E0B';
  if (uv <= 7) return '#F97316';
  if (uv <= 10) return '#EF4444';
  return '#7C3AED';
};

const getUvLabel = (uv: number) => {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Mod';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'V.High';
  return 'Ext';
};

// ── Generate dynamic hourly forecast from current UV ──────
const generateForecast = (currentUv: number): { time: string; uv: number; isNow: boolean }[] => {
  const now = new Date();
  const currentHour = now.getHours();
  const items: { time: string; uv: number; isNow: boolean }[] = [];

  for (let offset = -1; offset <= 5; offset++) {
    const hour = currentHour + offset;
    if (hour < 5 || hour > 20) continue;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const isNow = offset === 0;

    // Simple UV curve: peaks at solar noon (~13:00), drops toward morning/evening
    let uvEstimate: number;
    if (isNow) {
      uvEstimate = currentUv;
    } else {
      const distFromSolarNoon = Math.abs(hour - 13);
      const factor = Math.max(0, 1 - distFromSolarNoon * 0.18);
      uvEstimate = Math.round(currentUv * factor);
    }

    items.push({
      time: isNow ? 'Now' : `${displayHour} ${ampm}`,
      uv: Math.max(0, Math.min(12, uvEstimate)),
      isNow,
    });
  }
  return items;
};

const SafetyAdvisorScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<SafetyAdvisorScreenNavigationProp>();

  const [isAlertsEnabled, setIsAlertsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locationCity, setLocationCity] = useState('');
  const [locationCountry, setLocationCountry] = useState('');

  // ── Load alert preference ───────────────────────────────
  useEffect(() => {
    const checkAlertsStatus = async () => {
      try {
        const storedValue = await AsyncStorage.getItem('HIGH_UV_ALERTS_ENABLED');
        if (storedValue !== null) {
          setIsAlertsEnabled(storedValue === 'true');
        }
      } catch (error) {
        console.error('Failed to load high UV alerts preference:', error);
      }
    };
    checkAlertsStatus();
  }, []);

  // ── Resolve actual user location ────────────────────────
  useEffect(() => {
    const resolveLocation = async () => {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }
        Geolocation.getCurrentPosition(
          async position => {
            const { latitude, longitude } = position.coords;
            try {
              const results = await RNGeocoding.from(latitude, longitude);
              if (results?.results?.length > 0) {
                const components = results.results[0].address_components || [];
                let city = '';
                let country = '';
                let area = '';
                for (const comp of components) {
                  const types = comp.types || [];
                  if (types.includes('locality')) city = comp.long_name;
                  else if (types.includes('administrative_area_level_1') && !city) area = comp.long_name;
                  if (types.includes('country')) country = comp.long_name;
                }
                setLocationCity(city || area || 'Current Location');
                setLocationCountry(country);
              }
            } catch {
              setLocationCity('Current Location');
            }
          },
          () => {
            setLocationCity('Current Location');
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
      } catch {
        setLocationCity('Current Location');
      }
    };
    resolveLocation();
  }, []);

  const toggleAlerts = async () => {
    try {
      setIsLoading(true);
      const newValue = !isAlertsEnabled;
      await AsyncStorage.setItem('HIGH_UV_ALERTS_ENABLED', String(newValue));
      setIsAlertsEnabled(newValue);
      await userService.updatePreferences({ highUVAlerts: newValue } as any);
    } catch (error) {
      console.error('Failed to toggle high UV alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Get params ──────────────────────────────────────────
  const uvIndex = route.params?.uvIndex ?? 8;
  const initialRiskLevel = route.params?.riskLevel;

  const getRiskLevel = (uv: number): RiskLevel => {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
  };

  const riskLevelRaw = initialRiskLevel || getRiskLevel(uvIndex);
  const riskLevel: RiskLevel =
    riskLevelRaw.toLowerCase() === 'low'
      ? 'Low'
      : riskLevelRaw.toLowerCase() === 'moderate'
      ? 'Moderate'
      : riskLevelRaw.toLowerCase() === 'high'
      ? 'High'
      : riskLevelRaw.toLowerCase() === 'very high' || riskLevelRaw.toLowerCase() === 'v. high'
      ? 'Very High'
      : 'Extreme';

  const tips = SAFETY_TIPS[riskLevel];
  const riskColors = RISK_COLORS[riskLevel];
  const forecast = generateForecast(uvIndex);
  const locationDisplay = locationCity
    ? `${locationCity}${locationCountry ? `, ${locationCountry}` : ''}`
    : 'Detecting...';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* ── Header ─────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-white"
        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#374151" />
        </TouchableOpacity>
        <Text className="text-base font-gilroy-bold text-gray-900">Safety Advisor</Text>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          onPress={toggleAlerts}
        >
          <MaterialCommunityIcons
            name={isAlertsEnabled ? 'bell-ring' : 'bell-outline'}
            size={20}
            color={isAlertsEnabled ? '#F5840E' : '#374151'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── UV Hero Card ──────────────────────────────────── */}
        <View className="mx-4 mt-3 rounded-3xl overflow-hidden bg-white"
          style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }}>

          {/* Top color strip */}
          <LinearGradient colors={riskColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 4 }} />

          <View className="px-5 pt-4 pb-5">
            {/* Location pill */}
            <View className="self-center flex-row items-center rounded-full px-4 py-1.5 mb-4"
              style={{ backgroundColor: riskColors.bgLight, borderWidth: 1, borderColor: riskColors.color + '25' }}>
              <MaterialCommunityIcons name="map-marker" size={14} color={riskColors.color} />
              <Text className="ml-1.5 text-xs font-gilroy-bold uppercase tracking-wider"
                style={{ color: riskColors.color }}>
                {locationDisplay}
              </Text>
            </View>

            {/* UV Index display */}
            <View className="items-center">
              <View className="flex-row items-baseline">
                <Text className="text-base font-gilroy-medium text-gray-400">UV Index</Text>
              </View>
              <Text className="font-gilroy-bold" style={{ fontSize: 64, color: riskColors.color, lineHeight: 72 }}>
                {uvIndex}
              </Text>
              <View className="flex-row items-center mt-1">
                <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: riskColors.color }} />
                <Text className="text-sm font-gilroy-medium text-gray-500">
                  {riskLevel} Risk
                </Text>
                <Text className="text-sm font-gilroy-regular text-gray-400"> • Protection Essential</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Hourly Forecast ──────────────────────────────── */}
        <View className="mx-4 mt-4 bg-white rounded-3xl px-4 py-5"
          style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 }}>
          <Text className="text-base font-gilroy-bold text-gray-800 mb-4">Hourly Forecast</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {forecast.map((item, index) => {
                const color = getUvColor(item.uv);
                const label = getUvLabel(item.uv);
                // Bar height proportional to UV (min 20, max 72)
                const barHeight = Math.max(20, (item.uv / 12) * 72);

                return (
                  <View key={index} className="items-center mr-4" style={{ width: 48 }}>
                    {/* Time label */}
                    <Text
                      className={`text-xs mb-2 ${item.isNow ? 'font-gilroy-bold' : 'font-gilroy-regular'}`}
                      style={{ color: item.isNow ? '#F5840E' : '#9CA3AF' }}
                    >
                      {item.time}
                    </Text>

                    {/* UV value */}
                    <Text className="text-xs font-gilroy-bold mb-1" style={{ color }}>
                      {item.uv}
                    </Text>

                    {/* Bar */}
                    <View
                      className="rounded-xl"
                      style={{
                        width: 36,
                        height: barHeight,
                        backgroundColor: color + '20',
                        borderWidth: item.isNow ? 2 : 0,
                        borderColor: item.isNow ? color : 'transparent',
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '70%',
                          backgroundColor: color,
                          borderRadius: 10,
                        }}
                      />
                    </View>

                    {/* Risk label */}
                    <Text className="text-[10px] font-gilroy-bold mt-1.5" style={{ color }}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* ── Safety Checklist ─────────────────────────────── */}
        <View className="px-4 mt-5">
          <View className="flex-row items-center mb-1">
            <MaterialCommunityIcons name="shield-check" size={20} color={riskColors.color} />
            <Text className="text-base font-gilroy-bold text-gray-800 ml-2">Safety Checklist</Text>
          </View>
          <Text className="text-xs font-gilroy-regular text-gray-400 mb-4">
            Follow these guidelines to stay safe today.
          </Text>

          {tips.map((tip, index) => (
            <View
              key={index}
              className="bg-white rounded-2xl px-4 py-4 mb-3 flex-row items-start"
              style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}
            >
              <View
                className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: riskColors.bgLight }}
              >
                <MaterialCommunityIcons name={tip.icon} size={22} color={riskColors.color} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-gilroy-bold text-gray-900">{tip.title}</Text>
                <Text className="text-xs font-gilroy-regular text-gray-500 mt-1 leading-4">
                  {tip.description}
                </Text>
              </View>
              <View
                className="w-6 h-6 rounded-full items-center justify-center mt-1"
                style={{ backgroundColor: riskColors.bgLight }}
              >
                <Text className="text-[10px] font-gilroy-bold" style={{ color: riskColors.color }}>
                  {index + 1}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Bottom CTA ─────────────────────────────────────── */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-3 bg-gray-50">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={toggleAlerts}
          disabled={isLoading}
        >
          <LinearGradient
            colors={isAlertsEnabled ? ['#EF4444', '#DC2626'] : ['#F5840E', '#E06D00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-4 rounded-2xl flex-row justify-center items-center"
            style={{
              elevation: 4,
              shadowColor: isAlertsEnabled ? '#EF4444' : '#F5840E',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <MaterialCommunityIcons
              name={isAlertsEnabled ? 'bell-off' : 'bell-ring'}
              size={20}
              color="#FFFFFF"
            />
            <Text className="text-white font-gilroy-bold text-base ml-2">
              {isLoading
                ? 'Updating...'
                : isAlertsEnabled
                ? 'Disable High UV Alerts'
                : 'Enable High UV Alerts'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SafetyAdvisorScreen;
