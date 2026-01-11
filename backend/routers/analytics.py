"""
ARGUS SKY - Analytics Router
분석 및 통계 API 엔드포인트
"""
from fastapi import APIRouter, Query
from typing import List
from datetime import datetime, timedelta
import random

from schemas import ThreatIndexResponse, TrendDataPoint, CategoryDistribution, SourceStats, CategoryIndex
from services.simulation_scheduler import scheduler
from services.threat_calculator import calculator

router = APIRouter()


@router.get("/threat-index", response_model=ThreatIndexResponse)
async def get_current_threat_index():
    """현재 위협 지수 조회"""
    state = scheduler.get_current_state()
    
    return {
        "total_index": state["total_index"],
        "level": state["level"],
        "level_name": state["level_name"],
        "categories": CategoryIndex(**state["categories"]),
        "change_24h": round(random.uniform(-5, 5), 1),
        "timestamp": datetime.utcnow(),
    }


@router.get("/trend", response_model=List[TrendDataPoint])
async def get_trend(
    hours: int = Query(24, ge=1, le=720, description="시간 범위"),
    interval: str = Query("hour", description="데이터 간격 (hour/day)"),
):
    """위협 지수 트렌드 조회"""
    data_points = []
    current_time = datetime.utcnow()
    
    # 현재 상태 가져오기
    state = scheduler.get_current_state()
    base_index = state["total_index"]
    base_categories = state["categories"]
    
    # 간격 설정
    if interval == "day":
        step_hours = 24
        num_points = hours // 24
    else:
        step_hours = 1
        num_points = min(hours, 168)  # 최대 7일
    
    # 데이터 포인트 생성
    for i in range(num_points, -1, -1):
        point_time = current_time - timedelta(hours=i * step_hours)
        
        # 시간에 따른 변동 시뮬레이션
        time_factor = 1 + 0.1 * ((i % 12) - 6) / 6  # 주기적 변동
        noise = random.uniform(-5, 5)
        
        # 총 지수
        total = max(10, min(95, base_index * time_factor + noise))
        
        # 카테고리별 지수
        category_values = {}
        for cat, val in base_categories.items():
            cat_noise = random.uniform(-8, 8)
            category_values[cat] = max(10, min(95, val * time_factor + cat_noise))
        
        data_points.append({
            "timestamp": point_time,
            "total": round(total, 1),
            **{k: round(v, 1) for k, v in category_values.items()}
        })
    
    return data_points


@router.get("/category-distribution", response_model=List[CategoryDistribution])
async def get_category_distribution():
    """카테고리별 위협 분포"""
    threats = scheduler.get_threats(limit=100)
    
    # 카테고리별 집계
    category_counts = {}
    total = len(threats)
    
    for threat in threats:
        cat = threat.get("category", "unknown")
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    # 결과 생성
    distribution = []
    for cat, count in category_counts.items():
        percentage = (count / total * 100) if total > 0 else 0
        distribution.append({
            "category": cat,
            "count": count,
            "percentage": round(percentage, 1),
        })
    
    # 카운트 내림차순 정렬
    distribution.sort(key=lambda x: x["count"], reverse=True)
    
    return distribution


@router.get("/source-stats", response_model=List[SourceStats])
async def get_source_stats():
    """소스별 통계"""
    threats = scheduler.get_threats(limit=100)
    
    # 소스별 집계
    source_data = {}
    
    for threat in threats:
        source_type = threat.get("source_type", "unknown")
        credibility = threat.get("credibility", 0.5)
        
        if source_type not in source_data:
            source_data[source_type] = {"count": 0, "credibility_sum": 0}
        
        source_data[source_type]["count"] += 1
        source_data[source_type]["credibility_sum"] += credibility
    
    # 결과 생성
    stats = []
    for source_type, data in source_data.items():
        avg_cred = data["credibility_sum"] / data["count"] if data["count"] > 0 else 0
        stats.append({
            "source_type": source_type,
            "count": data["count"],
            "avg_credibility": round(avg_cred, 2),
        })
    
    # 카운트 내림차순 정렬
    stats.sort(key=lambda x: x["count"], reverse=True)
    
    return stats


@router.get("/kpi")
async def get_kpi_metrics():
    """주요 KPI 지표"""
    threats = scheduler.get_threats(limit=100)
    state = scheduler.get_current_state()
    
    # 통계 계산
    total_threats = len(threats)
    resolved = sum(1 for t in threats if t.get("status") == "resolved")
    confirmed = sum(1 for t in threats if t.get("status") == "confirmed")
    
    severities = [t.get("severity", 0) for t in threats]
    avg_severity = sum(severities) / len(severities) if severities else 0
    
    return {
        "avg_threat_index": state["total_index"],
        "total_threats_detected": total_threats,
        "resolved_rate": round(resolved / total_threats * 100, 1) if total_threats > 0 else 0,
        "confirmed_threats": confirmed,
        "avg_severity": round(avg_severity, 1),
        "avg_response_time_minutes": random.randint(5, 15),  # 시뮬레이션
        "change_vs_yesterday": round(random.uniform(-10, 10), 1),
    }

