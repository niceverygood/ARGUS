'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Bell, 
  Shield, 
  Zap, 
  Play, 
  RotateCcw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export default function SettingsPage() {
  const [triggering, setTriggering] = useState<string | null>(null);

  const { data: demoStatus, refetch } = useQuery({
    queryKey: ['demoStatus'],
    queryFn: api.getDemoStatus,
    staleTime: 5000,
  });

  const handleTriggerScenario = async (scenario: 'cyber' | 'missile' | 'drone' | 'stabilize') => {
    setTriggering(scenario);
    try {
      await api.triggerScenario(scenario);
      await refetch();
    } finally {
      setTriggering(null);
    }
  };

  const handleReset = async () => {
    setTriggering('reset');
    try {
      await api.resetDemo();
      await refetch();
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-white">설정</h1>
        <p className="text-sm text-argus-dark-muted mt-1">
          시스템 설정 및 데모 시나리오 관리
        </p>
      </div>

      {/* 시스템 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield size={18} />
            시스템 상태
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-argus-dark-muted">시뮬레이션 상태</span>
            <Badge variant={demoStatus?.is_running ? 'default' : 'outline'}>
              {demoStatus?.is_running ? '실행 중' : '중지됨'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-argus-dark-muted">현재 위협 지수</span>
            <span className="font-mono font-bold" style={{ 
              color: demoStatus?.current_level === 5 ? '#D32F2F' :
                     demoStatus?.current_level === 4 ? '#F57C00' :
                     demoStatus?.current_level === 3 ? '#FBC02D' :
                     demoStatus?.current_level === 2 ? '#689F38' : '#1976D2'
            }}>
              {demoStatus?.current_index?.toFixed(1) || '0.0'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-argus-dark-muted">위협 레벨</span>
            <Badge variant={
              demoStatus?.current_level === 5 ? 'critical' :
              demoStatus?.current_level === 4 ? 'high' :
              demoStatus?.current_level === 3 ? 'elevated' :
              demoStatus?.current_level === 2 ? 'guarded' : 'low'
            }>
              Level {demoStatus?.current_level} - {demoStatus?.level_name}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-argus-dark-muted">활성 위협 수</span>
            <span className="font-mono">{demoStatus?.active_threats || 0}건</span>
          </div>
        </CardContent>
      </Card>

      {/* 데모 시나리오 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap size={18} />
            데모 시나리오
          </CardTitle>
          <CardDescription>
            프레젠테이션용 시나리오를 실행합니다. 키보드 단축키로도 실행할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {demoStatus?.available_scenarios?.map((scenario) => (
            <div 
              key={scenario.id}
              className="flex items-center justify-between p-4 bg-argus-dark-border/30 rounded-lg"
            >
              <div>
                <p className="font-medium text-white">{scenario.name}</p>
                <p className="text-sm text-argus-dark-muted">{scenario.description}</p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {scenario.shortcut}
                </Badge>
              </div>
              <Button
                onClick={() => handleTriggerScenario(scenario.id as any)}
                disabled={triggering !== null}
                className="gap-2"
              >
                {triggering === scenario.id ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Play size={14} />
                )}
                실행
              </Button>
            </div>
          ))}

          {/* 초기화 버튼 */}
          <div className="pt-4 border-t border-argus-dark-border">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={triggering !== null}
              className="gap-2"
            >
              {triggering === 'reset' ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <RotateCcw size={14} />
              )}
              데모 초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell size={18} />
            알림 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">대시보드 알림</p>
              <p className="text-sm text-argus-dark-muted">새 위협 탐지 시 알림 표시</p>
            </div>
            <CheckCircle size={20} className="text-argus-guarded" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Critical 레벨 경고</p>
              <p className="text-sm text-argus-dark-muted">Level 5 도달 시 화면 경고</p>
            </div>
            <CheckCircle size={20} className="text-argus-guarded" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">사운드 알림</p>
              <p className="text-sm text-argus-dark-muted">High/Critical 알림 시 효과음</p>
            </div>
            <AlertTriangle size={20} className="text-argus-dark-muted" />
          </div>
        </CardContent>
      </Card>

      {/* 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings size={18} />
            시스템 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-argus-dark-muted">버전</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-argus-dark-muted">API 서버</span>
            <span className="font-mono text-xs">localhost:8000</span>
          </div>
          <div className="flex justify-between">
            <span className="text-argus-dark-muted">WebSocket</span>
            <span className="font-mono text-xs">ws://localhost:8000/ws</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

