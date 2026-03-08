import { MainStackParamList } from '@navigation';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Dimensions,
  Animated,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from '@react-native-community/geolocation';
import RNGeocoding from 'react-native-geocoding';
import { weatherService } from '../../services/api/WeatherService';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
const { width: SCREEN_W } = Dimensions.get('window');

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

interface SunProtectionScreenProps {
  onBack?: () => void;
  onNavigateToSafetyAdvisor?: (params: { uvIndex: number; riskLevel: string }) => void;
}

const SunProtectionScreen: React.FC<SunProtectionScreenProps> = ({ onBack, onNavigateToSafetyAdvisor }) => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [locationCity, setLocationCity] = useState('');
  const [locationCountry, setLocationCountry] = useState('');

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const factorsSlide = useRef(new Animated.Value(40)).current;
  const factorsFade = useRef(new Animated.Value(0)).current;
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
      <View style={sp.loadingWrap}>
        <View style={sp.loadingInner}>
          <View style={sp.loadingIcon}>
            <ActivityIndicator size="large" color="#F5840E" />
          </View>
          <Text style={sp.loadingTitle}>Analyzing Sun Risk</Text>
          <Text style={sp.loadingSub}>Checking UV levels & your profile...</Text>
        </View>
      </View>
    );
  }

  const riskLevel = predictionData?.prediction?.prediction?.risk_level || 'Low';
  const uvIndex = predictionData?.weather?.uvIndex || 0;
  const temperature = predictionData?.weather?.temperatureC || '--';
  const skinType = predictionData?.healthProfileSummary?.skinType || 'II';
  const humidity = predictionData?.weather?.humidity || '--';
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const risk = getRisk(riskLevel);

  // Gauge dimensions
  const gaugeSize = 120;
  const gaugeStroke = 10;
  const gaugeRadius = (gaugeSize - gaugeStroke) / 2;
  const gaugeCx = gaugeSize / 2;
  const gaugeCy = gaugeSize / 2;
  const gaugeCircumference = Math.PI * gaugeRadius;
  const needleAngle = risk.needle;
  const needleRad = ((needleAngle - 90) * Math.PI) / 180;
  const needleLen = gaugeRadius - 18;
  const needleX2 = gaugeCx + needleLen * Math.cos(needleRad);
  const needleY2 = gaugeCy + needleLen * Math.sin(needleRad);

  const getUvColor = (uv: number) => {
    if (uv <= 2) return '#22C55E';
    if (uv <= 5) return '#F59E0B';
    if (uv <= 7) return '#F97316';
    if (uv <= 10) return '#EF4444';
    return '#7C3AED';
  };

  // Run entrance animations after data loads
  Animated.sequence([
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(cardFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]),
    Animated.parallel([
      Animated.spring(factorsSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(factorsFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]),
  ]).start();

  return (
    <View style={sp.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Header */}
      <View style={sp.header}>
        <TouchableOpacity style={sp.headerBtn} onPress={() => onBack ? onBack() : navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={sp.headerTitle}>Sun Protection</Text>
        <View style={sp.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sp.scrollContent}>

        {/* Risk Header Card */}
        <Animated.View style={[sp.riskCard, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
          <LinearGradient colors={risk.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sp.riskStrip} />

          <View style={sp.riskBody}>
            {/* Gauge + Info row */}
            <View style={sp.riskRow}>
              <View style={{ width: gaugeSize, height: gaugeSize / 2 + 14, marginRight: 16 }}>
                <Svg width={gaugeSize} height={gaugeSize / 2 + 14}>
                  <Circle
                    cx={gaugeCx} cy={gaugeCy} r={gaugeRadius}
                    stroke="#F3F4F6" strokeWidth={gaugeStroke} fill="none"
                    strokeDasharray={`${gaugeCircumference} ${gaugeCircumference}`}
                    strokeLinecap="round" rotation="180" origin={`${gaugeCx}, ${gaugeCy}`}
                  />
                  <Circle
                    cx={gaugeCx} cy={gaugeCy} r={gaugeRadius}
                    stroke={risk.color} strokeWidth={gaugeStroke} fill="none"
                    strokeDasharray={`${gaugeCircumference}`}
                    strokeDashoffset={gaugeCircumference * (1 - (needleAngle + 90) / 180)}
                    strokeLinecap="round" rotation="180" origin={`${gaugeCx}, ${gaugeCy}`}
                  />
                  <Line x1={gaugeCx} y1={gaugeCy} x2={needleX2} y2={needleY2}
                    stroke={risk.color} strokeWidth={3} strokeLinecap="round" />
                  <Circle cx={gaugeCx} cy={gaugeCy} r={5} fill={risk.color} />
                  <Circle cx={gaugeCx} cy={gaugeCy} r={3} fill="#FFFFFF" />
                </Svg>
              </View>
              <View style={sp.riskInfo}>
                <View style={[sp.riskPill, { backgroundColor: risk.bgLight, borderColor: risk.color + '30' }]}>
                  <Text style={[sp.riskPillText, { color: risk.color }]}>{riskLevel} Risk</Text>
                </View>
                <Text style={sp.riskTitle} numberOfLines={2}>{risk.title}</Text>
              </View>
            </View>

            <Text style={sp.riskDesc}>{risk.message}</Text>

            {/* Location bar */}
            <View style={sp.locBar}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#F5840E" />
              <Text style={sp.locText} numberOfLines={1}>
                {locationCity || 'Detecting...'}{locationCountry ? `, ${locationCountry}` : ''}
              </Text>
              <TouchableOpacity style={sp.locChangeBtn} onPress={() => navigation.goBack()}>
                <Text style={sp.locChangeText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Contributing Factors */}
        <Animated.View style={[sp.factorsSection, { opacity: factorsFade, transform: [{ translateY: factorsSlide }] }]}>
          <View style={sp.factorsHeader}>
            <Text style={sp.factorsTitle}>Contributing Factors</Text>
            <View style={sp.updatedRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#9CA3AF" />
              <Text style={sp.updatedText}>Updated {lastUpdated}</Text>
            </View>
          </View>

          {/* Skin Type Card */}
          <View style={sp.factorCard}>
            <View style={[sp.factorIcon, { backgroundColor: '#FFF7ED' }]}>
              <MaterialCommunityIcons name="account" size={22} color="#F5840E" />
            </View>
            <View style={sp.factorInfo}>
              <Text style={sp.factorLabel}>Your Skin Type</Text>
              <Text style={sp.factorValue}>Fitzpatrick Type {skinType}</Text>
            </View>
            <TouchableOpacity style={sp.factorEditBtn} onPress={() => navigation.navigate('HealthProfileLanding')}>
              <Text style={sp.factorEditText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* UV + Temperature row */}
          <View style={sp.factorRow}>
            <View style={sp.factorSmallCard}>
              <View style={sp.factorSmallTop}>
                <View style={[sp.factorSmallIcon, { backgroundColor: risk.bgLight }]}>
                  <MaterialCommunityIcons name="white-balance-sunny" size={18} color={getUvColor(uvIndex)} />
                </View>
                <View style={[sp.factorSmallPill, { backgroundColor: risk.bgLight }]}>
                  <Text style={[sp.factorSmallPillText, { color: risk.color }]}>{riskLevel}</Text>
                </View>
              </View>
              <Text style={sp.factorSmallValue}>{uvIndex}</Text>
              <Text style={sp.factorSmallLabel}>UV Index</Text>
            </View>
            <View style={sp.factorSmallCard}>
              <View style={sp.factorSmallTop}>
                <View style={[sp.factorSmallIcon, { backgroundColor: '#FEF2F2' }]}>
                  <MaterialCommunityIcons name="thermometer" size={18} color="#EF4444" />
                </View>
                <View style={[sp.factorSmallPill, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[sp.factorSmallPillText, { color: '#2563EB' }]}>Live</Text>
                </View>
              </View>
              <Text style={sp.factorSmallValue}>{temperature}<Text style={sp.factorSmallUnit}>°C</Text></Text>
              <Text style={sp.factorSmallLabel}>Temperature</Text>
            </View>
          </View>
        </Animated.View>

        {/* Recommended Actions */}
        <Animated.View style={[sp.actionsSection, { opacity: factorsFade }]}>
          <Text style={sp.actionsTitle}>Recommended Actions</Text>
          {risk.actions.map((action, index) => (
            <View key={index} style={sp.actionCard}>
              <LinearGradient colors={risk.gradient} style={sp.actionNum}>
                <Text style={sp.actionNumText}>{index + 1}</Text>
              </LinearGradient>
              <Text style={sp.actionText}>{action}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={sp.ctaWrap}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateToSafetyAdvisor ? onNavigateToSafetyAdvisor({ uvIndex, riskLevel }) : navigation.navigate('SafetyAdvisor', { uvIndex, riskLevel })}
        >
          <LinearGradient
            colors={['#F5840E', '#E06D00']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={sp.ctaBtn}
          >
            <MaterialCommunityIcons name="shield-sun" size={20} color="#FFFFFF" />
            <Text style={sp.ctaText}>Get Detailed Protection Plan</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const sp = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 100 },
  loadingWrap: { flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  loadingInner: { alignItems: 'center' },
  loadingIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  loadingTitle: { fontSize: 16, fontWeight: '800', color: '#374151' },
  loadingSub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
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
  headerSpacer: { width: 40 },
  riskCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 12, borderRadius: 24,
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  riskStrip: { height: 4 },
  riskBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  riskRow: { flexDirection: 'row', alignItems: 'center' },
  riskInfo: { flex: 1 },
  riskPill: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, marginBottom: 8,
  },
  riskPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  riskTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', lineHeight: 24 },
  riskDesc: { fontSize: 14, color: '#64748b', marginTop: 12, lineHeight: 20 },
  locBar: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16,
    backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
  },
  locText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1f2937', marginLeft: 8 },
  locChangeBtn: {
    backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  locChangeText: { fontSize: 12, fontWeight: '800', color: '#F5840E' },
  factorsSection: { paddingHorizontal: 16, marginTop: 20 },
  factorsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  factorsTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937' },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  updatedText: { fontSize: 12, color: '#9CA3AF' },
  factorCard: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 16, flexDirection: 'row',
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  factorIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  factorInfo: { flex: 1, marginLeft: 12 },
  factorLabel: { fontSize: 12, color: '#9CA3AF' },
  factorValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  factorEditBtn: { backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  factorEditText: { fontSize: 12, fontWeight: '800', color: '#F5840E' },
  factorRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  factorSmallCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  factorSmallTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  factorSmallIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  factorSmallPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  factorSmallPillText: { fontSize: 10, fontWeight: '800' },
  factorSmallValue: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  factorSmallUnit: { fontSize: 16, color: '#9CA3AF' },
  factorSmallLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  actionsSection: { paddingHorizontal: 16, marginTop: 8 },
  actionsTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937', marginBottom: 12 },
  actionCard: {
    backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  actionNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionNumText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  actionText: { fontSize: 14, color: '#374151', fontWeight: '600', flex: 1 },
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

export default SunProtectionScreen;
