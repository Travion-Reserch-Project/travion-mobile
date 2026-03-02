/**
 * Location Service
 * Service for fetching location data and images
 */

import { BaseApiService } from './BaseApiService';
import { apiClient } from './client';
import { API_CONFIG } from '@constants';
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

/**
 * Domains that need proxying (they block non-browser User-Agents)
 */
const PROXY_DOMAINS = ['upload.wikimedia.org', 'commons.wikimedia.org', 'en.wikipedia.org'];

/**
 * Convert a Wikimedia image URL to a proxied URL through our backend.
 * Wikimedia blocks React Native's default User-Agent (okhttp) with 403,
 * so we proxy through our backend which uses a browser-like User-Agent.
 */
function toProxyUrl(imageUrl: string): string {
  try {
    const parsed = new URL(imageUrl);
    if (PROXY_DOMAINS.some(domain => parsed.hostname.endsWith(domain))) {
      const baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}`;
      return `${baseUrl}/locations/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    }
  } catch {
    // If URL parsing fails, return as-is
  }
  return imageUrl;
}

/**
 * Convert all image URLs in a response to proxied URLs
 */
function proxyImageUrls(urls: string[]): string[] {
  return urls.map(url => toProxyUrl(url));
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
      const result = this.handleApiResponse(response);

      // Proxy Wikimedia URLs through backend to avoid 403 errors
      return {
        ...result,
        imageUrls: proxyImageUrls(result.imageUrls),
        primaryImage: result.primaryImage ? toProxyUrl(result.primaryImage) : null,
      };
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
  async getBulkLocationImages(locationNames: string[]): Promise<BulkLocationImagesResponse> {
    try {
      const response = await this.publicPost<BulkLocationImagesResponse>('/images/bulk', {
        location_names: locationNames,
      });
      const result = this.handleApiResponse(response);

      // Proxy all Wikimedia image URLs through backend
      const proxiedResult: BulkLocationImagesResponse = {};
      for (const [key, value] of Object.entries(result)) {
        proxiedResult[key] = {
          ...value,
          imageUrls: proxyImageUrls(value.imageUrls),
          primaryImage: value.primaryImage ? toProxyUrl(value.primaryImage) : null,
        };
      }
      return proxiedResult;
    } catch (error) {
      console.error('Get bulk location images failed:', error);
      // Return empty responses on error
      const emptyResponse: BulkLocationImagesResponse = {};
      locationNames.forEach(name => {
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
      const result = this.handleApiResponse(response);

      // Proxy Wikimedia image URLs through backend
      return {
        ...result,
        imageUrls: proxyImageUrls(result.imageUrls),
      };
    } catch (error) {
      console.error('Get location details failed:', error);
      return null;
    }
  }

  /**
   * Search locations by name
   * GET /api/v1/locations/search?q=query&limit=10
   */
  async searchLocations(query: string, limit: number = 10): Promise<LocationDetailsResponse[]> {
    try {
      const response = await this.publicGet<LocationDetailsResponse[]>(
        `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      );
      const results = this.handleApiResponse(response);

      // Proxy Wikimedia image URLs through backend
      return results.map(result => ({
        ...result,
        imageUrls: proxyImageUrls(result.imageUrls),
      }));
    } catch (error) {
      console.error('Search locations failed:', error);
      return [];
    }
  }
}

export const locationService = new LocationServiceClass();
export default locationService;
