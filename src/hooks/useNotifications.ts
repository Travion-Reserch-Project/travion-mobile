import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NotificationService, NotificationPayload } from '@services/NotificationService';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { navigate } from '../navigation/navigationRef';

export const useNotifications = () => {
  const navigation = useNavigation<any>();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let isInitialized = false;

    const initializeNotifications = async () => {
      try {
        console.log('[useNotifications] Initializing...');

        // Request permission
        const hasPermission = await NotificationService.requestPermission();
        if (!hasPermission) {
          console.log('[useNotifications] Permission denied');
          return;
        }

        // Get and register token
        const token = await NotificationService.getToken();
        if (!token) {
          console.log('[useNotifications] Failed to get FCM token');
          return;
        }

        // Get current location and register token
        Geolocation.getCurrentPosition(
          async position => {
            const { latitude, longitude } = position.coords;
            const registered = await NotificationService.registerToken(latitude, longitude);

            if (registered) {
              console.log('[useNotifications] Token registered successfully');
              isInitialized = true;
            }
          },
          error => {
            console.error('[useNotifications] Geolocation error1:', error);
          },
        );

        // Set up notification listeners
        NotificationService.setupNotificationListeners(
          // Foreground notification handler
          (data: NotificationPayload) => {
            console.log('[useNotifications] Foreground notification received:', data);
            // Trigger a refresh or update in the app
            // You can emit an event here if needed
          },
          // Notification opened handler
          (data: NotificationPayload) => {
            console.log('[useNotifications] Notification opened:', data);
            handleNotificationNavigation(data);
          },
        );
      } catch (error) {
        console.error('[useNotifications] Initialization error:', error);
      }
    };

    const handleNotificationNavigation = (data: NotificationPayload) => {
      // Navigate based on notification type
      if (data.type === 'incident_alert' && data.screen === 'Alerts') {
        // Navigate to Alerts screen
        setTimeout(() => {
          navigate('AlertsScreen', {
            incidentId: data.incidentId,
            refresh: true,
          });
        }, 500);
      }
    };

    // Update location when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        if (isInitialized) {
          Geolocation.getCurrentPosition(
            async position => {
              const { latitude, longitude } = position.coords;
              await NotificationService.updateLocation(latitude, longitude);
              console.log('[useNotifications] Location updated on app foreground');
            },
            error => {
              console.error('[useNotifications] Location update error:', error);
            },
          );
        }
      }

      appState.current = nextAppState;
    };

    // Initialize on mount
    initializeNotifications();

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      subscription.remove();
      NotificationService.cleanup();
    };
  }, [navigation]);

  return {
    // You can expose methods here if needed
  };
};
