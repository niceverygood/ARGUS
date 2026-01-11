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
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
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
        "update_frequency": "실시간"
    },
    "news_major": {
        "name": "주요 언론",
        "credibility": 0.9,
        "description": "연합뉴스, 로이터, AP통신 등 공인된 통신사",
        "collection_method": "뉴스 API 및 크롤링",
        "update_frequency": "5분 간격"
    },
    "news_general": {
        "name": "일반 언론",
        "credibility": 0.7,
        "description": "국내외 주요 일간지 및 방송사",
        "collection_method": "RSS 피드 수집",
        "update_frequency": "10분 간격"
    },
    "social_verified": {
        "name": "검증된 SNS",
        "credibility": 0.6,
        "description": "공식 인증 계정, 검증된 채널",
        "collection_method": "Twitter/Telegram API",
        "update_frequency": "실시간"
    },
    "social_general": {
        "name": "일반 SNS",
        "credibility": 0.4,
        "description": "일반 소셜미디어 게시물",
        "collection_method": "키워드 모니터링",
        "update_frequency": "실시간"
    },
    "darkweb": {
        "name": "다크웹",
        "credibility": 0.3,
        "description": "다크웹 포럼 및 마켓플레이스 모니터링",
        "collection_method": "Tor 네트워크 크롤링",
        "update_frequency": "1시간 간격"
    },
    "internal": {
        "name": "내부 시스템",
        "credibility": 0.85,
        "description": "공항 보안 시스템, CCTV, 센서 데이터",
        "collection_method": "내부 API 연동",
        "update_frequency": "실시간"
    },
    "anonymous": {
        "name": "익명 제보",
        "credibility": 0.2,
        "description": "익명 신고 및 제보",
        "collection_method": "제보 시스템",
        "update_frequency": "수시"
    }
}

# =============================================================================
# Threat Score Calculation Weights
# =============================================================================
CATEGORY_WEIGHTS = {
    "terror": {"weight": 0.25, "name": "테러 위협", "description": "물리적 테러 공격 관련 위협"},
    "cyber": {"weight": 0.20, "name": "사이버 공격", "description": "IT 인프라 및 시스템 대상 공격"},
    "smuggling": {"weight": 0.15, "name": "밀수/밀입국", "description": "불법 물품 반입 및 밀입국 시도"},
    "drone": {"weight": 0.15, "name": "드론 위협", "description": "무인 항공기 관련 위협"},
    "insider": {"weight": 0.15, "name": "내부자 위협", "description": "내부 직원 관련 보안 위협"},
    "geopolitical": {"weight": 0.10, "name": "지정학적 위협", "description": "국제 정세 및 외교 관련 위협"}
}

# =============================================================================
# Threat Level Definitions
# =============================================================================
THREAT_LEVELS = {
    1: {"name": "LOW", "min": 0, "max": 29, "color": "#1976D2", "description": "일상적 모니터링 수준"},
    2: {"name": "GUARDED", "min": 30, "max": 49, "color": "#689F38", "description": "일반적 주의 수준"},
    3: {"name": "ELEVATED", "min": 50, "max": 69, "color": "#FBC02D", "description": "상향된 경계 수준"},
    4: {"name": "HIGH", "min": 70, "max": 89, "color": "#F57C00", "description": "높은 위협 수준"},
    5: {"name": "CRITICAL", "min": 90, "max": 100, "color": "#D32F2F", "description": "긴급 대응 필요"}
}
