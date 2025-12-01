import React from 'react';
import { View, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginForm } from '@components/forms';

const vectorLogin = require('@assets/images/vector-login.png');

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const handleLogin = (email: string, password: string, rememberMe: boolean) => {
    console.log('Login pressed', { email, password, rememberMe });
    // Simulate successful login
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleSignUp = () => {
    console.log('Sign up pressed');
  };

  const handleForgotPassword = () => {
    console.log('Forgot password pressed');
  };

  const handleGoogleLogin = () => {
    console.log('Google login pressed');
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Top Background Shape */}
      <View className="absolute top-0 left-0 right-0">
        <Image source={vectorLogin} className="w-full h-100" />
      </View>

      {/* Login Form */}
      <View className="flex-1 px-6 justify-center">
        <View className="mt-80">
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
