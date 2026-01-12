'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThreatCategory } from '@/types';
import { CATEGORY_CONFIG, LEVEL_CONFIG } from '@/lib/constants';

// =============================================================================
// Node.js 백엔드 API URL (포트 3001)
// =============================================================================

export const NODE_API_URL = process.env.NEXT_PUBLIC_NODE_API_URL || 'http://localhost:3001/api';

// =============================================================================
// Types
// =============================================================================

interface ThreatLevel {
  id: string;
  min: number;
  max: number;
  label: string;
  labelKo: string;
  color: string;
  bgColor: string;
  description: string;
}

interface CategoryData {
  id: string;
  name: string;
  score: number;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

interface DashboardData {
  totalIndex: number;
  threatLevel: ThreatLevel | null;
  categories: Record<string, CategoryData>;
  change24h: number;
  changePercent: number;
  activeThreats: number;
  lastUpdated: string;
}

interface NodeThreat {
  id: string;
  source: string;
  sourceType: string;
  sourceName: string;
  title: string;
  content: string;
  url: string | null;
  publishedAt: string;
  category: string;
  isThreat: boolean;
  severity: number;
  confidence: number;
  summary: string;
  keywords: string[];
  recommendation: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'dismissed' | 'investigating';
  calculatedScore: number;
}

interface TrendPoint {
  timestamp: string;
  totalIndex: number;
  categories: Record<string, number>;
}

interface AnalyticsData {
  period: string;
  averageIndex: number;
  totalThreats: number;
  resolvedThreats: number;
  resolutionRate: number;
  averageResponseTime: string;
  categoryDistribution: Record<string, number>;
  trend: {
    direction: 'up' | 'down' | 'stable';
    change: number;
    changePercent: number;
  };
}

interface EvidenceData {
  categories: Record<string, {
    id: string;
    name: string;
    weight: number;
    keywords: string[];
    description: string;
  }>;
  levels: Record<string, ThreatLevel>;
  sourceCredibility: Record<string, number>;
  temporalDecay: Record<string, number>;
  formulas: {
    threatScore: {
      name: string;
      formula: string;
      description: string;
      parameters: Array<{ name: string; description: string; range: string }>;
    };
    totalIndex: {
      name: string;
      formula: string;
      description: string;
      parameters: Array<{ name: string; description: string; range: string }>;
    };
  };
}

interface Alert {
  id: string;
  type: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

// =============================================================================
// API 요청 헬퍼
// =============================================================================

async function nodeApiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${NODE_API_URL}${endpoint}`;
  
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

  const json = await response.json();
  
  // Node.js API는 { success: true, data: ... } 형태로 응답
  if (json.success && json.data !== undefined) {
    return json.data as T;
  }
  
  return json as T;
}

// =============================================================================
// useDashboard Hook
// =============================================================================

interface UseDashboardOptions {
  refreshInterval?: number;
}

interface UseDashboardReturn {
  data: DashboardData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDashboard(options: UseDashboardOptions = {}): UseDashboardReturn {
  const { refreshInterval = 60000 } = options;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['node-dashboard'],
    queryFn: () => nodeApiFetch<DashboardData>('/dashboard'),
    staleTime: 10000,
    refetchInterval: refreshInterval,
  });

  return {
    data: data || null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

// =============================================================================
// useThreats Hook (Node.js Backend)
// =============================================================================

interface UseNodeThreatsOptions {
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

interface UseNodeThreatsReturn {
  threats: NodeThreat[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useNodeThreats(options: UseNodeThreatsOptions = {}): UseNodeThreatsReturn {
  const { category, status, limit = 50, offset = 0 } = options;

  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (status) params.append('status', status);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['node-threats', category, status, limit, offset],
    queryFn: () => nodeApiFetch<{ threats: NodeThreat[]; total: number }>(`/threats?${params}`),
    staleTime: 10000,
    refetchInterval: 30000,
  });

  return {
    threats: data?.threats || [],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

// =============================================================================
// useAnalytics Hook
// =============================================================================

interface UseAnalyticsOptions {
  period?: '24h' | '7d' | '30d';
}

interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  loading: boolean;
  error: Error | null;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const { period = '24h' } = options;

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['node-analytics', period],
    queryFn: () => nodeApiFetch<AnalyticsData>(`/analytics?period=${period}`),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  return {
    data: data || null,
    loading: isLoading,
    error: error as Error | null,
  };
}

// =============================================================================
// useTrend Hook
// =============================================================================

interface UseTrendOptions {
  period?: '24h' | '7d' | '30d';
}

interface UseTrendReturn {
  data: TrendPoint[];
  summary: {
    direction: 'up' | 'down' | 'stable';
    change: number;
    changePercent: number;
  } | null;
  loading: boolean;
  error: Error | null;
}

export function useTrend(options: UseTrendOptions = {}): UseTrendReturn {
  const { period = '24h' } = options;

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['node-trend', period],
    queryFn: () => nodeApiFetch<{ points: TrendPoint[]; summary: { direction: string; change: number; changePercent: number } }>(`/trend?period=${period}`),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  return {
    data: data?.points || [],
    summary: data?.summary ? {
      direction: data.summary.direction as 'up' | 'down' | 'stable',
      change: data.summary.change,
      changePercent: data.summary.changePercent,
    } : null,
    loading: isLoading,
    error: error as Error | null,
  };
}

// =============================================================================
// useEvidence Hook
// =============================================================================

interface UseEvidenceReturn {
  data: EvidenceData | null;
  loading: boolean;
  error: Error | null;
}

export function useEvidence(): UseEvidenceReturn {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['node-evidence'],
    queryFn: () => nodeApiFetch<EvidenceData>('/evidence'),
    staleTime: 300000, // 5분
  });

  return {
    data: data || null,
    loading: isLoading,
    error: error as Error | null,
  };
}

// =============================================================================
// useRealTimeAlerts Hook (SSE)
// =============================================================================

interface UseRealTimeAlertsReturn {
  alerts: Alert[];
  isConnected: boolean;
  clearAlerts: () => void;
}

export function useRealTimeAlerts(): UseRealTimeAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // SSE 연결
    const eventSource = new EventSource(`${NODE_API_URL}/alerts/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected to alerts stream');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected' || data.type === 'heartbeat') {
          return;
        }

        // 새 알림 추가
        const newAlert: Alert = {
          id: data.id || `alert-${Date.now()}`,
          type: data.type || 'update',
          message: data.message || JSON.stringify(data),
          data: data.data,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setAlerts((prev) => [newAlert, ...prev].slice(0, 50));
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Error:', err);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    isConnected,
    clearAlerts,
  };
}

// =============================================================================
// useThreatUpdate Hook (위협 상태 업데이트)
// =============================================================================

interface UseThreatUpdateReturn {
  updateThreatStatus: (id: string, status: string) => Promise<void>;
  isUpdating: boolean;
  error: Error | null;
}

export function useThreatUpdate(): UseThreatUpdateReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return nodeApiFetch<NodeThreat>(`/threats/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node-threats'] });
      queryClient.invalidateQueries({ queryKey: ['node-dashboard'] });
    },
  });

  const updateThreatStatus = useCallback(async (id: string, status: string) => {
    await mutation.mutateAsync({ id, status });
  }, [mutation]);

  return {
    updateThreatStatus,
    isUpdating: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

// =============================================================================
// useSystemStatus Hook
// =============================================================================

interface SystemStatus {
  status: string;
  uptime: number;
  lastAnalysis: string;
  activeThreats: number;
  totalThreats: number;
  sseClients: number;
}

interface UseSystemStatusReturn {
  status: SystemStatus | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSystemStatus(): UseSystemStatusReturn {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['node-status'],
    queryFn: () => nodeApiFetch<SystemStatus>('/status'),
    staleTime: 5000,
    refetchInterval: 10000,
  });

  return {
    status: data || null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

// =============================================================================
// CCTV Simulator Hooks
// =============================================================================

interface CCTVCamera {
  id: string;
  name: string;
  zone: string;
  area: string;
  lat: number;
  lng: number;
}

interface CCTVEventType {
  id: string;
  category: string;
  title: string;
  baseSeverity: number;
  applicableAreas: string[];
}

interface CCTVEvent {
  id: string;
  source: string;
  sourceType: string;
  sourceName: string;
  title: string;
  content: string;
  category: string;
  severity: number;
  confidence: number;
  timestamp: string;
  status: string;
  keywords: string[];
  recommendation: string;
  metadata: {
    eventType: string;
    cameraId: string;
    cameraName: string;
    zone: string;
    area: string;
    location: {
      lat: number;
      lng: number;
    };
    frameUrl: string | null;
    analysisTime: number;
  };
}

interface CCTVStatistics {
  totalEvents: number;
  byCategory: Record<string, number>;
  byZone: Record<string, number>;
  avgSeverity: number;
}

interface CCTVStatus {
  isRunning: boolean;
  totalCameras: number;
  eventTypes: number;
  recentEvents: CCTVEvent[];
  statistics: CCTVStatistics;
}

// useCCTVStatus Hook
interface UseCCTVStatusReturn {
  status: CCTVStatus | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCCTVStatus(): UseCCTVStatusReturn {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cctv-status'],
    queryFn: () => nodeApiFetch<CCTVStatus>('/cctv/status'),
    staleTime: 5000,
    refetchInterval: 10000,
  });

  return {
    status: data || null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

// useCCTVCameras Hook
interface UseCCTVCamerasReturn {
  cameras: CCTVCamera[];
  total: number;
  loading: boolean;
  error: Error | null;
}

export function useCCTVCameras(): UseCCTVCamerasReturn {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['cctv-cameras'],
    queryFn: () => nodeApiFetch<{ total: number; cameras: CCTVCamera[] }>('/cctv/cameras'),
    staleTime: 300000, // 5분
  });

  return {
    cameras: data?.cameras || [],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
  };
}

// useCCTVEventTypes Hook
interface UseCCTVEventTypesReturn {
  eventTypes: CCTVEventType[];
  total: number;
  loading: boolean;
  error: Error | null;
}

export function useCCTVEventTypes(): UseCCTVEventTypesReturn {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['cctv-event-types'],
    queryFn: () => nodeApiFetch<{ total: number; eventTypes: CCTVEventType[] }>('/cctv/event-types'),
    staleTime: 300000, // 5분
  });

  return {
    eventTypes: data?.eventTypes || [],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
  };
}

// useCCTVEvents Hook
interface UseCCTVEventsOptions {
  limit?: number;
  category?: string;
  zone?: string;
}

interface UseCCTVEventsReturn {
  events: CCTVEvent[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCCTVEvents(options: UseCCTVEventsOptions = {}): UseCCTVEventsReturn {
  const { limit = 50, category, zone } = options;
  
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  if (category) params.append('category', category);
  if (zone) params.append('zone', zone);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cctv-events', limit, category, zone],
    queryFn: () => nodeApiFetch<{ total: number; events: CCTVEvent[] }>(`/cctv/events?${params}`),
    staleTime: 5000,
    refetchInterval: 10000,
  });

  return {
    events: data?.events || [],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

// useCCTVStatistics Hook
interface UseCCTVStatisticsReturn {
  statistics: CCTVStatistics | null;
  loading: boolean;
  error: Error | null;
}

export function useCCTVStatistics(): UseCCTVStatisticsReturn {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['cctv-statistics'],
    queryFn: () => nodeApiFetch<CCTVStatistics>('/cctv/statistics'),
    staleTime: 10000,
    refetchInterval: 30000,
  });

  return {
    statistics: data || null,
    loading: isLoading,
    error: error as Error | null,
  };
}

// useCCTVControl Hook
interface UseCCTVControlReturn {
  startSimulation: (interval?: number, probability?: number) => Promise<void>;
  stopSimulation: () => Promise<void>;
  triggerEvent: (eventType: string) => Promise<CCTVEvent | null>;
  triggerScenario: (scenario: string) => Promise<void>;
  isStarting: boolean;
  isStopping: boolean;
  isTriggering: boolean;
  error: Error | null;
}

export function useCCTVControl(): UseCCTVControlReturn {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: async ({ interval, probability }: { interval?: number; probability?: number }) => {
      return nodeApiFetch('/cctv/start', {
        method: 'POST',
        body: JSON.stringify({ interval, probability }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-status'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      return nodeApiFetch('/cctv/stop', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-status'] });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async (eventType: string) => {
      return nodeApiFetch<CCTVEvent>('/cctv/trigger', {
        method: 'POST',
        body: JSON.stringify({ eventType }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctv-events'] });
      queryClient.invalidateQueries({ queryKey: ['node-threats'] });
      queryClient.invalidateQueries({ queryKey: ['node-dashboard'] });
    },
  });

  const scenarioMutation = useMutation({
    mutationFn: async (scenario: string) => {
      return nodeApiFetch(`/cctv/demo/${scenario}`, { method: 'POST' });
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['cctv-events'] });
        queryClient.invalidateQueries({ queryKey: ['node-threats'] });
        queryClient.invalidateQueries({ queryKey: ['node-dashboard'] });
      }, 3000);
    },
  });

  return {
    startSimulation: useCallback(async (interval?: number, probability?: number) => {
      await startMutation.mutateAsync({ interval, probability });
    }, [startMutation]),
    stopSimulation: useCallback(async () => {
      await stopMutation.mutateAsync();
    }, [stopMutation]),
    triggerEvent: useCallback(async (eventType: string) => {
      const result = await triggerMutation.mutateAsync(eventType);
      return result || null;
    }, [triggerMutation]),
    triggerScenario: useCallback(async (scenario: string) => {
      await scenarioMutation.mutateAsync(scenario);
    }, [scenarioMutation]),
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isTriggering: triggerMutation.isPending || scenarioMutation.isPending,
    error: (startMutation.error || stopMutation.error || triggerMutation.error || scenarioMutation.error) as Error | null,
  };
}

// =============================================================================
// 통합 Export
// =============================================================================

export const nodeApi = {
  fetch: nodeApiFetch,
  baseUrl: NODE_API_URL,
};

export type {
  CCTVCamera,
  CCTVEventType,
  CCTVEvent,
  CCTVStatistics,
  CCTVStatus,
};

