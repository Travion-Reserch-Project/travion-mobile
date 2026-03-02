import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BaseApiService } from './api/BaseApiService';

const DEVICE_TOKEN_KEY = '@device_token';
const NOTIFICATION_PERMISSION_KEY = '@notification_permission';

export interface NotificationPayload {
  type: 'incident_alert' | 'system';
  screen?: string;
  incidentId?: string;
  latitude?: number;
  longitude?: number;
  title?: string;
  body?: string;
}

class NotificationServiceClass extends BaseApiService {
  private fcmToken: string | null = null;
  private notificationListener: (() => void) | null = null;
  private foregroundListener: (() => void) | null = null;

  constructor() {
    super('/push-notifications');
  }

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<boolean> {
    try {
      let hasPermission = false;

      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          // Android 13+ requires explicit permission
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message:
                'Travion needs notification access to alert you about nearby safety incidents.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // Android 12 and below - notifications are enabled by default
          hasPermission = true;
        }
      } else if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        hasPermission =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      }

      // Save permission status
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, hasPermission.toString());

      return hasPermission;
    } catch (error) {
      console.error('[NotificationService] Permission request error:', error);
      return false;
    }
  }

  /**
   * Check if notification permission is granted
   */
  async hasPermission(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
      if (stored !== null) {
        return stored === 'true';
      }

      // Check current permission status
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().hasPermission();
        return (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      }

      // Android - assume granted for versions < 13
      return Platform.Version < 33;
    } catch (error) {
      console.error('[NotificationService] Check permission error:', error);
      return false;
    }
  }

  /**
   * Get or generate FCM token
   */
  async getToken(): Promise<string | null> {
    try {
      // Check if we have permission
      const hasPerms = await this.hasPermission();
      if (!hasPerms) {
        console.log('[NotificationService] No notification permission');
        return null;
      }

      // Get FCM token
      const token = await messaging().getToken();
      console.log('[NotificationService] FCM Token:', token);

      // Save to storage
      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
      this.fcmToken = token;

      return token;
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
      console.log('token', token);
      if (!token) {
        console.log('[NotificationService] No token to register');
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

      console.error('[NotificationService] Token registration failed:', response.error);
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
        return false;
      }

      const response = await this.authenticatedPut('/location', {
        latitude,
        longitude,
      });

      if (response.success) {
        console.log('[NotificationService] Location updated successfully');
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
        return true; // Already unregistered
      }

      const response = await this.authenticatedDelete('/unregister');

      if (response.success) {
        // Clear local storage
        await AsyncStorage.removeItem(DEVICE_TOKEN_KEY);
        this.fcmToken = null;
        console.log('[NotificationService] Token unregistered successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[NotificationService] Unregister token error:', error);
      return false;
    }
  }

  /**
   * Set up notification listeners
   * @param onNotification - Callback when notification is received (foreground)
   * @param onNotificationOpen - Callback when notification is tapped
   */
  setupNotificationListeners(
    onNotification: (data: NotificationPayload) => void,
    onNotificationOpen: (data: NotificationPayload) => void,
  ): void {
    // Clean up existing listeners
    this.cleanup();

    // Handle foreground notifications
    this.foregroundListener = messaging().onMessage(async remoteMessage => {
      console.log('[NotificationService] Foreground notification:', remoteMessage);

      const data = remoteMessage.data as NotificationPayload;

      // Show in-app alert
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'New Alert',
          remoteMessage.notification.body || '',
          [
            {
              text: 'Dismiss',
              style: 'cancel',
            },
            {
              text: 'View',
              onPress: () => onNotificationOpen(data),
            },
          ],
        );
      }

      // Call callback
      onNotification(data);
    });

    // Handle notification opened app (background/quit state)
    this.notificationListener = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[NotificationService] Notification opened app:', remoteMessage);

      if (remoteMessage.data) {
        const data = remoteMessage.data as NotificationPayload;
        onNotificationOpen(data);
      }
    });

    // Check if app was opened by notification (quit state)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('[NotificationService] App opened by notification:', remoteMessage);

          if (remoteMessage.data) {
            const data = remoteMessage.data as NotificationPayload;
            // Delay to ensure navigation is ready
            setTimeout(() => onNotificationOpen(data), 1000);
          }
        }
      });

    // Handle token refresh
    messaging().onTokenRefresh(async token => {
      console.log('[NotificationService] Token refreshed:', token);
      this.fcmToken = token;
      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);

      // Re-register with backend
      // Note: You might want to call registerToken here with current location
    });
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener();
      this.notificationListener = null;
    }
    if (this.foregroundListener) {
      this.foregroundListener();
      this.foregroundListener = null;
    }
  }

  /**
   * Get notification badge count (iOS)
   */
  async getBadgeCount(): Promise<number> {
    if (Platform.OS === 'ios') {
      return await messaging().getBadge();
    }
    return 0;
  }

  /**
   * Set notification badge count (iOS)
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      await messaging().setBadge(count);
    }
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();
