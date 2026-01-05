import { apiClient } from './client';
import { AuthUtils } from '@utils/auth';
import type { ApiResponse } from '@types';

export abstract class BaseApiService {
  protected baseEndpoint: string;

  constructor(baseEndpoint: string) {
    this.baseEndpoint = baseEndpoint;
  }

  //Get authenticated headers for API requests
  //Note: apiClient also adds auth headers via interceptor, but we add them here
  //for explicit control. If tokens are not available, return empty headers
  //and let the server respond with 401 which will be handled by apiClient interceptor.
  protected async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    try {
      const tokens = await AuthUtils.getStoredTokens();
      if (tokens?.accessToken) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    } catch (error) {
      console.warn('Failed to get auth tokens:', error);
    }
    
    return headers;
  }

  //Handle API response with consistent error handling and data extraction
  protected handleApiResponse<T>(response: ApiResponse<T>): T {
    if (!response.success) {
      throw new Error(response.error || 'API request failed');
    }

    if (!response.data) {
      throw new Error('No data received from server');
    }

    // Backend wraps responses in { success, message, data }
    // The client also wraps in ApiResponse, so we need to extract the inner data
    const serverResponse = response.data as any;

    // Check if this is a wrapped response from our backend
    if (serverResponse && typeof serverResponse === 'object' && 'data' in serverResponse) {
      // Backend response structure: { success: true, message: "...", data: { ... } }
      if (!serverResponse.success) {
        throw new Error(serverResponse.message || 'API request failed');
      }
      return serverResponse.data as T;
    }

    // If not wrapped, return as-is (for external APIs or different response formats)
    return response.data;
  }

  //Make authenticated GET request
  protected async authenticatedGet<T>(endpoint: string): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return apiClient.get<T>(`${this.baseEndpoint}${endpoint}`, { headers });
  }

  //Make authenticated POST request
  protected async authenticatedPost<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return apiClient.post<T>(`${this.baseEndpoint}${endpoint}`, data, { headers });
  }

  //Make authenticated PUT request
  protected async authenticatedPut<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return apiClient.put<T>(`${this.baseEndpoint}${endpoint}`, data, { headers });
  }

  //Make authenticated DELETE request
  protected async authenticatedDelete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return apiClient.delete<T>(`${this.baseEndpoint}${endpoint}`, { headers });
  }

  //Make unauthenticated POST request (for login, register, etc.)
  protected async unauthenticatedPost<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return apiClient.post<T>(`${this.baseEndpoint}${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
