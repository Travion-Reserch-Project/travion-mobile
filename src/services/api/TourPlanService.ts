/**
 * Tour Plan Service
 * Service for AI-powered tour plan generation and management
 */

import { BaseApiService } from './BaseApiService';
import type { ApiResponse } from '@types';

// ============================================================================
// TYPES
// ============================================================================

export interface SelectedLocation {
  name: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  distance_km?: number;
}

export interface ItinerarySlot {
  time: string;
  location: string;
  activity: string;
  duration_minutes: number;
  crowd_prediction: number;
  lighting_quality: string;
  notes?: string;
  day?: number;
  order?: number;
  icon?: string;
  highlight?: boolean;
  ai_insight?: string;
}

export interface TourPlanMetadata {
  match_score: number;
  total_days: number;
  total_locations: number;
  golden_hour_optimized: boolean;
  crowd_optimized: boolean;
  event_aware: boolean;
}

export interface ConstraintViolation {
  constraint_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

export interface GeneratePlanRequest {
  selectedLocations: SelectedLocation[];
  startDate: string;
  endDate: string;
  preferences?: string[];
  message?: string;
}

export interface RefinePlanRequest {
  threadId: string;
  message: string;
  selectedLocations: SelectedLocation[];
  startDate: string;
  endDate: string;
  preferences?: string[];
}

export interface AcceptPlanRequest {
  threadId: string;
  title: string;
  description?: string;
  itinerary: ItinerarySlot[];
  metadata?: TourPlanMetadata;
}

export interface TourPlanResponse {
  threadId: string;
  response: string;
  itinerary: ItinerarySlot[];
  metadata: TourPlanMetadata;
  constraints?: ConstraintViolation[];
  warnings?: string[];
  tips?: string[];
}

export interface AcceptPlanResponse {
  tripId: string;
  message: string;
}

// ============================================================================
// SERVICE
// ============================================================================

class TourPlanService extends BaseApiService {
  constructor() {
    super('/tour-plan');
  }

  /**
   * Generate an AI-powered tour plan
   * POST /api/v1/tour-plan/generate
   */
  async generatePlan(request: GeneratePlanRequest): Promise<TourPlanResponse> {
    try {
      console.log('TourPlanService.generatePlan - Generating plan for', request.selectedLocations.length, 'locations');
      
      const response = await this.authenticatedPost<TourPlanResponse>('/generate', request);
      const result = this.handleApiResponse(response);
      
      console.log('TourPlanService.generatePlan - Plan generated with thread:', result.threadId);
      return result;
    } catch (error: any) {
      console.error('Tour plan generation failed:', error);
      throw error;
    }
  }

  /**
   * Refine an existing tour plan based on user feedback
   * POST /api/v1/tour-plan/refine
   */
  async refinePlan(request: RefinePlanRequest): Promise<TourPlanResponse> {
    try {
      console.log('TourPlanService.refinePlan - Refining plan with thread:', request.threadId);
      
      const response = await this.authenticatedPost<TourPlanResponse>('/refine', request);
      const result = this.handleApiResponse(response);
      
      console.log('TourPlanService.refinePlan - Plan refined successfully');
      return result;
    } catch (error: any) {
      console.error('Tour plan refinement failed:', error);
      throw error;
    }
  }

  /**
   * Accept and save a generated tour plan
   * POST /api/v1/tour-plan/accept
   */
  async acceptPlan(request: AcceptPlanRequest): Promise<AcceptPlanResponse> {
    try {
      console.log('TourPlanService.acceptPlan - Accepting plan from thread:', request.threadId);
      
      const response = await this.authenticatedPost<AcceptPlanResponse>('/accept', request);
      const result = this.handleApiResponse(response);
      
      console.log('TourPlanService.acceptPlan - Plan saved with trip ID:', result.tripId);
      return result;
    } catch (error: any) {
      console.error('Tour plan acceptance failed:', error);
      throw error;
    }
  }

  /**
   * Get tour plan session details
   * GET /api/v1/tour-plan/session/:threadId
   */
  async getSession(threadId: string): Promise<{ threadId: string; status: string; message: string }> {
    try {
      const response = await this.authenticatedGet<{ threadId: string; status: string; message: string }>(`/session/${threadId}`);
      const result = this.handleApiResponse(response);
      return result;
    } catch (error: any) {
      console.error('Get session failed:', error);
      throw error;
    }
  }
}

export const tourPlanService = new TourPlanService();
