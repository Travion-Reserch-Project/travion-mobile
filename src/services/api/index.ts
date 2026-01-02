export * from './client';
export { authService } from './AuthService';
export { userService } from './UserService';
export { aiService } from './AIService';
export { locationService } from './LocationService';
export { chatService } from './ChatService';
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
  SimpleDescriptionRequest,
  SimpleDescriptionResponse,
} from './AIService';

// Re-export Location service types
export type {
  LocationImagesResponse,
  LocationDetailsResponse,
  BulkLocationImagesResponse,
} from './LocationService';
