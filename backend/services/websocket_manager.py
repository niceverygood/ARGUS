"""
ARGUS SKY - WebSocket Manager
실시간 통신을 위한 WebSocket 연결 관리
"""
from fastapi import WebSocket
from typing import List, Dict, Any
import json
from datetime import datetime
import asyncio


class WebSocketManager:
    """WebSocket 연결 관리자"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        """새 WebSocket 연결 수락"""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")
    
    async def disconnect(self, websocket: WebSocket):
        """WebSocket 연결 해제"""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")
    
    def _serialize(self, obj: Any) -> Any:
        """JSON 직렬화를 위한 변환"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif hasattr(obj, '__dict__'):
            return {k: self._serialize(v) for k, v in obj.__dict__.items() if not k.startswith('_')}
        elif isinstance(obj, dict):
            return {k: self._serialize(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._serialize(item) for item in obj]
        return obj
    
    async def broadcast(self, message: Dict):
        """모든 연결된 클라이언트에게 메시지 전송"""
        if not self.active_connections:
            return
        
        # 메시지에 타임스탬프 추가
        message["timestamp"] = datetime.utcnow().isoformat()
        
        # JSON 직렬화
        data = json.dumps(self._serialize(message), ensure_ascii=False)
        
        # 연결 해제된 클라이언트 추적
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception as e:
                print(f"[WS] Error sending to client: {e}")
                disconnected.append(connection)
        
        # 연결 해제된 클라이언트 제거
        async with self._lock:
            for conn in disconnected:
                if conn in self.active_connections:
                    self.active_connections.remove(conn)
    
    async def send_threat_index(self, threat_index: Dict):
        """위협 지수 업데이트 전송"""
        await self.broadcast({
            "type": "threat_index",
            "data": threat_index
        })
    
    async def send_new_threat(self, threat: Dict):
        """새 위협 알림 전송"""
        await self.broadcast({
            "type": "new_threat",
            "data": threat
        })
    
    async def send_new_alert(self, alert: Dict):
        """새 알림 전송"""
        await self.broadcast({
            "type": "new_alert",
            "data": alert
        })
    
    async def send_threat_update(self, threat_id: str, status: str):
        """위협 상태 업데이트 전송"""
        await self.broadcast({
            "type": "threat_update",
            "data": {
                "threat_id": threat_id,
                "status": status
            }
        })
    
    async def send_demo_event(self, event_type: str, data: Dict):
        """데모 이벤트 전송"""
        await self.broadcast({
            "type": "demo_event",
            "event": event_type,
            "data": data
        })
    
    @property
    def connection_count(self) -> int:
        """현재 연결 수"""
        return len(self.active_connections)


# 싱글톤 인스턴스
manager = WebSocketManager()

