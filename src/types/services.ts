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

// Health Profile types
export interface HealthProfileHistory {
  skinType: number;
  imageUrl?: string;
  timeStamp: Date;
}

export interface HealthProfile {
  _id?: string;
  userId: string;
  age: number;
  skinType: number;
  imageUrl: string;
  skinProductInteraction: string;
  useOfSunglasses: string;
  historicalSunburnTimes?: number;
  historicalTanningTimes?: number;
  history?: HealthProfileHistory[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateHealthProfileRequest {
  userId: string;
  age: number;
  skinType: number;
  imageUrl: string;
  skinProductInteraction: string;
  useOfSunglasses: string;
  historicalSunburnTimes?: number;
  historicalTanningTimes?: number;
}

export interface UpdateSkinTypeRequest {
  skinType: string;
  imageUrl?: string;
}
