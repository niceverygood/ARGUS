'use client';

import { ThreatMap } from '@/components/dashboard/ThreatMap';
import { useThreats } from '@/hooks/useThreats';

export default function MapPage() {
  const { threats, isLoading } = useThreats({ limit: 100 });

  return (
    <div className="space-y-6 h-full">
      <div>
        <h1 className="text-2xl font-bold text-white">지도 뷰</h1>
        <p className="text-sm text-argus-dark-muted mt-1">
          위협 발생 지점을 지도에서 확인합니다
        </p>
      </div>
      
      <div className="h-[calc(100vh-220px)]">
        <ThreatMap threats={threats} isLoading={isLoading} />
      </div>
    </div>
  );
}

