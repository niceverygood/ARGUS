'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Shield, 
  LayoutDashboard, 
  AlertTriangle, 
  BarChart3, 
  Map, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  Database,
  Brain,
  Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ThreatLevel } from '@/types';
import { LEVEL_CONFIG } from '@/lib/constants';

interface SidebarProps {
  currentLevel?: ThreatLevel;
}

const menuItems = [
  { href: '/', icon: LayoutDashboard, label: '대시보드' },
  { href: '/threats', icon: AlertTriangle, label: '위협 목록' },
  { href: '/cctv', icon: Video, label: 'CCTV 시뮬레이터' },
  { href: '/analytics', icon: BarChart3, label: '분석 리포트' },
  { href: '/evidence', icon: Database, label: '데이터 근거' },
  { href: '/logs', icon: Brain, label: 'AI 분석 로그' },
  { href: '/map', icon: Map, label: '지도 뷰' },
  { href: '/settings', icon: Settings, label: '설정' },
];

export function Sidebar({ currentLevel = 2 }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const levelConfig = LEVEL_CONFIG[currentLevel];

  return (
    <aside 
      className={cn(
        "flex flex-col h-screen bg-argus-dark-card border-r border-argus-dark-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* 로고 */}
      <div className="flex items-center h-16 px-4 border-b border-argus-dark-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-argus-secondary to-argus-accent">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-wider">ARGUS</span>
              <span className="text-xs text-argus-accent font-medium -mt-1">SKY</span>
            </div>
          )}
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive 
                  ? "bg-argus-secondary/20 text-argus-secondary" 
                  : "text-argus-dark-muted hover:text-white hover:bg-argus-dark-border/50"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 현재 위협 레벨 */}
      <div className="px-3 py-4 border-t border-argus-dark-border">
        {!isCollapsed ? (
          <div className="p-3 rounded-lg bg-argus-dark-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-argus-dark-muted" />
              <span className="text-xs text-argus-dark-muted">현재 위협 레벨</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={
                  currentLevel === 5 ? 'critical' :
                  currentLevel === 4 ? 'high' :
                  currentLevel === 3 ? 'elevated' :
                  currentLevel === 2 ? 'guarded' : 'low'
                }
                className="text-sm"
              >
                Level {currentLevel}
              </Badge>
              <span className="text-sm font-medium" style={{ color: levelConfig.color }}>
                {levelConfig.name}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div 
              className={cn(
                "w-3 h-3 rounded-full",
                currentLevel === 5 && "bg-argus-critical animate-pulse"
              )}
              style={{ backgroundColor: currentLevel < 5 ? levelConfig.color : undefined }}
            />
          </div>
        )}
      </div>

      {/* 접기 버튼 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-center h-10 border-t border-argus-dark-border text-argus-dark-muted hover:text-white transition"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}

