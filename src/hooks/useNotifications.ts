import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NotificationService, NotificationPayload } from '@services/NotificationService';
import Geolocation from '@react-native-community/geolocation';
import { navigate } from '../navigation/navigationRef';

export const useNotifications = () => {
  const appState = useRef(AppState.currentState);
  const isInitializedRef = useRef(false);

  /**
   * Handle deep linking navigation based on notification data
   */
  const handleNotificationNavigation = (data: NotificationPayload) => {
    console.log('[useNotifications] Handling notification deep link:', data);

    if (!data.screen) {
      console.log('[useNotifications] No screen specified in notification');
      return;
    }

    // Navigate to the specified screen with parameters
    const navigationParams: any = {};
    if (data.incidentId) {
      navigationParams.incidentId = data.incidentId;
    }
    if (data.latitude && data.longitude) {
      navigationParams.latitude = data.latitude;
      navigationParams.longitude = data.longitude;
    }

    // Delay navigation to ensure the app is fully ready
    setTimeout(() => {
      if (data.screen) {
        // Cast screen to keyof MainStackParamList since we validate it's not undefined
        navigate(data.screen as any, navigationParams);
        console.log('[useNotifications] Navigated to', data.screen, navigationParams);
      }
    }, 500);
  };

  useEffect(() => {
    const initializeNotifications = async () => {
      if (isInitializedRef.current) {
        console.log('[useNotifications] Already initialized');
        return;
      }

      try {
        console.log('[useNotifications] Starting initialization...');

        // Delay initialization to ensure activity is ready
        // This prevents the "not attached to activity" error on Android
        await new Promise<void>(resolve => setTimeout(resolve, 500));

        // Initialize Firebase messaging with notification handler
        await NotificationService.initialize((data, title, message) => {
          console.log('[useNotifications] Notification received:', { title, message, data });

          // Handle deep linking if screen is specified
          if (data.screen) {
            handleNotificationNavigation(data);
          }
        });

        // Get current location and register token
        Geolocation.getCurrentPosition(
          async position => {
            const { latitude, longitude } = position.coords;
            const registered = await NotificationService.registerToken(latitude, longitude);
            if (registered) {
              console.log('[useNotifications] Token registered with location');
              isInitializedRef.current = true;
            }
          },
          error => {
            console.error('[useNotifications] Geolocation error:', error);
            // Still mark as initialized even if location fails
            isInitializedRef.current = true;
          },
          { timeout: 15000, enableHighAccuracy: false },
        );
      } catch (error) {
        console.error('[useNotifications] Initialization error:', error);
        isInitializedRef.current = true;
      }
    };

    // Update location when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        if (isInitializedRef.current) {
          Geolocation.getCurrentPosition(
            async position => {
              const { latitude, longitude } = position.coords;
              await NotificationService.updateLocation(latitude, longitude);
              console.log('[useNotifications] Location updated on foreground');
            },
            error => {
              console.error('[useNotifications] Location update error:', error);
            },
            { timeout: 15000, enableHighAccuracy: false },
          );
        }
      }

      appState.current = nextAppState;
    };

    // Initialize on mount
    initializeNotifications();

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup on unmount
    return () => {
      subscription.remove();
      NotificationService.cleanup();
    };
  }, []);

  return {
    // Expose methods if needed
    unregisterNotifications: () => NotificationService.unregisterToken(),
  };
};
