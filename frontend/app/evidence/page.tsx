'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Database, 
  FileText, 
  Calculator, 
  Server, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function EvidencePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('sources');
  const [selectedHours, setSelectedHours] = useState(24);

  // Fetch all evidence data
  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['dataSources'],
    queryFn: api.getDataSources,
  });

  const { data: categories } = useQuery({
    queryKey: ['categoryInfo'],
    queryFn: api.getCategoryInfo,
  });

  const { data: levels } = useQuery({
    queryKey: ['threatLevels'],
    queryFn: api.getThreatLevels,
  });

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['evidenceSummary', selectedHours],
    queryFn: () => api.getEvidenceSummary(selectedHours),
    refetchInterval: 30000,
  });

  const { data: collectionStats } = useQuery({
    queryKey: ['collectionStats', selectedHours],
    queryFn: () => api.getCollectionStats(selectedHours),
  });

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Database className="text-argus-secondary" />
            데이터 근거 및 로그
          </h1>
          <p className="text-argus-dark-muted mt-1">
            위협 데이터의 출처, 수집 방법, 수치화 근거를 확인합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedHours}
            onChange={(e) => setSelectedHours(Number(e.target.value))}
            className="bg-argus-dark-card border border-argus-dark-border rounded-lg px-3 py-2 text-sm"
          >
            <option value={24}>최근 24시간</option>
            <option value={72}>최근 3일</option>
            <option value={168}>최근 7일</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSummary()}
            className="gap-2"
          >
            <RefreshCw size={14} />
            새로고침
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="데이터 수집"
          value={summary?.summary.data_collection_runs || 0}
          label="회 실행"
          icon={Database}
          color="text-blue-400"
        />
        <SummaryCard
          title="점수 계산"
          value={summary?.summary.score_calculations || 0}
          label="회 수행"
          icon={Calculator}
          color="text-purple-400"
        />
        <SummaryCard
          title="위협 처리"
          value={summary?.summary.threats_processed || 0}
          label="건 분석"
          icon={AlertTriangle}
          color="text-orange-400"
        />
        <SummaryCard
          title="지수 기록"
          value={summary?.summary.index_snapshots || 0}
          label="회 스냅샷"
          icon={FileText}
          color="text-green-400"
        />
      </div>

      {/* Data Sources Section */}
      <CollapsibleSection
        title="데이터 출처 (Data Sources)"
        subtitle="위협 정보를 수집하는 모든 데이터 출처와 신뢰도"
        icon={Database}
        isExpanded={expandedSection === 'sources'}
        onToggle={() => toggleSection('sources')}
      >
        {sourcesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Credibility Scale */}
            <div className="bg-argus-dark-border/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3">신뢰도 척도</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {sources?.credibility_scale && Object.entries(sources.credibility_scale).map(([range, desc]) => (
                  <div key={range} className="text-xs">
                    <span className="text-argus-secondary font-mono">{range}</span>
                    <span className="text-argus-dark-muted ml-2">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sources?.sources && Object.entries(sources.sources).map(([key, source]: [string, any]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-argus-dark-card rounded-xl p-4 border border-argus-dark-border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-white">{source.name}</h4>
                      <p className="text-xs text-argus-dark-muted mt-1">{source.description}</p>
                    </div>
                    <CredibilityBadge value={source.credibility} />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-argus-dark-muted">
                      <Server size={12} />
                      <span>수집 방법: {source.collection_method}</span>
                    </div>
                    <div className="flex items-center gap-2 text-argus-dark-muted">
                      <Clock size={12} />
                      <span>업데이트: {source.update_frequency}</span>
                    </div>
                  </div>
                  {/* Examples */}
                  {source.examples && (
                    <div className="mt-3 pt-3 border-t border-argus-dark-border">
                      <p className="text-xs text-argus-dark-muted mb-1">예시 출처:</p>
                      <div className="flex flex-wrap gap-1">
                        {source.examples.map((ex: string) => (
                          <span key={ex} className="text-xs px-2 py-0.5 bg-argus-dark-border rounded-full text-argus-dark-text">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Data Types */}
                  {source.data_types && (
                    <div className="mt-2">
                      <p className="text-xs text-argus-dark-muted mb-1">수집 데이터:</p>
                      <div className="flex flex-wrap gap-1">
                        {source.data_types.map((dt: string) => (
                          <span key={dt} className="text-xs px-2 py-0.5 bg-argus-secondary/10 rounded-full text-argus-secondary">
                            {dt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Validation Method */}
                  {source.validation_method && (
                    <div className="mt-2 text-xs text-argus-dark-muted flex items-center gap-1">
                      <CheckCircle size={10} className="text-argus-guarded" />
                      검증: {source.validation_method}
                    </div>
                  )}
                  {/* Collection Stats */}
                  {collectionStats?.stats_by_source?.[key] && (
                    <div className="mt-3 pt-3 border-t border-argus-dark-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-argus-dark-muted">
                          수집: {collectionStats.stats_by_source[key].total_items_collected}건
                        </span>
                        <span className={`font-medium ${
                          collectionStats.stats_by_source[key].success_rate > 90 
                            ? 'text-argus-guarded' 
                            : 'text-argus-elevated'
                        }`}>
                          성공률: {collectionStats.stats_by_source[key].success_rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Categories Section */}
      <CollapsibleSection
        title="위협 카테고리 (Categories)"
        subtitle="위협 분류 체계와 각 카테고리의 가중치"
        icon={FileText}
        isExpanded={expandedSection === 'categories'}
        onToggle={() => toggleSection('categories')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.categories && Object.entries(categories.categories).map(([key, cat]: [string, any]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-argus-dark-card rounded-xl p-4 border border-argus-dark-border"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">{cat.name}</h4>
                <Badge variant="outline" className="text-argus-secondary">
                  가중치: {(cat.weight * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="text-xs text-argus-dark-muted">{cat.description}</p>
              
              {/* Weight Visualization */}
              <div className="mt-3">
                <div className="h-2 bg-argus-dark-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-argus-secondary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.weight * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Subcategories */}
              {cat.subcategories && (
                <div className="mt-3 pt-3 border-t border-argus-dark-border">
                  <p className="text-xs text-argus-dark-muted mb-2">세부 유형:</p>
                  <div className="flex flex-wrap gap-1">
                    {cat.subcategories.map((sub: string) => (
                      <span key={sub} className="text-xs px-2 py-0.5 bg-argus-dark-border rounded-full text-argus-dark-text">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {cat.risk_factors && (
                <div className="mt-2">
                  <p className="text-xs text-argus-dark-muted mb-1">위험 요소:</p>
                  <ul className="text-xs text-argus-high space-y-0.5">
                    {cat.risk_factors.map((rf: string) => (
                      <li key={rf} className="flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {rf}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Response Protocol */}
              {cat.response_protocol && (
                <div className="mt-2 text-xs p-2 bg-argus-dark-border/30 rounded-lg">
                  <p className="text-argus-dark-muted mb-1">대응 프로토콜:</p>
                  <p className="text-argus-dark-text">{cat.response_protocol}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Threat Levels Section */}
      <CollapsibleSection
        title="위협 레벨 정의 (Threat Levels)"
        subtitle="위협 지수에 따른 경보 단계 정의"
        icon={AlertTriangle}
        isExpanded={expandedSection === 'levels'}
        onToggle={() => toggleSection('levels')}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {levels?.levels && Object.entries(levels.levels)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([level, config]: [string, any]) => (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-argus-dark-card rounded-xl p-4 border border-argus-dark-border"
                style={{ borderColor: config.color + '40' }}
              >
                <div className="text-center mb-4">
                  <div 
                    className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold"
                    style={{ backgroundColor: config.color + '20', color: config.color }}
                  >
                    {level}
                  </div>
                  <h4 className="font-bold text-white text-lg">{config.name}</h4>
                  <p className="text-sm font-mono mt-1" style={{ color: config.color }}>
                    {config.min} - {config.max}
                  </p>
                </div>

                <p className="text-xs text-argus-dark-muted text-center mb-3">
                  {config.description}
                </p>

                {config.detailed_description && (
                  <p className="text-xs text-argus-dark-text bg-argus-dark-border/30 p-2 rounded-lg mb-3">
                    {config.detailed_description}
                  </p>
                )}

                {/* Actions */}
                {config.actions && (
                  <div className="space-y-1 mb-3">
                    <p className="text-xs text-argus-dark-muted">대응 조치:</p>
                    <ul className="text-xs space-y-1">
                      {config.actions.map((action: string, i: number) => (
                        <li key={i} className="flex items-start gap-1 text-argus-dark-text">
                          <span className="text-argus-secondary">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Staff Alert */}
                {config.staff_alert && (
                  <div className="text-xs border-t border-argus-dark-border pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-argus-dark-muted">직원 상태:</span>
                      <span style={{ color: config.color }}>{config.staff_alert}</span>
                    </div>
                  </div>
                )}

                {/* Passenger Notice */}
                {config.passenger_notice && (
                  <div className="text-xs mt-1">
                    <div className="flex justify-between">
                      <span className="text-argus-dark-muted">승객 안내:</span>
                      <span className="text-argus-dark-text text-right">{config.passenger_notice}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
        </div>
      </CollapsibleSection>

      {/* Calculation Formula Section */}
      <CollapsibleSection
        title="점수 계산 공식 (Score Calculation)"
        subtitle="위협 점수가 어떻게 계산되는지 상세 공식"
        icon={Calculator}
        isExpanded={expandedSection === 'formula'}
        onToggle={() => toggleSection('formula')}
      >
        <div className="space-y-6">
          {/* Individual Threat Score */}
          <div className="bg-argus-dark-border/30 rounded-lg p-6">
            <h4 className="text-sm font-medium text-white mb-4">개별 위협 점수 계산</h4>
            <div className="bg-argus-dark-bg rounded-lg p-4 font-mono text-sm">
              <code className="text-argus-accent">
                threat_score = min(100, max(0, severity × category_weight × source_credibility × temporal_factor × 2))
              </code>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-argus-secondary font-medium">severity</span>
                <span className="text-argus-dark-muted ml-2">: 원본 심각도 (0-100)</span>
              </div>
              <div>
                <span className="text-argus-secondary font-medium">category_weight</span>
                <span className="text-argus-dark-muted ml-2">: 카테고리 가중치 (0.1-0.25)</span>
              </div>
              <div>
                <span className="text-argus-secondary font-medium">source_credibility</span>
                <span className="text-argus-dark-muted ml-2">: 출처 신뢰도 (0.2-1.0)</span>
              </div>
              <div>
                <span className="text-argus-secondary font-medium">temporal_factor</span>
                <span className="text-argus-dark-muted ml-2">: 시간 감쇠 계수 (0.1-1.0)</span>
              </div>
            </div>
          </div>

          {/* Total Index Calculation */}
          <div className="bg-argus-dark-border/30 rounded-lg p-6">
            <h4 className="text-sm font-medium text-white mb-4">통합 위협 지수 계산</h4>
            <div className="bg-argus-dark-bg rounded-lg p-4 font-mono text-sm">
              <code className="text-argus-accent">
                total_index = min(100, max(0, Σ(category_index × category_weight) × 1.5))
              </code>
            </div>
            <div className="mt-4 text-xs text-argus-dark-muted">
              각 카테고리의 평균 위협 점수에 가중치를 적용하여 합산 후 1.5배 스케일링
            </div>
          </div>

          {/* Temporal Decay */}
          <div className="bg-argus-dark-border/30 rounded-lg p-6">
            <h4 className="text-sm font-medium text-white mb-4">시간 감쇠 (Temporal Decay)</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              {[
                { time: '< 1시간', factor: '1.0' },
                { time: '1-6시간', factor: '0.9' },
                { time: '6-24시간', factor: '0.7' },
                { time: '1-3일', factor: '0.5' },
                { time: '3-7일', factor: '0.3' },
                { time: '> 7일', factor: '0.1' },
              ].map(({ time, factor }) => (
                <div key={time} className="bg-argus-dark-bg rounded-lg p-3 text-center">
                  <div className="text-argus-secondary font-mono font-bold">{factor}</div>
                  <div className="text-argus-dark-muted mt-1">{time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// =============================================================================
// Sub Components
// =============================================================================

function SummaryCard({ 
  title, 
  value, 
  label, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  label: string; 
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="bg-argus-dark-card border-argus-dark-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-argus-dark-border/50 ${color}`}>
            <Icon size={20} />
          </div>
          <div>
            <p className="text-xs text-argus-dark-muted">{title}</p>
            <p className="text-xl font-bold text-white">
              {value.toLocaleString()}
              <span className="text-sm font-normal text-argus-dark-muted ml-1">{label}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-argus-dark-card border-argus-dark-border">
      <CardHeader
        className="cursor-pointer hover:bg-argus-dark-border/20 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-argus-secondary/20">
              <Icon size={20} className="text-argus-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-sm text-argus-dark-muted">{subtitle}</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="text-argus-dark-muted" />
          ) : (
            <ChevronDown className="text-argus-dark-muted" />
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

function CredibilityBadge({ value }: { value: number }) {
  const getColor = (v: number) => {
    if (v >= 0.8) return 'bg-argus-guarded/20 text-argus-guarded';
    if (v >= 0.6) return 'bg-argus-elevated/20 text-argus-elevated';
    if (v >= 0.4) return 'bg-argus-high/20 text-argus-high';
    return 'bg-argus-critical/20 text-argus-critical';
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColor(value)}`}>
      신뢰도: {(value * 100).toFixed(0)}%
    </span>
  );
}

