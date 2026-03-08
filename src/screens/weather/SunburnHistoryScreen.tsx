import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  Animated,
  StyleSheet,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'SunburnHistory'>;
type RouteProps = RouteProp<MainStackParamList, 'SunburnHistory'>;

const PRODUCT_OPTIONS = [
  { label: 'Never', icon: 'ban', desc: 'No products' },
  { label: 'Rarely', icon: 'tint', desc: 'Occasional use' },
  { label: 'Sometimes', icon: 'cloud', desc: 'Moderate use' },
  { label: 'Often', icon: 'check-circle', desc: 'Regular use' },
];

const PROTECTION_OPTIONS = ['Never', 'Rarely', 'Sometimes', 'Often'];
const TIMES_OPTIONS = ['One', 'Two', 'Three', 'Four', 'Five+'];

const SunburnHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const [skinProductInteraction, setSkinProductInteraction] = useState('Sometimes');
  const [useOfSunglasses, setUseOfSunglasses] = useState('Sometimes');
  const [historicalSunburnTimes, setHistoricalSunburnTimes] = useState('One');
  const [showTimesDropdown, setShowTimesDropdown] = useState(false);

  const imageUrl = route.params?.imageUrl ?? '';
  const skinType = route.params?.skinType ?? 3;
  const age = route.params?.age;

  const isSunburnType = skinType === 1 || skinType === 2;

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const q1Fade = useRef(new Animated.Value(0)).current;
  const q1Slide = useRef(new Animated.Value(40)).current;
  const q2Fade = useRef(new Animated.Value(0)).current;
  const q2Slide = useRef(new Animated.Value(40)).current;
  const q3Fade = useRef(new Animated.Value(0)).current;
  const q3Slide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(q1Fade, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(q1Slide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(q2Fade, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(q2Slide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(q3Fade, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(q3Slide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, [fadeIn, slideUp, q1Fade, q1Slide, q2Fade, q2Slide, q3Fade, q3Slide]);

  const handleSave = useCallback(() => {
    navigation.navigate('SkinHelthProfile', {
      imageUrl, skinType, skinProductInteraction, useOfSunglasses,
      historicalSunburnTimes, age: age ?? 0,
    });
  }, [navigation, imageUrl, skinType, skinProductInteraction, useOfSunglasses, historicalSunburnTimes, age]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeIn }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <FontAwesome name="arrow-left" size={16} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assessment</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Step Indicator */}
        <Animated.View style={[styles.stepRow, { opacity: fadeIn }]}>
          <View style={styles.stepDot} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, styles.stepActive]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <Text style={styles.title}>Sunburn History</Text>
          <Text style={styles.subtitle}>
            Help us calculate your personal UV risk based on your skin's history
          </Text>
        </Animated.View>

        {/* Question 1: Skin Products */}
        <Animated.View style={{ opacity: q1Fade, transform: [{ translateY: q1Slide }] }}>
          <Text style={styles.questionLabel}>How often do you use skin products?</Text>
          <View style={styles.optionGrid}>
            {PRODUCT_OPTIONS.map(item => {
              const active = skinProductInteraction === item.label;
              return (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => setSkinProductInteraction(item.label)}
                  activeOpacity={0.8}
                  style={styles.gridItem}
                >
                  {active ? (
                    <LinearGradient
                      colors={['#F5840E', '#ea580c']}
                      style={styles.gridItemInner}
                    >
                      <FontAwesome name={item.icon} size={22} color="#fff" />
                      <Text style={[styles.gridItemLabel, { color: '#fff' }]}>{item.label}</Text>
                      <Text style={[styles.gridItemDesc, { color: 'rgba(255,255,255,0.7)' }]}>{item.desc}</Text>
                      <View style={styles.gridCheck}>
                        <FontAwesome name="check" size={10} color="#F5840E" />
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.gridItemInner, { backgroundColor: '#F9FAFB' }]}>
                      <FontAwesome name={item.icon} size={22} color="#64748b" />
                      <Text style={styles.gridItemLabel}>{item.label}</Text>
                      <Text style={styles.gridItemDesc}>{item.desc}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Question 2: Sun Protection */}
        <Animated.View style={{ opacity: q2Fade, transform: [{ translateY: q2Slide }] }}>
          <Text style={styles.questionLabel}>
            How often do you use sunglasses / hat / shade?
          </Text>
          {PROTECTION_OPTIONS.map(item => {
            const active = useOfSunglasses === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setUseOfSunglasses(item)}
                style={[styles.radioItem, active && styles.radioItemActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.radioText, active && { color: '#F5840E', fontWeight: '700' }]}>{item}</Text>
                <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                  {active && <View style={styles.radioCircleDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Question 3: Sunburn/Tanning Times */}
        <Animated.View style={{ opacity: q3Fade, transform: [{ translateY: q3Slide }] }}>
          <Text style={[styles.questionLabel, { marginTop: 28 }]}>
            {isSunburnType
              ? 'How many times have you been sunburned?'
              : 'How many times have you been tanned?'}
          </Text>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowTimesDropdown(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownIconWrap}>
              <FontAwesome name="sun-o" size={14} color="#F5840E" />
            </View>
            <Text style={styles.dropdownText}>{historicalSunburnTimes}</Text>
            <FontAwesome name="chevron-down" size={12} color="#9CA3AF" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity activeOpacity={0.85} onPress={handleSave}>
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

      {/* Times Dropdown Modal */}
      <Modal
        visible={showTimesDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimesDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowTimesDropdown(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {isSunburnType ? 'Sunburn frequency' : 'Tanning frequency'}
            </Text>
            {TIMES_OPTIONS.map(item => {
              const active = historicalSunburnTimes === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => { setHistoricalSunburnTimes(item); setShowTimesDropdown(false); }}
                  style={[styles.modalItem, active && styles.modalItemActive]}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="sun-o" size={14} color={active ? '#F5840E' : '#9CA3AF'} />
                  <Text style={[styles.modalItemText, active && { color: '#F5840E', fontWeight: '700' }]}>{item}</Text>
                  <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                    {active && <View style={styles.radioCircleDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: (StatusBar.currentHeight || 0) + 8, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#0f172a' },
  headerSpacer: { width: 40 },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, marginBottom: 28,
  },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E7EB' },
  stepActive: { backgroundColor: '#F5840E', width: 28, borderRadius: 5 },
  stepLine: { width: 32, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 6 },
  title: { fontSize: 30, fontWeight: '900', color: '#0f172a', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', lineHeight: 22, marginBottom: 28 },
  questionLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  gridItem: { width: '48%', borderRadius: 18, overflow: 'hidden' },
  gridItemInner: {
    padding: 16, borderRadius: 18, alignItems: 'center', minHeight: 110,
    justifyContent: 'center',
  },
  gridItemLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 10 },
  gridItemDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  gridCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  radioItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 16, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  radioItemActive: { borderColor: '#F5840E', backgroundColor: '#FFF7ED' },
  radioText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151' },
  radioCircle: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioCircleActive: { borderColor: '#F5840E' },
  radioCircleDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F5840E' },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  dropdownIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  dropdownText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16,
    backgroundColor: '#ffffff',
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 16, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent', gap: 12,
  },
  modalItemActive: { borderColor: '#F5840E', backgroundColor: '#FFF7ED' },
  modalItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151' },
});

export default SunburnHistoryScreen;
