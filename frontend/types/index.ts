// ============ Threat Types ============
export interface ThreatIndexResponse {
  total_index: number;
  level: number;
  level_name: string;
  categories: CategoryIndices;
  change_24h: number;
  timestamp: string;
}

export interface CategoryIndices {
  terror: number;
  cyber: number;
  smuggling: number;
  drone: number;
  insider: number;
  geopolitical: number;
}

export interface ThreatResponse {
  id: string;
  title: string;
  description: string;
  category: ThreatCategory;
  severity: number;
  credibility: number;
  source_type: string;
  source_name: string;
  threat_score: number;
  status: ThreatStatus;
  location?: string;
  latitude?: number;
  longitude?: number;
  keywords: string[];
  created_at: string;
  time_ago: string;
}

export interface AlertResponse {
  id: string;
  level: number;
  title: string;
  message: string;
  threat_id?: string;
  is_read: boolean;
  created_at: string;
  time_ago: string;
}

export interface TrendDataPoint {
  timestamp: string;
  total: number;
  terror: number;
  cyber: number;
  smuggling: number;
  drone: number;
  insider: number;
  geopolitical: number;
}

// ============ Enums & Literals ============
export type ThreatLevel = 1 | 2 | 3 | 4 | 5;
export type ThreatCategory = 'terror' | 'cyber' | 'smuggling' | 'drone' | 'insider' | 'geopolitical';
export type ThreatStatus = 'new' | 'analyzing' | 'confirmed' | 'resolved' | 'false_positive';

// ============ WebSocket Types ============
export type WebSocketMessageType = 'threat_index' | 'new_threat' | 'new_alert' | 'threat_update' | 'demo_event' | 'initial_state';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: unknown;
  timestamp?: string;
}

// ============ Analytics Types ============
export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface SourceStats {
  source_type: string;
  count: number;
  avg_credibility: number;
}

export interface KPIMetrics {
  avg_threat_index: number;
  total_threats_detected: number;
  resolved_rate: number;
  confirmed_threats: number;
  avg_severity: number;
  avg_response_time_minutes: number;
  change_vs_yesterday: number;
}

// ============ Demo Types ============
export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  shortcut: string;
}

export interface DemoStatus {
  is_running: boolean;
  current_index: number;
  current_level: number;
  level_name: string;
  active_threats: number;
  categories: CategoryIndices;
  available_scenarios: DemoScenario[];
}

