'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAlerts } from '@/hooks/useAlerts';
import { ThreatLevel } from '@/types';
import { getThreatLevel } from '@/lib/utils';
import { api } from '@/lib/api';

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { isConnected, threatIndex } = useWebSocket();
  const { unreadCount } = useAlerts();
  const [currentLevel, setCurrentLevel] = useState<ThreatLevel>(2);
  const [showCriticalOverlay, setShowCriticalOverlay] = useState(false);

  // 위협 지수 업데이트
  useEffect(() => {
    if (threatIndex?.level) {
      const level = threatIndex.level as ThreatLevel;
      setCurrentLevel(level);
      
      // Critical 레벨일 때 오버레이 표시
      if (level === 5) {
        setShowCriticalOverlay(true);
      } else {
        setShowCriticalOverlay(false);
      }
    }
  }, [threatIndex]);

  // 데모 시나리오 키보드 단축키
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            await api.triggerScenario('cyber');
            break;
          case '2':
            e.preventDefault();
            await api.triggerScenario('missile');
            break;
          case '3':
            e.preventDefault();
            await api.triggerScenario('drone');
            break;
          case '4':
            e.preventDefault();
            await api.triggerScenario('stabilize');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Critical 레벨 오버레이 */}
      {showCriticalOverlay && (
        <div className="critical-overlay" />
      )}
      
      <div className="flex h-screen overflow-hidden">
        <Sidebar currentLevel={currentLevel} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNav 
            title="대시보드" 
            unreadAlerts={unreadCount}
            isConnected={isConnected}
          />
          
          <main className="flex-1 overflow-auto p-6 bg-argus-dark-bg bg-grid">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

