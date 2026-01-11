"""
ARGUS SKY - Alert Service
알림 생성 및 관리 서비스
"""
from datetime import datetime
from typing import Optional, Dict
import uuid

from services.websocket_manager import manager


class AlertService:
    """알림 서비스"""
    
    @staticmethod
    def calculate_level_from_severity(severity: int) -> int:
        """심각도로부터 알림 레벨 계산"""
        if severity >= 85:
            return 5
        elif severity >= 70:
            return 4
        elif severity >= 50:
            return 3
        elif severity >= 30:
            return 2
        else:
            return 1
    
    @staticmethod
    def get_level_name(level: int) -> str:
        """레벨 이름 반환"""
        names = {
            1: "LOW",
            2: "GUARDED", 
            3: "ELEVATED",
            4: "HIGH",
            5: "CRITICAL"
        }
        return names.get(level, "UNKNOWN")
    
    async def create_alert_for_threat(
        self,
        threat_id: str,
        title: str,
        severity: int,
        category: str,
        broadcast: bool = True
    ) -> Dict:
        """위협에 대한 알림 생성"""
        level = self.calculate_level_from_severity(severity)
        
        alert = {
            "id": str(uuid.uuid4()),
            "threat_id": threat_id,
            "level": level,
            "title": f"[{category.upper()}] {title}",
            "message": self._generate_message(level, severity, category),
            "channels": self._get_channels(level),
            "is_read": False,
            "created_at": datetime.utcnow().isoformat(),
            "time_ago": "방금 전"
        }
        
        if broadcast:
            await manager.send_new_alert(alert)
        
        return alert
    
    async def create_system_alert(
        self,
        title: str,
        message: str,
        level: int = 3,
        broadcast: bool = True
    ) -> Dict:
        """시스템 알림 생성"""
        alert = {
            "id": str(uuid.uuid4()),
            "threat_id": None,
            "level": level,
            "title": f"[SYSTEM] {title}",
            "message": message,
            "channels": ["dashboard"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat(),
            "time_ago": "방금 전"
        }
        
        if broadcast:
            await manager.send_new_alert(alert)
        
        return alert
    
    def _generate_message(self, level: int, severity: int, category: str) -> str:
        """알림 메시지 생성"""
        if level >= 5:
            return f"심각도 {severity}의 긴급 위협이 탐지되었습니다. 즉각적인 대응이 필요합니다!"
        elif level >= 4:
            return f"심각도 {severity}의 높은 수준 위협이 탐지되었습니다. 즉시 확인이 필요합니다."
        elif level >= 3:
            return f"심각도 {severity}의 주의 수준 위협이 탐지되었습니다. 모니터링을 강화하세요."
        else:
            return f"심각도 {severity}의 위협 정보가 수집되었습니다. 참고 바랍니다."
    
    def _get_channels(self, level: int) -> list:
        """레벨별 알림 채널 결정"""
        if level >= 5:
            return ["dashboard", "email", "sms"]
        elif level >= 4:
            return ["dashboard", "email"]
        else:
            return ["dashboard"]


# 싱글톤 인스턴스
alert_service = AlertService()

