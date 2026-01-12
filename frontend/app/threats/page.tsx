'use client';

import { useState, useMemo } from 'react';
import { useThreats } from '@/hooks/useThreats';
import { useNodeThreats, useThreatUpdate } from '@/hooks/useArgusAPI';
import { ThreatCategory, ThreatStatus, ThreatResponse } from '@/types';
import { CATEGORY_CONFIG, STATUS_CONFIG, LEVEL_CONFIG, ACTIVE_BACKEND } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatTimeAgo, getThreatLevel } from '@/lib/utils';

// Node.js 카테고리를 ThreatCategory로 변환
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

// ThreatCategory를 Node.js 형식으로 변환
function typeToNodeCategory(category: ThreatCategory | undefined): string | undefined {
  if (!category) return undefined;
  return category.toUpperCase();
}

export default function ThreatsPage() {
  const [selectedCategory, setSelectedCategory] = useState<ThreatCategory | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<ThreatStatus | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  
  const useNodeBackend = ACTIVE_BACKEND === 'node';

  // Python 백엔드 훅
  const pythonData = useThreats({
    category: selectedCategory,
    status: selectedStatus,
    limit: 50,
  });

  // Node.js 백엔드 훅
  const nodeData = useNodeThreats({
    category: typeToNodeCategory(selectedCategory),
    status: selectedStatus,
    limit: 50,
  });
  
  const { updateThreatStatus, isUpdating } = useThreatUpdate();

  // Node.js 위협 데이터를 기존 형식으로 변환
  const nodeThreatsConverted: ThreatResponse[] = useMemo(() => {
    if (!nodeData.threats) return [];
    
    return nodeData.threats.map(threat => ({
      id: threat.id,
      title: threat.title,
      description: threat.content,
      category: nodeCategoryToType(threat.category),
      severity: threat.severity,
      status: (threat.status === 'active' ? 'new' : threat.status) as ThreatStatus,
      source_type: threat.sourceType,
      source_name: threat.sourceName,
      source_url: threat.url || '',
      keywords: threat.keywords || [],
      summary: threat.summary,
      location: null,
      lat: null,
      lng: null,
      created_at: threat.timestamp,
      updated_at: threat.timestamp,
      time_ago: formatTimeAgo(threat.timestamp),
    }));
  }, [nodeData.threats]);

  // 실제 사용할 데이터 선택
  const threats = useNodeBackend ? nodeThreatsConverted : pythonData.threats;
  const isLoading = useNodeBackend ? nodeData.loading : pythonData.isLoading;

  // 위협 상태 변경 핸들러 (Node.js 백엔드용)
  const handleResolve = async (id: string) => {
    if (useNodeBackend) {
      await updateThreatStatus(id, 'resolved');
      nodeData.refetch();
    }
  };

  // 검색 필터링
  const filteredThreats = threats.filter(threat =>
    searchQuery === '' || 
    threat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    threat.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">위협 목록</h1>
          <p className="text-sm text-argus-dark-muted mt-1">
            탐지된 모든 위협 정보를 확인하고 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <AlertTriangle size={12} />
            총 {threats.length}건
          </Badge>
        </div>
      </div>

      {/* 필터 & 검색 */}
      <div className="flex flex-wrap items-center gap-4">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-argus-dark-muted" />
          <input
            type="text"
            placeholder="위협 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-argus-dark-card border border-argus-dark-border text-sm focus:outline-none focus:ring-1 focus:ring-argus-secondary"
          />
        </div>

        {/* 카테고리 필터 */}
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value as ThreatCategory || undefined)}
          className="h-10 px-3 rounded-lg bg-argus-dark-card border border-argus-dark-border text-sm focus:outline-none focus:ring-1 focus:ring-argus-secondary"
        >
          <option value="">모든 카테고리</option>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.name}</option>
          ))}
        </select>

        {/* 상태 필터 */}
        <select
          value={selectedStatus || ''}
          onChange={(e) => setSelectedStatus(e.target.value as ThreatStatus || undefined)}
          className="h-10 px-3 rounded-lg bg-argus-dark-card border border-argus-dark-border text-sm focus:outline-none focus:ring-1 focus:ring-argus-secondary"
        >
          <option value="">모든 상태</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.name}</option>
          ))}
        </select>

        {/* 필터 초기화 */}
        {(selectedCategory || selectedStatus || searchQuery) && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSelectedCategory(undefined);
              setSelectedStatus(undefined);
              setSearchQuery('');
            }}
          >
            초기화
          </Button>
        )}
      </div>

      {/* 위협 목록 테이블 */}
      <div className="bg-argus-dark-card rounded-xl border border-argus-dark-border overflow-hidden">
        {/* 테이블 헤더 */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-argus-dark-border/30 text-xs font-medium text-argus-dark-muted">
          <div className="col-span-1">상태</div>
          <div className="col-span-4">제목</div>
          <div className="col-span-2">카테고리</div>
          <div className="col-span-2">심각도</div>
          <div className="col-span-2">소스</div>
          <div className="col-span-1">시간</div>
        </div>

        {/* 테이블 바디 */}
        <div className="divide-y divide-argus-dark-border">
          {isLoading ? (
            [...Array(5)].map((_, i) => <RowSkeleton key={i} />)
          ) : filteredThreats.length === 0 ? (
            <div className="py-12 text-center text-argus-dark-muted">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
              <p>검색 결과가 없습니다</p>
            </div>
          ) : (
            filteredThreats.map((threat) => {
              const categoryConfig = CATEGORY_CONFIG[threat.category];
              const statusConfig = STATUS_CONFIG[threat.status];
              const level = getThreatLevel(threat.severity);
              const levelConfig = LEVEL_CONFIG[level];

              return (
                <div 
                  key={threat.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-argus-dark-border/20 transition cursor-pointer items-center"
                >
                  {/* 상태 */}
                  <div className="col-span-1">
                    <span 
                      className={`inline-block w-2 h-2 rounded-full ${
                        level === 5 ? 'animate-pulse' : ''
                      }`}
                      style={{ backgroundColor: levelConfig.color }}
                    />
                  </div>

                  {/* 제목 */}
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-white truncate">
                      {threat.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {threat.location && (
                        <span className="flex items-center gap-1 text-xs text-argus-dark-muted">
                          <MapPin size={10} />
                          {threat.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 카테고리 */}
                  <div className="col-span-2">
                    <Badge 
                      variant="outline"
                      style={{ 
                        borderColor: categoryConfig?.color,
                        color: categoryConfig?.color,
                      }}
                    >
                      {categoryConfig?.name || threat.category}
                    </Badge>
                  </div>

                  {/* 심각도 */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-argus-dark-border rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${threat.severity}%`,
                            backgroundColor: levelConfig.color,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono" style={{ color: levelConfig.color }}>
                        {threat.severity}
                      </span>
                    </div>
                  </div>

                  {/* 소스 */}
                  <div className="col-span-2">
                    <p className="text-xs text-argus-dark-muted truncate">
                      {threat.source_name}
                    </p>
                  </div>

                  {/* 시간 & 액션 */}
                  <div className="col-span-1 flex items-center justify-between">
                    <span className="text-xs text-argus-dark-muted">
                      {threat.time_ago || formatTimeAgo(threat.created_at)}
                    </span>
                    {useNodeBackend && threat.status !== 'resolved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(threat.id);
                        }}
                        disabled={isUpdating}
                      >
                        <CheckCircle size={12} className="mr-1" />
                        해결
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4">
      <div className="col-span-1"><Skeleton className="h-2 w-2 rounded-full" /></div>
      <div className="col-span-4"><Skeleton className="h-4 w-full" /></div>
      <div className="col-span-2"><Skeleton className="h-6 w-20 rounded-full" /></div>
      <div className="col-span-2"><Skeleton className="h-2 w-full rounded-full" /></div>
      <div className="col-span-2"><Skeleton className="h-4 w-24" /></div>
      <div className="col-span-1"><Skeleton className="h-4 w-12" /></div>
    </div>
  );
}

