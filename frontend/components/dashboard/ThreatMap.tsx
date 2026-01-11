'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Maximize2, Layers } from 'lucide-react';
import { ThreatResponse } from '@/types';
import { INCHEON_AIRPORT, CATEGORY_CONFIG } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// Leaflet은 SSR에서 동작하지 않으므로 동적 import
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

interface ThreatMapProps {
  threats: ThreatResponse[];
  isLoading?: boolean;
}

export function ThreatMap({ threats, isLoading }: ThreatMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 위치 정보가 있는 위협만 필터링
  const threatsWithLocation = threats.filter(
    t => t.latitude && t.longitude
  );

  if (isLoading || !isMounted) {
    return <MapSkeleton />;
  }

  return (
    <div className="bg-argus-dark-card rounded-2xl border border-argus-dark-border overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-argus-dark-border">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-argus-secondary" />
          <span className="font-medium text-argus-dark-text">위협 지도</span>
          <span className="text-xs text-argus-dark-muted">
            ({threatsWithLocation.length}건)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showHeatmap ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="gap-1"
          >
            <Layers size={14} />
            히트맵
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Maximize2 size={14} />
          </Button>
        </div>
      </div>

      {/* 지도 */}
      <div className="h-[350px] relative">
        <MapContainer
          center={INCHEON_AIRPORT.center}
          zoom={INCHEON_AIRPORT.zoom}
          className="h-full w-full"
          style={{ background: '#0A0E1A' }}
        >
          {/* 다크 테마 타일 */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {/* 공항 중심 표시 */}
          <Circle
            center={INCHEON_AIRPORT.center}
            radius={3000}
            pathOptions={{
              color: '#0288D1',
              fillColor: '#0288D1',
              fillOpacity: 0.1,
              weight: 1,
            }}
          />

          {/* 위협 마커들 */}
          {threatsWithLocation.map((threat) => (
            <ThreatMarker key={threat.id} threat={threat} />
          ))}
        </MapContainer>

        {/* 범례 */}
        <div className="absolute bottom-4 left-4 bg-argus-dark-card/90 backdrop-blur-sm rounded-lg p-3 border border-argus-dark-border z-[1000]">
          <p className="text-xs text-argus-dark-muted mb-2">위협 유형</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs text-argus-dark-text">{config.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreatMarker({ threat }: { threat: ThreatResponse }) {
  const config = CATEGORY_CONFIG[threat.category] || { color: '#9CA3AF', name: '알 수 없음' };
  const size = threat.severity >= 70 ? 12 : threat.severity >= 50 ? 10 : 8;

  return (
    <>
      {/* 위협 심각도에 따른 원형 표시 */}
      <Circle
        center={[threat.latitude!, threat.longitude!]}
        radius={threat.severity * 10}
        pathOptions={{
          color: config.color,
          fillColor: config.color,
          fillOpacity: 0.2,
          weight: 1,
        }}
      />
      
      {/* 중심 마커 */}
      <Circle
        center={[threat.latitude!, threat.longitude!]}
        radius={50}
        pathOptions={{
          color: config.color,
          fillColor: config.color,
          fillOpacity: 0.8,
          weight: 2,
        }}
      >
        <Popup className="threat-popup">
          <div className="p-2 min-w-[200px]">
            <h4 className="font-medium text-sm mb-1">{threat.title}</h4>
            <div className="flex items-center gap-2 mb-2">
              <span 
                className="px-2 py-0.5 text-xs rounded-full"
                style={{ 
                  backgroundColor: `${config.color}20`,
                  color: config.color 
                }}
              >
                {config.name}
              </span>
              <span className="text-xs text-gray-500">
                심각도: {threat.severity}
              </span>
            </div>
            <p className="text-xs text-gray-600">{threat.location}</p>
            <p className="text-xs text-gray-400 mt-1">{threat.time_ago}</p>
          </div>
        </Popup>
      </Circle>
    </>
  );
}

function MapSkeleton() {
  return (
    <div className="bg-argus-dark-card rounded-2xl border border-argus-dark-border overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-argus-dark-border">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-[350px] rounded-none" />
    </div>
  );
}

