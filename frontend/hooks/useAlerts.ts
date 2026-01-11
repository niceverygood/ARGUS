'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from './useWebSocket';
import { AlertResponse } from '@/types';
import { useCallback, useMemo } from 'react';

interface UseAlertsReturn {
  alerts: AlertResponse[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (alert: AlertResponse) => void;
  markAllRead: () => void;
}

export function useAlerts(limit: number = 20): UseAlertsReturn {
  const queryClient = useQueryClient();
  const { newAlerts } = useWebSocket();

  // API에서 알림 목록 가져오기
  const { 
    data: apiAlerts = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['alerts', limit],
    queryFn: () => api.getAlerts({ limit }),
    staleTime: 10000,
    refetchInterval: 30000,
  });

  // 읽음 처리 뮤테이션
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markAlertRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // 모두 읽음 처리 뮤테이션
  const markAllMutation = useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // WebSocket 알림과 API 알림 병합
  const alerts = useMemo(() => {
    const merged = [...newAlerts];
    
    // API 알림 중 중복되지 않는 것만 추가
    for (const apiAlert of apiAlerts) {
      if (!merged.some(a => a.id === apiAlert.id)) {
        merged.push(apiAlert);
      }
    }
    
    // 최신순 정렬
    merged.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return merged.slice(0, limit);
  }, [apiAlerts, newAlerts, limit]);

  // 읽지 않은 알림 수
  const unreadCount = useMemo(() => 
    alerts.filter(a => !a.is_read).length,
    [alerts]
  );

  // 읽음 처리
  const markAsRead = useCallback((alert: AlertResponse) => {
    if (!alert.is_read) {
      markReadMutation.mutate(alert.id);
    }
  }, [markReadMutation]);

  // 모두 읽음 처리
  const markAllRead = useCallback(() => {
    markAllMutation.mutate();
  }, [markAllMutation]);

  return {
    alerts,
    unreadCount,
    isLoading,
    error: error as Error | null,
    markAsRead,
    markAllRead,
  };
}

