/**
 * ARGUS SKY - Score Calculator Service
 * 위협 점수 계산 및 레벨 판정
 */

const { THREAT_CATEGORIES, THREAT_LEVELS, SOURCE_CREDIBILITY, TEMPORAL_DECAY } = require('../config/constants');

// =============================================================================
// 출처 신뢰도 계산
// =============================================================================

function getSourceCredibility(source) {
  if (!source) return SOURCE_CREDIBILITY.unknown;

  const sourceLower = source.toLowerCase();

  // 정확한 매칭 시도
  for (const [key, value] of Object.entries(SOURCE_CREDIBILITY)) {
    if (sourceLower.includes(key.toLowerCase())) {
      return value;
    }
  }

  // 일반적인 출처 유형 판단
  if (sourceLower.includes('government') || sourceLower.includes('official') || sourceLower.includes('정부')) {
    return SOURCE_CREDIBILITY.government;
  }
  if (sourceLower.includes('reuters') || sourceLower.includes('ap ') || sourceLower.includes('연합')) {
    return 0.9;
  }
  if (sourceLower.includes('news') || sourceLower.includes('뉴스')) {
    return SOURCE_CREDIBILITY.news;
  }
  if (sourceLower.includes('twitter') || sourceLower.includes('facebook') || sourceLower.includes('소셜')) {
    return SOURCE_CREDIBILITY.twitter;
  }

  return SOURCE_CREDIBILITY.unknown;
}

// =============================================================================
// 시간 감쇠 계수 계산
// =============================================================================

function calculateTemporalFactor(timestamp) {
  if (!timestamp) return TEMPORAL_DECAY.older;

  const now = new Date();
  const eventTime = new Date(timestamp);
  const hoursDiff = (now - eventTime) / (1000 * 60 * 60);

  if (hoursDiff <= 1) return TEMPORAL_DECAY['1h'];
  if (hoursDiff <= 6) return TEMPORAL_DECAY['6h'];
  if (hoursDiff <= 12) return TEMPORAL_DECAY['12h'];
  if (hoursDiff <= 24) return TEMPORAL_DECAY['24h'];
  if (hoursDiff <= 48) return TEMPORAL_DECAY['48h'];
  if (hoursDiff <= 72) return TEMPORAL_DECAY['72h'];
  
  return TEMPORAL_DECAY.older;
}

// =============================================================================
// 개별 위협 점수 계산
// =============================================================================

function calculateThreatScore(threat) {
  const {
    severity = 0,
    category = null,
    sourceName = null,
    source = null,
    timestamp = null,
    publishedAt = null,
    confidence = 0.5
  } = threat;

  // 기본 점수
  let baseScore = severity;

  // 카테고리 가중치
  const categoryWeight = category && THREAT_CATEGORIES[category] 
    ? THREAT_CATEGORIES[category].weight 
    : 0.15;

  // 출처 신뢰도
  const sourceCredibility = getSourceCredibility(sourceName || source);

  // 시간 감쇠 계수
  const temporalFactor = calculateTemporalFactor(timestamp || publishedAt);

  // 신뢰도 가중치
  const confidenceFactor = Math.max(0.5, confidence);

  // 최종 점수 계산
  // 공식: min(100, max(0, severity × category_weight × source_credibility × temporal_factor × confidence × 2))
  const calculatedScore = baseScore * categoryWeight * sourceCredibility * temporalFactor * confidenceFactor * 2;
  
  return Math.min(100, Math.max(0, Math.round(calculatedScore)));
}

// =============================================================================
// 통합 위협 지수 계산
// =============================================================================

function calculateTotalIndex(categoryData) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [categoryId, data] of Object.entries(categoryData)) {
    const weight = THREAT_CATEGORIES[categoryId]?.weight || 0.15;
    const score = data.score || 0;

    weightedSum += score * weight;
    totalWeight += weight;
  }

  // 가중 평균에 스케일링 팩터 적용
  // 공식: min(100, max(0, Σ(category_index × category_weight) × 1.5))
  const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const scaledScore = avgScore * 1.5;

  return Math.min(100, Math.max(0, Math.round(scaledScore)));
}

// =============================================================================
// 위협 레벨 판정
// =============================================================================

function getThreatLevel(score) {
  for (const [levelId, level] of Object.entries(THREAT_LEVELS)) {
    if (score >= level.min && score <= level.max) {
      return level;
    }
  }
  return THREAT_LEVELS.LOW;
}

// =============================================================================
// 카테고리별 통계 계산
// =============================================================================

function calculateCategoryStats(threats, categoryId) {
  const categoryThreats = threats.filter(t => t.category === categoryId);
  
  if (categoryThreats.length === 0) {
    return {
      count: 0,
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      trend: 'stable'
    };
  }

  const scores = categoryThreats.map(t => t.calculatedScore || calculateThreatScore(t));
  const sum = scores.reduce((a, b) => a + b, 0);

  return {
    count: categoryThreats.length,
    avgScore: Math.round(sum / scores.length),
    maxScore: Math.max(...scores),
    minScore: Math.min(...scores),
    trend: 'stable' // 실제로는 이전 데이터와 비교해야 함
  };
}

// =============================================================================
// 트렌드 분석
// =============================================================================

function analyzeTrend(history, periods = 24) {
  if (!history || history.length < 2) {
    return { direction: 'stable', change: 0 };
  }

  const recent = history.slice(-periods);
  
  if (recent.length < 2) {
    return { direction: 'stable', change: 0 };
  }

  const firstValue = recent[0].totalIndex;
  const lastValue = recent[recent.length - 1].totalIndex;
  const change = lastValue - firstValue;
  const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

  let direction = 'stable';
  if (change > 5) direction = 'up';
  else if (change < -5) direction = 'down';

  return {
    direction,
    change: Math.round(change * 10) / 10,
    changePercent: Math.round(changePercent * 10) / 10
  };
}

// =============================================================================
// 점수 정규화
// =============================================================================

function normalizeScore(score, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(score)));
}

// =============================================================================
// Export
// =============================================================================

module.exports = {
  getSourceCredibility,
  calculateTemporalFactor,
  calculateThreatScore,
  calculateTotalIndex,
  getThreatLevel,
  calculateCategoryStats,
  analyzeTrend,
  normalizeScore
};

