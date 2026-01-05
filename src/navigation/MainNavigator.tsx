import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  UserProfileSetupScreen,
  MainAppScreen,
  PreferencesOnboardingScreen,
  LocationDetailsScreen,
  LocationChatScreen,
  TourPlanChatScreen,
} from '@screens';
import { MapScreen } from '@screens/MapScreen';
import { ReportIncidentScreen } from '@screens/ReportIncidentScreen';
import { PoliceHelpScreen } from '@screens/PoliceHelpScreen';
import { AlertsScreen } from '@screens/AlertsScreen';
import { ProfileScreen } from '@screens/ProfileScreen';
import { useAuthStore } from '@stores';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { SafetyAlert } from '@components/explore/SafetyAlerts';
import type { SelectedLocation } from '@services/api';

const welcomeBackAnimation = require('@assets/animations/success.json');

export type MainStackParamList = {
  ProfileSetup: undefined;
  PreferencesOnboarding: undefined;
  WelcomeBack: undefined;
  MainApp: { userName?: string; userEmail?: string } | undefined;
  MapScreen: {
    alerts?: SafetyAlert[];
    selectedAlert?: SafetyAlert;
  };
  ReportIncidentScreen: undefined;
  PoliceHelpScreen: undefined;
  AlertsScreen: undefined;
  ProfileScreen: { userName?: string; userEmail?: string };
  LocationDetails: {
    locationName: string;
    distance?: number;
    matchScore?: number;
    userLatitude?: number;
    userLongitude?: number;
  };
  LocationChat: {
    locationName: string;
  };
  TourPlanChat: {
    selectedLocations: SelectedLocation[];
    startDate: string;
    endDate: string;
    preferences?: string[];
  };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

// Simple Welcome Back component
const WelcomeBackScreen: React.FC = () => {
  const navigation = useNavigation();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('MainApp' as never);
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">
        <LottieView source={welcomeBackAnimation} autoPlay loop={false} style={styles.animation} />
        <Text className="text-3xl font-gilroy-bold text-gray-900 text-center mb-4 mt-8">
          Welcome Back!
        </Text>
        <Text className="text-lg font-gilroy-regular text-gray-600 text-center">
          Great to see you again!
        </Text>
      </View>
    </SafeAreaView>
  );
};

export const MainNavigator: React.FC = () => {
  const { user } = useAuthStore();

  // Check profile completion status
  const hasCompleteProfile = user?.profileStatus === 'Complete';
  // Check if travel preferences have been set
  const hasSetPreferences = user?.hasSetPreferences === true;

  // Determine the initial route based on user state
  const getInitialRoute = (): keyof MainStackParamList => {
    if (!hasCompleteProfile) {
      // User needs to complete profile first
      return 'ProfileSetup';
    }
    if (!hasSetPreferences) {
      // User has profile but needs to set travel preferences
      return 'PreferencesOnboarding';
    }
    // User is fully set up, show welcome back
    return 'WelcomeBack';
  };

  const initialRoute = getInitialRoute();

  console.log('MainNavigator state:', {
    hasCompleteProfile,
    hasSetPreferences,
    initialRoute,
    userProfileStatus: user?.profileStatus,
  });

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="ProfileSetup" component={UserProfileSetupScreen} />
      <Stack.Screen name="PreferencesOnboarding" component={PreferencesOnboardingScreen} />
      <Stack.Screen name="WelcomeBack" component={WelcomeBackScreen} />
      <Stack.Screen name="MainApp" component={MainAppScreen} />
      <Stack.Screen name="MapScreen" component={MapScreen} />
      <Stack.Screen name="ReportIncidentScreen" component={ReportIncidentScreen} />
      <Stack.Screen name="PoliceHelpScreen" component={PoliceHelpScreen} />
      <Stack.Screen name="AlertsScreen" component={AlertsScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen
        name="LocationDetails"
        component={LocationDetailsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="LocationChat"
        component={LocationChatScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="TourPlanChat"
        component={TourPlanChatScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  animation: {
    width: 300,
    height: 300,
  },
});
