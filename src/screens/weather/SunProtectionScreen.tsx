import { MainStackParamList } from '@navigation';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from '@react-native-community/geolocation';
import RNGeocoding from 'react-native-geocoding';
import { weatherService } from '../../services/api/WeatherService';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

// ── Risk level configuration ────────────────────────────────
const RISK_CONFIG: Record<string, {
  color: string;
  gradient: string[];
  bgLight: string;
  icon: string;
  needle: number; // degrees from -90 (left) to 90 (right)
  title: string;
  message: string;
  actions: string[];
}> = {
  low: {
    color: '#22C55E',
    gradient: ['#22C55E', '#16A34A'],
    bgLight: '#F0FDF4',
    icon: 'shield-check',
    needle: -60,
    title: 'Low Risk Day',
    message: 'UV levels are safe. Enjoy your day outdoors with minimal precautions.',
    actions: [
      'No special sun protection needed',
      'Stay hydrated throughout the day',
      'Enjoy outdoor activities freely',
    ],
  },
  moderate: {
    color: '#F59E0B',
    gradient: ['#FBBF24', '#F59E0B'],
    bgLight: '#FFFBEB',
    icon: 'shield-alert',
    needle: -20,
    title: 'Sun Protection\nRecommended',
    message: 'Seek shade during midday when the sun is strongest.',
    actions: [
      'Apply SPF 30+ sunscreen before going out',
      'Wear a hat & sunglasses outdoors',
      'Seek shade between 11 AM – 3 PM',
    ],
  },
  high: {
    color: '#F97316',
    gradient: ['#FB923C', '#EA580C'],
    bgLight: '#FFF7ED',
    icon: 'shield-alert',
    needle: 20,
    title: 'Sun Protection\nRequired',
    message: 'UV levels are dangerous. Protective measures are essential.',
    actions: [
      'Apply broad-spectrum SPF 50+ sunscreen',
      'Wear protective clothing & sunglasses',
      'Avoid direct sun between 10 AM – 4 PM',
    ],
  },
  'very high': {
    color: '#EF4444',
    gradient: ['#F87171', '#DC2626'],
    bgLight: '#FEF2F2',
    icon: 'alert-octagon',
    needle: 60,
    title: 'Extra Protection\nNeeded',
    message: 'Dangerous UV levels. Minimize outdoor exposure.',
    actions: [
      'Stay indoors between 10 AM – 4 PM',
      'Apply SPF 50+ every 2 hours if outside',
      'Wear long sleeves, hat & UV sunglasses',
    ],
  },
  extreme: {
    color: '#7C3AED',
    gradient: ['#A78BFA', '#7C3AED'],
    bgLight: '#F5F3FF',
    icon: 'alert-decagram',
    needle: 85,
    title: 'Avoid Sun\nExposure!',
    message: 'Extreme UV radiation. Stay indoors if possible.',
    actions: [
      'Avoid ALL outdoor activities if possible',
      'Full-coverage clothing is mandatory outside',
      'Reapply SPF 50+ sunscreen every hour',
    ],
  },
};

const getRisk = (level: string) => {
  const key = level.toLowerCase();
  return RISK_CONFIG[key] || RISK_CONFIG.low;
};

const SunProtectionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [locationCity, setLocationCity] = useState('');
  const [locationCountry, setLocationCountry] = useState('');

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true);

        // Request Location Permission
        if (Platform.OS === 'android') {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }

        Geolocation.getCurrentPosition(
          async position => {
            const { latitude, longitude } = position.coords;

            // Get Location Name — parse structured components
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
            } catch (err) {
              console.error('Geocoding error:', err);
              setLocationCity('Current Location');
            }

            // Fetch prediction
            try {
              const response = await weatherService.predictSunRisk(latitude, longitude);
              if (response.success) {
                setPredictionData(response.data);
              }
            } catch (err) {
              console.error('Prediction fetch error:', err);
            } finally {
              setLoading(false);
            }
          },
          error => {
            console.error('Geolocation error:', error);
            fetchPredictionWithDefaults();
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
      } catch (err) {
        console.error('Setup error:', err);
        setLoading(false);
      }
    };

    const fetchPredictionWithDefaults = async () => {
      try {
        const response = await weatherService.predictSunRisk(5.9482, 80.4716);
        if (response.success) {
          setPredictionData(response.data);
          setLocationCity('Mirissa');
          setLocationCountry('Sri Lanka');
        }
      } catch (err) {
        console.error('Fallback prediction error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <View className="items-center">
          <View className="w-16 h-16 rounded-full bg-orange-50 items-center justify-center mb-4">
            <ActivityIndicator size="large" color="#F5840E" />
          </View>
          <Text className="text-base font-gilroy-bold text-gray-700">Analyzing Sun Risk</Text>
          <Text className="text-sm font-gilroy-regular text-gray-400 mt-1">
            Checking UV levels & your profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const riskLevel = predictionData?.prediction?.prediction?.risk_level || 'Low';
  const uvIndex = predictionData?.weather?.uvIndex || 0;
  const temperature = predictionData?.weather?.temperatureC || '--';
  const skinType = predictionData?.healthProfileSummary?.skinType || 'II';
  const humidity = predictionData?.weather?.humidity || '--';
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const risk = getRisk(riskLevel);

  // ── Gauge dimensions ──────────────────────────────────────
  const gaugeSize = 120;
  const gaugeStroke = 10;
  const gaugeRadius = (gaugeSize - gaugeStroke) / 2;
  const gaugeCx = gaugeSize / 2;
  const gaugeCy = gaugeSize / 2;
  // Semi-circle arc (180°)
  const gaugeCircumference = Math.PI * gaugeRadius;
  // Needle angle: -90 (left) to 90 (right)
  const needleAngle = risk.needle;
  const needleRad = ((needleAngle - 90) * Math.PI) / 180;
  const needleLen = gaugeRadius - 18;
  const needleX2 = gaugeCx + needleLen * Math.cos(needleRad);
  const needleY2 = gaugeCy + needleLen * Math.sin(needleRad);

  // UV color helper
  const getUvColor = (uv: number) => {
    if (uv <= 2) return '#22C55E';
    if (uv <= 5) return '#F59E0B';
    if (uv <= 7) return '#F97316';
    if (uv <= 10) return '#EF4444';
    return '#7C3AED';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Header Card with Risk Meter + Location ──────── */}
        <View
          className="bg-white mx-4 mt-3 rounded-3xl overflow-hidden"
          style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }}
        >
          {/* Top colored strip */}
          <LinearGradient
            colors={risk.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 4 }}
          />

          <View className="px-5 pt-4 pb-5">
            {/* Row: Gauge on left, Info on right */}
            <View className="flex-row items-center">
              {/* ── Risk Gauge (left) ── */}
              <View style={{ width: gaugeSize, height: gaugeSize / 2 + 14 }} className="mr-4">
                <Svg width={gaugeSize} height={gaugeSize / 2 + 14}>
                  {/* Background arc */}
                  <Circle
                    cx={gaugeCx}
                    cy={gaugeCy}
                    r={gaugeRadius}
                    stroke="#F3F4F6"
                    strokeWidth={gaugeStroke}
                    fill="none"
                    strokeDasharray={`${gaugeCircumference} ${gaugeCircumference}`}
                    strokeLinecap="round"
                    rotation="180"
                    origin={`${gaugeCx}, ${gaugeCy}`}
                  />
                  {/* Colored progress arc */}
                  <Circle
                    cx={gaugeCx}
                    cy={gaugeCy}
                    r={gaugeRadius}
                    stroke={risk.color}
                    strokeWidth={gaugeStroke}
                    fill="none"
                    strokeDasharray={`${gaugeCircumference}`}
                    strokeDashoffset={gaugeCircumference * (1 - (needleAngle + 90) / 180)}
                    strokeLinecap="round"
                    rotation="180"
                    origin={`${gaugeCx}, ${gaugeCy}`}
                  />
                  {/* Needle */}
                  <Line
                    x1={gaugeCx}
                    y1={gaugeCy}
                    x2={needleX2}
                    y2={needleY2}
                    stroke={risk.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  {/* Center dot */}
                  <Circle cx={gaugeCx} cy={gaugeCy} r={5} fill={risk.color} />
                  <Circle cx={gaugeCx} cy={gaugeCy} r={3} fill="#FFFFFF" />
                </Svg>
              </View>

              {/* ── Info (right) ── */}
              <View className="flex-1">
                <View
                  className="self-start px-3 py-1 rounded-full mb-2"
                  style={{ backgroundColor: risk.bgLight, borderWidth: 1, borderColor: risk.color + '30' }}
                >
                  <Text className="text-xs font-gilroy-bold uppercase" style={{ color: risk.color }}>
                    {riskLevel} Risk
                  </Text>
                </View>
                <Text className="text-xl font-gilroy-bold text-gray-900 leading-6" numberOfLines={2}>
                  {risk.title}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text className="text-sm font-gilroy-regular text-gray-500 mt-3 leading-5">
              {risk.message}
            </Text>

            {/* Location bar */}
            <View className="flex-row items-center mt-4 bg-gray-50 rounded-xl px-3 py-2.5">
              <MaterialCommunityIcons name="map-marker" size={18} color="#F5840E" />
              <View className="flex-1 ml-2">
                <Text className="text-sm font-gilroy-bold text-gray-800" numberOfLines={1}>
                  {locationCity || 'Detecting...'}
                  {locationCountry ? `, ${locationCountry}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                className="bg-white px-3 py-1.5 rounded-lg"
                style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                onPress={() => navigation.goBack()}
              >
                <Text className="text-xs font-gilroy-bold text-primary">Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Contributing Factors ─────────────────────────── */}
        <View className="px-4 mt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-gilroy-bold text-gray-800">Contributing Factors</Text>
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="clock-outline" size={14} color="#9CA3AF" />
              <Text className="text-xs font-gilroy-regular text-gray-400 ml-1">
                Updated {lastUpdated}
              </Text>
            </View>
          </View>

          {/* Skin Type Card */}
          <View
            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center"
            style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}
          >
            <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: '#FFF7ED' }}>
              <MaterialCommunityIcons name="account" size={22} color="#F5840E" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs font-gilroy-regular text-gray-400">Your Skin Type</Text>
              <Text className="text-base font-gilroy-bold text-gray-900">Fitzpatrick Type {skinType}</Text>
            </View>
            <TouchableOpacity
              className="bg-orange-50 px-3 py-1.5 rounded-lg"
              onPress={() => navigation.navigate('HealthProfileLanding')}
            >
              <Text className="text-xs font-gilroy-bold text-primary">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* UV + Temperature + Humidity row */}
          <View className="flex-row mb-3">
            {/* UV Index */}
            <View
              className="flex-1 bg-white rounded-2xl p-4 mr-2"
              style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: risk.bgLight }}>
                  <MaterialCommunityIcons name="white-balance-sunny" size={18} color={getUvColor(uvIndex)} />
                </View>
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: risk.bgLight }}>
                  <Text className="text-[10px] font-gilroy-bold" style={{ color: risk.color }}>
                    {riskLevel}
                  </Text>
                </View>
              </View>
              <Text className="text-3xl font-gilroy-bold text-gray-900">{uvIndex}</Text>
              <Text className="text-xs font-gilroy-regular text-gray-400 mt-0.5">UV Index</Text>
            </View>

            {/* Temperature */}
            <View
              className="flex-1 bg-white rounded-2xl p-4 ml-2"
              style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: '#FEF2F2' }}>
                  <MaterialCommunityIcons name="thermometer" size={18} color="#EF4444" />
                </View>
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF' }}>
                  <Text className="text-[10px] font-gilroy-bold text-blue-600">Live</Text>
                </View>
              </View>
              <Text className="text-3xl font-gilroy-bold text-gray-900">
                {temperature}
                <Text className="text-lg text-gray-400">°C</Text>
              </Text>
              <Text className="text-xs font-gilroy-regular text-gray-400 mt-0.5">Temperature</Text>
            </View>
          </View>
        </View>

        {/* ── Recommended Actions ──────────────────────────── */}
        <View className="px-4 mt-2">
          <Text className="text-base font-gilroy-bold text-gray-800 mb-3">Recommended Actions</Text>

          {risk.actions.map((action, index) => (
            <View
              key={index}
              className="bg-white rounded-2xl px-4 py-3.5 mb-2 flex-row items-center"
              style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}
            >
              <LinearGradient
                colors={risk.gradient}
                className="w-8 h-8 rounded-full items-center justify-center mr-3"
              >
                <Text className="text-white font-gilroy-bold text-xs">{index + 1}</Text>
              </LinearGradient>
              <Text className="text-sm font-gilroy-medium text-gray-700 flex-1">{action}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Bottom CTA ─────────────────────────────────────── */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-3 bg-gray-50">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SafetyAdvisor', { uvIndex, riskLevel })}
        >
          <LinearGradient
            colors={['#F5840E', '#E06D00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-4 rounded-2xl flex-row justify-center items-center"
            style={{ elevation: 4, shadowColor: '#F5840E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
          >
            <MaterialCommunityIcons name="shield-sun" size={20} color="#FFFFFF" />
            <Text className="text-white font-gilroy-bold text-base ml-2">Get Detailed Protection Plan</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SunProtectionScreen;
