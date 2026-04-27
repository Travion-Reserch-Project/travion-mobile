import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProfileSetupScreen, MainAppScreen, PreferencesOnboardingScreen } from '@screens';
import { MapScreen } from '@screens/MapScreen';
import { ReportIncidentScreen } from '@screens/safety/ReportIncidentScreen';
import { ReportRoadIssueScreen } from '@screens/transport/ReportRoadIssueScreen';
import { IncidentMapScreen } from '../screens/safety/IncidentMapScreen';
import { PoliceHelpScreen } from '@screens/safety/PoliceHelpScreen';
import { AlertsScreen } from '@screens/safety/AlertsScreen';
import { ProfileScreen } from '@screens/auth/ProfileScreen';
import { ChatbotScreen } from '@screens/transport/ChatbotScreen';
import { useAuthStore } from '@stores';
import { useNotifications } from '@hooks/useNotifications';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { SafetyAlert } from '@components/explore/SafetyAlerts';
import SunProtectionScreen from '@screens/weather/SunProtectionScreen';
import SafetyAdvisorScreen from '@screens/weather/SafetyAdvisorScreen';
import HealthProfileSetup from '@screens/weather/HealthProfileSetupScreen';
import HealthProfileLanding from '@screens/weather/HealthProfileLanding';
import SkinAnalysisScreen from '@screens/weather/SkinAnalysisScreen';
import SkinAnalysisResultScreen from '@screens/weather/SkinAnalysisResultScreen';
import SunburnHistoryScreen from '@screens/weather/SunburnHistoryScreen';
import SkinHelthProfileScreen from '@screens/weather/SkinHelthProfileScreen';
import FaceCaptureScreen from '@screens/weather/FaceCaptureScreen';
import { LocationDetailsScreen } from '@screens/agent/LocationDetailsScreen';
import { LocationChatScreen } from '@screens/agent/LocationChatScreen';
import { TourPlanChatScreen } from '@screens/agent/TourPlanChatScreen';
import { TourGuideChatScreen } from '@screens/agent/TourGuideChatScreen';

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
  ReportRoadIssueScreen: undefined;
  IncidentMapScreen:
    | {
        origin?: { latitude: number; longitude: number };
        destination?: { latitude: number; longitude: number };
      }
    | undefined;
  PoliceHelpScreen: undefined;
  AlertsScreen: undefined;
  ProfileScreen: { userName?: string; userEmail?: string };
  ChatbotScreen: undefined;
  SunProtection: undefined;
  SafetyAdvisor: { uvIndex?: number; riskLevel?: string } | undefined;
  HealthProfileSetup: { imageUrl?: string };
  HealthProfileLanding: undefined;
  SkinAnalysis: { imageUrl?: string; age?: number };
  SkinAnalysisResult: { imageUrl: string; skinType: number; age?: number };
  SunburnHistory: { imageUrl: string; skinType: number; age?: number };
  SkinHelthProfile: {
    imageUrl: string;
    skinType: number;
    skinProductInteraction: string;
    useOfSunglasses: string;
    historicalSunburnTimes: string;
    age: number;
    isExistingProfile?: boolean;
  };
  FaceCapture: undefined;
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
    selectedLocations: {
      name: string;
      latitude: number;
      longitude: number;
      imageUrl?: string;
      distance_km?: number;
    }[];
    startDate: string;
    endDate: string;
    preferences?: string[];
  };
  TourGuideChat: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

// Move ScreenWithSafeArea component outside of MainNavigator
const ScreenWithSafeArea: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {children}
    </SafeAreaView>
  );
};

const renderWithSafeArea = ({ children }: { children: React.ReactNode }) => {
  return <ScreenWithSafeArea>{children}</ScreenWithSafeArea>;
};

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

  // Initialize notifications for authenticated users
  useNotifications();

  // Three-state onboarding logic
  const hasCompleteProfile = user?.profileStatus === 'Complete';
  const hasSetPreferences = user?.hasSetPreferences === true;

  let initialRoute: keyof MainStackParamList;
  if (!hasCompleteProfile) {
    initialRoute = 'ProfileSetup';
  } else if (!hasSetPreferences) {
    initialRoute = 'PreferencesOnboarding';
  } else {
    initialRoute = 'WelcomeBack';
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1 },
      }}
      screenLayout={renderWithSafeArea}
    >
      {hasCompleteProfile ? (
        <>
          <Stack.Screen name="PreferencesOnboarding" component={PreferencesOnboardingScreen} />
          <Stack.Screen name="WelcomeBack" component={WelcomeBackScreen} />
          <Stack.Screen name="MainApp" component={MainAppScreen} />
          <Stack.Screen name="MapScreen" component={MapScreen} />
          <Stack.Screen name="ReportIncidentScreen" component={ReportIncidentScreen} />
          <Stack.Screen name="ReportRoadIssueScreen" component={ReportRoadIssueScreen} />
          <Stack.Screen name="IncidentMapScreen" component={IncidentMapScreen} />
          <Stack.Screen name="PoliceHelpScreen" component={PoliceHelpScreen} />
          <Stack.Screen name="AlertsScreen" component={AlertsScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="ChatbotScreen" component={ChatbotScreen} />
          <Stack.Screen name="SunProtection" component={SunProtectionScreen} />
          <Stack.Screen name="SafetyAdvisor" component={SafetyAdvisorScreen} />
          <Stack.Screen name="HealthProfileSetup" component={HealthProfileSetup} />
          <Stack.Screen name="HealthProfileLanding" component={HealthProfileLanding} />
          <Stack.Screen name="SkinAnalysis" component={SkinAnalysisScreen} />
          <Stack.Screen name="SkinAnalysisResult" component={SkinAnalysisResultScreen} />
          <Stack.Screen name="SunburnHistory" component={SunburnHistoryScreen} />
          <Stack.Screen name="SkinHelthProfile" component={SkinHelthProfileScreen} />
          <Stack.Screen name="FaceCapture" component={FaceCaptureScreen} />
          <Stack.Screen name="LocationDetails" component={LocationDetailsScreen} />
          <Stack.Screen name="LocationChat" component={LocationChatScreen} />
          <Stack.Screen name="TourPlanChat" component={TourPlanChatScreen} />
          <Stack.Screen name="TourGuideChat" component={TourGuideChatScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="ProfileSetup" component={UserProfileSetupScreen} />
          <Stack.Screen name="PreferencesOnboarding" component={PreferencesOnboardingScreen} />
          <Stack.Screen name="MainApp" component={MainAppScreen} />
          <Stack.Screen name="MapScreen" component={MapScreen} />
          <Stack.Screen name="ReportIncidentScreen" component={ReportIncidentScreen} />
          <Stack.Screen name="ReportRoadIssueScreen" component={ReportRoadIssueScreen} />
          <Stack.Screen name="IncidentMapScreen" component={IncidentMapScreen} />
          <Stack.Screen name="PoliceHelpScreen" component={PoliceHelpScreen} />
          <Stack.Screen name="AlertsScreen" component={AlertsScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="ChatbotScreen" component={ChatbotScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  animation: {
    width: 300,
    height: 300,
  },
  safeArea: {
    flex: 1,
  },
});
