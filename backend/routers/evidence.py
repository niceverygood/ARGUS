"""
ARGUS SKY - Evidence & Logs API
데이터 근거 및 로그 조회 API
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
from typing import Optional, List

from database import (
    get_db, 
    Threat, 
    DataCollectionLog, 
    ScoreCalculationLog, 
    SystemEventLog,
    ThreatIndexHistory,
    AIReasoningLog
)
from config import DATA_SOURCES, CATEGORY_WEIGHTS, THREAT_LEVELS, SCORE_CALCULATION
from services.threat_calculator import calculator
from services.simulation_scheduler import scheduler

router = APIRouter()

# =============================================================================
# Data Sources Information
# =============================================================================

@router.get("/sources")
async def get_data_sources():
    """
    데이터 출처 정보 조회
    - 모든 데이터 소스의 설명, 신뢰도, 수집 방법 제공
    """
    return {
        "sources": DATA_SOURCES,
        "description": "ARGUS SKY에서 위협 정보를 수집하는 모든 데이터 출처 목록",
        "credibility_scale": {
            "1.0": "완전 신뢰 (정부 공식 발표)",
            "0.8-0.9": "높은 신뢰 (주요 언론, 내부 시스템)",
            "0.6-0.7": "중간 신뢰 (일반 언론, 검증된 SNS)",
            "0.3-0.5": "낮은 신뢰 (일반 SNS, 다크웹)",
            "0.1-0.2": "매우 낮은 신뢰 (익명 제보)"
        }
    }


@router.get("/categories")
async def get_category_info():
    """
    위협 카테고리 정보 조회
    - 각 카테고리의 가중치와 설명 제공
    """
    return {
        "categories": CATEGORY_WEIGHTS,
        "description": "위협 지수 계산에 사용되는 카테고리별 가중치",
        "total_weight": sum(c["weight"] for c in CATEGORY_WEIGHTS.values())
    }


@router.get("/levels")
async def get_threat_levels():
    """
    위협 레벨 정의 조회
    - 각 레벨의 범위, 색상, 설명 제공
    """
    return {
        "levels": THREAT_LEVELS,
        "description": "위협 지수에 따른 경보 레벨 정의"
    }


@router.get("/calculation-formulas")
async def get_calculation_formulas():
    """
    점수 계산 공식 정보 조회
    - 위협 점수 계산에 사용되는 모든 공식과 변수 설명
    """
    return {
        "formulas": SCORE_CALCULATION,
        "description": "위협 점수 및 지수 계산에 사용되는 공식 정보"
    }


# =============================================================================
# Score Calculation Evidence
# =============================================================================

@router.get("/threat/{threat_id}/score-breakdown")
async def get_threat_score_breakdown(
    threat_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    특정 위협의 점수 계산 상세 내역 조회
    - 점수가 어떻게 산출되었는지 단계별 확인
    """
    # Get threat
    result = await db.execute(select(Threat).where(Threat.id == threat_id))
    threat = result.scalar_one_or_none()
    
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    
    # Calculate score with full details
    score, details = calculator.calculate_threat_score(threat, include_details=True)
    
    # Get source info
    source_info = calculator.get_source_info(threat.source_type)
    category_info = calculator.get_category_info(threat.category)
    
    return {
        "threat_id": threat_id,
        "threat_title": threat.title,
        "threat_score": score,
        "calculation_details": details,
        "source_evidence": {
            "source_type": threat.source_type,
            "source_name": threat.source_name,
            "source_url": threat.source_url,
            "source_info": source_info,
            "raw_data_available": bool(threat.source_raw_data)
        },
        "category_evidence": category_info,
        "metadata": {
            "collected_at": threat.collected_at,
            "created_at": threat.created_at,
            "updated_at": threat.updated_at
        }
    }


@router.get("/threat/{threat_id}/raw-data")
async def get_threat_raw_data(
    threat_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    위협 원본 데이터 조회
    - 수집된 원본 데이터 확인
    """
    result = await db.execute(select(Threat).where(Threat.id == threat_id))
    threat = result.scalar_one_or_none()
    
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    
    return {
        "threat_id": threat_id,
        "title": threat.title,
        "source": {
            "type": threat.source_type,
            "name": threat.source_name,
            "url": threat.source_url
        },
        "raw_data": threat.source_raw_data,
        "entities_extracted": threat.entities,
        "keywords_extracted": threat.keywords,
        "collected_at": threat.collected_at
    }


# =============================================================================
# Collection Logs
# =============================================================================

@router.get("/logs/collection")
async def get_collection_logs(
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    hours: int = Query(default=24, le=168),
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db)
):
    """
    데이터 수집 로그 조회
    - 언제, 어디서, 어떻게 데이터를 수집했는지 확인
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    query = select(DataCollectionLog).where(
        DataCollectionLog.created_at >= since
    ).order_by(desc(DataCollectionLog.created_at)).limit(limit)
    
    if source_type:
        query = query.where(DataCollectionLog.source_type == source_type)
    if status:
        query = query.where(DataCollectionLog.status == status)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return {
        "logs": [{
            "id": log.id,
            "source_type": log.source_type,
            "source_name": log.source_name,
            "collection_method": log.collection_method,
            "status": log.status,
            "items_collected": log.items_collected,
            "items_processed": log.items_processed,
            "duration_ms": log.duration_ms,
            "error_message": log.error_message,
            "created_at": log.created_at
        } for log in logs],
        "total_count": len(logs),
        "time_range_hours": hours
    }


@router.get("/logs/collection/stats")
async def get_collection_stats(
    hours: int = Query(default=24, le=168),
    db: AsyncSession = Depends(get_db)
):
    """
    데이터 수집 통계 조회
    - 출처별 수집 성공률, 수집량 통계
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Get all logs in time range
    query = select(DataCollectionLog).where(DataCollectionLog.created_at >= since)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Calculate stats by source
    stats_by_source = {}
    for log in logs:
        if log.source_type not in stats_by_source:
            stats_by_source[log.source_type] = {
                "total_runs": 0,
                "successful_runs": 0,
                "failed_runs": 0,
                "total_items_collected": 0,
                "total_items_processed": 0,
                "avg_duration_ms": 0,
                "durations": []
            }
        
        stats = stats_by_source[log.source_type]
        stats["total_runs"] += 1
        if log.status == "success":
            stats["successful_runs"] += 1
        else:
            stats["failed_runs"] += 1
        stats["total_items_collected"] += log.items_collected or 0
        stats["total_items_processed"] += log.items_processed or 0
        if log.duration_ms:
            stats["durations"].append(log.duration_ms)
    
    # Calculate averages
    for source, stats in stats_by_source.items():
        if stats["durations"]:
            stats["avg_duration_ms"] = sum(stats["durations"]) / len(stats["durations"])
        stats["success_rate"] = (stats["successful_runs"] / stats["total_runs"] * 100) if stats["total_runs"] > 0 else 0
        del stats["durations"]  # Remove raw data
    
    return {
        "stats_by_source": stats_by_source,
        "time_range_hours": hours,
        "total_logs": len(logs)
    }


# =============================================================================
# Score Calculation Logs
# =============================================================================

@router.get("/logs/calculations")
async def get_calculation_logs(
    calculation_type: Optional[str] = None,
    threat_id: Optional[str] = None,
    hours: int = Query(default=24, le=168),
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db)
):
    """
    점수 계산 로그 조회
    - 위협 점수가 어떻게 계산되었는지 이력 확인
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    query = select(ScoreCalculationLog).where(
        ScoreCalculationLog.calculated_at >= since
    ).order_by(desc(ScoreCalculationLog.calculated_at)).limit(limit)
    
    if calculation_type:
        query = query.where(ScoreCalculationLog.calculation_type == calculation_type)
    if threat_id:
        query = query.where(ScoreCalculationLog.threat_id == threat_id)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return {
        "logs": [{
            "id": log.id,
            "threat_id": log.threat_id,
            "calculation_type": log.calculation_type,
            "input_values": log.input_values,
            "category_weight": log.category_weight,
            "source_credibility": log.source_credibility,
            "temporal_factor": log.temporal_factor,
            "final_score": log.final_score,
            "formula_used": log.formula_used,
            "calculation_steps": log.calculation_steps,
            "calculated_at": log.calculated_at
        } for log in logs],
        "total_count": len(logs),
        "time_range_hours": hours
    }


# =============================================================================
# Index History with Evidence
# =============================================================================

@router.get("/index-history")
async def get_index_history_with_evidence(
    hours: int = Query(default=24, le=720),
    interval_minutes: int = Query(default=60, le=360),
    db: AsyncSession = Depends(get_db)
):
    """
    위협 지수 이력 조회 (계산 근거 포함)
    - 시간대별 위협 지수와 그 산출 근거
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    query = select(ThreatIndexHistory).where(
        ThreatIndexHistory.recorded_at >= since
    ).order_by(ThreatIndexHistory.recorded_at)
    
    result = await db.execute(query)
    history = result.scalars().all()
    
    return {
        "history": [{
            "id": h.id,
            "recorded_at": h.recorded_at,
            "total_index": h.total_index,
            "level": h.level,
            "level_name": h.level_name,
            "categories": {
                "terror": h.terror_index,
                "cyber": h.cyber_index,
                "smuggling": h.smuggling_index,
                "drone": h.drone_index,
                "insider": h.insider_index,
                "geopolitical": h.geopolitical_index
            },
            "active_threats": h.active_threats_count,
            "calculation_details": h.calculation_details
        } for h in history],
        "total_records": len(history),
        "time_range_hours": hours
    }


# =============================================================================
# System Events
# =============================================================================

@router.get("/logs/system")
async def get_system_logs(
    event_category: Optional[str] = None,
    event_type: Optional[str] = None,
    hours: int = Query(default=24, le=168),
    limit: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db)
):
    """
    시스템 이벤트 로그 조회
    - API 호출, WebSocket 이벤트, 스케줄러 실행 등 모든 시스템 활동
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    query = select(SystemEventLog).where(
        SystemEventLog.created_at >= since
    ).order_by(desc(SystemEventLog.created_at)).limit(limit)
    
    if event_category:
        query = query.where(SystemEventLog.event_category == event_category)
    if event_type:
        query = query.where(SystemEventLog.event_type == event_type)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return {
        "logs": [{
            "id": log.id,
            "event_type": log.event_type,
            "event_category": log.event_category,
            "description": log.description,
            "details": log.details,
            "request_method": log.request_method,
            "request_path": log.request_path,
            "response_status": log.response_status,
            "error_message": log.error_message,
            "created_at": log.created_at
        } for log in logs],
        "total_count": len(logs),
        "time_range_hours": hours
    }


# =============================================================================
# AI Reasoning Logs
# =============================================================================

@router.get("/logs/ai-reasoning")
async def get_ai_reasoning_logs(
    threat_id: Optional[str] = None,
    input_source: Optional[str] = None,
    hours: int = Query(default=24, le=168),
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db)
):
    """
    AI 추론 로그 조회
    - AI가 데이터를 어떻게 분석하고 추론했는지 확인
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    query = select(AIReasoningLog).where(
        AIReasoningLog.created_at >= since
    ).order_by(desc(AIReasoningLog.created_at)).limit(limit)
    
    if threat_id:
        query = query.where(AIReasoningLog.threat_id == threat_id)
    if input_source:
        query = query.where(AIReasoningLog.input_source == input_source)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return {
        "logs": [{
            "id": log.id,
            "threat_id": log.threat_id,
            "raw_input": log.raw_input[:500] + "..." if log.raw_input and len(log.raw_input) > 500 else log.raw_input,
            "input_source": log.input_source,
            "input_type": log.input_type,
            "ai_model": log.ai_model,
            "processing_steps": log.processing_steps,
            "entities_extracted": log.entities_extracted,
            "keywords_extracted": log.keywords_extracted,
            "category_reasoning": log.category_reasoning,
            "category_confidence": log.category_confidence,
            "severity_reasoning": log.severity_reasoning,
            "severity_confidence": log.severity_confidence,
            "threat_indicators": log.threat_indicators,
            "risk_factors": log.risk_factors,
            "mitigating_factors": log.mitigating_factors,
            "overall_assessment": log.overall_assessment,
            "recommendation": log.recommendation,
            "confidence_score": log.confidence_score,
            "processing_time_ms": log.processing_time_ms,
            "created_at": log.created_at
        } for log in logs],
        "total_count": len(logs),
        "time_range_hours": hours
    }


@router.get("/logs/ai-reasoning/{log_id}")
async def get_ai_reasoning_detail(
    log_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    특정 AI 추론 로그 상세 조회
    """
    result = await db.execute(
        select(AIReasoningLog).where(AIReasoningLog.id == log_id)
    )
    log = result.scalar_one_or_none()
    
    if not log:
        raise HTTPException(status_code=404, detail="AI reasoning log not found")
    
    # Get associated threat if exists
    threat_info = None
    if log.threat_id:
        threat_result = await db.execute(
            select(Threat).where(Threat.id == log.threat_id)
        )
        threat = threat_result.scalar_one_or_none()
        if threat:
            threat_info = {
                "id": threat.id,
                "title": threat.title,
                "category": threat.category,
                "severity": threat.severity,
                "threat_score": threat.threat_score
            }
    
    return {
        "log": {
            "id": log.id,
            "threat_id": log.threat_id,
            "threat_info": threat_info,
            "collection_log_id": log.collection_log_id,
            "raw_input": log.raw_input,  # Full raw input
            "input_source": log.input_source,
            "input_type": log.input_type,
            "ai_model": log.ai_model,
            "model_version": log.model_version,
            "processing_steps": log.processing_steps,
            "entities_extracted": log.entities_extracted,
            "keywords_extracted": log.keywords_extracted,
            "category_reasoning": log.category_reasoning,
            "category_confidence": log.category_confidence,
            "severity_reasoning": log.severity_reasoning,
            "severity_confidence": log.severity_confidence,
            "threat_indicators": log.threat_indicators,
            "risk_factors": log.risk_factors,
            "mitigating_factors": log.mitigating_factors,
            "overall_assessment": log.overall_assessment,
            "recommendation": log.recommendation,
            "confidence_score": log.confidence_score,
            "processing_time_ms": log.processing_time_ms,
            "tokens_used": log.tokens_used,
            "created_at": log.created_at
        }
    }


# =============================================================================
# Simulated Logs (In-Memory - from Scheduler)
# =============================================================================

@router.get("/logs/simulated/collection")
async def get_simulated_collection_logs(
    limit: int = Query(default=50, le=100)
):
    """
    시뮬레이션 데이터 수집 로그 조회 (메모리 기반)
    - 실시간 시뮬레이션에서 생성된 데이터 수집 기록
    """
    logs = scheduler.get_collection_logs(limit=limit)
    return {
        "logs": logs,
        "total_count": len(logs),
        "source": "in-memory simulation"
    }


@router.get("/logs/simulated/ai-reasoning")
async def get_simulated_ai_reasoning_logs(
    threat_id: Optional[str] = None,
    limit: int = Query(default=50, le=100)
):
    """
    시뮬레이션 AI 추론 로그 조회 (메모리 기반)
    - 실시간 시뮬레이션에서 생성된 AI 분석 과정 기록
    """
    logs = scheduler.get_ai_reasoning_logs(limit=limit, threat_id=threat_id)
    return {
        "logs": logs,
        "total_count": len(logs),
        "source": "in-memory simulation"
    }


@router.get("/logs/simulated/ai-reasoning/{log_id}")
async def get_simulated_ai_reasoning_detail(log_id: str):
    """
    특정 시뮬레이션 AI 추론 로그 상세 조회
    """
    log = scheduler.get_ai_reasoning_log_by_id(log_id)
    
    if not log:
        raise HTTPException(status_code=404, detail="AI reasoning log not found")
    
    # 연관된 위협 정보 찾기
    threats = scheduler.get_threats(limit=100)
    threat_info = None
    for threat in threats:
        if threat.get("id") == log.get("threat_id"):
            threat_info = {
                "id": threat.get("id"),
                "title": threat.get("title"),
                "category": threat.get("category"),
                "severity": threat.get("severity"),
                "credibility": threat.get("credibility")
            }
            break
    
    return {
        "log": log,
        "threat_info": threat_info,
        "source": "in-memory simulation"
    }


@router.get("/logs/simulated/collection/{log_id}")
async def get_simulated_collection_detail(log_id: str):
    """
    특정 시뮬레이션 데이터 수집 로그 상세 조회
    """
    log = scheduler.get_collection_log_by_id(log_id)
    
    if not log:
        raise HTTPException(status_code=404, detail="Collection log not found")
    
    return {
        "log": log,
        "source": "in-memory simulation"
    }


# =============================================================================
# Evidence Summary
# =============================================================================

@router.get("/summary")
async def get_evidence_summary(
    hours: int = Query(default=24, le=168),
    db: AsyncSession = Depends(get_db)
):
    """
    데이터 근거 요약
    - 전체 시스템의 데이터 수집 및 처리 현황 요약
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Count collection logs
    collection_count = await db.execute(
        select(func.count(DataCollectionLog.id)).where(DataCollectionLog.created_at >= since)
    )
    
    # Count calculation logs
    calc_count = await db.execute(
        select(func.count(ScoreCalculationLog.id)).where(ScoreCalculationLog.calculated_at >= since)
    )
    
    # Count threats
    threat_count = await db.execute(
        select(func.count(Threat.id)).where(Threat.created_at >= since)
    )
    
    # Count index history
    history_count = await db.execute(
        select(func.count(ThreatIndexHistory.id)).where(ThreatIndexHistory.recorded_at >= since)
    )
    
    return {
        "time_range_hours": hours,
        "summary": {
            "data_collection_runs": collection_count.scalar() or 0,
            "score_calculations": calc_count.scalar() or 0,
            "threats_processed": threat_count.scalar() or 0,
            "index_snapshots": history_count.scalar() or 0
        },
        "data_sources_configured": len(DATA_SOURCES),
        "categories_configured": len(CATEGORY_WEIGHTS),
        "system_status": "operational"
    }

