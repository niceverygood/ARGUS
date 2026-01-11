"""
ARGUS SKY - OSINT Data Simulator
데모용 현실감 있는 위협 데이터 생성
AI 추론 과정 시뮬레이션 포함
"""
import random
import time
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Tuple
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

# AI 분석 모델 정보
AI_MODELS = {
    "ARGUS-THREAT-v1": {
        "name": "ARGUS Threat Analyzer v1.0",
        "type": "rule-based + ML hybrid",
        "description": "위협 탐지 및 분류를 위한 하이브리드 AI 모델"
    },
    "ARGUS-NLP-v1": {
        "name": "ARGUS NLP Processor v1.0",
        "type": "transformer-based NLP",
        "description": "텍스트 분석 및 개체 추출을 위한 NLP 모델"
    },
    "ARGUS-RISK-v1": {
        "name": "ARGUS Risk Scorer v1.0",
        "type": "ensemble ML model",
        "description": "위험도 점수 산출을 위한 앙상블 모델"
    }
}

# 카테고리별 위협 지표
THREAT_INDICATORS = {
    "terror": [
        "폭발물 관련 키워드 탐지",
        "테러 조직 연관 개체 식별",
        "과거 테러 사건과의 패턴 유사성",
        "공항 인프라 언급",
        "시간대별 위협 패턴 매칭",
        "지역 기반 위협 연관성"
    ],
    "cyber": [
        "악성 IP 주소 탐지",
        "알려진 공격 패턴 매칭",
        "취약점 악용 시도 탐지",
        "이상 네트워크 트래픽 감지",
        "다크웹 언급 빈도 증가",
        "APT 그룹 TTP 매칭"
    ],
    "smuggling": [
        "밀수 루트 관련 정보",
        "조직범죄 네트워크 연관",
        "화물 이상 패턴 탐지",
        "위조 문서 탐지 시그니처",
        "세관 경보 시스템 알림",
        "국제 밀수 네트워크 정보"
    ],
    "drone": [
        "비인가 비행체 탐지",
        "RF 신호 이상 감지",
        "시각적 확인 보고",
        "드론 탐지 레이더 알림",
        "활주로 접근 경보",
        "GPS 재밍 시도 탐지"
    ],
    "insider": [
        "비정상 접근 패턴 탐지",
        "권한 외 시스템 접근 시도",
        "근무 시간 외 활동 감지",
        "대량 데이터 접근 시도",
        "보안 정책 위반 탐지",
        "행동 분석 이상 징후"
    ],
    "geopolitical": [
        "정부 공식 발표 감지",
        "국제 뉴스 급증 탐지",
        "항공 NOTAM 발령",
        "외교 갈등 지표 상승",
        "군사 활동 증가 탐지",
        "여행 경보 발령 감지"
    ]
}

# 카테고리별 위험 요소
RISK_FACTORS = {
    "terror": [
        "공항 이용객 밀집 시간대",
        "국제 행사 기간",
        "과거 테러 기념일 근접",
        "테러 그룹 활동 증가 시기",
        "보안 취약점 노출"
    ],
    "cyber": [
        "시스템 업데이트 미적용",
        "취약한 외부 연결",
        "피싱 공격 성공 이력",
        "인증 시스템 약점",
        "백업 시스템 미비"
    ],
    "smuggling": [
        "성수기 화물량 증가",
        "신규 항공 노선 개설",
        "검색 인력 부족",
        "국제 밀수 조직 활동 증가",
        "위조 기술 고도화"
    ],
    "drone": [
        "드론 규제 사각지대",
        "탐지 시스템 한계",
        "악천후로 인한 탐지 어려움",
        "드론 기술 발전",
        "테러 목적 드론 사용 증가"
    ],
    "insider": [
        "인력 이동 증가",
        "불만 직원 존재",
        "보안 교육 미흡",
        "접근 권한 관리 미비",
        "외부 유혹 증가"
    ],
    "geopolitical": [
        "한반도 긴장 고조",
        "국제 관계 악화",
        "군사 훈련 기간",
        "선거/정치 이벤트",
        "경제 제재 강화"
    ]
}

# 완화 요소
MITIGATING_FACTORS = {
    "terror": [
        "24시간 보안 감시 운영",
        "다층 검색 시스템 가동",
        "정보기관 실시간 협조",
        "폭발물 탐지 시스템",
        "훈련된 보안 인력"
    ],
    "cyber": [
        "방화벽 최신 업데이트 적용",
        "침입 탐지 시스템 가동",
        "24시간 SOC 운영",
        "백업 시스템 구축",
        "직원 보안 교육 완료"
    ],
    "smuggling": [
        "X-ray 전수 검사",
        "탐지견 배치",
        "세관 협력 체계",
        "빅데이터 분석 시스템",
        "국제 정보 공유"
    ],
    "drone": [
        "드론 탐지 레이더 가동",
        "RF 재밍 시스템 대기",
        "신속 대응팀 배치",
        "CCTV 감시 강화",
        "항공기 대피 절차 준비"
    ],
    "insider": [
        "접근 권한 주기적 검토",
        "행동 분석 시스템",
        "퇴직 절차 보안 강화",
        "내부 고발 채널 운영",
        "보안 서약 갱신"
    ],
    "geopolitical": [
        "정부 실시간 협조",
        "항공사 비상 연락망",
        "대체 노선 확보",
        "승객 안전 우선 절차",
        "국제 협력 체계"
    ]
}


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
    
    def generate_data_collection_log(self, threat: Dict) -> Dict:
        """데이터 수집 로그 생성"""
        source_type = threat.get("source_type", "unknown")
        source_name = threat.get("source_name", "Unknown Source")
        
        collection_methods = {
            "government": "secure_api",
            "news_major": "rss_feed",
            "news_general": "web_crawling",
            "social_verified": "social_api",
            "social_general": "social_api",
            "darkweb": "tor_monitoring",
            "internal": "internal_system"
        }
        
        endpoints = {
            "government": "https://api.nis.go.kr/v1/alerts (simulated)",
            "news_major": "https://news.api.example.com/v2/feeds",
            "news_general": "https://news.example.com/rss/security",
            "social_verified": "https://api.twitter.com/2/search/recent",
            "social_general": "https://api.social.monitor/v1/stream",
            "darkweb": "onion://darkweb.monitor.local/feeds",
            "internal": "internal://security.incheon-airport.kr/events"
        }
        
        # 시뮬레이션된 원시 데이터
        raw_data = self._generate_raw_input_data(threat)
        
        return {
            "id": str(uuid.uuid4()),
            "source_type": source_type,
            "source_name": source_name,
            "collection_method": collection_methods.get(source_type, "api"),
            "endpoint_url": endpoints.get(source_type, "unknown"),
            "query_params": {
                "keywords": threat.get("keywords", []),
                "region": "korea",
                "language": "ko",
                "timeframe": "24h"
            },
            "status": "success",
            "items_collected": 1,
            "items_processed": 1,
            "items_filtered": random.randint(0, 3),
            "response_status_code": 200,
            "response_sample": raw_data[:1000],
            "raw_data": raw_data,
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": datetime.utcnow().isoformat(),
            "duration_ms": random.randint(50, 500),
            "created_at": datetime.utcnow().isoformat()
        }
    
    def _generate_raw_input_data(self, threat: Dict) -> str:
        """원시 입력 데이터 시뮬레이션 생성"""
        source_type = threat.get("source_type", "unknown")
        title = threat.get("title", "Unknown threat")
        category = threat.get("category", "unknown")
        
        if source_type == "government":
            return f"""
[정부 보안 경보 API 응답]
{{
  "alert_id": "GOV-2024-{random.randint(10000, 99999)}",
  "classification": "RESTRICTED",
  "timestamp": "{datetime.utcnow().isoformat()}Z",
  "source_agency": "{threat.get('source_name', '정부기관')}",
  "alert_type": "{category.upper()}",
  "title": "{title}",
  "body": "{threat.get('description', '')}",
  "severity_level": "{threat.get('severity', 50)}",
  "region_codes": ["KOR", "ICN"],
  "affected_infrastructure": ["aviation", "airport"],
  "recommended_actions": ["monitor", "alert_staff"],
  "expiry": "{(datetime.utcnow() + timedelta(hours=24)).isoformat()}Z"
}}
"""
        elif source_type in ["news_major", "news_general"]:
            return f"""
[뉴스 크롤링 결과]
URL: https://news.example.com/article/{random.randint(100000, 999999)}
수집 시간: {datetime.utcnow().isoformat()}
---
제목: {title}
기자: 홍길동 기자
출처: {threat.get('source_name', '언론사')}
발행일: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}
---
본문:
{threat.get('description', '')}

인천국제공항 관계자는 "상황을 주시하며 필요시 적절한 조치를 취할 것"이라고 밝혔다.
현재 공항 운영에는 차질이 없는 것으로 전해졌다.

#태그: {', '.join(threat.get('keywords', []))}
"""
        elif source_type in ["social_verified", "social_general"]:
            return f"""
[소셜 미디어 모니터링]
Platform: Twitter
Collection Time: {datetime.utcnow().isoformat()}
---
@{random.choice(['security_analyst', 'airport_watch', 'news_alert', 'safety_monitor'])}
"{title[:100]}..."
🚨 #인천공항 #보안 #{threat.get('keywords', ['경보'])[0]}
---
Engagement: {random.randint(50, 500)} likes, {random.randint(10, 100)} retweets
Verified: {'Yes' if source_type == 'social_verified' else 'No'}
Location: South Korea (inferred)
"""
        elif source_type == "darkweb":
            return f"""
[다크웹 모니터링 - TOR 네트워크]
Forum: [REDACTED]
Thread ID: {random.randint(10000, 99999)}
Captured: {datetime.utcnow().isoformat()}
---
Subject: {title}
Author: [Anonymous User #{random.randint(1000, 9999)}]
---
[Original post content - translated from English]
{threat.get('description', '')}
---
Keywords detected: {', '.join(threat.get('keywords', []))}
Threat indicators: HIGH
Credibility assessment: MEDIUM-LOW
"""
        elif source_type == "internal":
            return f"""
[내부 보안 시스템 이벤트]
System: {random.choice(['CCTV_Monitor', 'Access_Control', 'Intrusion_Detection', 'Security_Alert'])}
Event ID: INT-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}
Timestamp: {datetime.utcnow().isoformat()}
---
Event Type: {category.upper()}_ALERT
Location: {threat.get('location', '인천공항')}
Severity: {threat.get('severity', 50)}/100
---
Description: {threat.get('description', '')}
---
Sensor Data:
- Detection confidence: {random.randint(75, 99)}%
- Alert threshold: 70%
- Previous alerts (24h): {random.randint(0, 5)}
"""
        else:
            return f"""
[일반 데이터 수집]
Source: {threat.get('source_name', 'Unknown')}
Time: {datetime.utcnow().isoformat()}
---
Title: {title}
Content: {threat.get('description', '')}
---
Category: {category}
Keywords: {', '.join(threat.get('keywords', []))}
"""
    
    def generate_ai_reasoning_log(self, threat: Dict, collection_log: Dict = None) -> Dict:
        """AI 추론 로그 생성 - AI가 데이터를 어떻게 분석했는지 상세 기록"""
        start_time = time.time()
        
        category = threat.get("category", "unknown")
        severity = threat.get("severity", 50)
        title = threat.get("title", "Unknown")
        
        # 원시 입력 데이터
        raw_input = collection_log.get("raw_data") if collection_log else self._generate_raw_input_data(threat)
        
        # AI 처리 단계 시뮬레이션
        processing_steps = self._generate_processing_steps(threat, raw_input)
        
        # 개체 추출
        entities_extracted = {
            "organizations": threat.get("entities", {}).get("organizations", []),
            "locations": threat.get("entities", {}).get("locations", ["인천국제공항"]),
            "persons": threat.get("entities", {}).get("persons", []),
            "dates": [datetime.utcnow().strftime("%Y-%m-%d")],
            "threat_types": [category]
        }
        
        # 위협 지표 선택
        indicators = random.sample(
            THREAT_INDICATORS.get(category, ["일반 위협 탐지"]),
            min(3, len(THREAT_INDICATORS.get(category, [])))
        )
        
        # 위험 요소 선택
        risk_factors = random.sample(
            RISK_FACTORS.get(category, ["일반 위험 요소"]),
            min(2, len(RISK_FACTORS.get(category, [])))
        )
        
        # 완화 요소 선택
        mitigating = random.sample(
            MITIGATING_FACTORS.get(category, ["일반 보안 조치"]),
            min(2, len(MITIGATING_FACTORS.get(category, [])))
        )
        
        # 카테고리 분류 추론
        category_reasoning = self._generate_category_reasoning(threat, entities_extracted)
        
        # 심각도 추론
        severity_reasoning = self._generate_severity_reasoning(threat, indicators, risk_factors)
        
        # 전체 평가
        overall_assessment = self._generate_overall_assessment(threat, indicators, risk_factors, mitigating)
        
        # 권장 조치
        recommendation = self._generate_recommendation(category, severity)
        
        # 신뢰도 점수
        base_confidence = threat.get("credibility", 0.5)
        confidence_score = min(0.95, base_confidence + random.uniform(0, 0.1))
        
        processing_time = int((time.time() - start_time) * 1000) + random.randint(100, 500)
        
        return {
            "id": str(uuid.uuid4()),
            "threat_id": threat.get("id"),
            "collection_log_id": collection_log.get("id") if collection_log else None,
            "raw_input": raw_input,
            "input_source": threat.get("source_name", "Unknown"),
            "input_type": self._get_input_type(threat.get("source_type")),
            "ai_model": "ARGUS-THREAT-v1",
            "model_version": "1.0.3",
            "processing_steps": processing_steps,
            "entities_extracted": entities_extracted,
            "keywords_extracted": threat.get("keywords", []),
            "category_reasoning": category_reasoning,
            "category_confidence": round(confidence_score, 3),
            "severity_reasoning": severity_reasoning,
            "severity_confidence": round(confidence_score - 0.05, 3),
            "threat_indicators": indicators,
            "risk_factors": risk_factors,
            "mitigating_factors": mitigating,
            "overall_assessment": overall_assessment,
            "recommendation": recommendation,
            "confidence_score": round(confidence_score, 3),
            "processing_time_ms": processing_time,
            "tokens_used": random.randint(500, 2000),
            "created_at": datetime.utcnow().isoformat()
        }
    
    def _generate_processing_steps(self, threat: Dict, raw_input: str) -> List[Dict]:
        """AI 처리 단계 생성"""
        category = threat.get("category", "unknown")
        
        return [
            {
                "step": 1,
                "name": "데이터 수신 및 전처리",
                "description": "원시 데이터를 수신하고 분석 가능한 형태로 전처리",
                "input": f"Raw data from {threat.get('source_name', 'unknown')} ({len(raw_input)} chars)",
                "output": "Cleaned and normalized text data",
                "duration_ms": random.randint(10, 50),
                "model_used": "ARGUS-NLP-v1"
            },
            {
                "step": 2,
                "name": "개체명 인식 (NER)",
                "description": "텍스트에서 조직, 장소, 인물 등 주요 개체 추출",
                "input": "Preprocessed text",
                "output": f"Extracted entities: {threat.get('entities', {})}",
                "duration_ms": random.randint(30, 100),
                "model_used": "ARGUS-NLP-v1"
            },
            {
                "step": 3,
                "name": "키워드 추출",
                "description": "위협 관련 핵심 키워드 식별",
                "input": "Preprocessed text",
                "output": f"Keywords: {threat.get('keywords', [])}",
                "duration_ms": random.randint(20, 80),
                "model_used": "ARGUS-NLP-v1"
            },
            {
                "step": 4,
                "name": "위협 카테고리 분류",
                "description": f"머신러닝 분류기를 통해 위협 유형 결정",
                "input": "Entities + Keywords + Context",
                "output": f"Category: {category} (confidence: {round(threat.get('credibility', 0.5) + 0.1, 2)})",
                "duration_ms": random.randint(50, 150),
                "model_used": "ARGUS-THREAT-v1"
            },
            {
                "step": 5,
                "name": "심각도 점수 산출",
                "description": "다중 요인 분석을 통한 심각도 점수 계산",
                "input": f"Category: {category}, Source credibility: {threat.get('credibility', 0.5)}",
                "output": f"Severity: {threat.get('severity', 50)}/100",
                "duration_ms": random.randint(30, 100),
                "model_used": "ARGUS-RISK-v1"
            },
            {
                "step": 6,
                "name": "위험 요소 분석",
                "description": "현재 상황에서의 추가적인 위험 요소 식별",
                "input": "Threat context + Current environment",
                "output": f"Risk factors identified: {len(RISK_FACTORS.get(category, []))}",
                "duration_ms": random.randint(40, 120),
                "model_used": "ARGUS-RISK-v1"
            },
            {
                "step": 7,
                "name": "최종 평가 및 권고",
                "description": "종합 분석 결과를 바탕으로 최종 평가 및 대응 권고 생성",
                "input": "All previous analysis results",
                "output": "Final assessment and recommendations generated",
                "duration_ms": random.randint(50, 150),
                "model_used": "ARGUS-THREAT-v1"
            }
        ]
    
    def _generate_category_reasoning(self, threat: Dict, entities: Dict) -> str:
        """카테고리 분류 추론 설명 생성"""
        category = threat.get("category", "unknown")
        keywords = threat.get("keywords", [])
        
        reasoning_templates = {
            "terror": f"""
📊 **카테고리 분류: 테러 위협**

1. **키워드 매칭**: 텍스트에서 [{', '.join(keywords[:3])}] 키워드가 탐지되었습니다.
2. **개체 분석**: {entities.get('locations', ['인천공항'])[0]}이(가) 타겟으로 언급되었습니다.
3. **패턴 매칭**: 과거 테러 위협 사례와 85%의 패턴 유사성을 보입니다.
4. **출처 신뢰도**: {threat.get('source_name', '출처')}는 정부/공신력 있는 출처로 분류됩니다.

→ 종합 판단: 항공 인프라 대상 테러 위협으로 분류
""",
            "cyber": f"""
📊 **카테고리 분류: 사이버 공격**

1. **키워드 매칭**: [{', '.join(keywords[:3])}] 관련 사이버 위협 키워드 탐지
2. **기술적 지표**: 공격 기법 및 TTP(Tactics, Techniques, Procedures) 분석
3. **공격 대상**: 공항 IT 인프라/시스템이 타겟으로 식별됨
4. **위협 행위자**: 알려진 APT 그룹과의 연관성 분석 중

→ 종합 판단: 사이버 공격 위협으로 분류
""",
            "smuggling": f"""
📊 **카테고리 분류: 밀수/밀입국**

1. **키워드 매칭**: [{', '.join(keywords[:3])}] 밀수 관련 용어 탐지
2. **루트 분석**: 국제 밀수 루트와의 연관성 확인
3. **패턴 분석**: 화물/여객 이동 패턴 이상 징후 탐지
4. **정보 연계**: 세관/경찰 정보와의 교차 검증

→ 종합 판단: 밀수/밀입국 관련 위협으로 분류
""",
            "drone": f"""
📊 **카테고리 분류: 드론 위협**

1. **탐지 시스템**: 드론 탐지 레이더/RF 스캐너 알림 확인
2. **위치 분석**: 공항 구역 내 비인가 비행체 탐지
3. **비행 패턴**: 의심스러운 비행 경로 패턴 분석
4. **시각 확인**: CCTV 또는 목격 보고와의 교차 검증

→ 종합 판단: 드론 침입 위협으로 분류
""",
            "insider": f"""
📊 **카테고리 분류: 내부자 위협**

1. **행동 분석**: 비정상적인 접근 패턴 탐지
2. **권한 분석**: 권한 외 시스템/구역 접근 시도 확인
3. **시간 분석**: 근무 시간 외 이상 활동 감지
4. **관계 분석**: 외부 조직과의 의심스러운 연락 패턴

→ 종합 판단: 내부자 위협으로 분류
""",
            "geopolitical": f"""
📊 **카테고리 분류: 지정학적 위협**

1. **뉴스 분석**: 국제 뉴스 소스에서 [{', '.join(keywords[:3])}] 관련 보도 급증
2. **정부 발표**: 공식 정부 발표 및 경보 확인
3. **항공 영향**: 항공 운영에 대한 직접적 영향 분석
4. **지역 분석**: 관련 지역의 긴장 수준 평가

→ 종합 판단: 지정학적 위협으로 분류
"""
        }
        
        return reasoning_templates.get(category, f"카테고리 '{category}'로 분류됨")
    
    def _generate_severity_reasoning(self, threat: Dict, indicators: List[str], risk_factors: List[str]) -> str:
        """심각도 추론 설명 생성"""
        severity = threat.get("severity", 50)
        credibility = threat.get("credibility", 0.5)
        
        level = "LOW" if severity < 30 else "GUARDED" if severity < 50 else "ELEVATED" if severity < 70 else "HIGH" if severity < 90 else "CRITICAL"
        
        return f"""
📈 **심각도 점수: {severity}/100 ({level})**

**점수 산출 근거:**

1. **기본 심각도** (Base Score): {severity - 10} ~ {severity + 10}
   - 위협 유형별 기준 점수 적용
   
2. **출처 신뢰도 보정** (Credibility Factor): x{credibility:.2f}
   - {threat.get('source_name', '출처')} 신뢰도 반영
   
3. **위협 지표** (Threat Indicators): +{len(indicators) * 3}
   - {', '.join(indicators[:2])} 등 {len(indicators)}개 지표 탐지
   
4. **위험 요소** (Risk Factors): +{len(risk_factors) * 2}
   - {', '.join(risk_factors[:2])} 등 {len(risk_factors)}개 요소
   
5. **시간적 요소** (Temporal Factor): ±{random.randint(1, 5)}
   - 현재 시점 기준 긴급성 반영

**최종 계산:**
{severity - 10} + ({len(indicators) * 3} + {len(risk_factors) * 2}) × {credibility:.2f} = **{severity}**
"""
    
    def _generate_overall_assessment(self, threat: Dict, indicators: List[str], risk_factors: List[str], mitigating: List[str]) -> str:
        """전체 평가 생성"""
        category = threat.get("category", "unknown")
        severity = threat.get("severity", 50)
        title = threat.get("title", "")
        
        return f"""
🎯 **종합 위협 평가 보고서**

**위협 개요:**
{title}

**분석 결과:**
- 위협 유형: {CATEGORY_KEYWORDS.get(category, ["위협"])[0]} 관련
- 심각도: {severity}/100
- 위치: {threat.get('location', '인천공항')}

**탐지된 위협 지표:**
{chr(10).join([f'• {ind}' for ind in indicators])}

**현재 위험 요소:**
{chr(10).join([f'• {rf}' for rf in risk_factors])}

**활성화된 보안 조치:**
{chr(10).join([f'✓ {mf}' for mf in mitigating])}

**AI 신뢰도:** {threat.get('credibility', 0.5) * 100:.0f}%
**분석 시간:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
"""
    
    def _generate_recommendation(self, category: str, severity: int) -> str:
        """권장 조치 생성"""
        if severity >= 80:
            urgency = "🚨 즉시 대응 필요"
        elif severity >= 60:
            urgency = "⚠️ 신속한 검토 필요"
        elif severity >= 40:
            urgency = "📋 주의 모니터링"
        else:
            urgency = "📝 일반 모니터링"
        
        recommendations = {
            "terror": f"""
{urgency}

**권장 조치:**
1. 보안 경계 수준 상향 검토
2. 의심 구역 추가 순찰 배치
3. 관련 정보기관에 상황 공유
4. 공항 직원 비상 연락망 활성화
5. 필요시 경찰/특공대 지원 요청
""",
            "cyber": f"""
{urgency}

**권장 조치:**
1. SOC팀 상황 모니터링 강화
2. 의심 IP/도메인 차단 검토
3. 시스템 로그 집중 분석
4. 백업 시스템 가동 준비
5. 외부 보안업체 협조 요청
""",
            "smuggling": f"""
{urgency}

**권장 조치:**
1. 해당 노선 화물 검사 강화
2. 세관 협조 요청
3. X-ray 전수검사 실시
4. 탐지견 추가 배치
5. 의심 승객/화물 추적 모니터링
""",
            "drone": f"""
{urgency}

**권장 조치:**
1. 드론 탐지 시스템 모니터링 강화
2. RF 재밍 시스템 대기 상태 전환
3. 드론 대응팀 출동 준비
4. 해당 활주로 항공기 이착륙 일시 중단 검토
5. CCTV 해당 구역 집중 감시
""",
            "insider": f"""
{urgency}

**권장 조치:**
1. 해당 직원 접근 권한 일시 정지
2. 보안팀 내부 조사 착수
3. 관련 시스템 로그 확보
4. 인사팀 협조 요청
5. 필요시 사법기관 신고 검토
""",
            "geopolitical": f"""
{urgency}

**권장 조치:**
1. 정부 발표 지속 모니터링
2. 항공사 비상 연락 체계 가동
3. 영향권 항공편 운항 상태 확인
4. 대체 노선 확보 검토
5. 승객 안내 방송 준비
"""
        }
        
        return recommendations.get(category, f"{urgency}\n\n일반적인 보안 모니터링을 강화하세요.")
    
    def _get_input_type(self, source_type: str) -> str:
        """입력 데이터 유형 반환"""
        input_types = {
            "government": "government_alert",
            "news_major": "news_article",
            "news_general": "news_article",
            "social_verified": "social_post",
            "social_general": "social_post",
            "darkweb": "darkweb_post",
            "internal": "sensor_data"
        }
        return input_types.get(source_type, "unknown")


# 싱글톤 인스턴스
simulator = OsintSimulator()

