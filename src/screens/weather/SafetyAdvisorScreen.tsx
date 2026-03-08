import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userService } from '@services/api/UserService';
import { UVLocationMonitorService } from '@services/UVLocationMonitorService';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
} from 'react-native';
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
const { width: SCREEN_W } = Dimensions.get('window');

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

interface SafetyAdvisorScreenProps {
  onBack?: () => void;
  uvIndexProp?: number;
  riskLevelProp?: string;
}

const SafetyAdvisorScreen: React.FC<SafetyAdvisorScreenProps> = ({ onBack, uvIndexProp, riskLevelProp }) => {
  const route = useRoute<any>();
  const navigation = useNavigation<SafetyAdvisorScreenNavigationProp>();

  const [isAlertsEnabled, setIsAlertsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locationCity, setLocationCity] = useState('');
  const [locationCountry, setLocationCountry] = useState('');

  // ── Load alert preference & sync monitor ───────────────
  useEffect(() => {
    const checkAlertsStatus = async () => {
      try {
        const storedValue = await AsyncStorage.getItem('HIGH_UV_ALERTS_ENABLED');
        if (storedValue !== null) {
          setIsAlertsEnabled(storedValue === 'true');
        }
        // Ensure the monitor reflects the stored preference on every visit
        await UVLocationMonitorService.syncWithPreference();
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

      // Start or stop real-time UV location monitoring
      if (newValue) {
        await UVLocationMonitorService.start();
      } else {
        UVLocationMonitorService.stop();
      }
    } catch (error) {
      console.error('Failed to toggle high UV alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Get params ──────────────────────────────────────────
  const uvIndex = uvIndexProp ?? route.params?.uvIndex ?? 8;
  const initialRiskLevel = riskLevelProp ?? route.params?.riskLevel;

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

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(30)).current;
  const forecastFade = useRef(new Animated.Value(0)).current;
  const forecastSlide = useRef(new Animated.Value(30)).current;
  const tipsFade = useRef(new Animated.Value(0)).current;
  const tipsSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(heroSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(forecastFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(forecastSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(tipsFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(tipsSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, [fadeIn, heroSlide, forecastFade, forecastSlide, tipsFade, tipsSlide]);

  return (
    <View style={sa.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      {/* Header */}
      <View style={sa.header}>
        <TouchableOpacity style={sa.headerBtn} onPress={() => onBack ? onBack() : navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={sa.headerTitle}>Safety Advisor</Text>
        <TouchableOpacity style={sa.headerBtn} onPress={toggleAlerts}>
          <MaterialCommunityIcons
            name={isAlertsEnabled ? 'bell-ring' : 'bell-outline'}
            size={20} color={isAlertsEnabled ? '#F5840E' : '#374151'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sa.scrollContent}>
        {/* UV Hero Card */}
        <Animated.View style={[sa.heroCard, { opacity: fadeIn, transform: [{ translateY: heroSlide }] }]}>
          <LinearGradient colors={riskColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sa.heroStrip} />

          <View style={sa.heroBody}>
            {/* Location pill */}
            <View style={[sa.locPill, { backgroundColor: riskColors.bgLight, borderColor: riskColors.color + '25' }]}>
              <MaterialCommunityIcons name="map-marker" size={14} color={riskColors.color} />
              <Text style={[sa.locPillText, { color: riskColors.color }]}>{locationDisplay}</Text>
            </View>

            {/* UV Display */}
            <View style={sa.uvRow}>
              <Text style={sa.uvLabel}>UV Index</Text>
            </View>
            <Text style={[sa.uvBig, { color: riskColors.color }]}>{uvIndex}</Text>
            <View style={sa.riskRow}>
              <View style={[sa.riskDot, { backgroundColor: riskColors.color }]} />
              <Text style={sa.riskText}>{riskLevel} Risk</Text>
              <Text style={sa.riskSep}> • Protection Essential</Text>
            </View>
          </View>
        </Animated.View>

        {/* Hourly Forecast */}
        <Animated.View style={[sa.forecastCard, { opacity: forecastFade, transform: [{ translateY: forecastSlide }] }]}>
          <Text style={sa.sectionTitle}>Hourly Forecast</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={sa.forecastRow}>
              {forecast.map((item, index) => {
                const color = getUvColor(item.uv);
                const label = getUvLabel(item.uv);
                const barHeight = Math.max(20, (item.uv / 12) * 72);
                return (
                  <View key={index} style={sa.forecastItem}>
                    <Text style={[sa.forecastTime, item.isNow && sa.forecastTimeNow]}>
                      {item.time}
                    </Text>
                    <Text style={[sa.forecastUv, { color }]}>{item.uv}</Text>
                    <View style={[
                      sa.forecastBar,
                      { height: barHeight, backgroundColor: color + '20' },
                      item.isNow && { borderWidth: 2, borderColor: color },
                    ]}>
                      <View style={[sa.forecastBarFill, { backgroundColor: color }]} />
                    </View>
                    <Text style={[sa.forecastLabel, { color }]}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Safety Checklist */}
        <Animated.View style={[sa.checklistSection, { opacity: tipsFade, transform: [{ translateY: tipsSlide }] }]}>
          <View style={sa.checklistHeader}>
            <MaterialCommunityIcons name="shield-check" size={20} color={riskColors.color} />
            <Text style={sa.checklistTitle}>Safety Checklist</Text>
          </View>
          <Text style={sa.checklistSub}>Follow these guidelines to stay safe today.</Text>

          {tips.map((tip, index) => (
            <View key={index} style={sa.tipCard}>
              <View style={[sa.tipIcon, { backgroundColor: riskColors.bgLight }]}>
                <MaterialCommunityIcons name={tip.icon} size={22} color={riskColors.color} />
              </View>
              <View style={sa.tipContent}>
                <Text style={sa.tipTitle}>{tip.title}</Text>
                <Text style={sa.tipDesc}>{tip.description}</Text>
              </View>
              <View style={[sa.tipNum, { backgroundColor: riskColors.bgLight }]}>
                <Text style={[sa.tipNumText, { color: riskColors.color }]}>{index + 1}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={sa.ctaWrap}>
        <TouchableOpacity activeOpacity={0.85} onPress={toggleAlerts} disabled={isLoading}>
          <LinearGradient
            colors={isAlertsEnabled ? ['#EF4444', '#DC2626'] : ['#F5840E', '#E06D00']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[sa.ctaBtn, isLoading && { opacity: 0.7 }]}
          >
            <MaterialCommunityIcons
              name={isAlertsEnabled ? 'bell-off' : 'bell-ring'}
              size={20} color="#FFFFFF"
            />
            <Text style={sa.ctaText}>
              {isLoading ? 'Updating...' : isAlertsEnabled ? 'Disable High UV Alerts' : 'Enable High UV Alerts'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const sa = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: (StatusBar.currentHeight || 0) + 12, paddingBottom: 12, backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  heroCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 12, borderRadius: 24,
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  heroStrip: { height: 4 },
  heroBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, alignItems: 'center' },
  locPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, marginBottom: 16, gap: 6,
  },
  locPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  uvRow: { flexDirection: 'row', alignItems: 'baseline' },
  uvLabel: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
  uvBig: { fontSize: 64, fontWeight: '900', lineHeight: 72 },
  riskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  riskDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  riskText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  riskSep: { fontSize: 14, color: '#9CA3AF' },
  forecastCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 16, borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937', marginBottom: 16 },
  forecastRow: { flexDirection: 'row' },
  forecastItem: { alignItems: 'center', marginRight: 16, width: 48 },
  forecastTime: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  forecastTimeNow: { color: '#F5840E', fontWeight: '800' },
  forecastUv: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  forecastBar: { width: 36, borderRadius: 12, overflow: 'hidden' },
  forecastBarFill: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', borderRadius: 10 },
  forecastLabel: { fontSize: 10, fontWeight: '800', marginTop: 6 },
  checklistSection: { paddingHorizontal: 16, marginTop: 20 },
  checklistHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  checklistTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937' },
  checklistSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  tipCard: {
    backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 16,
    marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  tipIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  tipDesc: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 16 },
  tipNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  tipNumText: { fontSize: 10, fontWeight: '800' },
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12, backgroundColor: '#F8FAFC',
  },
  ctaBtn: {
    paddingVertical: 16, borderRadius: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#F5840E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  ctaText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});

export default SafetyAdvisorScreen;
