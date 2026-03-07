import { BaseApiService } from './BaseApiService';

export interface IncidentReportInput {
  incidentType:
    | 'Pickpocketing'
    | 'Bag Snatching'
    | 'Scam'
    | 'Money Theft'
    | 'Harassment'
    | 'Extortion'
    | 'Theft'
    | 'Other';
  location: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
  incidentTime: string; // ISO 8601 format
  description: string;
  photoUrl?: string;
  isAnonymous?: boolean;
  reporterDeviceToken?: string; // FCM token of the reporting device to exclude from push notifications
}

export interface IncidentReport {
  _id: string;
  userId?: string;
  incidentType: string;
  location: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
  incidentTime: string;
  description: string;
  photoUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentReportResponse {
  success: boolean;
  data?: IncidentReport;
  error?: string;
}

export interface IncidentReportsListResponse {
  success: boolean;
  data?: IncidentReport[];
  pagination?: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
  error?: string;
}

export interface IncidentStatistics {
  _id: string;
  count: number;
}

export interface IncidentStatisticsResponse {
  success: boolean;
  data?: IncidentStatistics[];
  error?: string;
}

export class IncidentReportService extends BaseApiService {
  constructor() {
    super('/incidents');
  }

  /**
   * Create a new incident report
   * Public endpoint - authentication optional (supports anonymous reports)
   */
  async createReport(reportData: IncidentReportInput): Promise<IncidentReportResponse> {
    try {
      const response = await this.unauthenticatedPost<IncidentReportResponse>(
        '/report',
        reportData,
      );

      if (response.success && response.data) {
        return response.data;
      }

      return {
        success: false,
        error: response.message || 'Failed to create incident report',
      };
    } catch (error) {
      console.error('Create incident report error:', error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to create incident report',
      };
    }
  }

  /**
   * Get incident report by ID
   */
  async getReportById(reportId: string): Promise<IncidentReportResponse> {
    try {
      const response = await this.authenticatedGet<IncidentReportResponse>(`/${reportId}`);

      if (response.success && response.data) {
        return response.data;
      }

      return {
        success: false,
        error: response.message || 'Report not found',
      };
    } catch (error) {
      console.error('Get report by ID error:', error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to get report',
      };
    }
  }

  /**
   * Get user's incident reports (requires authentication)
   */
  async getUserReports(limit = 10, skip = 0): Promise<IncidentReportsListResponse> {
    try {
      const response = await this.authenticatedGet<IncidentReportsListResponse>(
        `/user/reports?limit=${limit}&skip=${skip}`,
      );

      if (response.success && response.data) {
        return response.data;
      }

      return {
        success: false,
        error: response.message || 'Failed to get user reports',
      };
    } catch (error) {
      console.error('Get user reports error:', error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to get user reports',
      };
    }
  }

  /**
   * Get nearby incident reports
   */
  async getNearbyReports(
    latitude: number,
    longitude: number,
    radius = 5,
    limit = 10,
  ): Promise<IncidentReportsListResponse> {
    try {
      const response = await this.authenticatedGet<IncidentReportsListResponse>(
        `/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}&limit=${limit}`,
      );

      if (response.success && response.data) {
        return response.data;
      }

      return {
        success: false,
        error: response.message || 'Failed to get nearby reports',
      };
    } catch (error) {
      console.error('Get nearby reports error:', error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to get nearby reports',
      };
    }
  }

  /**
   * Get reports by incident type
   */
  async getReportsByType(
    incidentType: string,
    limit = 10,
    skip = 0,
  ): Promise<IncidentReportsListResponse> {
    try {
      const response = await this.authenticatedGet<IncidentReportsListResponse>(
        `/type/${incidentType}?limit=${limit}&skip=${skip}`,
      );

      if (response.success && response.data) {
        return response.data;
      }

      return {
        success: false,
        error: response.message || 'Failed to get reports by type',
      };
    } catch (error) {
      console.error('Get reports by type error:', error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to get reports by type',
      };
    }
  }

  /**
   * Get statistics by incident type
   */
  async getStatistics(): Promise<IncidentStatisticsResponse> {
    try {
      const response = await this.authenticatedGet<IncidentStatisticsResponse>('/statistics');

      if (response.success && response.data) {
        return response.data;
      }

      return {
        success: false,
        error: response.message || 'Failed to get statistics',
      };
    } catch (error) {
      console.error('Get statistics error:', error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to get statistics',
      };
    }
  }
}

export default new IncidentReportService();
