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
    // Check if URL contains any proxy domains
    const containsProxyDomain = PROXY_DOMAINS.some(domain => imageUrl.includes(domain));
    if (containsProxyDomain) {
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
      const response = await this.publicGet<any>(`/${encodedName}/images`);
      const result = this.handleApiResponse(response);

      // Backend wraps response in { success, message, data }, extract the inner data
      const imageData: LocationImagesResponse = result.data || result;

      // Proxy Wikimedia URLs through backend to avoid 403 errors
      return {
        ...imageData,
        imageUrls: proxyImageUrls(imageData.imageUrls || []),
        primaryImage: imageData.primaryImage ? toProxyUrl(imageData.primaryImage) : null,
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
      const response = await this.publicPost<any>('/images/bulk', {
        location_names: locationNames,
      });
      const result = this.handleApiResponse(response);

      // Backend wraps response in { success, message, data }, extract the inner data
      const locationsMap: BulkLocationImagesResponse = result.data || result;

      // Proxy all Wikimedia image URLs through backend
      const proxiedResult: BulkLocationImagesResponse = {};
      for (const [key, value] of Object.entries(locationsMap)) {
        if (value && typeof value === 'object' && 'imageUrls' in value) {
          proxiedResult[key] = {
            ...value,
            imageUrls: proxyImageUrls(value.imageUrls || []),
            primaryImage: value.primaryImage ? toProxyUrl(value.primaryImage) : null,
          };
        }
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
      const response = await this.publicGet<any>(`/${encodedName}`);
      const result = this.handleApiResponse(response);

      // Backend wraps response in { success, message, data }, extract the inner data
      const locationData: LocationDetailsResponse = result.data || result;

      // Proxy Wikimedia image URLs through backend
      return {
        ...locationData,
        imageUrls: proxyImageUrls(locationData.imageUrls || []),
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
      const response = await this.publicGet<any>(
        `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      );

      if (!response.success) {
        console.error('Search failed:', response.error);
        return [];
      }

      // Handle different response formats from backend
      let results = response.data;

      // If response.data is wrapped in a results property
      if (results && typeof results === 'object' && !Array.isArray(results)) {
        results = results.results || results.data || results;
      }

      // Ensure results is an array
      if (!Array.isArray(results)) {
        console.warn('Location search response is not an array:', results);
        return [];
      }

      // Proxy Wikimedia image URLs through backend
      return results.map((result: LocationDetailsResponse) => ({
        ...result,
        imageUrls: proxyImageUrls(result.imageUrls || []),
      }));
    } catch (error) {
      console.error('Search locations failed:', error);
      return [];
    }
  }
}

export const locationService = new LocationServiceClass();
export default locationService;
