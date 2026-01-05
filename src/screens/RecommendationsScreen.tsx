/**
 * Recommendations Screen
 * Displays personalized location recommendations based on user's current location and preferences
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useAuthStore } from '@stores';
import { aiService, locationService } from '@services/api';
import type { SimpleRecommendationLocation } from '@services/api';
import type { TravelPreferenceScores } from '@types';

// Default placeholder image
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400';

interface LocationState {
  latitude: number;
  longitude: number;
  address?: string;
}

interface RecommendationWithImage extends SimpleRecommendationLocation {
  imageUrl: string | null;
}

interface RecommendationsScreenProps {
  navigation?: any;
}

export const RecommendationsScreen: React.FC<RecommendationsScreenProps> = ({ navigation }) => {
  // User can be used for personalized preferences in the future
  const { user } = useAuthStore();
  void user; // Suppress unused warning

  // State
  const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationWithImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default preferences if not set
  const defaultPreferences: TravelPreferenceScores = {
    history: 0.5,
    adventure: 0.5,
    nature: 0.5,
    relaxation: 0.5,
  };

  // Get user preferences from profile or use defaults
  const getUserPreferences = (): TravelPreferenceScores => {
    // TODO: Get from user profile when available
    return defaultPreferences;
  };

  // Request location permission (Android)
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Travion needs access to your location to provide personalized recommendations.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Location permission error:', err);
      return false;
    }
  };

  // Get current location - uses default location for now
  // To enable real GPS, install: npm install @react-native-community/geolocation
  const getCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);

    const hasPermission = await requestLocationPermission();

    // Default location (Colombo, Sri Lanka)
    const defaultLat = 6.9271;
    const defaultLng = 79.8612;

    if (!hasPermission) {
      setLocationError('Location permission denied');
      setLocationLoading(false);
      setCurrentLocation({ latitude: defaultLat, longitude: defaultLng, address: 'Colombo, Sri Lanka' });
      fetchRecommendations(defaultLat, defaultLng);
      return;
    }

    // Try to get real location using React Native's geolocation polyfill
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geolocation = (globalThis as any).navigator?.geolocation;

      if (geolocation) {
        geolocation.getCurrentPosition(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (position: any) => {
            const { latitude, longitude } = position.coords;
            setCurrentLocation({ latitude, longitude });
            setLocationLoading(false);
            fetchRecommendations(latitude, longitude);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (geoError: any) => {
            console.error('Geolocation error:', geoError);
            setLocationError('Using default location');
            setLocationLoading(false);
            setCurrentLocation({ latitude: defaultLat, longitude: defaultLng, address: 'Colombo, Sri Lanka' });
            fetchRecommendations(defaultLat, defaultLng);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );
      } else {
        // Fallback to default location
        setLocationLoading(false);
        setCurrentLocation({ latitude: defaultLat, longitude: defaultLng, address: 'Colombo, Sri Lanka' });
        fetchRecommendations(defaultLat, defaultLng);
      }
    } catch (err) {
      console.error('Location error:', err);
      setLocationLoading(false);
      setCurrentLocation({ latitude: defaultLat, longitude: defaultLng, address: 'Colombo, Sri Lanka' });
      fetchRecommendations(defaultLat, defaultLng);
    }
  }, []);

  // Fetch recommendations from API
  const fetchRecommendations = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);

    try {
      const preferences = getUserPreferences();

      console.log('Fetching recommendations with:', {
        latitude: lat,
        longitude: lng,
        preferences,
        max_distance_km: 100,
        top_k: 10,
      });

      // Get recommendations
      const response = await aiService.getSimpleRecommendations({
        latitude: lat,
        longitude: lng,
        preferences,
        max_distance_km: 100,
        top_k: 10,
      });

      console.log('Recommendations API response:', {
        success: response?.success,
        total_found: response?.total_found,
        recommendations_count: response?.recommendations?.length,
      });

      if (response.recommendations && response.recommendations.length > 0) {
        // Get images for all locations
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
        console.log('Set recommendations:', recommendationsWithImages.length);
      } else {
        console.log('No recommendations found in response');
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error('Fetch recommendations error:', err);
      console.error('Error details:', {
        message: err?.message,
        status: err?.status,
        code: err?.code,
      });
      setError(err?.message || 'Failed to load recommendations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Navigate to location details
  const handleLocationPress = (item: RecommendationWithImage) => {
    if (navigation) {
      navigation.navigate('LocationDetails', {
        locationName: item.name,
        distance: item.distance_km,
        matchScore: item.similarity_score,
        userLatitude: currentLocation?.latitude,
        userLongitude: currentLocation?.longitude,
      });
    }
  };

  // Open location in maps (secondary action)
  const openInMaps = (lat: number, lng: number, name: string) => {
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${lat},${lng}`;
    const label = encodeURIComponent(name);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  // Get preference icon
  const getPreferenceIcon = (scores: SimpleRecommendationLocation['preference_scores']): string => {
    const max = Math.max(scores.history, scores.adventure, scores.nature, scores.relaxation);
    if (max === scores.history) return 'landmark';
    if (max === scores.adventure) return 'hiking';
    if (max === scores.nature) return 'leaf';
    return 'spa';
  };

  // Get match percentage
  const getMatchPercentage = (score: number): number => {
    return Math.round(score * 100);
  };

  // Render current location header
  const renderLocationHeader = () => (
    <View className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm">
      <View className="flex-row items-center">
        <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center">
          <FontAwesome5 name="map-marker-alt" size={20} color="#F5840E" />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-xs font-gilroy-medium text-gray-500 uppercase tracking-wide">
            Your Location
          </Text>
          {locationLoading ? (
            <View className="flex-row items-center mt-1">
              <ActivityIndicator size="small" color="#F5840E" />
              <Text className="text-sm font-gilroy-regular text-gray-600 ml-2">
                Getting location...
              </Text>
            </View>
          ) : locationError ? (
            <View>
              <Text className="text-sm font-gilroy-medium text-yellow-600 mt-1">
                Using default location
              </Text>
              <Text className="text-base font-gilroy-bold text-gray-900">
                {currentLocation?.address || 'Colombo, Sri Lanka'}
              </Text>
            </View>
          ) : currentLocation ? (
            <Text className="text-base font-gilroy-bold text-gray-900 mt-1">
              {currentLocation.address ||
                `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={getCurrentLocation}
          className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
        >
          <FontAwesome5 name="sync-alt" size={14} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render recommendation card
  const renderRecommendationCard = (item: RecommendationWithImage, index: number) => (
    <TouchableOpacity
      key={`${item.name}-${index}`}
      className="mx-4 mb-4 bg-white rounded-2xl shadow-sm overflow-hidden"
      activeOpacity={0.9}
      onPress={() => handleLocationPress(item)}
    >
      {/* Image */}
      <View className="relative">
        <Image
          source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE }}
          className="w-full h-48"
          resizeMode="cover"
        />
        {/* Overlay for text visibility */}
        <View className="absolute bottom-0 left-0 right-0 h-20 bg-black/40" />
        {/* Rank badge */}
        <View className="absolute top-3 left-3 bg-primary px-3 py-1 rounded-full">
          <Text className="text-white text-xs font-gilroy-bold">#{item.rank}</Text>
        </View>
        {/* Distance badge */}
        <View className="absolute top-3 right-3 bg-black/50 px-3 py-1 rounded-full flex-row items-center">
          <FontAwesome5 name="route" size={10} color="white" />
          <Text className="text-white text-xs font-gilroy-medium ml-1">
            {item.distance_km.toFixed(1)} km
          </Text>
        </View>
        {/* Location name on image */}
        <View className="absolute bottom-3 left-3 right-3">
          <Text className="text-white text-xl font-gilroy-bold" numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="p-4">
        {/* Match score */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center">
              <FontAwesome5 name="check" size={12} color="#10B981" />
            </View>
            <Text className="text-sm font-gilroy-medium text-gray-700 ml-2">
              {getMatchPercentage(item.similarity_score)}% Match
            </Text>
          </View>
          <View className="flex-row items-center">
            <FontAwesome5
              name={getPreferenceIcon(item.preference_scores)}
              size={14}
              color="#6B7280"
            />
            <Text className="text-xs font-gilroy-regular text-gray-500 ml-1">
              {item.is_outdoor ? 'Outdoor' : 'Indoor'}
            </Text>
          </View>
        </View>

        {/* Preference scores */}
        <View className="flex-row flex-wrap">
          {[
            { key: 'history', label: 'History', icon: 'landmark', color: '#8B5CF6' },
            { key: 'adventure', label: 'Adventure', icon: 'hiking', color: '#F59E0B' },
            { key: 'nature', label: 'Nature', icon: 'leaf', color: '#10B981' },
            { key: 'relaxation', label: 'Relaxation', icon: 'spa', color: '#3B82F6' },
          ].map((pref) => {
            const score = item.preference_scores[pref.key as keyof typeof item.preference_scores];
            if (score < 0.3) return null;
            return (
              <View
                key={pref.key}
                className="flex-row items-center bg-gray-100 rounded-full px-2 py-1 mr-2 mb-2"
              >
                <FontAwesome5 name={pref.icon} size={10} color={pref.color} />
                <Text className="text-xs font-gilroy-medium text-gray-600 ml-1">
                  {Math.round(score * 100)}%
                </Text>
              </View>
            );
          })}
        </View>

        {/* Action button */}
        <TouchableOpacity
          className="mt-3 bg-primary/10 rounded-xl py-3 flex-row items-center justify-center"
          onPress={() => openInMaps(item.latitude, item.longitude, item.name)}
        >
          <FontAwesome5 name="directions" size={14} color="#F5840E" />
          <Text className="text-sm font-gilroy-bold text-primary ml-2">Get Directions</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
        <FontAwesome5 name="map-marked-alt" size={40} color="#9CA3AF" />
      </View>
      <Text className="text-xl font-gilroy-bold text-gray-900 text-center mb-2">
        No Recommendations Yet
      </Text>
      <Text className="text-sm font-gilroy-regular text-gray-600 text-center mb-6">
        We couldn't find any locations near you. Try expanding the search radius or check your
        location settings.
      </Text>
      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-xl flex-row items-center"
        onPress={onRefresh}
      >
        <FontAwesome5 name="redo" size={14} color="white" />
        <Text className="text-white font-gilroy-bold ml-2">Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-24 h-24 bg-red-100 rounded-full items-center justify-center mb-4">
        <FontAwesome5 name="exclamation-triangle" size={40} color="#EF4444" />
      </View>
      <Text className="text-xl font-gilroy-bold text-gray-900 text-center mb-2">
        Something Went Wrong
      </Text>
      <Text className="text-sm font-gilroy-regular text-gray-600 text-center mb-6">{error}</Text>
      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-xl flex-row items-center"
        onPress={onRefresh}
      >
        <FontAwesome5 name="redo" size={14} color="white" />
        <Text className="text-white font-gilroy-bold ml-2">Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <View className="px-4 py-4">
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-white rounded-2xl mb-4 overflow-hidden">
          <View className="h-48 bg-gray-200" />
          <View className="p-4">
            <View className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <View className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
            <View className="flex-row mt-3">
              <View className="h-6 bg-gray-200 rounded-full w-16 mr-2" />
              <View className="h-6 bg-gray-200 rounded-full w-16 mr-2" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-gilroy-bold text-gray-900">For You</Text>
            <Text className="text-sm font-gilroy-regular text-gray-600 mt-1">
              Personalized recommendations
            </Text>
          </View>
          <TouchableOpacity
            className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center"
            onPress={onRefresh}
          >
            <FontAwesome5 name="sliders-h" size={16} color="#F5840E" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5840E" />
        }
      >
        {/* Current Location */}
        {renderLocationHeader()}

        {/* Recommendations Section */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between px-4 mb-4">
            <Text className="text-lg font-gilroy-bold text-gray-900">Nearby Destinations</Text>
            <Text className="text-sm font-gilroy-medium text-gray-500">
              {recommendations.length} found
            </Text>
          </View>

          {/* Content */}
          {loading && !refreshing ? (
            renderLoadingSkeleton()
          ) : error ? (
            renderErrorState()
          ) : recommendations.length === 0 ? (
            renderEmptyState()
          ) : (
            <View className="pb-6">
              {recommendations.map((item, index) => renderRecommendationCard(item, index))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default RecommendationsScreen;
