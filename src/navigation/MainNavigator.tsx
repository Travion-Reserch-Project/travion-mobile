import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProfileSetupScreen, MainAppScreen } from '@screens';
import { MapScreen } from '@screens/MapScreen';
import { ReportIncidentScreen } from '@screens/safety/ReportIncidentScreen';
import { PoliceHelpScreen } from '@screens/safety/PoliceHelpScreen';
import { AlertsScreen } from '@screens/safety/AlertsScreen';
import { ProfileScreen } from '@screens/ProfileScreen';
import { ChatbotScreen } from '@screens/transport/ChatbotScreen';
import { useAuthStore } from '@stores';
import { useNotifications } from '@hooks/useNotifications';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { SafetyAlert } from '@components/explore/SafetyAlerts';

const welcomeBackAnimation = require('@assets/animations/success.json');

export type MainStackParamList = {
  ProfileSetup: undefined;
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
  ChatbotScreen: undefined;
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

  // Simple logic: if user has profileStatus 'Complete', show welcome back, otherwise profile setup
  const hasCompleteProfile = user?.profileStatus === 'Complete';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1 },
      }}
      screenLayout={({ children }) => <ScreenWithSafeArea>{children}</ScreenWithSafeArea>}
    >
      {hasCompleteProfile ? (
        <>
          <Stack.Screen name="WelcomeBack" component={WelcomeBackScreen} />
          <Stack.Screen name="MainApp" component={MainAppScreen} />
          <Stack.Screen name="MapScreen" component={MapScreen} />
          <Stack.Screen name="ReportIncidentScreen" component={ReportIncidentScreen} />
          <Stack.Screen name="PoliceHelpScreen" component={PoliceHelpScreen} />
          <Stack.Screen name="AlertsScreen" component={AlertsScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="ChatbotScreen" component={ChatbotScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="ProfileSetup" component={UserProfileSetupScreen} />
          <Stack.Screen name="MainApp" component={MainAppScreen} />
          <Stack.Screen name="MapScreen" component={MapScreen} />
          <Stack.Screen name="ReportIncidentScreen" component={ReportIncidentScreen} />
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
    backgroundColor: 'white',
  },
});
