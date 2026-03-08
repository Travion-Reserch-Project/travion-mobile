import BackgroundService from 'react-native-background-actions';
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';
import { NotificationService } from './NotificationService';

/**
 * BackgroundLocationService
 *
 * Uses react-native-background-actions to run a persistent background task
 * that periodically gets the user's GPS location and sends it to the backend.
 *
 * The backend then checks UV risk and sends push notifications via Firebase
 * if the user is in a high or very high UV risk zone.
 */

const LOCATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Sleep helper
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Request location permissions for Android
 * Note: We only request foreground location here.
 * Background location is handled by the foreground service declaration
 * in AndroidManifest.xml (FOREGROUND_SERVICE_LOCATION).
 * ACCESS_BACKGROUND_LOCATION must NOT be requested at the same time
 * as fine location on Android 11+ — it causes a crash.
 */
const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    // Request fine location only
    const fineLocation = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Travion needs access to your location to provide real-time UV health alerts.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    if (fineLocation !== PermissionsAndroid.RESULTS.GRANTED) {
      console.warn('[BackgroundLocation] Fine location permission denied');
      return false;
    }

    return true;
  } catch (err) {
    console.error('[BackgroundLocation] Permission error:', err);
    return false;
  }
};

/**
 * Get current position as a promise with fallback
 */
const getPosition = (enableHighAccuracy: boolean): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => reject(error),
      {
        enableHighAccuracy,
        timeout: 30000,
        maximumAge: 60000,
        forceRequestLocation: true,
        forceLocationManager: !enableHighAccuracy,
      },
    );
  });
};

const getCurrentPosition = async (): Promise<{ latitude: number; longitude: number }> => {
  try {
    return await getPosition(true);
  } catch (highAccuracyError: any) {
    console.warn('[BackgroundLocation] High accuracy failed, trying low accuracy:', highAccuracyError.message);
    return await getPosition(false);
  }
};

/**
 * The background task function — runs in a loop
 * Gets GPS location and sends it to the backend via NotificationService
 */
const backgroundTask = async (taskDataArguments: any) => {
  const { delay } = taskDataArguments;

  // Loop forever while the background service is active
  while (BackgroundService.isRunning()) {
    try {
      console.log('[BackgroundLocation] Getting current location...');

      const { latitude, longitude } = await getCurrentPosition();

      console.log(
        `[BackgroundLocation] Location obtained: lat=${latitude.toFixed(
          4,
        )}, lon=${longitude.toFixed(4)}`,
      );

      // Send location to backend — this triggers UV risk check on the server side
      const success = await NotificationService.updateLocation(latitude, longitude);

      if (success) {
        console.log('[BackgroundLocation] Location sent to backend successfully');
      } else {
        console.warn('[BackgroundLocation] Failed to send location to backend');
      }
    } catch (error: any) {
      console.error('[BackgroundLocation] Background task error:', error.message);
    }

    // Wait for the configured interval before next location update
    await sleep(delay || LOCATION_INTERVAL_MS);
  }
};

/**
 * Background task configuration
 */
const backgroundOptions = {
  taskName: 'UVHealthMonitor',
  taskTitle: 'UV Health Monitor',
  taskDesc: 'Monitoring your location for UV health alerts',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#FF6B00',
  linkingURI: 'travion://', // Deep link back to app
  parameters: {
    delay: LOCATION_INTERVAL_MS,
  },
  // Android specific
  foregroundServiceType: 'location' as const,
};

/**
 * Start the background location service
 */
export const startBackgroundLocationService = async (): Promise<boolean> => {
  try {
    // Check if already running
    if (BackgroundService.isRunning()) {
      console.log('[BackgroundLocation] Service already running');
      return true;
    }

    // Request location permissions first
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn('[BackgroundLocation] Location permission not granted');
      return false;
    }

    console.log('[BackgroundLocation] Starting background location service...');

    await BackgroundService.start(backgroundTask, backgroundOptions);

    console.log('[BackgroundLocation] ✅ Background location service started');
    return true;
  } catch (error: any) {
    console.error('[BackgroundLocation] Failed to start background service:', error.message);
    return false;
  }
};

/**
 * Stop the background location service
 */
export const stopBackgroundLocationService = async (): Promise<void> => {
  try {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
      console.log('[BackgroundLocation] ✅ Background location service stopped');
    }
  } catch (error: any) {
    console.error('[BackgroundLocation] Failed to stop background service:', error.message);
  }
};

/**
 * Check if background location service is running
 */
export const isBackgroundLocationRunning = (): boolean => {
  return BackgroundService.isRunning();
};
