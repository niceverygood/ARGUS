/**
 * ARGUS SKY - Data Collector Service
 * 다양한 소스에서 위협 관련 데이터 수집
 * 
 * 데이터 소스:
 * 1. NewsAPI (국제 뉴스)
 * 2. GDELT (글로벌 이벤트)
 * 3. AbuseIPDB (사이버 위협)
 * 4. 한국 공공데이터 (RSS, 공공데이터포털)
 * 5. 네이버/다음 뉴스 (한국 뉴스)
 */

const fetch = require('node-fetch');
const { THREAT_CATEGORIES, API_CONFIG, AIRPORT_KEYWORDS } = require('../config/constants');
const { collectAllKoreanData, fetchRSSFeeds } = require('./koreanDataCollector');

// =============================================================================
// NewsAPI - 뉴스 데이터 수집
// =============================================================================

async function fetchNewsData(location = '인천공항') {
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    console.warn('[DataCollector] NEWS_API_KEY not configured, skipping news collection');
    return [];
  }

  const results = [];
  const baseUrl = `${API_CONFIG.NEWS_API.baseUrl}${API_CONFIG.NEWS_API.endpoints.everything}`;

  try {
    // 각 카테고리별 키워드로 검색
    for (const [categoryId, category] of Object.entries(THREAT_CATEGORIES)) {
      // 공항 관련 키워드와 위협 키워드 조합
      const keywords = category.keywords.slice(0, 3);
      const query = `(${keywords.join(' OR ')}) AND (${AIRPORT_KEYWORDS.slice(0, 5).join(' OR ')})`;
      
      const params = new URLSearchParams({
        q: query,
        language: 'ko,en',
        sortBy: 'publishedAt',
        pageSize: '10',
        apiKey: apiKey
      });

      const response = await fetch(`${baseUrl}?${params}`);
      
      if (!response.ok) {
        console.error(`[NewsAPI] Error for ${categoryId}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.articles) {
        data.articles.forEach(article => {
          results.push({
            source: 'newsapi',
            sourceType: 'news',
            sourceName: article.source?.name || 'Unknown News',
            title: article.title,
            content: article.description || article.content || '',
            url: article.url,
            publishedAt: article.publishedAt,
            category: categoryId,
            raw: article
          });
        });
      }

      // Rate limiting - 간격 두기
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[DataCollector] NewsAPI: collected ${results.length} articles`);
    return results;

  } catch (error) {
    console.error('[DataCollector] NewsAPI error:', error.message);
    return [];
  }
}

// =============================================================================
// GDELT - 글로벌 이벤트 데이터 수집
// =============================================================================

async function fetchGDELTData() {
  const results = [];
  const baseUrl = `${API_CONFIG.GDELT.baseUrl}${API_CONFIG.GDELT.endpoints.doc}`;

  try {
    // GDELT 쿼리 - 공항 보안 관련
    const queries = [
      'airport security threat',
      'airport terrorism',
      'aviation cyber attack',
      'airport smuggling',
      'drone airport'
    ];

    for (const query of queries) {
      const params = new URLSearchParams({
        query: query,
        mode: 'artlist',
        format: 'json',
        maxrecords: '10'
      });

      const response = await fetch(`${baseUrl}?${params}`);
      
      if (!response.ok) {
        console.error(`[GDELT] Error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.articles) {
        data.articles.forEach(article => {
          results.push({
            source: 'gdelt',
            sourceType: 'global_events',
            sourceName: article.domain || 'GDELT',
            title: article.title,
            content: article.seendate ? `Published: ${article.seendate}` : '',
            url: article.url,
            publishedAt: article.seendate ? new Date(article.seendate).toISOString() : new Date().toISOString(),
            category: null, // AI가 분류
            raw: article
          });
        });
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[DataCollector] GDELT: collected ${results.length} events`);
    return results;

  } catch (error) {
    console.error('[DataCollector] GDELT error:', error.message);
    return [];
  }
}

// =============================================================================
// AbuseIPDB - 사이버 위협 데이터 수집
// =============================================================================

async function fetchCyberThreatData() {
  const apiKey = process.env.ABUSEIPDB_API_KEY;
  
  if (!apiKey) {
    console.warn('[DataCollector] ABUSEIPDB_API_KEY not configured, skipping cyber threat collection');
    return [];
  }

  const results = [];
  const baseUrl = `${API_CONFIG.ABUSEIPDB.baseUrl}${API_CONFIG.ABUSEIPDB.endpoints.blacklist}`;

  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[AbuseIPDB] Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      // 상위 10개만 처리
      const topThreats = data.data.slice(0, 10);
      
      topThreats.forEach(ip => {
        results.push({
          source: 'abuseipdb',
          sourceType: 'cyber_intel',
          sourceName: 'AbuseIPDB',
          title: `Malicious IP Detected: ${ip.ipAddress}`,
          content: `Abuse confidence: ${ip.abuseConfidenceScore}%. Total reports: ${ip.totalReports || 'N/A'}`,
          url: `https://www.abuseipdb.com/check/${ip.ipAddress}`,
          publishedAt: ip.lastReportedAt || new Date().toISOString(),
          category: 'CYBER',
          raw: ip
        });
      });
    }

    console.log(`[DataCollector] AbuseIPDB: collected ${results.length} threats`);
    return results;

  } catch (error) {
    console.error('[DataCollector] AbuseIPDB error:', error.message);
    return [];
  }
}

// =============================================================================
// 시뮬레이션 데이터 생성 (API 없을 때 테스트용)
// =============================================================================

function generateSimulatedData() {
  const results = [];
  const categories = Object.keys(THREAT_CATEGORIES);
  
  const simulatedThreats = [
    {
      category: 'TERROR',
      title: '인천공항 인근 수상한 차량 발견 신고',
      content: '인천공항 3터미널 인근에서 수상한 행동을 보이는 차량이 발견되어 보안팀이 출동했습니다. 현재 조사 중이며, 테러 관련 가능성은 낮은 것으로 파악됩니다.'
    },
    {
      category: 'CYBER',
      title: '항공사 예약 시스템 해킹 시도 탐지',
      content: '국내 주요 항공사의 예약 시스템에 대한 해킹 시도가 탐지되었습니다. 보안 시스템이 공격을 차단했으며, 고객 정보 유출은 없는 것으로 확인되었습니다.'
    },
    {
      category: 'SMUGGLING',
      title: '인천공항 세관에서 마약 밀수 적발',
      content: '인천국제공항 세관에서 동남아발 항공편을 통해 반입을 시도한 마약류를 적발했습니다. 용의자 2명이 체포되었습니다.'
    },
    {
      category: 'DRONE',
      title: '인천공항 비행금지구역 드론 침입 감지',
      content: '인천공항 비행금지구역 내에 불법 드론이 침입하여 일시적으로 활주로 운영이 중단되었습니다. 드론은 곧 제거되어 정상 운영이 재개되었습니다.'
    },
    {
      category: 'INSIDER',
      title: '공항 보안 직원 내부 정보 유출 의혹',
      content: '인천공항 보안 관련 내부 정보가 외부로 유출된 정황이 포착되어 조사가 진행 중입니다. 관련 직원에 대한 감사가 실시되고 있습니다.'
    },
    {
      category: 'GEOPOLITICAL',
      title: '북한 미사일 발사로 인한 항공기 우회 운항',
      content: '북한의 미사일 발사로 인해 일부 국제 항공편이 우회 운항을 실시했습니다. 인천공항 운영에는 직접적인 영향이 없었습니다.'
    }
  ];

  simulatedThreats.forEach((threat, index) => {
    results.push({
      source: 'simulation',
      sourceType: 'simulated',
      sourceName: 'ARGUS Simulator',
      title: threat.title,
      content: threat.content,
      url: null,
      publishedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      category: threat.category,
      raw: { simulated: true, index }
    });
  });

  console.log(`[DataCollector] Simulation: generated ${results.length} items`);
  return results;
}

// =============================================================================
// 모든 소스에서 데이터 수집
// =============================================================================

async function collectAllData() {
  console.log('[DataCollector] Starting data collection from all sources...');
  console.log('[DataCollector] Configured APIs:');
  console.log(`  - NEWS_API_KEY: ${process.env.NEWS_API_KEY ? '✓' : '✗'}`);
  console.log(`  - ABUSEIPDB_API_KEY: ${process.env.ABUSEIPDB_API_KEY ? '✓' : '✗'}`);
  console.log(`  - NAVER_CLIENT_ID: ${process.env.NAVER_CLIENT_ID ? '✓' : '✗'}`);
  console.log(`  - PUBLIC_DATA_API_KEY: ${process.env.PUBLIC_DATA_API_KEY ? '✓' : '✗'}`);
  
  const hasAnyKey = !!(
    process.env.NEWS_API_KEY || 
    process.env.ABUSEIPDB_API_KEY || 
    process.env.NAVER_CLIENT_ID ||
    process.env.PUBLIC_DATA_API_KEY
  );

  try {
    // 병렬로 모든 소스에서 데이터 수집
    const [newsData, gdeltData, cyberData, koreanData] = await Promise.allSettled([
      fetchNewsData(),
      fetchGDELTData(),
      fetchCyberThreatData(),
      collectAllKoreanData() // 한국 데이터 (RSS + 공공데이터 + 네이버)
    ]);

    const results = [];

    // 국제 뉴스
    if (newsData.status === 'fulfilled' && newsData.value.length > 0) {
      console.log(`[DataCollector] NewsAPI: ${newsData.value.length} items`);
      results.push(...newsData.value);
    } else if (newsData.status === 'rejected') {
      console.error('[DataCollector] News collection failed:', newsData.reason?.message);
    }

    // GDELT 글로벌 이벤트
    if (gdeltData.status === 'fulfilled' && gdeltData.value.length > 0) {
      console.log(`[DataCollector] GDELT: ${gdeltData.value.length} items`);
      results.push(...gdeltData.value);
    } else if (gdeltData.status === 'rejected') {
      console.error('[DataCollector] GDELT collection failed:', gdeltData.reason?.message);
    }

    // 사이버 위협 데이터
    if (cyberData.status === 'fulfilled' && cyberData.value.length > 0) {
      console.log(`[DataCollector] AbuseIPDB: ${cyberData.value.length} items`);
      results.push(...cyberData.value);
    } else if (cyberData.status === 'rejected') {
      console.error('[DataCollector] Cyber collection failed:', cyberData.reason?.message);
    }

    // 한국 데이터 (RSS + 공공데이터 + 네이버)
    if (koreanData.status === 'fulfilled' && koreanData.value.length > 0) {
      console.log(`[DataCollector] Korean Data: ${koreanData.value.length} items`);
      results.push(...koreanData.value);
    } else if (koreanData.status === 'rejected') {
      console.error('[DataCollector] Korean data collection failed:', koreanData.reason?.message);
    }

    // 결과가 없으면 시뮬레이션 데이터 추가
    if (results.length === 0) {
      console.log('[DataCollector] No data collected from APIs, using simulated data');
      return generateSimulatedData();
    }

    // 중복 제거 (제목 기준)
    const uniqueResults = removeDuplicates(results);
    
    console.log(`[DataCollector] Total collected: ${results.length}, After dedup: ${uniqueResults.length}`);
    return uniqueResults;

  } catch (error) {
    console.error('[DataCollector] Collection error:', error);
    return generateSimulatedData();
  }
}

/**
 * 중복 제거 (제목 기준)
 */
function removeDuplicates(articles) {
  const seen = new Set();
  return articles.filter(article => {
    const key = article.title?.toLowerCase().trim().substring(0, 50);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// =============================================================================
// Export
// =============================================================================

module.exports = {
  fetchNewsData,
  fetchGDELTData,
  fetchCyberThreatData,
  collectAllData,
  generateSimulatedData,
  removeDuplicates
};

