import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
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
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
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
import { haversineDistance, calculateMatchScore } from '@utils';

// Initialize Google Maps Geocoding
Geocoder.init(GOOGLE_MAPS_API_KEY, { language: 'en' });

// Default placeholder image
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400';

const { width: screenWidth } = Dimensions.get('window');

// Animations
const loadingAnimation = require('@assets/animations/onbord1.json');

// Category colors and icons
const CATEGORY_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: string; iconFamily: string }
> = {
  history: {
    color: '#8B5CF6',
    bgColor: '#F3E8FF',
    icon: 'landmark',
    iconFamily: 'fa5',
  },
  adventure: {
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'hiking',
    iconFamily: 'fa5',
  },
  nature: {
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'leaf',
    iconFamily: 'fa5',
  },
  relaxation: {
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'spa',
    iconFamily: 'fa5',
  },
};

// Crowd level colors
const CROWD_COLORS: Record<string, { color: string; bg: string }> = {
  LOW: { color: '#10B981', bg: '#D1FAE5' },
  MODERATE: { color: '#F59E0B', bg: '#FEF3C7' },
  HIGH: { color: '#EF4444', bg: '#FEE2E2' },
  EXTREME: { color: '#DC2626', bg: '#FEE2E2' },
};

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

const LocationCard: React.FC<LocationCardProps> = ({
  location,
  index,
  onPress,
  onChatPress,
  preferences,
}) => {
  const [crowdData, setCrowdData] = useState<SimpleCrowdPredictionResponse | null>(null);
  const [isLoadingCrowd, setIsLoadingCrowd] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Determine primary category based on highest preference score match
  const getPrimaryCategory = (): string => {
    const scores = location.preference_scores;
    const userWeightedScores = {
      history: scores.history * preferences.history,
      adventure: scores.adventure * preferences.adventure,
      nature: scores.nature * preferences.nature,
      relaxation: scores.relaxation * preferences.relaxation,
    };
    return Object.entries(userWeightedScores).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];
  };

  const primaryCategory = getPrimaryCategory();
  const categoryConfig = CATEGORY_CONFIG[primaryCategory];

  useEffect(() => {
    // Animate card entrance
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 500,
      delay: index * 100,
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

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const matchPercentage = Math.round(location.similarity_score * 100);
  const crowdColor = crowdData ? CROWD_COLORS[crowdData.crowd_status] : null;

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        className="mb-4 mx-4"
      >
        <View className="bg-white rounded-3xl overflow-hidden shadow-lg">
          {/* Image Header */}
          <View className="h-48 relative">
            <Image
              source={{ uri: location.imageUrl || PLACEHOLDER_IMAGE }}
              className="w-full h-full"
              resizeMode="cover"
            />
            {/* Gradient Overlay */}
            <View className="absolute inset-0 bg-black/30" />

            {/* Rank Badge */}
            <View className="absolute top-3 left-3 bg-primary px-3 py-1.5 rounded-full flex-row items-center">
              <FontAwesome5 name="medal" size={12} color="white" />
              <Text className="ml-1.5 text-sm font-gilroy-bold text-white">
                #{location.rank}
              </Text>
            </View>

            {/* Match Badge */}
            <View
              className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/90"
            >
              <Text
                className="text-sm font-gilroy-bold"
                style={{ color: categoryConfig.color }}
              >
                {matchPercentage}% Match
              </Text>
            </View>

            {/* Location Name on Image */}
            <View className="absolute bottom-3 left-3 right-3">
              <Text className="text-white text-xl font-gilroy-bold" numberOfLines={1}>
                {location.name}
              </Text>
              <View className="flex-row items-center mt-1">
                <FontAwesome5 name="map-marker-alt" size={12} color="white" />
                <Text className="ml-1.5 text-sm font-gilroy-medium text-white">
                  {location.distance_km.toFixed(1)} km away
                </Text>
                <View className="ml-3 flex-row items-center bg-white/20 px-2 py-0.5 rounded-full">
                  {location.is_outdoor ? (
                    <>
                      <MaterialCommunityIcons name="tree" size={12} color="#10B981" />
                      <Text className="ml-1 text-xs font-gilroy-medium text-green-400">
                        Outdoor
                      </Text>
                    </>
                  ) : (
                    <>
                      <FontAwesome5 name="home" size={10} color="#60A5FA" />
                      <Text className="ml-1 text-xs font-gilroy-medium text-blue-400">
                        Indoor
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Content */}
          <View className="p-4">
            {/* Category Tags */}
            <View className="flex-row flex-wrap gap-2 mb-3">
              {Object.entries(location.preference_scores)
                .filter(([_, score]) => score > 0.5)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([category]) => {
                  const config = CATEGORY_CONFIG[category];
                  return (
                    <View
                      key={category}
                      className="flex-row items-center px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: config.bgColor }}
                    >
                      <FontAwesome5
                        name={config.icon}
                        size={10}
                        color={config.color}
                      />
                      <Text
                        className="ml-1 text-xs font-gilroy-medium capitalize"
                        style={{ color: config.color }}
                      >
                        {category}
                      </Text>
                    </View>
                  );
                })}
            </View>

            {/* Crowd Status */}
            {isLoadingCrowd ? (
              <View className="flex-row items-center mb-3">
                <ActivityIndicator size="small" color={categoryConfig.color} />
                <Text className="ml-2 text-sm text-gray-500 font-gilroy-regular">
                  Checking crowd levels...
                </Text>
              </View>
            ) : crowdData ? (
              <View
                className="flex-row items-center px-3 py-2 rounded-xl mb-3"
                style={{ backgroundColor: crowdColor?.bg }}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={18}
                  color={crowdColor?.color}
                />
                <Text
                  className="ml-2 text-sm font-gilroy-medium"
                  style={{ color: crowdColor?.color }}
                >
                  {crowdData.crowd_status} crowds ({crowdData.crowd_percentage}%)
                </Text>
                <Text className="ml-auto text-xs text-gray-500 font-gilroy-regular">
                  Best: {crowdData.optimal_times[0]?.time || 'N/A'}
                </Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                style={{ backgroundColor: categoryConfig.bgColor }}
                onPress={onPress}
              >
                <FontAwesome5
                  name="directions"
                  size={14}
                  color={categoryConfig.color}
                />
                <Text
                  className="ml-2 font-gilroy-bold"
                  style={{ color: categoryConfig.color }}
                >
                  Explore
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-primary"
                onPress={onChatPress}
              >
                <FontAwesome5 name="robot" size={14} color="white" />
                <Text className="ml-2 font-gilroy-bold text-white">
                  Ask AI
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface TourGuideScreenProps {
  onChatbotPress?: () => void;
  navigation?: any;
}

export const TourGuideScreen: React.FC<TourGuideScreenProps> = ({
  onChatbotPress,
  navigation,
}) => {
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
  const [selectedDistance, setSelectedDistance] = useState<number>(50); // Default 50km
  const [selectedLocationType, setSelectedLocationType] = useState<LocationTypeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationDetailsResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferencesLoadedRef = useRef(false);

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
  const handleSearchResultSelect = useCallback((location: LocationDetailsResponse) => {
    clearSearch();
    // Calculate distance if user location is available
    let distance: number | undefined;
    if (userLocation?.latitude && userLocation?.longitude) {
      distance = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        location.coordinates.latitude,
        location.coordinates.longitude
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
  }, [clearSearch, navigation, userLocation, preferences]);

  // Reverse geocoding to get city name from coordinates using Google Maps API
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await Geocoder.from(latitude, longitude);

      if (response.results && response.results.length > 0) {
        const addressComponents = response.results[0].address_components;

        // Try to find city/locality
        const city = addressComponents.find(
          (component) =>
            component.types.includes('locality') ||
            component.types.includes('administrative_area_level_2')
        );

        if (city) {
          return city.long_name;
        }

        // Fallback to administrative area
        const area = addressComponents.find((component) =>
          component.types.includes('administrative_area_level_1')
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
            message:
              'Travion needs access to your location to recommend nearby places.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
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
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Location obtained:', latitude, longitude);

        // Get city name from coordinates
        const cityName = await reverseGeocode(latitude, longitude);
        console.log('City name:', cityName);

        setUserLocation({ latitude, longitude, address: cityName });
        fetchRecommendations(latitude, longitude);
      },
      async (error) => {
        console.error('Location error:', error.message);
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Using default location (Colombo).',
          [{ text: 'OK' }]
        );

        // Use default location (Colombo, Sri Lanka)
        const defaultLat = 6.9271;
        const defaultLng = 79.8612;
        const cityName = await reverseGeocode(defaultLat, defaultLng);
        setUserLocation({ latitude: defaultLat, longitude: defaultLng, address: cityName });
        fetchRecommendations(defaultLat, defaultLng);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      }
    );
  };

  const fetchRecommendations = async (
    lat: number,
    lng: number,
    distanceOverride?: number,
    locationTypeOverride?: LocationTypeFilter
  ) => {
    try {
      setIsLoading(true);
      setError(null);

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
        top_k: 20,  // Max allowed by backend validation
        outdoor_only: outdoorOnly,
        min_match_score: 0.35,  // Only show 35%+ matches
      });

      if (response.recommendations && response.recommendations.length > 0) {
        // Fetch images for all recommended locations
        const locationNames = response.recommendations.map((r) => r.name);
        const imagesData = await locationService.getBulkLocationImages(locationNames);

        // Merge recommendations with images
        const recommendationsWithImages: RecommendationWithImage[] = response.recommendations.map(
          (rec) => ({
            ...rec,
            imageUrl: imagesData[rec.name]?.primaryImage || null,
          })
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

  // Filter recommendations by category (min_match_score and outdoor_only handled server-side)
  const filteredRecommendations = recommendations.filter((loc) => {
    if (!selectedCategory) return true;
    return loc.preference_scores[
      selectedCategory as keyof typeof loc.preference_scores
    ] > 0.5;
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
    <View style={[styles.header, styles.headerGradient]}>
      {/* Greeting and AI Button */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-3">
        <View className="flex-1">
          <Text style={{ color: 'rgba(255,255,255,0.9)' }} className="font-gilroy-medium text-sm">
            {getGreeting()},
          </Text>
          <Text className="text-white font-gilroy-bold text-2xl mt-0.5">
            {user?.userName || user?.name || 'Explorer'}
          </Text>
        </View>

        <TouchableOpacity
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
          onPress={onChatbotPress}
        >
          <FontAwesome5 name="robot" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Current Location */}
      {userLocation && (
        <View className="px-6 pb-3">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <MaterialCommunityIcons name="map-marker" size={18} color="white" />
            </View>
            <View className="flex-1 ml-2">
              <Text style={{ color: 'rgba(255,255,255,0.8)' }} className="font-gilroy-regular text-xs">
                Your Location
              </Text>
              <Text className="text-white font-gilroy-medium text-sm mt-0.5">
                {userLocation.address || `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
              </Text>
            </View>
            <TouchableOpacity
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              onPress={getCurrentLocation}
            >
              <Ionicons name="refresh" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View className="px-6 pb-4">
        <View className="bg-white rounded-2xl flex-row items-center px-4 py-3.5 shadow-lg">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-3 font-gilroy-medium text-base text-gray-900"
            placeholder="Where do you want to go?"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} className="ml-2">
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderSearchResults = () => {
    if (!showSearchResults) return null;

    return (
      <View className="flex-1 bg-gray-50">
        <View className="px-4 pt-4 pb-2 bg-white border-b border-gray-100">
          <Text className="text-sm font-gilroy-medium text-gray-500">
            {isSearching ? 'Searching...' : `${searchResults.length} locations found`}
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {isSearching ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color="#F5840E" />
              <Text className="text-sm font-gilroy-regular text-gray-500 mt-3">
                Searching locations...
              </Text>
            </View>
          ) : searchResults.length > 0 ? (
            <View className="py-2">
              {searchResults.map((location, index) => (
                <TouchableOpacity
                  key={`${location.name}-${index}`}
                  className="bg-white mx-4 mb-3 rounded-2xl overflow-hidden shadow-sm"
                  activeOpacity={0.8}
                  onPress={() => handleSearchResultSelect(location)}
                >
                  <View className="flex-row items-center p-4">
                    {/* Location Image */}
                    <View className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200">
                      {location.imageUrls && location.imageUrls.length > 0 ? (
                        <Image
                          source={{ uri: location.imageUrls[0] }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center bg-gray-100">
                          <MaterialCommunityIcons name="image-off" size={24} color="#9CA3AF" />
                        </View>
                      )}
                    </View>

                    {/* Location Info */}
                    <View className="flex-1 ml-4">
                      <Text className="text-base font-gilroy-bold text-gray-900" numberOfLines={1}>
                        {location.name}
                      </Text>
                      <View className="flex-row items-center mt-1.5">
                        <View className="flex-row items-center">
                          {location.isOutdoor && (
                            <View className="flex-row items-center mr-3">
                              <MaterialCommunityIcons name="nature" size={14} color="#10B981" />
                              <Text className="text-xs font-gilroy-medium text-green-600 ml-1">
                                Outdoor
                              </Text>
                            </View>
                          )}
                          {Object.entries(location.preferenceScores)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 1)
                            .map(([category, score]) => {
                              if (score < 0.3) return null;
                              const config = CATEGORY_CONFIG[category];
                              return (
                                <View key={category} className="flex-row items-center">
                                  <FontAwesome5 name={config.icon} size={10} color={config.color} />
                                  <Text
                                    className="text-xs font-gilroy-medium capitalize ml-1"
                                    style={{ color: config.color }}
                                  >
                                    {category}
                                  </Text>
                                </View>
                              );
                            })}
                        </View>
                      </View>
                    </View>

                    {/* Arrow Icon */}
                    <View className="ml-2">
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <View className="h-20" />
            </View>
          ) : (
            <View className="items-center justify-center py-12 px-8">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="search-outline" size={40} color="#9CA3AF" />
              </View>
              <Text className="text-base font-gilroy-bold text-gray-900 text-center">
                No locations found
              </Text>
              <Text className="text-sm font-gilroy-regular text-gray-500 text-center mt-2">
                Try searching with a different keyword
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render smart filter panel with AI theme
  const renderSmartFilters = () => (
    <View className="bg-white mx-4 rounded-2xl shadow-sm overflow-hidden mb-4">
      {/* Filter Header with Toggle */}
      <TouchableOpacity
        className="flex-row items-center justify-between p-4 border-b border-gray-100"
        onPress={() => setShowFilters(!showFilters)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: '#FFF3E0' }}>
            <FontAwesome5 name="sliders-h" size={16} color="#F5840E" />
          </View>
          <View className="ml-3">
            <Text className="text-base font-gilroy-bold text-gray-900">Smart Filters</Text>
            <Text className="text-xs font-gilroy-regular text-gray-500 mt-0.5">
              {selectedDistance}km • {LOCATION_TYPE_OPTIONS.find(o => o.key === selectedLocationType)?.label}
              {selectedCategory ? ` • ${selectedCategory}` : ''}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <View className="bg-primary/10 px-2.5 py-1 rounded-full mr-2">
            <Text className="text-xs font-gilroy-bold text-primary">
              {filteredRecommendations.length} results
            </Text>
          </View>
          <Ionicons
            name={showFilters ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#9CA3AF"
          />
        </View>
      </TouchableOpacity>

      {/* Expandable Filter Content */}
      {showFilters && (
        <View className="p-4">
          {/* Location Type Filter (Indoor/Outdoor) */}
          <View className="mb-4">
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons name="map-marker-radius" size={16} color="#6B7280" />
              <Text className="ml-2 text-sm font-gilroy-bold text-gray-700">Location Type</Text>
            </View>
            <View className="flex-row bg-gray-100 rounded-xl p-1">
              {LOCATION_TYPE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
                    selectedLocationType === option.key ? 'bg-white shadow-sm' : ''
                  }`}
                  onPress={() => {
                    setSelectedLocationType(option.key);
                    if (userLocation) {
                      fetchRecommendations(
                        userLocation.latitude,
                        userLocation.longitude,
                        selectedDistance,
                        option.key
                      );
                    }
                  }}
                >
                  <FontAwesome5
                    name={option.icon}
                    size={12}
                    color={selectedLocationType === option.key ? '#F5840E' : '#9CA3AF'}
                  />
                  <Text
                    className={`ml-1.5 text-sm font-gilroy-medium ${
                      selectedLocationType === option.key ? 'text-primary' : 'text-gray-500'
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Distance Filter */}
          <View className="mb-4">
            <View className="flex-row items-center mb-3">
              <FontAwesome5 name="route" size={14} color="#6B7280" />
              <Text className="ml-2 text-sm font-gilroy-bold text-gray-700">Search Radius</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {DISTANCE_OPTIONS.map((distance) => (
                <TouchableOpacity
                  key={distance}
                  className={`px-4 py-2.5 rounded-xl ${
                    selectedDistance === distance
                      ? 'bg-primary'
                      : 'bg-gray-100'
                  }`}
                  onPress={() => {
                    setSelectedDistance(distance);
                    if (userLocation) {
                      fetchRecommendations(userLocation.latitude, userLocation.longitude, distance);
                    }
                  }}
                >
                  <Text
                    className={`text-sm font-gilroy-medium ${
                      selectedDistance === distance ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {distance} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Filter */}
          <View>
            <View className="flex-row items-center mb-3">
              <Ionicons name="sparkles" size={16} color="#6B7280" />
              <Text className="ml-2 text-sm font-gilroy-bold text-gray-700">Experience Type</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                className={`mr-2 px-4 py-2.5 rounded-xl flex-row items-center ${
                  selectedCategory === null ? 'bg-primary' : 'bg-gray-100'
                }`}
                onPress={() => setSelectedCategory(null)}
              >
                <Ionicons
                  name="apps"
                  size={14}
                  color={selectedCategory === null ? 'white' : '#6B7280'}
                />
                <Text
                  className={`ml-1.5 text-sm font-gilroy-medium ${
                    selectedCategory === null ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  All
                </Text>
              </TouchableOpacity>

              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <TouchableOpacity
                  key={key}
                  className="mr-2 px-4 py-2.5 rounded-xl flex-row items-center"
                  style={{
                    backgroundColor: selectedCategory === key ? config.color : config.bgColor,
                  }}
                  onPress={() => setSelectedCategory(selectedCategory === key ? null : key)}
                >
                  <FontAwesome5
                    name={config.icon}
                    size={12}
                    color={selectedCategory === key ? 'white' : config.color}
                  />
                  <Text
                    className="ml-1.5 text-sm font-gilroy-medium capitalize"
                    style={{ color: selectedCategory === key ? 'white' : config.color }}
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
    <View className="py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {/* AI Recommended Chip */}
        <TouchableOpacity
          className={`mr-2 px-4 py-2.5 rounded-full flex-row items-center ${
            selectedCategory === null ? 'bg-primary' : 'bg-white border border-gray-200'
          }`}
          onPress={() => setSelectedCategory(null)}
        >
          <FontAwesome5
            name="magic"
            size={12}
            color={selectedCategory === null ? 'white' : '#F5840E'}
          />
          <Text
            className={`ml-2 text-sm font-gilroy-medium ${
              selectedCategory === null ? 'text-white' : 'text-primary'
            }`}
          >
            AI Picks
          </Text>
        </TouchableOpacity>

        {/* Category Chips */}
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            className={`mr-2 px-4 py-2.5 rounded-full flex-row items-center ${
              selectedCategory === key ? '' : 'bg-white border border-gray-200'
            }`}
            style={selectedCategory === key ? { backgroundColor: config.color } : undefined}
            onPress={() => setSelectedCategory(selectedCategory === key ? null : key)}
          >
            <FontAwesome5
              name={config.icon}
              size={12}
              color={selectedCategory === key ? 'white' : config.color}
            />
            <Text
              className={`ml-2 text-sm font-gilroy-medium capitalize ${
                selectedCategory === key ? 'text-white' : ''
              }`}
              style={selectedCategory !== key ? { color: config.color } : undefined}
            >
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderQuickStats = () => (
    <View className="flex-row px-4 mb-4 gap-3">
      <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
        <View className="flex-row items-center mb-2">
          <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center">
            <FontAwesome5 name="map-marked-alt" size={14} color="#8B5CF6" />
          </View>
          <Text className="ml-2 text-2xl font-gilroy-bold text-gray-900">
            {recommendations.length}
          </Text>
        </View>
        <Text className="text-sm font-gilroy-regular text-gray-500">
          Places Found
        </Text>
      </View>

      <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
        <View className="flex-row items-center mb-2">
          <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center">
            <FontAwesome5 name="walking" size={14} color="#10B981" />
          </View>
          <Text className="ml-2 text-2xl font-gilroy-bold text-gray-900">
            {recommendations.filter((r) => r.distance_km < 10).length}
          </Text>
        </View>
        <Text className="text-sm font-gilroy-regular text-gray-500">
          Within 10km
        </Text>
      </View>

      <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
        <View className="flex-row items-center mb-2">
          <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center">
            <FontAwesome5 name="fire" size={14} color="#F59E0B" />
          </View>
          <Text className="ml-2 text-2xl font-gilroy-bold text-gray-900">
            {recommendations.filter((r) => r.similarity_score > 0.7).length}
          </Text>
        </View>
        <Text className="text-sm font-gilroy-regular text-gray-500">
          Top Matches
        </Text>
      </View>
    </View>
  );

  const renderAIAssistantBanner = () => (
    <TouchableOpacity
      className="mx-4 mb-4"
      activeOpacity={0.9}
      onPress={onChatbotPress}
    >
      <View className="rounded-3xl overflow-hidden" style={styles.aiBanner}>
        {/* Decorative Elements */}
        <View className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: 'white', transform: [{ translateX: 40 }, { translateY: -40 }] }} />
        <View className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: 'white', transform: [{ translateX: -30 }, { translateY: 30 }] }} />

        <View className="p-5 flex-row items-center">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <LottieView
              source={require('@assets/animations/onbord1.json')}
              autoPlay
              loop
              style={{ width: 50, height: 50 }}
            />
          </View>
          <View className="flex-1 ml-4">
            <View className="flex-row items-center">
              <Text className="text-white font-gilroy-bold text-lg">
                Your AI Travel Companion
              </Text>
              <View className="ml-2 bg-white/20 px-2 py-0.5 rounded-full">
                <Text className="text-white text-xs font-gilroy-medium">SMART</Text>
              </View>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }} className="font-gilroy-regular text-sm mt-1">
              Ask anything • Plan trips • Get local insights
            </Text>
          </View>
          <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
            <FontAwesome5 name="comments" size={16} color="white" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderLoadingState = () => (
    <View className="flex-1 items-center justify-center px-6">
      <LottieView
        source={loadingAnimation}
        autoPlay
        loop
        style={{ width: 200, height: 200 }}
      />
      <Text className="text-xl font-gilroy-bold text-gray-900 mt-4 text-center">
        Discovering Amazing Places...
      </Text>
      <Text className="text-base font-gilroy-regular text-gray-500 mt-2 text-center">
        Your AI guide is finding the perfect spots based on your preferences
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View className="flex-1 items-center justify-center px-6">
      <View className="w-24 h-24 bg-red-100 rounded-full items-center justify-center mb-6">
        <FontAwesome5 name="exclamation-triangle" size={40} color="#EF4444" />
      </View>
      <Text className="text-xl font-gilroy-bold text-gray-900 text-center">
        Oops! Something went wrong
      </Text>
      <Text className="text-base font-gilroy-regular text-gray-500 mt-2 text-center">
        {error}
      </Text>
      <TouchableOpacity
        className="mt-6 bg-primary px-8 py-3 rounded-full"
        onPress={handleRefresh}
      >
        <Text className="text-white font-gilroy-bold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-6">
        <FontAwesome5 name="map-marked-alt" size={40} color="#9CA3AF" />
      </View>
      <Text className="text-xl font-gilroy-bold text-gray-900 text-center">
        No Places Found
      </Text>
      <Text className="text-base font-gilroy-regular text-gray-500 mt-2 text-center">
        Try adjusting your filters or expanding the search area
      </Text>
      <TouchableOpacity
        className="mt-6 bg-primary px-8 py-3 rounded-full"
        onPress={() => setSelectedCategory(null)}
      >
        <Text className="text-white font-gilroy-bold">Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#F5840E" />

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
          className="flex-1"
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
          {renderQuickStats()}
          {renderAIAssistantBanner()}

          {/* Section Header */}
          <View className="flex-row items-center justify-between px-4 mb-4 mt-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mr-3">
                <FontAwesome5 name="brain" size={16} color="#F5840E" />
              </View>
              <View>
                <View className="flex-row items-center">
                  <Text className="text-lg font-gilroy-bold text-gray-900">
                    AI Recommendations
                  </Text>
                  <View className="ml-2 w-2 h-2 bg-green-500 rounded-full" />
                </View>
                <Text className="text-xs font-gilroy-regular text-gray-500 mt-0.5">
                  Personalized for your preferences
                </Text>
              </View>
            </View>
            <TouchableOpacity
              className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center"
              onPress={handleRefresh}
            >
              <Ionicons name="refresh" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Recommendations List */}
          {filteredRecommendations.length > 0 ? (
            filteredRecommendations.map((location, index) => (
              <LocationCard
                key={location.name}
                location={location}
                index={index}
                onPress={() => handleLocationPress(location)}
                onChatPress={() => onChatbotPress?.()}
                preferences={preferences}
              />
            ))
          ) : (
            renderEmptyState()
          )}

          {/* Bottom Spacing */}
          <View className="h-24" />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerGradient: {
    backgroundColor: '#F5840E',
  },
  aiBanner: {
    backgroundColor: '#6366F1', // Indigo color for AI theme
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});

export default TourGuideScreen;

