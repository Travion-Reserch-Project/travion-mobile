// Travel preference scores (0-1 scale)
export interface TravelPreferenceScores {
  history: number;     // Interest in historical/cultural sites
  adventure: number;   // Interest in adventure activities
  nature: number;      // Interest in nature/wildlife
  relaxation: number;  // Interest in relaxation/spiritual experiences
}

export interface UserPreferences {
  language: string;
  currency: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisible: boolean;
    dataSharing: boolean;
  };
  // Travel preferences for AI recommendations
  travelPreferences?: TravelPreferenceScores;
}

export interface UserProfileData {
  name: string;
  email?: string;
  userName?: string;
  phone?: string;
  dob?: Date;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other' | '';
  location?: {
    city: string;
    country: string;
  };
  country?: string;
  interests?: string[];
  bio?: string;
  preferredLanguage?: string;
}

export interface AvatarUploadResponse {
  avatarUrl: string;
  message?: string;
}
