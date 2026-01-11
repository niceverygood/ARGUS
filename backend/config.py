"""
ARGUS SKY - Configuration Settings
"""
import os
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# Supabase Configuration
# =============================================================================
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jbdlyarbwkrohnyahagx.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_NvWwWRPVF3_HGan-O7kE3w_cGYsC-1l")
SUPABASE_DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD", "Bottle1206!@#")

# PostgreSQL Connection String for Supabase
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
SUPABASE_PROJECT_REF = "jbdlyarbwkrohnyahagx"
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    f"postgresql+asyncpg://postgres.{SUPABASE_PROJECT_REF}:{SUPABASE_DB_PASSWORD}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
)

# Fallback to SQLite for local development
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"
SQLITE_URL = "sqlite+aiosqlite:///./data/argus.db"

# =============================================================================
# Server Configuration
# =============================================================================
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8001))

# =============================================================================
# CORS Configuration
# =============================================================================
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", 
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,https://argus-alpha-three.vercel.app,https://*.vercel.app"
).split(",")

# =============================================================================
# Application Mode
# =============================================================================
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# =============================================================================
# Simulation Intervals (seconds)
# =============================================================================
THREAT_UPDATE_INTERVAL = int(os.getenv("THREAT_UPDATE_INTERVAL", 10))
NEW_THREAT_INTERVAL = int(os.getenv("NEW_THREAT_INTERVAL", 45))
HISTORY_RECORD_INTERVAL = int(os.getenv("HISTORY_RECORD_INTERVAL", 300))  # 5 minutes
LOG_RETENTION_DAYS = int(os.getenv("LOG_RETENTION_DAYS", 30))

# =============================================================================
# Data Source Configuration (for evidence tracking)
# =============================================================================
DATA_SOURCES = {
    "government": {
        "name": "정부 기관",
        "credibility": 1.0,
        "description": "국정원, 외교부, 국토부, 경찰청 등 공식 정부 기관 발표",
        "collection_method": "API 연동 및 RSS 피드 수집",
        "update_frequency": "실시간",
        "examples": ["국가정보원 테러경보", "외교부 여행경보", "경찰청 치안정보"],
        "data_types": ["공식 발표문", "경보 등급", "위험 지역 정보"],
        "validation_method": "정부 공식 채널 인증"
    },
    "news_major": {
        "name": "주요 언론",
        "credibility": 0.9,
        "description": "연합뉴스, 로이터, AP통신 등 공인된 통신사",
        "collection_method": "뉴스 API 및 크롤링",
        "update_frequency": "5분 간격",
        "examples": ["연합뉴스", "로이터통신", "AP통신", "AFP통신"],
        "data_types": ["속보", "특보", "단독 보도"],
        "validation_method": "복수 통신사 교차 검증"
    },
    "news_general": {
        "name": "일반 언론",
        "credibility": 0.7,
        "description": "국내외 주요 일간지 및 방송사",
        "collection_method": "RSS 피드 수집",
        "update_frequency": "10분 간격",
        "examples": ["조선일보", "중앙일보", "BBC", "CNN"],
        "data_types": ["뉴스 기사", "분석 기사", "현장 보도"],
        "validation_method": "편집국 검증 체계"
    },
    "social_verified": {
        "name": "검증된 SNS",
        "credibility": 0.6,
        "description": "공식 인증 계정, 검증된 채널",
        "collection_method": "Twitter/Telegram API",
        "update_frequency": "실시간",
        "examples": ["정부기관 공식 트위터", "언론사 공식 채널", "전문가 인증 계정"],
        "data_types": ["공식 발표", "긴급 알림", "현장 영상"],
        "validation_method": "Blue Check 인증 확인"
    },
    "social_general": {
        "name": "일반 SNS",
        "credibility": 0.4,
        "description": "일반 소셜미디어 게시물",
        "collection_method": "키워드 모니터링",
        "update_frequency": "실시간",
        "examples": ["트위터 일반 계정", "페이스북 그룹", "레딧 포럼"],
        "data_types": ["목격담", "루머", "현장 사진/영상"],
        "validation_method": "AI 기반 신뢰도 분석 + 수동 검증"
    },
    "darkweb": {
        "name": "다크웹",
        "credibility": 0.3,
        "description": "다크웹 포럼 및 마켓플레이스 모니터링",
        "collection_method": "Tor 네트워크 크롤링",
        "update_frequency": "1시간 간격",
        "examples": ["해커 포럼", "테러리스트 채널", "밀수 마켓"],
        "data_types": ["위협 예고", "공격 계획", "거래 정보"],
        "validation_method": "위협 인텔리전스 팀 분석"
    },
    "internal": {
        "name": "내부 시스템",
        "credibility": 0.85,
        "description": "공항 보안 시스템, CCTV, 센서 데이터",
        "collection_method": "내부 API 연동",
        "update_frequency": "실시간",
        "examples": ["보안 검색대", "출입국 관리 시스템", "드론 탐지 레이더"],
        "data_types": ["알람 이벤트", "이상 탐지", "센서 데이터"],
        "validation_method": "시스템 자동 검증"
    },
    "osint": {
        "name": "공개 정보 (OSINT)",
        "credibility": 0.65,
        "description": "공개된 출처의 오픈소스 인텔리전스",
        "collection_method": "자동화 수집 + AI 분석",
        "update_frequency": "30분 간격",
        "examples": ["항공 데이터", "해운 정보", "위성 이미지"],
        "data_types": ["항공기 추적", "선박 위치", "지리 정보"],
        "validation_method": "복수 출처 교차 검증"
    },
    "anonymous": {
        "name": "익명 제보",
        "credibility": 0.2,
        "description": "익명 신고 및 제보",
        "collection_method": "제보 시스템",
        "update_frequency": "수시",
        "examples": ["내부 고발자", "시민 제보", "익명 이메일"],
        "data_types": ["제보 내용", "첨부 자료", "증거 파일"],
        "validation_method": "수동 검증 필수"
    }
}

# =============================================================================
# Threat Score Calculation Weights
# =============================================================================
CATEGORY_WEIGHTS = {
    "terror": {
        "weight": 0.25, 
        "name": "테러 위협", 
        "description": "물리적 테러 공격 관련 위협",
        "subcategories": ["폭발물 위협", "납치/인질", "총기 공격", "차량 테러", "화학/생물 테러"],
        "risk_factors": ["인명 피해 규모", "시설 파괴", "공포 확산"],
        "response_protocol": "즉시 대피, 전 구역 봉쇄, 폭발물 처리반 출동"
    },
    "cyber": {
        "weight": 0.20, 
        "name": "사이버 공격", 
        "description": "IT 인프라 및 시스템 대상 공격",
        "subcategories": ["랜섬웨어", "DDoS", "데이터 침해", "시스템 해킹", "피싱 공격"],
        "risk_factors": ["운항 시스템 마비", "개인정보 유출", "금전적 손실"],
        "response_protocol": "시스템 격리, 백업 전환, CERT 연계 대응"
    },
    "smuggling": {
        "weight": 0.15, 
        "name": "밀수/밀입국", 
        "description": "불법 물품 반입 및 밀입국 시도",
        "subcategories": ["마약 밀수", "무기 밀반입", "밀입국", "외화 밀반출", "멸종위기종 밀거래"],
        "risk_factors": ["국제범죄 연계", "국가 안보 위협", "범죄 네트워크 확산"],
        "response_protocol": "세관 집중 검색, 출입국 심사 강화, 관세청/경찰 공조"
    },
    "drone": {
        "weight": 0.15, 
        "name": "드론 위협", 
        "description": "무인 항공기 관련 위협",
        "subcategories": ["드론 침입", "활주로 방해", "정찰 드론", "무장 드론", "드론 테러"],
        "risk_factors": ["항공기 충돌", "운항 지연/취소", "시설 피해"],
        "response_protocol": "안티드론 시스템 가동, 활주로 일시 폐쇄, 드론 추적/포획"
    },
    "insider": {
        "weight": 0.15, 
        "name": "내부자 위협", 
        "description": "내부 직원 관련 보안 위협",
        "subcategories": ["정보 유출", "사보타주", "부정 접근", "협조자", "해고 직원"],
        "risk_factors": ["보안 체계 무력화", "민감 정보 유출", "시설 피해"],
        "response_protocol": "접근 권한 즉시 해제, 내부 조사, 경찰 수사 의뢰"
    },
    "geopolitical": {
        "weight": 0.10, 
        "name": "지정학적 위협", 
        "description": "국제 정세 및 외교 관련 위협",
        "subcategories": ["북한 도발", "미사일 발사", "외교 갈등", "국제 테러 조직", "지역 분쟁"],
        "risk_factors": ["항공로 변경", "운항 금지", "국가 비상사태"],
        "response_protocol": "정부 지침 대기, 대체 항로 준비, 승객 안내"
    }
}

# =============================================================================
# Threat Level Definitions
# =============================================================================
THREAT_LEVELS = {
    1: {
        "name": "LOW", 
        "min": 0, 
        "max": 29, 
        "color": "#1976D2", 
        "description": "일상적 모니터링 수준",
        "detailed_description": "특별한 위협 징후가 없는 정상 운영 상태입니다.",
        "actions": ["정기 보안 점검", "일반 모니터링 유지", "정상 운영 체제"],
        "staff_alert": "일반 근무",
        "passenger_notice": "정상 운영 중"
    },
    2: {
        "name": "GUARDED", 
        "min": 30, 
        "max": 49, 
        "color": "#689F38", 
        "description": "일반적 주의 수준",
        "detailed_description": "잠재적 위협 징후가 감지되어 추가 주의가 필요합니다.",
        "actions": ["강화된 모니터링", "보안 인력 대기", "취약 지점 점검"],
        "staff_alert": "주의 근무",
        "passenger_notice": "정상 운영 중 (보안 강화)"
    },
    3: {
        "name": "ELEVATED", 
        "min": 50, 
        "max": 69, 
        "color": "#FBC02D", 
        "description": "상향된 경계 수준",
        "detailed_description": "구체적인 위협 정보가 있어 경계 태세를 강화합니다.",
        "actions": ["보안 검색 강화", "추가 인력 배치", "CCTV 집중 모니터링", "출입 통제 강화"],
        "staff_alert": "경계 근무",
        "passenger_notice": "보안 검색 지연 예상"
    },
    4: {
        "name": "HIGH", 
        "min": 70, 
        "max": 89, 
        "color": "#F57C00", 
        "description": "높은 위협 수준",
        "detailed_description": "심각한 위협이 임박하여 비상 대응 체계를 가동합니다.",
        "actions": ["비상 대응팀 출동", "특정 구역 통제", "경찰/군 지원 요청", "출발/도착 지연 가능"],
        "staff_alert": "비상 근무",
        "passenger_notice": "일부 운항 지연, 보안 협조 요청"
    },
    5: {
        "name": "CRITICAL", 
        "min": 90, 
        "max": 100, 
        "color": "#D32F2F", 
        "description": "긴급 대응 필요",
        "detailed_description": "즉각적인 위협이 발생하여 전면적인 비상 대응이 필요합니다.",
        "actions": ["전 구역 대피 명령", "공항 전체 폐쇄", "군/경찰 전면 투입", "대테러 특공대 출동"],
        "staff_alert": "전원 비상 소집",
        "passenger_notice": "대피 지시, 운항 전면 중단"
    }
}

# =============================================================================
# Score Calculation Formulas (for documentation)
# =============================================================================
SCORE_CALCULATION = {
    "threat_score_formula": {
        "formula": "min(100, max(0, severity × category_weight × source_credibility × temporal_factor × 2))",
        "variables": {
            "severity": {"description": "원본 심각도", "range": "0-100"},
            "category_weight": {"description": "카테고리 가중치", "range": "0.10-0.25"},
            "source_credibility": {"description": "출처 신뢰도", "range": "0.2-1.0"},
            "temporal_factor": {"description": "시간 감쇠 계수", "range": "0.1-1.0"}
        }
    },
    "total_index_formula": {
        "formula": "min(100, max(0, Σ(category_index × category_weight) × 1.5))",
        "description": "각 카테고리의 평균 위협 점수에 가중치를 적용하여 합산 후 1.5배 스케일링"
    },
    "temporal_decay": {
        "description": "시간 경과에 따른 위협 점수 감쇠",
        "decay_table": {
            "0-1시간": 1.0,
            "1-6시간": 0.9,
            "6-24시간": 0.7,
            "1-3일": 0.5,
            "3-7일": 0.3,
            "7일 이상": 0.1
        }
    },
    "level_calculation": {
        "description": "총 지수 값에 따른 레벨 결정",
        "method": "total_index 값이 해당하는 THREAT_LEVELS의 min-max 범위로 레벨 결정"
    }
}
