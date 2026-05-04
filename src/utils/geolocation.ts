import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';

// Configure to use Android LocationManager instead of FusedLocationProvider.
// This avoids crashes in Play Services listener cleanup on certain devices/emulators.
Geolocation.setRNConfiguration({
  locationProvider: 'android',
});

// Define types for location coordinates, options, and errors
export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number; // Accuracy in meters
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

//Controls how GPS works
export interface GeolocationOptions {
  timeout?: number; // milliseconds, default 15000
  maximumAge?: number; // milliseconds, default 10000
  enableHighAccuracy?: boolean; // default true
  retryAttempts?: number; // default 2
  retryDelay?: number; // milliseconds, default 1000
}

//Detailed error type for geolocation failures, including code, message, and optional details
export interface GeolocationError {
  code: number;
  message: string;
  details?: string;
}

const DEFAULT_OPTIONS: Required<GeolocationOptions> = {
  timeout: 15000, // 15 seconds
  maximumAge: 0, // force fresh location by default
  enableHighAccuracy: true, // try high accuracy GPS
  retryAttempts: 2, // number of retry attempts if location fails
  retryDelay: 1000, // 1 second
};

/**
 * Request location permissions for Android
 * iOS permissions are handled via Info.plist
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const fineGranted =
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const coarseGranted =
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return fineGranted || coarseGranted;
    }
    // For iOS, assume permission is granted if user hasn't denied in settings
    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Get detailed error message based on error code
 */
const getErrorMessage = (code: number): string => {
  switch (code) {
    case 1:
      return 'Location permission denied. Please enable location access in settings.';
    case 2:
      return 'Location unavailable. Please check your GPS/network connection.';
    case 3:
      return 'Location request timed out. Please try again.';
    default:
      return 'Unable to get location. Please try again.';
  }
};

/**
 * Delay helper for retry logic
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get current position with retry logic and better error handling
 *
 * @param options - Configuration options for geolocation
 * @returns Promise resolving to location coordinates
 * @throws GeolocationError if location cannot be obtained after all retries
 *
 * @example
 * ```typescript
 * try {
 *   const location = await getCurrentPosition({
 *     timeout: 10000,
 *     enableHighAccuracy: true,
 *     retryAttempts: 3
 *   });
 *   console.log(`Lat: ${location.latitude}, Lng: ${location.longitude}`);
 * } catch (error) {
 *   console.error('Location error:', error.message);
 * }
 * ```
 */
export const getCurrentPosition = async (
  options: GeolocationOptions = {},
): Promise<LocationCoords> => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Request permissions first
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw {
      code: 1,
      message: getErrorMessage(1),
      details: 'Location permission was not granted',
    } as GeolocationError;
  }

  let lastError: GeolocationError | null = null;

  // Attempt to get position with retries
  for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
    const useHighAccuracy = attempt === 0 ? config.enableHighAccuracy : false;
    const attemptTimeout = useHighAccuracy ? config.timeout : Math.max(config.timeout, 20000);
    const attemptMaximumAge = useHighAccuracy ? config.maximumAge : 0;

    try {
      const position = await new Promise<LocationCoords>((resolve, reject) => { // Wrap Geolocation.getCurrentPosition in a promise for easier async/await usage
        console.log(
          `[Geolocation] Attempt ${attempt + 1}/${config.retryAttempts + 1} (${
            useHighAccuracy ? 'high' : 'low'
          } accuracy)`,
        );

        Geolocation.getCurrentPosition( // Call the geolocation API
          pos => {
            console.log('[Geolocation] Success:', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });

            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              altitudeAccuracy: pos.coords.altitudeAccuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
            });
          },
          error => {
            console.log('[Geolocation] Error:', {
              code: error.code,
              message: error.message,
              attempt: attempt + 1,
            });

            reject({
              code: error.code,
              message: getErrorMessage(error.code),
              details: error.message,
            } as GeolocationError);
          },
          {
            timeout: attemptTimeout,
            maximumAge: attemptMaximumAge,
            enableHighAccuracy: useHighAccuracy,
          },
        );
      });

      return position;
    } catch (error) {
      lastError = error as GeolocationError;

      // Permission errors won't recover with retries
      if (lastError.code === 1) {
        break;
      }

      // If this isn't the last attempt, wait before retrying
      if (attempt < config.retryAttempts) {
        console.log(`[Geolocation] Retrying in ${config.retryDelay}ms...`);
        await delay(config.retryDelay);
      }
    }
  }

  // If we get here, all attempts failed
  console.error('[Geolocation] All attempts failed:', lastError);
  throw lastError;
};

/**
 * Watch position changes
 * Returns a watchId that can be used to clear the watch
 *
 * @param onSuccess - Callback for successful position updates
 * @param onError - Callback for errors
 * @param options - Configuration options
 * @returns watchId number to clear the watch later
 *
 * @example
 * ```typescript
 * const watchId = watchPosition(
 *   (location) => console.log('Position:', location),
 *   (error) => console.error('Error:', error),
 *   { enableHighAccuracy: true }
 * );
 *
 * // Later, to stop watching:
 * clearWatch(watchId);
 * ```
 */
export const watchPosition = (
  onSuccess: (location: LocationCoords) => void,
  onError: (error: GeolocationError) => void,
  options: Omit<GeolocationOptions, 'retryAttempts' | 'retryDelay'> = {},
): number => {
  const config = {
    timeout: options.timeout || DEFAULT_OPTIONS.timeout,
    maximumAge: options.maximumAge || DEFAULT_OPTIONS.maximumAge,
    enableHighAccuracy: options.enableHighAccuracy ?? DEFAULT_OPTIONS.enableHighAccuracy,
  };

  return Geolocation.watchPosition(
    pos => {
      onSuccess({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
      });
    },
    error => {
      onError({
        code: error.code,
        message: getErrorMessage(error.code),
        details: error.message,
      });
    },
    config,
  );
};

/**
 * Clear a position watch
 * @param watchId - The watch ID returned from watchPosition
 */
export const clearWatch = (watchId: number): void => {
  Geolocation.clearWatch(watchId);
};
