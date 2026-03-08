import { useEffect, useRef } from 'react';
import { Toast } from 'react-native-toast-notifications';
import { NotificationService, NotificationPayload } from '@services/NotificationService';
import { UVLocationMonitorService } from '@services/UVLocationMonitorService';
import { navigate } from '../navigation/navigationRef';
import { getCurrentPosition } from '@utils/geolocation';

export const useNotifications = () => {
  const isInitializedRef = useRef(false);
  const isTokenRegisteredRef = useRef(false);

  /**
   * Handle deep linking navigation based on notification data
   */
  const handleNotificationNavigation = (data: NotificationPayload) => {
    console.log('[useNotifications] Handling notification deep link:', data);

    if (!data.screen) {
      console.log('[useNotifications] No screen specified in notification');
      return;
    }

    // Map backend screen names to actual navigator screen names
    const screenNameMap: Record<string, string> = {
      Alerts: 'AlertsScreen',
      SafetyAdvisor: 'SafetyAdvisor',
      SunProtection: 'SunProtection',
      MapScreen: 'MapScreen',
    };

    const actualScreenName = screenNameMap[data.screen] || data.screen;

    // Navigate to the specified screen with parameters
    const navigationParams: any = {};
    if (data.incidentId) {
      navigationParams.incidentId = data.incidentId;
    }
    if (data.latitude && data.longitude) {
      navigationParams.latitude = parseFloat(data.latitude as any) || data.latitude;
      navigationParams.longitude = parseFloat(data.longitude as any) || data.longitude;
    }

    // Delay navigation to ensure the app is fully ready
    setTimeout(() => {
      navigate(actualScreenName as any, navigationParams);
      console.log('[useNotifications] Navigated to', actualScreenName, navigationParams);
    }, 500);
  };

  /**
   * Register device token with backend after FCM initialization
   */
  const registerDeviceToken = async () => {
    if (isTokenRegisteredRef.current) {
      console.log('[useNotifications] Token already registered');
      return;
    }

    try {
      // Get user location for token registration
      const position = await getCurrentPosition({
        timeout: 10000,
        enableHighAccuracy: false,
        retryAttempts: 2,
      });

      const { latitude, longitude } = position;

      // Register token with backend
      const success = await NotificationService.registerToken(latitude, longitude);

      if (success) {
        isTokenRegisteredRef.current = true;
        console.log('[useNotifications] ✅ Device token registered with backend');
      } else {
        console.warn('[useNotifications] ⚠️ Failed to register device token with backend');
      }
    } catch (error) {
      console.warn('[useNotifications] Could not register token:', error);
      // Don't throw - notifications can still work locally
    }
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

          // Show toast for foreground notifications
          try {
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
          } catch (toastError) {
            console.warn('[useNotifications] Failed to show toast:', toastError);
          }

          // Handle deep linking if screen is specified
          if (data.screen) {
            handleNotificationNavigation(data);
          }
        });

        isInitializedRef.current = true;

        // Register device token with backend (runs in background)
        registerDeviceToken();

        // Resume UV location monitoring if the user had it enabled
        UVLocationMonitorService.syncWithPreference().catch(err =>
          console.warn('[useNotifications] UV monitor sync failed:', err),
        );
      } catch (error) {
        console.error('[useNotifications] Initialization error:', error);
        isInitializedRef.current = true;
      }
    };

    // Initialize on mount
    initializeNotifications();

    // Cleanup on unmount
    return () => {
      NotificationService.cleanup();
    };
  }, []);

  return {
    // Expose methods if needed
    unregisterNotifications: () => NotificationService.unregisterToken(),
  };
};
