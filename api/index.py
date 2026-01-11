# Vercel Serverless Function - FastAPI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import random
import json

app = FastAPI(title="ARGUS API (Vercel Serverless)")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# In-Memory Data Store (Serverless는 상태 유지 안됨 - 데모용)
# =============================================================================
def generate_threat_data():
    """시뮬레이션 데이터 생성"""
    return {
        "overall_score": random.randint(25, 45),
        "level": "ELEVATED",
        "trend": random.choice(["up", "down", "stable"]),
        "change": round(random.uniform(-5, 5), 1),
        "categories": {
            "cyber": {"score": random.randint(30, 50), "level": "ELEVATED", "trend": "up"},
            "physical": {"score": random.randint(20, 35), "level": "GUARDED", "trend": "stable"},
            "insider": {"score": random.randint(15, 30), "level": "LOW", "trend": "down"},
            "geopolitical": {"score": random.randint(35, 55), "level": "HIGH", "trend": "up"},
            "environmental": {"score": random.randint(10, 25), "level": "LOW", "trend": "stable"},
        },
        "timestamp": datetime.now().isoformat(),
    }

def generate_alerts():
    """알림 데이터 생성"""
    alert_types = [
        {"title": "비인가 네트워크 접근 시도", "category": "cyber", "severity": "high"},
        {"title": "수상한 차량 감지", "category": "physical", "severity": "medium"},
        {"title": "비정상 접근 패턴", "category": "insider", "severity": "low"},
        {"title": "지역 긴장 고조", "category": "geopolitical", "severity": "medium"},
        {"title": "기상 이상 감지", "category": "environmental", "severity": "low"},
    ]
    
    alerts = []
    for i, alert in enumerate(random.sample(alert_types, 3)):
        alerts.append({
            "id": f"alert-{i+1}",
            "title": alert["title"],
            "category": alert["category"],
            "severity": alert["severity"],
            "timestamp": datetime.now().isoformat(),
            "status": "active",
            "location": "인천국제공항",
        })
    return alerts

# =============================================================================
# API Endpoints
# =============================================================================
@app.get("/")
async def root():
    return {"status": "online", "message": "ARGUS API (Vercel Serverless)", "timestamp": datetime.now().isoformat()}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/dashboard")
async def get_dashboard():
    """대시보드 종합 데이터"""
    threat_data = generate_threat_data()
    return {
        "threat_index": {
            "current": threat_data["overall_score"],
            "level": threat_data["level"],
            "trend": threat_data["trend"],
            "change": threat_data["change"],
        },
        "categories": threat_data["categories"],
        "recent_alerts": generate_alerts()[:5],
        "system_status": {
            "data_sources": 12,
            "active_monitors": 8,
            "last_update": datetime.now().isoformat(),
        },
        "timestamp": datetime.now().isoformat(),
    }

@app.get("/api/threats/current")
async def get_current_threats():
    """현재 위협 수준"""
    return generate_threat_data()

@app.get("/api/threats/history")
async def get_threat_history(hours: int = 24):
    """위협 히스토리"""
    history = []
    for i in range(hours):
        history.append({
            "timestamp": f"2024-01-01T{i:02d}:00:00",
            "overall_score": random.randint(25, 50),
            "cyber": random.randint(30, 55),
            "physical": random.randint(20, 40),
            "insider": random.randint(15, 35),
            "geopolitical": random.randint(35, 60),
            "environmental": random.randint(10, 30),
        })
    return {"history": history, "period_hours": hours}

@app.get("/api/alerts")
async def get_alerts(limit: int = 10, severity: Optional[str] = None):
    """알림 목록"""
    alerts = generate_alerts()
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    return {"alerts": alerts[:limit], "total": len(alerts)}

@app.get("/api/threats")
async def get_threats(limit: int = 20, category: Optional[str] = None):
    """위협 목록"""
    threats = []
    categories = ["cyber", "physical", "insider", "geopolitical", "environmental"]
    severities = ["critical", "high", "medium", "low"]
    
    threat_names = {
        "cyber": ["DDoS 공격 시도", "피싱 이메일 감지", "악성코드 탐지", "무단 접근 시도"],
        "physical": ["수상한 인물 감지", "비인가 차량", "펜스 침입 감지", "무인 수화물"],
        "insider": ["비정상 접근 패턴", "대량 데이터 전송", "퇴근 후 접근", "권한 남용"],
        "geopolitical": ["외교적 긴장", "시위 예고", "테러 위협 첩보", "국경 분쟁"],
        "environmental": ["태풍 접근", "폭설 예보", "지진 감지", "화재 경보"],
    }
    
    for i in range(limit):
        cat = category if category else random.choice(categories)
        threats.append({
            "id": f"threat-{i+1}",
            "title": random.choice(threat_names.get(cat, ["Unknown Threat"])),
            "category": cat,
            "severity": random.choice(severities),
            "score": random.randint(20, 90),
            "timestamp": datetime.now().isoformat(),
            "status": random.choice(["active", "monitoring", "resolved"]),
            "location": "인천국제공항",
            "description": f"자동 생성된 {cat} 위협 #{i+1}",
        })
    
    return {"threats": threats, "total": len(threats)}

@app.get("/api/analytics/summary")
async def get_analytics_summary():
    """분석 요약"""
    return {
        "total_threats_24h": random.randint(50, 150),
        "critical_count": random.randint(1, 5),
        "high_count": random.randint(5, 15),
        "resolved_count": random.randint(30, 80),
        "avg_response_time": random.randint(5, 30),
        "trend": {
            "direction": random.choice(["up", "down", "stable"]),
            "percentage": round(random.uniform(-10, 10), 1),
        },
    }

@app.get("/api/map/threats")
async def get_map_threats():
    """지도용 위협 위치"""
    locations = [
        {"name": "제1터미널", "lat": 37.4602, "lng": 126.4407},
        {"name": "제2터미널", "lat": 37.4680, "lng": 126.4500},
        {"name": "탑승동", "lat": 37.4550, "lng": 126.4450},
        {"name": "화물터미널", "lat": 37.4700, "lng": 126.4300},
        {"name": "주차장", "lat": 37.4580, "lng": 126.4380},
    ]
    
    threats = []
    for loc in random.sample(locations, 3):
        threats.append({
            "id": f"map-threat-{random.randint(1, 100)}",
            "location": loc["name"],
            "lat": loc["lat"] + random.uniform(-0.005, 0.005),
            "lng": loc["lng"] + random.uniform(-0.005, 0.005),
            "severity": random.choice(["critical", "high", "medium", "low"]),
            "category": random.choice(["cyber", "physical", "insider"]),
            "title": "위협 감지",
        })
    
    return {"threats": threats}

# Demo endpoints
@app.post("/api/demo/scenario/{scenario}")
async def trigger_demo_scenario(scenario: str):
    """데모 시나리오 트리거"""
    scenarios = {
        "cyber_attack": {"score": 75, "level": "SEVERE"},
        "physical_breach": {"score": 65, "level": "HIGH"},
        "vip_arrival": {"score": 55, "level": "ELEVATED"},
        "reset": {"score": 32, "level": "GUARDED"},
    }
    
    if scenario not in scenarios:
        raise HTTPException(status_code=404, detail=f"Unknown scenario: {scenario}")
    
    return {
        "scenario": scenario,
        "triggered": True,
        "new_threat_level": scenarios[scenario],
        "message": f"Demo scenario '{scenario}' triggered successfully",
    }

# Vercel requires this handler
handler = app

