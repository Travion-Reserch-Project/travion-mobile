import React, { useCallback } from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
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

const SKIN_TYPE_NAMES: Record<number, string> = {
  1: 'Very Fair', 2: 'Fair', 3: 'Medium', 4: 'Olive', 5: 'Brown', 6: 'Dark',
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

  const handleDeleteHealthProfile = () => {
    Alert.alert(
      'Delete Health Profile',
      'This will permanently remove your skin analysis data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.userId) {
                await healthProfileService.deleteHealthProfile(user.userId);
                setHealthProfile(null);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete health profile.');
            }
          },
        },
      ],
    );
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

        {/* Health Profile Card */}
        <View style={hpStyles.cardWrap}>
          {healthProfile ? (
            <View style={hpStyles.card}>
              <LinearGradient
                colors={['#FFF7ED', '#FFEDD5']}
                style={hpStyles.cardGradient}
              >
                <View style={hpStyles.cardRow}>
                  <Image
                    source={{ uri: healthProfile.imageUrl }}
                    style={hpStyles.cardImage}
                  />
                  <View style={hpStyles.cardInfo}>
                    <Text style={hpStyles.cardLabel}>SKIN TYPE</Text>
                    <Text style={hpStyles.cardType}>
                      Type {healthProfile.skinType} · {SKIN_TYPE_NAMES[healthProfile.skinType] || 'Unknown'}
                    </Text>
                    <Text style={hpStyles.cardSub}>SPF {healthProfile.skinType <= 2 ? '50+' : healthProfile.skinType <= 4 ? '30' : '15'} recommended</Text>
                  </View>
                </View>
                <View style={hpStyles.cardActions}>
                  <TouchableOpacity
                    style={hpStyles.viewBtn}
                    onPress={() => navigate('HealthProfileLanding')}
                  >
                    <FontAwesome name="eye" size={14} color="#F5840E" />
                    <Text style={hpStyles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={hpStyles.editBtn}
                    onPress={() => navigation.navigate('HealthProfileSetup', { imageUrl: healthProfile.imageUrl })}
                  >
                    <FontAwesome name="pencil" size={14} color="#2563EB" />
                    <Text style={hpStyles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={hpStyles.deleteBtn}
                    onPress={handleDeleteHealthProfile}
                  >
                    <FontAwesome name="trash" size={14} color="#dc2626" />
                    <Text style={hpStyles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <TouchableOpacity
              style={hpStyles.setupCard}
              onPress={() => navigation.navigate('HealthProfileLanding')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#F5840E', '#ea580c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={hpStyles.setupGradient}
              >
                <View style={hpStyles.setupIconWrap}>
                  <FontAwesome name="sun-o" size={22} color="#F5840E" />
                </View>
                <View style={hpStyles.setupTextWrap}>
                  <Text style={hpStyles.setupTitle}>Set Up Health Profile</Text>
                  <Text style={hpStyles.setupDesc}>Get personalized UV protection</Text>
                </View>
                <FontAwesome name="chevron-right" size={14} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Options */}
        <View className="px-6 mt-2">
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

const hpStyles = StyleSheet.create({
  cardWrap: { paddingHorizontal: 24, marginTop: 16 },
  card: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardGradient: { padding: 16, borderRadius: 20 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardImage: { width: 56, height: 56, borderRadius: 16, marginRight: 14 },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 10, fontWeight: '800', color: '#F5840E', letterSpacing: 1, marginBottom: 2 },
  cardType: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  viewBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 10, gap: 6,
  },
  viewBtnText: { fontSize: 14, fontWeight: '600', color: '#F5840E' },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 12, paddingVertical: 10, gap: 6,
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 10, gap: 6,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  setupCard: { borderRadius: 20, overflow: 'hidden' },
  setupGradient: {
    flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20,
  },
  setupIconWrap: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  setupTextWrap: { flex: 1 },
  setupTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  setupDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
});
