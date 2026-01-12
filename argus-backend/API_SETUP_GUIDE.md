# ARGUS SKY - API 설정 가이드

## 🔑 API 키 발급 방법

### 1. Anthropic Claude API (AI 분석) ⭐ 권장
**용도**: 위협 기사 AI 분석, 심각도 평가, 카테고리 분류

1. https://console.anthropic.com 접속
2. Google 또는 이메일로 가입
3. **Settings** → **API Keys** → **Create Key**
4. 키 복사하여 `.env`에 저장

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

**비용**: 입력 $3/백만토큰, 출력 $15/백만토큰 (처음 $5 무료 크레딧)

---

### 2. 네이버 검색 API ⭐ 권장 (한국 뉴스)
**용도**: 한국어 뉴스 검색, 실시간 뉴스 수집

1. https://developers.naver.com 접속
2. 로그인 → **애플리케이션 등록**
3. **애플리케이션 이름**: ARGUS SKY
4. **사용 API**: 검색 (뉴스 검색)
5. **환경 추가**: WEB 설정, 서비스 URL 입력 (http://localhost:3001)
6. **Client ID**와 **Client Secret** 복사

```env
NAVER_CLIENT_ID=xxxxxxxxxxxx
NAVER_CLIENT_SECRET=xxxxxxxxxxxx
```

**무료**: 25,000 요청/일

---

### 3. NewsAPI (국제 뉴스)
**용도**: 전 세계 영어/한국어 뉴스 수집

1. https://newsapi.org 접속
2. **Get API Key** 클릭
3. 이메일로 가입
4. 대시보드에서 API Key 복사

```env
NEWS_API_KEY=xxxxxxxxxxxxxxxxxxxx
```

**무료**: 100 요청/일 (개발용)
**유료**: $449/월 (프로덕션)

---

### 4. AbuseIPDB (사이버 위협)
**용도**: 악성 IP 데이터, 사이버 공격 탐지

1. https://www.abuseipdb.com/register 접속
2. 이메일로 가입 및 인증
3. 로그인 → **API** 메뉴 → **Create Key**
4. 키 복사

```env
ABUSEIPDB_API_KEY=xxxxxxxxxxxxxxxxxxxx
```

**무료**: 1,000 요청/일

---

### 5. 카카오 REST API (다음 뉴스)
**용도**: 다음 뉴스 검색

1. https://developers.kakao.com 접속
2. 로그인 → **내 애플리케이션** → **애플리케이션 추가**
3. **앱 이름**: ARGUS SKY
4. **앱 키** → **REST API 키** 복사

```env
KAKAO_REST_API_KEY=xxxxxxxxxxxxxxxxxxxx
```

**무료**: 무제한 (합리적 사용)

---

### 6. 공공데이터포털 API
**용도**: 정부 공식 데이터 (항공보안 위반 현황 등)

1. https://www.data.go.kr 접속
2. 회원가입 (공동인증서 또는 간편인증)
3. 원하는 API 검색 → **활용신청**
4. **마이페이지** → **API Key** 확인

```env
PUBLIC_DATA_API_KEY=xxxxxxxxxxxxxxxxxxxx
```

**무료**: API별 상이 (대부분 무료)

---

## 📋 .env 파일 예시

```env
# 서버 설정
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8888

# AI 분석 (권장)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# 한국 뉴스 (권장)
NAVER_CLIENT_ID=xxxxxxxxxxxx
NAVER_CLIENT_SECRET=xxxxxxxxxxxx

# 국제 뉴스
NEWS_API_KEY=xxxxxxxxxxxxxxxxxxxx

# 사이버 위협
ABUSEIPDB_API_KEY=xxxxxxxxxxxxxxxxxxxx

# 다음 뉴스 (선택)
KAKAO_REST_API_KEY=xxxxxxxxxxxxxxxxxxxx

# 공공데이터 (선택)
PUBLIC_DATA_API_KEY=xxxxxxxxxxxxxxxxxxxx
```

---

## 🚀 설정 확인

서버 시작 후 API 상태 확인:

```bash
curl http://localhost:3001/api/sources/status | jq
```

응답 예시:
```json
{
  "success": true,
  "data": {
    "apis": {
      "newsApi": { "configured": true, "name": "NewsAPI" },
      "naverNews": { "configured": true, "name": "네이버 뉴스" },
      "anthropic": { "configured": true, "name": "Claude AI" }
    },
    "freeServices": {
      "gdelt": { "available": true, "name": "GDELT" },
      "rssFeeds": { "available": true, "name": "RSS 피드" }
    }
  }
}
```

---

## 💡 권장 설정 조합

### 최소 설정 (무료)
- RSS 피드 (자동)
- GDELT (자동)
- 시뮬레이션 데이터

### 기본 설정 (무료, 실제 데이터)
- 네이버 뉴스 API ✓
- RSS 피드 (자동)
- GDELT (자동)

### 전체 설정 (AI 분석 포함)
- Anthropic Claude API ✓
- 네이버 뉴스 API ✓
- NewsAPI ✓
- AbuseIPDB ✓
- 공공데이터포털 ✓

---

## 🔄 수동 분석 실행

API 키 설정 후 수동으로 분석 실행:

```bash
curl -X POST http://localhost:3001/api/analyze
```

이 명령은 모든 데이터 소스에서 데이터를 수집하고 AI 분석을 실행합니다.

