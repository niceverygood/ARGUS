'use client';

import { motion } from 'framer-motion';
import { LEVEL_CONFIG } from '@/lib/constants';
import { ThreatLevel } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface ThreatGaugeProps {
  value: number;
  level: ThreatLevel;
  levelName: string;
  change24h: number;
  isLoading?: boolean;
}

export function ThreatGauge({ 
  value, 
  level, 
  levelName, 
  change24h, 
  isLoading 
}: ThreatGaugeProps) {
  const config = LEVEL_CONFIG[level];
  const percentage = Math.min(100, Math.max(0, value)) / 100;
  const angle = percentage * 180;
  
  // SVG 설정
  const radius = 100;
  const strokeWidth = 16;
  const cx = 120;
  const cy = 110;
  
  const polarToCartesian = (deg: number) => {
    const radians = ((deg - 180) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(radians),
      y: cy + radius * Math.sin(radians),
    };
  };
  
  const startPoint = polarToCartesian(0);
  const endPoint = polarToCartesian(angle);
  const largeArcFlag = angle > 180 ? 1 : 0;
  
  const arcPath = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`;
  const bgArcPath = `M ${polarToCartesian(0).x} ${polarToCartesian(0).y} A ${radius} ${radius} 0 1 1 ${polarToCartesian(180).x} ${polarToCartesian(180).y}`;
  
  if (isLoading) {
    return <GaugeSkeleton />;
  }
  
  return (
    <div className="bg-argus-dark-card rounded-2xl p-6 border border-argus-dark-border h-full">
      <h3 className="text-sm font-medium text-argus-dark-muted mb-4">통합 위협 지수</h3>
      
      <div className="relative flex justify-center">
        <svg width="240" height="140" viewBox="0 0 240 140">
          {/* 그라디언트 정의 */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1976D2" />
              <stop offset="30%" stopColor="#689F38" />
              <stop offset="50%" stopColor="#FBC02D" />
              <stop offset="70%" stopColor="#F57C00" />
              <stop offset="100%" stopColor="#D32F2F" />
            </linearGradient>
            {level === 5 && (
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            )}
          </defs>
          
          {/* 배경 호 */}
          <path
            d={bgArcPath}
            fill="none"
            stroke="#1F2937"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* 값 호 - 애니메이션 */}
          <motion.path
            d={arcPath}
            fill="none"
            stroke={config.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={level === 5 ? "url(#glow)" : undefined}
            initial={{ strokeDasharray: "0 1000" }}
            animate={{ strokeDasharray: `${angle * 3.5} 1000` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          
          {/* 눈금 마크 */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const tickAngle = (tick / 100) * 180;
            const outerPoint = polarToCartesian(tickAngle);
            const innerRadius = radius - strokeWidth / 2 - 8;
            const innerRadians = ((tickAngle - 180) * Math.PI) / 180;
            const innerPoint = {
              x: cx + innerRadius * Math.cos(innerRadians),
              y: cy + innerRadius * Math.sin(innerRadians),
            };
            const labelRadius = radius + 20;
            const labelPoint = {
              x: cx + labelRadius * Math.cos(innerRadians),
              y: cy + labelRadius * Math.sin(innerRadians) + 4,
            };
            
            return (
              <g key={tick}>
                <line
                  x1={outerPoint.x}
                  y1={outerPoint.y}
                  x2={innerPoint.x}
                  y2={innerPoint.y}
                  stroke="#4B5563"
                  strokeWidth={2}
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  className="fill-argus-dark-muted text-[10px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <motion.span
            className="text-5xl font-bold text-white font-mono"
            key={value}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            {Math.round(value)}
          </motion.span>
          
          <motion.span
            className={`text-sm font-semibold px-3 py-1 rounded-full mt-2 ${
              level === 5 ? 'bg-argus-critical/20 text-argus-critical animate-pulse' :
              level === 4 ? 'bg-argus-high/20 text-argus-high' :
              level === 3 ? 'bg-argus-elevated/20 text-argus-elevated' :
              level === 2 ? 'bg-argus-guarded/20 text-argus-guarded' :
              'bg-argus-low/20 text-argus-low'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {levelName}
          </motion.span>
        </div>
      </div>
      
      {/* 변화율 */}
      <div className="flex justify-center mt-4">
        <span className={`text-sm flex items-center gap-1 ${
          change24h > 0 ? 'text-argus-critical' : 
          change24h < 0 ? 'text-argus-guarded' : 
          'text-argus-dark-muted'
        }`}>
          {change24h > 0 ? '▲' : change24h < 0 ? '▼' : '–'}
          {' '}{Math.abs(change24h).toFixed(1)}% (24h)
        </span>
      </div>
    </div>
  );
}

function GaugeSkeleton() {
  return (
    <div className="bg-argus-dark-card rounded-2xl p-6 border border-argus-dark-border h-full">
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="flex items-center justify-center h-40">
        <Skeleton className="h-32 w-32 rounded-full" />
      </div>
      <Skeleton className="h-4 w-20 mx-auto mt-4" />
    </div>
  );
}

