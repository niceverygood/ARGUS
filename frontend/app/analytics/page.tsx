'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { CATEGORY_CONFIG } from '@/lib/constants';

const COLORS = ['#D32F2F', '#7B1FA2', '#1976D2', '#00796B', '#F57C00', '#5D4037'];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;

  // KPI 데이터
  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ['kpi'],
    queryFn: api.getKPI,
    staleTime: 30000,
  });

  // 트렌드 데이터
  const { data: trend = [], isLoading: trendLoading } = useQuery({
    queryKey: ['trend', hours],
    queryFn: () => api.getTrend(hours),
    staleTime: 60000,
  });

  // 카테고리 분포
  const { data: distribution = [], isLoading: distLoading } = useQuery({
    queryKey: ['distribution'],
    queryFn: api.getCategoryDistribution,
    staleTime: 60000,
  });

  // 소스 통계
  const { data: sourceStats = [], isLoading: sourceLoading } = useQuery({
    queryKey: ['sourceStats'],
    queryFn: api.getSourceStats,
    staleTime: 60000,
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-white">분석 리포트</h1>
        <p className="text-sm text-argus-dark-muted mt-1">
          위협 데이터 분석 및 통계 정보
        </p>
      </div>

      {/* KPI 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="평균 위협 지수"
          value={kpi?.avg_threat_index?.toFixed(1) || '0'}
          change={kpi?.change_vs_yesterday || 0}
          icon={Activity}
          isLoading={kpiLoading}
        />
        <KPICard
          title="총 탐지 위협"
          value={kpi?.total_threats_detected?.toString() || '0'}
          suffix="건"
          icon={AlertTriangle}
          isLoading={kpiLoading}
        />
        <KPICard
          title="해결률"
          value={kpi?.resolved_rate?.toFixed(1) || '0'}
          suffix="%"
          icon={CheckCircle}
          positive
          isLoading={kpiLoading}
        />
        <KPICard
          title="평균 대응 시간"
          value={kpi?.avg_response_time_minutes?.toString() || '0'}
          suffix="분"
          icon={Clock}
          isLoading={kpiLoading}
        />
      </div>

      {/* 트렌드 차트 */}
      <TrendChart
        data={trend}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        isLoading={trendLoading}
      />

      {/* 하단 차트들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 카테고리 분포 (파이 차트) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">카테고리별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {distLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {distribution.map((entry, index) => (
                        <Cell 
                          key={entry.category} 
                          fill={CATEGORY_CONFIG[entry.category as keyof typeof CATEGORY_CONFIG]?.color || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #1F2937',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* 범례 */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {distribution.map((item) => {
                const config = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG];
                return (
                  <div key={item.category} className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config?.color }}
                    />
                    <span className="text-xs text-argus-dark-muted">
                      {config?.name} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 소스별 통계 (바 차트) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">소스별 수집 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis type="number" stroke="#6B7280" fontSize={11} />
                    <YAxis 
                      dataKey="source_type" 
                      type="category" 
                      stroke="#6B7280" 
                      fontSize={11}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #1F2937',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#0288D1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  suffix?: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  positive?: boolean;
  isLoading?: boolean;
}

function KPICard({ title, value, change, suffix, icon: Icon, positive, isLoading }: KPICardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-12" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-argus-dark-muted">{title}</span>
          <Icon size={18} className="text-argus-secondary" />
        </div>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold text-white font-mono">{value}</span>
          {suffix && <span className="text-lg text-argus-dark-muted mb-1">{suffix}</span>}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            positive 
              ? 'text-argus-guarded' 
              : change > 0 ? 'text-argus-critical' : 'text-argus-guarded'
          }`}>
            {change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
            <span className="text-argus-dark-muted">vs 어제</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

