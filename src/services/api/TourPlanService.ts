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
  cultural_tip?: string;
  ethical_note?: string;
  best_photo_time?: string;
}

export interface TourPlanMetadata {
  match_score: number;
  total_days: number;
  total_locations: number;
  golden_hour_optimized: boolean;
  crowd_optimized: boolean;
  event_aware: boolean;
  preference_match_explanation?: string;
}

export interface StepResult {
  node: string;
  status: string;
  summary: string;
  duration_ms: number;
}

export interface ClarificationOption {
  label: string;
  description: string;
  recommended: boolean;
}

export interface ClarificationQuestion {
  question: string;
  options: ClarificationOption[];
  context: string;
  type: 'single_select' | 'multi_select';
}

export interface CulturalTip {
  location: string;
  tip: string;
  category: 'cultural' | 'ethical' | 'safety' | 'etiquette';
}

export interface EventInfo {
  date: string;
  name: string;
  type: string; // 'poya' | 'holiday' | 'festival' | 'school_holiday'
  impact: string;
  warnings: string[];
}

export interface ConstraintViolation {
  constraint_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

// Map-ready structured itinerary types
export interface RouteCoordinate {
  lat: number;
  lng: number;
  location_name: string;
  sequence_id: number;
}

export interface ContextualNote {
  sequence_id: number;
  location_name: string;
  note_type: string; // "poya_warning" | "weather_alert" | "safety_alert" | "crowd_warning"
  message: string;
  severity: string; // "info" | "warning" | "critical"
}

export interface FinalItineraryStop {
  sequence_id: number;
  day: number;
  time: string;
  location: string;
  activity: string;
  duration_minutes: number;
  coordinates: { lat: number; lng: number };
  crowd_prediction: number;
  lighting_quality: string;
  weather_summary?: string;
  icon?: string;
  highlight?: boolean;
  ai_insight?: string;
  cultural_tip?: string;
  ethical_note?: string;
  best_photo_time?: string;
  notes?: string;
  // ── Visual Hierarchy Fields ──
  visual_hierarchy?: number;
  best_for_photos?: boolean;
  photo_urls?: string[];
}

export interface FinalItinerary {
  stops: FinalItineraryStop[];
  route_polyline: RouteCoordinate[];
  contextual_notes: ContextualNote[];
  total_distance_km: number;
  total_days: number;
  summary: string;
  warnings: string[];
  tips: string[];
}

// Hotel/Restaurant search types
export interface HotelSearchResult {
  name: string;
  type: string; // "hotel" | "restaurant" | "bar"
  price_range?: string;
  rating?: number;
  url?: string;
  description: string;
  distance_from_location?: string;
  location_name: string;
}

export interface HotelSearchResponse {
  success: boolean;
  query: string;
  search_type: string;
  location: string;
  results: HotelSearchResult[];
  total_results: number;
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

// ── HITL Selection & Weather Interrupt Types ──

export interface SelectionCard {
  card_id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  image_url?: string;
  photo_urls?: string[];
  rating?: number;
  price_range?: string;
  vibe_match_score?: number;
  description?: string;
  tags?: string[];
  distance_km?: number;
}

export interface SearchCandidate {
  id: string;
  name: string;
  type: string;
  description: string;
  price_range?: string;
  rating?: number;
  opening_hours?: string;
  lat?: number;
  lng?: number;
  url?: string;
  location_name: string;
  vibe_match_score?: number;
  photo_urls?: string[];
}

export interface WeatherPromptOption {
  id: string;
  label: string;
  description: string;
}

export interface ResumeSelectionRequest {
  threadId: string;
  selectedCandidateId: string;
}

export interface ResumeWeatherRequest {
  threadId: string;
  userWeatherChoice: 'switch_indoor' | 'reschedule' | 'keep';
}

export interface TourPlanResponse {
  threadId: string;
  response: string;
  itinerary: ItinerarySlot[];
  metadata: TourPlanMetadata;
  constraints?: ConstraintViolation[];
  warnings?: string[];
  tips?: string[];
  stepResults?: StepResult[];
  clarificationQuestion?: ClarificationQuestion;
  culturalTips?: CulturalTip[];
  events?: EventInfo[];
  finalItinerary?: FinalItinerary;
  weatherData?: Record<string, any>;
  interruptReason?: string;
  restaurantRecommendations?: any[];
  accommodationRecommendations?: any[];
  // ── HITL Interrupt Fields ──
  pendingUserSelection?: boolean;
  selectionCards?: SelectionCard[];
  searchCandidates?: SearchCandidate[];
  mcpSearchMetadata?: Record<string, any>;
  weatherInterrupt?: boolean;
  weatherPromptMessage?: string;
  weatherPromptOptions?: WeatherPromptOption[];
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
      console.log(
        'TourPlanService.generatePlan - Generating plan for',
        request.selectedLocations.length,
        'locations',
      );

      const response = await this.authenticatedPost<TourPlanResponse>('/generate', request, {
        timeout: 180000,
        retries: 0,
      });
      const result = this.handleApiResponse(response);

      // Backend wraps response in { success, data }, extract the inner data
      const planData: TourPlanResponse = result.data || result;

      console.log('TourPlanService.generatePlan - Plan generated with thread:', planData.threadId);
      return planData;
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

      const response = await this.authenticatedPost<TourPlanResponse>('/refine', request, {
        timeout: 180000,
        retries: 0,
      });
      const result = this.handleApiResponse(response);

      // Backend wraps response in { success, data }, extract the inner data
      const planData: TourPlanResponse = result.data || result;

      console.log('TourPlanService.refinePlan - Plan refined successfully');
      return planData;
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

      // Backend wraps response in { success, data }, extract the inner data
      const planData: AcceptPlanResponse = result.data || result;

      console.log('TourPlanService.acceptPlan - Plan saved with trip ID:', planData.tripId);
      return planData;
    } catch (error: any) {
      console.error('Tour plan acceptance failed:', error);
      throw error;
    }
  }

  /**
   * Get tour plan session details
   * GET /api/v1/tour-plan/session/:threadId
   */
  async getSession(
    threadId: string,
  ): Promise<{ threadId: string; status: string; message: string }> {
    try {
      const response = await this.authenticatedGet<{
        threadId: string;
        status: string;
        message: string;
      }>(`/session/${threadId}`);
      const result = this.handleApiResponse(response);
      return result;
    } catch (error: any) {
      console.error('Get session failed:', error);
      throw error;
    }
  }

  /**
   * Search for hotels, restaurants, or activities near a location
   * POST /api/v1/tour-plan/hotel-search
   */
  async searchHotels(query: string, location?: string): Promise<HotelSearchResponse> {
    try {
      console.log('TourPlanService.searchHotels - Searching:', query, location);

      const response = await this.authenticatedPost<HotelSearchResponse>('/hotel-search', {
        query,
        location,
      });
      const result = this.handleApiResponse(response);

      console.log('TourPlanService.searchHotels - Found', result.total_results, 'results');
      return result;
    } catch (error: any) {
      console.error('Hotel search failed:', error);
      throw error;
    }
  }

  /**
   * Resume the graph after user selects a search candidate (HITL)
   * POST /api/v1/tour-plan/resume-selection
   */
  async resumeSelection(request: ResumeSelectionRequest): Promise<TourPlanResponse> {
    try {
      console.log(
        'TourPlanService.resumeSelection - thread:',
        request.threadId,
        'candidate:',
        request.selectedCandidateId,
      );

      const response = await this.authenticatedPost<TourPlanResponse>(
        '/resume-selection',
        request,
        { timeout: 180000, retries: 0 },
      );
      const result = this.handleApiResponse(response);
      const planData: TourPlanResponse = result.data || result;

      console.log('TourPlanService.resumeSelection - Selection resumed successfully');
      return planData;
    } catch (error: any) {
      console.error('Resume selection failed:', error);
      throw error;
    }
  }

  /**
   * Resume the graph after user decides on weather action (HITL)
   * POST /api/v1/tour-plan/resume-weather
   */
  async resumeWeather(request: ResumeWeatherRequest): Promise<TourPlanResponse> {
    try {
      console.log(
        'TourPlanService.resumeWeather - thread:',
        request.threadId,
        'choice:',
        request.userWeatherChoice,
      );

      const response = await this.authenticatedPost<TourPlanResponse>('/resume-weather', request, {
        timeout: 180000,
        retries: 0,
      });
      const result = this.handleApiResponse(response);
      const planData: TourPlanResponse = result.data || result;

      console.log('TourPlanService.resumeWeather - Weather resume successful');
      return planData;
    } catch (error: any) {
      console.error('Resume weather failed:', error);
      throw error;
    }
  }
}

export const tourPlanService = new TourPlanService();
