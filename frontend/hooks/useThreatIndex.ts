'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from './useWebSocket';
import { ThreatIndexResponse, TrendDataPoint, ThreatCategory } from '@/types';
import { CATEGORY_CONFIG } from '@/lib/constants';

interface CategoryData {
  category: ThreatCategory;
  name: string;
  index: number;
  threatCount: number;
  change: number;
}

interface UseThreatIndexReturn {
  threatIndex: ThreatIndexResponse | null;
  categories: CategoryData[];
  trend: TrendDataPoint[];
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
}

export function useThreatIndex(trendHours: number = 24): UseThreatIndexReturn {
  const { threatIndex: realtimeIndex, isConnected } = useWebSocket();

  // 초기 위협 지수 (API)
  const { 
    data: initialIndex, 
    isLoading: indexLoading, 
    error: indexError 
  } = useQuery({
    queryKey: ['threatIndex'],
    queryFn: api.getThreatIndex,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  // 트렌드 데이터
  const { 
    data: trend = [], 
    isLoading: trendLoading 
  } = useQuery({
    queryKey: ['trend', trendHours],
    queryFn: () => api.getTrend(trendHours),
    staleTime: 60000,
    refetchInterval: 60000,
  });

  // 위협 요약 (카테고리별 건수)
  const { data: summary } = useQuery({
    queryKey: ['threatSummary'],
    queryFn: api.getThreatSummary,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // 실시간 데이터 우선, 없으면 API 데이터 사용
  const threatIndex = realtimeIndex || initialIndex || null;

  // 카테고리 데이터 변환
  const categories: CategoryData[] = Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
    const category = key as ThreatCategory;
    const index = threatIndex?.categories?.[category] ?? 0;
    const count = summary?.by_category?.[category] ?? 0;
    
    // 변화율은 시뮬레이션
    const change = Math.round((Math.random() - 0.5) * 10 * 10) / 10;
    
    return {
      category,
      name: config.name,
      index,
      threatCount: count,
      change,
    };
  });

  return {
    threatIndex,
    categories,
    trend,
    isLoading: indexLoading || trendLoading,
    error: indexError as Error | null,
    isConnected,
  };
}

