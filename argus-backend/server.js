/**
 * ARGUS SKY - Airport Threat Intelligence Platform
 * Main Server Entry Point
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const apiRoutes = require('./src/routes/api');
const cctvRoutes = require('./src/routes/cctv');
const { collectAllData } = require('./src/services/dataCollector');
const { analyzeArticle, analyzeArticles } = require('./src/services/enhancedAIAnalyzer');
const { calculateThreatScore, calculateTotalIndex, getThreatLevel } = require('./src/services/scoreCalculator');
const { THREAT_CATEGORIES } = require('./src/config/constants');
const { cctvSimulator } = require('./src/services/cctvSimulator');

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// Middleware
// =============================================================================

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:8888', 'http://127.0.0.1:3000', 'http://127.0.0.1:8888'],
  credentials: true
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// In-Memory Data Store (global for CCTV simulator access)
// =============================================================================

global.threatData = {
  totalIndex: 0,
  threatLevel: null,
  categories: {},
  threats: [],
  lastUpdated: null,
  change24h: 0,
  history: [],
  alerts: [] // SSE client connections for CCTV alerts
};

// Local reference
let threatData = global.threatData;

// Initialize categories
Object.keys(THREAT_CATEGORIES).forEach(categoryId => {
  threatData.categories[categoryId] = {
    id: categoryId,
    name: THREAT_CATEGORIES[categoryId].name,
    score: 0,
    count: 0,
    trend: 'stable'
  };
});

// SSE clients for real-time alerts
let sseClients = [];

// =============================================================================
// Analysis Pipeline
// =============================================================================

async function runAnalysisPipeline() {
  console.log('\n========================================');
  console.log('[ARGUS] Starting analysis pipeline...');
  console.log(`[ARGUS] Time: ${new Date().toISOString()}`);
  console.log('========================================\n');

  try {
    // Step 1: Collect data from all sources
    console.log('[Step 1/4] Collecting data from sources...');
    const collectedData = await collectAllData();
    console.log(`[Step 1/4] Collected ${collectedData.length} items`);

    // Step 2: Analyze each data item with AI
    // Limit to first 20 items for faster processing (can be increased later)
    const MAX_ITEMS_TO_ANALYZE = 20;
    const itemsToAnalyze = collectedData.slice(0, MAX_ITEMS_TO_ANALYZE);
    console.log(`[Step 2/4] Analyzing ${itemsToAnalyze.length} items with AI (max: ${MAX_ITEMS_TO_ANALYZE})...`);
    
    const analyzedThreats = [];
    let processedCount = 0;
    
    for (const item of itemsToAnalyze) {
      try {
        processedCount++;
        if (processedCount % 5 === 0 || processedCount === 1) {
          console.log(`[Step 2/4] Processing ${processedCount}/${itemsToAnalyze.length}: ${item.title?.substring(0, 40)}...`);
        }
        
        const analysis = await analyzeArticle(item);
        if (analysis && analysis.isThreat) {
          analyzedThreats.push({
            id: require('uuid').v4(),
            ...item,
            ...analysis,
            timestamp: new Date().toISOString(),
            status: 'active'
          });
          console.log(`[Step 2/4] ✓ Threat detected: ${item.title?.substring(0, 30)}... (${analysis.category}, ${analysis.severity})`);
        }
      } catch (error) {
        console.error(`[Analysis Error] ${error.message}`);
      }
    }
    console.log(`[Step 2/4] Completed! Identified ${analyzedThreats.length} threats from ${itemsToAnalyze.length} items`);

    // Step 3: Calculate scores
    console.log('[Step 3/4] Calculating threat scores...');
    const categoryScores = {};
    
    Object.keys(THREAT_CATEGORIES).forEach(cat => {
      categoryScores[cat] = { totalScore: 0, count: 0 };
    });

    for (const threat of analyzedThreats) {
      const score = calculateThreatScore(threat);
      threat.calculatedScore = score;
      
      if (threat.category && categoryScores[threat.category]) {
        categoryScores[threat.category].totalScore += score;
        categoryScores[threat.category].count += 1;
      }
    }

    // Update category data
    Object.keys(categoryScores).forEach(cat => {
      const { totalScore, count } = categoryScores[cat];
      const avgScore = count > 0 ? totalScore / count : 0;
      
      const oldScore = threatData.categories[cat].score;
      threatData.categories[cat].score = Math.round(avgScore);
      threatData.categories[cat].count = count;
      threatData.categories[cat].trend = avgScore > oldScore ? 'up' : avgScore < oldScore ? 'down' : 'stable';
    });

    // Step 4: Calculate total index
    console.log('[Step 4/4] Calculating total threat index...');
    const totalIndex = calculateTotalIndex(threatData.categories);
    const previousIndex = threatData.totalIndex;
    
    threatData.totalIndex = totalIndex;
    threatData.threatLevel = getThreatLevel(totalIndex);
    threatData.change24h = totalIndex - previousIndex;
    threatData.lastUpdated = new Date().toISOString();
    
    // Add new threats (keep last 100)
    threatData.threats = [...analyzedThreats, ...threatData.threats].slice(0, 100);
    
    // Add to history (keep last 720 entries = 30 days hourly)
    threatData.history.push({
      timestamp: new Date().toISOString(),
      totalIndex,
      categories: { ...threatData.categories }
    });
    if (threatData.history.length > 720) {
      threatData.history = threatData.history.slice(-720);
    }

    // Broadcast to SSE clients
    broadcastUpdate({
      type: 'update',
      data: {
        totalIndex: threatData.totalIndex,
        threatLevel: threatData.threatLevel,
        categories: threatData.categories,
        newThreats: analyzedThreats.length
      }
    });

    console.log('\n========================================');
    console.log('[ARGUS] Analysis complete!');
    console.log(`[ARGUS] Total Index: ${totalIndex}`);
    console.log(`[ARGUS] Threat Level: ${threatData.threatLevel?.label || 'N/A'}`);
    console.log(`[ARGUS] Active Threats: ${threatData.threats.length}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('[ARGUS] Pipeline error:', error);
  }
}

// Broadcast to all SSE clients
function broadcastUpdate(data) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// =============================================================================
// Routes
// =============================================================================

// API routes
app.use('/api', apiRoutes(threatData, sseClients));

// CCTV routes
app.use('/api/cctv', cctvRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Manual analysis trigger
app.post('/api/analyze', async (req, res) => {
  try {
    console.log('[API] Manual analysis triggered');
    await runAnalysisPipeline();
    res.json({
      success: true,
      message: 'Analysis pipeline completed',
      data: {
        totalIndex: threatData.totalIndex,
        threatLevel: threatData.threatLevel,
        threatsCount: threatData.threats.length,
        lastUpdated: threatData.lastUpdated,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Real-time analysis with SSE streaming
app.get('/api/analyze/stream', async (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    console.log('[API] Real-time analysis streaming started');
    sendEvent('start', { message: '분석 시작', timestamp: new Date().toISOString() });

    // Step 1: Collect data
    sendEvent('step', { step: 1, name: '데이터 수집', status: 'running' });
    const collectedData = await collectAllData();
    sendEvent('step', { step: 1, name: '데이터 수집', status: 'complete', count: collectedData.length });

    // Step 2: Analyze with AI
    sendEvent('step', { step: 2, name: 'AI 분석', status: 'running' });
    const MAX_ITEMS = 20;
    const itemsToAnalyze = collectedData.slice(0, MAX_ITEMS);
    const analyzedThreats = [];
    
    for (let i = 0; i < itemsToAnalyze.length; i++) {
      const item = itemsToAnalyze[i];
      try {
        const analysis = await analyzeArticle(item);
        if (analysis && analysis.isThreat) {
          const threat = {
            id: require('uuid').v4(),
            ...item,
            ...analysis,
            timestamp: new Date().toISOString(),
            status: 'active'
          };
          analyzedThreats.push(threat);
          sendEvent('threat', { 
            index: i + 1, 
            total: itemsToAnalyze.length,
            title: item.title?.substring(0, 50),
            category: analysis.category,
            severity: analysis.severity,
            isThreat: true
          });
        } else {
          sendEvent('progress', { 
            index: i + 1, 
            total: itemsToAnalyze.length,
            title: item.title?.substring(0, 50),
            isThreat: false
          });
        }
      } catch (error) {
        sendEvent('error', { index: i + 1, message: error.message });
      }
    }
    sendEvent('step', { step: 2, name: 'AI 분석', status: 'complete', threats: analyzedThreats.length });

    // Step 3: Calculate scores
    sendEvent('step', { step: 3, name: '점수 계산', status: 'running' });
    const categoryScores = {};
    Object.keys(THREAT_CATEGORIES).forEach(cat => {
      categoryScores[cat] = { totalScore: 0, count: 0 };
    });

    for (const threat of analyzedThreats) {
      const score = calculateThreatScore(threat);
      threat.calculatedScore = score;
      if (threat.category && categoryScores[threat.category]) {
        categoryScores[threat.category].totalScore += score;
        categoryScores[threat.category].count += 1;
      }
    }

    Object.keys(categoryScores).forEach(cat => {
      const { totalScore, count } = categoryScores[cat];
      const avgScore = count > 0 ? totalScore / count : 0;
      const oldScore = threatData.categories[cat].score;
      threatData.categories[cat].score = Math.round(avgScore);
      threatData.categories[cat].count = count;
      threatData.categories[cat].trend = avgScore > oldScore ? 'up' : avgScore < oldScore ? 'down' : 'stable';
    });
    sendEvent('step', { step: 3, name: '점수 계산', status: 'complete' });

    // Step 4: Calculate total index
    sendEvent('step', { step: 4, name: '위협 지수 산출', status: 'running' });
    const totalIndex = calculateTotalIndex(threatData.categories);
    const previousIndex = threatData.totalIndex;
    
    threatData.totalIndex = totalIndex;
    threatData.threatLevel = getThreatLevel(totalIndex);
    threatData.change24h = totalIndex - previousIndex;
    threatData.lastUpdated = new Date().toISOString();
    threatData.threats = [...analyzedThreats, ...threatData.threats].slice(0, 100);
    
    threatData.history.push({
      timestamp: new Date().toISOString(),
      totalIndex,
      categories: { ...threatData.categories }
    });
    if (threatData.history.length > 720) {
      threatData.history = threatData.history.slice(-720);
    }

    sendEvent('step', { step: 4, name: '위협 지수 산출', status: 'complete' });

    // Final result
    sendEvent('complete', {
      totalIndex,
      threatLevel: threatData.threatLevel,
      categories: threatData.categories,
      newThreats: analyzedThreats.length,
      totalThreats: threatData.threats.length,
      lastUpdated: threatData.lastUpdated
    });

    // Broadcast to other clients
    broadcastUpdate({
      type: 'update',
      data: {
        totalIndex: threatData.totalIndex,
        threatLevel: threatData.threatLevel,
        categories: threatData.categories,
        newThreats: analyzedThreats.length
      }
    });

    console.log('[API] Real-time analysis streaming completed');
    res.end();

  } catch (error) {
    sendEvent('error', { message: error.message });
    res.end();
  }
});

// Data sources status
app.get('/api/sources/status', (req, res) => {
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const aiConfigured = hasOpenRouter || hasAnthropic;
  
  res.json({
    success: true,
    data: {
      apis: {
        openRouter: { 
          configured: hasOpenRouter, 
          name: 'OpenRouter AI', 
          type: 'AI 분석',
          model: hasOpenRouter ? (process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet') : null
        },
        anthropic: { configured: hasAnthropic, name: 'Claude AI (Direct)', type: 'AI 분석' },
        newsApi: { configured: !!process.env.NEWS_API_KEY, name: 'NewsAPI', type: '국제 뉴스' },
        abuseIpDb: { configured: !!process.env.ABUSEIPDB_API_KEY, name: 'AbuseIPDB', type: '사이버 위협' },
        naverNews: { configured: !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET), name: '네이버 뉴스', type: '한국 뉴스' },
        kakaoNews: { configured: !!process.env.KAKAO_REST_API_KEY, name: '다음 뉴스', type: '한국 뉴스' },
        publicData: { configured: !!process.env.PUBLIC_DATA_API_KEY, name: '공공데이터포털', type: '정부 데이터' },
      },
      freeServices: {
        gdelt: { available: true, name: 'GDELT', type: '글로벌 이벤트' },
        rssFeeds: { available: true, name: 'RSS 피드', type: '한국 뉴스 (연합뉴스 등)' },
      },
      aiStatus: {
        configured: aiConfigured,
        provider: hasOpenRouter ? 'OpenRouter' : (hasAnthropic ? 'Anthropic' : 'Keyword-based'),
        model: hasOpenRouter ? (process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet') : (hasAnthropic ? 'claude-sonnet-4' : 'rule_engine_v1'),
      },
      lastAnalysis: threatData.lastUpdated,
      totalThreats: threatData.threats.length,
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ARGUS SKY API',
    version: '1.0.0',
    description: 'Airport Threat Intelligence Platform',
    endpoints: {
      dashboard: '/api/dashboard',
      threats: '/api/threats',
      analytics: '/api/analytics',
      trend: '/api/trend',
      evidence: '/api/evidence',
      alerts: '/api/alerts/stream',
      cctv: {
        status: '/api/cctv/status',
        start: '/api/cctv/start',
        stop: '/api/cctv/stop',
        trigger: '/api/cctv/trigger',
        cameras: '/api/cctv/cameras',
        eventTypes: '/api/cctv/event-types',
        events: '/api/cctv/events',
        statistics: '/api/cctv/statistics',
        demo: '/api/cctv/demo/:scenario'
      }
    }
  });
});

// =============================================================================
// Scheduled Tasks
// =============================================================================

// Run analysis every hour
cron.schedule('0 * * * *', () => {
  console.log('[Cron] Running scheduled analysis...');
  runAnalysisPipeline();
});

// =============================================================================
// Server Startup
// =============================================================================

app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🛡️  ARGUS SKY Server Started');
  console.log('========================================');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('========================================\n');
  
  // Run initial analysis
  console.log('[Startup] Running initial analysis pipeline...');
  runAnalysisPipeline();
  
  // Start CCTV simulator (30초 간격, 40% 확률)
  console.log('[Startup] Starting CCTV simulator...');
  cctvSimulator.start(30000, 0.4);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Received SIGTERM, shutting down gracefully...');
  cctvSimulator.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] Received SIGINT, shutting down gracefully...');
  cctvSimulator.stop();
  process.exit(0);
});

module.exports = { app, threatData };

