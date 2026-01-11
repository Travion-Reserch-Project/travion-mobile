import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Image, ScrollView } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { MainStackParamList } from '@navigation/MainNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
const HealthProfileLandingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  return (
    <ScrollView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-10 pb-4">
        <View className="flex-row items-center">
          <FontAwesome name="sun-o" size={22} color="#f97316" />
          <Text className="ml-3 text-xl font-bold text-slate-900">Safety Advisor</Text>
        </View>
        <TouchableOpacity>
          <FontAwesome name="cog" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Live Forecast Card */}
      <View className="px-6 mt-4">
        <View className="rounded-[32px] overflow-hidden bg-black">
          {/* Background image */}
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1534447677768-be436bb09401',
            }}
            className="w-full h-72"
            resizeMode="cover"
          />

          {/* Dark overlay */}
          <View className="absolute inset-0 bg-black/50" />

          {/* Verified badge */}
          <View className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full flex-row items-center">
            <FontAwesome name="check-circle" size={14} color="#f97316" />
            <Text className="ml-2 font-semibold text-slate-900">Verified Data</Text>
          </View>

          {/* Bottom content */}
          <View className="absolute bottom-5 left-5 right-5">
            <View className="bg-orange-500 self-start px-4 py-1.5 rounded-full mb-2">
              <Text className="text-white text-xs font-bold">LIVE FORECAST</Text>
            </View>
            <Text className="text-white text-lg font-semibold">
              Current Location UV Index: High
            </Text>
          </View>
        </View>
      </View>

      {/* Info Card */}
      <View className="px-6 mt-8">
        <View className="bg-white rounded-[36px] shadow-lg overflow-hidden">
          {/* Gradient-like image */}
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1501973801540-537f08ccae7b',
            }}
            className="w-full h-48"
            resizeMode="cover"
          />

          <View className="px-6 py-8 items-center">
            <Text className="text-3xl font-extrabold text-slate-900 text-center mb-4">
              UV & Weather{'\n'}Safety Advisor
            </Text>

            <Text className="text-slate-500 text-center text-base mb-8">
              Personalized sun exposure risk and safety alerts
            </Text>

            <TouchableOpacity
              className="bg-primary rounded-full px-10 py-5 flex-row items-center shadow-lg"
              onPress={() => navigation.navigate('HealthProfileSetup', { imageUri: '' })}
            >
              <Text className="text-white font-extrabold text-lg mr-3">Get Started</Text>
              <FontAwesome name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View className="items-center mt-10 mb-8 px-6">
        <View className="flex-row items-center mb-2">
          <View className="bg-orange-500 w-8 h-8 rounded-full items-center justify-center mr-2">
            <FontAwesome name="shield" size={14} color="#fff" />
          </View>
          <Text className="font-semibold text-slate-700">Travel Safe & Sun Smart</Text>
        </View>
        <Text className="text-slate-400 text-center text-sm">
          A research-based tool for international travelers.
        </Text>
      </View>
    </ScrollView>
  );
};

export default HealthProfileLandingScreen;
