"""
ARGUS SKY - Demo Router
데모 시나리오 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException
from typing import Literal

from services.simulation_scheduler import scheduler

router = APIRouter()


@router.post("/scenario/{scenario_name}")
async def trigger_scenario(
    scenario_name: Literal["cyber", "missile", "drone", "stabilize"]
):
    """데모 시나리오 실행"""
    try:
        if scenario_name == "cyber":
            await scheduler.trigger_cyber_attack()
            return {
                "success": True,
                "scenario": "cyber_attack",
                "message": "사이버 공격 시나리오가 실행되었습니다. 위협 지수가 상승합니다."
            }
        
        elif scenario_name == "missile":
            await scheduler.trigger_missile_alert()
            return {
                "success": True,
                "scenario": "missile_alert",
                "message": "북한 미사일 발사 시나리오가 실행되었습니다. Critical 레벨 경보!"
            }
        
        elif scenario_name == "drone":
            await scheduler.trigger_drone_intrusion()
            return {
                "success": True,
                "scenario": "drone_intrusion",
                "message": "드론 침입 시나리오가 실행되었습니다. 지도에서 드론 위치를 확인하세요."
            }
        
        elif scenario_name == "stabilize":
            await scheduler.trigger_stabilization()
            return {
                "success": True,
                "scenario": "stabilization",
                "message": "상황 안정화 시나리오가 실행되었습니다. 위협 지수가 점진적으로 하락합니다."
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown scenario: {scenario_name}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_demo_status():
    """데모 상태 조회"""
    state = scheduler.get_current_state()
    
    return {
        "is_running": state["is_running"],
        "current_index": state["total_index"],
        "current_level": state["level"],
        "level_name": state["level_name"],
        "active_threats": state["active_threats_count"],
        "categories": state["categories"],
        "available_scenarios": [
            {
                "id": "cyber",
                "name": "사이버 공격",
                "description": "DDoS 공격 탐지, 지수 72까지 상승",
                "shortcut": "Ctrl+Shift+1"
            },
            {
                "id": "missile",
                "name": "북한 미사일",
                "description": "미사일 발사, Critical 레벨 경보",
                "shortcut": "Ctrl+Shift+2"
            },
            {
                "id": "drone",
                "name": "드론 침입",
                "description": "활주로 인근 드론 탐지",
                "shortcut": "Ctrl+Shift+3"
            },
            {
                "id": "stabilize",
                "name": "상황 안정화",
                "description": "점진적 지수 하락",
                "shortcut": "Ctrl+Shift+4"
            }
        ]
    }


@router.post("/reset")
async def reset_demo():
    """데모 상태 초기화"""
    # 스케줄러 재시작
    scheduler.stop()
    await scheduler.start()
    
    return {
        "success": True,
        "message": "데모가 초기화되었습니다."
    }

