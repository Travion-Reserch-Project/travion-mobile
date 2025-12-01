import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const googleIcon = require('@assets/images/google-svg.png');

interface GoogleSignInButtonProps {
  onLoginSuccess: (userData: any) => void;
  disabled?: boolean;
}

// Configure Google Sign-In
GoogleSignin.configure({
  iosClientId: '119774457316-367pmus3vdlbje1jg1qsektm1ka6pp2v.apps.googleusercontent.com',
  webClientId: '119774457316-367pmus3vdlbje1jg1qsektm1ka6pp2v.apps.googleusercontent.com', // This is the web client ID from Google Console
  offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
  hostedDomain: '', // specifies a hosted domain restriction
  forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
  accountName: '', // [Android] specifies an account name on the device that should be used
});

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onLoginSuccess,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (disabled || loading) return;

    try {
      setLoading(true);

      // Check if Google Play services are available (Android only)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in with Google
      const result = await GoogleSignin.signIn();

      console.log('Google Sign-In success:', result);

      // Format the data for your backend
      const authData = {
        tokens: {
          accessToken: result.data?.idToken || '',
          refreshToken: '', // Google SDK handles refresh internally
          expiresIn: Date.now() + 60 * 60 * 1000, // 1 hour
        },
        user: {
          id: result.data?.user.id || '',
          email: result.data?.user.email || '',
          name: result.data?.user.name || '',
          picture: result.data?.user.photo || '',
          verified: true,
        },
      };

      onLoginSuccess(authData);
    } catch (error: any) {
      console.error('Google Sign-In error:', error);

      let errorMessage = 'Unable to sign in with Google. Please try again.';

      if (error.code === 'SIGN_IN_CANCELLED') {
        errorMessage = 'Sign-in was cancelled.';
      } else if (error.code === 'IN_PROGRESS') {
        errorMessage = 'Sign-in is already in progress.';
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        errorMessage = 'Google Play Services not available.';
      }

      Alert.alert('Sign-in Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        className={`w-full flex-row items-center justify-center px-6 py-1.5 rounded-lg border-2 ${
          disabled || loading
            ? 'border-gray-200 bg-gray-100'
            : 'border-gray-300 bg-white active:bg-gray-50'
        }`}
        activeOpacity={0.7}
      >
        {/* Loading indicator or Google Icon */}
        <View className="w-5 h-5 mr-3">
          {loading ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : (
            <Image source={googleIcon} className="w-full h-full" resizeMode="contain" />
          )}
        </View>

        {/* Button Text */}
        <Text
          className={`text-base font-gilroy-medium ${
            disabled || loading ? 'text-gray-400' : 'text-gray-700'
          }`}
        >
          {loading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
