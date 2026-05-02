import axios from 'axios';
import { AuthUtils } from '@utils/auth';
import { API_CONFIG } from '@constants';

const CHAT_API_BASE_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}`;

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

// Cleaned route structure (no more static/dynamic nesting)
export interface RankedRoute {
  route_id: string;
  transport_type: string;
  score: number;
  ml_confidence: number;
  recommendation_reason: string;
}

export interface StationData {
  origin: {
    requested_name: string;
    matched_city_id: number;
    matched_city_name: string;
    matched_by: string;
    has_railway_access: boolean;
    has_bus_access: boolean;
    nearest_railway_station?: {
      station_id: string;
      station_name: string;
      distance_km: number;
      latitude?: number;
      longitude?: number;
    };
  };
  destination: {
    requested_name: string;
    matched_city_id: number;
    matched_city_name: string;
    matched_by: string;
    has_railway_access: boolean;
    has_bus_access: boolean;
    nearest_railway_station?: {
      station_id: string;
      station_name: string;
      distance_km: number;
      latitude?: number;
      longitude?: number;
    };
  };
}

export interface RoadIncidents {
  active_incidents: any[];
  incident_count: number;
  critical_incidents: number;
  high_incidents: number;
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
  transport_recommendations?: TransportRecommendations;
  map_data?: MapData;
  road_incidents?: RoadIncidents;
  station_data?: StationData;
  processing_time_ms: number;
}

export interface ChatbotResponseData {
  conversation_id: string;
  message: string;
  html_content?: string;
  message_type: string;
  metadata: ChatbotMetadata;
  suggestions: string[];
}

export interface ChatbotResponse {
  success: boolean;
  data: ChatbotResponseData;
}

// RAG Response Types (Agentic Mode)
export interface RAGResponseData {
  answer: string;
  sources: Array<{
    content: string;
    metadata: any;
    score: number;
  }>;
  confidence_score: number;
  search_time_ms: number;
  total_results: number;
}

export interface RAGResponse {
  success: boolean;
  data: RAGResponseData;
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

  // Recommendation Mode - /chatbot/message (transport queries)
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
      console.log('Response data type:', typeof response.data);
      console.log(
        'Response data keys:',
        response.data ? Object.keys(response.data) : 'null/undefined',
      );
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

  // Agentic Mode - /chatbot/ask-rag (knowledge-based questions)
  async askRAG(
    question: string,
    conversationId?: string,
  ): Promise<RAGResponse | { success: false; error: string }> {
    try {
      const tokens = await AuthUtils.getStoredTokens();
      const accessToken = tokens?.accessToken;

      if (!accessToken) {
        return {
          success: false,
          error: 'Not authenticated. Please log in.',
        };
      }

      const payload: { message: string; conversation_id?: string } = { message: question };
      if (conversationId) {
        payload.conversation_id = conversationId;
      }

      const response = await axios.post<RAGResponse>(
        `${CHAT_API_BASE_URL}/chatbot/ask-rag`,
        payload,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      console.log('RAG API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('RAG API Error:', error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get answer';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Get location session - GET /chat/location/:locationName
  async getLocationSession(locationName: string): Promise<{ session: any; hasSession: boolean }> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get(
      `${CHAT_API_BASE_URL}/chat/location/${encodeURIComponent(locationName)}`,
      {
        timeout: 15000,
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data.data;
  },

  // Get session messages - GET /chat/sessions/:sessionId/messages
  async getSessionMessages(sessionId: string): Promise<any[]> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get(
      `${CHAT_API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        timeout: 15000,
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data.data?.messages || [];
  },

  // Send location message - POST /chat/location
  async sendLocationMessage(locationName: string, message: string): Promise<any> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${CHAT_API_BASE_URL}/chat/location`,
      { locationName, message },
      {
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data.data;
  },

  // Clear messages - DELETE /chat/sessions/:sessionId/messages
  async clearMessages(sessionId: string): Promise<any> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.delete(
      `${CHAT_API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        timeout: 15000,
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data.data;
  },
};

// ============= TOUR GUIDE CHAT TYPES (AI Agent Engine) =============

import type {
  ClarificationQuestion,
  CulturalTip,
  FinalItinerary,
  SelectionCard,
  StepResult,
  WeatherPromptOption,
} from './TourPlanService';

export type {
  ClarificationQuestion,
  ClarificationOption,
  CulturalTip,
  FinalItinerary,
  FinalItineraryStop,
  RouteCoordinate,
  ContextualNote,
  SelectionCard,
  StepResult,
  WeatherPromptOption,
} from './TourPlanService';

export interface GuideSession {
  sessionId: string;
  title: string;
  status: 'active' | 'closed' | 'archived';
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImageSearchResult {
  image_id: string;
  location_name: string;
  description: string;
  image_url: string;
  similarity_score: number;
  tags: string;
  coordinates?: { lat: number; lng: number };
}

export interface GuideMessageMetadata {
  reasoning_loops?: number;
  documents_retrieved?: number;
  web_search_used?: boolean;
  target_location?: string;
  has_image_query?: boolean;
  sources?: {
    kb_sources?: string[];
    source_urls?: Array<{ title: string; url: string }>;
  };
  [key: string]: any;
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

export interface ConstraintViolation {
  constraint_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

export interface GuideMessageResponse {
  success: boolean;
  data: {
    sessionId: string;
    response: string;
    intent: string | null;
    itinerary: ItinerarySlot[] | null;
    constraints: ConstraintViolation[] | null;
    metadata: GuideMessageMetadata;
    messageCount: number;
    imageResults?: ImageSearchResult[] | null;
    imageValidationMessage?: string | null;
    userImageUrl?: string | null;
    // Tour-planning artifacts (returned when intent === 'trip_planning' or
    // when the agent paused for HITL / weather decisions).
    threadId?: string | null;
    clarificationQuestion?: ClarificationQuestion | null;
    culturalTips?: CulturalTip[] | null;
    finalItinerary?: FinalItinerary | null;
    pendingUserSelection?: boolean | null;
    selectionCards?: SelectionCard[] | null;
    promptText?: string | null;
    weatherInterrupt?: boolean | null;
    weatherPromptMessage?: string | null;
    weatherPromptOptions?: WeatherPromptOption[] | null;
    stepResults?: StepResult[] | null;
  };
}

export interface GuideHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUrl?: string | null;
  metadata?: GuideMessageMetadata;
}

export interface GuideSessionsResponse {
  success: boolean;
  data: {
    sessions: GuideSession[];
    total: number;
  };
}

export interface GuideHistoryResponse {
  success: boolean;
  data: {
    messages: GuideHistoryMessage[];
    total: number;
  };
}

// ============= TOUR GUIDE CHAT SERVICE METHODS =============

const tourGuideChatService = {
  /** Quick chat — auto-creates session + sends message in one call */
  async quickChat(
    message: string,
    sessionId?: string,
    imageBase64?: string,
  ): Promise<GuideMessageResponse> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      return { success: false, data: { sessionId: '', response: 'Not authenticated.', intent: null, itinerary: null, constraints: null, metadata: {}, messageCount: 0 } };
    }

    const payload: any = { message };
    if (sessionId) {
      payload.sessionId = sessionId;
    }
    if (imageBase64) {
      payload.imageBase64 = imageBase64;
    }

    const response = await axios.post<GuideMessageResponse>(
      `${CHAT_API_BASE_URL}/chat/quick`,
      payload,
      {
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  },

  /** Create a new tour guide session */
  async createSession(
    title?: string,
  ): Promise<{ success: boolean; data: GuideSession }> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.post(
      `${CHAT_API_BASE_URL}/chat/sessions`,
      { title: title || 'Tour Guide Chat' },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  },

  /** Send a message to an existing session */
  async sendMessage(
    sessionId: string,
    message: string,
    imageBase64?: string,
  ): Promise<GuideMessageResponse> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      return { success: false, data: { sessionId, response: 'Not authenticated.', intent: null, itinerary: null, constraints: null, metadata: {}, messageCount: 0 } };
    }

    const payload: any = { message };
    if (imageBase64) {
      payload.imageBase64 = imageBase64;
    }

    const response = await axios.post<GuideMessageResponse>(
      `${CHAT_API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      payload,
      {
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  },

  /** Get list of past sessions */
  async getSessions(
    status?: 'active' | 'closed' | 'archived',
  ): Promise<GuideSessionsResponse> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const params: any = { limit: 20 };
    if (status) {
      params.status = status;
    }

    const response = await axios.get<GuideSessionsResponse>(
      `${CHAT_API_BASE_URL}/chat/sessions`,
      {
        params,
        timeout: 15000,
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data;
  },

  /** Get messages from a session */
  async getHistory(
    sessionId: string,
    limit: number = 50,
  ): Promise<GuideHistoryResponse> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get<GuideHistoryResponse>(
      `${CHAT_API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        params: { limit },
        timeout: 15000,
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data;
  },

  /** Delete a session */
  async deleteSession(sessionId: string): Promise<void> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    await axios.delete(
      `${CHAT_API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}`,
      {
        timeout: 15000,
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  },

  /** Resume a paused planning agent after the user picks a HITL selection card. */
  async resumeSelection(
    sessionId: string,
    selectedCandidateId: string,
    label?: string,
  ): Promise<GuideMessageResponse> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      return {
        success: false,
        data: {
          sessionId,
          response: 'Not authenticated.',
          intent: null,
          itinerary: null,
          constraints: null,
          metadata: {},
          messageCount: 0,
        },
      };
    }
    const response = await axios.post<GuideMessageResponse>(
      `${CHAT_API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/resume-selection`,
      { selectedCandidateId, label },
      {
        timeout: 180000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  },

  /** Resume a paused planning agent after the user makes a weather decision. */
  async resumeWeather(
    sessionId: string,
    choice: 'switch_indoor' | 'reschedule' | 'keep',
  ): Promise<GuideMessageResponse> {
    const tokens = await AuthUtils.getStoredTokens();
    const accessToken = tokens?.accessToken;
    if (!accessToken) {
      return {
        success: false,
        data: {
          sessionId,
          response: 'Not authenticated.',
          intent: null,
          itinerary: null,
          constraints: null,
          metadata: {},
          messageCount: 0,
        },
      };
    }
    const response = await axios.post<GuideMessageResponse>(
      `${CHAT_API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/resume-weather`,
      { choice },
      {
        timeout: 180000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  },

  /**
   * Stream a chat message via Server-Sent Events.
   *
   * Emits per-node step events while the agent is running and a final
   * `complete` event with the full response payload. The mobile UI uses
   * step events to render a live agent progress indicator.
   *
   * Returns an `abort` function the caller can invoke to cancel the stream.
   * Falls back to `sendMessage` if SSE streaming fails (network, missing
   * support, etc.).
   */
  sendMessageStream(
    sessionId: string,
    message: string,
    callbacks: {
      onStep?: (step: StepResult) => void;
      onComplete?: (data: GuideMessageResponse['data']) => void;
      onError?: (error: any) => void;
    },
    imageBase64?: string,
  ): { abort: () => void } {
    const url = `${CHAT_API_BASE_URL}/chat/sessions/${encodeURIComponent(
      sessionId,
    )}/messages/stream`;

    let aborted = false;
    let xhr: XMLHttpRequest | null = null;
    let buffer = '';
    let lastResult: any = null;
    let processedLength = 0;

    const handleFrames = (chunk: string) => {
      buffer += chunk;
      // SSE frames are delimited by a blank line ("\n\n").
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const dataLine = frame
          .split('\n')
          .find(l => l.startsWith('data: '));
        if (!dataLine) continue;
        try {
          const payload = JSON.parse(dataLine.slice(6));
          if (payload?.type === 'step' && payload.step) {
            callbacks.onStep?.(payload.step);
          } else if (payload?.type === 'complete') {
            lastResult = payload.result;
          } else if (payload?.type === 'error') {
            callbacks.onError?.(new Error(payload.error || 'Streaming error'));
          }
        } catch (err) {
          // Ignore malformed frames
        }
      }
    };

    const fallback = async () => {
      try {
        const data = await tourGuideChatService.sendMessage(
          sessionId,
          message,
          imageBase64,
        );
        if (!aborted) {
          callbacks.onComplete?.(data.data);
        }
      } catch (e) {
        if (!aborted) callbacks.onError?.(e);
      }
    };

    (async () => {
      try {
        const tokens = await AuthUtils.getStoredTokens();
        const accessToken = tokens?.accessToken;
        if (!accessToken) {
          callbacks.onError?.(new Error('Not authenticated'));
          return;
        }

        xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'text/event-stream');
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.timeout = 180000;

        xhr.onreadystatechange = () => {
          if (!xhr || aborted) return;
          // readyState 3 = LOADING (chunks arriving)
          if (xhr.readyState === 3 || xhr.readyState === 4) {
            const text = xhr.responseText || '';
            const newChunk = text.slice(processedLength);
            processedLength = text.length;
            if (newChunk) handleFrames(newChunk);

            if (xhr.readyState === 4) {
              if (xhr.status >= 200 && xhr.status < 300) {
                if (lastResult) {
                  // The backend emits the complete frame in the AI engine's
                  // shape (snake_case). Normalize to GuideMessageResponse.data.
                  const data = mapStreamCompleteToGuideData(lastResult, sessionId);
                  callbacks.onComplete?.(data);
                } else {
                  // No complete frame received — fall back to sync request.
                  fallback();
                }
              } else if (xhr.status === 0) {
                // Network error / aborted — only treat as error if not aborted
                if (!aborted) fallback();
              } else {
                callbacks.onError?.(
                  new Error(`Stream failed with status ${xhr.status}`),
                );
              }
            }
          }
        };

        xhr.onerror = () => {
          if (!aborted) fallback();
        };
        xhr.ontimeout = () => {
          if (!aborted) callbacks.onError?.(new Error('Stream timed out'));
        };

        const payload: any = { message };
        if (imageBase64) payload.imageBase64 = imageBase64;
        xhr.send(JSON.stringify(payload));
      } catch (err) {
        if (!aborted) fallback();
      }
    })();

    return {
      abort: () => {
        aborted = true;
        try { xhr?.abort(); } catch {}
      },
    };
  },
};

// Map an AI-engine 'complete' frame (snake_case) to the camelCase shape
// the chat screen expects on `GuideMessageResponse.data`.
function mapStreamCompleteToGuideData(
  result: any,
  sessionId: string,
): GuideMessageResponse['data'] {
  return {
    sessionId,
    response: result?.final_response || result?.response || '',
    intent: result?.intent ?? null,
    itinerary: result?.itinerary ?? null,
    constraints: result?.constraint_violations ?? null,
    metadata: {
      reasoning_loops: result?.reasoning_loops ?? 0,
      documents_retrieved: result?.documents_retrieved ?? 0,
      web_search_used: result?.web_search_used ?? false,
      has_image_query: result?.has_image_query ?? false,
    },
    messageCount: 0,
    imageResults: result?.image_search_results ?? null,
    imageValidationMessage: result?.image_validation_message ?? null,
    userImageUrl: null,
    threadId: sessionId,
    clarificationQuestion: result?.clarification_question ?? null,
    culturalTips: result?.cultural_tips ?? null,
    finalItinerary: result?.final_itinerary ?? null,
    pendingUserSelection: result?.pending_user_selection ?? null,
    selectionCards: result?.selection_cards ?? null,
    promptText: result?.prompt_text ?? null,
    weatherInterrupt: result?.weather_interrupt ?? null,
    weatherPromptMessage: result?.weather_prompt_message ?? null,
    weatherPromptOptions: result?.weather_prompt_options ?? null,
    stepResults: result?.step_results ?? null,
  };
}

export { chatService, tourGuideChatService };
