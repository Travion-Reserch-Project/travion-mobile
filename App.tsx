import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from '@navigation';
import { useAuthStore } from '@stores';

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
