/**
 * UVLocationMonitorService
 *
 * Monitors the user's real-time location and sends a local UV alert notification
 * whenever they are in — or move into — a moderate-or-worse UV area (UV index >= 3).
 *
 * Design principles:
 *  - Singleton — only one GPS watcher ever runs at a time
 *  - Immediate check on start (current position), then again on every 500m move
 *  - Low-accuracy GPS + distanceFilter → minimal battery drain
 *  - 30-minute cooldown between alerts → no notification spam
 *  - Local Notifee notification (no FCM round-trip needed)
 */

import Geolocation from '@react-native-community/geolocation';
import notifee, { AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '@utils/geolocation';
import { weatherService } from './api/WeatherService';

// ── Constants ─────────────────────────────────────────────────────────────────
const HIGH_UV_ALERTS_KEY = 'HIGH_UV_ALERTS_ENABLED';
/** Trigger from Moderate (UV 3) upward */
const ALERT_UV_THRESHOLD = 3;
/** Minimum minutes between successive alerts */
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
/** Minimum movement (metres) before re-checking UV */
const DISTANCE_FILTER_M = 500;

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

/** Notification body copy matched to risk level */
function getAlertBody(uv: number, riskLevel: string): string {
  if (riskLevel === 'Moderate') {
    return `UV index is ${uv} — Moderate risk. Apply SPF 30+ sunscreen before going outside.`;
  }
  if (riskLevel === 'High') {
    return `UV index is ${uv} — High risk. Apply SPF 50+, wear a hat and seek shade between 11am–3pm.`;
  }
  return `UV index is ${uv} — ${riskLevel} risk. Avoid direct sun, apply SPF 50+ and stay in shade.`;
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
   * Start monitoring.
   * 1. Does an immediate UV check at the current position.
   * 2. Sets up a watcher that re-checks every time the user moves ≥ 500 m.
   * Safe to call multiple times — only one watcher runs.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[UVMonitor] Already running');
      return;
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn('[UVMonitor] Location permission denied');
      return;
    }

    console.log('[UVMonitor] Starting — immediate check + continuous watch');

    // ── 1. Immediate check at current position ──────────────────────────────
    // watchPosition with distanceFilter only fires on movement, so we need a
    // one-shot getCurrentPosition to check the user's current UV right away.
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        this.lastChecked = { latitude, longitude };
        this.checkUVAndAlert(latitude, longitude).catch(err =>
          console.warn('[UVMonitor] Immediate check error:', err),
        );
      },
      err => console.warn('[UVMonitor] Immediate position error:', err.message),
      {
        enableHighAccuracy: false,
        timeout: 20_000,
        maximumAge: 300_000,
      },
    );

    // ── 2. Continuous watcher (fires on significant movement) ───────────────
    this.watchId = Geolocation.watchPosition(
      position => {
        const { latitude, longitude } = position.coords;
        this.onLocationUpdate(latitude, longitude);
      },
      error => {
        console.warn('[UVMonitor] Watch error:', error.message);
      },
      {
        enableHighAccuracy: false,   // cell/WiFi — battery efficient
        timeout: 30_000,
        maximumAge: 300_000,
        distanceFilter: DISTANCE_FILTER_M,
      } as any,
    );
  }

  /** Stop GPS monitoring immediately. */
  stop(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('[UVMonitor] Stopped');
    }
  }

  /**
   * Read stored preference and start/stop accordingly.
   * Call on app boot so monitoring resumes if the user had it enabled.
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
    // Secondary JS-side distance guard (safety net for OS distanceFilter quirks).
    if (this.lastChecked) {
      const moved = haversineMetres(
        this.lastChecked.latitude, this.lastChecked.longitude,
        latitude, longitude,
      );
      if (moved < DISTANCE_FILTER_M) return;
    }

    this.lastChecked = { latitude, longitude };
    this.checkUVAndAlert(latitude, longitude).catch(err =>
      console.warn('[UVMonitor] checkUVAndAlert error:', err),
    );
  }

  private async checkUVAndAlert(latitude: number, longitude: number): Promise<void> {
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

      if (uvIndex >= ALERT_UV_THRESHOLD) {
        const riskLabel = getRiskLabel(uvIndex);
        await this.sendLocalAlert(uvIndex, riskLabel);
        this.lastAlertAt = Date.now();
      }
    } catch (error) {
      console.warn('[UVMonitor] UV fetch failed (will retry on next move):', error);
    } finally {
      this.isFetching = false;
    }
  }

  private async sendLocalAlert(uvIndex: number, riskLevel: string): Promise<void> {
    try {
      await notifee.displayNotification({
        title: `UV Alert — ${riskLevel} Risk`,
        body: getAlertBody(uvIndex, riskLevel),
        data: {
          type: 'uv_health_alert',
          screen: 'SafetyAdvisor',
          uvIndex: String(uvIndex),
          riskLevel,
        },
        android: {
          channelId: 'uv_health_alerts',
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
        },
        ios: {
          sound: 'default',
        },
      });
      console.log(`[UVMonitor] Alert sent — UV ${uvIndex} (${riskLevel})`);
    } catch (error) {
      console.warn('[UVMonitor] Failed to display alert:', error);
    }
  }
}

// Export singleton
export const UVLocationMonitorService = new UVLocationMonitorServiceClass();
