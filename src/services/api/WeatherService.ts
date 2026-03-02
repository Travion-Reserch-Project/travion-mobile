import { BaseApiService } from './BaseApiService';

export interface WeatherDataResponse {
  success: boolean;
  data: any;
}

class WeatherService extends BaseApiService {
  constructor() {
    super('/weather');
  }

  /**
   * Get weather data by latitude and longitude
   */
  async getWeatherData(lat: number, lon: number): Promise<WeatherDataResponse> {
    try {
      const response = await this.authenticatedGet<WeatherDataResponse>(`?lat=${lat}&lon=${lon}`, {
        timeout: 60000,
        retries: 3,
      });

      // If the request was aborted or failed at the client level, the response
      // will have success=false. handleApiResponse would throw, so handle it here.
      if (!response.success) {
        throw new Error(response.error || 'Weather API request failed');
      }

      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Get weather data failed:', error);
      throw error;
    }
  }
  /**
   * Predict sun protection risk
   */
  async predictSunRisk(lat: number, lon: number): Promise<any> {
    try {
      const response = await this.authenticatedPost<any>(
        '/predict',
        { lat, lon },
        { timeout: 60000, retries: 3 },
      );
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Predict sun risk failed:', error);
      throw error;
    }
  }
}

export const weatherService = new WeatherService();
