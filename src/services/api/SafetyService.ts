import { BaseApiService } from './BaseApiService';

export interface LocationFeatures { //Features extracted from Google Maps for the location, used as input to the ML model
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

export interface SafetyAlert { //This is what UI displays
  id: string;
  title: string;
  description: string;
  level: 'low' | 'medium' | 'high';
  location: string;
  latitude?: number;
  longitude?: number;
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

export interface RiskPrediction { //Raw ML output
  incidentType: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface SafetyPredictionResponse { //Full backend response
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

// This service handles all API calls related to safety predictions and alerts.
export class SafetyService extends BaseApiService {
  constructor() { //Sets base URL: /api/v1/safety
    super('/safety'); // So all calls become: /api/v1/safety/predictions, /api/v1/safety/nearby-incidents, etc.
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
      const response = await this.unauthenticatedPost<SafetyPredictionResponse>('/predictions', { //Sends request to backend: POST /api/v1/safety/predictions
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
      const prediction = await this.getSafetyPredictions(latitude, longitude); //call predictions

      if (prediction && prediction.alerts && prediction.alerts.length > 0) {
        return prediction.alerts; //return alerts if available
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
      const queryParams = new URLSearchParams({ // Sends request to backend: GET /api/v1/safety/nearby-incidents?latitude=..&longitude=..&radius=..&limit=..
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radius.toString(), 
        limit: limit.toString(),
      });

      // Make authenticated GET request to fetch nearby incidents
      const response = await this.authenticatedGet<{ data: SafetyAlert[]; count: number }>(
        `/nearby-incidents?${queryParams.toString()}`,
      );

      // If successful, return the list of nearby incidents
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
  
  // This can be used by the app to check if the backend is reachable and healthy before trying to fetch predictions or alerts. It calls a simple health endpoint on the backend and returns the status.
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
