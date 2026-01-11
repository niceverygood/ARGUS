'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { AlertResponse, ThreatLevel } from '@/types';
import { LEVEL_CONFIG } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo } from '@/lib/utils';

interface AlertFeedProps {
  alerts: AlertResponse[];
  onAlertClick?: (alert: AlertResponse) => void;
  onMarkAllRead?: () => void;
  isLoading?: boolean;
}

export function AlertFeed({ 
  alerts, 
  onAlertClick, 
  onMarkAllRead,
  isLoading 
}: AlertFeedProps) {
  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (isLoading) {
    return <FeedSkeleton />;
  }

  return (
    <div className="bg-argus-dark-card rounded-2xl border border-argus-dark-border h-full flex flex-col max-h-[400px]">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-argus-dark-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-argus-secondary" />
          <span className="font-medium text-argus-dark-text">실시간 알림</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-argus-critical/20 text-argus-critical rounded-full font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-argus-dark-muted hover:text-argus-secondary transition"
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* 알림 리스트 */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {alerts.length === 0 ? (
            <EmptyState />
          ) : (
            alerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onClick={() => onAlertClick?.(alert)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AlertItem({ alert, onClick }: { alert: AlertResponse; onClick: () => void }) {
  const levelConfig = LEVEL_CONFIG[alert.level as ThreatLevel] || LEVEL_CONFIG[1];
  const timeAgo = alert.time_ago || formatTimeAgo(alert.created_at);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onClick={onClick}
      className={`
        flex items-start gap-3 p-4 border-b border-argus-dark-border cursor-pointer
        hover:bg-argus-dark-border/30 transition
        ${!alert.is_read ? 'bg-argus-dark-border/10' : ''}
        ${alert.level === 5 ? 'bg-argus-critical/5' : ''}
      `}
    >
      {/* 레벨 인디케이터 */}
      <div
        className={`w-1 self-stretch min-h-[40px] rounded-full flex-shrink-0 ${
          alert.level === 5 ? 'animate-pulse' : ''
        }`}
        style={{ backgroundColor: levelConfig.color }}
      />
      
      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          !alert.is_read ? 'text-white' : 'text-argus-dark-text'
        }`}>
          {alert.title}
        </p>
        <p className="text-xs text-argus-dark-muted truncate mt-0.5">
          {alert.message}
        </p>
        <p className="text-xs text-argus-dark-muted mt-1.5">
          {timeAgo}
        </p>
      </div>
      
      {/* 화살표 */}
      <ChevronRight size={16} className="text-argus-dark-muted flex-shrink-0 mt-1" />
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-argus-dark-muted py-12"
    >
      <Check size={32} className="mb-2 opacity-50" />
      <p className="text-sm">새로운 알림이 없습니다</p>
      <p className="text-xs mt-1">위협이 감지되면 알려드립니다</p>
    </motion.div>
  );
}

function FeedSkeleton() {
  return (
    <div className="bg-argus-dark-card rounded-2xl border border-argus-dark-border h-full">
      <div className="flex items-center gap-2 p-4 border-b border-argus-dark-border">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="p-4 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-1 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

