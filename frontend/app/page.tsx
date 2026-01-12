'use client';

import { useState, useMemo } from 'react';
import { ThreatGauge } from '@/components/dashboard/ThreatGauge';
import { CategoryCards } from '@/components/dashboard/CategoryCards';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { AlertFeed } from '@/components/dashboard/AlertFeed';
import { ThreatMap } from '@/components/dashboard/ThreatMap';
import { CategoryDetailModal } from '@/components/dashboard/CategoryDetailModal';
import { useThreatIndex } from '@/hooks/useThreatIndex';
import { useAlerts } from '@/hooks/useAlerts';
import { useThreats } from '@/hooks/useThreats';
import { useDashboard, useTrend, useRealTimeAlerts } from '@/hooks/useArgusAPI';
import { ThreatLevel, ThreatCategory } from '@/types';
import { ACTIVE_BACKEND, CATEGORY_CONFIG } from '@/lib/constants';

// Node.js 위협 레벨을 숫자로 변환
function nodeLevelToNumber(level: string | null): ThreatLevel {
  switch (level) {
    case 'LOW': return 1;
    case 'GUARDED': return 2;
    case 'ELEVATED': return 3;
    case 'HIGH': return 4;
    case 'CRITICAL': return 5;
    default: return 1;
  }
}

// Node.js 카테고리 ID를 ThreatCategory로 변환
function nodeCategoryToType(nodeCategory: string): ThreatCategory {
  const mapping: Record<string, ThreatCategory> = {
    'TERROR': 'terror',
    'CYBER': 'cyber',
    'SMUGGLING': 'smuggling',
    'DRONE': 'drone',
    'INSIDER': 'insider',
    'GEOPOLITICAL': 'geopolitical',
  };
  return mapping[nodeCategory] || 'terror';
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedCategory, setSelectedCategory] = useState<ThreatCategory | null>(null);
  
  // 시간 범위에 따른 시간 계산
  const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
  
  // Python 백엔드 훅
  const pythonData = useThreatIndex(hours);
  const pythonAlerts = useAlerts(15);
  const pythonThreats = useThreats({ limit: 30 });
  
  // Node.js 백엔드 훅
  const nodeDashboard = useDashboard({ refreshInterval: 30000 });
  const nodeTrend = useTrend({ period: timeRange });
  const nodeAlerts = useRealTimeAlerts();

  // 백엔드 선택에 따른 데이터
  const useNodeBackend = ACTIVE_BACKEND === 'node';
  
  // Node.js 데이터를 기존 형식에 맞게 변환
  const nodeCategories = useMemo(() => {
    if (!nodeDashboard.data?.categories) return [];
    
    return Object.entries(nodeDashboard.data.categories).map(([nodeId, data]) => ({
      category: nodeCategoryToType(nodeId),
      name: data.name,
      index: data.score,
      threatCount: data.count,
      change: data.trend === 'up' ? 5 : data.trend === 'down' ? -5 : 0,
    }));
  }, [nodeDashboard.data]);

  const nodeTrendData = useMemo(() => {
    if (!nodeTrend.data) return [];
    
    return nodeTrend.data.map(point => ({
      timestamp: point.timestamp,
      total_index: point.totalIndex,
      ...point.categories,
    }));
  }, [nodeTrend.data]);

  // 실제 사용할 데이터 선택
  const threatIndex = useNodeBackend ? (nodeDashboard.data ? {
    total_index: nodeDashboard.data.totalIndex,
    level: nodeLevelToNumber(nodeDashboard.data.threatLevel?.id || null),
    level_name: nodeDashboard.data.threatLevel?.label || 'LOW',
    change_24h: nodeDashboard.data.change24h,
    categories: {} as Record<ThreatCategory, number>,
  } : null) : pythonData.threatIndex;
  
  const categories = useNodeBackend ? nodeCategories : pythonData.categories;
  const trend = useNodeBackend ? nodeTrendData : pythonData.trend;
  const isLoading = useNodeBackend ? nodeDashboard.loading : pythonData.isLoading;
  const isConnected = useNodeBackend ? nodeAlerts.isConnected : pythonData.isConnected;
  
  const alerts = useNodeBackend 
    ? nodeAlerts.alerts.map(a => ({
        id: a.id,
        level: 3,
        message: a.message,
        threat_id: null,
        is_read: false,
        created_at: a.timestamp,
      }))
    : pythonAlerts.alerts;
    
  const markAsRead = pythonAlerts.markAsRead;
  const markAllRead = useNodeBackend ? nodeAlerts.clearAlerts : pythonAlerts.markAllRead;
  
  const threats = pythonThreats.threats;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 상단: 게이지 + 카테고리 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ThreatGauge
            value={threatIndex?.total_index || 0}
            level={(threatIndex?.level || 1) as ThreatLevel}
            levelName={threatIndex?.level_name || 'LOW'}
            change24h={threatIndex?.change_24h || 0}
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-2">
          <CategoryCards
            categories={categories}
            isLoading={isLoading}
            onCategoryClick={setSelectedCategory}
          />
        </div>
      </div>

      {/* 카테고리 상세 모달 */}
      <CategoryDetailModal
        category={selectedCategory}
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
      />

      {/* 중단: 트렌드 + 알림 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendChart
            data={trend}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-1">
          <AlertFeed
            alerts={alerts}
            onAlertClick={markAsRead}
            onMarkAllRead={markAllRead}
          />
        </div>
      </div>

      {/* 하단: 지도 */}
      <ThreatMap 
        threats={threats}
        isLoading={isLoading}
      />

      {/* 데모 단축키 도움말 (개발용) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-argus-dark-card/90 backdrop-blur-sm p-3 rounded-lg border border-argus-dark-border text-xs text-argus-dark-muted z-50">
          <p className="font-medium text-argus-dark-text mb-2">데모 단축키</p>
          <ul className="space-y-1">
            <li>Ctrl+Shift+1: 사이버 공격</li>
            <li>Ctrl+Shift+2: 미사일 발사</li>
            <li>Ctrl+Shift+3: 드론 침입</li>
            <li>Ctrl+Shift+4: 상황 안정화</li>
          </ul>
        </div>
      )}
    </div>
  );
}

