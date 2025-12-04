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
