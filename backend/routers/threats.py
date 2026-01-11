"""
ARGUS SKY - Threats Router
위협 정보 API 엔드포인트
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta

from schemas import ThreatResponse, ThreatSummary
from services.simulation_scheduler import scheduler

router = APIRouter()


def format_time_ago(dt: datetime) -> str:
    """시간 경과 포맷팅"""
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace('Z', ''))
    
    diff = datetime.utcnow() - dt
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "방금 전"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"{minutes}분 전"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours}시간 전"
    else:
        days = int(seconds / 86400)
        return f"{days}일 전"


@router.get("", response_model=List[ThreatResponse])
async def get_threats(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    status: Optional[str] = Query(None, description="상태 필터"),
    level: Optional[int] = Query(None, ge=1, le=5, description="위협 레벨"),
    limit: int = Query(50, ge=1, le=100, description="결과 수"),
    offset: int = Query(0, ge=0, description="오프셋"),
):
    """위협 목록 조회"""
    threats = scheduler.get_threats(limit=100)
    
    # 필터링
    if category:
        threats = [t for t in threats if t.get("category") == category]
    
    if status:
        threats = [t for t in threats if t.get("status") == status]
    
    if level:
        # 레벨에 따른 심각도 범위
        ranges = {
            1: (0, 29),
            2: (30, 49),
            3: (50, 69),
            4: (70, 89),
            5: (90, 100),
        }
        min_sev, max_sev = ranges.get(level, (0, 100))
        threats = [t for t in threats if min_sev <= t.get("severity", 0) <= max_sev]
    
    # 정렬 (최신순)
    threats.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # 페이지네이션
    threats = threats[offset:offset + limit]
    
    # time_ago 추가
    for threat in threats:
        created_at = threat.get("created_at", "")
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace('Z', ''))
                threat["time_ago"] = format_time_ago(dt)
            except:
                threat["time_ago"] = "알 수 없음"
        else:
            threat["time_ago"] = "알 수 없음"
        
        # threat_score 계산
        threat["threat_score"] = threat.get("severity", 0) * threat.get("credibility", 0.5)
    
    return threats


@router.get("/stats/summary", response_model=ThreatSummary)
async def get_threat_summary():
    """위협 요약 통계"""
    threats = scheduler.get_threats(limit=100)
    
    # 카테고리별 건수
    by_category = {}
    for threat in threats:
        cat = threat.get("category", "unknown")
        by_category[cat] = by_category.get(cat, 0) + 1
    
    # 상태별 건수
    by_status = {}
    for threat in threats:
        status = threat.get("status", "unknown")
        by_status[status] = by_status.get(status, 0) + 1
    
    # 평균 심각도
    severities = [t.get("severity", 0) for t in threats]
    avg_severity = sum(severities) / len(severities) if severities else 0
    
    return {
        "total_count": len(threats),
        "by_category": by_category,
        "by_status": by_status,
        "avg_severity": round(avg_severity, 1),
        "change_24h": 5.2,  # 시뮬레이션 값
    }


@router.get("/{threat_id}", response_model=ThreatResponse)
async def get_threat(threat_id: str):
    """위협 상세 조회"""
    threats = scheduler.get_threats(limit=100)
    
    for threat in threats:
        if threat.get("id") == threat_id:
            created_at = threat.get("created_at", "")
            if created_at:
                try:
                    dt = datetime.fromisoformat(created_at.replace('Z', ''))
                    threat["time_ago"] = format_time_ago(dt)
                except:
                    threat["time_ago"] = "알 수 없음"
            threat["threat_score"] = threat.get("severity", 0) * threat.get("credibility", 0.5)
            return threat
    
    raise HTTPException(status_code=404, detail="Threat not found")

