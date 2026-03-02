export * from './client';
export { authService } from './AuthService';
export { userService } from './UserService';
export { chatService } from './ChatService';
export { default as safetyService } from './SafetyService';
export { default as incidentReportService } from './IncidentReportService';
export { aiService } from './AIService';
export { locationService } from './LocationService';
export { tourPlanService } from './TourPlanService';
export { BaseApiService } from './BaseApiService';
export { CookieManager } from '../../utils/cookieManager';

// Re-export AI service types
export type {
  SimpleRecommendationRequest,
  SimpleRecommendationResponse,
  SimpleRecommendationLocation,
  SimpleCrowdPredictionRequest,
  SimpleCrowdPredictionResponse,
  SimpleGoldenHourRequest,
  SimpleGoldenHourResponse,
  GoldenHourWindow,
  SimpleDescriptionRequest,
  SimpleDescriptionResponse,
} from './AIService';

// Re-export Location service types
export type {
  LocationImagesResponse,
  LocationDetailsResponse,
  BulkLocationImagesResponse,
} from './LocationService';

// Re-export Tour Plan service types
export type {
  SelectedLocation,
  ItinerarySlot,
  TourPlanMetadata,
  ConstraintViolation,
  GeneratePlanRequest,
  RefinePlanRequest,
  AcceptPlanRequest,
  TourPlanResponse,
  AcceptPlanResponse,
} from './TourPlanService';
>>>>>>> ai-agent-v2
