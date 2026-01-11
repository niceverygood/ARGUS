"""
ARGUS SKY - Main Application
공항 위협 인텔리전스 플랫폼 API 서버
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from database import init_db
from routers import threats, alerts, analytics, demo, evidence
from services.websocket_manager import manager
from services.simulation_scheduler import scheduler
from config import CORS_ORIGINS, HOST, PORT, DATABASE_URL, USE_SQLITE


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 수명주기 관리"""
    # Startup
    print("🛡️  ARGUS SKY API Server Starting...")
    print(f"📦 Database: {'SQLite (Local)' if USE_SQLITE else 'Supabase PostgreSQL'}")
    if not USE_SQLITE:
        print(f"🔗 Connection: {DATABASE_URL[:50]}...")
    await init_db()
    await scheduler.start()
    print("✅ Server is ready!")
    print(f"📡 API Docs: http://localhost:{PORT}/docs")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down...")
    scheduler.stop()
    print("👋 Goodbye!")


app = FastAPI(
    title="ARGUS SKY API",
    description="""
    ## 🛡️ 공항 위협 인텔리전스 플랫폼 API
    
    ARGUS SKY는 AI 기반 실시간 위협 인텔리전스 플랫폼입니다.
    공개출처정보(OSINT) 수집·분석을 통해 공항 보안 위협을 선제적으로 탐지합니다.
    
    ### 주요 기능
    - 📊 실시간 위협 지수 모니터링
    - 🔔 다중 채널 알림
    - 📈 위협 트렌드 분석
    - 🗺️ 지리적 위협 시각화
    - 🎮 데모 시나리오 실행
    
    ### WebSocket
    실시간 업데이트를 위해 `/ws` 엔드포인트에 연결하세요.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS + [
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(threats.router, prefix="/threats", tags=["Threats"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(demo.router, prefix="/demo", tags=["Demo"])
app.include_router(evidence.router, prefix="/evidence", tags=["Evidence & Logs"])


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 연결 엔드포인트"""
    await manager.connect(websocket)
    
    try:
        # 연결 시 현재 위협 지수 전송
        state = scheduler.get_current_state()
        await websocket.send_json({
            "type": "initial_state",
            "data": state
        })
        
        # 연결 유지
        while True:
            data = await websocket.receive_text()
            # 클라이언트 메시지 처리 (필요시)
            
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS] Error: {e}")
        await manager.disconnect(websocket)


@app.get("/")
async def root():
    """API 루트"""
    return {
        "name": "ARGUS SKY API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """헬스 체크"""
    state = scheduler.get_current_state()
    
    return {
        "status": "healthy",
        "service": "ARGUS SKY",
        "simulation_running": state["is_running"],
        "websocket_connections": manager.connection_count,
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info"
    )

