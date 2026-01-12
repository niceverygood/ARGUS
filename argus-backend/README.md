# ARGUS SKY - Node.js Backend

공항 위협 인텔리전스 플랫폼의 Node.js Express 백엔드 서버입니다.

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
cd argus-backend
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 API 키를 설정하세요:

```bash
# .env 파일 생성
cp .env.example .env

# 또는 직접 생성
cat > .env << EOF
# Anthropic Claude API (AI 분석용)
ANTHROPIC_API_KEY=your_anthropic_key_here

# NewsAPI (뉴스 수집용)
NEWS_API_KEY=your_newsapi_key_here

# AbuseIPDB (사이버 위협 데이터)
ABUSEIPDB_API_KEY=your_abuseipdb_key_here

# 서버 설정
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF
```

**API 키 발급처:**
- Anthropic: https://console.anthropic.com/
- NewsAPI: https://newsapi.org/
- AbuseIPDB: https://www.abuseipdb.com/api

> ⚠️ API 키 없이도 시뮬레이션 모드로 실행 가능합니다.

### 3. 서버 실행

```bash
# 프로덕션 모드
npm start

# 개발 모드 (자동 재시작)
npm run dev
```

서버가 `http://localhost:3001`에서 실행됩니다.

## 📡 API 엔드포인트

### 대시보드
- `GET /api/dashboard` - 통합 대시보드 데이터

### 위협 관리
- `GET /api/threats` - 위협 목록 조회
- `GET /api/threats/:id` - 위협 상세 조회
- `PATCH /api/threats/:id` - 위협 상태 업데이트

### 분석
- `GET /api/analytics?period=24h|7d|30d` - 분석 통계
- `GET /api/trend?period=24h|7d|30d` - 트렌드 데이터
- `POST /api/analyze` - 수동 분석 실행

### 기타
- `GET /api/evidence` - 점수 계산 근거
- `GET /api/status` - 시스템 상태
- `GET /api/alerts/stream` - SSE 실시간 알림
- `GET /health` - 헬스 체크

## 🧪 테스트

```bash
# API 테스트 실행
npm test
```

## 📁 프로젝트 구조

```
argus-backend/
├── server.js              # 메인 서버 파일
├── package.json
├── .env                   # 환경 변수 (생성 필요)
├── .gitignore
├── scripts/
│   └── test-api.js        # API 테스트 스크립트
└── src/
    ├── config/
    │   └── constants.js   # 상수 및 설정
    ├── services/
    │   ├── dataCollector.js  # 데이터 수집
    │   ├── aiAnalyzer.js     # AI 분석
    │   └── scoreCalculator.js # 점수 계산
    ├── routes/
    │   └── api.js         # API 라우트
    └── utils/
        └── helpers.js     # 유틸리티 함수
```

## 🔧 설정

### 위협 카테고리
- `TERROR` - 테러 위협 (가중치: 0.25)
- `CYBER` - 사이버 공격 (가중치: 0.20)
- `SMUGGLING` - 밀수/밀입국 (가중치: 0.15)
- `DRONE` - 드론 위협 (가중치: 0.15)
- `INSIDER` - 내부자 위협 (가중치: 0.15)
- `GEOPOLITICAL` - 지정학적 위협 (가중치: 0.10)

### 위협 레벨
| 레벨 | 점수 범위 | 설명 |
|------|----------|------|
| LOW | 0-25 | 일상적 보안 상태 |
| GUARDED | 26-50 | 일반 경계 수준 |
| ELEVATED | 51-65 | 높아진 경계 |
| HIGH | 66-85 | 심각한 위협 |
| CRITICAL | 86-100 | 즉각 대응 필요 |

## 🔄 데이터 흐름

1. **데이터 수집** (`dataCollector.js`)
   - NewsAPI: 뉴스 기사 수집
   - GDELT: 글로벌 이벤트 데이터
   - AbuseIPDB: 사이버 위협 정보

2. **AI 분석** (`aiAnalyzer.js`)
   - 키워드 기반 1차 필터링
   - Claude AI 상세 분석

3. **점수 계산** (`scoreCalculator.js`)
   - 카테고리별 가중 점수 산출
   - 통합 위협 지수 계산

4. **실시간 전달**
   - SSE로 프론트엔드에 업데이트 전송

## 📝 라이선스

MIT License

