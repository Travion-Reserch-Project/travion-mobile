import { BaseApiService } from './BaseApiService';
import type { HealthProfile, CreateHealthProfileRequest, UpdateSkinTypeRequest } from '@types';

class HealthProfileService extends BaseApiService {
  constructor() {
    super('/health');
  }

  /**
   * Create a new health profile
   */
  async createHealthProfile(data: CreateHealthProfileRequest): Promise<HealthProfile> {
    try {
      const response = await this.authenticatedPost<HealthProfile>('', data);
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Create health profile failed:', error);
      throw error;
    }
  }

  /**
   * Get health profile by user ID
   */
  async getHealthProfile(userId: string): Promise<HealthProfile> {
    try {
      const response = await this.authenticatedGet<HealthProfile>(`/${userId}`);
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Get health profile failed:', error);
      throw error;
    }
  }

  /**
   * Update health profile
   */
  async updateHealthProfile(userId: string, data: Partial<HealthProfile>): Promise<HealthProfile> {
    try {
      const response = await this.authenticatedPut<HealthProfile>(`/${userId}`, data);
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Update health profile failed:', error);
      throw error;
    }
  }

  /**
   * Update skin type with history tracking
   */
  async updateSkinTypeWithHistory(
    userId: string,
    data: UpdateSkinTypeRequest,
  ): Promise<HealthProfile> {
    try {
      const response = await this.authenticatedPut<HealthProfile>(`/${userId}/skin-type`, data);
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Update skin type failed:', error);
      throw error;
    }
  }

  /**
   * Delete health profile
   */
  async deleteHealthProfile(userId: string): Promise<void> {
    try {
      await this.authenticatedDelete<void>(`/${userId}`);
    } catch (error) {
      console.error('Delete health profile failed:', error);
      throw error;
    }
  }
}

export const healthProfileService = new HealthProfileService();
