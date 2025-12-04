import React from 'react';
import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useAuthStore } from '@stores';

interface HomeScreenProps {
  userName?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = () => {
  const { user } = useAuthStore();
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
            <View>
              <Text className="text-lg font-gilroy-regular text-gray-600">Welcome back,</Text>
              <Text className="text-2xl font-gilroy-bold text-gray-900">
                {user?.userName || 'Traveler'}
              </Text>
            </View>

            {/* Notification Bell */}
            <View className="w-12 h-12 bg-primary rounded-full items-center justify-center">
              <FontAwesome5 name="bell" size={18} color="white" />
            </View>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mt-4">
            <FontAwesome5 name="search" size={16} color="#9CA3AF" />
            <Text className="ml-3 text-gray-500 font-gilroy-regular flex-1">
              Where do you want to go?
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mt-6">
          <Text className="text-xl font-gilroy-bold text-gray-900 mb-4">Quick Actions</Text>

          <View className="flex-row justify-between">
            <View className="flex-1 bg-white rounded-2xl p-6 mr-3 items-center shadow-sm">
              <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-3">
                <FontAwesome5 name="plane" size={24} color="#3B82F6" />
              </View>
              <Text className="text-sm font-gilroy-bold text-gray-900 text-center">
                Book Flight
              </Text>
            </View>

            <View className="flex-1 bg-white rounded-2xl p-6 mx-1.5 items-center shadow-sm">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-3">
                <FontAwesome5 name="hotel" size={24} color="#10B981" />
              </View>
              <Text className="text-sm font-gilroy-bold text-gray-900 text-center">
                Find Hotels
              </Text>
            </View>

            <View className="flex-1 bg-white rounded-2xl p-6 ml-3 items-center shadow-sm">
              <View className="w-16 h-16 bg-yellow-100 rounded-full items-center justify-center mb-3">
                <FontAwesome5 name="car" size={24} color="#F59E0B" />
              </View>
              <Text className="text-sm font-gilroy-bold text-gray-900 text-center">Rent Car</Text>
            </View>
          </View>
        </View>

        {/* Recommended Destinations */}
        <View className="px-6 mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-gilroy-bold text-gray-900">Recommended for You</Text>
            <Text className="text-sm font-gilroy-medium text-primary">See All</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {/* Destination Card 1 */}
              <View className="w-72 bg-white rounded-2xl mr-4 shadow-sm overflow-hidden">
                <View className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 items-center justify-center">
                  <FontAwesome5 name="mountain" size={48} color="white" />
                </View>
                <View className="p-4">
                  <Text className="text-lg font-gilroy-bold text-gray-900 mb-1">
                    Mountain Adventure
                  </Text>
                  <Text className="text-sm font-gilroy-regular text-gray-600 mb-3">
                    Explore breathtaking mountain views
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-gilroy-bold text-primary">$299</Text>
                    <View className="flex-row items-center">
                      <FontAwesome5 name="star" size={12} color="#F59E0B" solid />
                      <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">4.8</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Destination Card 2 */}
              <View className="w-72 bg-white rounded-2xl mr-4 shadow-sm overflow-hidden">
                <View className="h-48 bg-gradient-to-br from-green-400 to-blue-500 items-center justify-center">
                  <FontAwesome5 name="umbrella-beach" size={48} color="white" />
                </View>
                <View className="p-4">
                  <Text className="text-lg font-gilroy-bold text-gray-900 mb-1">
                    Beach Paradise
                  </Text>
                  <Text className="text-sm font-gilroy-regular text-gray-600 mb-3">
                    Relax on pristine beaches
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-gilroy-bold text-primary">$399</Text>
                    <View className="flex-row items-center">
                      <FontAwesome5 name="star" size={12} color="#F59E0B" solid />
                      <Text className="text-sm font-gilroy-medium text-gray-600 ml-1">4.9</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
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
