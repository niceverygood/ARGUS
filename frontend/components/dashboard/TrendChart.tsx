'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { TrendDataPoint } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendChartProps {
  data: TrendDataPoint[];
  timeRange: '24h' | '7d' | '30d';
  onTimeRangeChange: (range: '24h' | '7d' | '30d') => void;
  isLoading?: boolean;
}

export function TrendChart({ 
  data, 
  timeRange, 
  onTimeRangeChange,
  isLoading 
}: TrendChartProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <div className="bg-argus-dark-card rounded-2xl p-6 border border-argus-dark-border h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-medium text-argus-dark-text">위협 지수 트렌드</h3>
        <div className="flex gap-1 bg-argus-dark-border/50 rounded-lg p-1">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                timeRange === range
                  ? 'bg-argus-secondary text-white shadow-sm'
                  : 'text-argus-dark-muted hover:text-white hover:bg-argus-dark-border/50'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data} 
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            {/* 배경 레벨 구간 */}
            <ReferenceArea y1={90} y2={100} fill="#D32F2F" fillOpacity={0.08} />
            <ReferenceArea y1={70} y2={90} fill="#F57C00" fillOpacity={0.08} />
            <ReferenceArea y1={50} y2={70} fill="#FBC02D" fillOpacity={0.08} />
            <ReferenceArea y1={30} y2={50} fill="#689F38" fillOpacity={0.08} />
            <ReferenceArea y1={0} y2={30} fill="#1976D2" fillOpacity={0.08} />
            
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0288D1" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#0288D1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#1F2937" 
              vertical={false}
            />
            
            <XAxis
              dataKey="timestamp"
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                const date = new Date(value);
                return timeRange === '24h' 
                  ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                  : date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
              }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            
            <YAxis
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #1F2937',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#E5E7EB', marginBottom: '4px' }}
              labelFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
              }}
              formatter={(value: number) => [`${value.toFixed(1)}`, '위협 지수']}
            />
            
            <Area
              type="monotone"
              dataKey="total"
              stroke="#0288D1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTotal)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-argus-dark-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-argus-low"></span> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-argus-guarded"></span> Guarded
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-argus-elevated"></span> Elevated
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-argus-high"></span> High
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-argus-critical"></span> Critical
        </span>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-argus-dark-card rounded-2xl p-6 border border-argus-dark-border h-full">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

