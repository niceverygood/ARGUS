'use client';

import { motion } from 'framer-motion';
import { 
  Bomb, 
  Shield, 
  Package, 
  Plane, 
  User, 
  Globe, 
  LucideIcon 
} from 'lucide-react';
import { CATEGORY_CONFIG, LEVEL_CONFIG } from '@/lib/constants';
import { ThreatCategory, ThreatLevel } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getThreatLevel } from '@/lib/utils';

interface CategoryData {
  category: ThreatCategory;
  name: string;
  index: number;
  threatCount: number;
  change: number;
}

interface CategoryCardsProps {
  categories: CategoryData[];
  isLoading?: boolean;
}

const ICONS: Record<ThreatCategory, LucideIcon> = {
  terror: Bomb,
  cyber: Shield,
  smuggling: Package,
  drone: Plane,
  insider: User,
  geopolitical: Globe,
};

export function CategoryCards({ categories, isLoading }: CategoryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((cat, idx) => (
        <CategoryCard key={cat.category} data={cat} index={idx} />
      ))}
    </div>
  );
}

function CategoryCard({ data, index }: { data: CategoryData; index: number }) {
  const config = CATEGORY_CONFIG[data.category];
  const Icon = ICONS[data.category];
  const level = getThreatLevel(data.index);
  const levelConfig = LEVEL_CONFIG[level];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`
        bg-argus-dark-card rounded-xl p-4 border border-argus-dark-border
        hover:border-argus-secondary/50 transition-all cursor-pointer group
        ${level === 5 ? 'animate-pulse border-argus-critical/50' : ''}
      `}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="p-2 rounded-lg transition-colors group-hover:scale-110"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon size={18} style={{ color: config.color }} />
          </div>
          <span className="text-sm font-medium text-argus-dark-text">
            {config.name}
          </span>
        </div>
        <span className={`text-xs font-medium ${
          data.change > 0 ? 'text-argus-critical' : 'text-argus-guarded'
        }`}>
          {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
        </span>
      </div>
      
      {/* 지수 표시 */}
      <div className="flex items-end justify-between mb-3">
        <motion.span 
          className="text-3xl font-bold font-mono"
          style={{ color: levelConfig.color }}
          key={data.index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Math.round(data.index)}
        </motion.span>
        <span className="text-xs text-argus-dark-muted pb-1">
          {data.threatCount}건
        </span>
      </div>
      
      {/* 프로그레스 바 */}
      <div className="h-1.5 bg-argus-dark-border rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: levelConfig.color }}
          initial={{ width: 0 }}
          animate={{ width: `${data.index}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
        />
      </div>
    </motion.div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-argus-dark-card rounded-xl p-4 border border-argus-dark-border">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-16 mb-3" />
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

