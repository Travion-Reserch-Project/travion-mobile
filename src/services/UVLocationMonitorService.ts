/**
 * UVLocationMonitorService
 *
 * Monitors the user's real-time location and sends a local UV alert notification
 * whenever they move into a high-UV area (UV index >= 6).
 *
 * Design principles:
 *  - Singleton — only one GPS watcher ever runs at a time
 *  - Low accuracy GPS + 500m distanceFilter → minimal battery drain
 *  - 30-minute cooldown between alerts → no notification spam
 *  - No background service / foreground service needed; Notifee fires local
 *    notifications while the app is foregrounded or backgrounded via JS thread
 */

import Geolocation from '@react-native-community/geolocation';
import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '@utils/geolocation';
import { weatherService } from './api/WeatherService';

// ── Constants ─────────────────────────────────────────────────────────────────
const HIGH_UV_ALERTS_KEY = 'HIGH_UV_ALERTS_ENABLED';
const HIGH_UV_THRESHOLD = 6;            // UV 6+ = "High" or worse
const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes between alerts
const DISTANCE_FILTER_M = 500;          // Only trigger callback after moving 500m

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Haversine distance between two GPS coordinates (in metres). */
function haversineMetres(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRiskLabel(uv: number): string {
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

// ── Service ───────────────────────────────────────────────────────────────────

class UVLocationMonitorServiceClass {
  private watchId: number | null = null;
  private lastAlertAt: number = 0;
  private lastChecked: { latitude: number; longitude: number } | null = null;
  private isFetching: boolean = false;

  // ── Public API ──────────────────────────────────────────────────────────────

  get isRunning(): boolean {
    return this.watchId !== null;
  }

  /**
   * Start GPS monitoring.
   * Safe to call multiple times — only one watcher will run.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[UVMonitor] Already running');
      return;
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn('[UVMonitor] Location permission denied — cannot start monitoring');
      return;
    }

    console.log('[UVMonitor] Starting location monitoring');

    // Use Geolocation directly so we can pass distanceFilter (not exposed by wrapper).
    // distanceFilter=500 means the OS only wakes JS when user moves ≥ 500 m.
    this.watchId = Geolocation.watchPosition(
      position => {
        const { latitude, longitude } = position.coords;
        this.onLocationUpdate(latitude, longitude);
      },
      error => {
        console.warn('[UVMonitor] Location error:', error.message);
      },
      {
        enableHighAccuracy: false,  // network/cell location — battery efficient
        timeout: 30_000,
        maximumAge: 300_000,        // 5 min cached position is fine
        distanceFilter: DISTANCE_FILTER_M,
      } as any, // distanceFilter is valid but not in the TS typings
    );
  }

  /** Stop GPS monitoring immediately. */
  stop(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('[UVMonitor] Stopped location monitoring');
    }
  }

  /**
   * Read the stored preference and start/stop accordingly.
   * Call this on app boot so monitoring resumes if the user had it enabled.
   */
  async syncWithPreference(): Promise<void> {
    try {
      const value = await AsyncStorage.getItem(HIGH_UV_ALERTS_KEY);
      const enabled = value === 'true';
      if (enabled && !this.isRunning) {
        await this.start();
      } else if (!enabled && this.isRunning) {
        this.stop();
      }
    } catch (error) {
      console.warn('[UVMonitor] Failed to sync preference:', error);
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private onLocationUpdate(latitude: number, longitude: number): void {
    // Secondary distance guard in case distanceFilter isn't honoured (iOS quirk).
    if (this.lastChecked) {
      const moved = haversineMetres(
        this.lastChecked.latitude, this.lastChecked.longitude,
        latitude, longitude,
      );
      if (moved < DISTANCE_FILTER_M) {
        return;
      }
    }

    this.lastChecked = { latitude, longitude };
    this.checkUVAndAlert(latitude, longitude).catch(err =>
      console.warn('[UVMonitor] checkUVAndAlert error:', err),
    );
  }

  private async checkUVAndAlert(latitude: number, longitude: number): Promise<void> {
    // Skip if a fetch is already in-flight or we're within the cooldown window.
    if (this.isFetching) return;
    if (Date.now() - this.lastAlertAt < ALERT_COOLDOWN_MS) return;

    this.isFetching = true;
    try {
      const response = await weatherService.getWeatherData(latitude, longitude);

      // Normalise across different API response shapes
      const raw = response?.data;
      const uvIndex: number =
        raw?.uvIndex ??
        raw?.uv_index ??
        raw?.data?.uvIndex ??
        raw?.data?.uv_index ??
        0;

      console.log(`[UVMonitor] UV at (${latitude.toFixed(4)}, ${longitude.toFixed(4)}): ${uvIndex}`);

      if (uvIndex >= HIGH_UV_THRESHOLD) {
        const riskLabel = getRiskLabel(uvIndex);
        await this.sendLocalAlert(uvIndex, riskLabel);
        this.lastAlertAt = Date.now();
      }
    } catch (error) {
      // Network or API failure — silently skip; will retry on next location change
      console.warn('[UVMonitor] UV fetch failed:', error);
    } finally {
      this.isFetching = false;
    }
  }

  private async sendLocalAlert(uvIndex: number, riskLevel: string): Promise<void> {
    try {
      await notifee.displayNotification({
        title: `High UV Alert — ${riskLevel} Risk`,
        body: `UV index is ${uvIndex} at your current location. Apply SPF 50+ sunscreen and seek shade.`,
        data: {
          type: 'uv_health_alert',
          screen: 'SafetyAdvisor',
          uvIndex: String(uvIndex),
          riskLevel,
        },
        android: {
          channelId: 'uv_health_alerts',
          pressAction: { id: 'default' },
          // Show as heads-up notification
          importance: 4,
        },
        ios: {
          sound: 'default',
        },
      });
      console.log(`[UVMonitor] Alert fired: UV ${uvIndex} (${riskLevel})`);
    } catch (error) {
      console.warn('[UVMonitor] Failed to display alert:', error);
    }
  }
}

// Export singleton
export const UVLocationMonitorService = new UVLocationMonitorServiceClass();
