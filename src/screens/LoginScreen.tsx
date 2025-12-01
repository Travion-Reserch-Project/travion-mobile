import React, { useState } from 'react';
import { View, Image, StatusBar, Alert, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginForm } from '@components/forms';
import { useAuthStore } from '@stores';

const vectorLogin = require('@assets/images/vector-login.png');

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login, loginWithGoogle, isLoading } = useAuthStore();
  const [formLoading, setFormLoading] = useState(false);

  const handleLogin = async (email: string, password: string, _rememberMe: boolean) => {
    try {
      setFormLoading(true);
      await login(email, password);
      console.log('Login successful');
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      Alert.alert('Login Failed', error.message || 'Invalid email or password. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignUp = () => {
    console.log('Sign up pressed');
  };

  const handleForgotPassword = () => {
    console.log('Forgot password pressed');
  };

  const handleGoogleLogin = async (authData: any) => {
    try {
      await loginWithGoogle(authData);
      console.log('Google login successful');
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error('Google login failed:', error);
      Alert.alert(
        'Google Sign-In Failed',
        error.message || 'Unable to sign in with Google. Please try again.',
        [{ text: 'OK' }],
      );
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Top Background Shape */}
      <View className="absolute -top-3 left-0 right-0">
        <Image source={vectorLogin} className="w-full h-100" />
      </View>

      {/* Loading Overlay */}
      {(isLoading || formLoading) && (
        <View className="absolute inset-0 bg-black/20 items-center justify-center z-50">
          <View className="bg-white p-6 rounded-lg items-center">
            <ActivityIndicator size="large" color="#F5840E" />
            <Text className="mt-2 text-base font-gilroy-medium text-gray-700">Signing in...</Text>
          </View>
        </View>
      )}

      {/* Login Form */}
      <View className="flex-1 px-6 justify-center">
        <View className="mt-64">
          <LoginForm
            onLogin={handleLogin}
            onForgotPassword={handleForgotPassword}
            onGoogleLogin={handleGoogleLogin}
            onSignUp={handleSignUp}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};
