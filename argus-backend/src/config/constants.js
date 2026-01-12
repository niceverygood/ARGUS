/**
 * ARGUS SKY - Constants and Configuration
 * 위협 카테고리, 레벨, 신뢰도 정의
 */

// =============================================================================
// 위협 카테고리 정의
// =============================================================================

const THREAT_CATEGORIES = {
  TERROR: {
    id: 'TERROR',
    name: '테러 위협',
    weight: 0.25,
    keywords: ['테러', 'terrorism', 'bomb', '폭발', '공격', '폭탄', 'attack', 'explosive', 'militant', '테러리스트'],
    description: '테러 공격 및 폭발물 관련 위협'
  },
  CYBER: {
    id: 'CYBER',
    name: '사이버 공격',
    weight: 0.20,
    keywords: ['해킹', 'hacking', 'ransomware', 'DDoS', '사이버공격', 'malware', 'cyber attack', '정보유출', 'data breach', 'phishing'],
    description: '사이버 공격 및 정보 보안 위협'
  },
  SMUGGLING: {
    id: 'SMUGGLING',
    name: '밀수/밀입국',
    weight: 0.15,
    keywords: ['밀수', 'smuggling', '밀입국', '마약', 'drug trafficking', 'contraband', 'illegal entry', '불법입국', '위조여권'],
    description: '밀수, 마약, 밀입국 관련 위협'
  },
  DRONE: {
    id: 'DRONE',
    name: '드론 위협',
    weight: 0.15,
    keywords: ['드론', 'drone', 'UAV', '무인기', 'unmanned', '불법드론', 'airspace violation', '비행금지'],
    description: '불법 드론 및 공역 침범 위협'
  },
  INSIDER: {
    id: 'INSIDER',
    name: '내부자 위협',
    weight: 0.15,
    keywords: ['내부자', 'insider', '정보유출', '내부자 위협', 'employee', '직원', '보안 위반', 'security breach', '권한 남용'],
    description: '내부자에 의한 보안 위협'
  },
  GEOPOLITICAL: {
    id: 'GEOPOLITICAL',
    name: '지정학적 위협',
    weight: 0.10,
    keywords: ['북한', '미사일', '전쟁', '군사', 'North Korea', 'missile', 'military', '긴장', '도발', '제재'],
    description: '지정학적 불안정 및 군사적 위협'
  }
};

// =============================================================================
// 위협 레벨 정의
// =============================================================================

const THREAT_LEVELS = {
  LOW: {
    id: 'LOW',
    min: 0,
    max: 25,
    label: 'LOW',
    labelKo: '낮음',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    description: '일상적인 보안 상태, 특별한 위협 없음'
  },
  GUARDED: {
    id: 'GUARDED',
    min: 26,
    max: 50,
    label: 'GUARDED',
    labelKo: '관심',
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    description: '일반적인 경계 수준, 잠재적 위협 모니터링 중'
  },
  ELEVATED: {
    id: 'ELEVATED',
    min: 51,
    max: 65,
    label: 'ELEVATED',
    labelKo: '주의',
    color: '#EAB308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
    description: '높아진 경계 수준, 특정 위협 탐지됨'
  },
  HIGH: {
    id: 'HIGH',
    min: 66,
    max: 85,
    label: 'HIGH',
    labelKo: '경계',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    description: '심각한 위협, 적극적인 대응 필요'
  },
  CRITICAL: {
    id: 'CRITICAL',
    min: 86,
    max: 100,
    label: 'CRITICAL',
    labelKo: '심각',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    description: '즉각적인 대응 필요, 최고 경계 태세'
  }
};

// =============================================================================
// 출처 신뢰도 정의
// =============================================================================

const SOURCE_CREDIBILITY = {
  // 정부 및 공식 기관 (최고 신뢰도)
  government: 1.0,
  official: 1.0,
  airport_authority: 1.0,
  
  // 주요 통신사 및 신뢰도 높은 뉴스
  reuters: 0.95,
  ap: 0.95,
  yonhap: 0.90,        // 연합뉴스
  afp: 0.90,
  
  // 주요 언론사
  bbc: 0.85,
  cnn: 0.85,
  nytimes: 0.85,
  washingtonpost: 0.85,
  guardian: 0.85,
  
  // 국내 주요 언론
  chosun: 0.80,
  joongang: 0.80,
  donga: 0.80,
  hani: 0.80,
  kyunghyang: 0.80,
  
  // 전문 보안/기술 매체
  securityweek: 0.85,
  darkreading: 0.85,
  bleepingcomputer: 0.80,
  threatpost: 0.80,
  
  // 일반 뉴스 및 온라인 매체
  news: 0.70,
  online_news: 0.65,
  blog: 0.50,
  
  // 소셜 미디어 (낮은 신뢰도)
  twitter: 0.40,
  facebook: 0.35,
  reddit: 0.35,
  
  // 미확인 출처
  unknown: 0.30,
  anonymous: 0.20
};

// =============================================================================
// 시간 감쇠 계수 설정
// =============================================================================

const TEMPORAL_DECAY = {
  '1h': 1.0,    // 1시간 이내
  '6h': 0.9,    // 6시간 이내
  '12h': 0.8,   // 12시간 이내
  '24h': 0.6,   // 24시간 이내
  '48h': 0.4,   // 48시간 이내
  '72h': 0.2,   // 72시간 이내
  'older': 0.1  // 72시간 이후
};

// =============================================================================
// API 설정
// =============================================================================

const API_CONFIG = {
  NEWS_API: {
    baseUrl: 'https://newsapi.org/v2',
    endpoints: {
      everything: '/everything',
      topHeadlines: '/top-headlines'
    },
    defaultParams: {
      language: 'ko,en',
      sortBy: 'publishedAt',
      pageSize: 10
    }
  },
  GDELT: {
    baseUrl: 'https://api.gdeltproject.org/api/v2',
    endpoints: {
      doc: '/doc/doc'
    },
    defaultParams: {
      mode: 'artlist',
      format: 'json'
    }
  },
  ABUSEIPDB: {
    baseUrl: 'https://api.abuseipdb.com/api/v2',
    endpoints: {
      blacklist: '/blacklist'
    }
  },
  ANTHROPIC: {
    baseUrl: 'https://api.anthropic.com/v1',
    endpoints: {
      messages: '/messages'
    },
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1024
  }
};

// =============================================================================
// 공항 관련 키워드
// =============================================================================

const AIRPORT_KEYWORDS = [
  '인천공항', 'Incheon Airport', 'ICN',
  '김포공항', 'Gimpo Airport', 'GMP',
  '공항', 'airport', 'aviation',
  '항공', 'airline', '비행기',
  '출국', '입국', 'departure', 'arrival',
  '터미널', 'terminal', '활주로', 'runway'
];

// =============================================================================
// Export
// =============================================================================

module.exports = {
  THREAT_CATEGORIES,
  THREAT_LEVELS,
  SOURCE_CREDIBILITY,
  TEMPORAL_DECAY,
  API_CONFIG,
  AIRPORT_KEYWORDS
};

