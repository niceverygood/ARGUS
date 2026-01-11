'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ThreatCategory } from '@/types';
import { CATEGORY_CONFIG, LEVEL_CONFIG } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Clock,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface CategoryDetailModalProps {
  category: ThreatCategory | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryDetailModal({ category, isOpen, onClose }: CategoryDetailModalProps) {
  const config = category ? CATEGORY_CONFIG[category] : null;
  
  // 해당 카테고리의 위협 목록 조회
  const { data: threats = [], isLoading } = useQuery({
    queryKey: ['threats', category],
    queryFn: () => api.getThreats({ category: category!, limit: 10 }),
    enabled: isOpen && !!category,
  });

  if (!category || !config) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl" onClose={onClose}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <AlertTriangle size={20} style={{ color: config.color }} />
            </div>
            <div>
              <DialogTitle>{config.name}</DialogTitle>
              <DialogDescription>{config.nameEn} Threats</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <DialogBody>
          {/* 통계 요약 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-argus-dark-bg rounded-lg p-4">
              <div className="text-sm text-argus-dark-muted mb-1">활성 위협</div>
              <div className="text-2xl font-bold text-white">
                {threats.filter(t => t.status === 'new' || t.status === 'analyzing').length}
              </div>
            </div>
            <div className="bg-argus-dark-bg rounded-lg p-4">
              <div className="text-sm text-argus-dark-muted mb-1">확인됨</div>
              <div className="text-2xl font-bold text-argus-high">
                {threats.filter(t => t.status === 'confirmed').length}
              </div>
            </div>
            <div className="bg-argus-dark-bg rounded-lg p-4">
              <div className="text-sm text-argus-dark-muted mb-1">해결됨</div>
              <div className="text-2xl font-bold text-argus-guarded">
                {threats.filter(t => t.status === 'resolved').length}
              </div>
            </div>
          </div>

          {/* 위협 목록 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-argus-dark-muted">최근 위협 목록</h3>
            
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : threats.length === 0 ? (
              <div className="text-center py-8 text-argus-dark-muted">
                현재 등록된 위협이 없습니다.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {threats.map((threat) => {
                  const levelConfig = LEVEL_CONFIG[threat.level as keyof typeof LEVEL_CONFIG];
                  return (
                    <div 
                      key={threat.id}
                      className="bg-argus-dark-bg rounded-lg p-4 hover:bg-argus-dark-border/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              style={{ 
                                borderColor: levelConfig?.color,
                                color: levelConfig?.color,
                              }}
                            >
                              Level {threat.level}
                            </Badge>
                            <span className="text-xs text-argus-dark-muted">
                              {threat.status === 'new' && '신규'}
                              {threat.status === 'analyzing' && '분석중'}
                              {threat.status === 'confirmed' && '확인됨'}
                              {threat.status === 'resolved' && '해결됨'}
                            </span>
                          </div>
                          <h4 className="font-medium text-white truncate">{threat.title}</h4>
                          <p className="text-sm text-argus-dark-muted line-clamp-2 mt-1">
                            {threat.description || '상세 설명이 없습니다.'}
                          </p>
                        </div>
                        <div className="text-right text-xs text-argus-dark-muted whitespace-nowrap">
                          <div className="flex items-center gap-1 justify-end">
                            <Clock size={12} />
                            {new Date(threat.detected_at).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {threat.location && (
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <MapPin size={12} />
                              {threat.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 더보기 버튼 */}
          <div className="mt-4 pt-4 border-t border-argus-dark-border">
            <a 
              href={`/threats?category=${category}`}
              className="flex items-center justify-center gap-2 text-sm text-argus-secondary hover:text-argus-primary transition-colors"
            >
              전체 {config.name} 목록 보기
              <ExternalLink size={14} />
            </a>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

