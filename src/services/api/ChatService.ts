import axios from 'axios';
import { Platform } from 'react-native';
import { AuthUtils } from '@utils/auth';

// Use Android emulator loopback so http://localhost calls reach the host machine
const CHAT_API_BASE_URL = Platform.select({
  ios: 'http://localhost:3001/api/v1',
  android: 'http://10.0.2.2:3001/api/v1',
  default: 'http://localhost:3001/api/v1',
});

export interface TransportRecommendation {
  mode: string;
  operator: string;
  duration_min: number;
  fare_lkr: number;
  is_recommended: boolean;
  reliability: number;
  reliability_stars: string;
  crowding: number;
  distance_km: number;
  service_id: string;
}

export interface ChatResponseData {
  message?: string;
  recommendations?: TransportRecommendation[];
  clarificationPrompt?: string;
  nextQuestion?: string;
  status?: string;
  missingFields?: string[];
  pendingFields?: string[];
  extracted?: any;
  // Recommendation response fields
  recommendation?: {
    best_mode_prediction?: {
      method: string;
      best_mode: string;
      score: number;
    };
    departure_date?: string;
    departure_time?: string;
    origin?: string;
    destination?: string;
    distance_km?: number;
    recommendations?: TransportRecommendation[];
    total_options?: number;
  };
  temporal_context?: any;
}

interface ChatResponse {
  success: boolean;
  data?: ChatResponseData;
  error?: string;
}

export const chatService = {
  async sendMessage(message: string): Promise<ChatResponse> {
    try {
      const tokens = await AuthUtils.getStoredTokens();
      const accessToken = tokens?.accessToken;

      if (!accessToken) {
        return {
          success: false,
          error: 'Not authenticated. Please log in.',
        };
      }

      const response = await axios.post<ChatResponse>(
        `${CHAT_API_BASE_URL}/chat/recommend`,
        { message },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      console.log('Chat API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Chat API Error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  },
};
