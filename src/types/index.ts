// Common types for the application

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
