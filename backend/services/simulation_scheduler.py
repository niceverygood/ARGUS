"""
ARGUS SKY - Simulation Scheduler
데모용 실시간 데이터 시뮬레이션 스케줄러
AI 추론 로그 기록 포함
"""
import asyncio
import random
from datetime import datetime
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from services.threat_calculator import calculator
from services.osint_simulator import simulator
from services.websocket_manager import manager
from services.alert_service import alert_service
from config import THREAT_UPDATE_INTERVAL, NEW_THREAT_INTERVAL, DEMO_MODE


class SimulationScheduler:
    """실시간 시뮬레이션 스케줄러"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._current_index: float = 45.0  # 초기 위협 지수
        self._category_indices: dict = {
            "terror": 35.0,
            "cyber": 42.0,
            "smuggling": 28.0,
            "drone": 38.0,
            "insider": 32.0,
            "geopolitical": 40.0,
        }
        self._active_threats: list = []
        self._collection_logs: list = []  # 데이터 수집 로그
        self._ai_reasoning_logs: list = []  # AI 추론 로그
        self._is_running: bool = False
        self._demo_mode_active: bool = False
    
    async def start(self):
        """스케줄러 시작"""
        if self._is_running:
            return
        
        print("[Scheduler] Starting simulation scheduler...")
        
        # 초기 위협 데이터 생성
        await self._initialize_threats()
        
        # 위협 지수 업데이트 (10초마다)
        self.scheduler.add_job(
            self._update_threat_index,
            IntervalTrigger(seconds=THREAT_UPDATE_INTERVAL),
            id='update_threat_index',
            replace_existing=True
        )
        
        # 새 위협 생성 (30-60초 랜덤 간격)
        self.scheduler.add_job(
            self._generate_new_threat,
            IntervalTrigger(seconds=NEW_THREAT_INTERVAL, jitter=15),
            id='generate_new_threat',
            replace_existing=True
        )
        
        # 위협 지수 히스토리 기록 (5분마다 - 데모용으로 짧게)
        self.scheduler.add_job(
            self._record_history,
            IntervalTrigger(minutes=5),
            id='record_history',
            replace_existing=True
        )
        
        self.scheduler.start()
        self._is_running = True
        print("[Scheduler] Simulation scheduler started!")
    
    def stop(self):
        """스케줄러 정지"""
        if self._is_running:
            self.scheduler.shutdown(wait=False)
            self._is_running = False
            print("[Scheduler] Simulation scheduler stopped.")
    
    async def _initialize_threats(self):
        """초기 위협 데이터 생성 (AI 추론 로그 포함)"""
        print("[Scheduler] Initializing threat data with AI reasoning logs...")
        
        # 카테고리별 2-3개씩 위협 생성
        for category in self._category_indices.keys():
            count = random.randint(2, 3)
            for _ in range(count):
                threat = simulator.generate_threat(category)
                self._active_threats.append(threat)
                
                # 데이터 수집 로그 생성
                collection_log = simulator.generate_data_collection_log(threat)
                self._collection_logs.append(collection_log)
                
                # AI 추론 로그 생성
                ai_log = simulator.generate_ai_reasoning_log(threat, collection_log)
                self._ai_reasoning_logs.append(ai_log)
        
        # 최대 100개 로그 유지
        self._collection_logs = self._collection_logs[-100:]
        self._ai_reasoning_logs = self._ai_reasoning_logs[-100:]
        
        print(f"[Scheduler] Created {len(self._active_threats)} initial threats")
        print(f"[Scheduler] Generated {len(self._ai_reasoning_logs)} AI reasoning logs")
    
    async def _update_threat_index(self):
        """위협 지수 업데이트 및 브로드캐스트"""
        try:
            # 카테고리별 자연스러운 변동
            for category in self._category_indices.keys():
                current = self._category_indices[category]
                change = random.uniform(-2.5, 2.5)
                new_value = max(10, min(95, current + change))
                self._category_indices[category] = round(new_value, 1)
            
            # 통합 지수 계산
            from services.threat_calculator import CATEGORY_WEIGHTS
            total = sum(
                self._category_indices[cat] * weight
                for cat, weight in CATEGORY_WEIGHTS.items()
            )
            self._current_index = round(min(100, max(0, total * 1.8)), 1)
            
            # 레벨 계산
            level = calculator.get_threat_level(self._current_index)
            
            # 24시간 변화율 (시뮬레이션)
            change_24h = round(random.uniform(-5, 5), 1)
            
            # WebSocket 브로드캐스트
            await manager.send_threat_index({
                "total_index": self._current_index,
                "level": level,
                "level_name": calculator.get_level_name(level),
                "categories": self._category_indices.copy(),
                "change_24h": change_24h,
                "timestamp": datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            print(f"[Scheduler] Error updating threat index: {e}")
    
    async def _generate_new_threat(self):
        """새 위협 생성 및 알림 (AI 추론 로그 포함)"""
        try:
            # 20% 확률로 새 위협 생성
            if random.random() > 0.2:
                return
            
            # 위협 생성
            threat = simulator.generate_threat()
            self._active_threats.append(threat)
            
            # 데이터 수집 로그 생성
            collection_log = simulator.generate_data_collection_log(threat)
            self._collection_logs.append(collection_log)
            
            # AI 추론 로그 생성
            ai_log = simulator.generate_ai_reasoning_log(threat, collection_log)
            self._ai_reasoning_logs.append(ai_log)
            
            # 최대 50개 유지
            if len(self._active_threats) > 50:
                self._active_threats = self._active_threats[-50:]
            if len(self._collection_logs) > 100:
                self._collection_logs = self._collection_logs[-100:]
            if len(self._ai_reasoning_logs) > 100:
                self._ai_reasoning_logs = self._ai_reasoning_logs[-100:]
            
            # WebSocket으로 새 위협 전송
            await manager.send_new_threat(threat)
            
            # 심각도가 높으면 알림도 생성
            if threat.get("severity", 0) >= 50:
                alert = await alert_service.create_alert_for_threat(
                    threat_id=threat["id"],
                    title=threat["title"],
                    severity=threat["severity"],
                    category=threat["category"]
                )
            
            print(f"[Scheduler] New threat generated: {threat['title'][:30]}...")
            print(f"[Scheduler] AI reasoning log created for threat")
            
        except Exception as e:
            print(f"[Scheduler] Error generating new threat: {e}")
    
    async def _record_history(self):
        """위협 지수 히스토리 기록"""
        try:
            print(f"[Scheduler] Recording history - Index: {self._current_index}")
            # 실제로는 DB에 저장하지만, 메모리에서 동작하도록 유지
        except Exception as e:
            print(f"[Scheduler] Error recording history: {e}")
    
    # ============ Demo Scenario Methods ============
    
    async def trigger_cyber_attack(self):
        """시나리오 A: 사이버 공격 탐지"""
        print("[Demo] Triggering cyber attack scenario...")
        
        # 사이버 지수 급등
        self._category_indices["cyber"] = 75.0
        self._current_index = 72.0
        
        # 위협 생성
        threat = {
            "id": str(random.randint(100000, 999999)),
            "title": "공항 중앙 시스템 대상 대규모 DDoS 공격 탐지",
            "description": "인천국제공항 중앙 관제 시스템을 대상으로 한 대규모 분산 서비스 거부(DDoS) 공격이 탐지되었습니다. 현재 방어 시스템이 가동 중이며, 공격 원점 추적이 진행되고 있습니다.",
            "category": "cyber",
            "severity": 78,
            "credibility": 0.95,
            "source_type": "internal",
            "source_name": "보안관제센터",
            "location": "IT센터",
            "latitude": 37.4561,
            "longitude": 126.4398,
            "keywords": ["DDoS", "사이버공격", "관제시스템", "긴급"],
            "status": "analyzing",
            "created_at": datetime.utcnow().isoformat(),
        }
        
        await manager.send_new_threat(threat)
        await self._update_threat_index()
        
        alert = await alert_service.create_alert_for_threat(
            threat_id=threat["id"],
            title=threat["title"],
            severity=78,
            category="cyber"
        )
        
        await manager.send_demo_event("cyber_attack", {
            "message": "사이버 공격 시나리오가 실행되었습니다",
            "threat": threat
        })
    
    async def trigger_missile_alert(self):
        """시나리오 B: 북한 미사일 발사"""
        print("[Demo] Triggering missile alert scenario...")
        
        # 지정학적 지수 급등
        self._category_indices["geopolitical"] = 95.0
        self._current_index = 92.0
        
        threat = {
            "id": str(random.randint(100000, 999999)),
            "title": "북한 탄도미사일 발사 - 전국 항공 경보 발령",
            "description": "북한이 동해상으로 탄도미사일을 발사했습니다. 국토부는 전국 공항에 항공 경보를 발령하였으며, 일부 항공편 운항이 일시 중단될 수 있습니다. 상황을 지속 모니터링 중입니다.",
            "category": "geopolitical",
            "severity": 95,
            "credibility": 1.0,
            "source_type": "government",
            "source_name": "국가정보원",
            "location": "동해상",
            "latitude": 38.5,
            "longitude": 129.0,
            "keywords": ["북한", "미사일", "항공경보", "긴급", "CRITICAL"],
            "status": "confirmed",
            "created_at": datetime.utcnow().isoformat(),
        }
        
        await manager.send_new_threat(threat)
        await self._update_threat_index()
        
        alert = await alert_service.create_alert_for_threat(
            threat_id=threat["id"],
            title="🚨 긴급: " + threat["title"],
            severity=95,
            category="geopolitical"
        )
        
        await manager.send_demo_event("missile_alert", {
            "message": "북한 미사일 발사 시나리오가 실행되었습니다",
            "threat": threat,
            "critical_overlay": True
        })
    
    async def trigger_drone_intrusion(self):
        """시나리오 C: 드론 침입"""
        print("[Demo] Triggering drone intrusion scenario...")
        
        self._category_indices["drone"] = 72.0
        self._current_index = 65.0
        
        threat = {
            "id": str(random.randint(100000, 999999)),
            "title": "인천공항 활주로 인근 불법 드론 침입 탐지",
            "description": "인천국제공항 33L 활주로 인근에서 미확인 드론이 탐지되었습니다. 드론 탐지 시스템이 가동 중이며, 대응팀이 출동했습니다. 해당 활주로 이착륙이 일시 중단되었습니다.",
            "category": "drone",
            "severity": 72,
            "credibility": 0.9,
            "source_type": "internal",
            "source_name": "드론탐지시스템",
            "location": "활주로 33L",
            "latitude": 37.4512,
            "longitude": 126.4235,
            "keywords": ["드론", "활주로", "침입", "긴급대응"],
            "status": "analyzing",
            "created_at": datetime.utcnow().isoformat(),
        }
        
        await manager.send_new_threat(threat)
        await self._update_threat_index()
        
        alert = await alert_service.create_alert_for_threat(
            threat_id=threat["id"],
            title=threat["title"],
            severity=72,
            category="drone"
        )
        
        # 드론 이동 시뮬레이션을 위한 추가 데이터
        await manager.send_demo_event("drone_intrusion", {
            "message": "드론 침입 시나리오가 실행되었습니다",
            "threat": threat,
            "drone_path": [
                {"lat": 37.4512, "lng": 126.4235, "time": 0},
                {"lat": 37.4520, "lng": 126.4250, "time": 5},
                {"lat": 37.4535, "lng": 126.4270, "time": 10},
                {"lat": 37.4550, "lng": 126.4300, "time": 15},
            ]
        })
    
    async def trigger_stabilization(self):
        """시나리오 D: 점진적 안정화"""
        print("[Demo] Triggering stabilization scenario...")
        
        # 모든 지수 점진적 하락
        for category in self._category_indices.keys():
            current = self._category_indices[category]
            self._category_indices[category] = max(20, current - random.uniform(15, 25))
        
        self._current_index = 35.0
        
        await self._update_threat_index()
        
        await alert_service.create_system_alert(
            title="상황 안정화",
            message="모든 위협 상황이 점진적으로 안정화되고 있습니다. 정상 모니터링 체제로 전환합니다.",
            level=1
        )
        
        await manager.send_demo_event("stabilization", {
            "message": "안정화 시나리오가 실행되었습니다"
        })
    
    def get_current_state(self) -> dict:
        """현재 시뮬레이션 상태 반환"""
        level = calculator.get_threat_level(self._current_index)
        return {
            "total_index": self._current_index,
            "level": level,
            "level_name": calculator.get_level_name(level),
            "categories": self._category_indices.copy(),
            "active_threats_count": len(self._active_threats),
            "is_running": self._is_running
        }
    
    def get_threats(self, limit: int = 50) -> list:
        """현재 활성 위협 목록 반환"""
        return self._active_threats[-limit:]
    
    def get_collection_logs(self, limit: int = 50) -> list:
        """데이터 수집 로그 반환"""
        return self._collection_logs[-limit:]
    
    def get_ai_reasoning_logs(self, limit: int = 50, threat_id: str = None) -> list:
        """AI 추론 로그 반환"""
        logs = self._ai_reasoning_logs[-limit:]
        if threat_id:
            logs = [log for log in logs if log.get("threat_id") == threat_id]
        return logs
    
    def get_ai_reasoning_log_by_id(self, log_id: str) -> dict:
        """특정 AI 추론 로그 반환"""
        for log in self._ai_reasoning_logs:
            if log.get("id") == log_id:
                return log
        return None
    
    def get_collection_log_by_id(self, log_id: str) -> dict:
        """특정 데이터 수집 로그 반환"""
        for log in self._collection_logs:
            if log.get("id") == log_id:
                return log
        return None


# 싱글톤 인스턴스
scheduler = SimulationScheduler()

