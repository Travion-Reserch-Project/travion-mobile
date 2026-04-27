import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Platform,
  PermissionsAndroid,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  Keyboard,
  Dimensions,
  NativeModules,
} from 'react-native';
import Geocoder from 'react-native-geocoding';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import { useAuthStore } from '@stores';
import { aiService, userService, locationService } from '@services/api';
import { GOOGLE_MAPS_API_KEY } from '@config/maps';
import type { TravelPreferenceScores } from '@types';
import type {
  SimpleRecommendationLocation,
  SimpleCrowdPredictionResponse,
} from '@services/api/AIService';
import type { LocationDetailsResponse } from '@services/api/LocationService';
import { haversineDistance, calculateMatchScore, getCurrentPosition } from '@utils';

// Initialize Google Maps Geocoding
Geocoder.init(GOOGLE_MAPS_API_KEY, { language: 'en' });

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : (NativeModules.StatusBarManager?.HEIGHT ?? StatusBar.currentHeight ?? 24);

// Default placeholder image
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400';

// Animations
const loadingAnimation = require('@assets/animations/onbord1.json');
const botAnimation = require('@assets/animations/onbord2.json');

// Category colors and icons
const CATEGORY_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: string; iconFamily: string; emoji: string }
> = {
  history: {
    color: '#8B5CF6',
    bgColor: '#F3E8FF',
    icon: 'landmark',
    iconFamily: 'fa5',
    emoji: '🏛️',
  },
  adventure: {
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'hiking',
    iconFamily: 'fa5',
    emoji: '🧗',
  },
  nature: {
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'leaf',
    iconFamily: 'fa5',
    emoji: '🌿',
  },
  relaxation: {
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'spa',
    iconFamily: 'fa5',
    emoji: '🧘',
  },
};

// Crowd level colors
const CROWD_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  LOW: { color: '#10B981', bg: '#D1FAE5', label: 'Not Crowded' },
  MODERATE: { color: '#F59E0B', bg: '#FEF3C7', label: 'Moderate' },
  HIGH: { color: '#EF4444', bg: '#FEE2E2', label: 'Busy' },
  EXTREME: { color: '#DC2626', bg: '#FEE2E2', label: 'Very Busy' },
};

// Recommendation level helper
const getRecommendationLevel = (score: number): { level: string; color: string; bgColor: string; icon: string } => {
  if (score >= 0.7) {
    return { level: 'Highly Recommended', color: '#059669', bgColor: '#D1FAE5', icon: 'star' };
  }
  if (score >= 0.5) {
    return { level: 'Recommended', color: '#D97706', bgColor: '#FEF3C7', icon: 'thumbs-up' };
  }
  return { level: 'Worth Visiting', color: '#6B7280', bgColor: '#F3F4F6', icon: 'info-circle' };
};

// Sort options
type SortOption = 'recommended' | 'distance' | 'crowd';
const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
  { key: 'recommended', label: 'Best Match', icon: 'magic' },
  { key: 'distance', label: 'Nearest', icon: 'route' },
  { key: 'crowd', label: 'Less Crowded', icon: 'users' },
];

// Distance options for search radius
const DISTANCE_OPTIONS = [10, 25, 50, 100, 250];

// Location type filter options
type LocationTypeFilter = 'all' | 'outdoor' | 'indoor';

interface LocationTypeOption {
  key: LocationTypeFilter;
  label: string;
  icon: string;
  iconFamily: 'fa5' | 'mci';
}

const LOCATION_TYPE_OPTIONS: LocationTypeOption[] = [
  { key: 'all', label: 'All Places', icon: 'globe-americas', iconFamily: 'fa5' },
  { key: 'outdoor', label: 'Outdoor', icon: 'tree', iconFamily: 'fa5' },
  { key: 'indoor', label: 'Indoor', icon: 'home', iconFamily: 'fa5' },
];

// Extended location with image
interface RecommendationWithImage extends SimpleRecommendationLocation {
  imageUrl: string | null;
}

interface LocationCardProps {
  location: RecommendationWithImage;
  index: number;
  onPress: () => void;
  onChatPress: () => void;
  preferences: TravelPreferenceScores;
}

// Pulsing live dot component
const LiveDot: React.FC<{ color?: string }> = ({ color = '#10B981' }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          opacity: 0.3,
          transform: [{ scale: pulseAnim }],
        }}
      />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
};

const LocationCard: React.FC<LocationCardProps> = ({
  location,
  index,
  onPress,
  onChatPress,
  preferences,
}) => {
  const [crowdData, setCrowdData] = useState<SimpleCrowdPredictionResponse | null>(null);
  const [isLoadingCrowd, setIsLoadingCrowd] = useState(false);
  const [imageError, setImageError] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Determine primary category based on highest preference score match
  const getPrimaryCategory = (): string => {
    const scores = location.preference_scores;
    const userWeightedScores = {
      history: scores.history * preferences.history,
      adventure: scores.adventure * preferences.adventure,
      nature: scores.nature * preferences.nature,
      relaxation: scores.relaxation * preferences.relaxation,
    };
    return Object.entries(userWeightedScores).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  };

  const primaryCategory = getPrimaryCategory();
  const categoryConfig = CATEGORY_CONFIG[primaryCategory];
  const recommendation = getRecommendationLevel(location.similarity_score);

  useEffect(() => {
    // Animate card entrance with spring
    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 50,
      friction: 8,
      delay: index * 120,
      useNativeDriver: true,
    }).start();

    // Fetch crowd data
    fetchCrowdData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatedValue, index]);

  const fetchCrowdData = async () => {
    try {
      setIsLoadingCrowd(true);
      const data = await aiService.getSimpleCrowdPrediction(location.name);
      setCrowdData(data);
    } catch (crowdError) {
      console.log('Crowd data not available for:', location.name, crowdError);
    } finally {
      setIsLoadingCrowd(false);
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const crowdColor = crowdData ? CROWD_COLORS[crowdData.crowd_status] : null;

  return (
    <Animated.View
      style={{
        transform: [{ translateY }, { scale: scaleAnim }],
        opacity,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ marginBottom: 16, marginHorizontal: 16 }}
      >
        <View style={cardStyles.container}>
          {/* Image Section */}
          <View style={cardStyles.imageSection}>
            <Image
              source={{ uri: (!imageError && location.imageUrl) ? location.imageUrl : PLACEHOLDER_IMAGE }}
              style={cardStyles.image}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
            {/* Gradient Overlay */}
            <View style={cardStyles.imageOverlay} />

            {/* Top Left - Rank */}
            <View style={cardStyles.rankBadge}>
              <Text style={cardStyles.rankText}>#{location.rank}</Text>
            </View>

            {/* Top Right - Recommendation Level */}
            <View style={[cardStyles.recBadge, { backgroundColor: recommendation.bgColor }]}>
              <FontAwesome5 name={recommendation.icon} size={10} color={recommendation.color} solid />
              <Text style={[cardStyles.recText, { color: recommendation.color }]}>
                {recommendation.level}
              </Text>
            </View>

            {/* Bottom - Name & Location Info */}
            <View style={cardStyles.imageBottomContent}>
              <Text style={cardStyles.locationName} numberOfLines={1}>
                {location.name}
              </Text>
              <View style={cardStyles.locationMeta}>
                <FontAwesome5 name="map-marker-alt" size={11} color="#fff" />
                <Text style={cardStyles.distanceText}>
                  {location.distance_km.toFixed(1)} km
                </Text>
                <View style={cardStyles.typeBadge}>
                  {location.is_outdoor ? (
                    <>
                      <MaterialCommunityIcons name="tree" size={11} color="#34D399" />
                      <Text style={[cardStyles.typeText, { color: '#34D399' }]}>Outdoor</Text>
                    </>
                  ) : (
                    <>
                      <FontAwesome5 name="home" size={9} color="#93C5FD" />
                      <Text style={[cardStyles.typeText, { color: '#93C5FD' }]}>Indoor</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Content Section */}
          <View style={cardStyles.content}>
            {/* Category Tags Row */}
            <View style={cardStyles.tagsRow}>
              {Object.entries(location.preference_scores)
                .filter(([_, score]) => score > 0.5)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([category]) => {
                  const config = CATEGORY_CONFIG[category];
                  return (
                    <View
                      key={category}
                      style={[cardStyles.tag, { backgroundColor: config.bgColor }]}
                    >
                      <Text style={cardStyles.tagEmoji}>{config.emoji}</Text>
                      <Text style={[cardStyles.tagText, { color: config.color }]}>
                        {category}
                      </Text>
                    </View>
                  );
                })}
            </View>

            {/* Crowd + Best Time Row */}
            {isLoadingCrowd ? (
              <View style={cardStyles.crowdRow}>
                <View style={cardStyles.crowdDotLoading}>
                  <ActivityIndicator size="small" color={categoryConfig.color} />
                </View>
                <Text style={cardStyles.crowdLoadingText}>Live crowd data...</Text>
              </View>
            ) : crowdData ? (
              <View style={[cardStyles.crowdRow, { backgroundColor: crowdColor?.bg }]}>
                <LiveDot color={crowdColor?.color} />
                <Text style={[cardStyles.crowdLabel, { color: crowdColor?.color }]}>
                  {crowdColor?.label}
                </Text>
                <View style={cardStyles.crowdDivider} />
                <Ionicons name="time-outline" size={13} color="#6B7280" />
                <Text style={cardStyles.bestTimeText}>
                  Best: {crowdData.optimal_times[0]?.time || 'N/A'}
                </Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={cardStyles.actionsRow}>
              <TouchableOpacity
                style={[cardStyles.exploreBtn, { backgroundColor: categoryConfig.bgColor }]}
                onPress={onPress}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="compass" size={15} color={categoryConfig.color} />
                <Text style={[cardStyles.exploreBtnText, { color: categoryConfig.color }]}>
                  Explore
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={cardStyles.aiBtn}
                onPress={onChatPress}
                activeOpacity={0.8}
              >
                <LottieView
                  source={botAnimation}
                  autoPlay
                  loop
                  style={{ width: 22, height: 22 }}
                />
                <Text style={cardStyles.aiBtnText}>Ask AI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  imageSection: {
    height: 180,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#F5840E',
  },
  recBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  recText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
  },
  imageBottomContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  locationName: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  distanceText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
  },
  content: {
    padding: 14,
    gap: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  tagEmoji: {
    fontSize: 12,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Gilroy-SemiBold',
    textTransform: 'capitalize',
  },
  crowdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
  },
  crowdDotLoading: {
    width: 20,
    alignItems: 'center',
  },
  crowdLoadingText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#9CA3AF',
  },
  crowdLabel: {
    fontSize: 13,
    fontFamily: 'Gilroy-SemiBold',
  },
  crowdDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  bestTimeText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  exploreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  exploreBtnText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
  },
  aiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F5840E',
    gap: 6,
  },
  aiBtnText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
});

interface TourGuideScreenProps {
  onChatbotPress?: () => void;
  navigation?: any;
}

export const TourGuideScreen: React.FC<TourGuideScreenProps> = ({ onChatbotPress, navigation }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationWithImage[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [preferences, setPreferences] = useState<TravelPreferenceScores>({
    history: 0.5,
    adventure: 0.5,
    nature: 0.5,
    relaxation: 0.5,
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number>(10); // Default 10km
  const [selectedLocationType, setSelectedLocationType] = useState<LocationTypeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationDetailsResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferencesLoadedRef = useRef(false);
  const lastFetchedLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const loadPreferences = async () => {
    try {
      const prefs = await userService.getTravelPreferences();
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (prefError) {
      console.log('Using default preferences', prefError);
    }
  };

  // Animate header on mount
  useEffect(() => {
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [headerFadeAnim]);

  // Animate search bar focus
  useEffect(() => {
    Animated.spring(searchBarAnim, {
      toValue: isSearchFocused ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [isSearchFocused, searchBarAnim]);

  // Reload recommendations when location changes significantly (> 0.5 km)
  useEffect(() => {
    if (!userLocation) return;
    const prev = lastFetchedLocationRef.current;
    if (!prev) return; // initial fetch is handled by requestLocationPermission
    const dist = haversineDistance(prev.latitude, prev.longitude, userLocation.latitude, userLocation.longitude);
    if (dist > 0.5) {
      fetchRecommendations(userLocation.latitude, userLocation.longitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  // Handle search with debouncing
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length === 0) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    // Show loading state
    setIsSearching(true);
    setShowSearchResults(true);

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await locationService.searchLocations(query, 10);
        setSearchResults(results);
      } catch (searchError) {
        console.error('Search error:', searchError);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    Keyboard.dismiss();
  }, []);

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    (location: LocationDetailsResponse) => {
      clearSearch();
      // Calculate distance if user location is available
      let distance: number | undefined;
      if (userLocation?.latitude && userLocation?.longitude) {
        distance = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          location.coordinates.latitude,
          location.coordinates.longitude,
        );
      }

      // Calculate match score using current preferences
      const matchScore = calculateMatchScore(preferences, location.preferenceScores);

      // Navigate to location details with calculated values
      if (navigation) {
        navigation.navigate('LocationDetails', {
          locationName: location.name,
          distance: distance,
          matchScore: matchScore,
          userLatitude: userLocation?.latitude,
          userLongitude: userLocation?.longitude,
        });
      }
    },
    [clearSearch, navigation, userLocation, preferences],
  );

  // Reverse geocoding to get city name from coordinates using Google Maps API
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await Geocoder.from(latitude, longitude);

      if (response.results && response.results.length > 0) {
        const addressComponents = response.results[0].address_components;

        // Try to find city/locality
        const city = addressComponents.find(
          component =>
            component.types.includes('locality') ||
            component.types.includes('administrative_area_level_2'),
        );

        if (city) {
          return city.long_name;
        }

        // Fallback to administrative area
        const area = addressComponents.find(component =>
          component.types.includes('administrative_area_level_1'),
        );

        if (area) {
          return area.long_name;
        }

        // Last resort: use formatted address
        const formatted = response.results[0].formatted_address;
        const parts = formatted.split(',');
        return parts[0].trim();
      }

      return 'Unknown Location';
    } catch (geocodeError) {
      console.error('Google Maps reverse geocoding error:', geocodeError);
      // Fallback to coordinates if geocoding fails
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Travion needs access to your location to recommend nearby places.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission denied, using default location');
          // Use default location (Colombo, Sri Lanka)
          const defaultLat = 6.9271;
          const defaultLng = 79.8612;
          const cityName = await reverseGeocode(defaultLat, defaultLng);
          setUserLocation({ latitude: defaultLat, longitude: defaultLng, address: cityName });
          fetchRecommendations(defaultLat, defaultLng);
          return;
        }
      }
      getCurrentLocation();
    } catch (err) {
      console.error('Permission error:', err);
      // Use default location (Colombo, Sri Lanka)
      const defaultLat = 6.9271;
      const defaultLng = 79.8612;
      const cityName = await reverseGeocode(defaultLat, defaultLng);
      setUserLocation({ latitude: defaultLat, longitude: defaultLng, address: cityName });
      fetchRecommendations(defaultLat, defaultLng);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const position = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
        retryAttempts: 1,
      });
      const { latitude, longitude } = position;
      console.log('Location obtained:', latitude, longitude);

      // Get city name from coordinates
      const cityName = await reverseGeocode(latitude, longitude);
      console.log('City name:', cityName);

      setUserLocation({ latitude, longitude, address: cityName });
      fetchRecommendations(latitude, longitude);
    } catch (locationError: any) {
      console.error('Location error:', locationError?.message || locationError);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Using default location (Colombo).',
        [{ text: 'OK' }],
      );

      // Use default location (Colombo, Sri Lanka)
      const defaultLat = 6.9271;
      const defaultLng = 79.8612;
      const cityName = await reverseGeocode(defaultLat, defaultLng);
      setUserLocation({ latitude: defaultLat, longitude: defaultLng, address: cityName });
      fetchRecommendations(defaultLat, defaultLng);
    }
  };

  const fetchRecommendations = async (
    lat: number,
    lng: number,
    distanceOverride?: number,
    locationTypeOverride?: LocationTypeFilter,
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      lastFetchedLocationRef.current = { latitude: lat, longitude: lng };

      // Use override if provided, otherwise use state value
      const maxDistance = distanceOverride ?? selectedDistance;
      const locationType = locationTypeOverride ?? selectedLocationType;

      // Convert location type to outdoor_only parameter
      // true = outdoor only, false = indoor only, null/undefined = both
      const outdoorOnly = locationType === 'all' ? null : locationType === 'outdoor';

      const response = await aiService.getSimpleRecommendations({
        latitude: lat,
        longitude: lng,
        preferences: preferences,
        max_distance_km: maxDistance,
        top_k: 20, // Max allowed by backend validation
        outdoor_only: outdoorOnly,
        min_match_score: 0.35, // Only show 35%+ matches
      });

      if (response.recommendations && response.recommendations.length > 0) {
        // Fetch images for all recommended locations
        const locationNames = response.recommendations.map(r => r.name);
        const imagesData = await locationService.getBulkLocationImages(locationNames);

        // Merge recommendations with images
        const recommendationsWithImages: RecommendationWithImage[] = response.recommendations.map(
          rec => ({
            ...rec,
            imageUrl: imagesData[rec.name]?.primaryImage || null,
          }),
        );

        setRecommendations(recommendationsWithImages);
      } else {
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error('Recommendations error:', err);
      setError(err.message || 'Failed to fetch recommendations');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (userLocation) {
      fetchRecommendations(userLocation.latitude, userLocation.longitude);
    } else {
      getCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, preferences, selectedDistance, selectedLocationType]);

  const handleLocationPress = (location: SimpleRecommendationLocation) => {
    if (navigation) {
      navigation.navigate('LocationDetails', {
        locationName: location.name,
        distance: location.distance_km,
        matchScore: location.similarity_score,
        userLatitude: userLocation?.latitude,
        userLongitude: userLocation?.longitude,
      });
    }
  };

  // Filter and sort recommendations
  const filteredRecommendations = recommendations
    .filter(loc => {
      if (!selectedCategory) return true;
      return loc.preference_scores[selectedCategory as keyof typeof loc.preference_scores] > 0.5;
    })
    .sort((a, b) => {
      if (sortBy === 'distance') return a.distance_km - b.distance_km;
      if (sortBy === 'crowd') return a.similarity_score - b.similarity_score; // placeholder
      return b.similarity_score - a.similarity_score; // recommended (default)
    });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Load user preferences on mount
  useEffect(() => {
    const initPreferences = async () => {
      await loadPreferences();
      preferencesLoadedRef.current = true;
      // Now request location and fetch recommendations
      requestLocationPermission();
    };
    initPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
      {/* Top Section - Greeting + AI Bot */}
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <Text style={styles.userName}>
            {user?.userName || user?.name || 'Explorer'} ✨
          </Text>
        </View>

        <TouchableOpacity style={styles.headerAiBtn} onPress={onChatbotPress} activeOpacity={0.8}>
          <LottieView
            source={botAnimation}
            autoPlay
            loop
            style={{ width: 36, height: 36 }}
          />
        </TouchableOpacity>
      </View>

      {/* Location Row */}
      {userLocation && (
        <View style={styles.locationRow}>
          <View style={styles.locationDot}>
            <LiveDot color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.locationLabel}>Current Location</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {userLocation.address ||
                `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshLocationBtn} onPress={getCurrentLocation}>
            <Ionicons name="locate" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
          <Ionicons name="search" size={20} color={isSearchFocused ? '#F5840E' : '#9CA3AF'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search destinations, activities..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.searchClearBtn}>
              <View style={styles.searchClearIcon}>
                <Ionicons name="close" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );

  const renderSearchResults = () => {
    if (!showSearchResults) return null;

    return (
      <View className="flex-1 bg-gray-50">
        <View style={styles.searchResultsHeader}>
          <FontAwesome5 name="search-location" size={14} color="#F5840E" />
          <Text style={styles.searchResultsCount}>
            {isSearching ? 'Searching...' : `${searchResults.length} places found`}
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {isSearching ? (
            <View style={styles.searchLoadingContainer}>
              <LottieView source={loadingAnimation} autoPlay loop style={{ width: 120, height: 120 }} />
              <Text style={styles.searchLoadingText}>
                Finding places for you...
              </Text>
            </View>
          ) : searchResults.length > 0 ? (
            <View style={{ paddingTop: 8 }}>
              {searchResults.map((location, index) => (
                <TouchableOpacity
                  key={`${location.name}-${index}`}
                  style={styles.searchResultCard}
                  activeOpacity={0.8}
                  onPress={() => handleSearchResultSelect(location)}
                >
                  {/* Location Image */}
                  <View style={styles.searchResultImage}>
                    {location.imageUrls && location.imageUrls.length > 0 ? (
                      <Image
                        source={{ uri: location.imageUrls[0] }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.searchResultNoImage}>
                        <MaterialCommunityIcons name="image-off" size={20} color="#9CA3AF" />
                      </View>
                    )}
                  </View>

                  {/* Location Info */}
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.searchResultName} numberOfLines={1}>
                      {location.name}
                    </Text>
                    <View style={styles.searchResultMeta}>
                      {location.isOutdoor && (
                        <View style={styles.searchResultBadge}>
                          <Text style={{ fontSize: 10 }}>🌿</Text>
                          <Text style={styles.searchResultBadgeText}>Outdoor</Text>
                        </View>
                      )}
                      {Object.entries(location.preferenceScores)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 1)
                        .map(([category, score]) => {
                          if (score < 0.3) return null;
                          const config = CATEGORY_CONFIG[category];
                          return (
                            <View key={category} style={[styles.searchResultBadge, { backgroundColor: config.bgColor }]}>
                              <Text style={{ fontSize: 10 }}>{config.emoji}</Text>
                              <Text style={[styles.searchResultBadgeText, { color: config.color }]}>
                                {category}
                              </Text>
                            </View>
                          );
                        })}
                    </View>
                    {/* Recommendation level */}
                    {(() => {
                      const matchScore = calculateMatchScore(preferences, location.preferenceScores);
                      const rec = getRecommendationLevel(matchScore);
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                          <FontAwesome5 name={rec.icon} size={9} color={rec.color} solid />
                          <Text style={{ fontSize: 11, fontFamily: 'Gilroy-Medium', color: rec.color }}>
                            {rec.level}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Arrow */}
                  <View style={styles.searchResultArrow}>
                    <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{ height: 80 }} />
            </View>
          ) : (
            <View style={styles.searchEmptyContainer}>
              <LottieView source={botAnimation} autoPlay loop style={{ width: 100, height: 100 }} />
              <Text style={styles.searchEmptyTitle}>No matches found</Text>
              <Text style={styles.searchEmptySubtitle}>
                Try a different keyword or browse AI picks below
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render smart filter panel
  const renderSmartFilters = () => (
    <View style={styles.filterPanel}>
      {/* Filter Header with Toggle */}
      <TouchableOpacity
        style={styles.filterHeader}
        onPress={() => setShowFilters(!showFilters)}
        activeOpacity={0.7}
      >
        <View style={styles.filterHeaderLeft}>
          <View style={styles.filterIcon}>
            <FontAwesome5 name="sliders-h" size={14} color="#F5840E" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.filterTitle}>Smart Filters</Text>
            <Text style={styles.filterSubtitle}>
              {selectedDistance}km •{' '}
              {LOCATION_TYPE_OPTIONS.find(o => o.key === selectedLocationType)?.label}
              {selectedCategory ? ` • ${selectedCategory}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.filterHeaderRight}>
          <View style={styles.resultCountBadge}>
            <Text style={styles.resultCountText}>
              {filteredRecommendations.length}
            </Text>
          </View>
          <Ionicons name={showFilters ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />
        </View>
      </TouchableOpacity>

      {/* Expandable Filter Content */}
      {showFilters && (
        <View style={styles.filterContent}>
          {/* Location Type Filter */}
          <View style={{ marginBottom: 16 }}>
            <View style={styles.filterSectionLabel}>
              <MaterialCommunityIcons name="map-marker-radius" size={14} color="#6B7280" />
              <Text style={styles.filterSectionTitle}>Location Type</Text>
            </View>
            <View style={styles.segmentedControl}>
              {LOCATION_TYPE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.segmentedOption,
                    selectedLocationType === option.key && styles.segmentedOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedLocationType(option.key);
                    if (userLocation) {
                      fetchRecommendations(
                        userLocation.latitude,
                        userLocation.longitude,
                        selectedDistance,
                        option.key,
                      );
                    }
                  }}
                >
                  <FontAwesome5
                    name={option.icon}
                    size={11}
                    color={selectedLocationType === option.key ? '#F5840E' : '#9CA3AF'}
                  />
                  <Text
                    style={[
                      styles.segmentedLabel,
                      selectedLocationType === option.key && styles.segmentedLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Distance Filter */}
          <View style={{ marginBottom: 16 }}>
            <View style={styles.filterSectionLabel}>
              <FontAwesome5 name="route" size={12} color="#6B7280" />
              <Text style={styles.filterSectionTitle}>Search Radius</Text>
            </View>
            <View style={styles.distanceRow}>
              {DISTANCE_OPTIONS.map(distance => (
                <TouchableOpacity
                  key={distance}
                  style={[
                    styles.distanceChip,
                    selectedDistance === distance && styles.distanceChipActive,
                  ]}
                  onPress={() => {
                    setSelectedDistance(distance);
                    if (userLocation) {
                      fetchRecommendations(userLocation.latitude, userLocation.longitude, distance);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.distanceChipText,
                      selectedDistance === distance && styles.distanceChipTextActive,
                    ]}
                  >
                    {distance} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Filter */}
          <View>
            <View style={styles.filterSectionLabel}>
              <Ionicons name="sparkles" size={14} color="#6B7280" />
              <Text style={styles.filterSectionTitle}>Experience Type</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === null && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Ionicons
                  name="apps"
                  size={13}
                  color={selectedCategory === null ? 'white' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === null && styles.categoryChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selectedCategory === key ? config.color : config.bgColor,
                    },
                  ]}
                  onPress={() => setSelectedCategory(selectedCategory === key ? null : key)}
                >
                  <Text style={{ fontSize: 12 }}>{config.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: selectedCategory === key ? 'white' : config.color },
                    ]}
                  >
                    {key}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );

  // Quick filter chips (always visible)
  const renderQuickFilterChips = () => (
    <View style={{ paddingVertical: 10 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {/* AI Recommended Chip */}
        <TouchableOpacity
          style={[
            styles.quickChip,
            selectedCategory === null && styles.quickChipActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <FontAwesome5
            name="magic"
            size={12}
            color={selectedCategory === null ? 'white' : '#F5840E'}
          />
          <Text
            style={[
              styles.quickChipText,
              selectedCategory === null && styles.quickChipTextActive,
            ]}
          >
            AI Picks
          </Text>
        </TouchableOpacity>

        {/* Category Chips */}
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.quickChip,
              selectedCategory === key
                ? { backgroundColor: config.color, borderColor: config.color }
                : undefined,
            ]}
            onPress={() => setSelectedCategory(selectedCategory === key ? null : key)}
          >
            <Text style={{ fontSize: 14 }}>{config.emoji}</Text>
            <Text
              style={[
                styles.quickChipText,
                selectedCategory === key
                  ? { color: '#fff' }
                  : { color: config.color },
              ]}
            >
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Sort options bar
  const renderSortBar = () => (
    <View style={styles.sortBar}>
      {SORT_OPTIONS.map(option => (
        <TouchableOpacity
          key={option.key}
          style={[styles.sortOption, sortBy === option.key && styles.sortOptionActive]}
          onPress={() => setSortBy(option.key)}
          activeOpacity={0.7}
        >
          <FontAwesome5
            name={option.icon}
            size={11}
            color={sortBy === option.key ? '#F5840E' : '#9CA3AF'}
          />
          <Text style={[styles.sortLabel, sortBy === option.key && styles.sortLabelActive]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuickStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#F3E8FF' }]}>
          <FontAwesome5 name="map-marked-alt" size={13} color="#8B5CF6" />
        </View>
        <Text style={styles.statValue}>{recommendations.length}</Text>
        <Text style={styles.statLabel}>Places</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
          <FontAwesome5 name="walking" size={13} color="#10B981" />
        </View>
        <Text style={styles.statValue}>
          {recommendations.filter(r => r.distance_km < 10).length}
        </Text>
        <Text style={styles.statLabel}>Nearby</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
          <FontAwesome5 name="star" size={13} color="#059669" />
        </View>
        <Text style={styles.statValue}>
          {recommendations.filter(r => r.similarity_score > 0.7).length}
        </Text>
        <Text style={styles.statLabel}>Top Picks</Text>
      </View>
    </View>
  );

  const renderAIAssistantBanner = () => (
    <TouchableOpacity style={styles.aiBannerContainer} activeOpacity={0.9} onPress={onChatbotPress}>
      <View style={styles.aiBanner}>
        {/* Decorative circles */}
        <View style={styles.aiBannerDecor1} />
        <View style={styles.aiBannerDecor2} />

        <View style={styles.aiBannerContent}>
          <View style={styles.aiBannerLottie}>
            <LottieView
              source={loadingAnimation}
              autoPlay
              loop
              style={{ width: 50, height: 50 }}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={styles.aiBannerTitleRow}>
              <Text style={styles.aiBannerTitle}>AI Travel Companion</Text>
              <View style={styles.aiBannerBadge}>
                <LiveDot color="#fff" />
                <Text style={styles.aiBannerBadgeText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.aiBannerSubtitle}>
              Ask anything · Plan trips · Local insights
            </Text>
          </View>
          <View style={styles.aiBannerArrow}>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderLoadingState = () => (
    <View style={[styles.centeredState, { backgroundColor: '#FFFFFF' }]}>
      <LottieView source={loadingAnimation} autoPlay loop style={{ width: 180, height: 180 }} />
      <Text style={styles.stateTitle}>Discovering Amazing Places...</Text>
      <Text style={styles.stateSubtitle}>
        Your AI guide is curating personalized recommendations
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centeredState}>
      <View style={styles.errorIcon}>
        <FontAwesome5 name="exclamation-triangle" size={36} color="#EF4444" />
      </View>
      <Text style={styles.stateTitle}>Oops! Something went wrong</Text>
      <Text style={styles.stateSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
        <Ionicons name="refresh" size={16} color="#fff" />
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.centeredState}>
      <LottieView source={botAnimation} autoPlay loop style={{ width: 140, height: 140 }} />
      <Text style={styles.stateTitle}>No Places Found</Text>
      <Text style={styles.stateSubtitle}>
        Try adjusting your filters or expanding the search area
      </Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={() => setSelectedCategory(null)}
      >
        <Ionicons name="options" size={16} color="#fff" />
        <Text style={styles.retryBtnText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  // Section header for recommendations
  const renderSectionHeader = () => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIcon}>
          <FontAwesome5 name="brain" size={14} color="#F5840E" />
        </View>
        <View>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>AI Recommendations</Text>
            <LiveDot color="#10B981" />
          </View>
          <Text style={styles.sectionSubtitle}>Updated in real-time</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.sectionRefreshBtn} onPress={handleRefresh}>
        <Ionicons name="refresh" size={16} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F5840E' }}>
      <StatusBar barStyle="light-content" backgroundColor="#F5840E" translucent />

      {renderHeader()}

      {/* Show search results when searching */}
      {showSearchResults ? (
        renderSearchResults()
      ) : isLoading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: '#F9FAFB' }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#F5840E']}
              tintColor="#F5840E"
            />
          }
        >
          {renderQuickFilterChips()}
          {renderSmartFilters()}
          {renderSortBar()}
          {renderQuickStats()}
          {renderAIAssistantBanner()}
          {renderSectionHeader()}

          {/* Recommendations List */}
          {filteredRecommendations.length > 0
            ? filteredRecommendations.map((location, index) => (
              <LocationCard
                key={location.name}
                location={location}
                index={index}
                onPress={() => handleLocationPress(location)}
                onChatPress={() => onChatbotPress?.()}
                preferences={preferences}
              />
            ))
            : renderEmptyState()}

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: '#F5840E',
    paddingTop: 4,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  greetingText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Gilroy-Medium',
    fontSize: 13,
  },
  userName: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
    fontSize: 22,
    marginTop: 2,
  },
  headerAiBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  locationDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Gilroy-Regular',
    fontSize: 11,
  },
  locationValue: {
    color: '#fff',
    fontFamily: 'Gilroy-Medium',
    fontSize: 13,
    marginTop: 1,
  },
  refreshLocationBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: '#F5840E',
    shadowOpacity: 0.15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontFamily: 'Gilroy-Medium',
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
  },
  searchClearBtn: {
    marginLeft: 8,
  },
  searchClearIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search Results
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultsCount: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: '#6B7280',
  },
  searchLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  searchLoadingText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: '#9CA3AF',
    marginTop: 4,
  },
  searchResultCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchResultImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  searchResultNoImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  searchResultName: {
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
  },
  searchResultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  searchResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  searchResultBadgeText: {
    fontSize: 10,
    fontFamily: 'Gilroy-SemiBold',
    color: '#065F46',
    textTransform: 'capitalize',
  },
  searchResultArrow: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  searchEmptyTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 8,
  },
  searchEmptySubtitle: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },

  // Filter panel
  filterPanel: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTitle: {
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
  },
  filterSubtitle: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: '#9CA3AF',
    marginTop: 1,
  },
  filterHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultCountBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resultCountText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#F5840E',
  },
  filterContent: {
    padding: 14,
  },
  filterSectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: '#4B5563',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 3,
  },
  segmentedOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11,
    gap: 5,
  },
  segmentedOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedLabel: {
    fontSize: 12,
    fontFamily: 'Gilroy-Medium',
    color: '#9CA3AF',
  },
  segmentedLabelActive: {
    color: '#F5840E',
    fontFamily: 'Gilroy-Bold',
  },
  distanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distanceChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  distanceChipActive: {
    backgroundColor: '#F5840E',
  },
  distanceChipText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: '#4B5563',
  },
  distanceChipTextActive: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
  },
  categoryChip: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    gap: 5,
  },
  categoryChipActive: {
    backgroundColor: '#F5840E',
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: '#4B5563',
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: '#fff',
  },

  // Quick filter chips
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  quickChipActive: {
    backgroundColor: '#F5840E',
    borderColor: '#F5840E',
  },
  quickChipText: {
    fontSize: 13,
    fontFamily: 'Gilroy-Medium',
    color: '#F5840E',
    textTransform: 'capitalize',
  },
  quickChipTextActive: {
    color: '#fff',
  },

  // Sort bar
  sortBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sortOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    gap: 5,
  },
  sortOptionActive: {
    backgroundColor: '#FFF3E0',
  },
  sortLabel: {
    fontSize: 12,
    fontFamily: 'Gilroy-Medium',
    color: '#9CA3AF',
  },
  sortLabelActive: {
    color: '#F5840E',
    fontFamily: 'Gilroy-Bold',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },

  // AI Banner
  aiBannerContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  aiBanner: {
    backgroundColor: '#6366F1',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  aiBannerDecor1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  aiBannerDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  aiBannerContent: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiBannerLottie: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBannerTitle: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
    fontSize: 16,
  },
  aiBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  aiBannerBadgeText: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
    fontSize: 10,
  },
  aiBannerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Gilroy-Regular',
    fontSize: 13,
    marginTop: 3,
  },
  aiBannerArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: '#9CA3AF',
    marginTop: 1,
  },
  sectionRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // States
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  stateTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 12,
  },
  stateSubtitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5840E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
    fontSize: 14,
  },
});

export default TourGuideScreen;
