import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@navigation/MainNavigator';

const { width } = Dimensions.get('window');
type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
const FRAME_SIZE = width * 0.72;

const FaceCaptureScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const frameScale = useRef(new Animated.Value(0.88)).current;
  const frameFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const btnSlide = useRef(new Animated.Value(50)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(frameScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(frameFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(btnSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(btnFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 8000, useNativeDriver: true }),
    ).start();
  }, [fadeIn, frameScale, frameFade, pulseAnim, btnSlide, btnFade, ringRotate]);

  const ringSpin = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleCameraCapture = async () => {
    const result = await launchCamera({
      mediaType: 'photo', cameraType: 'front', quality: 0.8, saveToPhotos: false,
    });
    if (result.assets && result.assets[0]?.uri) setCapturedImage(result.assets[0].uri);
  };

  const handleGalleryPick = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets[0]?.uri) setCapturedImage(result.assets[0].uri);
  };

  const handleContinue = () => {
    if (capturedImage) navigation.navigate('HealthProfileSetup', { imageUrl: capturedImage });
  };

  return (
    <View style={s.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient colors={['#0f172a', '#1e293b', '#0f172a']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <Animated.View style={[s.header, { opacity: fadeIn }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={16} color="#ffffff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Skin Analysis</Text>
        <TouchableOpacity style={s.helpBtn}>
          <FontAwesome name="question-circle" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </Animated.View>

      {/* Instructions */}
      <Animated.View style={[s.instructionWrap, { opacity: fadeIn }]}>
        <Text style={s.instructionTitle}>
          {capturedImage ? 'Photo Captured!' : 'Position Your Face'}
        </Text>
        <View style={s.statusPill}>
          <View style={[s.statusDot, capturedImage ? s.dotReady : s.dotActive]} />
          <Text style={s.statusText}>
            {capturedImage ? 'Ready for analysis' : 'No filters applied'}
          </Text>
        </View>
      </Animated.View>

      {/* Face Frame */}
      <View style={s.frameSection}>
        <Animated.View style={[s.frameOuter, { opacity: frameFade, transform: [{ scale: frameScale }] }]}>
          {/* Rotating ring dots */}
          <Animated.View style={[s.dashedRing, { transform: [{ rotate: ringSpin }] }]}>
            {[...Array(24)].map((_, i) => (
              <View key={i} style={[s.dashDot, { transform: [{ rotate: `${i * 15}deg` }, { translateY: -(FRAME_SIZE * 0.52) }] }]} />
            ))}
          </Animated.View>

          {/* Inner face circle */}
          <Animated.View style={[s.frameInner, { transform: [{ scale: pulseAnim }] }]}>
            {capturedImage ? (
              <Image source={{ uri: capturedImage }} style={s.capturedImg} resizeMode="cover" />
            ) : (
              <LinearGradient colors={['#1e293b', '#334155']} style={s.placeholder}>
                <View style={s.placeholderIcon}>
                  <FontAwesome name="user" size={40} color="#F5840E" />
                </View>
                <Text style={s.placeholderText}>Align face here</Text>
              </LinearGradient>
            )}
          </Animated.View>

          {/* Corner accents */}
          <View style={[s.corner, s.cTL]} />
          <View style={[s.corner, s.cTR]} />
          <View style={[s.corner, s.cBL]} />
          <View style={[s.corner, s.cBR]} />
        </Animated.View>
      </View>

      {/* Tip */}
      <Animated.View style={[s.tipWrap, { opacity: fadeIn }]}>
        <FontAwesome name="lightbulb-o" size={14} color="#F5840E" />
        <Text style={s.tipText}>
          {capturedImage ? 'Tap continue to analyze your skin type' : 'Ensure good lighting and no accessories'}
        </Text>
      </Animated.View>

      {/* Bottom Controls */}
      <Animated.View style={[s.controls, { opacity: btnFade, transform: [{ translateY: btnSlide }] }]}>
        {capturedImage ? (
          <>
            <TouchableOpacity style={s.sideBtn} onPress={() => setCapturedImage(null)}>
              <View style={s.sideBtnCircle}><FontAwesome name="refresh" size={18} color="#fff" /></View>
              <Text style={s.sideBtnLabel}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={handleContinue}>
              <LinearGradient colors={['#22c55e', '#16a34a']} style={s.mainBtn}>
                <FontAwesome name="check" size={26} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <View style={s.sideBtn} />
          </>
        ) : (
          <>
            <TouchableOpacity style={s.sideBtn} onPress={handleGalleryPick}>
              <View style={s.sideBtnCircle}><FontAwesome name="image" size={18} color="#fff" /></View>
              <Text style={s.sideBtnLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={handleCameraCapture}>
              <LinearGradient colors={['#F5840E', '#ea580c']} style={s.mainBtn}>
                <FontAwesome name="camera" size={26} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={s.sideBtn}>
              <View style={s.sideBtnCircle}><FontAwesome name="bolt" size={18} color="#fff" /></View>
              <Text style={s.sideBtnLabel}>Flash</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Privacy */}
      <Animated.View style={[s.privacyWrap, { opacity: fadeIn }]}>
        <FontAwesome name="lock" size={11} color="#475569" />
        <Text style={s.privacyText}>Your photo is processed locally and never stored</Text>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: (StatusBar.currentHeight || 0) + 12, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  helpBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  instructionWrap: { alignItems: 'center', paddingTop: 16 },
  instructionTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', textAlign: 'center' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 10,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  dotActive: { backgroundColor: '#F5840E' },
  dotReady: { backgroundColor: '#22c55e' },
  statusText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  frameSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frameOuter: {
    width: FRAME_SIZE + 32, height: FRAME_SIZE + 32,
    alignItems: 'center', justifyContent: 'center',
  },
  dashedRing: {
    position: 'absolute', width: FRAME_SIZE + 24, height: FRAME_SIZE + 24,
    alignItems: 'center', justifyContent: 'center',
  },
  dashDot: {
    position: 'absolute', width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(245,132,14,0.5)',
  },
  frameInner: {
    width: FRAME_SIZE, height: FRAME_SIZE, borderRadius: FRAME_SIZE / 2,
    overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(245,132,14,0.4)',
  },
  capturedImg: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(245,132,14,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  placeholderText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#F5840E', borderWidth: 3 },
  cTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  cTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  cBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  cBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  tipWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, gap: 8, marginBottom: 8,
  },
  tipText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 30, paddingVertical: 16,
  },
  sideBtn: { alignItems: 'center', width: 60 },
  sideBtnCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  sideBtnLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 6 },
  mainBtn: {
    width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F5840E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  privacyWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingBottom: 28, gap: 6,
  },
  privacyText: { fontSize: 11, color: '#475569' },
});

export default FaceCaptureScreen;
