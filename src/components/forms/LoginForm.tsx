import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Button } from '@components/common';

const googleIcon = require('@assets/images/google-svg.png');

interface LoginFormProps {
  onLogin: (email: string, password: string, rememberMe: boolean) => void;
  onForgotPassword: () => void;
  onGoogleLogin?: () => void;
  onSignUp: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onForgotPassword,
  onGoogleLogin,
  onSignUp,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    onLogin(email, password, rememberMe);
  };

  return (
    <View>
      {/* Title */}
      <Text className="text-3xl font-gilroy-bold text-gray-900 mb-2">Sign in</Text>
      <View className="w-12 h-1 bg-primary mb-8" />

      {/* Email Input */}
      <View className="mb-6">
        <Text className="text-sm font-gilroy-medium text-gray-700 mb-2">Email</Text>
        <View className="border border-gray-300 rounded-lg px-4 py-2 flex-row items-center bg-white/70">
          <View className="w-6 h-6 mr-3 items-center justify-center">
            <FontAwesome5 name="user" size={16} color="#6B7280" />
          </View>
          <TextInput
            className="flex-1 text-base font-gilroy-regular text-gray-900"
            placeholder="demo@email.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Password Input */}
      <View className="mb-6">
        <Text className="text-sm font-gilroy-medium text-gray-700 mb-2">Password</Text>
        <View className="border border-gray-300 rounded-lg px-4 py-2 flex-row items-center bg-white/70">
          <View className="w-6 h-6 mr-3 items-center justify-center">
            <FontAwesome5 name="lock" size={16} color="#6B7280" />
          </View>
          <TextInput
            className="flex-1 text-base font-gilroy-regular text-gray-900"
            placeholder="enter your password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity className="ml-2">
            <FontAwesome5 name="eye" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Remember Me & Forgot Password */}
      <View className="flex-row justify-between items-center mb-8">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => setRememberMe(!rememberMe)}
        >
          <View
            className={`w-5 h-5 border-2 rounded-sm mr-2 ${
              rememberMe ? 'bg-primary border-red-400' : 'border-gray-300'
            }`}
          >
            {rememberMe && (
              <View className="flex-1 items-center justify-center">
                <Text className="text-white text-xs font-bold">✓</Text>
              </View>
            )}
          </View>
          <Text className="text-sm font-gilroy-regular text-gray-700">Remember Me</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onForgotPassword}>
          <Text className="text-sm font-gilroy-medium text-red-400">Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* Login Button */}
      <View className="mb-4">
        <Button title="Login" onPress={handleLogin} variant="primary" />
      </View>

      {/* Or Divider */}
      <View className="flex-row items-center mb-4">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="px-4 text-sm font-gilroy-regular text-gray-500">or</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      {/* Google Login Button */}
      <View className="mb-6">
        <Button
          title="Continue with Google"
          onPress={onGoogleLogin}
          variant="outline"
          icon={<Image source={googleIcon} className="w-4 h-4" resizeMode="contain" />}
        />
      </View>

      {/* Sign Up Link */}
      <View className="flex-row justify-center">
        <Text className="text-sm font-gilroy-regular text-gray-600">Don't have an Account?</Text>
        <TouchableOpacity onPress={onSignUp} className="ml-1">
          <Text className="text-sm font-gilroy-bold text-red-400">Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
