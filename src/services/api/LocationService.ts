/**
 * Location Service
 * Service for fetching location data and images
 */

import { BaseApiService } from './BaseApiService';
import { apiClient } from './client';
import type { ApiResponse } from '@types';

// Location Images Response
export interface LocationImagesResponse {
  name: string;
  imageUrls: string[];
  primaryImage: string | null;
  totalImages: number;
}

// Location Details Response
export interface LocationDetailsResponse {
  name: string;
  imageUrls: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  preferenceScores: {
    history: number;
    adventure: number;
    nature: number;
    relaxation: number;
  };
  isOutdoor: boolean;
}

// Bulk Images Response
export interface BulkLocationImagesResponse {
  [locationName: string]: LocationImagesResponse;
}

class LocationServiceClass extends BaseApiService {
  constructor() {
    super('/locations');
  }

  /**
   * Make public GET request (no auth required)
   */
  private async publicGet<T>(endpoint: string): Promise<ApiResponse<T>> {
    return apiClient.get<T>(`${this.baseEndpoint}${endpoint}`);
  }

  /**
   * Make public POST request (no auth required)
   */
  private async publicPost<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return apiClient.post<T>(`${this.baseEndpoint}${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get location images by name
   * GET /api/v1/locations/:name/images
   */
  async getLocationImages(locationName: string): Promise<LocationImagesResponse> {
    try {
      const encodedName = encodeURIComponent(locationName);
      const response = await this.publicGet<LocationImagesResponse>(`/${encodedName}/images`);
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Get location images failed:', error);
      // Return empty response on error
      return {
        name: locationName,
        imageUrls: [],
        primaryImage: null,
        totalImages: 0,
      };
    }
  }

  /**
   * Get images for multiple locations
   * POST /api/v1/locations/images/bulk
   */
  async getBulkLocationImages(
    locationNames: string[]
  ): Promise<BulkLocationImagesResponse> {
    try {
      const response = await this.publicPost<BulkLocationImagesResponse>(
        '/images/bulk',
        { location_names: locationNames }
      );
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Get bulk location images failed:', error);
      // Return empty responses on error
      const emptyResponse: BulkLocationImagesResponse = {};
      locationNames.forEach((name) => {
        emptyResponse[name] = {
          name,
          imageUrls: [],
          primaryImage: null,
          totalImages: 0,
        };
      });
      return emptyResponse;
    }
  }

  /**
   * Get location details by name
   * GET /api/v1/locations/:name
   */
  async getLocationDetails(locationName: string): Promise<LocationDetailsResponse | null> {
    try {
      const encodedName = encodeURIComponent(locationName);
      const response = await this.publicGet<LocationDetailsResponse>(`/${encodedName}`);
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Get location details failed:', error);
      return null;
    }
  }

  /**
   * Search locations by name
   * GET /api/v1/locations/search?q=query&limit=10
   */
  async searchLocations(
    query: string,
    limit: number = 10
  ): Promise<LocationDetailsResponse[]> {
    try {
      const response = await this.publicGet<LocationDetailsResponse[]>(
        `/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Search locations failed:', error);
      return [];
    }
  }
}

export const locationService = new LocationServiceClass();
export default locationService;
