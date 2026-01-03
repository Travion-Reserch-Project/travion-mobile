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
    | 'Extortion';
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
