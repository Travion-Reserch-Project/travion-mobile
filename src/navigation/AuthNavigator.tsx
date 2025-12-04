import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen, LoginScreen } from '@screens';
import { useAuthStore } from '@stores';

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  const { hasSeenOnboarding } = useAuthStore();

  // Debug logging
  console.log('AuthNavigator state:', {
    hasSeenOnboarding,
    initialRoute: hasSeenOnboarding ? 'Login' : 'Onboarding',
  });

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={hasSeenOnboarding ? 'Login' : 'Onboarding'}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};
