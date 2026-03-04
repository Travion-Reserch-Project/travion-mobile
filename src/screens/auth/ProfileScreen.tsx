import React, { useCallback } from 'react';
import { View, Text, StatusBar, ScrollView, Alert, TouchableOpacity } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Button } from '@components/common';
import { useAuthStore } from '@stores';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MainStackParamList } from '@navigation/MainNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { healthProfileService } from '@services/api';
import { HealthProfile } from '../../types';

interface ProfileScreenProps {
  userName?: string;
  userEmail?: string;
}
type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const REVERSE_TIMES_MAP: Record<number, string> = {
  1: 'One',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five+',
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userEmail = 'travel@example.com',
}) => {
  const { logout, user } = useAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const [healthProfile, setHealthProfile] = React.useState<HealthProfile | null>(null);

  const fetchHealthProfile = useCallback(async () => {
    if (user?.userId) {
      try {
        const profile = await healthProfileService.getHealthProfile(user.userId);
        setHealthProfile(profile);
      } catch (error) {
        console.error('Error fetching health profile:', error);
        setHealthProfile(null);
      }
    }
  }, [user?.userId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchHealthProfile();
    }, [fetchHealthProfile]),
  );

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
      },
    ]);
  };

  const navigate = (href?: string) => {
    if (!href) return;

    if (href === 'HealthProfileLanding' && healthProfile) {
      navigation.navigate('SkinHelthProfile', {
        imageUrl: healthProfile.imageUrl,
        skinType: healthProfile.skinType,
        skinProductInteraction: healthProfile.skinProductInteraction,
        useOfSunglasses: healthProfile.useOfSunglasses,
        historicalSunburnTimes:
          REVERSE_TIMES_MAP[healthProfile.historicalSunburnTimes || 0] || 'One',
        age: healthProfile.age,
        isExistingProfile: true,
      });
    } else {
      navigation.navigate(href as any);
    }
  };
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white px-6 py-8">
          <View className="items-center">
            <View className="w-24 h-24 bg-primary rounded-full items-center justify-center mb-4">
              <FontAwesome5 name="user" size={32} color="white" />
            </View>

            <Text className="text-2xl font-gilroy-bold text-gray-900 mb-1">{user?.userName}</Text>

            <Text className="text-base font-gilroy-regular text-gray-600">
              {user?.email || userEmail}
            </Text>
          </View>
        </View>

        {/* Profile Options */}
        <View className="px-6 mt-6">
          {/* Account Settings */}
          <View className="bg-white rounded-2xl mb-4 overflow-hidden">
            {[
              { icon: 'edit', title: 'Edit Profile', subtitle: 'Update your personal information' },
              {
                icon: 'compass',
                title: 'Travel Preferences',
                subtitle: 'Set or edit your travel interests',
                href: 'PreferencesOnboarding',
              },
              {
                icon: 'heartbeat',
                title: healthProfile ? 'Health Profile' : 'Set Up Health Profile',
                subtitle: healthProfile
                  ? 'View and manage your health information'
                  : 'Add skin image for UV & health analysis',
                href: 'HealthProfileLanding',
              },
              { icon: 'cog', title: 'Settings', subtitle: 'App preferences and notifications' },
              { icon: 'heart', title: 'Favorites', subtitle: 'Your saved destinations' },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                className="px-6 py-4 border-b border-gray-100 last:border-b-0"
                onPress={() => navigate(item.href)}
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center">
                    <FontAwesome5 name={item.icon} size={18} color="#6B7280" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-base font-gilroy-bold text-gray-900">{item.title}</Text>
                    <Text className="text-sm font-gilroy-regular text-gray-600">
                      {item.subtitle}
                    </Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={14} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Support */}
          <View className="bg-white rounded-2xl mb-6 overflow-hidden">
            {[
              {
                icon: 'question-circle',
                title: 'Help & Support',
                subtitle: 'Get help when you need it',
              },
              { icon: 'file-alt', title: 'Terms & Privacy', subtitle: 'Legal information' },
            ].map((item, index) => (
              <View key={index} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center">
                    <FontAwesome5 name={item.icon} size={18} color="#6B7280" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-base font-gilroy-bold text-gray-900">{item.title}</Text>
                    <Text className="text-sm font-gilroy-regular text-gray-600">
                      {item.subtitle}
                    </Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={14} color="#9CA3AF" />
                </View>
              </View>
            ))}
          </View>

          {/* Logout Button */}
          <View className="mb-6">
            <Button title="Sign Out" variant="outline" onPress={handleSignOut} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
