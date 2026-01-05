/**
 * Chat Service
 * Handles location-specific AI chat API calls
 */

import { BaseApiService } from './BaseApiService';
import type {
  LocationChatRequest,
  LocationChatResponse,
  GetLocationSessionResponse,
  ClearMessagesResponse,
  ChatMessage,
} from '@types';

class ChatService extends BaseApiService {
  constructor() {
    super('/chat');
  }

  /**
   * Send a message in a location-specific chat
   * POST /api/v1/chat/location
   */
  async sendLocationMessage(
    locationName: string,
    message: string
  ): Promise<LocationChatResponse> {
    try {
      const request: LocationChatRequest = {
        locationName,
        message,
      };

      const response = await this.authenticatedPost<LocationChatResponse>(
        '/location',
        request
      );
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Location chat failed:', error);
      throw error;
    }
  }

  /**
   * Get existing session for a location
   * GET /api/v1/chat/location/:locationName
   */
  async getLocationSession(
    locationName: string
  ): Promise<GetLocationSessionResponse> {
    try {
      const encodedLocation = encodeURIComponent(locationName);
      const response = await this.authenticatedGet<GetLocationSessionResponse>(
        `/location/${encodedLocation}`
      );
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Get location session failed:', error);
      throw error;
    }
  }

  /**
   * Get messages for a session
   * GET /api/v1/chat/sessions/:sessionId/messages
   */
  async getSessionMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    try {
      const response = await this.authenticatedGet<{ messages: ChatMessage[] }>(
        `/sessions/${sessionId}/messages?limit=${limit}&offset=${offset}`
      );
      const data = this.handleApiResponse(response);
      return data.messages;
    } catch (error) {
      console.error('Get session messages failed:', error);
      throw error;
    }
  }

  /**
   * Clear all messages from a session
   * DELETE /api/v1/chat/sessions/:sessionId/messages
   */
  async clearMessages(sessionId: string): Promise<ClearMessagesResponse> {
    try {
      const response = await this.authenticatedDelete<ClearMessagesResponse>(
        `/sessions/${sessionId}/messages`
      );
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Clear messages failed:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
