import { apiClient } from './client';
import { AuthUtils } from '@utils/auth';
import type { ApiResponse } from '@types';

export abstract class BaseApiService {
  protected baseEndpoint: string;

  constructor(baseEndpoint: string) {
    this.baseEndpoint = baseEndpoint;
  }

  //Get authenticated headers for API requests
  protected async getAuthHeaders(): Promise<Record<string, string>> {
    const tokens = await AuthUtils.getStoredTokens();
    if (!tokens || !tokens.accessToken || tokens.accessToken === '') {
      throw new Error('Authentication required');
    }

    return {
      Authorization: `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  //Handle API response with consistent error handling and data extraction
  protected handleApiResponse<T>(response: ApiResponse<T>): T {
    if (!response.success) {
      throw new Error(response.error || 'API request failed');
    }

    if (!response.data) {
      throw new Error('No data received from server');
    }

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
