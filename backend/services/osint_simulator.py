"""
ARGUS SKY - OSINT Data Simulator
데모용 현실감 있는 위협 데이터 생성
"""
import random
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import uuid

# 인천공항 중심 좌표
INCHEON_AIRPORT_CENTER = (37.4602, 126.4407)
COORD_VARIANCE = 0.08  # 약 8km 반경

# 카테고리별 위협 템플릿
THREAT_TEMPLATES = {
    "terror": [
        {"title": "동남아 테러단체 항공 인프라 공격 예고", "severity": (65, 85), "source": "news_major"},
        {"title": "인천공항 터미널 의심 물품 신고", "severity": (45, 65), "source": "internal"},
        {"title": "국제 테러 경보 수준 상향 조정", "severity": (55, 75), "source": "government"},
        {"title": "공항 보안구역 무단 침입 시도", "severity": (50, 70), "source": "internal"},
        {"title": "해외 공항 테러 사건 발생 - 국내 경계 강화", "severity": (40, 60), "source": "news_major"},
        {"title": "IS 추종 세력 국내 활동 정황 포착", "severity": (70, 90), "source": "government"},
        {"title": "폭발물 탐지견 이상 반응 신고", "severity": (55, 75), "source": "internal"},
        {"title": "중동 항공편 위협 메시지 접수", "severity": (60, 80), "source": "news_major"},
    ],
    "cyber": [
        {"title": "공항 시스템 대상 DDoS 공격 시도 탐지", "severity": (55, 75), "source": "internal"},
        {"title": "다크웹에서 공항 직원 계정 정보 거래 포착", "severity": (50, 70), "source": "darkweb"},
        {"title": "항공사 예약시스템 해킹 시도 탐지", "severity": (45, 65), "source": "news_general"},
        {"title": "피싱 이메일 공격 캠페인 - 공항 직원 대상", "severity": (40, 60), "source": "internal"},
        {"title": "랜섬웨어 그룹 항공 인프라 타겟팅 정황", "severity": (60, 80), "source": "darkweb"},
        {"title": "공항 WiFi 네트워크 취약점 악용 시도", "severity": (35, 55), "source": "internal"},
        {"title": "SCADA 시스템 비정상 접속 시도 감지", "severity": (65, 85), "source": "internal"},
        {"title": "APT 그룹 항공 섹터 타겟 보고서 발표", "severity": (50, 70), "source": "government"},
    ],
    "smuggling": [
        {"title": "동남아발 항공편 마약 밀수 조직 동향", "severity": (40, 60), "source": "government"},
        {"title": "화물 X-ray 이상 패턴 다수 탐지", "severity": (35, 55), "source": "internal"},
        {"title": "국제 밀수 조직 인천공항 경유 정보", "severity": (45, 65), "source": "news_major"},
        {"title": "위조 여권 사용 적발 증가 추세", "severity": (30, 50), "source": "government"},
        {"title": "불법 야생동물 밀수 시도 정보", "severity": (25, 45), "source": "news_general"},
        {"title": "신종 마약 밀반입 루트 정보 입수", "severity": (50, 70), "source": "government"},
        {"title": "고가 물품 밀수 조직 활동 포착", "severity": (35, 55), "source": "news_general"},
        {"title": "인신매매 조직 공항 경유 정황", "severity": (55, 75), "source": "government"},
    ],
    "drone": [
        {"title": "인천공항 활주로 인근 미확인 드론 목격", "severity": (55, 80), "source": "internal"},
        {"title": "공항 주변 드론 비행 신고 접수", "severity": (40, 60), "source": "social_general"},
        {"title": "UAV 탐지 시스템 이상 신호 감지", "severity": (50, 70), "source": "internal"},
        {"title": "드론 이용 공항 정찰 시도 정황 포착", "severity": (60, 80), "source": "internal"},
        {"title": "불법 드론 판매상 공항 인근 활동 정보", "severity": (35, 55), "source": "social_verified"},
        {"title": "영종도 상공 군집 드론 목격 신고", "severity": (65, 85), "source": "news_general"},
        {"title": "드론 재밍 시스템 교란 시도 탐지", "severity": (55, 75), "source": "internal"},
        {"title": "상업용 드론 불법 개조 판매 정보", "severity": (30, 50), "source": "social_verified"},
    ],
    "insider": [
        {"title": "보안구역 비인가 접근 시도 탐지", "severity": (45, 70), "source": "internal"},
        {"title": "직원 신원조회 이상 징후 발견", "severity": (40, 60), "source": "internal"},
        {"title": "내부 정보 유출 시도 모니터링", "severity": (50, 70), "source": "internal"},
        {"title": "퇴직 직원 접근권한 미회수 건 발견", "severity": (30, 50), "source": "internal"},
        {"title": "협력업체 직원 이상 행동 패턴 감지", "severity": (35, 55), "source": "internal"},
        {"title": "보안 교육 미이수 인원 보안구역 진입", "severity": (40, 60), "source": "internal"},
        {"title": "내부 고발 - 보안 절차 위반 보고", "severity": (45, 65), "source": "internal"},
        {"title": "직원 SNS 보안 정보 노출 건 탐지", "severity": (35, 55), "source": "social_verified"},
    ],
    "geopolitical": [
        {"title": "북한 미사일 발사 - 항공 경보 발령", "severity": (75, 95), "source": "government"},
        {"title": "한중 외교 갈등 심화 - 항공 노선 영향 우려", "severity": (35, 55), "source": "news_major"},
        {"title": "동북아 군사 긴장 고조 - 영공 주의보", "severity": (50, 70), "source": "government"},
        {"title": "주변국 항공 NOTAM 발령", "severity": (40, 60), "source": "government"},
        {"title": "국제 제재 대상국 항공편 모니터링 강화", "severity": (45, 65), "source": "government"},
        {"title": "한일 관계 악화 - 항공 노선 영향 분석", "severity": (30, 50), "source": "news_major"},
        {"title": "대만해협 긴장 - 항공 경로 우회 검토", "severity": (55, 75), "source": "news_major"},
        {"title": "러시아 영공 폐쇄 지속 - 우회 노선 분석", "severity": (40, 60), "source": "government"},
    ],
}

# 소스별 이름 매핑
SOURCE_NAMES = {
    "government": ["국가정보원", "외교부", "국토교통부", "경찰청", "관세청", "법무부"],
    "news_major": ["연합뉴스", "로이터", "AP통신", "BBC", "CNN"],
    "news_general": ["조선일보", "중앙일보", "KBS", "MBC", "SBS", "YTN"],
    "social_verified": ["Twitter 공식계정", "Telegram 채널", "Facebook 공식"],
    "social_general": ["Twitter", "Reddit", "커뮤니티", "온라인 포럼"],
    "darkweb": ["다크웹 포럼", "Tor 모니터링", "암호화폐 추적"],
    "internal": ["보안관제센터", "CCTV 모니터링", "출입통제시스템", "위협탐지시스템"],
}

# 카테고리별 키워드
CATEGORY_KEYWORDS = {
    "terror": ["테러", "폭발물", "공격", "위협", "보안", "IS", "극단주의", "폭탄"],
    "cyber": ["해킹", "사이버", "DDoS", "랜섬웨어", "피싱", "APT", "악성코드", "취약점"],
    "smuggling": ["밀수", "마약", "화물", "세관", "불법", "밀반입", "검역", "위조"],
    "drone": ["드론", "UAV", "활주로", "비행", "침입", "무인기", "재밍", "탐지"],
    "insider": ["내부자", "직원", "접근권한", "유출", "보안구역", "신원조회", "비인가"],
    "geopolitical": ["북한", "미사일", "외교", "긴장", "영공", "NOTAM", "제재", "군사"],
}

# 인천공항 주요 위치
AIRPORT_LOCATIONS = [
    {"name": "제1터미널", "lat": 37.4492, "lng": 126.4502},
    {"name": "제2터미널", "lat": 37.4699, "lng": 126.4510},
    {"name": "탑승동", "lat": 37.4451, "lng": 126.4443},
    {"name": "화물터미널", "lat": 37.4589, "lng": 126.4289},
    {"name": "활주로 33L", "lat": 37.4512, "lng": 126.4235},
    {"name": "활주로 15R", "lat": 37.4698, "lng": 126.4612},
    {"name": "관제탑", "lat": 37.4561, "lng": 126.4398},
    {"name": "항공기 격납고", "lat": 37.4478, "lng": 126.4567},
]


class OsintSimulator:
    """OSINT 데이터 시뮬레이터"""
    
    def __init__(self):
        self.templates = THREAT_TEMPLATES
    
    def generate_threat(self, category: Optional[str] = None) -> Dict:
        """위협 데이터 생성"""
        if category is None:
            category = random.choice(list(self.templates.keys()))
        
        templates = self.templates.get(category, self.templates["terror"])
        template = random.choice(templates)
        
        severity = random.randint(*template["severity"])
        source_type = template["source"]
        
        # 위치 생성
        if random.random() > 0.4:
            # 공항 내 특정 위치
            location_info = random.choice(AIRPORT_LOCATIONS)
            lat = location_info["lat"] + random.uniform(-0.002, 0.002)
            lng = location_info["lng"] + random.uniform(-0.002, 0.002)
            location = location_info["name"]
        else:
            # 공항 주변 랜덤 위치
            lat = INCHEON_AIRPORT_CENTER[0] + random.uniform(-COORD_VARIANCE, COORD_VARIANCE)
            lng = INCHEON_AIRPORT_CENTER[1] + random.uniform(-COORD_VARIANCE, COORD_VARIANCE)
            location = "인천공항 인근"
        
        return {
            "id": str(uuid.uuid4()),
            "title": template["title"],
            "description": self._generate_description(template["title"], category),
            "category": category,
            "severity": severity,
            "credibility": self._generate_credibility(source_type),
            "source_type": source_type,
            "source_name": random.choice(SOURCE_NAMES.get(source_type, ["알 수 없음"])),
            "location": location,
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "keywords": self._generate_keywords(category),
            "entities": self._generate_entities(category),
            "language": "ko",
            "status": "new",
            "created_at": datetime.utcnow().isoformat(),
        }
    
    def _generate_description(self, title: str, category: str) -> str:
        """상세 설명 생성"""
        descriptions = {
            "terror": f"{title}에 대한 상세 분석이 진행 중입니다. 관련 정보를 지속적으로 모니터링하고 있으며, 필요시 보안 단계를 상향 조정할 예정입니다.",
            "cyber": f"{title} 관련하여 보안팀에서 긴급 대응 중입니다. 영향 범위 파악 및 추가 공격 차단을 위한 조치가 진행되고 있습니다.",
            "smuggling": f"{title} 관련 정보가 수집되었습니다. 관세청 및 경찰과 협조하여 추가 정보를 확인 중입니다.",
            "drone": f"{title} 보고가 접수되었습니다. 드론 탐지 시스템을 통한 모니터링이 강화되었으며, 필요시 대응 조치가 발동됩니다.",
            "insider": f"{title} 사안이 보고되었습니다. 인사팀 및 보안팀에서 관련 사실을 확인 중이며, 추가 조치가 검토되고 있습니다.",
            "geopolitical": f"{title}이 확인되었습니다. 외교부 및 국토부와 협조하여 상황을 모니터링하고 있으며, 항공 운영에 대한 영향을 분석 중입니다.",
        }
        return descriptions.get(category, f"{title}에 대한 분석이 진행 중입니다.")
    
    def _generate_credibility(self, source_type: str) -> float:
        """신뢰도 생성"""
        base_credibility = {
            "government": 0.9,
            "news_major": 0.8,
            "news_general": 0.65,
            "social_verified": 0.55,
            "social_general": 0.4,
            "darkweb": 0.35,
            "internal": 0.85,
        }
        base = base_credibility.get(source_type, 0.5)
        return round(base + random.uniform(-0.1, 0.1), 2)
    
    def _generate_keywords(self, category: str) -> List[str]:
        """키워드 생성"""
        keywords = CATEGORY_KEYWORDS.get(category, ["위협", "보안"])
        return random.sample(keywords, min(4, len(keywords)))
    
    def _generate_entities(self, category: str) -> Dict:
        """관련 개체 생성"""
        entities = {
            "organizations": [],
            "locations": ["인천국제공항"],
            "persons": [],
        }
        
        if category == "terror":
            entities["organizations"] = random.sample(["IS", "알카에다", "불명 조직"], k=random.randint(0, 1))
        elif category == "cyber":
            entities["organizations"] = random.sample(["라자루스", "APT38", "불명 해커"], k=random.randint(0, 1))
        elif category == "geopolitical":
            entities["locations"].append(random.choice(["북한", "중국", "일본"]))
        
        return entities
    
    async def generate_batch(self, count: int = 10) -> List[Dict]:
        """여러 위협 데이터 배치 생성"""
        threats = []
        categories = list(self.templates.keys())
        
        for _ in range(count):
            category = random.choice(categories)
            threats.append(self.generate_threat(category))
        
        return threats
    
    def generate_alert_from_threat(self, threat: Dict) -> Dict:
        """위협으로부터 알림 생성"""
        severity = threat.get("severity", 50)
        
        # 심각도에 따른 알림 레벨 결정
        if severity >= 80:
            level = 5
        elif severity >= 65:
            level = 4
        elif severity >= 50:
            level = 3
        elif severity >= 35:
            level = 2
        else:
            level = 1
        
        return {
            "id": str(uuid.uuid4()),
            "threat_id": threat.get("id"),
            "level": level,
            "title": f"[{threat.get('category', 'unknown').upper()}] {threat.get('title', '새 위협 탐지')}",
            "message": f"심각도 {severity}의 새로운 위협이 탐지되었습니다. 즉시 확인이 필요합니다.",
            "channels": ["dashboard"] if level < 4 else ["dashboard", "email"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat(),
        }


# 싱글톤 인스턴스
simulator = OsintSimulator()

