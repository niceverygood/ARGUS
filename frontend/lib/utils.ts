import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ThreatLevel } from '@/types';

/**
 * Tailwind CSS 클래스 병합 유틸리티
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 위협 레벨 계산
 */
export function getThreatLevel(index: number): ThreatLevel {
  if (index >= 90) return 5;
  if (index >= 70) return 4;
  if (index >= 50) return 3;
  if (index >= 30) return 2;
  return 1;
}

/**
 * 레벨 이름 반환
 */
export function getLevelName(level: ThreatLevel): string {
  const names: Record<ThreatLevel, string> = {
    1: 'LOW',
    2: 'GUARDED',
    3: 'ELEVATED',
    4: 'HIGH',
    5: 'CRITICAL',
  };
  return names[level];
}

/**
 * 레벨별 색상 반환
 */
export function getLevelColor(level: ThreatLevel): string {
  const colors: Record<ThreatLevel, string> = {
    1: '#1976D2',
    2: '#689F38',
    3: '#FBC02D',
    4: '#F57C00',
    5: '#D32F2F',
  };
  return colors[level];
}

/**
 * 시간 경과 포맷팅
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) return '방금 전';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  return `${Math.floor(diffSec / 86400)}일 전`;
}

/**
 * 날짜 포맷팅
 */
export function formatDate(dateString: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(dateString);
  
  if (format === 'short') {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 숫자 포맷팅 (천단위 쉼표)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * 지수 변화 방향 아이콘
 */
export function getChangeIndicator(change: number): { icon: string; color: string } {
  if (change > 0) return { icon: '▲', color: 'text-argus-critical' };
  if (change < 0) return { icon: '▼', color: 'text-argus-guarded' };
  return { icon: '–', color: 'text-argus-dark-muted' };
}

/**
 * 디바운스 함수
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

/**
 * 랜덤 ID 생성
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

