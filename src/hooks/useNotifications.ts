import { useEffect, useRef } from 'react';
import { Toast } from 'react-native-toast-notifications';
import { NotificationService, NotificationPayload } from '@services/NotificationService';
import { UVLocationMonitorService } from '@services/UVLocationMonitorService';
import { navigate } from '../navigation/navigationRef';

export const useNotifications = () => {
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
