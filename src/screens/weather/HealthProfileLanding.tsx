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
import { MainStackParamList } from '@navigation/MainNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const HealthProfileLandingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const scaleHero = useRef(new Animated.Value(0.92)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const cardSlide1 = useRef(new Animated.Value(60)).current;
  const cardSlide2 = useRef(new Animated.Value(60)).current;
  const cardSlide3 = useRef(new Animated.Value(60)).current;
  const cardFade1 = useRef(new Animated.Value(0)).current;
  const cardFade2 = useRef(new Animated.Value(0)).current;
  const cardFade3 = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleHero, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(cardFade1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(cardSlide1, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(cardFade2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(cardSlide2, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(cardFade3, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(cardSlide3, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]),
      ]),
      Animated.spring(btnScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ]),
    ).start();
  }, [fadeIn, slideUp, scaleHero, floatAnim, cardSlide1, cardSlide2, cardSlide3, cardFade1, cardFade2, cardFade3, btnScale]);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero Section */}
        <Animated.View style={{ opacity: fadeIn, transform: [{ scale: scaleHero }] }}>
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800' }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(15,23,42,0.7)', '#0f172a']}
              style={styles.heroOverlay}
            />

            {/* Floating sun icon */}
            <Animated.View
              style={[styles.floatingSun, { transform: [{ translateY: floatTranslate }] }]}
            >
              <LinearGradient
                colors={['#F5840E', '#fbbf24']}
                style={styles.sunGradient}
              >
                <FontAwesome name="sun-o" size={28} color="#fff" />
              </LinearGradient>
            </Animated.View>

            {/* Hero text */}
            <Animated.View
              style={[styles.heroContent, { transform: [{ translateY: slideUp }] }]}
            >
              <View style={styles.badge}>
                <FontAwesome name="shield" size={10} color="#F5840E" />
                <Text style={styles.badgeText}>AI-POWERED PROTECTION</Text>
              </View>
              <Text style={styles.heroTitle}>Your Skin,{'\n'}Your Shield</Text>
              <Text style={styles.heroSubtitle}>
                Personalized UV protection based on your unique skin profile
              </Text>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Feature Cards */}
        <View style={styles.cardsSection}>
          <Animated.View
            style={[styles.featureCard, { opacity: cardFade1, transform: [{ translateY: cardSlide1 }] }]}
          >
            <LinearGradient
              colors={['#FFF7ED', '#FFEDD5']}
              style={styles.featureCardInner}
            >
              <View style={styles.featureIconWrap}>
                <FontAwesome name="camera" size={20} color="#F5840E" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Skin Analysis</Text>
                <Text style={styles.featureDesc}>AI detects your Fitzpatrick skin type from a photo</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="#F5840E" />
            </LinearGradient>
          </Animated.View>

          <Animated.View
            style={[styles.featureCard, { opacity: cardFade2, transform: [{ translateY: cardSlide2 }] }]}
          >
            <LinearGradient
              colors={['#EFF6FF', '#DBEAFE']}
              style={styles.featureCardInner}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: '#BFDBFE' }]}>
                <FontAwesome name="sun-o" size={20} color="#2563EB" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>UV Risk Rating</Text>
                <Text style={styles.featureDesc}>Real-time sun exposure limits tailored to you</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="#2563EB" />
            </LinearGradient>
          </Animated.View>

          <Animated.View
            style={[styles.featureCard, { opacity: cardFade3, transform: [{ translateY: cardSlide3 }] }]}
          >
            <LinearGradient
              colors={['#F0FDF4', '#DCFCE7']}
              style={styles.featureCardInner}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: '#BBF7D0' }]}>
                <FontAwesome name="heartbeat" size={20} color="#16a34a" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Smart Alerts</Text>
                <Text style={styles.featureDesc}>Sunscreen reminders & protection notifications</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="#16a34a" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Skincare visual banner */}
        <View style={styles.bannerSection}>
          <View style={styles.bannerCard}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1532635241-17e820acc59f?w=600' }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.bannerOverlay}
            />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTag}>☀️ DID YOU KNOW?</Text>
              <Text style={styles.bannerText}>
                80% of UV rays penetrate clouds.{'\n'}Protection matters even on cloudy days.
              </Text>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <Animated.View style={[styles.ctaSection, { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('HealthProfileSetup', { imageUrl: '' })}
          >
            <LinearGradient
              colors={['#F5840E', '#ea580c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>Create Your Profile</Text>
              <View style={styles.ctaArrow}>
                <FontAwesome name="arrow-right" size={16} color="#F5840E" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaHint}>Takes less than 2 minutes</Text>
        </Animated.View>

        {/* Trust footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <FontAwesome name="lock" size={14} color="#9CA3AF" />
              <Text style={styles.trustText}>Private</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <FontAwesome name="flask" size={14} color="#9CA3AF" />
              <Text style={styles.trustText}>Research-based</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <FontAwesome name="shield" size={14} color="#9CA3AF" />
              <Text style={styles.trustText}>Secure</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  heroContainer: { height: 420, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' },
  floatingSun: {
    position: 'absolute', top: 50, right: 30,
  },
  sunGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F5840E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  heroContent: { position: 'absolute', bottom: 30, left: 24, right: 24 },
  badge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,132,14,0.15)', paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: 20, marginBottom: 12, gap: 6,
  },
  badgeText: { color: '#F5840E', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: '#ffffff', fontSize: 36, fontWeight: '900', lineHeight: 42, marginBottom: 8 },
  heroSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 22 },
  cardsSection: { paddingHorizontal: 20, paddingTop: 28, gap: 12 },
  featureCard: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  featureCardInner: {
    flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20,
  },
  featureIconWrap: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: '#FED7AA',
    alignItems: 'center', justifyContent: 'center',
  },
  featureTextWrap: { flex: 1, marginLeft: 14 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  featureDesc: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  bannerSection: { paddingHorizontal: 20, marginTop: 24 },
  bannerCard: { borderRadius: 24, overflow: 'hidden', height: 180 },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%' },
  bannerContent: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  bannerTag: { color: '#fbbf24', fontSize: 12, fontWeight: '800', marginBottom: 6, letterSpacing: 0.5 },
  bannerText: { color: '#ffffff', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  ctaSection: { paddingHorizontal: 20, marginTop: 32, alignItems: 'center' },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, paddingHorizontal: 40, borderRadius: 30,
    width: width - 40,
    shadowColor: '#F5840E', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  ctaText: { color: '#ffffff', fontSize: 18, fontWeight: '800', marginRight: 12 },
  ctaArrow: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaHint: { color: '#9CA3AF', fontSize: 13, marginTop: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40, alignItems: 'center' },
  footerDivider: { width: 40, height: 3, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 16 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#D1D5DB' },
  trustText: { color: '#9CA3AF', fontSize: 13 },
});

export default HealthProfileLandingScreen;
