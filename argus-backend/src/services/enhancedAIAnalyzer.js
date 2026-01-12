/**
 * ARGUS - 강화된 AI 분석 서비스
 * 
 * OpenRouter API를 사용한 심층 위협 분석
 * - 위협 분류 및 심각도 평가
 * - 상세 추론 과정 로깅
 * - 다국어 지원 (한국어/영어)
 * - Claude, GPT-4 등 다양한 모델 지원
 */

const { THREAT_CATEGORIES, THREAT_LEVELS } = require('../config/constants');

// =============================================================================
// 설정
// =============================================================================

// OpenRouter API (우선) 또는 Anthropic API 사용
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// OpenRouter 모델 선택 (비용 효율적인 모델들)
const OPENROUTER_MODELS = {
  fast: 'anthropic/claude-3-haiku',        // 빠르고 저렴
  balanced: 'anthropic/claude-3.5-sonnet', // 균형
  smart: 'anthropic/claude-3-opus',        // 최고 성능
  gpt4: 'openai/gpt-4-turbo',              // GPT-4
  default: 'anthropic/claude-3.5-sonnet'   // 기본값
};

const SELECTED_MODEL = process.env.OPENROUTER_MODEL || OPENROUTER_MODELS.balanced;
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'; // Direct Anthropic API model

// =============================================================================
// 향상된 Claude 프롬프트
// =============================================================================

const SYSTEM_PROMPT = `당신은 인천국제공항 보안 위협 분석 전문가입니다. 
ARGUS SKY 시스템의 핵심 AI로서, 수집된 정보를 분석하여 공항 보안에 대한 위협을 평가합니다.

## 당신의 역할
1. 뉴스, 정보, 데이터를 분석하여 공항 보안 위협 여부 판단
2. 위협의 카테고리, 심각도, 신뢰도 평가
3. 분석 근거와 추론 과정을 명확히 설명
4. 실행 가능한 권고사항 제시

## 위협 카테고리 정의
- TERROR: 테러 위협, 폭발물, 무기, 인질, 항공기 납치
- CYBER: 사이버 공격, 해킹, 시스템 침해, 데이터 유출
- SMUGGLING: 밀수, 밀입국, 마약, 불법 물품 반입
- DRONE: 드론/무인기 위협, 활주로 침입, 항공기 위협
- INSIDER: 내부자 위협, 직원 비리, 정보 유출, 내부 공모
- GEOPOLITICAL: 지정학적 위협, 북한 도발, 군사적 긴장, 외교 갈등

## 심각도 평가 기준 (0-100)
- 0-25: 낮음 - 직접적 위협 없음, 일반 정보
- 26-50: 주의 - 잠재적 위협, 모니터링 필요
- 51-65: 경계 - 구체적 위협 징후, 대비 필요
- 66-85: 높음 - 명확한 위협, 즉각 대응 필요
- 86-100: 심각 - 임박한 위협, 긴급 대응 필요

## 신뢰도 평가 기준 (0-1)
- 0.0-0.3: 낮음 - 미확인 정보, 추측성 내용
- 0.4-0.6: 보통 - 일부 확인된 정보
- 0.7-0.8: 높음 - 신뢰할 수 있는 출처
- 0.9-1.0: 매우 높음 - 공식 발표, 확인된 사실`;

const ANALYSIS_PROMPT_TEMPLATE = `## 분석 대상 정보

**출처**: {{source}}
**제목**: {{title}}
**내용**: {{content}}
**수집 시간**: {{timestamp}}

## 분석 요청

위 정보를 분석하여 다음 JSON 형식으로 응답해주세요:

\`\`\`json
{
  "isThreat": true/false,
  "category": "TERROR|CYBER|SMUGGLING|DRONE|INSIDER|GEOPOLITICAL",
  "severity": 0-100,
  "confidence": 0.0-1.0,
  "summary": "위협 요약 (한국어, 2-3문장)",
  "keywords": ["핵심", "키워드", "배열"],
  "entities": {
    "locations": ["관련 장소"],
    "organizations": ["관련 조직"],
    "persons": ["관련 인물"]
  },
  "reasoning": {
    "threatIndicators": ["위협으로 판단한 근거들"],
    "riskFactors": ["위험 요소들"],
    "mitigatingFactors": ["위협을 낮추는 요소들"],
    "uncertainties": ["불확실한 점들"]
  },
  "recommendation": "권고 조치 (한국어)",
  "relatedCategories": ["연관된 다른 카테고리들"],
  "temporalRelevance": "immediate|short-term|long-term",
  "geographicScope": "local|regional|national|international"
}
\`\`\`

**중요**: 
- JSON만 응답하세요. 다른 텍스트는 포함하지 마세요.
- 공항 보안과 직접 관련 없는 일반 뉴스는 isThreat: false로 응답하세요.
- 위협이 아닌 경우에도 severity는 0-25 범위로 설정하세요.`;

// =============================================================================
// OpenRouter / Claude API 호출
// =============================================================================

/**
 * OpenRouter API를 사용한 위협 분석 (다양한 LLM 지원)
 */
async function analyzeWithOpenRouter(article) {
  const prompt = ANALYSIS_PROMPT_TEMPLATE
    .replace('{{source}}', article.sourceName || article.source || 'Unknown')
    .replace('{{title}}', article.title || '')
    .replace('{{content}}', (article.content || '').substring(0, 2000))
    .replace('{{timestamp}}', article.publishedAt || new Date().toISOString());

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://argus-sky.vercel.app',
        'X-Title': 'ARGUS SKY Threat Intelligence',
      },
      body: JSON.stringify({
        model: SELECTED_MODEL,
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // JSON 추출
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // 검증 및 기본값 설정
    const result = validateAndNormalizeAnalysis(analysis, article);
    result.analysisModel = SELECTED_MODEL;
    result.analysisMethod = 'openrouter_ai';
    
    return result;
    
  } catch (error) {
    console.error('[AIAnalyzer] OpenRouter API error:', error.message);
    // 폴백: 키워드 분석
    return analyzeWithKeywords(article);
  }
}

/**
 * Claude API를 사용한 위협 분석 (직접 호출)
 */
async function analyzeWithClaude(article) {
  // OpenRouter API 키가 있으면 OpenRouter 사용
  if (OPENROUTER_API_KEY) {
    return analyzeWithOpenRouter(article);
  }
  
  // Anthropic API 키가 있으면 직접 호출
  if (!ANTHROPIC_API_KEY) {
    console.log('[AIAnalyzer] No API key, using keyword analysis');
    return analyzeWithKeywords(article);
  }

  const prompt = ANALYSIS_PROMPT_TEMPLATE
    .replace('{{source}}', article.sourceName || article.source || 'Unknown')
    .replace('{{title}}', article.title || '')
    .replace('{{content}}', (article.content || '').substring(0, 2000))
    .replace('{{timestamp}}', article.publishedAt || new Date().toISOString());

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';
    
    // JSON 추출
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // 검증 및 기본값 설정
    return validateAndNormalizeAnalysis(analysis, article);
    
  } catch (error) {
    console.error('[AIAnalyzer] Claude API error:', error.message);
    // 폴백: 키워드 분석
    return analyzeWithKeywords(article);
  }
}

/**
 * 분석 결과 검증 및 정규화
 */
function validateAndNormalizeAnalysis(analysis, article) {
  const validCategories = Object.keys(THREAT_CATEGORIES);
  
  return {
    isThreat: Boolean(analysis.isThreat),
    category: validCategories.includes(analysis.category) ? analysis.category : 'TERROR',
    severity: Math.min(100, Math.max(0, Number(analysis.severity) || 0)),
    confidence: Math.min(1, Math.max(0, Number(analysis.confidence) || 0.5)),
    summary: analysis.summary || article.title,
    keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 10) : [],
    entities: {
      locations: analysis.entities?.locations || [],
      organizations: analysis.entities?.organizations || [],
      persons: analysis.entities?.persons || [],
    },
    reasoning: {
      threatIndicators: analysis.reasoning?.threatIndicators || [],
      riskFactors: analysis.reasoning?.riskFactors || [],
      mitigatingFactors: analysis.reasoning?.mitigatingFactors || [],
      uncertainties: analysis.reasoning?.uncertainties || [],
    },
    recommendation: analysis.recommendation || '상황 모니터링 지속',
    relatedCategories: analysis.relatedCategories || [],
    temporalRelevance: analysis.temporalRelevance || 'short-term',
    geographicScope: analysis.geographicScope || 'local',
    analysisMethod: 'claude_ai',
    analysisModel: ANTHROPIC_MODEL,
    analyzedAt: new Date().toISOString(),
  };
}

// =============================================================================
// 키워드 기반 분석 (폴백)
// =============================================================================

/**
 * 키워드 기반 위협 분석 (API 없을 때 사용)
 */
function analyzeWithKeywords(article) {
  const text = `${article.title || ''} ${article.content || ''}`.toLowerCase();
  
  // 카테고리별 키워드 매칭
  const categoryScores = {};
  let maxScore = 0;
  let maxCategory = 'TERROR';

  for (const [category, config] of Object.entries(THREAT_CATEGORIES)) {
    const keywords = config.keywords || [];
    let score = 0;
    const matchedKeywords = [];

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 10;
        matchedKeywords.push(keyword);
      }
    }

    categoryScores[category] = { score, matchedKeywords };

    if (score > maxScore) {
      maxScore = score;
      maxCategory = category;
    }
  }

  // 위협 여부 결정
  const isThreat = maxScore >= 10;
  
  // 심각도 계산
  const severity = Math.min(100, Math.max(0, maxScore * 5 + calculateContextBonus(text)));
  
  // 신뢰도 계산
  const confidence = Math.min(0.8, 0.3 + (maxScore / 50));

  // 키워드 추출
  const keywords = categoryScores[maxCategory]?.matchedKeywords || [];
  
  // 추론 근거 생성
  const reasoning = generateKeywordReasoning(categoryScores, text);

  return {
    isThreat,
    category: isThreat ? maxCategory : 'TERROR',
    severity: isThreat ? severity : Math.min(25, severity),
    confidence,
    summary: generateSummary(article, maxCategory, isThreat),
    keywords,
    entities: extractEntities(text),
    reasoning,
    recommendation: generateRecommendation(maxCategory, severity),
    relatedCategories: findRelatedCategories(categoryScores),
    temporalRelevance: 'short-term',
    geographicScope: determineScope(text),
    analysisMethod: 'keyword_based',
    analysisModel: 'rule_engine_v1',
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * 컨텍스트 보너스 계산
 */
function calculateContextBonus(text) {
  let bonus = 0;
  
  // 긴급성 키워드
  const urgentKeywords = ['긴급', '속보', '발생', '발견', '적발', '경보', 'breaking', 'urgent', 'alert'];
  for (const kw of urgentKeywords) {
    if (text.includes(kw)) bonus += 5;
  }
  
  // 공항 관련 키워드
  const airportKeywords = ['인천공항', '김포공항', '공항', '터미널', '활주로', 'airport', 'terminal'];
  for (const kw of airportKeywords) {
    if (text.includes(kw)) bonus += 10;
  }
  
  return Math.min(30, bonus);
}

/**
 * 키워드 분석 추론 근거 생성
 */
function generateKeywordReasoning(categoryScores, text) {
  const threatIndicators = [];
  const riskFactors = [];
  const mitigatingFactors = [];
  const uncertainties = ['키워드 기반 분석으로 문맥 파악 제한적'];

  for (const [category, data] of Object.entries(categoryScores)) {
    if (data.matchedKeywords.length > 0) {
      threatIndicators.push(`${THREAT_CATEGORIES[category].name} 관련 키워드 탐지: ${data.matchedKeywords.join(', ')}`);
    }
  }

  // 위험 요소 분석
  if (text.includes('확인') || text.includes('발생')) {
    riskFactors.push('사건 발생 확인됨');
  }
  if (text.includes('대피') || text.includes('통제')) {
    riskFactors.push('현장 대응 진행 중');
  }

  // 완화 요소 분석
  if (text.includes('해결') || text.includes('종료')) {
    mitigatingFactors.push('상황 해결/종료 언급');
  }
  if (text.includes('오보') || text.includes('해프닝')) {
    mitigatingFactors.push('오보/해프닝 가능성');
  }

  return { threatIndicators, riskFactors, mitigatingFactors, uncertainties };
}

/**
 * 요약 생성
 */
function generateSummary(article, category, isThreat) {
  if (!isThreat) {
    return `${article.title} - 직접적인 공항 보안 위협 요소 미발견`;
  }
  
  const categoryName = THREAT_CATEGORIES[category]?.name || category;
  return `${categoryName} 관련 정보 탐지: ${article.title}`;
}

/**
 * 권고사항 생성
 */
function generateRecommendation(category, severity) {
  if (severity >= 80) {
    return '즉각적인 대응 및 관련 부서 긴급 통보 필요';
  }
  if (severity >= 60) {
    return '보안팀 확인 및 상황 모니터링 강화 필요';
  }
  if (severity >= 40) {
    return '관련 부서 정보 공유 및 추가 정보 수집 필요';
  }
  return '지속적인 모니터링 권장';
}

/**
 * 엔티티 추출 (간단한 패턴 매칭)
 */
function extractEntities(text) {
  const locations = [];
  const organizations = [];
  
  // 공항 관련 장소
  const locationPatterns = [
    '인천공항', '인천국제공항', '김포공항', '제주공항', '김해공항',
    '제1터미널', '제2터미널', '출국장', '입국장', '활주로', '탑승구'
  ];
  
  for (const loc of locationPatterns) {
    if (text.includes(loc)) locations.push(loc);
  }
  
  // 기관/조직
  const orgPatterns = [
    '국토교통부', '인천공항공사', '항공보안', '세관', '출입국관리',
    '대한항공', '아시아나', '경찰', '소방', '군'
  ];
  
  for (const org of orgPatterns) {
    if (text.includes(org)) organizations.push(org);
  }
  
  return { locations, organizations, persons: [] };
}

/**
 * 연관 카테고리 찾기
 */
function findRelatedCategories(categoryScores) {
  return Object.entries(categoryScores)
    .filter(([, data]) => data.score > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(1, 3)
    .map(([category]) => category);
}

/**
 * 지리적 범위 결정
 */
function determineScope(text) {
  if (text.includes('국제') || text.includes('해외') || text.includes('미국') || text.includes('중국')) {
    return 'international';
  }
  if (text.includes('전국') || text.includes('한국') || text.includes('국내')) {
    return 'national';
  }
  if (text.includes('수도권') || text.includes('인천') || text.includes('경기')) {
    return 'regional';
  }
  return 'local';
}

// =============================================================================
// 배치 분석
// =============================================================================

/**
 * 여러 기사 배치 분석
 */
async function analyzeArticles(articles, options = {}) {
  const { concurrency = 3, useAI = true } = options;
  const results = [];
  const hasAI = !!(OPENROUTER_API_KEY || ANTHROPIC_API_KEY);

  console.log(`[AIAnalyzer] Analyzing ${articles.length} articles (AI: ${useAI && hasAI}, Provider: ${OPENROUTER_API_KEY ? 'OpenRouter' : (ANTHROPIC_API_KEY ? 'Anthropic' : 'Keyword')})`);

  // 동시 처리 (API rate limit 고려)
  for (let i = 0; i < articles.length; i += concurrency) {
    const batch = articles.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(async (article) => {
        try {
          const analysis = useAI && hasAI
            ? await analyzeArticle(article)
            : analyzeWithKeywords(article);
          
          return {
            ...article,
            analysis,
            isThreat: analysis.isThreat,
            category: analysis.category,
            severity: analysis.severity,
            confidence: analysis.confidence,
          };
        } catch (error) {
          console.error(`[AIAnalyzer] Error analyzing article:`, error.message);
          return {
            ...article,
            analysis: analyzeWithKeywords(article),
            error: error.message,
          };
        }
      })
    );
    
    results.push(...batchResults);
    
    // Rate limit 대기
    if (i + concurrency < articles.length && ANTHROPIC_API_KEY) {
      await sleep(500);
    }
  }

  // 위협 필터링 및 정렬
  const threats = results
    .filter(r => r.isThreat || r.severity >= 30)
    .sort((a, b) => b.severity - a.severity);

  console.log(`[AIAnalyzer] Found ${threats.length} potential threats`);
  
  return threats;
}

/**
 * 단일 기사 분석 (외부 호출용)
 */
async function analyzeArticle(article) {
  // OpenRouter가 설정되어 있으면 우선 사용
  if (OPENROUTER_API_KEY) {
    return analyzeWithOpenRouter(article);
  }
  // Anthropic API가 설정되어 있으면 직접 호출
  if (ANTHROPIC_API_KEY) {
    return analyzeWithClaude(article);
  }
  // API 없으면 키워드 분석
  return analyzeWithKeywords(article);
}

// =============================================================================
// 유틸리티
// =============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Export
// =============================================================================

module.exports = {
  analyzeWithClaude,
  analyzeWithOpenRouter,
  analyzeWithKeywords,
  analyzeArticle,
  analyzeArticles,
  SYSTEM_PROMPT,
  ANALYSIS_PROMPT_TEMPLATE,
  OPENROUTER_MODELS,
  SELECTED_MODEL,
};

