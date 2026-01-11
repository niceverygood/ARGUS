import { ThreatLevel, ThreatCategory } from '@/types';

// ============ Level Configuration ============
export const LEVEL_CONFIG: Record<ThreatLevel, {
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  1: { name: 'LOW', color: '#1976D2', bgColor: 'bg-argus-low', textColor: 'text-argus-low' },
  2: { name: 'GUARDED', color: '#689F38', bgColor: 'bg-argus-guarded', textColor: 'text-argus-guarded' },
  3: { name: 'ELEVATED', color: '#FBC02D', bgColor: 'bg-argus-elevated', textColor: 'text-argus-elevated' },
  4: { name: 'HIGH', color: '#F57C00', bgColor: 'bg-argus-high', textColor: 'text-argus-high' },
  5: { name: 'CRITICAL', color: '#D32F2F', bgColor: 'bg-argus-critical', textColor: 'text-argus-critical' },
};

// ============ Category Configuration ============
export const CATEGORY_CONFIG: Record<ThreatCategory, {
  name: string;
  nameEn: string;
  icon: string;
  color: string;
}> = {
  terror: { name: '테러 위협', nameEn: 'Terror', icon: 'Bomb', color: '#D32F2F' },
  cyber: { name: '사이버 공격', nameEn: 'Cyber', icon: 'Shield', color: '#7B1FA2' },
  smuggling: { name: '밀수/밀입국', nameEn: 'Smuggling', icon: 'Package', color: '#1976D2' },
  drone: { name: '드론 위협', nameEn: 'Drone', icon: 'Plane', color: '#00796B' },
  insider: { name: '내부자 위협', nameEn: 'Insider', icon: 'User', color: '#F57C00' },
  geopolitical: { name: '지정학적', nameEn: 'Geopolitical', icon: 'Globe', color: '#5D4037' },
};

// ============ Status Configuration ============
export const STATUS_CONFIG: Record<string, {
  name: string;
  color: string;
  bgColor: string;
}> = {
  new: { name: '신규', color: '#0288D1', bgColor: 'bg-blue-500/20' },
  analyzing: { name: '분석중', color: '#FBC02D', bgColor: 'bg-yellow-500/20' },
  confirmed: { name: '확인됨', color: '#D32F2F', bgColor: 'bg-red-500/20' },
  resolved: { name: '해결됨', color: '#689F38', bgColor: 'bg-green-500/20' },
  false_positive: { name: '오탐', color: '#9CA3AF', bgColor: 'bg-gray-500/20' },
};

// ============ Incheon Airport Location ============
export const INCHEON_AIRPORT = {
  center: [37.4602, 126.4407] as [number, number],
  zoom: 12,
  bounds: {
    north: 37.52,
    south: 37.40,
    east: 126.52,
    west: 126.35,
  },
};

// ============ API Endpoints ============
// 환경변수에서 가져오거나 기본값 사용
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001/ws';

// ============ Time Ranges ============
export const TIME_RANGES = [
  { value: '24h', label: '24시간', hours: 24 },
  { value: '7d', label: '7일', hours: 168 },
  { value: '30d', label: '30일', hours: 720 },
] as const;

export type TimeRange = typeof TIME_RANGES[number]['value'];

