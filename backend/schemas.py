"""
ARGUS SKY - Pydantic Schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


# ============ Threat Schemas ============
class ThreatBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    severity: int = 50
    credibility: float = 0.5
    source_type: Optional[str] = None
    source_name: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    keywords: List[str] = []


class ThreatCreate(ThreatBase):
    pass


class ThreatResponse(ThreatBase):
    id: str
    threat_score: float
    status: str
    created_at: datetime
    time_ago: str = ""
    
    class Config:
        from_attributes = True


class ThreatSummary(BaseModel):
    total_count: int
    by_category: Dict[str, int]
    by_status: Dict[str, int]
    avg_severity: float
    change_24h: float


# ============ Alert Schemas ============
class AlertBase(BaseModel):
    level: int
    title: str
    message: Optional[str] = None


class AlertCreate(AlertBase):
    threat_id: Optional[str] = None
    channels: List[str] = ["dashboard"]


class AlertResponse(AlertBase):
    id: str
    threat_id: Optional[str]
    is_read: bool
    created_at: datetime
    time_ago: str = ""
    
    class Config:
        from_attributes = True


# ============ Analytics Schemas ============
class CategoryIndex(BaseModel):
    terror: float = 0
    cyber: float = 0
    smuggling: float = 0
    drone: float = 0
    insider: float = 0
    geopolitical: float = 0


class ThreatIndexResponse(BaseModel):
    total_index: float
    level: int
    level_name: str
    categories: CategoryIndex
    change_24h: float
    timestamp: datetime


class TrendDataPoint(BaseModel):
    timestamp: datetime
    total: float
    terror: float = 0
    cyber: float = 0
    smuggling: float = 0
    drone: float = 0
    insider: float = 0
    geopolitical: float = 0


class CategoryDistribution(BaseModel):
    category: str
    count: int
    percentage: float


class SourceStats(BaseModel):
    source_type: str
    count: int
    avg_credibility: float


# ============ WebSocket Schemas ============
class WebSocketMessage(BaseModel):
    type: str  # threat_index, new_threat, new_alert, threat_update
    data: dict
    timestamp: datetime = datetime.utcnow()

