import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider, Toast } from 'react-native-toast-notifications';
import { AppNavigator } from '@navigation';
import { useAuthStore } from '@stores';
import { initializeFirebaseMessaging, NotificationPayload } from '@services';
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';
import { NotificationService } from '@services/NotificationService';

const FOREGROUND_LOCATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Request foreground location permission on Android
 */
const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Travion needs access to your location to provide real-time UV health alerts.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

/**
 * Get current GPS position as a promise
 */
const getCurrentPosition = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      error => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000,
        forceRequestLocation: true,
      },
    );
  });
};

/**
 * Send current location to backend for UV risk check
 */
const sendLocationUpdate = async () => {
  try {
    const { latitude, longitude } = await getCurrentPosition();
    console.log(
      `[App] Foreground location: lat=${latitude.toFixed(4)}, lon=${longitude.toFixed(4)}`,
    );
    const success = await NotificationService.updateLocation(latitude, longitude);
    if (success) {
      console.log('[App] Location sent to backend successfully');
    } else {
      console.warn('[App] Failed to send location to backend');
    }
  } catch (error: any) {
    console.warn('[App] Foreground location update error:', error.message);
  }
};

function AppContent() {
  const { initializeAuth, clearAllData } = useAuthStore();
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const setupMessaging = async () => {
      try {
        await initializeFirebaseMessaging(
          (data: NotificationPayload, title: string, message: string) => {
            try {
              // Show different toast styling for UV alerts
              const isUVAlert =
                data.type === 'uv_health_alert' ||
                data.riskLevel === 'high' ||
                data.riskLevel === 'very high';

              Toast.show(message, {
                type: isUVAlert ? 'warning' : 'success',
                placement: 'top',
                duration: isUVAlert ? 6000 : 4000,
                animationType: 'slide-in',
              });
            } catch (error) {
              console.warn('Failed to show toast notification:', error);
            }
          },
        );

        // Request location permission, then register token and start foreground polling
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          console.warn('[App] Location permission not granted');
          return;
        }

        try {
          const { latitude, longitude } = await getCurrentPosition();
          console.log(
            `[App] Initial location: lat=${latitude.toFixed(4)}, lon=${longitude.toFixed(4)}`,
          );
          // Register FCM token with initial location
          await NotificationService.registerToken(latitude, longitude);
        } catch (error: any) {
          console.warn('[App] Failed to get initial location:', error.message);
        }

        // TODO: Re-enable background location service once stable
        // For now, poll location in the foreground while the app is open
        console.log('[App] Starting foreground location polling (every 5 min)');
        locationIntervalRef.current = setInterval(sendLocationUpdate, FOREGROUND_LOCATION_INTERVAL_MS);
        // Also send one update right away after a short delay
        setTimeout(sendLocationUpdate, 3000);
      } catch (error) {
        console.error('Failed to initialize messaging:', error);
      }
    };

    setupMessaging();

    // Cleanup on unmount — stop the foreground polling
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
        console.log('[App] Foreground location polling stopped');
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
