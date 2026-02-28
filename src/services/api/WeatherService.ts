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
      console.log('cords', lat, lon)
      const response = await this.authenticatedGet<WeatherDataResponse>(`?lat=${lat}&lon=${lon}`);
      console.log('response', response)
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Get weather data failed:', error);
      throw error;
    }
  }
}

export const weatherService = new WeatherService();
