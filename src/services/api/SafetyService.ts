import { BaseApiService } from './BaseApiService';

export interface LocationFeatures {
  area_cluster: number;
  is_beach: number;
  is_crowded: number;
  is_tourist_place: number;
  is_transit: number;
  hour: number;
  day_of_week: number;
  is_weekend: number;
  police_nearby: number;
}

export interface SafetyAlert {
  id: string;
  title: string;
  description: string;
  level: 'low' | 'medium' | 'high';
  location: string;
  incidentType:
    | 'Scam'
    | 'Pickpocket'
    | 'Theft'
    | 'Money Theft'
    | 'Harassment'
    | 'Bag Snatching'
    | 'Extortion'
    | 'Other';
}

export interface RiskPrediction {
  incidentType: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface SafetyPredictionResponse {
  success: boolean;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    locationName: string;
  };
  features: LocationFeatures;
  predictions: RiskPrediction[];
  alerts: SafetyAlert[];
  timestamp: string;
  error?: string;
}

export class SafetyService extends BaseApiService {
  constructor() {
    super('/safety');
  }

  /**
   * Get safety predictions using lat/lon
   * Backend automatically fetches features from Google Maps and calls ML model
   * Public endpoint - no authentication required
   */
  async getSafetyPredictions(
    latitude: number,
    longitude: number,
  ): Promise<SafetyPredictionResponse | null> {
    try {
      const response = await this.unauthenticatedPost<SafetyPredictionResponse>('/predictions', {
        latitude,
        longitude,
      });

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Safety predictions error:', error);
      return null;
    }
  }

  /**
   * Get safety alerts from predictions (for backward compatibility)
   */
  async getSafetyAlerts(latitude: number, longitude: number): Promise<SafetyAlert[]> {
    try {
      const prediction = await this.getSafetyPredictions(latitude, longitude);

      if (prediction && prediction.alerts && prediction.alerts.length > 0) {
        return prediction.alerts;
      }

      // Return fallback alerts on error
      return this.getFallbackAlerts('Current Location');
    } catch (error) {
      console.error('Safety alerts error:', error);
      return this.getFallbackAlerts('Current Location');
    }
  }

  /**
   * Fallback alerts when API is unavailable
   */
  private getFallbackAlerts(location: string): SafetyAlert[] {
    return [
      {
        id: '1',
        title: 'Loading Safety Data',
        description: 'Connecting to safety prediction service. Please wait...',
        level: 'low',
        location,
        incidentType: 'Scam',
      },
    ];
  }

  /**
   * Get nearby user-reported incidents
   * Returns real incidents reported by other users in the area
   * Requires authentication
   */
  async getNearbyIncidents(
    latitude: number,
    longitude: number,
    radius: number = 5,
    limit: number = 20,
  ): Promise<SafetyAlert[]> {
    try {
      // Build query string
      const queryParams = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radius.toString(),
        limit: limit.toString(),
      });

      const response = await this.authenticatedGet<{ data: SafetyAlert[]; count: number }>(
        `/nearby-incidents?${queryParams.toString()}`,
      );

      if (response.success && response.data?.data) {
        console.log(`[SafetyService] Received ${response.data.count} nearby incidents`);
        return response.data.data;
      }

      return [];
    } catch (error) {
      console.error('[SafetyService] Error fetching nearby incidents:', error);
      return [];
    }
  }

  /**
   * Check health of safety service
   */
  async checkHealth(): Promise<{ status: string; details?: any }> {
    try {
      const response = await this.authenticatedGet<any>('/health');
      return response.data || { status: 'unknown' };
    } catch {
      return { status: 'unhealthy' };
    }
  }
}

export default new SafetyService();
