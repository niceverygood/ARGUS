/**
 * CCTV 시뮬레이터 API 라우트
 */

const express = require('express');
const { cctvSimulator } = require('../services/cctvSimulator');

const router = express.Router();

/**
 * GET /cctv/status
 * CCTV 시뮬레이터 상태 조회
 */
router.get('/status', (req, res) => {
  try {
    const status = cctvSimulator.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /cctv/start
 * CCTV 시뮬레이션 시작
 */
router.post('/start', (req, res) => {
  try {
    const { interval = 30000, probability = 0.4 } = req.body;
    
    if (cctvSimulator.isRunning) {
      return res.json({
        success: true,
        message: 'CCTV Simulator is already running',
        data: cctvSimulator.getStatus(),
      });
    }
    
    cctvSimulator.start(interval, probability);
    
    res.json({
      success: true,
      message: 'CCTV Simulator started',
      data: {
        interval,
        probability,
        status: cctvSimulator.getStatus(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /cctv/stop
 * CCTV 시뮬레이션 중지
 */
router.post('/stop', (req, res) => {
  try {
    cctvSimulator.stop();
    
    res.json({
      success: true,
      message: 'CCTV Simulator stopped',
      data: cctvSimulator.getStatus(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /cctv/trigger
 * 특정 이벤트 강제 발생 (데모용)
 */
router.post('/trigger', (req, res) => {
  try {
    const { eventType } = req.body;
    
    const event = cctvSimulator.triggerEvent(eventType);
    
    if (!event) {
      return res.status(400).json({
        success: false,
        error: `Unknown event type: ${eventType}`,
        availableTypes: cctvSimulator.getEventTypes().map(e => e.id),
      });
    }
    
    res.json({
      success: true,
      message: `CCTV event triggered: ${event.title}`,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /cctv/cameras
 * 카메라 목록 조회
 */
router.get('/cameras', (req, res) => {
  try {
    const cameras = cctvSimulator.getCameras();
    
    res.json({
      success: true,
      data: {
        total: Object.keys(cameras).length,
        cameras: Object.entries(cameras).map(([id, info]) => ({
          id,
          ...info,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /cctv/event-types
 * 이벤트 타입 목록 조회
 */
router.get('/event-types', (req, res) => {
  try {
    const eventTypes = cctvSimulator.getEventTypes();
    
    res.json({
      success: true,
      data: {
        total: eventTypes.length,
        eventTypes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /cctv/events
 * 최근 CCTV 이벤트 목록 조회
 */
router.get('/events', (req, res) => {
  try {
    const { limit = 50, category, zone } = req.query;
    let events = cctvSimulator.eventHistory.slice(-parseInt(limit)).reverse();
    
    // 필터링
    if (category) {
      events = events.filter(e => e.category === category);
    }
    if (zone) {
      events = events.filter(e => e.metadata?.zone === zone);
    }
    
    res.json({
      success: true,
      data: {
        total: events.length,
        events,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /cctv/statistics
 * CCTV 통계
 */
router.get('/statistics', (req, res) => {
  try {
    const stats = cctvSimulator.getStatistics();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /cctv/demo/:scenario
 * 데모 시나리오 실행
 */
router.post('/demo/:scenario', (req, res) => {
  try {
    const { scenario } = req.params;
    
    const scenarios = {
      // 무기 탐지 시나리오
      weapon: ['weapon_detected'],
      
      // 드론 침입 시나리오
      drone: ['drone_detected', 'uav_tracking'],
      
      // 테러 위협 시나리오
      terror: ['weapon_detected', 'abandoned_bag', 'crowd_anomaly'],
      
      // 밀수 시나리오
      smuggling: ['perimeter_breach', 'suspicious_vehicle', 'smuggling_attempt'],
      
      // 내부자 위협 시나리오
      insider: ['unauthorized_access', 'tailgating', 'loitering'],
      
      // 복합 위기 상황
      crisis: [
        'weapon_detected',
        'crowd_anomaly',
        'drone_detected',
        'perimeter_breach',
      ],
    };
    
    if (!scenarios[scenario]) {
      return res.status(400).json({
        success: false,
        error: `Unknown scenario: ${scenario}`,
        availableScenarios: Object.keys(scenarios),
      });
    }
    
    const events = [];
    scenarios[scenario].forEach((eventType, index) => {
      setTimeout(() => {
        const event = cctvSimulator.triggerEvent(eventType);
        if (event) events.push(event);
      }, index * 2000); // 2초 간격으로 이벤트 발생
    });
    
    res.json({
      success: true,
      message: `Demo scenario '${scenario}' started`,
      data: {
        scenario,
        eventCount: scenarios[scenario].length,
        events: scenarios[scenario],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

