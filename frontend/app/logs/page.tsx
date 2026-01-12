'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { nodeApi } from '@/hooks/useArgusAPI';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Database, 
  Brain, 
  ChevronRight, 
  ChevronDown,
  Clock,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  FileText,
  Cpu,
  Target,
  Shield,
  Zap,
  BarChart,
  RefreshCw
} from 'lucide-react';
import { CATEGORY_CONFIG } from '@/lib/constants';

// 탭 타입
type TabType = 'ai-reasoning' | 'collection';

// AI 추론 로그 타입 (Node.js 백엔드용)
interface AIReasoningLog {
  id: string;
  timestamp: string;
  articleTitle: string;
  articleSource: string;
  analysisMethod: string;
  analysisModel: string;
  processingSteps: ProcessingStep[];
  extractedEntities: Record<string, string[]>;
  extractedKeywords: string[];
  categoryReasoning: {
    selectedCategory: string;
    confidence: number;
    indicators: string[];
  };
  severityReasoning: {
    finalSeverity: number;
    riskFactors: string[];
    mitigatingFactors: string[];
  };
  uncertainties: string[];
  recommendation: string;
  overallAssessment: string;
}

interface ProcessingStep {
  step: number;
  name: string;
  description: string;
  input?: string;
  output?: string;
  duration: string;
  status?: string;
}

// 데이터 수집 로그 타입 (Node.js 백엔드용)
interface CollectionLog {
  id: string;
  timestamp: string;
  source: string;
  sourceType: string;
  sourceName: string;
  articlesCollected: number;
  articlesFiltered: number;
  status: string;
  duration: string;
  sampleArticles: Array<{title: string; category: string; severity: number}>;
}

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ai-reasoning');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // AI 추론 로그 조회 (Node.js 백엔드)
  const { data: aiLogs, isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ['ai-reasoning-logs'],
    queryFn: async () => {
      return await nodeApi.fetch<{logs: AIReasoningLog[], total: number}>('/logs/ai-reasoning?limit=50');
    },
    refetchInterval: 30000,
  });

  // 데이터 수집 로그 조회 (Node.js 백엔드)
  const { data: collectionLogs, isLoading: collectionLoading, refetch: refetchCollection } = useQuery({
    queryKey: ['collection-logs'],
    queryFn: async () => {
      return await nodeApi.fetch<{logs: CollectionLog[], total: number, lastCollection: string}>('/logs/collection?limit=50');
    },
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    if (activeTab === 'ai-reasoning') {
      refetchAI();
    } else {
      refetchCollection();
    }
  };

  return (
    <div className="min-h-screen bg-argus-dark-bg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="w-7 h-7 text-argus-primary" />
            AI 분석 로그
          </h1>
          <p className="text-argus-dark-muted mt-1">
            데이터 수집 과정과 AI 추론 과정을 실시간으로 확인합니다
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-argus-dark-card border border-argus-dark-border rounded-lg hover:border-argus-primary/50 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-argus-primary" />
          <span className="text-white">새로고침</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('ai-reasoning')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'ai-reasoning'
              ? 'bg-argus-primary text-white'
              : 'bg-argus-dark-card text-argus-dark-muted hover:text-white border border-argus-dark-border'
          }`}
        >
          <Brain className="w-4 h-4" />
          AI 추론 로그
          {aiLogs?.total && (
            <Badge variant="secondary" className="ml-1 bg-argus-dark-bg/50">
              {aiLogs.total}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('collection')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'collection'
              ? 'bg-argus-secondary text-white'
              : 'bg-argus-dark-card text-argus-dark-muted hover:text-white border border-argus-dark-border'
          }`}
        >
          <Database className="w-4 h-4" />
          데이터 수집 로그
          {collectionLogs?.total && (
            <Badge variant="secondary" className="ml-1 bg-argus-dark-bg/50">
              {collectionLogs.total}
            </Badge>
          )}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'ai-reasoning' ? (
          <motion.div
            key="ai-reasoning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {aiLoading ? (
              <LoadingSkeleton />
            ) : (
              aiLogs?.logs?.map((log: AIReasoningLog) => (
                <AIReasoningLogCard
                  key={log.id}
                  log={log}
                  isExpanded={expandedLogId === log.id}
                  onToggle={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                />
              ))
            )}
            {!aiLoading && (!aiLogs?.logs || aiLogs.logs.length === 0) && (
              <EmptyState message="AI 추론 로그가 없습니다" />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="collection"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {collectionLoading ? (
              <LoadingSkeleton />
            ) : (
              collectionLogs?.logs?.map((log: CollectionLog) => (
                <CollectionLogCard
                  key={log.id}
                  log={log}
                  isExpanded={expandedLogId === log.id}
                  onToggle={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                />
              ))
            )}
            {!collectionLoading && (!collectionLogs?.logs || collectionLogs.logs.length === 0) && (
              <EmptyState message="데이터 수집 로그가 없습니다" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// AI 추론 로그 카드 컴포넌트 (Node.js 백엔드용)
function AIReasoningLogCard({ 
  log, 
  isExpanded, 
  onToggle 
}: { 
  log: AIReasoningLog; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const categoryName = CATEGORY_CONFIG[log.categoryReasoning?.selectedCategory as keyof typeof CATEGORY_CONFIG]?.name || log.categoryReasoning?.selectedCategory;
  
  return (
    <motion.div
      layout
      className="bg-argus-dark-card rounded-xl border border-argus-dark-border overflow-hidden"
    >
      {/* Header - Always Visible */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer hover:bg-argus-dark-bg/30 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-argus-primary" />
            ) : (
              <ChevronRight className="w-5 h-5 text-argus-dark-muted" />
            )}
            <Brain className="w-5 h-5 text-argus-primary" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium line-clamp-1">{log.articleTitle?.substring(0, 50)}...</span>
                <Badge variant="outline" className="text-sm text-white border-gray-500">
                  {categoryName}
                </Badge>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                {log.analysisModel || 'keyword_based'} • {log.articleSource}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConfidenceBadge value={log.categoryReasoning?.confidence || 0.5} />
            <div className="text-right">
              <p className="text-sm text-gray-400">
                {new Date(log.timestamp).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-argus-dark-border overflow-hidden"
          >
            <div className="p-4 space-y-6">
              {/* 분석 대상 */}
              <Section title="📥 분석 대상" icon={FileText}>
                <div className="bg-argus-dark-bg rounded-lg p-4">
                  <p className="text-white font-medium mb-2">{log.articleTitle}</p>
                  <p className="text-sm text-gray-300">출처: {log.articleSource}</p>
                </div>
              </Section>

              {/* AI 처리 단계 */}
              <Section title="⚙️ AI 처리 단계" icon={Cpu}>
                <div className="space-y-3">
                  {log.processingSteps?.map((step) => (
                    <div
                      key={step.step}
                      className="bg-argus-dark-bg rounded-lg p-3 border-l-2 border-argus-primary"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">
                          {step.step}. {step.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                          <CheckCircle className="w-3 h-3 text-argus-success" />
                          <span>{step.duration}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{step.description}</p>
                      {(step.input || step.output) && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-argus-dark-card rounded p-2">
                            <span className="text-gray-400">Input:</span>
                            <p className="text-white mt-1">{step.input || '-'}</p>
                          </div>
                          <div className="bg-argus-dark-card rounded p-2">
                            <span className="text-gray-400">Output:</span>
                            <p className="text-white mt-1">{step.output || '-'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>

              {/* 추출된 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section title="🏷️ 추출된 개체" icon={Target} compact>
                  <div className="space-y-2">
                    {Object.entries(log.extractedEntities || {}).map(([key, values]) => (
                      <div key={key} className="flex flex-wrap gap-1 items-center">
                        <span className="text-sm text-gray-300 mr-2">{key}:</span>
                        {(values as string[]).length > 0 ? (values as string[]).map((v, i) => (
                          <Badge key={i} variant="outline" className="text-sm text-white border-gray-500">
                            {v}
                          </Badge>
                        )) : <span className="text-sm text-gray-400">-</span>}
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="🔑 키워드" icon={Zap} compact>
                  <div className="flex flex-wrap gap-2">
                    {log.extractedKeywords?.length > 0 ? log.extractedKeywords.map((keyword, i) => (
                      <Badge key={i} className="bg-argus-primary/30 text-white border border-argus-primary/50 text-sm px-3 py-1">
                        {keyword}
                      </Badge>
                    )) : <span className="text-sm text-gray-400">키워드 없음</span>}
                  </div>
                </Section>
              </div>

              {/* 카테고리 분류 추론 */}
              <Section title="📊 카테고리 분류 추론" icon={BarChart}>
                <div className="bg-argus-dark-bg rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">카테고리:</span>
                      <Badge className="bg-argus-primary/30 text-white border border-argus-primary/50 text-sm">
                        {categoryName}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">신뢰도:</span>
                      <ConfidenceBadge value={log.categoryReasoning?.confidence || 0} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">위협 지표:</p>
                    <ul className="space-y-2">
                      {log.categoryReasoning?.indicators?.map((indicator, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-2 h-2 rounded-full bg-argus-warning" />
                          <span className="text-white">{indicator}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Section>

              {/* 심각도 분석 */}
              <Section title="📈 심각도 분석" icon={Activity}>
                <div className="bg-argus-dark-bg rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">심각도:</span>
                      <span className="text-2xl font-bold text-white">{log.severityReasoning?.finalSeverity || 0}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-300 mb-2">위험 요소:</p>
                      <ul className="space-y-2">
                        {log.severityReasoning?.riskFactors?.map((factor, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-white">{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm text-gray-300 mb-2">완화 요소:</p>
                      <ul className="space-y-2">
                        {log.severityReasoning?.mitigatingFactors?.map((factor, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-white">{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </Section>

              {/* 불확실성 */}
              {log.uncertainties && log.uncertainties.length > 0 && (
                <Section title="❓ 불확실성" icon={AlertTriangle}>
                  <ul className="space-y-2">
                    {log.uncertainties.map((uncertainty, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="text-white">{uncertainty}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* 종합 평가 */}
              <Section title="🎯 종합 평가" icon={Shield}>
                <pre className="bg-argus-dark-bg rounded-lg p-4 text-sm text-white whitespace-pre-wrap">
                  {log.overallAssessment}
                </pre>
              </Section>

              {/* 권장 조치 */}
              <Section title="📋 권장 조치" icon={Target}>
                <pre className="bg-gradient-to-r from-argus-primary/20 to-transparent rounded-lg p-4 text-sm text-white whitespace-pre-wrap border-l-2 border-argus-primary">
                  {log.recommendation}
                </pre>
              </Section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 데이터 수집 로그 카드 컴포넌트 (Node.js 백엔드용)
function CollectionLogCard({ 
  log, 
  isExpanded, 
  onToggle 
}: { 
  log: CollectionLog; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const statusColor = log.status === 'success' ? 'text-argus-success' : 'text-argus-critical';
  const StatusIcon = log.status === 'success' ? CheckCircle : XCircle;

  return (
    <motion.div
      layout
      className="bg-argus-dark-card rounded-xl border border-argus-dark-border overflow-hidden"
    >
      {/* Header */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer hover:bg-argus-dark-bg/30 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-argus-secondary" />
            ) : (
              <ChevronRight className="w-5 h-5 text-argus-dark-muted" />
            )}
            <Database className="w-5 h-5 text-argus-secondary" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{log.sourceName}</span>
                <Badge variant="outline" className="text-xs">
                  {log.sourceType}
                </Badge>
              </div>
              <p className="text-sm text-argus-dark-muted mt-0.5">
                {log.source} • {log.duration}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-5 h-5 ${statusColor}`} />
            <div className="text-right">
              <p className="text-sm text-white">
                {log.articlesCollected} 수집 / {log.articlesFiltered} 필터링
              </p>
              <p className="text-xs text-argus-dark-muted">
                {new Date(log.timestamp).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-argus-dark-border overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* 수집 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-argus-dark-bg rounded-lg p-3">
                  <p className="text-xs text-argus-dark-muted mb-1">수집 건수</p>
                  <p className="text-xl font-bold text-white">{log.articlesCollected}</p>
                </div>
                <div className="bg-argus-dark-bg rounded-lg p-3">
                  <p className="text-xs text-argus-dark-muted mb-1">필터링 후</p>
                  <p className="text-xl font-bold text-white">{log.articlesFiltered}</p>
                </div>
                <div className="bg-argus-dark-bg rounded-lg p-3">
                  <p className="text-xs text-argus-dark-muted mb-1">상태</p>
                  <p className="text-xl font-bold text-argus-success">{log.status}</p>
                </div>
              </div>

              {/* 소스 정보 */}
              <Section title="🔗 데이터 소스" icon={Server} compact>
                <div className="bg-argus-dark-bg rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-argus-dark-muted">소스:</span>
                    <span className="text-white">{log.source}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-argus-dark-muted">소스 타입:</span>
                    <span className="text-white">{log.sourceType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-argus-dark-muted">소요 시간:</span>
                    <span className="text-white">{log.duration}</span>
                  </div>
                </div>
              </Section>

              {/* 샘플 기사 */}
              {log.sampleArticles && log.sampleArticles.length > 0 && (
                <Section title="📄 수집된 기사 샘플" icon={FileText}>
                  <div className="space-y-2">
                    {log.sampleArticles.map((article, i) => (
                      <div key={i} className="bg-argus-dark-bg rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white line-clamp-1 flex-1">{article.title}</p>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_CONFIG[article.category as keyof typeof CATEGORY_CONFIG]?.name || article.category}
                            </Badge>
                            <span className="text-xs text-argus-dark-muted">
                              심각도: {article.severity}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 섹션 컴포넌트
function Section({ 
  title, 
  icon: Icon, 
  children, 
  compact = false 
}: { 
  title: string; 
  icon: any; 
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-argus-primary" />
        <h4 className={`font-semibold text-white ${compact ? 'text-base' : 'text-lg'}`}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

// 신뢰도 배지
function ConfidenceBadge({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  const color = percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1 rounded-full">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-base text-white font-semibold">{percentage}%</span>
    </div>
  );
}

// 로딩 스켈레톤
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-argus-dark-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="w-5 h-5 rounded" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 빈 상태
function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-argus-dark-card rounded-xl p-12 text-center">
      <Database className="w-12 h-12 text-argus-dark-muted mx-auto mb-4" />
      <p className="text-argus-dark-muted">{message}</p>
      <p className="text-sm text-argus-dark-muted mt-2">
        위협이 탐지되면 자동으로 로그가 생성됩니다
      </p>
    </div>
  );
}

