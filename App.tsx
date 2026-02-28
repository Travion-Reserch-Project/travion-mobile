import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider, Toast } from 'react-native-toast-notifications';
import { AppNavigator } from '@navigation';
import { useAuthStore } from '@stores';
import { initializeFirebaseMessaging } from '@services';

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

  useEffect(() => {
    let unsubscribeMessaging: (() => void) | undefined;

    const setupMessaging = async () => {
      unsubscribeMessaging = await initializeFirebaseMessaging((title, message) => {
        try {
          Toast.show(message, {
            type: 'success',
            placement: 'top',
            duration: 4000,
            animationType: 'slide-in',
          });
        } catch (error) {
          console.warn('Failed to show toast notification:', error);
        }
      });
    };

    setupMessaging();

    return () => {
      if (unsubscribeMessaging) {
        unsubscribeMessaging();
      }
    };
  }, []);

  return <AppNavigator />;
}

function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

export default App;
