import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Modal,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@navigation/MainNavigator';
import { healthProfileService } from '@services/api';
import { useAuthStore } from '@stores';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'SkinHelthProfile'>;
type RouteProps = RouteProp<MainStackParamList, 'SkinHelthProfile'>;

const SKIN_TYPE_INFO: Record<
  number,
  { name: string; description: string; spf: string; exposure: string; color: string; bgColor: string }
> = {
  1: { name: 'Very Fair', description: 'Always burns, never tans. Very high risk.', spf: '50+', exposure: 'Very Low', color: '#dc2626', bgColor: '#FEF2F2' },
  2: { name: 'Fair', description: 'Burns easily, tans minimally. High risk.', spf: '50+', exposure: 'Low', color: '#ea580c', bgColor: '#FFF7ED' },
  3: { name: 'Medium', description: 'Burns moderately, tans gradually.', spf: '30–50+', exposure: 'Moderate', color: '#d97706', bgColor: '#FFFBEB' },
  4: { name: 'Olive', description: 'Burns minimally, tans well.', spf: '15–30', exposure: 'Moderate-High', color: '#65a30d', bgColor: '#F7FEE7' },
  5: { name: 'Brown', description: 'Rarely burns, tans easily.', spf: '15–30', exposure: 'High', color: '#059669', bgColor: '#ECFDF5' },
  6: { name: 'Dark', description: 'Never burns, deeply pigmented.', spf: '15', exposure: 'Very High', color: '#0891b2', bgColor: '#ECFEFF' },
};

const SKIN_GRADIENT_COLORS: string[] = [
  '#FFE4C4', '#FDDCB3', '#D2A679', '#A67B5B', '#6B4226', '#3D2B1F',
];

const TIMES_MAP: Record<string, number> = {
  One: 1, Two: 2, Three: 3, Four: 4, 'Five+': 5,
};

const SkinHelthProfileScreen: React.FC = () => {
  const { user } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const {
    imageUrl, skinType, skinProductInteraction, useOfSunglasses,
    historicalSunburnTimes, age, isExistingProfile,
  } = route.params;
  const skinInfo = SKIN_TYPE_INFO[skinType] || SKIN_TYPE_INFO[3];

  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const imageScale = useRef(new Animated.Value(0.85)).current;
  const imageFade = useRef(new Animated.Value(0)).current;
  const typeSlide = useRef(new Animated.Value(30)).current;
  const typeFade = useRef(new Animated.Value(0)).current;
  const card1Slide = useRef(new Animated.Value(50)).current;
  const card1Fade = useRef(new Animated.Value(0)).current;
  const card2Slide = useRef(new Animated.Value(50)).current;
  const card2Fade = useRef(new Animated.Value(0)).current;
  const card3Slide = useRef(new Animated.Value(50)).current;
  const card3Fade = useRef(new Animated.Value(0)).current;
  const scaleBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(headerSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(imageScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(imageFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(typeFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(typeSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(scaleBarAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
      ]),
      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(card1Fade, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.spring(card1Slide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(card2Fade, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.spring(card2Slide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(card3Fade, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.spring(card3Slide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [fadeIn, headerSlide, imageScale, imageFade, typeSlide, typeFade, card1Slide, card1Fade, card2Slide, card2Fade, card3Slide, card3Fade, scaleBarAnim]);

  const handleSaveAndContinue = useCallback(async () => {
    try {
      if (!user?.userId) {
        Alert.alert('Error', 'User not authenticated. Please log in again.');
        return;
      }
      const payload = {
        userId: user.userId, age, imageUrl,
        historicalSunburnTimes: TIMES_MAP[historicalSunburnTimes] || 0,
        skinType, skinProductInteraction, useOfSunglasses,
      };
      await healthProfileService.createHealthProfile(payload);
      navigation.navigate('MainApp');
    } catch (error) {
      Alert.alert('Error', 'Failed to save health profile. Please try again.');
    }
  }, [age, imageUrl, skinType, skinProductInteraction, useOfSunglasses, historicalSunburnTimes, navigation, user?.userId]);

  const handleDelete = useCallback(async () => {
    Alert.alert(
      'Delete Health Profile',
      'This will permanently remove your skin analysis data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              if (user?.userId) {
                await healthProfileService.deleteHealthProfile(user.userId);
              }
              navigation.navigate('ProfileScreen', {});
            } catch (error) {
              Alert.alert('Error', 'Failed to delete health profile.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }, [user?.userId, navigation]);

  const handleEdit = useCallback(() => {
    setShowMenu(false);
    navigation.navigate('HealthProfileSetup', { imageUrl });
  }, [navigation, imageUrl]);

  const scaleBarWidth = scaleBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeIn, transform: [{ translateY: headerSlide }] }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (isExistingProfile) { navigation.goBack(); }
            else { navigation.navigate('SkinAnalysis', { imageUrl: '' }); }
          }}
        >
          <FontAwesome name="arrow-left" size={16} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Profile</Text>
        {isExistingProfile ? (
          <TouchableOpacity style={styles.menuBtn} onPress={() => setShowMenu(true)}>
            <FontAwesome name="ellipsis-v" size={18} color="#0f172a" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Image */}
        <Animated.View style={[styles.imageSection, { opacity: imageFade, transform: [{ scale: imageScale }] }]}>
          <View style={styles.imageCard}>
            <Image source={{ uri: imageUrl }} style={styles.profileImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)']}
              style={styles.imageOverlay}
            />
            <View style={styles.imageBadge}>
              <FontAwesome name="check-circle" size={12} color="#22c55e" />
              <Text style={styles.imageBadgeText}>Analyzed</Text>
            </View>
          </View>
        </Animated.View>

        {/* Skin Type Display */}
        <Animated.View style={[styles.typeSection, { opacity: typeFade, transform: [{ translateY: typeSlide }] }]}>
          <View style={[styles.typeChip, { backgroundColor: skinInfo.bgColor }]}>
            <Text style={[styles.typeChipText, { color: skinInfo.color }]}>FITZPATRICK TYPE</Text>
          </View>
          <Text style={styles.typeNumber}>Type {skinType}</Text>
          <Text style={styles.typeName}>{skinInfo.name} Skin Tone</Text>

          {/* Fitzpatrick Scale Bar */}
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
        <Animated.View style={{ opacity: card1Fade, transform: [{ translateY: card1Slide }] }}>
          <View style={styles.card}>
            <LinearGradient
              colors={[skinInfo.bgColor, '#ffffff']}
              style={styles.cardGradient}
            >
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

        {/* Sunburn History Card */}
        <Animated.View style={{ opacity: card2Fade, transform: [{ translateY: card2Slide }] }}>
          <View style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: '#FFF7ED' }]}>
                  <FontAwesome name="history" size={18} color="#F5840E" />
                </View>
                <Text style={styles.cardTitle}>History & Habits</Text>
              </View>

              <View style={styles.habitsGrid}>
                <View style={styles.habitItem}>
                  <View style={[styles.habitIcon, { backgroundColor: '#FFF7ED' }]}>
                    <FontAwesome name="tint" size={16} color="#F5840E" />
                  </View>
                  <Text style={styles.habitLabel}>Skin Products</Text>
                  <Text style={styles.habitValue}>{skinProductInteraction}</Text>
                </View>
                <View style={styles.habitItem}>
                  <View style={[styles.habitIcon, { backgroundColor: '#EFF6FF' }]}>
                    <FontAwesome name="eye" size={16} color="#2563EB" />
                  </View>
                  <Text style={styles.habitLabel}>Sun Protection</Text>
                  <Text style={styles.habitValue}>{useOfSunglasses}</Text>
                </View>
              </View>

              {/* Age Display */}
              {age != null && (
                <View style={styles.ageCard}>
                  <View style={styles.ageLeft}>
                    <FontAwesome name="user" size={16} color="#7C3AED" />
                    <Text style={styles.ageLabel}>Age</Text>
                  </View>
                  <View style={styles.ageBadge}>
                    <Text style={styles.ageValue}>{age} yrs</Text>
                  </View>
                </View>
              )}

              <View style={styles.burnTimesCard}>
                <View style={styles.burnTimesLeft}>
                  <FontAwesome name="sun-o" size={16} color="#F5840E" />
                  <Text style={styles.burnTimesLabel}>
                    {skinType <= 2 ? 'Sunburn Times' : 'Tanning Times'}
                  </Text>
                </View>
                <View style={styles.burnTimesBadge}>
                  <Text style={styles.burnTimesValue}>{historicalSunburnTimes}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Quick Tips Card */}
        <Animated.View style={{ opacity: card3Fade, transform: [{ translateY: card3Slide }] }}>
          <View style={styles.tipsCard}>
            <LinearGradient
              colors={['#0f172a', '#1e293b']}
              style={styles.tipsCardInner}
            >
              <View style={styles.tipsHeader}>
                <Text style={styles.tipsEmoji}>☀️</Text>
                <Text style={styles.tipsTitle}>Protection Tips</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Apply SPF {skinInfo.spf} sunscreen 15 min before sun exposure</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Reapply every 2 hours or after swimming</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Seek shade during peak UV hours (10am–4pm)</Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      {!isExistingProfile && (
        <View style={styles.bottomCta}>
          <TouchableOpacity activeOpacity={0.85} onPress={handleSaveAndContinue}>
            <LinearGradient
              colors={['#F5840E', '#ea580c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>Save & Continue</Text>
              <View style={styles.ctaArrow}>
                <FontAwesome name="arrow-right" size={14} color="#F5840E" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuCard}>
            <View style={styles.menuHandle} />

            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <View style={[styles.menuItemIcon, { backgroundColor: '#EFF6FF' }]}>
                <FontAwesome name="pencil" size={16} color="#2563EB" />
              </View>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>Edit Profile</Text>
                <Text style={styles.menuItemDesc}>Re-take photo or update details</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); handleDelete(); }}
              disabled={isDeleting}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: '#FEF2F2' }]}>
                <FontAwesome name="trash" size={16} color="#dc2626" />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: '#dc2626' }]}>Delete Profile</Text>
                <Text style={styles.menuItemDesc}>Permanently remove your health data</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCancelBtn} onPress={() => setShowMenu(false)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  menuBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  scrollContent: { paddingBottom: 120 },
  imageSection: { alignItems: 'center', paddingTop: 16, paddingHorizontal: 20 },
  imageCard: {
    width: width - 40, height: 260, borderRadius: 28, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  profileImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' },
  imageBadge: {
    position: 'absolute', bottom: 16, left: 16, flexDirection: 'row',
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6,
  },
  imageBadgeText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  typeSection: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 20 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 8,
  },
  typeChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  typeNumber: { fontSize: 38, fontWeight: '900', color: '#0f172a' },
  typeName: { fontSize: 16, color: '#64748b', marginTop: 2, marginBottom: 20 },
  scaleContainer: { width: '100%' },
  scaleBarWrap: { overflow: 'hidden' },
  scaleBar: { flexDirection: 'row', gap: 4 },
  scaleSegment: {
    flex: 1, height: 8, borderRadius: 4, position: 'relative',
  },
  scaleSegmentActive: { height: 12, marginTop: -2 },
  scaleIndicator: {
    position: 'absolute', top: -6, left: '50%', marginLeft: -9,
    width: 18, height: 18, borderRadius: 9, borderWidth: 3,
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  scaleIndicatorDot: {
    width: 8, height: 8, borderRadius: 4, alignSelf: 'center', marginTop: 2,
  },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  scaleLabelText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  card: {
    marginHorizontal: 20, marginTop: 20, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, backgroundColor: '#fff',
  },
  cardGradient: { padding: 20, borderRadius: 24 },
  cardInner: { padding: 20 },
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
  habitsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  habitItem: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14, alignItems: 'center',
  },
  habitIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', marginBottom: 8,
  },
  habitLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4 },
  habitValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  ageCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F5F3FF', borderRadius: 16, padding: 14, marginBottom: 12,
  },
  ageLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ageLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  ageBadge: {
    backgroundColor: '#EDE9FE', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
  },
  ageValue: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
  burnTimesCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14,
  },
  burnTimesLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  burnTimesLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  burnTimesBadge: {
    backgroundColor: '#FFF7ED', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
  },
  burnTimesValue: { fontSize: 15, fontWeight: '700', color: '#F5840E' },
  tipsCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 24, overflow: 'hidden' },
  tipsCardInner: { padding: 20, borderRadius: 24 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  tipsEmoji: { fontSize: 20 },
  tipsTitle: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F5840E', marginTop: 6 },
  tipText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16, backgroundColor: '#ffffff',
  },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: 28,
    shadowColor: '#F5840E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaText: { color: '#ffffff', fontSize: 17, fontWeight: '800', marginRight: 10 },
  ctaArrow: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  menuCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
  },
  menuHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
  },
  menuItemIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center',
    justifyContent: 'center', marginRight: 14,
  },
  menuItemText: { flex: 1 },
  menuItemTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  menuItemDesc: { fontSize: 13, color: '#9CA3AF' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  menuCancelBtn: {
    marginTop: 16, backgroundColor: '#F3F4F6', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  menuCancelText: { fontSize: 16, fontWeight: '700', color: '#64748b' },
});

export default SkinHelthProfileScreen;
