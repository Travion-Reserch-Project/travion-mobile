import { BaseApiService } from './BaseApiService';

export type RoadIssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentType =
  | 'accident'
  | 'road_block'
  | 'traffic_jam'
  | 'pothole'
  | 'flooding'
  | 'landslide'
  | 'construction'
  | 'other';

export interface RoadIssueLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
}

export interface ReportRoadIssueInput {
  incident_type: IncidentType;
  title: string;
  location: RoadIssueLocation;
  incidentTime: string;
  description: string;
  severity?: RoadIssueSeverity;
  isAnonymous?: boolean;
}

export interface RoadIncident {
  _id: string;
  incident_type: IncidentType;
  title: string;
  description: string;
  severity: RoadIssueSeverity;
  status?: string;
  confirmations?: number;
  incidentTime?: string;
  location: RoadIssueLocation;
  reporter_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ApiListResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
}

type IncidentListResponseShape =
  | RoadIncident[]
  | {
      data?: RoadIncident[];
      incidents?: RoadIncident[];
      results?: RoadIncident[];
      items?: RoadIncident[];
    };

const toQuery = (params: Record<string, string | number | undefined>): string => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `?${query}` : '';
};

const extractIncidentList = (payload: IncidentListResponseShape | undefined): RoadIncident[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (Array.isArray(payload.incidents)) {
    return payload.incidents;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
};

class RoadIssueService extends BaseApiService {
  constructor() {
    super('/transport-incidents');
  }

  async reportIncident(data: ReportRoadIssueInput): Promise<ApiResult<RoadIncident>> {
    try {
      const response = await this.authenticatedPost<RoadIncident>('/report', data);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to report incident',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to report incident',
      };
    }
  }

  async getNearbyIncidents(
    latitude: number,
    longitude: number,
    radiusKm = 10,
  ): Promise<ApiListResult<RoadIncident>> {
    try {
      const query = toQuery({
        latitude,
        longitude,
        radius_km: radiusKm,
      });
      const response = await this.authenticatedGet<IncidentListResponseShape>(
        `/near-location${query}`,
      );

      if (response.success && response.data) {
        const incidents = extractIncidentList(response.data);
        return {
          success: true,
          data: incidents,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to load nearby incidents',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to load nearby incidents',
      };
    }
  }

  async getIncidentsForRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<ApiListResult<RoadIncident>> {
    try {
      const query = toQuery({
        origin_lat: originLat,
        origin_lng: originLng,
        dest_lat: destLat,
        dest_lng: destLng,
      });

      const response = await this.authenticatedGet<IncidentListResponseShape>(`/route${query}`);

      if (response.success && response.data) {
        const incidents = extractIncidentList(response.data);
        return {
          success: true,
          data: incidents,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to load route incidents',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to load route incidents',
      };
    }
  }

  async confirmIncident(incidentId: string): Promise<ApiResult<RoadIncident>> {
    try {
      const response = await this.authenticatedPost<RoadIncident>(`/${incidentId}/confirm`, {});

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to confirm incident',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to confirm incident',
      };
    }
  }

  async resolveIncident(incidentId: string, notes: string): Promise<ApiResult<RoadIncident>> {
    try {
      const response = await this.authenticatedPost<RoadIncident>(`/${incidentId}/resolve`, {
        resolution_notes: notes,
      });

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to resolve incident',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to resolve incident',
      };
    }
  }

  /**
   * Get incidents by route name
   */
  async getIncidentsByRouteName(routeName: string): Promise<ApiListResult<RoadIncident>> {
    try {
      const response = await this.authenticatedGet<IncidentListResponseShape>(
        `/route-name/${encodeURIComponent(routeName)}`,
      );

      if (response.success && response.data) {
        const incidents = extractIncidentList(response.data);
        return {
          success: true,
          data: incidents,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to load incidents by route name',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to load incidents by route name',
      };
    }
  }

  /**
   * Get incidents by district
   */
  async getIncidentsByDistrict(district: string): Promise<ApiListResult<RoadIncident>> {
    try {
      const response = await this.authenticatedGet<IncidentListResponseShape>(
        `/district/${encodeURIComponent(district)}`,
      );

      if (response.success && response.data) {
        const incidents = extractIncidentList(response.data);
        return {
          success: true,
          data: incidents,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to load district incidents',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to load district incidents',
      };
    }
  }

  /**
   * Get critical/high-priority incidents
   */
  async getCriticalIncidents(): Promise<ApiListResult<RoadIncident>> {
    try {
      const response = await this.authenticatedGet<IncidentListResponseShape>('/priority/high');

      if (response.success && response.data) {
        const incidents = extractIncidentList(response.data);
        return {
          success: true,
          data: incidents,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to load critical incidents',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to load critical incidents',
      };
    }
  }

  /**
   * Get incident statistics
   */
  async getStatistics(): Promise<ApiResult<Record<string, unknown>>> {
    try {
      const response = await this.authenticatedGet<Record<string, unknown>>('/statistics');

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to load statistics',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to load statistics',
      };
    }
  }

  /**
   * Get user's submitted reports
   */
  async getMyReports(limit = 10, skip = 0): Promise<ApiListResult<RoadIncident>> {
    try {
      const query = toQuery({ limit, skip });
      const response = await this.authenticatedGet<IncidentListResponseShape>(
        `/my-reports${query}`,
      );

      if (response.success && response.data) {
        const incidents = extractIncidentList(response.data);
        return {
          success: true,
          data: incidents,
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to load your reports',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to load your reports',
      };
    }
  }
}

export const roadIssueService = new RoadIssueService();
