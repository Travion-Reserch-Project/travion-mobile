import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { MainStackParamList } from '@navigation/MainNavigator';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '@stores';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
type RouteProps = RouteProp<MainStackParamList, 'HealthProfileSetup'>;

const HealthProfileSetupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [age, setAge] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const route = useRoute<RouteProps>();
  const { imageUrl } = route.params;
  const { user } = useAuthStore();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const photoScale = useRef(new Animated.Value(0.8)).current;
  const photoOpacity = useRef(new Animated.Value(0)).current;
  const inputSlide = useRef(new Animated.Value(40)).current;
  const inputFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(photoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(photoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(inputFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(inputSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();
  }, [fadeIn, slideUp, photoScale, photoOpacity, inputSlide, inputFade, pulseAnim]);

  const handleContinue = async () => {
    if (!age.trim()) {
      Alert.alert('Age Required', 'Please enter your age to continue.');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 16) {
      Alert.alert('Invalid Age', 'You must be at least 16 years old to use this app.');
      return;
    }
    if (!user?.userId) {
      Alert.alert('Error', 'User not authenticated. Please log in again.');
      return;
    }

    setIsLoading(true);
    try {
      navigation.navigate('SkinAnalysis', { imageUrl: imageUrl ?? '', age: ageNum });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to continue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeIn }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <FontAwesome name="arrow-left" size={18} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile Setup</Text>
            <View style={styles.headerSpacer} />
          </Animated.View>

          {/* Step Indicator */}
          <Animated.View style={[styles.stepRow, { opacity: fadeIn }]}>
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
            <Text style={styles.title}>Let's get to{'\n'}know you</Text>
            <Text style={styles.subtitle}>
              We need a few details to personalize your UV safety plan
            </Text>
          </Animated.View>

          {/* Photo Section */}
          <Animated.View
            style={[
              styles.photoSection,
              { opacity: photoOpacity, transform: [{ scale: photoScale }] },
            ]}
          >
            {imageUrl ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.photoEditBtn}
                  onPress={() => navigation.navigate('FaceCapture')}
                >
                  <LinearGradient
                    colors={['#F5840E', '#ea580c']}
                    style={styles.photoEditGradient}
                  >
                    <FontAwesome name="pencil" size={14} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={styles.photoPlaceholder}
                  onPress={() => navigation.navigate('FaceCapture')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FFF7ED', '#FFEDD5']}
                    style={styles.photoPlaceholderInner}
                  >
                    <View style={styles.cameraCircle}>
                      <FontAwesome name="camera" size={24} color="#F5840E" />
                    </View>
                    <Text style={styles.photoLabel}>Add Your Photo</Text>
                    <Text style={styles.photoHint}>For skin type analysis</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>

          {/* Age Input */}
          <Animated.View
            style={{ opacity: inputFade, transform: [{ translateY: inputSlide }] }}
          >
            <Text style={styles.inputLabel}>How old are you?</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrap}>
                <FontAwesome name="user" size={16} color="#F5840E" />
              </View>
              <TextInput
                placeholder="Enter your age (16+)"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                style={styles.input}
                value={age}
                onChangeText={setAge}
                maxLength={3}
              />
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
              <LinearGradient
                colors={['#FFF7ED', '#FFEDD5']}
                style={styles.infoBannerInner}
              >
                <View style={styles.infoIconWrap}>
                  <FontAwesome name="shield" size={12} color="#F5840E" />
                </View>
                <Text style={styles.infoText}>
                  Your data is encrypted and used only for personalized sun safety
                </Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </ScrollView>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={isLoading}
          >
            <LinearGradient
              colors={isLoading ? ['#D1D5DB', '#9CA3AF'] : ['#F5840E', '#ea580c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Continue</Text>
                  <View style={styles.ctaArrow}>
                    <FontAwesome name="arrow-right" size={14} color="#F5840E" />
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: (StatusBar.currentHeight || 0) + 12, paddingBottom: 8,
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
  stepDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E7EB',
  },
  stepActive: { backgroundColor: '#F5840E', width: 28, borderRadius: 5 },
  stepLine: { width: 32, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 6 },
  title: { fontSize: 32, fontWeight: '900', color: '#0f172a', lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', lineHeight: 22, marginBottom: 28 },
  photoSection: { alignItems: 'center', marginBottom: 32 },
  photoContainer: { position: 'relative' },
  photo: { width: 180, height: 180, borderRadius: 90 },
  photoEditBtn: { position: 'absolute', bottom: 4, right: 4 },
  photoEditGradient: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#ffffff',
  },
  photoPlaceholder: { borderRadius: 24, overflow: 'hidden' },
  photoPlaceholderInner: {
    width: width - 100, paddingVertical: 36, alignItems: 'center', borderRadius: 24,
    borderWidth: 2, borderColor: '#FED7AA', borderStyle: 'dashed',
  },
  cameraCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#F5840E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  photoLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  photoHint: { fontSize: 13, color: '#9CA3AF' },
  inputLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 16, paddingHorizontal: 16, height: 56,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  inputIconWrap: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  input: { flex: 1, fontSize: 16, color: '#0f172a', fontWeight: '600' },
  infoBanner: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  infoBannerInner: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16,
  },
  infoIconWrap: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#FED7AA',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
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
});

export default HealthProfileSetupScreen;
