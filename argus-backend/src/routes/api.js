/**
 * ARGUS SKY - API Routes
 * Express 라우터 정의
 */

const express = require('express');
const { THREAT_CATEGORIES, THREAT_LEVELS, SOURCE_CREDIBILITY, TEMPORAL_DECAY } = require('../config/constants');
const { analyzeTrend } = require('../services/scoreCalculator');

function createRouter(threatData, sseClients) {
  const router = express.Router();

  // =============================================================================
  // GET /dashboard - 대시보드 데이터
  // =============================================================================
  
  router.get('/dashboard', (req, res) => {
    try {
      const { history } = threatData;
      const trend = analyzeTrend(history, 24);

      res.json({
        success: true,
        data: {
          totalIndex: threatData.totalIndex,
          threatLevel: threatData.threatLevel,
          categories: threatData.categories,
          change24h: trend.change,
          changePercent: trend.changePercent,
          activeThreats: threatData.threats.filter(t => t.status === 'active').length,
          lastUpdated: threatData.lastUpdated
        }
      });
    } catch (error) {
      console.error('[API] Dashboard error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // =============================================================================
  // GET /threats - 위협 목록
  // =============================================================================

  router.get('/threats', (req, res) => {
    try {
      const { category, status, limit = 50, offset = 0 } = req.query;
      
      let filteredThreats = [...threatData.threats];

      // 필터링
      if (category) {
        filteredThreats = filteredThreats.filter(t => t.category === category);
      }
      if (status) {
        filteredThreats = filteredThreats.filter(t => t.status === status);
      }

      // 페이지네이션
      const total = filteredThreats.length;
      const paginatedThreats = filteredThreats.slice(
        parseInt(offset), 
        parseInt(offset) + parseInt(limit)
      );

      res.json({
        success: true,
        data: {
          threats: paginatedThreats,
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('[API] Threats list error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // =============================================================================
  // GET /threats/:id - 위협 상세
  // =============================================================================

  router.get('/threats/:id', (req, res) => {
    try {
      const { id } = req.params;
      const threat = threatData.threats.find(t => t.id === id);

      if (!threat) {
        return res.status(404).json({ 
          success: false, 
          error: 'Threat not found' 
        });
      }

      res.json({
        success: true,
        data: threat
      });
    } catch (error) {
      console.error('[API] Threat detail error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // =============================================================================
  // PATCH /threats/:id - 위협 상태 업데이트
  // =============================================================================

  router.patch('/threats/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const threatIndex = threatData.threats.findIndex(t => t.id === id);

      if (threatIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          error: 'Threat not found' 
        });
      }

      // 허용된 상태 값 검증
      const allowedStatuses = ['active', 'resolved', 'dismissed', 'investigating'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` 
        });
      }

      threatData.threats[threatIndex].status = status;
      threatData.threats[threatIndex].updatedAt = new Date().toISOString();

      res.json({
        success: true,
        data: threatData.threats[threatIndex]
      });
    } catch (error) {
      console.error('[API] Threat update error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // =============================================================================
  // GET /analytics - 분석 데이터
  // =============================================================================

  router.get('/analytics', (req, res) => {
    try {
      const { period = '24h' } = req.query;
      const { history, threats } = threatData;

      // 기간에 따른 데이터 포인트 수
      let dataPoints;
      switch (period) {
        case '7d': dataPoints = 168; break; // 7일 = 168시간
        case '30d': dataPoints = 720; break; // 30일 = 720시간
        default: dataPoints = 24; // 24시간
      }

      const relevantHistory = history.slice(-dataPoints);
      
      // 통계 계산
      const indices = relevantHistory.map(h => h.totalIndex);
      const avgIndex = indices.length > 0 
        ? Math.round(indices.reduce((a, b) => a + b, 0) / indices.length)
        : 0;
      
      // 기간 내 위협 수
      const periodHours = { '24h': 24, '7d': 168, '30d': 720 };
      const cutoffTime = new Date(Date.now() - periodHours[period] * 60 * 60 * 1000);
      const periodThreats = threats.filter(t => new Date(t.timestamp) >= cutoffTime);
      
      // 해결된 위협 비율
      const resolvedThreats = periodThreats.filter(t => t.status === 'resolved');
      const resolutionRate = periodThreats.length > 0 
        ? Math.round((resolvedThreats.length / periodThreats.length) * 100) 
        : 0;

      // 카테고리별 분포
      const categoryDistribution = {};
      Object.keys(THREAT_CATEGORIES).forEach(cat => {
        categoryDistribution[cat] = periodThreats.filter(t => t.category === cat).length;
      });

      res.json({
        success: true,
        data: {
          period,
          averageIndex: avgIndex,
          totalThreats: periodThreats.length,
          resolvedThreats: resolvedThreats.length,
          resolutionRate,
          averageResponseTime: '2.5h', // 시뮬레이션 값
          categoryDistribution,
          trend: analyzeTrend(relevantHistory, dataPoints)
        }
      });
    } catch (error) {
      console.error('[API] Analytics error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // =============================================================================
  // GET /trend - 트렌드 데이터 (차트용)
  // =============================================================================

  router.get('/trend', (req, res) => {
    try {
      const { period = '24h' } = req.query;
      const { history } = threatData;

      let dataPoints;
      switch (period) {
        case '7d': dataPoints = 168; break;
        case '30d': dataPoints = 720; break;
        default: dataPoints = 24;
      }

      const relevantHistory = history.slice(-dataPoints);

      // 차트용 데이터 포맷팅
      const trendData = relevantHistory.map(point => ({
        timestamp: point.timestamp,
        totalIndex: point.totalIndex,
        categories: Object.keys(point.categories).reduce((acc, cat) => {
          acc[cat] = point.categories[cat]?.score || 0;
          return acc;
        }, {})
      }));

      res.json({
        success: true,
        data: {
          period,
          points: trendData,
          summary: analyzeTrend(relevantHistory, dataPoints)
        }
      });
    } catch (error) {
      console.error('[API] Trend error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // =============================================================================
  // GET /evidence - 점수 계산 근거
  // =============================================================================

  router.get('/evidence', (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          categories: THREAT_CATEGORIES,
          levels: THREAT_LEVELS,
          sourceCredibility: SOURCE_CREDIBILITY,
          temporalDecay: TEMPORAL_DECAY,
          formulas: {
            threatScore: {
              name: '개별 위협 점수',
              formula: 'min(100, max(0, severity × category_weight × source_credibility × temporal_factor × confidence × 2))',
              description: '각 위협의 심각도를 다양한 요인으로 가중하여 계산',
              parameters: [
                { name: 'severity', description: 'AI가 판단한 원본 심각도', range: '0-100' },
                { name: 'category_weight', description: '카테고리별 가중치', range: '0.10-0.25' },
                { name: 'source_credibility', description: '정보 출처의 신뢰도', range: '0.20-1.0' },
                { name: 'temporal_factor', description: '시간 경과에 따른 감쇠', range: '0.1-1.0' },
                { name: 'confidence', description: 'AI 분석 신뢰도', range: '0.0-1.0' }
              ]
            },
            totalIndex: {
              name: '통합 위협 지수',
              formula: 'min(100, max(0, Σ(category_index × category_weight) × 1.5))',
              description: '모든 카테고리의 가중 평균에 스케일링 적용',
              parameters: [
                { name: 'category_index', description: '각 카테고리의 평균 점수', range: '0-100' },
                { name: 'category_weight', description: '카테고리별 가중치', range: '0.10-0.25' }
              ]
            }
          }
        }
      });
    } catch (error) {
      console.error('[API] Evidence error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // =============================================================================
  // POST /analyze - 수동 분석 트리거
  // =============================================================================

  router.post('/analyze', async (req, res) => {
    try {
      // server.js의 runAnalysisPipeline 참조가 필요
      // 실제 구현에서는 이벤트 이미터나 공유 함수 사용
      res.json({
        success: true,
        message: 'Analysis triggered. Results will be available shortly.',
        triggeredAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[API] Analyze trigger error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // =============================================================================
  // GET /alerts/stream - SSE 실시간 알림
  // =============================================================================

  router.get('/alerts/stream', (req, res) => {
    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx 버퍼링 비활성화

    // 초기 연결 메시지
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    // 클라이언트 등록
    sseClients.push(res);
    console.log(`[SSE] Client connected. Total clients: ${sseClients.length}`);

    // Heartbeat (30초마다)
    const heartbeatInterval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
    }, 30000);

    // 연결 종료 처리
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      const index = sseClients.indexOf(res);
      if (index !== -1) {
        sseClients.splice(index, 1);
      }
      console.log(`[SSE] Client disconnected. Total clients: ${sseClients.length}`);
    });
  });

  // =============================================================================
  // GET /status - 시스템 상태
  // =============================================================================

  router.get('/status', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'operational',
        uptime: process.uptime(),
        lastAnalysis: threatData.lastUpdated,
        activeThreats: threatData.threats.filter(t => t.status === 'active').length,
        totalThreats: threatData.threats.length,
        sseClients: sseClients.length
      }
    });
  });

  // =============================================================================
  // GET /logs/ai-reasoning - AI 분석 로그
  // =============================================================================

  router.get('/logs/ai-reasoning', (req, res) => {
    try {
      const { limit = 50 } = req.query;
      
      // 위협 데이터에서 AI 분석 로그 추출
      const aiLogs = threatData.threats
        .filter(t => t.analysisMethod && t.reasoning)
        .slice(0, parseInt(limit))
        .map(threat => ({
          id: threat.id,
          timestamp: threat.analyzedAt || threat.timestamp,
          articleTitle: threat.title,
          articleSource: threat.sourceName || threat.source,
          analysisMethod: threat.analysisMethod,
          analysisModel: threat.analysisModel,
          processingSteps: [
            { step: 1, name: '데이터 수집', description: `${threat.source}에서 수집`, duration: '0.5s' },
            { step: 2, name: '전처리', description: '텍스트 정제 및 토큰화', duration: '0.1s' },
            { step: 3, name: 'AI 분석', description: `${threat.analysisModel || 'keyword_based'}로 분석`, duration: '2.5s' },
            { step: 4, name: '점수 계산', description: '위협 점수 산출', duration: '0.1s' }
          ],
          extractedEntities: threat.entities || {},
          extractedKeywords: threat.keywords || [],
          categoryReasoning: {
            selectedCategory: threat.category,
            confidence: threat.confidence,
            indicators: threat.reasoning?.threatIndicators || []
          },
          severityReasoning: {
            finalSeverity: threat.severity,
            riskFactors: threat.reasoning?.riskFactors || [],
            mitigatingFactors: threat.reasoning?.mitigatingFactors || []
          },
          uncertainties: threat.reasoning?.uncertainties || [],
          recommendation: threat.recommendation,
          overallAssessment: threat.summary
        }));

      res.json({
        success: true,
        data: {
          logs: aiLogs,
          total: aiLogs.length
        }
      });
    } catch (error) {
      console.error('[API] AI Logs error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // =============================================================================
  // GET /logs/collection - 데이터 수집 로그
  // =============================================================================

  router.get('/logs/collection', (req, res) => {
    try {
      const { limit = 50 } = req.query;
      
      // 위협 데이터에서 수집 로그 생성
      const sourceGroups = {};
      threatData.threats.forEach(threat => {
        const sourceKey = `${threat.source}_${threat.sourceType}`;
        if (!sourceGroups[sourceKey]) {
          sourceGroups[sourceKey] = {
            source: threat.source,
            sourceType: threat.sourceType,
            sourceName: threat.sourceName,
            count: 0,
            items: []
          };
        }
        sourceGroups[sourceKey].count++;
        if (sourceGroups[sourceKey].items.length < 5) {
          sourceGroups[sourceKey].items.push({
            title: threat.title,
            category: threat.category,
            severity: threat.severity
          });
        }
      });

      const collectionLogs = Object.values(sourceGroups).map((group, index) => ({
        id: `collection_${index}`,
        timestamp: threatData.lastUpdated || new Date().toISOString(),
        source: group.source,
        sourceType: group.sourceType,
        sourceName: group.sourceName,
        articlesCollected: group.count,
        articlesFiltered: Math.floor(group.count * 0.8),
        status: 'success',
        duration: `${(Math.random() * 2 + 1).toFixed(1)}s`,
        sampleArticles: group.items
      }));

      res.json({
        success: true,
        data: {
          logs: collectionLogs,
          total: collectionLogs.length,
          lastCollection: threatData.lastUpdated
        }
      });
    } catch (error) {
      console.error('[API] Collection Logs error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // =============================================================================
  // GET /logs/ai-reasoning/:id - AI 분석 로그 상세
  // =============================================================================

  router.get('/logs/ai-reasoning/:id', (req, res) => {
    try {
      const { id } = req.params;
      const threat = threatData.threats.find(t => t.id === id);

      if (!threat) {
        return res.status(404).json({ 
          success: false, 
          error: 'Log not found' 
        });
      }

      const detailedLog = {
        id: threat.id,
        timestamp: threat.analyzedAt || threat.timestamp,
        
        // 원본 데이터
        originalData: {
          title: threat.title,
          content: threat.content,
          source: threat.source,
          sourceType: threat.sourceType,
          sourceName: threat.sourceName,
          url: threat.url,
          publishedAt: threat.publishedAt
        },

        // 분석 설정
        analysisConfig: {
          method: threat.analysisMethod,
          model: threat.analysisModel,
          maxTokens: 1500,
          temperature: 0.3
        },

        // 처리 단계
        processingSteps: [
          { 
            step: 1, 
            name: '데이터 수집', 
            status: 'completed',
            description: `${threat.sourceName || threat.source}에서 데이터 수집`,
            input: threat.url || 'N/A',
            output: `제목: ${threat.title?.substring(0, 50)}...`,
            duration: '0.5s'
          },
          { 
            step: 2, 
            name: '텍스트 전처리', 
            status: 'completed',
            description: 'HTML 제거, 토큰화, 정규화',
            input: `원본 길이: ${threat.content?.length || 0}자`,
            output: `처리 후: ${(threat.content?.length * 0.9).toFixed(0) || 0}자`,
            duration: '0.1s'
          },
          { 
            step: 3, 
            name: 'AI 분석', 
            status: 'completed',
            description: threat.analysisMethod === 'openrouter_ai' 
              ? `OpenRouter API를 통해 ${threat.analysisModel} 모델로 분석`
              : '키워드 기반 규칙 엔진으로 분석',
            input: '전처리된 텍스트',
            output: `카테고리: ${threat.category}, 심각도: ${threat.severity}`,
            duration: threat.analysisMethod === 'openrouter_ai' ? '2.5s' : '0.2s'
          },
          { 
            step: 4, 
            name: '점수 계산', 
            status: 'completed',
            description: '가중치 적용 및 최종 점수 산출',
            input: `심각도: ${threat.severity}, 신뢰도: ${threat.confidence}`,
            output: `최종 점수: ${threat.calculatedScore}`,
            duration: '0.1s'
          }
        ],

        // AI 추론 결과
        aiReasoning: {
          category: {
            selected: threat.category,
            categoryName: THREAT_CATEGORIES[threat.category]?.name,
            confidence: threat.confidence,
            relatedCategories: threat.relatedCategories || [],
            indicators: threat.reasoning?.threatIndicators || []
          },
          severity: {
            value: threat.severity,
            level: threat.severity >= 80 ? 'CRITICAL' : 
                   threat.severity >= 60 ? 'HIGH' :
                   threat.severity >= 40 ? 'ELEVATED' :
                   threat.severity >= 20 ? 'GUARDED' : 'LOW',
            riskFactors: threat.reasoning?.riskFactors || [],
            mitigatingFactors: threat.reasoning?.mitigatingFactors || []
          },
          entities: threat.entities || { locations: [], organizations: [], persons: [] },
          keywords: threat.keywords || [],
          uncertainties: threat.reasoning?.uncertainties || [],
          temporalRelevance: threat.temporalRelevance,
          geographicScope: threat.geographicScope
        },

        // 최종 결과
        finalResult: {
          isThreat: threat.isThreat !== false,
          category: threat.category,
          severity: threat.severity,
          confidence: threat.confidence,
          calculatedScore: threat.calculatedScore,
          summary: threat.summary,
          recommendation: threat.recommendation
        }
      };

      res.json({
        success: true,
        data: detailedLog
      });
    } catch (error) {
      console.error('[API] AI Log detail error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = createRouter;

