import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProfileSetupScreen, MainAppScreen } from '@screens';
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

  // Simple logic: if user has profileStatus 'Complete', show welcome back, otherwise profile setup
  const hasCompleteProfile = user?.profileStatus === 'Complete';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {true ? (
        <>
          <Stack.Screen name="WelcomeBack" component={WelcomeBackScreen} />
          <Stack.Screen name="MainApp" component={MainAppScreen} />
          <Stack.Screen name="MapScreen" component={MapScreen} />
          <Stack.Screen name="ReportIncidentScreen" component={ReportIncidentScreen} />
          <Stack.Screen name="PoliceHelpScreen" component={PoliceHelpScreen} />
          <Stack.Screen name="AlertsScreen" component={AlertsScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
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
});
