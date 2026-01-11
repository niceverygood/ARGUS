'use client';

import { useState } from 'react';
import { ThreatGauge } from '@/components/dashboard/ThreatGauge';
import { CategoryCards } from '@/components/dashboard/CategoryCards';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { AlertFeed } from '@/components/dashboard/AlertFeed';
import { ThreatMap } from '@/components/dashboard/ThreatMap';
import { useThreatIndex } from '@/hooks/useThreatIndex';
import { useAlerts } from '@/hooks/useAlerts';
import { useThreats } from '@/hooks/useThreats';
import { ThreatLevel } from '@/types';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  
  // 시간 범위에 따른 시간 계산
  const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
  
  const { 
    threatIndex, 
    categories, 
    trend, 
    isLoading, 
    isConnected 
  } = useThreatIndex(hours);
  
  const { 
    alerts, 
    markAsRead, 
    markAllRead 
  } = useAlerts(15);
  
  const { threats } = useThreats({ limit: 30 });

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
          />
        </div>
      </div>

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

