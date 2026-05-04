import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { MainStackParamList } from '@navigation/MainNavigator';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { API_CONFIG } from '@constants';

const { width } = Dimensions.get('window');
type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'SkinAnalysis'>;
type RouteProps = RouteProp<MainStackParamList, 'SkinAnalysis'>;

const SkinAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { imageUrl, age } = route.params;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const imgScale = useRef(new Animated.Value(0.9)).current;
  const imgFade = useRef(new Animated.Value(0)).current;
  const btnSlide = useRef(new Animated.Value(40)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(imgScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(imgFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(btnSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(btnFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, [fadeIn, slideUp, imgScale, imgFade, btnSlide, btnFade, pulseAnim]);

  const handleImageSelection = (response: ImagePickerResponse) => {
    if (response.didCancel) return;
    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Failed to select image');
      return;
    }
    if (response.assets && response.assets[0]?.uri) {
      setSelectedImage(response.assets[0].uri);
    }
  };

  const openGallery = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 1, selectionLimit: 1 }, handleImageSelection);
  };

  const openCamera = () => {
    launchCamera({ mediaType: 'photo', quality: 1, saveToPhotos: true }, handleImageSelection);
  };

  const analyzeSkin = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'skin_image.jpg',
      } as any);

      let API_URL: string;
      if (__DEV__) {
        // Development: use localhost on the host machine
        API_URL =
          Platform.OS === 'android'
            ? 'http://10.0.2.2:8002/api/skin/fitzpatrick_predict'
            : 'http://localhost:8002/api/skin/fitzpatrick_predict';
      } else {
        // Production: use the deployed ML service
        API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}/ml/weather/api/skin/fitzpatrick_predict`;
      }

      const response = await fetch(API_URL, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to analyze skin');
      const data = await response.json();
      navigation.navigate('SkinAnalysisResult', {
        imageUrl: selectedImage,
        skinType: data.predicted_skin_type,
        age,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze skin. Please try again.');
      console.error('Skin analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (imageUrl) setSelectedImage(imageUrl);
  }, [imageUrl]);

  return (
    <View style={s.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Header */}
      <Animated.View style={[s.header, { opacity: fadeIn }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() =>
            navigation.navigate('HealthProfileSetup', { imageUrl: selectedImage ?? '' })
          }
        >
          <FontAwesome name="arrow-left" size={16} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Skin Analysis</Text>
        <View style={s.headerSpacer} />
      </Animated.View>

      {/* Title */}
      <Animated.View
        style={[s.titleWrap, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}
      >
        <Text style={s.title}>Let's check your{'\n'}sensitivity.</Text>
        <Text style={s.subtitle}>Upload a clear image in good lighting,{'\n'}without filters.</Text>
      </Animated.View>

      {/* Image Upload Area */}
      <Animated.View
        style={[s.imageSection, { opacity: imgFade, transform: [{ scale: imgScale }] }]}
      >
        <View style={s.imageCard}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={s.uploadedImage} resizeMode="cover" />
          ) : (
            <Animated.View style={[s.emptyState, { transform: [{ scale: pulseAnim }] }]}>
              <View style={s.emptyIcon}>
                <FontAwesome name="user" size={32} color="#F5840E" />
              </View>
              <Text style={s.emptyTitle}>No Image Selected</Text>
              <Text style={s.emptyDesc}>Use the buttons below to add a photo</Text>
            </Animated.View>
          )}
          {selectedImage && (
            <View style={s.imageBadge}>
              <FontAwesome name="check-circle" size={12} color="#22c55e" />
              <Text style={s.imageBadgeText}>Photo Ready</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Camera / Gallery Buttons */}
      <Animated.View
        style={[s.btnRow, { opacity: btnFade, transform: [{ translateY: btnSlide }] }]}
      >
        <TouchableOpacity style={s.optionBtn} onPress={openCamera}>
          <View style={s.optionIcon}>
            <FontAwesome name="camera" size={22} color="#F5840E" />
          </View>
          <Text style={s.optionLabel}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.optionBtn} onPress={openGallery}>
          <View style={[s.optionIcon, { backgroundColor: '#F1F5F9' }]}>
            <FontAwesome name="image" size={22} color="#64748b" />
          </View>
          <Text style={s.optionLabel}>Gallery</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* CTA */}
      <View style={s.ctaWrap}>
        <TouchableOpacity activeOpacity={0.85} onPress={analyzeSkin} disabled={isLoading}>
          <LinearGradient
            colors={['#F5840E', '#ea580c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.ctaBtn}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <FontAwesome name="search" size={16} color="#ffffff" />
                <Text style={s.ctaText}>Analyze Skin Type</Text>
                <View style={s.ctaArrow}>
                  <FontAwesome name="arrow-right" size={12} color="#F5840E" />
                </View>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <View style={s.privacyWrap}>
          <FontAwesome name="lock" size={11} color="#94a3b8" />
          <Text style={s.privacyText}>Your photo is processed locally for privacy.</Text>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#0f172a' },
  headerSpacer: { width: 40 },
  titleWrap: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a', textAlign: 'center', lineHeight: 34 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 20 },
  imageSection: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  imageCard: {
    width: width - 40,
    height: 280,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FDBA74',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  uploadedImage: { width: '100%', height: '100%' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: '#94a3b8' },
  imageBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  imageBadgeText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  btnRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 14,
    paddingTop: 20,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  ctaWrap: { marginTop: 'auto', paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    width: width - 40,
    gap: 10,
    shadowColor: '#F5840E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  ctaArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  privacyText: { fontSize: 12, color: '#94a3b8' },
});

export default SkinAnalysisScreen;
