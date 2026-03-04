import axios from 'axios';
import { Platform } from 'react-native';
import { AuthUtils } from '@utils/auth';

// Use Android emulator loopback so http://localhost calls reach the host machine
const CHAT_API_BASE_URL = Platform.select({
  ios: 'http://localhost:3001/api/v1',
  android: 'http://10.0.2.2:3001/api/v1',
  default: 'http://localhost:3001/api/v1',
});

// ============= OLD ENDPOINT TYPES =============
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

// ============= NEW CHATBOT ENDPOINT TYPES =============
export interface LocationIdentified {
  name: string;
  city_id: number;
  confidence: number;
}

export interface NavigationStep {
  instruction: string;
  maneuver: string;
  duration: number;
  distance: number;
  travel_mode: string;
}

export interface RouteStatic {
  route_id: string;
  origin_city_id: number;
  destination_city_id: number;
  transport_type: string;
  distance_km: number;
  estimated_duration_min: number;
  base_fare_lkr: number;
  has_transfer: boolean;
  scenic_score: number;
  comfort_score: number;
  operator_name: string;
  navigation_steps: NavigationStep[];
}

export interface RouteDynamic {
  distance_km: number;
  duration_min: number;
  traffic_delay_min: number;
  weather_risk: number;
  congestion: string;
  accident_risk: number;
}

export interface ScoreBreakdown {
  speed_score: number;
  budget_score: number;
  comfort_score: number;
  scenic_score: number;
  safety_score: number;
  weather_penalty: number;
  traffic_penalty: number;
  accident_penalty: number;
  ml_boost: number;
  final_score: number;
}

export interface RankedRoute {
  route_id: string;
  transport_type: string;
  operator_name: string;
  static: RouteStatic;
  dynamic: RouteDynamic;
  score: number;
  ml_confidence: number;
  ml_prediction: string;
  scoreBreakdown: ScoreBreakdown;
}

export interface TransportRecommendations {
  ranking_weights: Record<string, any>;
  ranked_routes: RankedRoute[];
}

export interface MapDataRoute {
  route_id: string;
  transport_type: string;
  polyline: string;
  color?: string;
  navigation_steps?: NavigationStep[];
}

export interface MapData {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  routes: MapDataRoute[];
}

export interface ChatbotMetadata {
  intent: string;
  locations_identified: LocationIdentified[];
  transport_recommendations: TransportRecommendations;
  map_data?: MapData;
  processing_time_ms: number;
}

export interface ChatbotResponseData {
  conversation_id: string;
  message: string;
  message_type: string;
  metadata: ChatbotMetadata;
  suggestions: string[];
}

export interface ChatbotResponse {
  success: boolean;
  data: ChatbotResponseData;
}

// Conversation/Trip Management Types
export interface Conversation {
  conversation_id: string;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: string;
}

export interface ConversationListResponse {
  success: boolean;
  data: {
    conversations: Conversation[];
  };
}

export interface ConversationMessagesResponse {
  success: boolean;
  data: {
    conversation_id: string;
    messages: Array<{
      message_id: number;
      sender: 'user' | 'bot';
      message: string;
      created_at: string;
      metadata?: ChatbotMetadata;
    }>;
  };
}

export interface NewTripResponse {
  success: boolean;
  data: {
    conversation_id: string;
    title: string;
    message: string;
  };
}

const chatService = {
  // Create new trip/conversation
  async createNewTrip(
    title?: string,
  ): Promise<NewTripResponse | { success: false; error: string }> {
    try {
      const tokens = await AuthUtils.getStoredTokens();
      const accessToken = tokens?.accessToken;

      if (!accessToken) {
        return {
          success: false,
          error: 'Not authenticated. Please log in.',
        };
      }

      const payload = title ? { title } : {};

      const response = await axios.post<NewTripResponse>(
        `${CHAT_API_BASE_URL}/chatbot/conversations/new-trip`,
        payload,
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      console.log('New Trip Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('New Trip Error:', error.message);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to create new trip';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Get conversation history
  async getConversations(): Promise<ConversationListResponse | { success: false; error: string }> {
    try {
      const tokens = await AuthUtils.getStoredTokens();
      const accessToken = tokens?.accessToken;

      if (!accessToken) {
        return {
          success: false,
          error: 'Not authenticated. Please log in.',
        };
      }

      const response = await axios.get<ConversationListResponse>(
        `${CHAT_API_BASE_URL}/chatbot/conversations`,
        {
          timeout: 15000,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      console.log('Conversations Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Get Conversations Error:', error.message);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to fetch conversations';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Get messages from a specific conversation
  async getConversationMessages(
    conversationId: string,
  ): Promise<ConversationMessagesResponse | { success: false; error: string }> {
    try {
      const tokens = await AuthUtils.getStoredTokens();
      const accessToken = tokens?.accessToken;

      if (!accessToken) {
        return {
          success: false,
          error: 'Not authenticated. Please log in.',
        };
      }

      const response = await axios.get<ConversationMessagesResponse>(
        `${CHAT_API_BASE_URL}/chatbot/conversations/${conversationId}`,
        {
          timeout: 15000,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      console.log('Conversation Messages Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Get Conversation Messages Error:', error.message);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to fetch conversation messages';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // New endpoint - /chatbot/message
  async sendChatbotMessage(
    message: string,
    conversationId?: string,
  ): Promise<ChatbotResponse | { success: false; error: string }> {
    try {
      const tokens = await AuthUtils.getStoredTokens();
      const accessToken = tokens?.accessToken;

      if (!accessToken) {
        return {
          success: false,
          error: 'Not authenticated. Please log in.',
        };
      }

      const payload: { message: string; conversation_id?: string } = { message };
      if (conversationId) {
        payload.conversation_id = conversationId;
      }

      const response = await axios.post<ChatbotResponse>(
        `${CHAT_API_BASE_URL}/chatbot/message`,
        payload,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      console.log('Chatbot API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Chatbot API Error:', error.message);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to send message';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};

export { chatService };
