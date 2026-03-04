import { PermissionsAndroid, Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import notifee, { AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { BaseApiService } from './api/BaseApiService';

const DEVICE_TOKEN_KEY = '@device_token';

export interface NotificationPayload {
  type: 'incident_alert' | 'system';
  screen?: string;
  incidentId?: string;
  latitude?: number;
  longitude?: number;
  title?: string;
  body?: string;
}

const requestAndroidNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version < 33) {
    return true;
  }

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('[NotificationService] Android permission error:', error);
    return false;
  }
};

const createNotificationChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
  } catch (error) {
    console.warn('[NotificationService] Failed to create notification channel:', error);
  }
};

const requestMessagingPermission = async (): Promise<boolean> => {
  try {
    const androidPermissionGranted = await requestAndroidNotificationPermission();

    if (!androidPermissionGranted) {
      console.warn('[NotificationService] Android notification permission denied');
      return false;
    }

    const messagingInstance = getMessaging(getApp());
    const authStatus = await requestPermission(messagingInstance);

    return (
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.error('[NotificationService] Request permission error:', error);
    return false;
  }
};

class NotificationServiceClass extends BaseApiService {
  private fcmToken: string | null = null;
  private isInitialized: boolean = false;
  private notificationCallback:
    | ((data: NotificationPayload, title: string, message: string) => void)
    | undefined;
  private unsubscribeFunctions: Array<() => void> = [];

  constructor() {
    super('/push-notifications');
  }

  /**
   * Initialize Firebase messaging and notification handling
   */
  async initialize(
    onNotification?: (data: NotificationPayload, title: string, message: string) => void,
  ): Promise<void> {
    if (this.isInitialized) {
      console.log('[NotificationService] Already initialized');
      return;
    }

    try {
      // Store the callback for later use
      this.notificationCallback = onNotification;

      const messagingInstance = getMessaging(getApp());

      // Request permissions
      const hasPermission = await requestMessagingPermission();
      if (!hasPermission) {
        console.warn('[NotificationService] Notification permission not granted.');
        return;
      }

      // Create Android notification channel
      await createNotificationChannel();

      // Get FCM token (same as firebaseMessaging.ts)
      const token = await getToken(messagingInstance);
      if (token) {
        this.fcmToken = token;
        console.log('[NotificationService] FCM token:', token);
        await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
      }

      // Setup foreground message handler
      const foregroundUnsubscribe = onMessage(messagingInstance, async remoteMessage => {
        console.log('[NotificationService] Foreground message:', remoteMessage.messageId);

        const title = remoteMessage.notification?.title || 'New Message';
        const message = remoteMessage.notification?.body || 'You have a new notification';
        const notificationData: NotificationPayload = {
          type: (remoteMessage.data?.type as 'incident_alert' | 'system') || 'system',
          screen: remoteMessage.data?.screen as string | undefined,
          incidentId: remoteMessage.data?.incidentId as string | undefined,
          latitude: remoteMessage.data?.latitude
            ? parseFloat(remoteMessage.data.latitude as string)
            : undefined,
          longitude: remoteMessage.data?.longitude
            ? parseFloat(remoteMessage.data.longitude as string)
            : undefined,
          title,
          body: message,
        };

        // Display local notification
        try {
          await notifee.displayNotification({
            title,
            body: message,
            data: {
              type: notificationData.type || 'system',
              screen: notificationData.screen || '',
              incidentId: notificationData.incidentId || '',
              latitude: notificationData.latitude?.toString() || '',
              longitude: notificationData.longitude?.toString() || '',
              title: notificationData.title || '',
              body: notificationData.body || '',
            },
            android: {
              channelId: 'default',
              pressAction: {
                id: 'default',
              },
            },
            ios: {
              sound: 'default',
            },
          });
        } catch (error) {
          console.warn('[NotificationService] Failed to display notification:', error);
        }

        // Trigger callback with full data for deep linking
        if (onNotification) {
          onNotification(notificationData, title, message);
        }
      });

      // Setup token refresh handler
      const tokenRefreshUnsubscribe = onTokenRefresh(messagingInstance, async newToken => {
        console.log('[NotificationService] Token refreshed');
        this.fcmToken = newToken;
        await AsyncStorage.setItem(DEVICE_TOKEN_KEY, newToken);
      });

      // Setup background message handler
      setBackgroundMessageHandler(
        messagingInstance,
        async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
          // Handle background messages
          console.log('[NotificationService] Background message received');
          const title = remoteMessage.notification?.title || 'New Message';
          const message = remoteMessage.notification?.body || 'You have a new notification';

          try {
            await notifee.displayNotification({
              title,
              body: message,
              android: {
                channelId: 'default',
                pressAction: {
                  id: 'default',
                },
              },
              ios: {
                sound: 'default',
              },
            });
          } catch (error) {
            console.warn('[NotificationService] Failed to display background notification:', error);
          }
          return;
        },
      );

      // Setup Notifee press handler (when user taps notification from notification center)
      const notifeeUnsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
        console.log('[NotificationService] Notifee event:', type);

        // Handle notification press
        const data = detail.notification?.data as NotificationPayload | undefined;
        if (data && onNotification) {
          const title = detail.notification?.title || 'New Message';
          const message = detail.notification?.body || 'You have a new notification';
          onNotification(data, title, message);
        }
      });

      // Store unsubscribe function for cleanup
      this.unsubscribeFunctions = [
        foregroundUnsubscribe,
        tokenRefreshUnsubscribe,
        notifeeUnsubscribe,
      ];
      this.isInitialized = true;
      console.log('[NotificationService] Initialized successfully');
    } catch (error) {
      // Mark as initialized even on error to prevent retry loops
      this.isInitialized = true;
      console.error('[NotificationService] Initialize error:', error);
    }
  }

  /**
   * Get FCM token (simplified - matches firebaseMessaging.ts pattern)
   */
  async getToken(): Promise<string | null> {
    try {
      if (this.fcmToken) {
        return this.fcmToken;
      }

      const stored = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
      if (stored) {
        this.fcmToken = stored;
        return stored;
      }

      const messagingInstance = getMessaging(getApp());
      const token = await getToken(messagingInstance);

      if (token) {
        this.fcmToken = token;
        await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
        console.log('[NotificationService] Token retrieved successfully');
      }

      return token || null;
    } catch (error) {
      console.error('[NotificationService] Get token error:', error);
      return null;
    }
  }

  /**
   * Register device token with backend
   */
  async registerToken(latitude: number, longitude: number): Promise<boolean> {
    try {
      const token = this.fcmToken || (await this.getToken());
      if (!token) {
        console.warn('[NotificationService] No token to register');
        return false;
      }

      const response = await this.authenticatedPost('/register', {
        deviceToken: token,
        platform: Platform.OS,
        location: {
          latitude,
          longitude,
        },
      });

      if (response.success) {
        console.log('[NotificationService] Token registered successfully');
        return true;
      }

      console.error('[NotificationService] Register failed:', response.error);
      return false;
    } catch (error) {
      console.error('[NotificationService] Register token error:', error);
      return false;
    }
  }

  /**
   * Update device location
   */
  async updateLocation(latitude: number, longitude: number): Promise<boolean> {
    try {
      const token = this.fcmToken || (await AsyncStorage.getItem(DEVICE_TOKEN_KEY));
      if (!token) {
        console.warn('[NotificationService] No token available for location update');
        return false;
      }

      const response = await this.authenticatedPut('/location', {
        latitude,
        longitude,
      });

      if (response.success) {
        console.log('[NotificationService] Location updated');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[NotificationService] Update location error:', error);
      return false;
    }
  }

  /**
   * Unregister device token
   */
  async unregisterToken(): Promise<boolean> {
    try {
      const token = this.fcmToken || (await AsyncStorage.getItem(DEVICE_TOKEN_KEY));
      if (!token) {
        return true;
      }

      const response = await this.authenticatedDelete('/unregister');

      if (response.success) {
        await AsyncStorage.removeItem(DEVICE_TOKEN_KEY);
        this.fcmToken = null;
        console.log('[NotificationService] Token unregistered');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[NotificationService] Unregister error:', error);
      return false;
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    this.unsubscribeFunctions.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('[NotificationService] Error during cleanup:', error);
      }
    });
    this.unsubscribeFunctions = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();

/**
 * Initialize Firebase messaging (for app startup)
 */
export const initializeFirebaseMessaging = async (
  onNotification?: (data: NotificationPayload, title: string, message: string) => void,
): Promise<void> => {
  await NotificationService.initialize(onNotification);
};

/**
 * Register background message handler (already set in initialize)
 */
export const registerBackgroundMessageHandler = () => {
  try {
    // Background handler is already configured in NotificationService.initialize()
    // This function is kept for backward compatibility
    console.log('[NotificationService] Background handler already configured in initialize()');
  } catch (error) {
    console.warn('[NotificationService] Background handler check error:', error);
  }
};
