"""
ARGUS SKY - Alerts Router
알림 관리 API 엔드포인트
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta
import random
import uuid

from schemas import AlertResponse
from services.osint_simulator import simulator

router = APIRouter()

# 인메모리 알림 저장소 (데모용)
_alerts_store: List[dict] = []


def _initialize_alerts():
    """초기 알림 데이터 생성"""
    global _alerts_store
    if _alerts_store:
        return
    
    # 샘플 알림 생성
    categories = ["terror", "cyber", "smuggling", "drone", "insider", "geopolitical"]
    
    for i in range(15):
        threat = simulator.generate_threat(random.choice(categories))
        alert = simulator.generate_alert_from_threat(threat)
        alert["is_read"] = random.random() > 0.4
        
        # 시간 분산
        hours_ago = random.randint(0, 48)
        created_at = datetime.utcnow() - timedelta(hours=hours_ago)
        alert["created_at"] = created_at.isoformat()
        
        _alerts_store.append(alert)
    
    # 최신순 정렬
    _alerts_store.sort(key=lambda x: x.get("created_at", ""), reverse=True)


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


@router.get("", response_model=List[AlertResponse])
async def get_alerts(
    is_read: Optional[bool] = Query(None, description="읽음 상태 필터"),
    level: Optional[int] = Query(None, ge=1, le=5, description="알림 레벨"),
    limit: int = Query(20, ge=1, le=50, description="결과 수"),
):
    """알림 목록 조회"""
    _initialize_alerts()
    
    alerts = _alerts_store.copy()
    
    # 필터링
    if is_read is not None:
        alerts = [a for a in alerts if a.get("is_read") == is_read]
    
    if level:
        alerts = [a for a in alerts if a.get("level") == level]
    
    # 최신순 정렬
    alerts.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # 제한
    alerts = alerts[:limit]
    
    # time_ago 추가
    for alert in alerts:
        created_at = alert.get("created_at", "")
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace('Z', ''))
                alert["time_ago"] = format_time_ago(dt)
            except:
                alert["time_ago"] = "알 수 없음"
    
    return alerts


@router.post("/{alert_id}/read")
async def mark_alert_read(alert_id: str):
    """알림 읽음 처리"""
    _initialize_alerts()
    
    for alert in _alerts_store:
        if alert.get("id") == alert_id:
            alert["is_read"] = True
            return {"success": True, "message": "Alert marked as read"}
    
    raise HTTPException(status_code=404, detail="Alert not found")


@router.post("/read-all")
async def mark_all_read():
    """모든 알림 읽음 처리"""
    _initialize_alerts()
    
    count = 0
    for alert in _alerts_store:
        if not alert.get("is_read"):
            alert["is_read"] = True
            count += 1
    
    return {"success": True, "message": f"{count} alerts marked as read"}


@router.get("/unread-count")
async def get_unread_count():
    """읽지 않은 알림 수"""
    _initialize_alerts()
    
    count = sum(1 for a in _alerts_store if not a.get("is_read"))
    return {"unread_count": count}


def add_alert(alert: dict):
    """새 알림 추가 (내부용)"""
    global _alerts_store
    _initialize_alerts()
    
    _alerts_store.insert(0, alert)
    
    # 최대 100개 유지
    if len(_alerts_store) > 100:
        _alerts_store = _alerts_store[:100]

