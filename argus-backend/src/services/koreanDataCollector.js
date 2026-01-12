/**
 * ARGUS - 한국 공공데이터 및 뉴스 수집기
 * 
 * 데이터 소스:
 * 1. 공공데이터포털 (data.go.kr)
 * 2. 네이버 뉴스 검색
 * 3. 다음 뉴스 검색
 */

const { THREAT_CATEGORIES } = require('../config/constants');

// =============================================================================
// 설정
// =============================================================================

const PUBLIC_DATA_API_KEY = process.env.PUBLIC_DATA_API_KEY || '';
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || '';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '';

// 카테고리별 검색 키워드 (한국어)
const KOREAN_KEYWORDS = {
  TERROR: [
    '공항 테러', '폭발물 발견', '항공기 위협', '인천공항 보안',
    '테러 위협', '폭탄 위협', '항공 보안 위반', '공항 대피'
  ],
  CYBER: [
    '항공사 해킹', '공항 시스템 장애', '사이버 공격 항공',
    '랜섬웨어 공항', 'DDoS 항공', '개인정보 유출 항공사'
  ],
  SMUGGLING: [
    '인천공항 밀수', '마약 적발 공항', '밀입국 적발',
    '세관 적발', '불법 반입', '공항 검거'
  ],
  DRONE: [
    '공항 드론', '활주로 드론', '불법 드론 비행',
    '드론 위협 공항', '무인기 침입', '항공기 드론 충돌'
  ],
  INSIDER: [
    '공항 직원 비리', '내부자 정보 유출', '공항 보안 위반 직원',
    '항공사 직원 검거', '공항 부정행위'
  ],
  GEOPOLITICAL: [
    '북한 미사일', '한반도 긴장', '북한 도발', '군사 훈련',
    '한미 연합', '북한 위협', 'NLL 침범'
  ]
};

// =============================================================================
// 네이버 뉴스 검색 API
// =============================================================================

/**
 * 네이버 뉴스 검색
 * API 문서: https://developers.naver.com/docs/serviceapi/search/news/news.md
 */
async function fetchNaverNews(query, display = 10) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.log('[NaverNews] API keys not configured, skipping...');
    return [];
  }

  try {
    const url = new URL('https://openapi.naver.com/v1/search/news.json');
    url.searchParams.append('query', query);
    url.searchParams.append('display', display);
    url.searchParams.append('sort', 'date'); // 최신순

    const response = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    });

    if (!response.ok) {
      throw new Error(`Naver API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.items.map(item => ({
      source: 'naver_news',
      sourceType: 'korean_news',
      sourceName: extractSourceName(item.originallink),
      title: cleanHtml(item.title),
      content: cleanHtml(item.description),
      url: item.link,
      publishedAt: parseNaverDate(item.pubDate),
      query: query,
    }));
  } catch (error) {
    console.error(`[NaverNews] Error fetching "${query}":`, error.message);
    return [];
  }
}

/**
 * 카테고리별 네이버 뉴스 수집
 */
async function fetchNaverNewsByCategory() {
  const results = [];
  
  for (const [category, keywords] of Object.entries(KOREAN_KEYWORDS)) {
    // 각 카테고리에서 2개 키워드만 검색 (API 할당량 절약)
    const selectedKeywords = keywords.slice(0, 2);
    
    for (const keyword of selectedKeywords) {
      const articles = await fetchNaverNews(keyword, 5);
      results.push(...articles.map(article => ({
        ...article,
        suggestedCategory: category,
      })));
      
      // API Rate limit 방지
      await sleep(100);
    }
  }
  
  console.log(`[NaverNews] Collected ${results.length} articles`);
  return results;
}

// =============================================================================
// 다음 뉴스 검색 (Kakao API)
// =============================================================================

/**
 * 다음(카카오) 웹 검색으로 뉴스 수집
 * API 문서: https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide
 */
async function fetchDaumNews(query, size = 10) {
  const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || '';
  
  if (!KAKAO_REST_API_KEY) {
    console.log('[DaumNews] API key not configured, skipping...');
    return [];
  }

  try {
    const url = new URL('https://dapi.kakao.com/v2/search/web');
    url.searchParams.append('query', `${query} site:news.daum.net OR site:v.daum.net`);
    url.searchParams.append('size', size);
    url.searchParams.append('sort', 'recency');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Kakao API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.documents.map(item => ({
      source: 'daum_news',
      sourceType: 'korean_news',
      sourceName: '다음뉴스',
      title: cleanHtml(item.title),
      content: cleanHtml(item.contents),
      url: item.url,
      publishedAt: item.datetime,
      query: query,
    }));
  } catch (error) {
    console.error(`[DaumNews] Error fetching "${query}":`, error.message);
    return [];
  }
}

// =============================================================================
// RSS 피드 수집 (무료, API 키 불필요)
// =============================================================================

/**
 * RSS 피드에서 뉴스 수집
 */
async function fetchRSSFeeds() {
  const RSS_FEEDS = [
    {
      name: '연합뉴스 사회',
      url: 'https://www.yna.co.kr/rss/society.xml',
      category: 'general',
    },
    {
      name: '연합뉴스 국제',
      url: 'https://www.yna.co.kr/rss/international.xml',
      category: 'GEOPOLITICAL',
    },
    {
      name: 'KBS 사회',
      url: 'http://world.kbs.co.kr/rss/rss_news.htm?lang=k&id=society',
      category: 'general',
    },
  ];

  const results = [];

  for (const feed of RSS_FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'ARGUS-SKY/1.0 (Airport Threat Intelligence)',
        },
      });

      if (!response.ok) continue;

      const xml = await response.text();
      const items = parseRSSItems(xml);
      
      results.push(...items.map(item => ({
        source: 'rss_feed',
        sourceType: 'korean_news',
        sourceName: feed.name,
        title: item.title,
        content: item.description,
        url: item.link,
        publishedAt: item.pubDate,
        suggestedCategory: feed.category,
      })));
    } catch (error) {
      console.error(`[RSS] Error fetching ${feed.name}:`, error.message);
    }
  }

  console.log(`[RSS] Collected ${results.length} articles`);
  return results;
}

/**
 * 간단한 RSS XML 파싱
 */
function parseRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const title = extractXmlTag(itemXml, 'title');
    const link = extractXmlTag(itemXml, 'link');
    const description = extractXmlTag(itemXml, 'description');
    const pubDate = extractXmlTag(itemXml, 'pubDate');

    if (title && link) {
      items.push({
        title: cleanHtml(title),
        link,
        description: cleanHtml(description || ''),
        pubDate: pubDate || new Date().toISOString(),
      });
    }
  }

  return items.slice(0, 10); // 최대 10개
}

function extractXmlTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const match = xml.match(regex);
  return match ? (match[1] || match[2] || '').trim() : '';
}

// =============================================================================
// 공공데이터포털 API
// =============================================================================

/**
 * 항공보안 위반 현황 (국토교통부)
 * 실제 API 연동 시 serviceKey 필요
 */
async function fetchAviationSecurityData() {
  if (!PUBLIC_DATA_API_KEY) {
    console.log('[PublicData] API key not configured, using simulated data...');
    return generateSimulatedPublicData();
  }

  try {
    // 실제 공공데이터 API 호출
    // 예시: 항공보안 위반 현황
    const url = new URL('http://apis.data.go.kr/1613000/AirSecurityService/getAirSecurityList');
    url.searchParams.append('serviceKey', PUBLIC_DATA_API_KEY);
    url.searchParams.append('numOfRows', '10');
    url.searchParams.append('pageNo', '1');
    url.searchParams.append('_type', 'json');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Public Data API error: ${response.status}`);
    }

    const data = await response.json();
    // 실제 응답 구조에 맞게 파싱 필요
    return parsePublicDataResponse(data);
  } catch (error) {
    console.error('[PublicData] Error:', error.message);
    return generateSimulatedPublicData();
  }
}

/**
 * 공공데이터 응답 파싱
 */
function parsePublicDataResponse(data) {
  // 실제 API 응답 구조에 맞게 구현
  // 예시 구조
  const items = data?.response?.body?.items?.item || [];
  
  return items.map(item => ({
    source: 'public_data',
    sourceType: 'government',
    sourceName: '국토교통부',
    title: item.title || item.violationType,
    content: item.description || item.details,
    publishedAt: item.occurDate || new Date().toISOString(),
    suggestedCategory: mapViolationToCategory(item.violationType),
  }));
}

/**
 * 위반 유형을 카테고리로 매핑
 */
function mapViolationToCategory(violationType) {
  const mapping = {
    '폭발물': 'TERROR',
    '무기류': 'TERROR',
    '사이버': 'CYBER',
    '마약류': 'SMUGGLING',
    '밀수': 'SMUGGLING',
    '드론': 'DRONE',
  };

  for (const [keyword, category] of Object.entries(mapping)) {
    if (violationType && violationType.includes(keyword)) {
      return category;
    }
  }
  return 'TERROR'; // 기본값
}

/**
 * 시뮬레이션 공공데이터 (API 키 없을 때)
 */
function generateSimulatedPublicData() {
  const simulatedEvents = [
    {
      title: '인천공항 보안검색대 금지물품 적발',
      content: '제1터미널 보안검색대에서 기내 반입 금지 물품이 적발되었습니다. 해당 승객은 별도 조사를 받았으며, 물품은 압수 조치되었습니다.',
      category: 'TERROR',
      severity: 45,
    },
    {
      title: '김포공항 무인기 비행 신고',
      content: '김포공항 인근에서 미확인 무인기 비행이 신고되어 관제당국이 확인 중입니다.',
      category: 'DRONE',
      severity: 60,
    },
    {
      title: '세관 마약류 밀반입 시도 적발',
      content: '인천공항 세관에서 해외 입국자의 마약류 밀반입 시도가 적발되었습니다.',
      category: 'SMUGGLING',
      severity: 70,
    },
    {
      title: '항공사 예약 시스템 일시 장애',
      content: '국적 항공사 예약 시스템에 일시적 장애가 발생하여 복구 작업이 진행되었습니다.',
      category: 'CYBER',
      severity: 40,
    },
    {
      title: '북한 단거리 발사체 발사',
      content: '북한이 동해상으로 단거리 발사체를 발사했다고 합참이 발표했습니다.',
      category: 'GEOPOLITICAL',
      severity: 75,
    },
  ];

  // 랜덤하게 2-4개 선택
  const count = Math.floor(Math.random() * 3) + 2;
  const selected = shuffleArray([...simulatedEvents]).slice(0, count);

  return selected.map((event, index) => ({
    source: 'public_data_simulated',
    sourceType: 'government',
    sourceName: '공공데이터포털 (시뮬레이션)',
    title: event.title,
    content: event.content,
    url: null,
    publishedAt: new Date(Date.now() - index * 3600000).toISOString(), // 1시간 간격
    suggestedCategory: event.category,
    simulatedSeverity: event.severity,
  }));
}

// =============================================================================
// 통합 수집 함수
// =============================================================================

/**
 * 모든 한국 데이터 소스에서 수집
 */
async function collectAllKoreanData() {
  console.log('[KoreanData] Starting Korean data collection...');
  
  const results = [];

  try {
    // 1. RSS 피드 (무료, 항상 작동)
    const rssData = await fetchRSSFeeds();
    results.push(...rssData);

    // 2. 공공데이터 (API 키 필요)
    const publicData = await fetchAviationSecurityData();
    results.push(...publicData);

    // 3. 네이버 뉴스 (API 키 필요)
    if (NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
      const naverData = await fetchNaverNewsByCategory();
      results.push(...naverData);
    }

    // 중복 제거 (제목 기준)
    const uniqueResults = removeDuplicates(results, 'title');

    // 관련성 필터링 (공항/항공 관련만)
    const filteredResults = filterRelevantArticles(uniqueResults);

    console.log(`[KoreanData] Total collected: ${results.length}, Unique: ${uniqueResults.length}, Relevant: ${filteredResults.length}`);
    
    return filteredResults;
  } catch (error) {
    console.error('[KoreanData] Collection error:', error);
    return results;
  }
}

/**
 * 관련성 필터링
 */
function filterRelevantArticles(articles) {
  const relevantKeywords = [
    '공항', '항공', '인천', '김포', '제주', '활주로',
    '테러', '폭발', '미사일', '북한', '드론', '무인기',
    '밀수', '마약', '해킹', '사이버', '보안'
  ];

  return articles.filter(article => {
    const text = `${article.title} ${article.content}`.toLowerCase();
    return relevantKeywords.some(keyword => text.includes(keyword));
  });
}

// =============================================================================
// 유틸리티 함수
// =============================================================================

function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractSourceName(url) {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.replace('www.', '').split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return 'Unknown';
  }
}

function parseNaverDate(dateStr) {
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function removeDuplicates(array, key) {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key]?.toLowerCase().trim();
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

// =============================================================================
// Export
// =============================================================================

module.exports = {
  fetchNaverNews,
  fetchNaverNewsByCategory,
  fetchDaumNews,
  fetchRSSFeeds,
  fetchAviationSecurityData,
  collectAllKoreanData,
  KOREAN_KEYWORDS,
};

