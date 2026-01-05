import { BaseApiService } from './BaseApiService';
import { AuthUtils } from '@utils/auth';
import { apiClient } from './client';
import type { User, UserProfileData, UserPreferences, AvatarUploadResponse, TravelPreferenceScores, ApiResponse } from '@types';

class UserService extends BaseApiService {
  constructor() {
    super('/users');
  }

  // Helper to make requests to different base paths
  private async authenticatedGetAbsolute<T>(endpoint: string): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return apiClient.get<T>(endpoint, { headers });
  }

  private async authenticatedPatchAbsolute<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return apiClient.patch<T>(endpoint, data, { headers });
  }

  //Get user profile
  async getProfile(): Promise<User> {
    try {
      const response = await this.authenticatedGet<{ user: User }>('/profile');

      // Handle 304 Not Modified response (use cached data)
      if (response.status === 304 || !response.data) {
        console.log('Profile not modified, using cached data');
        const storedUser = await AuthUtils.getStoredUser();
        if (storedUser) {
          return storedUser;
        }
        throw new Error('No cached user data available for 304 response');
      }

      if (!response.data.user) {
        throw new Error('No user data received from profile API');
      }

      return response.data.user;
    } catch (error) {
      console.warn('Profile API failed, attempting to use stored data:', error);

      try {
        const storedUser = await AuthUtils.getStoredUser();
        if (storedUser) {
          console.log('Using stored user data');
          return storedUser;
        }
      } catch (storageError) {
        console.error('Failed to get stored user:', storageError);
      }

      // If all else fails, throw the original error
      throw new Error('Unable to get profile data from API or storage');
    }
  }
  //Update user profile with data validation
  async updateProfile(
    profileData: Partial<UserProfileData & { profileStatus?: 'Incomplete' | 'Complete' }>,
  ): Promise<User> {
    try {
      const apiData = {
        ...profileData,
      };

      const response = await this.authenticatedPut<{ user: User }>('/profile', apiData);
      const data = this.handleApiResponse(response);
      return data.user;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  //Delete user account
  async deleteAccount(): Promise<void> {
    try {
      await this.authenticatedDelete<void>('/account');

      await AuthUtils.clearAuthData();
    } catch (error) {
      console.error('Account deletion failed:', error);
      throw error;
    }
  }

  //Upload user avatar with proper file handling
  async uploadAvatar(imageUri: string): Promise<AvatarUploadResponse> {
    try {
      const headers = await this.getAuthHeaders();

      delete headers['Content-Type'];

      const formData = new FormData();
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      const response = await apiClient.post<AvatarUploadResponse>('/avatar', formData, { headers });
      return this.handleApiResponse(response);
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw error;
    }
  }

  //Get user preferences
  // Uses /api/v1/preferences endpoint (not /users/preferences)
  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await this.authenticatedGetAbsolute<{ preferences: UserPreferences }>(
        '/preferences',
      );
      const data = this.handleApiResponse(response);
      return data.preferences || data;
    } catch (error) {
      console.error('Get preferences failed:', error);
      throw error;
    }
  }

  // Update user preferences (general)
  // Uses /api/v1/preferences endpoint (not /users/preferences)
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      // If updating travel preferences, use the scores endpoint
      if (preferences.travelPreferences) {
        return await this.updateTravelPreferences(preferences.travelPreferences);
      }

      // For other preferences, use the general preferences endpoint
      const response = await this.authenticatedPatchAbsolute<{ preferences: UserPreferences }>(
        '/preferences/notifications', // or another specific endpoint
        preferences,
      );
      const data = this.handleApiResponse(response);
      return data.preferences || data;
    } catch (error) {
      console.error('Update preferences failed:', error);
      throw error;
    }
  }

  // Update travel preference scores for AI recommendations
  // Uses /api/v1/preferences/scores endpoint
  async updateTravelPreferences(scores: TravelPreferenceScores): Promise<UserPreferences> {
    try {
      console.log('Updating travel preferences:', scores);

      const response = await this.authenticatedPatchAbsolute<{ preferences: UserPreferences }>(
        '/preferences/scores',
        {
          history: scores.history,
          adventure: scores.adventure,
          nature: scores.nature,
          relaxation: scores.relaxation,
        },
      );

      console.log('Travel preferences update response:', response);
      const data = this.handleApiResponse(response);
      return data.preferences || data;
    } catch (error) {
      console.error('Update travel preferences failed:', error);
      throw error;
    }
  }

  // Get travel preference scores for AI recommendations
  // Uses /api/v1/preferences/scores endpoint
  async getTravelPreferences(): Promise<TravelPreferenceScores> {
    try {
      const response = await this.authenticatedGetAbsolute<{ scores: TravelPreferenceScores }>(
        '/preferences/scores',
      );
      const data = this.handleApiResponse(response);
      return data.scores || data;
    } catch (error) {
      console.error('Get travel preferences failed:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
