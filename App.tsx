import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from '@navigation';
import { useAuthStore } from '@stores';
import Geolocation from '@react-native-community/geolocation';

// Configure geolocation to use Google Play Services (Fused Location Provider)
// instead of the default Android LocationManager which often fails with
// "No location provider available"
Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  locationProvider: 'playServices',
});

function AppContent() {
  const { initializeAuth, clearAllData } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on app start
    initializeAuth();

    // For development: Add global function to clear data
    if (__DEV__) {
      // @ts-ignore - Adding to global for development
      global.clearAuthData = clearAllData;
      console.log('Dev mode: Use clearAuthData() in console to reset app state');
    }
  }, [initializeAuth, clearAllData]);

  return <AppNavigator />;
}

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

export default App;
