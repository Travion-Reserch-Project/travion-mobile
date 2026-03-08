import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@navigation/MainNavigator';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'SkinAnalysisResult'>;
type RouteProps = RouteProp<MainStackParamList, 'SkinAnalysisResult'>;

const SKIN_TYPE_INFO: Record<
  number,
  { name: string; description: string; spf: string; exposure: string; color: string; bgColor: string }
> = {
  1: { name: 'Very Fair', description: 'Always burns, never tans. Very high risk of sun damage.', spf: '50+', exposure: 'Very Low', color: '#dc2626', bgColor: '#FEF2F2' },
  2: { name: 'Fair', description: 'Burns easily, tans minimally. High risk of sun damage.', spf: '50+', exposure: 'Low', color: '#ea580c', bgColor: '#FFF7ED' },
  3: { name: 'Medium', description: 'Burns moderately, tans gradually. Moderate risk.', spf: '30–50+', exposure: 'Moderate', color: '#d97706', bgColor: '#FFFBEB' },
  4: { name: 'Olive', description: 'Burns minimally, tans well. Lower risk.', spf: '15–30', exposure: 'Moderate-High', color: '#65a30d', bgColor: '#F7FEE7' },
  5: { name: 'Brown', description: 'Rarely burns, tans easily. Low risk.', spf: '15–30', exposure: 'High', color: '#059669', bgColor: '#ECFDF5' },
  6: { name: 'Dark', description: 'Never burns, deeply pigmented. Very low risk.', spf: '15', exposure: 'Very High', color: '#0891b2', bgColor: '#ECFEFF' },
};

const SKIN_GRADIENT_COLORS: string[] = [
  '#FFE4C4', '#FDDCB3', '#D2A679', '#A67B5B', '#6B4226', '#3D2B1F',
];

const SkinAnalysisResultScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { imageUrl, skinType, age } = route.params;
  const skinInfo = SKIN_TYPE_INFO[skinType] || SKIN_TYPE_INFO[3];

  const fadeIn = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.85)).current;
  const imageFade = useRef(new Animated.Value(0)).current;
  const typeSlide = useRef(new Animated.Value(30)).current;
  const typeFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const scaleBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(imageScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(imageFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(typeFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(typeSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(scaleBarAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(cardSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, [fadeIn, imageScale, imageFade, typeSlide, typeFade, cardFade, cardSlide, scaleBarAnim]);

  const scaleBarWidth = scaleBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeIn }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('SkinAnalysis', { imageUrl: '' })}
        >
          <FontAwesome name="arrow-left" size={16} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Complete</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Image */}
        <Animated.View style={[styles.imageSection, { opacity: imageFade, transform: [{ scale: imageScale }] }]}>
          <View style={styles.imageCard}>
            <Image source={{ uri: imageUrl }} style={styles.profileImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)']}
              style={styles.imageOverlay}
            />
            <View style={styles.confidenceBadge}>
              <FontAwesome name="check-circle" size={12} color="#22c55e" />
              <Text style={styles.confidenceText}>98% Confidence</Text>
            </View>
          </View>
        </Animated.View>

        {/* Skin Type */}
        <Animated.View style={[styles.typeSection, { opacity: typeFade, transform: [{ translateY: typeSlide }] }]}>
          <View style={[styles.typeChip, { backgroundColor: skinInfo.bgColor }]}>
            <Text style={[styles.typeChipText, { color: skinInfo.color }]}>FITZPATRICK TYPE</Text>
          </View>
          <Text style={styles.typeNumber}>Type {skinType}</Text>
          <Text style={styles.typeName}>{skinInfo.name} Skin Tone</Text>

          {/* Scale */}
          <View style={styles.scaleContainer}>
            <Animated.View style={[styles.scaleBarWrap, { width: scaleBarWidth }]}>
              <View style={styles.scaleBar}>
                {SKIN_GRADIENT_COLORS.map((color, i) => (
                  <View
                    key={i}
                    style={[
                      styles.scaleSegment,
                      { backgroundColor: color },
                      i + 1 === skinType && styles.scaleSegmentActive,
                    ]}
                  >
                    {i + 1 === skinType && (
                      <View style={[styles.scaleIndicator, { borderColor: skinInfo.color }]}>
                        <View style={[styles.scaleIndicatorDot, { backgroundColor: skinInfo.color }]} />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </Animated.View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabelText}>Fair</Text>
              <Text style={styles.scaleLabelText}>Deep</Text>
            </View>
          </View>
        </Animated.View>

        {/* Sun Sensitivity Card */}
        <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
          <View style={styles.card}>
            <LinearGradient colors={[skinInfo.bgColor, '#ffffff']} style={styles.cardGradient}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: skinInfo.bgColor }]}>
                  <FontAwesome name="sun-o" size={18} color={skinInfo.color} />
                </View>
                <Text style={styles.cardTitle}>Sun Sensitivity</Text>
              </View>
              <Text style={styles.cardDesc}>{skinInfo.description}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>REC. SPF</Text>
                  <Text style={[styles.statValue, { color: skinInfo.color }]}>{skinInfo.spf}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>MAX EXPOSURE</Text>
                  <Text style={[styles.statValue, { color: skinInfo.color }]}>{skinInfo.exposure}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SunburnHistory', { imageUrl, skinType, age })}
        >
          <LinearGradient
            colors={['#F5840E', '#ea580c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaText}>Continue</Text>
            <View style={styles.ctaArrow}>
              <FontAwesome name="arrow-right" size={14} color="#F5840E" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => navigation.navigate('SkinAnalysis', { imageUrl: '' })}
        >
          <FontAwesome name="refresh" size={14} color="#64748b" />
          <Text style={styles.retakeText}>Retake Photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 8, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#0f172a' },
  headerSpacer: { width: 40 },
  scrollContent: { paddingBottom: 180 },
  imageSection: { alignItems: 'center', paddingTop: 16, paddingHorizontal: 20 },
  imageCard: {
    width: width - 40, height: 260, borderRadius: 28, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  profileImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' },
  confidenceBadge: {
    position: 'absolute', bottom: 16, left: 16, flexDirection: 'row',
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6,
  },
  confidenceText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  typeSection: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 20 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  typeChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  typeNumber: { fontSize: 38, fontWeight: '900', color: '#0f172a' },
  typeName: { fontSize: 16, color: '#64748b', marginTop: 2, marginBottom: 20 },
  scaleContainer: { width: '100%' },
  scaleBarWrap: { overflow: 'hidden' },
  scaleBar: { flexDirection: 'row', gap: 4 },
  scaleSegment: { flex: 1, height: 8, borderRadius: 4, position: 'relative' },
  scaleSegmentActive: { height: 12, marginTop: -2 },
  scaleIndicator: {
    position: 'absolute', top: -6, left: '50%', marginLeft: -9,
    width: 18, height: 18, borderRadius: 9, borderWidth: 3,
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  scaleIndicatorDot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'center', marginTop: 2 },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  scaleLabelText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  card: {
    marginHorizontal: 20, marginTop: 20, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, backgroundColor: '#fff',
  },
  cardGradient: { padding: 20, borderRadius: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  cardDesc: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16,
    backgroundColor: '#ffffff', alignItems: 'center',
  },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: 28, width: width - 40,
    shadowColor: '#F5840E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaText: { color: '#ffffff', fontSize: 17, fontWeight: '800', marginRight: 10 },
  ctaArrow: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 12, gap: 6,
  },
  retakeText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
});

export default SkinAnalysisResultScreen;
