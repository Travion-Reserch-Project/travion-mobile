import {
  NotificationPayload,
  initializeFirebaseMessaging as firebaseMessagingInit,
  registerBackgroundMessageHandler as registerBackgroundHandler,
} from './NotificationService';

/**
 * Re-export from NotificationService for backward compatibility
 */
export const initializeFirebaseMessaging = async (
  onNotification?: (data: NotificationPayload, title: string, message: string) => void,
): Promise<void> => {
  await firebaseMessagingInit(onNotification);
};

export const registerBackgroundMessageHandler = () => {
  registerBackgroundHandler();
};

export type { NotificationPayload } from './NotificationService';
