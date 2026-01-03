import { useState, useEffect, useCallback } from 'react';
import SafetyService, { SafetyAlert } from '@services/api/SafetyService';

interface UseSafetyAlertsOptions {
  lat: number;
  lon: number;
  user_location?: string;
  is_beach?: number;
  is_crowded?: number;
  is_tourist_place?: number;
  is_transit?: number;
  police_nearby?: number;
  area_cluster?: number;
  autoFetch?: boolean;
}

interface UseSafetyAlertsReturn {
  alerts: SafetyAlert[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSafetyAlerts = (options: UseSafetyAlertsOptions): UseSafetyAlertsReturn => {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedAlerts = await SafetyService.getSafetyAlerts(options.lat, options.lon);

      setAlerts(fetchedAlerts);
    } catch (err: any) {
      console.error('Error fetching safety alerts:', err);
      setError(err.message || 'Failed to fetch safety alerts');

      // Set fallback alerts
      setAlerts([
        {
          id: '1',
          title: 'Safe Area',
          description: 'Unable to fetch predictions. Showing default safe status.',
          level: 'low',
          location: options.user_location || 'Current Location',
          incidentType: 'Scam',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [options.lat, options.lon, options.user_location]);

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchAlerts();
    }
  }, [fetchAlerts, options.autoFetch, options.lat, options.lon]);

  return {
    alerts,
    loading,
    error,
    refetch: fetchAlerts,
  };
};

export const useQuickSafetyAlerts = (lat: number, lon: number): UseSafetyAlertsReturn => {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedAlerts = await SafetyService.getSafetyPredictions(lat, lon);
      setAlerts(fetchedAlerts ?? []);
    } catch (err: any) {
      console.error('Error fetching quick safety alerts:', err);
      setError(err.message || 'Failed to fetch safety alerts');

      setAlerts([
        {
          id: '1',
          title: 'Safe Area',
          description: 'Unable to fetch predictions.',
          level: 'low',
          location: `${lat}, ${lon}`,
          incidentType: 'Scam',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    if (lat && lon) {
      fetchAlerts();
    }
  }, [fetchAlerts, lat, lon]);

  return {
    alerts,
    loading,
    error,
    refetch: fetchAlerts,
  };
};
