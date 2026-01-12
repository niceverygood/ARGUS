/**
 * ARGUS CCTV 시뮬레이터
 * 실제 CCTV 없이 영상 분석 이벤트를 시뮬레이션합니다.
 */

const { THREAT_CATEGORIES } = require('../config/constants');

// =============================================================================
// CCTV 카메라 위치 정의
// =============================================================================

const CAMERA_LOCATIONS = {
  // 제1터미널
  'CAM-T1-DEP-001': { name: '제1터미널 출국장 A', zone: 'T1', area: 'departure', lat: 37.4691, lng: 126.4505 },
  'CAM-T1-DEP-002': { name: '제1터미널 출국장 B', zone: 'T1', area: 'departure', lat: 37.4693, lng: 126.4510 },
  'CAM-T1-ARR-001': { name: '제1터미널 입국장', zone: 'T1', area: 'arrival', lat: 37.4689, lng: 126.4502 },
  'CAM-T1-SEC-001': { name: '제1터미널 보안검색대', zone: 'T1', area: 'security', lat: 37.4690, lng: 126.4507 },
  'CAM-T1-BAG-001': { name: '제1터미널 수하물 수취대', zone: 'T1', area: 'baggage', lat: 37.4688, lng: 126.4500 },
  
  // 제2터미널
  'CAM-T2-DEP-001': { name: '제2터미널 출국장', zone: 'T2', area: 'departure', lat: 37.4602, lng: 126.4407 },
  'CAM-T2-ARR-001': { name: '제2터미널 입국장', zone: 'T2', area: 'arrival', lat: 37.4600, lng: 126.4405 },
  'CAM-T2-SEC-001': { name: '제2터미널 보안검색대', zone: 'T2', area: 'security', lat: 37.4601, lng: 126.4406 },
  
  // 면세점/상업구역
  'CAM-DF-001': { name: '면세점 A구역', zone: 'DF', area: 'retail', lat: 37.4695, lng: 126.4515 },
  'CAM-DF-002': { name: '면세점 B구역', zone: 'DF', area: 'retail', lat: 37.4696, lng: 126.4518 },
  
  // 활주로/외곽
  'CAM-RW-N-001': { name: '활주로 북측', zone: 'RW', area: 'runway', lat: 37.4750, lng: 126.4400 },
  'CAM-RW-S-001': { name: '활주로 남측', zone: 'RW', area: 'runway', lat: 37.4550, lng: 126.4400 },
  'CAM-RW-E-001': { name: '활주로 동측', zone: 'RW', area: 'runway', lat: 37.4650, lng: 126.4550 },
  
  // 화물터미널
  'CAM-CG-001': { name: '화물터미널 입구', zone: 'CG', area: 'cargo', lat: 37.4580, lng: 126.4350 },
  'CAM-CG-002': { name: '화물터미널 검수장', zone: 'CG', area: 'cargo', lat: 37.4582, lng: 126.4355 },
  'CAM-CG-F-001': { name: '화물터미널 펜스', zone: 'CG', area: 'perimeter', lat: 37.4578, lng: 126.4345 },
  
  // 주차장
  'CAM-PK-001': { name: '단기주차장 입구', zone: 'PK', area: 'parking', lat: 37.4685, lng: 126.4490 },
  'CAM-PK-002': { name: '장기주차장', zone: 'PK', area: 'parking', lat: 37.4680, lng: 126.4485 },
  
  // 직원구역
  'CAM-ST-001': { name: '직원 출입구', zone: 'ST', area: 'staff', lat: 37.4670, lng: 126.4480 },
  'CAM-ST-002': { name: '직원 휴게실', zone: 'ST', area: 'staff', lat: 37.4672, lng: 126.4482 },
};

// =============================================================================
// CCTV 이벤트 타입 정의
// =============================================================================

const CCTV_EVENT_TYPES = {
  // 테러/보안 위협
  weapon_detected: {
    category: 'TERROR',
    baseSeverity: 95,
    title: '무기 의심 물체 탐지',
    descriptions: [
      '금속 탐지기 반응 - 추가 검사 필요',
      '수상한 형태의 물체 탐지됨',
      'X-ray 스캔에서 위험 물체 패턴 감지',
    ],
    confidence: [0.85, 0.95],
    applicableAreas: ['security', 'departure', 'arrival'],
  },
  
  abandoned_bag: {
    category: 'TERROR',
    baseSeverity: 80,
    title: '방치된 수하물 감지',
    descriptions: [
      '15분 이상 방치된 가방 발견',
      '주인 없는 수하물 - 폭발물 탐지견 출동 요청',
      '의심 수하물 발견 - 구역 통제 필요',
    ],
    confidence: [0.80, 0.92],
    applicableAreas: ['departure', 'arrival', 'retail', 'baggage'],
  },
  
  crowd_anomaly: {
    category: 'TERROR',
    baseSeverity: 60,
    title: '군중 이상 행동 감지',
    descriptions: [
      '비정상적 군중 밀집 감지',
      '급격한 군중 이동 패턴 탐지',
      '패닉 상황 징후 감지',
    ],
    confidence: [0.70, 0.85],
    applicableAreas: ['departure', 'arrival', 'retail'],
  },
  
  fighting_detected: {
    category: 'TERROR',
    baseSeverity: 70,
    title: '폭력 행위 감지',
    descriptions: [
      '승객 간 물리적 충돌 감지',
      '공격적 행동 패턴 탐지',
      '보안 요원 출동 필요',
    ],
    confidence: [0.75, 0.90],
    applicableAreas: ['departure', 'arrival', 'retail', 'baggage'],
  },

  // 드론 위협
  drone_detected: {
    category: 'DRONE',
    baseSeverity: 85,
    title: '미확인 드론 탐지',
    descriptions: [
      '활주로 인근 드론 비행 감지',
      '비인가 무인기 탐지 - 항공기 운항 주의',
      '드론 침입 - 대응팀 출동',
    ],
    confidence: [0.80, 0.95],
    applicableAreas: ['runway', 'perimeter'],
  },
  
  uav_tracking: {
    category: 'DRONE',
    baseSeverity: 75,
    title: '무인기 추적 중',
    descriptions: [
      '드론 이동 경로 추적 중',
      '무인기 비행 패턴 분석 중',
      '드론 출발점 역추적 중',
    ],
    confidence: [0.70, 0.88],
    applicableAreas: ['runway', 'perimeter'],
  },

  // 밀수/침입
  perimeter_breach: {
    category: 'SMUGGLING',
    baseSeverity: 75,
    title: '보안 구역 침입 감지',
    descriptions: [
      '펜스 구역 침입 시도 탐지',
      '비인가 인원 보안 구역 접근',
      '경계 구역 이상 움직임 감지',
    ],
    confidence: [0.82, 0.94],
    applicableAreas: ['perimeter', 'cargo', 'runway'],
  },
  
  suspicious_vehicle: {
    category: 'SMUGGLING',
    baseSeverity: 65,
    title: '수상한 차량 감지',
    descriptions: [
      '미등록 차량 보안 구역 진입 시도',
      '수상한 차량 장시간 정차',
      '비정상 차량 이동 패턴 감지',
    ],
    confidence: [0.75, 0.88],
    applicableAreas: ['parking', 'cargo', 'perimeter'],
  },
  
  smuggling_attempt: {
    category: 'SMUGGLING',
    baseSeverity: 80,
    title: '밀수 시도 의심',
    descriptions: [
      'X-ray 스캔 이상 물체 탐지',
      '세관 구역 수상한 행동 감지',
      '화물 검수 중 이상 징후 발견',
    ],
    confidence: [0.78, 0.90],
    applicableAreas: ['cargo', 'baggage', 'security'],
  },

  // 내부자 위협
  unauthorized_access: {
    category: 'INSIDER',
    baseSeverity: 70,
    title: '비인가 접근 시도',
    descriptions: [
      '직원 전용 구역 비인가 접근 탐지',
      '출입 권한 없는 인원 접근 시도',
      '보안 등급 구역 무단 진입',
    ],
    confidence: [0.80, 0.92],
    applicableAreas: ['staff', 'cargo', 'security'],
  },
  
  tailgating: {
    category: 'INSIDER',
    baseSeverity: 55,
    title: '동반 진입 감지',
    descriptions: [
      '1인 인증 후 2인 이상 진입 감지',
      '테일게이팅 시도 탐지',
      '출입문 비정상 개방 시간 감지',
    ],
    confidence: [0.85, 0.95],
    applicableAreas: ['staff', 'security'],
  },
  
  loitering: {
    category: 'INSIDER',
    baseSeverity: 45,
    title: '배회 행동 감지',
    descriptions: [
      '특정 구역 장시간 배회 탐지',
      '수상한 관찰 행동 감지',
      '비정상적 동선 패턴 탐지',
    ],
    confidence: [0.65, 0.80],
    applicableAreas: ['departure', 'arrival', 'staff', 'cargo'],
  },

  // 사이버 (물리적 단서)
  tampering_detected: {
    category: 'CYBER',
    baseSeverity: 85,
    title: '장비 조작 시도 감지',
    descriptions: [
      '네트워크 장비 무단 접근 탐지',
      '보안 카메라 조작 시도 감지',
      '시스템 케이블 조작 시도',
    ],
    confidence: [0.80, 0.92],
    applicableAreas: ['staff', 'security'],
  },
};

// =============================================================================
// 시뮬레이터 클래스
// =============================================================================

class CCTVSimulator {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.eventHistory = [];
    this.cameras = CAMERA_LOCATIONS;
    this.eventTypes = CCTV_EVENT_TYPES;
  }

  /**
   * 랜덤 카메라 선택 (이벤트 타입에 맞는 구역)
   */
  getRandomCamera(applicableAreas) {
    const eligibleCameras = Object.entries(this.cameras)
      .filter(([id, cam]) => applicableAreas.includes(cam.area));
    
    if (eligibleCameras.length === 0) {
      return Object.entries(this.cameras)[0];
    }
    
    return eligibleCameras[Math.floor(Math.random() * eligibleCameras.length)];
  }

  /**
   * 랜덤 이벤트 생성
   */
  generateEvent(eventType = null) {
    // 이벤트 타입 선택
    const eventTypes = Object.keys(this.eventTypes);
    const selectedType = eventType || eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const eventConfig = this.eventTypes[selectedType];
    
    if (!eventConfig) {
      console.error(`[CCTV] Unknown event type: ${selectedType}`);
      return null;
    }

    // 적합한 카메라 선택
    const [cameraId, cameraInfo] = this.getRandomCamera(eventConfig.applicableAreas);
    
    // 신뢰도 범위 내 랜덤 값
    const [minConf, maxConf] = eventConfig.confidence;
    const confidence = minConf + Math.random() * (maxConf - minConf);
    
    // 심각도 계산 (기본값 ± 10%)
    const severityVariation = eventConfig.baseSeverity * 0.1;
    const severity = Math.min(100, Math.max(0,
      eventConfig.baseSeverity + (Math.random() * severityVariation * 2 - severityVariation)
    ));

    // 설명 랜덤 선택
    const description = eventConfig.descriptions[
      Math.floor(Math.random() * eventConfig.descriptions.length)
    ];

    const event = {
      id: `CCTV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      source: 'cctv',
      sourceType: 'video_analysis',
      sourceName: cameraId,
      title: `[CCTV] ${eventConfig.title}`,
      content: `${cameraInfo.name}: ${description}`,
      category: eventConfig.category,
      severity: Math.round(severity),
      confidence: parseFloat(confidence.toFixed(3)),
      timestamp: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      status: 'active',
      keywords: [selectedType, cameraInfo.zone, cameraInfo.area],
      recommendation: this.getRecommendation(eventConfig.category, severity),
      metadata: {
        eventType: selectedType,
        cameraId: cameraId,
        cameraName: cameraInfo.name,
        zone: cameraInfo.zone,
        area: cameraInfo.area,
        location: {
          lat: cameraInfo.lat,
          lng: cameraInfo.lng,
        },
        frameUrl: null, // 실제 구현 시 스냅샷 URL
        analysisTime: Math.floor(Math.random() * 500 + 100), // 100-600ms
      },
    };

    this.eventHistory.push(event);
    
    // 최근 100개만 유지
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100);
    }

    return event;
  }

  /**
   * 카테고리별 권장 조치
   */
  getRecommendation(category, severity) {
    const recommendations = {
      TERROR: severity > 80 
        ? '즉시 보안팀 출동 및 구역 통제 필요'
        : '보안 요원 확인 및 모니터링 강화',
      DRONE: severity > 80
        ? '항공기 운항 중단 검토 및 대드론 장비 가동'
        : '드론 추적 및 관제탑 통보',
      SMUGGLING: severity > 80
        ? '세관/경찰 공조 및 용의자 확보'
        : '추가 검색 및 신원 확인',
      INSIDER: severity > 70
        ? '즉시 접근 차단 및 신원 조회'
        : '모니터링 강화 및 상황 보고',
      CYBER: severity > 80
        ? '해당 시스템 격리 및 보안팀 출동'
        : '원격 점검 및 로그 분석',
    };
    
    return recommendations[category] || '상황 모니터링 지속';
  }

  /**
   * 시뮬레이션 시작
   */
  start(intervalMs = 30000, eventProbability = 0.4) {
    if (this.isRunning) {
      console.log('[CCTV Simulator] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[CCTV Simulator] Started - Interval: ${intervalMs}ms, Probability: ${eventProbability * 100}%`);

    this.intervalId = setInterval(() => {
      if (Math.random() < eventProbability) {
        const event = this.generateEvent();
        if (event) {
          console.log(`[CCTV] 🎥 Event: ${event.title} (${event.metadata.cameraName})`);
          
          // 전역 threatData에 추가
          if (global.threatData) {
            global.threatData.threats.unshift({
              ...event,
              calculatedScore: event.severity * event.confidence,
            });
            global.threatData.threats = global.threatData.threats.slice(0, 100);
            
            // SSE 알림 전송
            if (global.threatData.alerts) {
              global.threatData.alerts.forEach(client => {
                try {
                  client.res.write(`event: cctv_alert\n`);
                  client.res.write(`data: ${JSON.stringify(event)}\n\n`);
                } catch (e) {
                  // 클라이언트 연결 끊김
                }
              });
            }
          }
        }
      }
    }, intervalMs);

    return this;
  }

  /**
   * 시뮬레이션 중지
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[CCTV Simulator] Stopped');
    return this;
  }

  /**
   * 특정 이벤트 강제 발생 (데모용)
   */
  triggerEvent(eventType) {
    const event = this.generateEvent(eventType);
    if (event && global.threatData) {
      global.threatData.threats.unshift({
        ...event,
        calculatedScore: event.severity * event.confidence,
      });
      global.threatData.threats = global.threatData.threats.slice(0, 100);
    }
    return event;
  }

  /**
   * 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      totalCameras: Object.keys(this.cameras).length,
      eventTypes: Object.keys(this.eventTypes).length,
      recentEvents: this.eventHistory.slice(-10),
      statistics: this.getStatistics(),
    };
  }

  /**
   * 통계
   */
  getStatistics() {
    const stats = {
      totalEvents: this.eventHistory.length,
      byCategory: {},
      byZone: {},
      avgSeverity: 0,
    };

    if (this.eventHistory.length === 0) return stats;

    let totalSeverity = 0;
    this.eventHistory.forEach(event => {
      // 카테고리별
      stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1;
      
      // 구역별
      const zone = event.metadata?.zone || 'UNKNOWN';
      stats.byZone[zone] = (stats.byZone[zone] || 0) + 1;
      
      totalSeverity += event.severity;
    });

    stats.avgSeverity = Math.round(totalSeverity / this.eventHistory.length);
    return stats;
  }

  /**
   * 카메라 목록 조회
   */
  getCameras() {
    return this.cameras;
  }

  /**
   * 이벤트 타입 목록 조회
   */
  getEventTypes() {
    return Object.entries(this.eventTypes).map(([key, config]) => ({
      id: key,
      category: config.category,
      title: config.title,
      baseSeverity: config.baseSeverity,
      applicableAreas: config.applicableAreas,
    }));
  }
}

// 싱글톤 인스턴스
const cctvSimulator = new CCTVSimulator();

module.exports = {
  cctvSimulator,
  CCTVSimulator,
  CAMERA_LOCATIONS,
  CCTV_EVENT_TYPES,
};

