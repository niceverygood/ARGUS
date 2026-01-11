"""
ARGUS SKY - Database Models & Connection
Supabase PostgreSQL + Full Logging System
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import os

from config import DATABASE_URL, USE_SQLITE, SQLITE_URL, DEBUG

# =============================================================================
# Database Engine Setup
# =============================================================================
if USE_SQLITE:
    engine = create_async_engine(SQLITE_URL, echo=DEBUG)
else:
    engine = create_async_engine(
        DATABASE_URL, 
        echo=DEBUG,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True
    )

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

# =============================================================================
# Core Models
# =============================================================================

class Threat(Base):
    """위협 정보 테이블"""
    __tablename__ = "threats"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    category = Column(String(50), nullable=False, index=True)  # terror, cyber, smuggling, drone, insider, geopolitical
    severity = Column(Integer, default=50)  # 0-100
    credibility = Column(Float, default=0.5)  # 0-1
    
    # Source Information (Data Provenance)
    source_type = Column(String(50), index=True)  # government, news, social, darkweb, internal
    source_name = Column(String(200))
    source_url = Column(Text, nullable=True)
    source_raw_data = Column(Text, nullable=True)  # Original raw data for verification
    
    # Location Information
    location = Column(String(200), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Analysis & Scoring
    entities = Column(JSON, default=dict)  # Extracted entities (people, orgs, locations)
    keywords = Column(JSON, default=list)
    language = Column(String(10), default="ko")
    
    # Calculated Score & Evidence
    threat_score = Column(Float, default=0)
    score_breakdown = Column(JSON, default=dict)  # Detailed scoring breakdown
    
    # Status & Workflow
    status = Column(String(50), default="new", index=True)  # new, analyzing, confirmed, resolved, false_positive
    assigned_to = Column(String(100), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Timestamps
    collected_at = Column(DateTime, default=datetime.utcnow)  # When data was collected
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_threat_category_status', 'category', 'status'),
        Index('idx_threat_created', 'created_at'),
    )


class Alert(Base):
    """알림 테이블"""
    __tablename__ = "alerts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    threat_id = Column(String(36), ForeignKey("threats.id"), nullable=True, index=True)
    level = Column(Integer, nullable=False, index=True)  # 1-5
    title = Column(String(500), nullable=False)
    message = Column(Text)
    channels = Column(JSON, default=list)  # ["email", "sms", "push"]
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class ThreatIndexHistory(Base):
    """위협 지수 이력 테이블 - 트렌드 분석용"""
    __tablename__ = "threat_index_history"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    total_index = Column(Float, nullable=False)
    level = Column(Integer, nullable=False)
    level_name = Column(String(20))
    
    # Category-wise indices
    terror_index = Column(Float, default=0)
    cyber_index = Column(Float, default=0)
    smuggling_index = Column(Float, default=0)
    drone_index = Column(Float, default=0)
    insider_index = Column(Float, default=0)
    geopolitical_index = Column(Float, default=0)
    
    # Metadata
    active_threats_count = Column(Integer, default=0)
    calculation_details = Column(JSON, default=dict)  # Detailed calculation breakdown
    
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)


# =============================================================================
# Logging & Audit Models
# =============================================================================

class DataCollectionLog(Base):
    """데이터 수집 로그 - 모든 데이터 수집 활동 기록"""
    __tablename__ = "data_collection_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_type = Column(String(50), nullable=False, index=True)
    source_name = Column(String(200))
    
    # Collection Details
    collection_method = Column(String(100))  # api, crawl, rss, manual
    endpoint_url = Column(Text, nullable=True)
    query_params = Column(JSON, default=dict)
    
    # Results
    status = Column(String(50), default="success")  # success, failed, partial
    items_collected = Column(Integer, default=0)
    items_processed = Column(Integer, default=0)
    items_filtered = Column(Integer, default=0)  # Filtered out as irrelevant
    
    # Raw Response (for debugging)
    response_status_code = Column(Integer, nullable=True)
    response_headers = Column(JSON, nullable=True)
    response_sample = Column(Text, nullable=True)  # First 1000 chars of response
    
    # Error Info
    error_message = Column(Text, nullable=True)
    error_traceback = Column(Text, nullable=True)
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class ScoreCalculationLog(Base):
    """점수 계산 로그 - 위협 점수 산출 과정 기록"""
    __tablename__ = "score_calculation_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    threat_id = Column(String(36), ForeignKey("threats.id"), nullable=True, index=True)
    calculation_type = Column(String(50), nullable=False)  # individual, category, total
    
    # Input Values
    input_values = Column(JSON, default=dict)
    
    # Calculation Steps
    category_weight = Column(Float, nullable=True)
    source_credibility = Column(Float, nullable=True)
    temporal_factor = Column(Float, nullable=True)
    severity_score = Column(Float, nullable=True)
    
    # Formula Applied
    formula_used = Column(Text)
    calculation_steps = Column(JSON, default=list)  # Step-by-step breakdown
    
    # Output
    final_score = Column(Float, nullable=False)
    score_level = Column(Integer, nullable=True)
    
    # Context
    active_threats_at_time = Column(Integer, nullable=True)
    category_threats_at_time = Column(Integer, nullable=True)
    
    calculated_at = Column(DateTime, default=datetime.utcnow, index=True)


class SystemEventLog(Base):
    """시스템 이벤트 로그 - 모든 시스템 활동 기록"""
    __tablename__ = "system_event_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_type = Column(String(100), nullable=False, index=True)
    event_category = Column(String(50), index=True)  # api, websocket, scheduler, demo, error
    
    # Event Details
    description = Column(Text)
    details = Column(JSON, default=dict)
    
    # Request Context (for API events)
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)
    request_params = Column(JSON, nullable=True)
    response_status = Column(Integer, nullable=True)
    
    # User/Client Info
    client_ip = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Error Info
    error_type = Column(String(200), nullable=True)
    error_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class WebSocketConnectionLog(Base):
    """WebSocket 연결 로그"""
    __tablename__ = "websocket_connection_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    connection_id = Column(String(100), index=True)
    
    event_type = Column(String(50))  # connect, disconnect, message, error
    client_ip = Column(String(50), nullable=True)
    
    # Message Info (for message events)
    message_type = Column(String(50), nullable=True)
    message_size_bytes = Column(Integer, nullable=True)
    
    # Error Info
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class DemoScenarioLog(Base):
    """데모 시나리오 실행 로그"""
    __tablename__ = "demo_scenario_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    scenario_type = Column(String(50), nullable=False, index=True)
    scenario_name = Column(String(200))
    
    # Execution Details
    triggered_by = Column(String(100))  # keyboard_shortcut, api, scheduled
    trigger_details = Column(JSON, default=dict)
    
    # Before State
    index_before = Column(Float)
    level_before = Column(Integer)
    categories_before = Column(JSON)
    
    # After State
    index_after = Column(Float)
    level_after = Column(Integer)
    categories_after = Column(JSON)
    
    # Generated Data
    threats_generated = Column(Integer, default=0)
    alerts_generated = Column(Integer, default=0)
    
    executed_at = Column(DateTime, default=datetime.utcnow, index=True)


class AIReasoningLog(Base):
    """AI 추론 로그 - AI가 데이터를 어떻게 분석하고 추론했는지 기록"""
    __tablename__ = "ai_reasoning_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    threat_id = Column(String(36), ForeignKey("threats.id"), nullable=True, index=True)
    collection_log_id = Column(String(36), ForeignKey("data_collection_logs.id"), nullable=True)
    
    # Input Data
    raw_input = Column(Text)  # Original raw data that was analyzed
    input_source = Column(String(100))  # Where the data came from
    input_type = Column(String(50))  # news_article, social_post, sensor_data, etc.
    
    # AI Processing Steps
    ai_model = Column(String(100))  # gpt-4, claude, rule-based, etc.
    processing_steps = Column(JSON, default=list)  # Step-by-step reasoning chain
    
    # Entity Extraction
    entities_extracted = Column(JSON, default=dict)  # people, orgs, locations, dates
    keywords_extracted = Column(JSON, default=list)
    
    # Classification & Reasoning
    category_reasoning = Column(Text)  # Why this category was chosen
    category_confidence = Column(Float)  # Confidence in category classification
    severity_reasoning = Column(Text)  # Why this severity level
    severity_confidence = Column(Float)
    
    # Threat Assessment
    threat_indicators = Column(JSON, default=list)  # What indicators suggest a threat
    risk_factors = Column(JSON, default=list)  # Identified risk factors
    mitigating_factors = Column(JSON, default=list)  # Factors that reduce risk
    
    # Final Assessment
    overall_assessment = Column(Text)  # AI's final assessment summary
    recommendation = Column(Text)  # Recommended actions
    confidence_score = Column(Float)  # Overall confidence in assessment
    
    # Processing Metadata
    processing_time_ms = Column(Integer)
    tokens_used = Column(Integer, nullable=True)  # If using LLM
    model_version = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# =============================================================================
# Database Functions
# =============================================================================

async def init_db():
    """데이터베이스 초기화 - 테이블 생성"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created successfully")


async def get_db():
    """데이터베이스 세션 의존성"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def log_data_collection(
    session: AsyncSession,
    source_type: str,
    source_name: str,
    collection_method: str,
    items_collected: int,
    status: str = "success",
    error_message: str = None,
    **kwargs
):
    """데이터 수집 로그 기록"""
    log = DataCollectionLog(
        source_type=source_type,
        source_name=source_name,
        collection_method=collection_method,
        items_collected=items_collected,
        status=status,
        error_message=error_message,
        **kwargs
    )
    session.add(log)
    return log


async def log_score_calculation(
    session: AsyncSession,
    calculation_type: str,
    final_score: float,
    threat_id: str = None,
    **kwargs
):
    """점수 계산 로그 기록"""
    log = ScoreCalculationLog(
        threat_id=threat_id,
        calculation_type=calculation_type,
        final_score=final_score,
        **kwargs
    )
    session.add(log)
    return log


async def log_system_event(
    session: AsyncSession,
    event_type: str,
    event_category: str,
    description: str = None,
    **kwargs
):
    """시스템 이벤트 로그 기록"""
    log = SystemEventLog(
        event_type=event_type,
        event_category=event_category,
        description=description,
        **kwargs
    )
    session.add(log)
    return log


async def log_ai_reasoning(
    session: AsyncSession,
    raw_input: str,
    input_source: str,
    input_type: str,
    ai_model: str,
    processing_steps: list,
    category_reasoning: str,
    severity_reasoning: str,
    overall_assessment: str,
    threat_id: str = None,
    collection_log_id: str = None,
    **kwargs
):
    """AI 추론 로그 기록"""
    log = AIReasoningLog(
        threat_id=threat_id,
        collection_log_id=collection_log_id,
        raw_input=raw_input,
        input_source=input_source,
        input_type=input_type,
        ai_model=ai_model,
        processing_steps=processing_steps,
        category_reasoning=category_reasoning,
        severity_reasoning=severity_reasoning,
        overall_assessment=overall_assessment,
        **kwargs
    )
    session.add(log)
    return log
