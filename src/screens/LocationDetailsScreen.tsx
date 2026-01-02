import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Animated,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import { aiService, locationService } from '@services/api';
import type {
  SimpleCrowdPredictionResponse,
  SimpleGoldenHourResponse,
  SimpleDescriptionResponse,
} from '@services/api/AIService';
import type { LocationDetailsResponse } from '@services/api/LocationService';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.48;
const BOTTOM_BAR_HEIGHT = Platform.OS === 'ios' ? 110 : 90;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24;

// Loading animation
const loadingAnimation = require('@assets/animations/onbord1.json');

// Category colors with gradients
const CATEGORY_CONFIG: Record<string, { color: string; bgColor: string; icon: string; gradient: string[] }> = {
  history: { color: '#7C3AED', bgColor: '#EDE9FE', icon: 'landmark', gradient: ['#8B5CF6', '#7C3AED'] },
  adventure: { color: '#D97706', bgColor: '#FEF3C7', icon: 'hiking', gradient: ['#F59E0B', '#D97706'] },
  nature: { color: '#059669', bgColor: '#D1FAE5', icon: 'leaf', gradient: ['#10B981', '#059669'] },
  relaxation: { color: '#2563EB', bgColor: '#DBEAFE', icon: 'spa', gradient: ['#3B82F6', '#2563EB'] },
};

// Crowd level colors with enhanced styling
const CROWD_COLORS: Record<string, { color: string; bg: string; lightBg: string; icon: string; label: string; emoji: string }> = {
  LOW: { color: '#059669', bg: '#D1FAE5', lightBg: '#ECFDF5', icon: 'account-group-outline', label: 'Low', emoji: '😊' },
  MODERATE: { color: '#D97706', bg: '#FEF3C7', lightBg: '#FFFBEB', icon: 'account-group', label: 'Medium', emoji: '😐' },
  HIGH: { color: '#DC2626', bg: '#FEE2E2', lightBg: '#FEF2F2', icon: 'account-multiple', label: 'High', emoji: '😰' },
  EXTREME: { color: '#991B1B', bg: '#FEE2E2', lightBg: '#FEF2F2', icon: 'account-multiple', label: 'Very High', emoji: '🔥' },
};

interface LocationDetailsScreenProps {
  route: {
    params: {
      locationName: string;
      distance?: number;
      matchScore?: number;
      userLatitude?: number;
      userLongitude?: number;
    };
  };
  navigation: any;
}

export const LocationDetailsScreen: React.FC<LocationDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const { locationName, distance, matchScore } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [locationDetails, setLocationDetails] = useState<LocationDetailsResponse | null>(null);
  const [crowdData, setCrowdData] = useState<SimpleCrowdPredictionResponse | null>(null);
  const [goldenHourData, setGoldenHourData] = useState<SimpleGoldenHourResponse | null>(null);
  const [description, setDescription] = useState<SimpleDescriptionResponse | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const imageScrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // All interpolations must be defined before any conditional returns
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT - 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.3, 1],
    extrapolate: 'clamp',
  });

  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT],
    outputRange: [0, -IMAGE_HEIGHT / 3],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadLocationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, fadeAnim]);

  const loadLocationData = async () => {
    try {
      setIsLoading(true);

      const [details, crowd, goldenHour, desc] = await Promise.all([
        locationService.getLocationDetails(locationName),
        aiService.getSimpleCrowdPrediction(locationName).catch(() => null),
        aiService.getSimpleGoldenHour(locationName).catch(() => null),
        aiService
          .getSimpleDescription(locationName, {
            history: 0.5,
            adventure: 0.5,
            nature: 0.5,
            relaxation: 0.5,
          })
          .catch(() => null),
      ]);

      setLocationDetails(details);
      setCrowdData(crowd);
      setGoldenHourData(goldenHour);
      setDescription(desc);
    } catch (error) {
      console.error('Error loading location data:', error);
      Alert.alert('Error', 'Failed to load location details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    setCurrentImageIndex(index);
  };

  const getPrimaryCategory = () => {
    if (!locationDetails) return 'nature';
    const scores = locationDetails.preferenceScores;
    return Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <LottieView
          source={loadingAnimation}
          autoPlay
          loop
          style={styles.loadingAnimation}
        />
        <Text style={styles.loadingTitle}>Discovering Amazing Details...</Text>
        <Text style={styles.loadingSubtitle}>Fetching location insights just for you</Text>
      </View>
    );
  }

  if (!locationDetails) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorIconContainer}>
          <FontAwesome5 name="map-marked-alt" size={40} color="#EF4444" />
        </View>
        <Text style={styles.errorTitle}>Location Not Found</Text>
        <Text style={styles.errorSubtitle}>
          We couldn't find details for this location. Please try again later.
        </Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color="white" />
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primaryCategory = getPrimaryCategory();
  const categoryConfig = CATEGORY_CONFIG[primaryCategory];
  const crowdColor = crowdData ? CROWD_COLORS[crowdData.crowd_status] : null;
  const images = locationDetails.imageUrls || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Animated Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickyHeaderContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.stickyHeaderButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
            {locationName}
          </Text>
          <TouchableOpacity
            style={styles.stickyHeaderButton}
            onPress={() => setIsFavorite(!isFavorite)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? '#EF4444' : 'white'}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + 30 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Hero Image Section */}
        <Animated.View
          style={[
            styles.heroContainer,
            { transform: [{ translateY: imageTranslateY }, { scale: imageScale }] },
          ]}
        >
          {images.length > 0 ? (
            <>
              <ScrollView
                ref={imageScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleImageScroll}
                scrollEventThrottle={16}
              >
                {images.map((imageUrl, index) => (
                  <Image
                    key={index}
                    source={{ uri: imageUrl }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>

              {/* Image Pagination */}
              {images.length > 1 && (
                <View style={styles.paginationContainer}>
                  <View style={styles.paginationBg}>
                    {images.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.paginationDot,
                          index === currentImageIndex && styles.paginationDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <MaterialCommunityIcons name="image-off-outline" size={64} color="#D1D5DB" />
              <Text style={styles.noImageText}>No images available</Text>
            </View>
          )}

          {/* Gradient Overlay */}
          <View style={styles.heroGradientTop} />
          <View style={styles.heroGradientBottom} />

          {/* Top Navigation */}
          <View style={styles.topNavigation}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.navRightButtons}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setIsFavorite(!isFavorite)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFavorite ? '#EF4444' : 'white'}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} activeOpacity={0.8}>
                <Ionicons name="share-social-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Bottom Info */}
          <Animated.View style={[styles.heroBottomInfo, { opacity: titleOpacity }]}>
            <View style={styles.heroTitleContainer}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {locationName}
              </Text>
              {distance !== undefined && (
                <View style={styles.distanceBadge}>
                  <Ionicons name="location" size={14} color="#3B82F6" />
                  <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
                </View>
              )}
            </View>
            {matchScore !== undefined && (
              <View style={[styles.matchScoreBadge, { backgroundColor: categoryConfig.bgColor }]}>
                <Text style={[styles.matchScoreLabel, { color: categoryConfig.color }]}>Match</Text>
                <Text style={[styles.matchScoreValue, { color: categoryConfig.color }]}>
                  {Math.round(matchScore * 100)}%
                </Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>

        {/* Main Content Card */}
        <Animated.View style={[styles.contentCard, { opacity: fadeAnim }]}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Category Tags */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsScrollView}
            contentContainerStyle={styles.tagsContainer}
          >
            {Object.entries(locationDetails.preferenceScores)
              .filter(([_, score]) => score > 0.4)
              .sort((a, b) => b[1] - a[1])
              .map(([category]) => {
                const config = CATEGORY_CONFIG[category];
                if (!config) return null;
                return (
                  <View
                    key={category}
                    style={[styles.categoryTag, { backgroundColor: config.bgColor }]}
                  >
                    <FontAwesome5 name={config.icon} size={12} color={config.color} />
                    <Text style={[styles.categoryTagText, { color: config.color }]}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </View>
                );
              })}
            {locationDetails.isOutdoor && (
              <View style={[styles.categoryTag, { backgroundColor: '#D1FAE5' }]}>
                <MaterialCommunityIcons name="pine-tree" size={14} color="#059669" />
                <Text style={[styles.categoryTagText, { color: '#059669' }]}>Outdoor</Text>
              </View>
            )}
          </ScrollView>

          {/* Quick Stats Row */}
          <View style={styles.quickStatsRow}>
            {/* Crowd Level */}
            <View style={[styles.statCard, crowdColor ? { backgroundColor: crowdColor.lightBg } : {}]}>
              <View style={[styles.statIconContainer, crowdColor ? { backgroundColor: crowdColor.bg } : {}]}>
                {crowdColor ? (
                  <Text style={styles.statEmoji}>{crowdColor.emoji}</Text>
                ) : (
                  <MaterialCommunityIcons name="account-group-outline" size={20} color="#9CA3AF" />
                )}
              </View>
              <Text style={styles.statLabel}>Crowd</Text>
              <Text style={[styles.statValue, crowdColor ? { color: crowdColor.color } : {}]}>
                {crowdColor ? crowdColor.label : 'N/A'}
              </Text>
              {crowdData && (
                <View style={[styles.statBadge, { backgroundColor: crowdColor?.bg }]}>
                  <Text style={[styles.statBadgeText, { color: crowdColor?.color }]}>
                    {crowdData.crowd_percentage}%
                  </Text>
                </View>
              )}
            </View>

            {/* Golden Hour Morning */}
            <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <FontAwesome5 name="sun" size={16} color="#F59E0B" />
              </View>
              <Text style={styles.statLabel}>Morning</Text>
              <Text style={[styles.statValue, { color: '#D97706' }]}>
                {goldenHourData?.sunrise || '6:00'}
              </Text>
              <Text style={[styles.statSubtext, { color: '#92400E' }]}>
                to {goldenHourData?.sunrise_end || '7:00'}
              </Text>
            </View>

            {/* Golden Hour Evening */}
            <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FFEDD5' }]}>
                <FontAwesome5 name="moon" size={16} color="#EA580C" />
              </View>
              <Text style={styles.statLabel}>Evening</Text>
              <Text style={[styles.statValue, { color: '#EA580C' }]}>
                {goldenHourData?.sunset || '5:30'}
              </Text>
              <Text style={[styles.statSubtext, { color: '#9A3412' }]}>
                to {goldenHourData?.sunset_end || '6:30'}
              </Text>
            </View>
          </View>

          {/* AI Insights Section */}
          {description && description.description && (
            <View style={styles.aiSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <View style={styles.aiIconBg}>
                    <FontAwesome5 name="magic" size={14} color="#8B5CF6" />
                  </View>
                  <Text style={styles.sectionTitle}>AI Insights</Text>
                </View>
                <View style={styles.aiBadge}>
                  <MaterialCommunityIcons name="auto-fix" size={12} color="#8B5CF6" />
                  <Text style={styles.aiBadgeText}>AI Powered</Text>
                </View>
              </View>
              <View style={styles.aiCard}>
                <Text style={styles.aiText}>{description.description}</Text>
              </View>
            </View>
          )}

          {/* Today's Overview */}
          <View style={styles.overviewSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.aiIconBg, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="today" size={16} color="#3B82F6" />
                </View>
                <Text style={styles.sectionTitle}>Today's Overview</Text>
              </View>
            </View>

            <View style={styles.overviewCards}>
              {/* Weather-like Card for Crowd */}
              <View style={styles.overviewCard}>
                <View style={styles.overviewCardHeader}>
                  <MaterialCommunityIcons
                    name={crowdColor?.icon || 'account-group-outline'}
                    size={28}
                    color={crowdColor?.color || '#9CA3AF'}
                  />
                  <Text style={styles.overviewCardTitle}>Crowd Status</Text>
                </View>
                <View style={styles.overviewCardBody}>
                  <Text style={[styles.overviewMainValue, { color: crowdColor?.color || '#6B7280' }]}>
                    {crowdColor?.label || 'Unknown'}
                  </Text>
                  {crowdData && (
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${crowdData.crowd_percentage}%`,
                            backgroundColor: crowdColor?.color,
                          },
                        ]}
                      />
                    </View>
                  )}
                  <Text style={styles.overviewSubtext}>
                    {crowdData ? `${crowdData.crowd_percentage}% capacity` : 'Data unavailable'}
                  </Text>
                </View>
              </View>

              {/* Golden Hours Card */}
              <View style={styles.overviewCard}>
                <View style={styles.overviewCardHeader}>
                  <FontAwesome5 name="camera-retro" size={22} color="#F59E0B" />
                  <Text style={styles.overviewCardTitle}>Best Photo Time</Text>
                </View>
                <View style={styles.overviewCardBody}>
                  <View style={styles.goldenTimeRow}>
                    <View style={styles.goldenTimeItem}>
                      <FontAwesome5 name="sunrise" size={14} color="#EA580C" />
                      <Text style={styles.goldenTimeText}>
                        {goldenHourData?.sunrise || '6:00'} - {goldenHourData?.sunrise_end || '7:00'}
                      </Text>
                    </View>
                    <View style={styles.goldenTimeDivider} />
                    <View style={styles.goldenTimeItem}>
                      <FontAwesome5 name="sunset" size={14} color="#DC2626" />
                      <Text style={styles.goldenTimeText}>
                        {goldenHourData?.sunset || '5:30'} - {goldenHourData?.sunset_end || '6:30'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
            <View style={styles.buttonIconBg}>
              <FontAwesome5 name="calendar-check" size={16} color="#fff" />
            </View>
            <Text style={styles.primaryButtonText}>Plan Visit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('LocationChat', { locationName })}
          >
            <View style={[styles.buttonIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <MaterialCommunityIcons name="robot-happy" size={18} color="#fff" />
            </View>
            <Text style={styles.secondaryButtonText}>Ask AI Guide</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingAnimation: {
    width: 220,
    height: 220,
  },
  loadingTitle: {
    fontSize: 22,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },

  // Error State
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 50,
    marginTop: 32,
    gap: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#FFFFFF',
  },

  // Sticky Header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#3B82F6',
    paddingTop: STATUS_BAR_HEIGHT,
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  stickyHeaderButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 8,
  },

  // Hero Section
  heroContainer: {
    height: IMAGE_HEIGHT,
    width: '100%',
    backgroundColor: '#E5E7EB',
  },
  heroImage: {
    width: width,
    height: IMAGE_HEIGHT,
  },
  noImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  noImageText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: '#9CA3AF',
    marginTop: 12,
  },
  heroGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  heroGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Pagination
  paginationContainer: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  paginationBg: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },

  // Top Navigation
  topNavigation: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  navRightButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  // Hero Bottom Info
  heroBottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Gilroy-Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    fontFamily: 'Gilroy-SemiBold',
    color: '#1F2937',
  },
  matchScoreBadge: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  matchScoreLabel: {
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
  },
  matchScoreValue: {
    fontSize: 26,
    fontFamily: 'Gilroy-Bold',
    marginTop: -2,
  },

  // Content Card
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 12,
    paddingBottom: 20,
    minHeight: height * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Tags
  tagsScrollView: {
    marginBottom: 20,
  },
  tagsContainer: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryTagText: {
    fontSize: 13,
    fontFamily: 'Gilroy-SemiBold',
  },

  // Quick Stats
  quickStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statEmoji: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
    marginTop: 2,
  },
  statSubtext: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    marginTop: 2,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  statBadgeText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
  },

  // AI Section
  aiSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    fontFamily: 'Gilroy-SemiBold',
    color: '#7C3AED',
  },
  aiCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  aiText: {
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: '#374151',
    lineHeight: 24,
  },

  // Overview Section
  overviewSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  overviewCards: {
    gap: 12,
  },
  overviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  overviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  overviewCardTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#374151',
  },
  overviewCardBody: {},
  overviewMainValue: {
    fontSize: 28,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  overviewSubtext: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: '#6B7280',
  },
  goldenTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  goldenTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goldenTimeText: {
    fontSize: 15,
    fontFamily: 'Gilroy-SemiBold',
    color: '#374151',
  },
  goldenTimeDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
  },
  bottomBarContent: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#FFFFFF',
  },
});

export default LocationDetailsScreen;
