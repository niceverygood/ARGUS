'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Camera,
  Play,
  Pause,
  AlertTriangle,
  MapPin,
  Clock,
  Activity,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Crosshair,
  Shield,
  Plane,
  Package,
  User,
  Globe,
} from 'lucide-react';
import {
  useCCTVStatus,
  useCCTVCameras,
  useCCTVEventTypes,
  useCCTVEvents,
  useCCTVStatistics,
  useCCTVControl,
  CCTVEvent,
} from '@/hooks/useArgusAPI';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORY_CONFIG } from '@/lib/constants';

// =============================================================================
// 카테고리 아이콘 매핑
// =============================================================================

const categoryIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  TERROR: AlertTriangle,
  CYBER: Shield,
  SMUGGLING: Package,
  DRONE: Plane,
  INSIDER: User,
  GEOPOLITICAL: Globe,
};

// =============================================================================
// 데모 시나리오 정의
// =============================================================================

const DEMO_SCENARIOS = [
  { id: 'weapon', name: '무기 탐지', description: '보안검색대에서 무기 탐지', color: '#EF4444' },
  { id: 'drone', name: '드론 침입', description: '활주로 인근 드론 탐지', color: '#10B981' },
  { id: 'terror', name: '테러 위협', description: '복합 테러 위협 상황', color: '#D32F2F' },
  { id: 'smuggling', name: '밀수 시도', description: '밀수/침입 시도 탐지', color: '#3B82F6' },
  { id: 'insider', name: '내부자 위협', description: '내부자 이상 행동', color: '#F97316' },
  { id: 'crisis', name: '복합 위기', description: '다중 위협 상황', color: '#8B5CF6' },
];

// =============================================================================
// 메인 컴포넌트
// =============================================================================

export default function CCTVPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedZone, setSelectedZone] = useState<string | undefined>();
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Hooks
  const { status, loading: statusLoading, refetch: refetchStatus } = useCCTVStatus();
  const { cameras } = useCCTVCameras();
  const { eventTypes } = useCCTVEventTypes();
  const { events, loading: eventsLoading, refetch: refetchEvents } = useCCTVEvents({
    limit: 30,
    category: selectedCategory,
    zone: selectedZone,
  });
  const { statistics } = useCCTVStatistics();
  const {
    startSimulation,
    stopSimulation,
    triggerEvent,
    triggerScenario,
    isStarting,
    isStopping,
    isTriggering,
  } = useCCTVControl();

  // 구역 목록 추출
  const zones = [...new Set(cameras.map(cam => cam.zone))];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Video className="text-argus-secondary" />
            CCTV 시뮬레이터
          </h1>
          <p className="text-argus-dark-muted mt-1">
            영상 분석 기반 위협 탐지 시뮬레이션
          </p>
        </div>
        
        {/* 시뮬레이터 컨트롤 */}
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={status?.isRunning ? 'border-argus-guarded text-argus-guarded' : 'border-argus-dark-muted'}
          >
            <span className={`w-2 h-2 rounded-full mr-2 ${status?.isRunning ? 'bg-argus-guarded animate-pulse' : 'bg-argus-dark-muted'}`} />
            {status?.isRunning ? '실행 중' : '중지됨'}
          </Badge>
          
          {status?.isRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => stopSimulation()}
              disabled={isStopping}
              className="gap-2 border-argus-high text-argus-high hover:bg-argus-high/10"
            >
              <Pause size={14} />
              {isStopping ? '중지 중...' : '중지'}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startSimulation(30000, 0.4)}
              disabled={isStarting}
              className="gap-2 border-argus-guarded text-argus-guarded hover:bg-argus-guarded/10"
            >
              <Play size={14} />
              {isStarting ? '시작 중...' : '시작'}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              refetchStatus();
              refetchEvents();
            }}
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* 상태 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard
          title="카메라 수"
          value={status?.totalCameras || 0}
          icon={Camera}
          color="text-blue-400"
          loading={statusLoading}
        />
        <StatusCard
          title="이벤트 타입"
          value={status?.eventTypes || 0}
          icon={Crosshair}
          color="text-purple-400"
          loading={statusLoading}
        />
        <StatusCard
          title="총 탐지"
          value={statistics?.totalEvents || 0}
          icon={Activity}
          color="text-orange-400"
          loading={statusLoading}
        />
        <StatusCard
          title="평균 심각도"
          value={statistics?.avgSeverity || 0}
          icon={AlertTriangle}
          color="text-red-400"
          loading={statusLoading}
        />
      </div>

      {/* 데모 시나리오 */}
      <Card className="bg-argus-dark-card border-argus-dark-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="text-argus-accent" size={18} />
            데모 시나리오
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {DEMO_SCENARIOS.map((scenario) => (
              <Button
                key={scenario.id}
                variant="outline"
                size="sm"
                onClick={() => triggerScenario(scenario.id)}
                disabled={isTriggering}
                className="flex-col h-auto py-3 hover:border-argus-secondary"
                style={{ borderColor: scenario.color + '40' }}
              >
                <span className="text-xs font-medium" style={{ color: scenario.color }}>
                  {scenario.name}
                </span>
                <span className="text-[10px] text-argus-dark-muted mt-1">
                  {scenario.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 메인 컨텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 이벤트 목록 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 필터 */}
          <div className="flex items-center gap-3">
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || undefined)}
              className="h-9 px-3 rounded-lg bg-argus-dark-card border border-argus-dark-border text-sm"
            >
              <option value="">모든 카테고리</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
            
            <select
              value={selectedZone || ''}
              onChange={(e) => setSelectedZone(e.target.value || undefined)}
              className="h-9 px-3 rounded-lg bg-argus-dark-card border border-argus-dark-border text-sm"
            >
              <option value="">모든 구역</option>
              {zones.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          {/* 이벤트 리스트 */}
          <Card className="bg-argus-dark-card border-argus-dark-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="text-argus-high" size={18} />
                  최근 이벤트
                </span>
                <Badge variant="secondary">{events.length}건</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {eventsLoading ? (
                [...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))
              ) : events.length === 0 ? (
                <div className="py-8 text-center text-argus-dark-muted">
                  <Video className="mx-auto mb-2 opacity-50" size={32} />
                  <p>탐지된 이벤트가 없습니다</p>
                </div>
              ) : (
                <AnimatePresence>
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isExpanded={expandedEvent === event.id}
                      onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 사이드바 */}
        <div className="space-y-4">
          {/* 이벤트 트리거 */}
          <Card className="bg-argus-dark-card border-argus-dark-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Crosshair className="text-argus-secondary" size={18} />
                이벤트 트리거
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-argus-dark-muted mb-3">
                클릭하여 특정 이벤트를 즉시 발생시킵니다
              </p>
              <div className="grid grid-cols-2 gap-2">
                {eventTypes.slice(0, 8).map((et) => {
                  const Icon = categoryIcons[et.category] || AlertTriangle;
                  return (
                    <Button
                      key={et.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => triggerEvent(et.id)}
                      disabled={isTriggering}
                      className="justify-start text-xs h-auto py-2"
                    >
                      <Icon size={12} className="mr-1.5 flex-shrink-0" />
                      <span className="truncate">{et.title.replace('탐지', '').replace('감지', '')}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 카테고리별 통계 */}
          <Card className="bg-argus-dark-card border-argus-dark-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="text-argus-accent" size={18} />
                카테고리별 통계
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statistics?.byCategory && Object.entries(statistics.byCategory).map(([cat, count]) => {
                const config = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
                const Icon = categoryIcons[cat] || AlertTriangle;
                const percentage = statistics.totalEvents > 0 
                  ? Math.round((count / statistics.totalEvents) * 100) 
                  : 0;
                
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div
                      className="p-1.5 rounded"
                      style={{ backgroundColor: config?.color + '20' }}
                    >
                      <Icon size={14} style={{ color: config?.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-argus-dark-text">{config?.name || cat}</span>
                        <span className="text-argus-dark-muted">{count}건 ({percentage}%)</span>
                      </div>
                      <div className="h-1.5 bg-argus-dark-border rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: config?.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {(!statistics?.byCategory || Object.keys(statistics.byCategory).length === 0) && (
                <p className="text-center text-argus-dark-muted text-sm py-4">
                  통계 데이터 없음
                </p>
              )}
            </CardContent>
          </Card>

          {/* 구역별 통계 */}
          <Card className="bg-argus-dark-card border-argus-dark-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="text-argus-guarded" size={18} />
                구역별 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statistics?.byZone && Object.entries(statistics.byZone).map(([zone, count]) => (
                  <div key={zone} className="flex items-center justify-between text-sm">
                    <span className="text-argus-dark-muted">{zone}</span>
                    <Badge variant="outline">{count}건</Badge>
                  </div>
                ))}
                
                {(!statistics?.byZone || Object.keys(statistics.byZone).length === 0) && (
                  <p className="text-center text-argus-dark-muted text-sm py-2">
                    통계 데이터 없음
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 서브 컴포넌트
// =============================================================================

function StatusCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="bg-argus-dark-card border-argus-dark-border">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-8 w-12" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-argus-dark-card border-argus-dark-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-argus-dark-muted">{title}</span>
          <Icon size={16} className={color} />
        </div>
        <span className="text-2xl font-bold text-white font-mono">{value}</span>
      </CardContent>
    </Card>
  );
}

function EventCard({
  event,
  isExpanded,
  onToggle,
}: {
  event: CCTVEvent;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const categoryConfig = CATEGORY_CONFIG[event.category as keyof typeof CATEGORY_CONFIG];
  const Icon = categoryIcons[event.category] || AlertTriangle;
  const timeAgo = getTimeAgo(event.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-argus-dark-border/30 rounded-lg overflow-hidden"
    >
      <div
        className="p-3 cursor-pointer hover:bg-argus-dark-border/50 transition"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{ backgroundColor: categoryConfig?.color + '20' }}
          >
            <Icon size={16} style={{ color: categoryConfig?.color }} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white truncate">
                {event.title.replace('[CCTV] ', '')}
              </span>
              <Badge
                variant="outline"
                className="flex-shrink-0 text-[10px]"
                style={{ borderColor: categoryConfig?.color, color: categoryConfig?.color }}
              >
                {categoryConfig?.name || event.category}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-argus-dark-muted">
              <span className="flex items-center gap-1">
                <Camera size={10} />
                {event.metadata?.cameraName || event.sourceName}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {timeAgo}
              </span>
              <span className="flex items-center gap-1">
                <Activity size={10} />
                심각도: {event.severity}
              </span>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-argus-dark-border"
          >
            <div className="p-3 space-y-3 text-sm">
              <div>
                <span className="text-argus-dark-muted">설명:</span>
                <p className="text-argus-dark-text mt-1">{event.content}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-argus-dark-muted">신뢰도:</span>
                  <p className="text-argus-dark-text">{(event.confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-argus-dark-muted">구역:</span>
                  <p className="text-argus-dark-text">{event.metadata?.zone} / {event.metadata?.area}</p>
                </div>
              </div>
              
              {event.recommendation && (
                <div className="bg-argus-dark-card/50 rounded p-2">
                  <span className="text-argus-secondary text-xs">권장 조치:</span>
                  <p className="text-argus-dark-text text-xs mt-1">{event.recommendation}</p>
                </div>
              )}
              
              {event.keywords && event.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {event.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 bg-argus-dark-border rounded-full text-xs text-argus-dark-muted"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// 유틸리티 함수
// =============================================================================

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return `${diffSec}초 전`;
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  return then.toLocaleDateString('ko-KR');
}

