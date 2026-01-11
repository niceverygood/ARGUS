'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from './useWebSocket';
import { ThreatResponse, ThreatCategory, ThreatStatus } from '@/types';
import { useMemo } from 'react';

interface UseThreatsOptions {
  category?: ThreatCategory;
  status?: ThreatStatus;
  level?: number;
  limit?: number;
}

interface UseThreatsReturn {
  threats: ThreatResponse[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useThreats(options: UseThreatsOptions = {}): UseThreatsReturn {
  const { category, status, level, limit = 50 } = options;
  const { newThreats } = useWebSocket();

  const { 
    data: apiThreats = [], 
    isLoading, 
    error,
    refetch,
  } = useQuery({
    queryKey: ['threats', category, status, level, limit],
    queryFn: () => api.getThreats({ category, status, level, limit }),
    staleTime: 10000,
    refetchInterval: 30000,
  });

  // WebSocket 위협과 API 위협 병합
  const threats = useMemo(() => {
    const merged = [...newThreats];
    
    // API 위협 중 중복되지 않는 것만 추가
    for (const apiThreat of apiThreats) {
      if (!merged.some(t => t.id === apiThreat.id)) {
        merged.push(apiThreat);
      }
    }
    
    // 필터링
    let filtered = merged;
    
    if (category) {
      filtered = filtered.filter(t => t.category === category);
    }
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }
    if (level) {
      const ranges: Record<number, [number, number]> = {
        1: [0, 29],
        2: [30, 49],
        3: [50, 69],
        4: [70, 89],
        5: [90, 100],
      };
      const [min, max] = ranges[level] || [0, 100];
      filtered = filtered.filter(t => t.severity >= min && t.severity <= max);
    }
    
    // 최신순 정렬
    filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return filtered.slice(0, limit);
  }, [apiThreats, newThreats, category, status, level, limit]);

  return {
    threats,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

