import { 
  ThreatIndexResponse, 
  ThreatResponse, 
  AlertResponse, 
  TrendDataPoint,
  CategoryDistribution,
  SourceStats,
  KPIMetrics,
  DemoStatus,
} from '@/types';
import { API_BASE_URL } from './constants';

/**
 * API 클라이언트 클래스
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // ============ Analytics API ============
  getThreatIndex = () => this.get<ThreatIndexResponse>('/analytics/threat-index');
  
  getTrend = (hours: number = 24, interval: string = 'hour') => 
    this.get<TrendDataPoint[]>('/analytics/trend', { hours, interval });
  
  getCategoryDistribution = () => 
    this.get<CategoryDistribution[]>('/analytics/category-distribution');
  
  getSourceStats = () => this.get<SourceStats[]>('/analytics/source-stats');
  
  getKPI = () => this.get<KPIMetrics>('/analytics/kpi');

  // ============ Threats API ============
  getThreats = (params?: {
    category?: string;
    status?: string;
    level?: number;
    limit?: number;
    offset?: number;
  }) => this.get<ThreatResponse[]>('/threats', params);

  getThreat = (id: string) => this.get<ThreatResponse>(`/threats/${id}`);
  
  getThreatSummary = () => this.get<{
    total_count: number;
    by_category: Record<string, number>;
    by_status: Record<string, number>;
    avg_severity: number;
    change_24h: number;
  }>('/threats/stats/summary');

  // ============ Alerts API ============
  getAlerts = (params?: {
    is_read?: boolean;
    level?: number;
    limit?: number;
  }) => this.get<AlertResponse[]>('/alerts', params);

  markAlertRead = (id: string) => this.post(`/alerts/${id}/read`);
  
  markAllRead = () => this.post('/alerts/read-all');
  
  getUnreadCount = () => this.get<{ unread_count: number }>('/alerts/unread-count');

  // ============ Demo API ============
  getDemoStatus = () => this.get<DemoStatus>('/demo/status');
  
  triggerScenario = (scenario: 'cyber' | 'missile' | 'drone' | 'stabilize') =>
    this.post<{ success: boolean; message: string }>(`/demo/scenario/${scenario}`);
  
  resetDemo = () => this.post('/demo/reset');

  // ============ Health Check ============
  healthCheck = () => this.get<{ status: string; service: string }>('/health');

  // ============ Evidence & Logs API ============
  getDataSources = () => this.get<{
    sources: Record<string, {
      name: string;
      credibility: number;
      description: string;
      collection_method: string;
      update_frequency: string;
    }>;
    credibility_scale: Record<string, string>;
  }>('/evidence/sources');

  getCategoryInfo = () => this.get<{
    categories: Record<string, {
      weight: number;
      name: string;
      description: string;
    }>;
  }>('/evidence/categories');

  getThreatLevels = () => this.get<{
    levels: Record<number, {
      name: string;
      min: number;
      max: number;
      color: string;
      description: string;
    }>;
  }>('/evidence/levels');

  getThreatScoreBreakdown = (threatId: string) => this.get<{
    threat_id: string;
    threat_title: string;
    threat_score: number;
    calculation_details: {
      input: Record<string, unknown>;
      weights: Record<string, unknown>;
      calculation_steps: string[];
      formula: string;
      final_score: number;
    };
    source_evidence: {
      source_type: string;
      source_name: string;
      source_url: string;
      source_info: Record<string, unknown>;
    };
  }>(`/evidence/threat/${threatId}/score-breakdown`);

  getCollectionLogs = (params?: {
    source_type?: string;
    status?: string;
    hours?: number;
    limit?: number;
  }) => this.get<{
    logs: Array<{
      id: string;
      source_type: string;
      source_name: string;
      collection_method: string;
      status: string;
      items_collected: number;
      duration_ms: number;
      created_at: string;
    }>;
    total_count: number;
  }>('/evidence/logs/collection', params);

  getCollectionStats = (hours?: number) => this.get<{
    stats_by_source: Record<string, {
      total_runs: number;
      successful_runs: number;
      failed_runs: number;
      total_items_collected: number;
      success_rate: number;
    }>;
  }>('/evidence/logs/collection/stats', { hours });

  getCalculationLogs = (params?: {
    calculation_type?: string;
    threat_id?: string;
    hours?: number;
    limit?: number;
  }) => this.get<{
    logs: Array<{
      id: string;
      threat_id: string;
      calculation_type: string;
      final_score: number;
      formula_used: string;
      calculation_steps: string[];
      calculated_at: string;
    }>;
  }>('/evidence/logs/calculations', params);

  getIndexHistory = (hours?: number) => this.get<{
    history: Array<{
      recorded_at: string;
      total_index: number;
      level: number;
      level_name: string;
      categories: Record<string, number>;
      calculation_details: Record<string, unknown>;
    }>;
  }>('/evidence/index-history', { hours });

  getSystemLogs = (params?: {
    event_category?: string;
    event_type?: string;
    hours?: number;
    limit?: number;
  }) => this.get<{
    logs: Array<{
      id: string;
      event_type: string;
      event_category: string;
      description: string;
      created_at: string;
    }>;
  }>('/evidence/logs/system', params);

  getEvidenceSummary = (hours?: number) => this.get<{
    summary: {
      data_collection_runs: number;
      score_calculations: number;
      threats_processed: number;
      index_snapshots: number;
    };
    data_sources_configured: number;
    categories_configured: number;
    system_status: string;
  }>('/evidence/summary', { hours });
}

// 싱글톤 인스턴스
export const api = new ApiClient(API_BASE_URL);

