import { PermissionsAndroid, Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import notifee, { AndroidImportance } from '@notifee/react-native';
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

const requestAndroidNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version < 33) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
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
    console.warn('Failed to create notification channel:', error);
  }
};

const requestMessagingPermission = async (): Promise<boolean> => {
  const androidPermissionGranted = await requestAndroidNotificationPermission();

  if (!androidPermissionGranted) {
    return false;
  }

  const messagingInstance = getMessaging(getApp());
  const authStatus = await requestPermission(messagingInstance);

  return (
    authStatus === AuthorizationStatus.AUTHORIZED || authStatus === AuthorizationStatus.PROVISIONAL
  );
};

export const registerBackgroundMessageHandler = () => {
  const messagingInstance = getMessaging(getApp());

  setBackgroundMessageHandler(
    messagingInstance,
    async (_remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      return;
    },
  );
};

export const initializeFirebaseMessaging = async (
  onNotification?: (title: string, message: string) => void,
): Promise<(() => void) | undefined> => {
  const messagingInstance = getMessaging(getApp());
  const hasPermission = await requestMessagingPermission();

  if (!hasPermission) {
    console.warn('Notification permission not granted. FCM token was not requested.');
    return undefined;
  }

  // Create Android notification channel
  await createNotificationChannel();

  const token = await getToken(messagingInstance);
  console.log('FCM token:', token);

  const foregroundUnsubscribe = onMessage(messagingInstance, async remoteMessage => {
    console.log('Foreground FCM message:', remoteMessage.messageId);

    const title = remoteMessage.notification?.title || 'New Message';
    const message = remoteMessage.notification?.body || 'You have a new notification';

    // Display local notification in notification panel
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
      console.warn('Failed to display local notification:', error);
    }

    // Also trigger the toast callback
    if (onNotification) {
      onNotification(title, message);
    }
  });

  const tokenRefreshUnsubscribe = onTokenRefresh(messagingInstance, newToken => {
    console.log('FCM token refreshed:', newToken);
  });

  return () => {
    foregroundUnsubscribe();
    tokenRefreshUnsubscribe();
  };
};
