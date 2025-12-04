import { API_CONFIG } from '@constants';
import { AuthUtils } from '@utils/auth';
import type { ApiResponse } from '@types';

//HTTP Methods enum
enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

//Request configuration interface
interface RequestConfig extends Omit<RequestInit, 'body'> {
  body?: any;
  useAuth?: boolean;
  retries?: number;
  timeout?: number;
}

//API Error class for better error handling
export class ApiError extends Error {
  constructor(message: string, public status?: number, public code?: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  // Interceptors
  private requestInterceptors: Array<
    (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  > = [];
  private responseInterceptors: Array<(response: Response) => Response | Promise<Response>> = [];
  private errorInterceptors: Array<(error: Error) => Error | Promise<Error>> = [];

  constructor() {
    this.baseURL = `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}`;
    this.timeout = API_CONFIG.TIMEOUT;
    this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS;
    this.retryDelay = API_CONFIG.RETRY_DELAY;

    this.setupDefaultInterceptors();
  }

  // Setup default request/response interceptors
  private setupDefaultInterceptors(): void {
    this.addRequestInterceptor(async config => {
      if (config.useAuth !== false) {
        const authHeaders = await this.getAuthHeaders();
        config.headers = { ...config.headers, ...authHeaders };
      }
      return config;
    });

    this.addResponseInterceptor(async response => {
      if (response.status === 401) {
        await AuthUtils.clearAuthData();
        throw new ApiError('Authentication expired', 401, 'AUTH_EXPIRED');
      }
      return response;
    });
  }

  // Get authentication headers
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (!API_CONFIG.USE_COOKIES) {
      const tokens = await AuthUtils.getStoredTokens();
      if (tokens?.accessToken) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    }
    return headers;
  }

  // Add request interceptor
  addRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>,
  ): void {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: (response: Response) => Response | Promise<Response>): void {
    this.responseInterceptors.push(interceptor);
  }

  // Add error interceptor
  addErrorInterceptor(interceptor: (error: Error) => Error | Promise<Error>): void {
    this.errorInterceptors.push(interceptor);
  }

  // Apply request interceptors
  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }
    return finalConfig;
  }

  // Apply response interceptors
  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let finalResponse = response;
    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse);
    }
    return finalResponse;
  }

  // Apply error interceptors
  private async applyErrorInterceptors(error: Error): Promise<Error> {
    let finalError = error;
    for (const interceptor of this.errorInterceptors) {
      finalError = await interceptor(finalError);
    }
    return finalError;
  }

  // Sleep utility for retry delay
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Core request method with retry logic and interceptors
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {},
    attempt: number = 0,
  ): Promise<ApiResponse<T>> {
    try {
      const finalConfig = await this.applyRequestInterceptors(config);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout || this.timeout);

      const requestInit: RequestInit = {
        method: finalConfig.method || HttpMethod.GET,
        headers: {
          'Content-Type': 'application/json',
          ...finalConfig.headers,
        },
        signal: controller.signal,
        credentials: API_CONFIG.USE_COOKIES ? 'include' : 'same-origin', // Enable cookies
        ...finalConfig,
      };

      console.log('Request method - finalConfig.body:', finalConfig.body);
      if (finalConfig.body) {
        if (finalConfig.body instanceof FormData) {
          delete (requestInit.headers as Record<string, string>)['Content-Type'];
          requestInit.body = finalConfig.body;
        } else {
          const serializedBody = JSON.stringify(finalConfig.body);
          console.log('Serialized body:', serializedBody);
          requestInit.body = serializedBody;
        }
      }

      // Make request
      const response = await fetch(`${this.baseURL}${endpoint}`, requestInit);
      clearTimeout(timeoutId);

      // Apply response interceptors
      const finalResponse = await this.applyResponseInterceptors(response);

      // Parse response
      const contentType = finalResponse.headers.get('content-type');
      let data: any;

      // Handle 304 Not Modified responses
      if (finalResponse.status === 304) {
        // For 304 responses, there's no body content, so return cached data structure
        return {
          success: true,
          data: undefined,
          status: finalResponse.status,
          headers: finalResponse.headers,
        };
      }

      if (contentType?.includes('application/json')) {
        data = await finalResponse.json();
      } else {
        data = await finalResponse.text();
      }

      // Handle HTTP errors
      if (!finalResponse.ok) {
        const error = new ApiError(
          data.message || `HTTP ${finalResponse.status}`,
          finalResponse.status,
          data.code,
          data,
        );
        throw await this.applyErrorInterceptors(error);
      }

      return {
        success: true,
        data,
        status: finalResponse.status,
        headers: finalResponse.headers,
      };
    } catch (error) {
      // Handle network errors and retries
      if (
        attempt < (config.retries || this.retryAttempts) &&
        (error instanceof TypeError ||
          (error instanceof ApiError && error.status !== undefined && error.status >= 500)) // Server error
      ) {
        await this.sleep(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        return this.request(endpoint, config, attempt + 1);
      }

      const finalError = await this.applyErrorInterceptors(error as Error);

      return {
        success: false,
        error: finalError.message,
        status: (finalError as ApiError).status,
        code: (finalError as ApiError).code,
      };
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: HttpMethod.GET });
  }

  async post<T>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    console.log('ApiClient.post called:', {
      endpoint,
      hasBody: !!body,
      bodyKeys: body ? Object.keys(body) : [],
    });
    return this.request<T>(endpoint, { ...config, method: HttpMethod.POST, body });
  }

  async put<T>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: HttpMethod.PUT, body });
  }

  async patch<T>(
    endpoint: string,
    body?: any,
    config?: Omit<RequestConfig, 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: HttpMethod.PATCH, body });
  }

  async delete<T>(
    endpoint: string,
    config?: Omit<RequestConfig, 'method'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: HttpMethod.DELETE });
  }

  // Upload file with progress tracking
  async upload<T>(
    endpoint: string,
    file: FormData,
    onProgress?: (progress: number) => void,
    config?: Omit<RequestConfig, 'method' | 'body'>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: HttpMethod.POST,
      body: file,
    });
  }
}

export const apiClient = new ApiClient();
