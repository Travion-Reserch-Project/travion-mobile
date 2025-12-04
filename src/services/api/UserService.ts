import { BaseApiService } from './BaseApiService';
import { AuthUtils } from '@utils/auth';
import { apiClient } from './client';
import type { User, UserProfileData, UserPreferences, AvatarUploadResponse } from '@types';

class UserService extends BaseApiService {
  constructor() {
    super('/users');
  }

  //Get user profile
  async getProfile(): Promise<User> {
    try {
      const response = await this.authenticatedGet<{ user: User }>('/profile');
      if (!response.data) {
        throw new Error('No data received from profile API');
      }
      return response.data.user;
    } catch (error) {
      console.warn('Profile API failed, using stored data:', error);

      const storedUser = await AuthUtils.getStoredUser();
      if (storedUser) {
        return storedUser;
      }

      throw error;
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
  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await this.authenticatedGet<{ preferences: UserPreferences }>(
        '/preferences',
      );
      const data = this.handleApiResponse(response);
      return data.preferences;
    } catch (error) {
      console.error('Get preferences failed:', error);
      throw error;
    }
  }

  // Update user preferences
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await this.authenticatedPut<{ preferences: UserPreferences }>(
        '/preferences',
        preferences,
      );
      const data = this.handleApiResponse(response);
      return data.preferences;
    } catch (error) {
      console.error('Update preferences failed:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
