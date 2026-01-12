/**
 * ARGUS SKY - AI Analyzer Service
 * Claude AI를 활용한 위협 분석
 */

const fetch = require('node-fetch');
const { THREAT_CATEGORIES, API_CONFIG } = require('../config/constants');

// =============================================================================
// Claude AI 분석
// =============================================================================

async function analyzeWithClaude(content, source) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn('[AIAnalyzer] ANTHROPIC_API_KEY not configured, using keyword-based analysis');
    return null;
  }

  const systemPrompt = `당신은 공항 보안 위협 분석 전문가입니다. 주어진 정보를 분석하여 공항 보안에 대한 위협 수준을 평가합니다.

다음 카테고리 중 하나로 분류해주세요:
- TERROR: 테러 공격 관련
- CYBER: 사이버 공격 관련  
- SMUGGLING: 밀수/밀입국 관련
- DRONE: 드론 위협 관련
- INSIDER: 내부자 위협 관련
- GEOPOLITICAL: 지정학적 위협 관련

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.`;

  const userPrompt = `다음 정보를 분석하고 JSON으로 응답하세요:

출처: ${source}
내용: ${content}

응답 형식:
{
  "isThreat": true/false,
  "category": "TERROR|CYBER|SMUGGLING|DRONE|INSIDER|GEOPOLITICAL",
  "severity": 0-100,
  "confidence": 0-1,
  "summary": "위협 요약 (한국어, 2-3문장)",
  "keywords": ["관련 키워드"],
  "recommendation": "대응 권고 (한국어)"
}`;

  try {
    const response = await fetch(`${API_CONFIG.ANTHROPIC.baseUrl}${API_CONFIG.ANTHROPIC.endpoints.messages}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: API_CONFIG.ANTHROPIC.model,
        max_tokens: API_CONFIG.ANTHROPIC.maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AIAnalyzer] Claude API error: ${response.status}`, errorText);
      return null;
    }

    const data = await response.json();
    
    // Claude 응답에서 JSON 추출
    const assistantMessage = data.content?.[0]?.text || '';
    
    // JSON 파싱 시도
    try {
      // JSON 블록 찾기 (```json ... ``` 형식 처리)
      let jsonStr = assistantMessage;
      const jsonMatch = assistantMessage.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // 순수 JSON 객체 찾기
        const objMatch = assistantMessage.match(/\{[\s\S]*\}/);
        if (objMatch) {
          jsonStr = objMatch[0];
        }
      }

      const analysis = JSON.parse(jsonStr);
      
      // 유효성 검증
      if (typeof analysis.isThreat !== 'boolean') {
        analysis.isThreat = false;
      }
      if (!Object.keys(THREAT_CATEGORIES).includes(analysis.category)) {
        analysis.category = null;
      }
      if (typeof analysis.severity !== 'number' || analysis.severity < 0 || analysis.severity > 100) {
        analysis.severity = 0;
      }
      if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) {
        analysis.confidence = 0;
      }

      return analysis;

    } catch (parseError) {
      console.error('[AIAnalyzer] JSON parse error:', parseError.message);
      console.error('[AIAnalyzer] Raw response:', assistantMessage);
      return null;
    }

  } catch (error) {
    console.error('[AIAnalyzer] Claude analysis error:', error.message);
    return null;
  }
}

// =============================================================================
// 키워드 기반 분석 (AI API 비용 절감용)
// =============================================================================

function analyzeWithKeywords(text, title = '') {
  const combinedText = `${title} ${text}`.toLowerCase();
  const results = {};

  for (const [categoryId, category] of Object.entries(THREAT_CATEGORIES)) {
    const matches = [];
    let matchCount = 0;

    for (const keyword of category.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (combinedText.includes(keywordLower)) {
        matches.push(keyword);
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // 기본 점수 계산: 매칭된 키워드 수에 따라 점수 산정
      const baseScore = Math.min(100, matchCount * 15 + 20);
      
      results[categoryId] = {
        matches: matchCount,
        keywords: matches,
        baseScore: baseScore
      };
    }
  }

  return results;
}

// =============================================================================
// 통합 분석 함수
// =============================================================================

async function analyzeArticle(article) {
  const { title, content, source, sourceName, category: preCategory } = article;
  const textToAnalyze = `${title || ''} ${content || ''}`;

  if (!textToAnalyze.trim()) {
    return { isThreat: false, severity: 0, confidence: 0 };
  }

  // Step 1: 키워드 기반 1차 분석 (빠름, 무료)
  const keywordResults = analyzeWithKeywords(textToAnalyze, title);
  const hasRelevantKeywords = Object.keys(keywordResults).length > 0;

  // 관련 키워드가 없으면 위협이 아님
  if (!hasRelevantKeywords) {
    return { isThreat: false, severity: 0, confidence: 0 };
  }

  // Step 2: 키워드 분석 결과로 1차 결과 생성
  let topCategory = preCategory || null;
  let topScore = 0;

  for (const [cat, result] of Object.entries(keywordResults)) {
    if (result.baseScore > topScore) {
      topScore = result.baseScore;
      topCategory = cat;
    }
  }

  // Step 3: Claude AI 분석 시도 (있으면)
  const claudeAnalysis = await analyzeWithClaude(textToAnalyze, sourceName || source);

  if (claudeAnalysis) {
    // AI 분석 결과 사용
    return {
      isThreat: claudeAnalysis.isThreat,
      category: claudeAnalysis.category || topCategory,
      severity: claudeAnalysis.severity,
      confidence: claudeAnalysis.confidence,
      summary: claudeAnalysis.summary,
      keywords: claudeAnalysis.keywords,
      recommendation: claudeAnalysis.recommendation,
      analysisMethod: 'ai',
      keywordAnalysis: keywordResults
    };
  }

  // AI 분석 실패 시 키워드 분석 결과 사용
  const keywordInfo = topCategory ? keywordResults[topCategory] : null;
  
  return {
    isThreat: topScore >= 30,
    category: topCategory,
    severity: topScore,
    confidence: Math.min(0.8, topScore / 100),
    summary: `키워드 분석을 통해 ${THREAT_CATEGORIES[topCategory]?.name || '미분류'} 관련 위협이 탐지되었습니다.`,
    keywords: keywordInfo?.keywords || [],
    recommendation: '추가 모니터링 및 상세 분석이 필요합니다.',
    analysisMethod: 'keyword',
    keywordAnalysis: keywordResults
  };
}

// =============================================================================
// 배치 분석 (여러 항목 동시 분석)
// =============================================================================

async function analyzeMultiple(articles, options = {}) {
  const { concurrency = 3 } = options;
  const results = [];

  // 동시 실행 수 제한하며 분석
  for (let i = 0; i < articles.length; i += concurrency) {
    const batch = articles.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(article => analyzeArticle(article))
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push({
          ...batch[idx],
          analysis: result.value
        });
      } else {
        console.error(`[AIAnalyzer] Batch analysis error:`, result.reason);
        results.push({
          ...batch[idx],
          analysis: { isThreat: false, severity: 0, confidence: 0, error: result.reason.message }
        });
      }
    });

    // Rate limiting
    if (i + concurrency < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// =============================================================================
// Export
// =============================================================================

module.exports = {
  analyzeWithClaude,
  analyzeWithKeywords,
  analyzeArticle,
  analyzeMultiple
};

