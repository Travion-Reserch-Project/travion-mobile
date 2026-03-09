import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useAuthStore } from '@stores';

interface HomeScreenProps {
  userName?: string;
  onAlertsPress?: () => void;
  onProfilePress?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onAlertsPress, onProfilePress }) => {
  const { user } = useAuthStore();
  const handleAlerts = onAlertsPress || (() => {});
  const handleProfile = onProfilePress || (() => {});
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="bg-white px-6 pt-12 pb-8 rounded-b-3xl shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            {/* Profile Icon */}
            <TouchableOpacity
              className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center overflow-hidden"
              onPress={handleProfile}
              activeOpacity={0.7}
            >
              {user?.photoUrl ? (
                <Image
                  source={{ uri: user.photoUrl }}
                  className="w-12 h-12 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <FontAwesome5 name="user" size={18} color="#F5840E" />
              )}
            </TouchableOpacity>

            {/* Welcome Text */}
            <View className="flex-1 ml-3">
              <Text className="text-sm font-gilroy-regular text-gray-500">Welcome back,</Text>
              <Text className="text-lg font-gilroy-bold text-gray-900">
                {user?.userName || 'Traveler'}
              </Text>
            </View>

            {/* Notification Bell */}
            <TouchableOpacity
              className="w-12 h-12 bg-primary rounded-full items-center justify-center"
              onPress={handleAlerts}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="bell" size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mt-4">
            <FontAwesome5 name="search" size={16} color="#9CA3AF" />
            <Text className="ml-3 text-gray-500 font-gilroy-regular flex-1">
              Where do you want to go?
            </Text>
          </View>
        </View>

        {/* Explore Sri Lanka */}
        <View className="px-6 mt-6">
          <Text className="text-xl font-gilroy-bold text-gray-900 mb-2">Discover Sri Lanka</Text>
          <Text className="text-sm font-gilroy-regular text-gray-600 mb-4">
            The Pearl of the Indian Ocean
          </Text>

          <View className="flex-row justify-between mb-4">
            <View className="flex-1 bg-white rounded-2xl p-6 mr-3 items-center shadow-sm">
              <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-3">
                <FontAwesome5 name="mountain" size={24} color="#D97706" />
              </View>
              <Text className="text-sm font-gilroy-bold text-gray-900 text-center">
                Ancient Wonders
              </Text>
              <Text className="text-xs font-gilroy-regular text-gray-500 text-center mt-1">
                8 UNESCO Sites
              </Text>
            </View>

            <View className="flex-1 bg-white rounded-2xl p-6 mx-1.5 items-center shadow-sm">
              <View className="w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mb-3">
                <FontAwesome5 name="leaf" size={24} color="#059669" />
              </View>
              <Text className="text-sm font-gilroy-bold text-gray-900 text-center">
                Tea Country
              </Text>
              <Text className="text-xs font-gilroy-regular text-gray-500 text-center mt-1">
                Hill Estates
              </Text>
            </View>

            <View className="flex-1 bg-white rounded-2xl p-6 ml-3 items-center shadow-sm">
              <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-3">
                <FontAwesome5 name="water" size={24} color="#0284C7" />
              </View>
              <Text className="text-sm font-gilroy-bold text-gray-900 text-center">
                Beach Bliss
              </Text>
              <Text className="text-xs font-gilroy-regular text-gray-500 text-center mt-1">
                Coastal Beauty
              </Text>
            </View>
          </View>
        </View>

        {/* Must-Visit Places */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-gilroy-bold text-gray-900">Must-Visit Places</Text>
            <Text className="text-sm font-gilroy-medium text-primary">Explore All</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {/* Sigiriya */}
              <View className="w-72 bg-white rounded-2xl mr-4 shadow-sm overflow-hidden">
                <View className="h-48 overflow-hidden">
                  <Image
                    source={require('@assets/images/home/um-palacio-no-topo-da.jpg')}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="p-4">
                  <Text className="text-lg font-gilroy-bold text-gray-900 mb-1">
                    Ancient Rock Fortress
                  </Text>
                  <Text className="text-sm font-gilroy-regular text-gray-600 mb-3">
                    5th century marvel with stunning frescoes
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <FontAwesome5 name="map-marker-alt" size={12} color="#F5840E" />
                      <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">
                        Central Province
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <FontAwesome5 name="star" size={12} color="#F59E0B" solid />
                      <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">4.9</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Ella */}
              <View className="w-72 bg-white rounded-2xl mr-4 shadow-sm overflow-hidden">
                <View className="h-48 overflow-hidden">
                  <Image
                    source={require('@assets/images/home/nine-arch-2-5.jpg')}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="p-4">
                  <Text className="text-lg font-gilroy-bold text-gray-900 mb-1">
                    Hill Country Gem
                  </Text>
                  <Text className="text-sm font-gilroy-regular text-gray-600 mb-3">
                    Scenic train rides & Nine Arch Bridge
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <FontAwesome5 name="map-marker-alt" size={12} color="#F5840E" />
                      <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">
                        Badulla District
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <FontAwesome5 name="star" size={12} color="#F59E0B" solid />
                      <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">4.8</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Galle Fort */}
              <View className="w-72 bg-white rounded-2xl mr-4 shadow-sm overflow-hidden">
                <View className="h-48 overflow-hidden">
                  <Image
                    source={require('@assets/images/home/Galle-fort-02-1.jpg')}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="p-4">
                  <Text className="text-lg font-gilroy-bold text-gray-900 mb-1">
                    Colonial Heritage
                  </Text>
                  <Text className="text-sm font-gilroy-regular text-gray-600 mb-3">
                    16th century Dutch fort by the ocean
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <FontAwesome5 name="map-marker-alt" size={12} color="#F5840E" />
                      <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">
                        Southern Coast
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <FontAwesome5 name="star" size={12} color="#F59E0B" solid />
                      <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">4.9</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Yala National Park */}
              <View className="w-72 bg-white rounded-2xl mr-4 shadow-sm overflow-hidden">
                <View className="h-48 overflow-hidden">
                  <Image
                    source={require('@assets/images/home/sri-lanka-elephants.jpg')}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="p-4">
                  <Text className="text-lg font-gilroy-bold text-gray-900 mb-1">
                    Wildlife Paradise
                  </Text>
                  <Text className="text-sm font-gilroy-regular text-gray-600 mb-3">
                    Leopards, elephants & exotic birds
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <FontAwesome5 name="map-marker-alt" size={12} color="#F5840E" />
                      <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">
                        Southern Province
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <FontAwesome5 name="star" size={12} color="#F59E0B" solid />
                      <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">4.7</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Cultural Experiences */}
        <View className="px-6 mt-6">
          <Text className="text-xl font-gilroy-bold text-gray-900 mb-4">
            Experience Sri Lankan Culture
          </Text>

          <View className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 shadow-sm mb-4">
            <View className="flex-row items-start">
              <View className="w-14 h-14 bg-primary rounded-2xl items-center justify-center">
                <FontAwesome5 name="om" size={24} color="white" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-lg font-gilroy-bold text-gray-900 mb-1">
                  Temple of the Tooth
                </Text>
                <Text className="text-sm font-gilroy-regular text-gray-600 mb-2">
                  Sacred Buddhist temple in Kandy, home to the relic of Buddha's tooth
                </Text>
                <View className="flex-row items-center">
                  <FontAwesome5 name="clock" size={12} color="#9CA3AF" />
                  <Text className="text-xs font-gilroy-regular text-gray-500 ml-2">
                    Daily ceremonies at 5:30 AM, 9:30 AM & 6:30 PM
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 shadow-sm">
            <View className="flex-row items-start">
              <View className="w-14 h-14 bg-emerald-600 rounded-2xl items-center justify-center">
                <FontAwesome5 name="utensils" size={24} color="white" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-lg font-gilroy-bold text-gray-900 mb-1">
                  Authentic Sri Lankan Cuisine
                </Text>
                <Text className="text-sm font-gilroy-regular text-gray-600 mb-2">
                  Rice & curry, hoppers, kottu - a fusion of flavors and spices
                </Text>
                <View className="flex-row items-center flex-wrap">
                  <View className="bg-white px-3 py-1 rounded-full mr-2 mb-2">
                    <Text className="text-xs font-gilroy-medium text-gray-700">🌶️ Spicy</Text>
                  </View>
                  <View className="bg-white px-3 py-1 rounded-full mr-2 mb-2">
                    <Text className="text-xs font-gilroy-medium text-gray-700">🥥 Coconut</Text>
                  </View>
                  <View className="bg-white px-3 py-1 rounded-full mb-2">
                    <Text className="text-xs font-gilroy-medium text-gray-700">🍛 Curry</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-6 mt-8 pb-4">
          <Text className="text-xl font-gilroy-bold text-gray-900 mb-4">Recent Activity</Text>

          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center">
                <FontAwesome5 name="map-marker-alt" size={18} color="#F5840E" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-base font-gilroy-bold text-gray-900">Trip to Paris</Text>
                <Text className="text-sm font-gilroy-regular text-gray-600">
                  Saved for later • 2 days ago
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color="#9CA3AF" />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
});
