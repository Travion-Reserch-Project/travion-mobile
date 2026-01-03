import { BaseApiService } from './BaseApiService';
import { apiClient } from './client';
import type { TravelPreferenceScores, ApiResponse } from '@types';

// Simple Recommendation Request
export interface SimpleRecommendationRequest {
  latitude: number;
  longitude: number;
  preferences?: TravelPreferenceScores;
  max_distance_km?: number;
  top_k?: number;
  outdoor_only?: boolean | null;  // true = outdoor only, false = indoor only, null/undefined = both
  min_match_score?: number;  // Minimum match score threshold (0.0 to 1.0)
}

// Simple Recommendation Location
export interface SimpleRecommendationLocation {
  rank: number;
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  similarity_score: number;
  preference_scores: {
    history: number;
    adventure: number;
    nature: number;
    relaxation: number;
  };
  is_outdoor: boolean;
  description?: string;
}

// Simple Recommendation Response
export interface SimpleRecommendationResponse {
  success: boolean;
  user_location: {
    lat: number;
    lng: number;
  };
  max_distance_km: number;
  total_found: number;
  recommendations: SimpleRecommendationLocation[];
}

// Simple Crowd Prediction Request
export interface SimpleCrowdPredictionRequest {
  location_name: string;
}

// Simple Crowd Prediction Response
export interface SimpleCrowdPredictionResponse {
  location_name: string;
  location_type: string;
  date: string;
  current_time: string;
  crowd_level: number;
  crowd_percentage: number;
  crowd_status: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  recommendation: string;
  optimal_times: Array<{ time: string; crowd: number }>;
  is_poya_day: boolean;
  metadata?: Record<string, any>;
}

// Simple Golden Hour Request
export interface SimpleGoldenHourRequest {
  location_name: string;
}

// Golden Hour Time Window
export interface GoldenHourWindow {
  start: string;
  end: string;
  duration_minutes?: number;
}

// Simple Golden Hour Response
export interface SimpleGoldenHourResponse {
  location_name: string;
  date: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  sunrise: string;
  sunset: string;
  golden_hour_morning: GoldenHourWindow;
  golden_hour_evening: GoldenHourWindow;
  current_lighting: string;
  recommended_time: string;
  tips: string[];
}

// Simple Description Request
export interface SimpleDescriptionRequest {
  location_name: string;
  preference: TravelPreferenceScores;
}

// Simple Description Response
export interface SimpleDescriptionResponse {
  location_name: string;
  preference_scores: TravelPreferenceScores;
  primary_focus: string;
  description: string;
  highlights: string[];
  best_time_to_visit?: string;
  tips: string[];
  related_activities: string[];
}

class AIService extends BaseApiService {
  constructor() {
    super('/ai');
  }

  /**
   * Make public POST request (no auth required)
   * Used for simple APIs that are publicly accessible
   */
  private async publicPost<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return apiClient.post<T>(`${this.baseEndpoint}${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Make public GET request (no auth required)
   */
  private async publicGet<T>(endpoint: string): Promise<ApiResponse<T>> {
    return apiClient.get<T>(`${this.baseEndpoint}${endpoint}`);
  }

  /**
   * Get simple location recommendations based on user location and preferences
   * POST /api/v1/ai/simple/recommend (Public - no auth required)
   */
  async getSimpleRecommendations(
    request: SimpleRecommendationRequest
  ): Promise<SimpleRecommendationResponse> {
    try {
      console.log('AIService.getSimpleRecommendations - Request:', JSON.stringify(request));
      const response = await this.publicPost<SimpleRecommendationResponse>('/simple/recommend', request);
      console.log('AIService.getSimpleRecommendations - Raw response success:', response?.success);
      const result = this.handleApiResponse(response);
      console.log('AIService.getSimpleRecommendations - Processed result:', {
        success: result?.success,
        total_found: result?.total_found,
        recommendations_count: result?.recommendations?.length,
      });
      return result;
    } catch (error: any) {
      console.error('Simple recommendations failed:', error);
      console.error('Error details:', error?.message, error?.code, error?.status);
      throw error;
    }
  }

  /**
   * Get simple crowd prediction by location name
   * POST /api/v1/ai/simple/crowd (Public - no auth required)
   */
  async getSimpleCrowdPrediction(
    locationName: string
  ): Promise<SimpleCrowdPredictionResponse> {
    try {
      const response = await this.publicPost<SimpleCrowdPredictionResponse>(
        '/simple/crowd',
        { location_name: locationName }
      );
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Simple crowd prediction failed:', error);
      throw error;
    }
  }

  /**
   * Get simple golden hour by location name
   * POST /api/v1/ai/simple/golden-hour (Public - no auth required)
   */
  async getSimpleGoldenHour(
    locationName: string
  ): Promise<SimpleGoldenHourResponse> {
    try {
      const response = await this.publicPost<SimpleGoldenHourResponse>(
        '/simple/golden-hour',
        { location_name: locationName }
      );
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Simple golden hour failed:', error);
      throw error;
    }
  }

  /**
   * Get personalized location description
   * POST /api/v1/ai/simple/description (Public - no auth required)
   */
  async getSimpleDescription(
    locationName: string,
    preferences: TravelPreferenceScores
  ): Promise<SimpleDescriptionResponse> {
    try {
      const response = await this.publicPost<SimpleDescriptionResponse>(
        '/simple/description',
        {
          location_name: locationName,
          preference: preferences,
        }
      );
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Simple description failed:', error);
      throw error;
    }
  }

  /**
   * Check AI Engine health status
   * GET /api/v1/ai/health (Public - no auth required)
   */
  async checkHealth(): Promise<{
    status: string;
    version: string;
    components: Record<string, string>;
  }> {
    try {
      const response = await this.publicGet<{
        status: string;
        version: string;
        components: Record<string, string>;
      }>('/health');
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('AI health check failed:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();

