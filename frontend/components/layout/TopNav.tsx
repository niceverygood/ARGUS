'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, Clock, Radio, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TopNavProps {
  title?: string;
  unreadAlerts?: number;
  isConnected?: boolean;
}

export function TopNav({ 
  title = '대시보드', 
  unreadAlerts = 0, 
  isConnected = true 
}: TopNavProps) {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-argus-dark-card border-b border-argus-dark-border">
      {/* 좌측: 페이지 제목 */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white">{title}</h1>
      </div>

      {/* 중앙: 검색바 */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-argus-dark-muted" />
          <input
            type="text"
            placeholder="위협 검색..."
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-argus-dark-border/50 border border-argus-dark-border text-sm text-argus-dark-text placeholder:text-argus-dark-muted focus:outline-none focus:ring-1 focus:ring-argus-secondary focus:border-argus-secondary"
          />
        </div>
      </div>

      {/* 우측: 상태 표시 */}
      <div className="flex items-center gap-4">
        {/* 연결 상태 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-argus-dark-border/50">
          <Radio 
            className={`w-3 h-3 ${isConnected ? 'text-argus-guarded animate-pulse' : 'text-argus-critical'}`} 
          />
          <span className={`text-xs font-medium ${isConnected ? 'text-argus-guarded' : 'text-argus-critical'}`}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* 알림 벨 */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadAlerts > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-argus-critical text-white text-xs font-bold">
              {unreadAlerts > 9 ? '9+' : unreadAlerts}
            </span>
          )}
        </Button>

        {/* 현재 시간 */}
        <div className="flex items-center gap-2 text-argus-dark-muted">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">{currentTime}</span>
        </div>

        {/* 공항 선택 */}
        <Button variant="outline" className="gap-2">
          <span className="text-sm">인천국제공항</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}

