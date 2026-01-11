'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { wsClient } from '@/lib/websocket';
import { ThreatIndexResponse, ThreatResponse, AlertResponse } from '@/types';

interface UseWebSocketReturn {
  isConnected: boolean;
  threatIndex: ThreatIndexResponse | null;
  newThreats: ThreatResponse[];
  newAlerts: AlertResponse[];
  clearNewThreats: () => void;
  clearNewAlerts: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [threatIndex, setThreatIndex] = useState<ThreatIndexResponse | null>(null);
  const [newThreats, setNewThreats] = useState<ThreatResponse[]>([]);
  const [newAlerts, setNewAlerts] = useState<AlertResponse[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // WebSocket 연결
    wsClient.connect().catch(console.error);

    // 연결 상태 리스너
    const unsubConnection = wsClient.onConnectionChange((connected) => {
      if (mountedRef.current) {
        setIsConnected(connected);
      }
    });

    // 초기 상태 리스너
    const unsubInitial = wsClient.subscribe('initial_state', (data) => {
      if (mountedRef.current && data) {
        const state = data as {
          total_index: number;
          level: number;
          level_name: string;
          categories: ThreatIndexResponse['categories'];
        };
        setThreatIndex({
          total_index: state.total_index,
          level: state.level,
          level_name: state.level_name,
          categories: state.categories,
          change_24h: 0,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 위협 지수 리스너
    const unsubThreatIndex = wsClient.subscribe('threat_index', (data) => {
      if (mountedRef.current && data) {
        setThreatIndex(data as ThreatIndexResponse);
      }
    });

    // 새 위협 리스너
    const unsubNewThreat = wsClient.subscribe('new_threat', (data) => {
      if (mountedRef.current && data) {
        setNewThreats((prev) => [data as ThreatResponse, ...prev].slice(0, 20));
      }
    });

    // 새 알림 리스너
    const unsubNewAlert = wsClient.subscribe('new_alert', (data) => {
      if (mountedRef.current && data) {
        setNewAlerts((prev) => [data as AlertResponse, ...prev].slice(0, 30));
      }
    });

    // 데모 이벤트 리스너
    const unsubDemo = wsClient.subscribe('demo_event', (data) => {
      if (mountedRef.current) {
        console.log('[Demo Event]', data);
      }
    });

    // 클린업
    return () => {
      mountedRef.current = false;
      unsubConnection();
      unsubInitial();
      unsubThreatIndex();
      unsubNewThreat();
      unsubNewAlert();
      unsubDemo();
    };
  }, []);

  const clearNewThreats = useCallback(() => {
    setNewThreats([]);
  }, []);

  const clearNewAlerts = useCallback(() => {
    setNewAlerts([]);
  }, []);

  return {
    isConnected,
    threatIndex,
    newThreats,
    newAlerts,
    clearNewThreats,
    clearNewAlerts,
  };
}

