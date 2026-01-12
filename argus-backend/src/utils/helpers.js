/**
 * ARGUS SKY - Utility Functions
 * 공통 유틸리티 함수
 */

const { v4: uuidv4 } = require('uuid');

// =============================================================================
// UUID 생성
// =============================================================================

function generateId() {
  return uuidv4();
}

// =============================================================================
// 날짜/시간 유틸리티
// =============================================================================

function formatDate(date, format = 'iso') {
  const d = new Date(date);
  
  switch (format) {
    case 'iso':
      return d.toISOString();
    case 'date':
      return d.toISOString().split('T')[0];
    case 'time':
      return d.toISOString().split('T')[1].split('.')[0];
    case 'korean':
      return d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    default:
      return d.toISOString();
  }
}

function getHoursAgo(date) {
  const now = new Date();
  const then = new Date(date);
  return Math.floor((now - then) / (1000 * 60 * 60));
}

function isWithinHours(date, hours) {
  return getHoursAgo(date) <= hours;
}

// =============================================================================
// 텍스트 처리
// =============================================================================

function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // HTML 태그 제거
    .trim();
}

function extractKeywords(text, minLength = 2) {
  if (!text) return [];
  
  // 특수문자 제거, 소문자 변환
  const cleanText = text.toLowerCase().replace(/[^\w\s가-힣]/g, ' ');
  
  // 단어 추출
  const words = cleanText.split(/\s+/).filter(word => word.length >= minLength);
  
  // 중복 제거
  return [...new Set(words)];
}

// =============================================================================
// 배열 유틸리티
// =============================================================================

function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

function sortBy(array, key, order = 'asc') {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    
    if (order === 'desc') {
      return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
    }
    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
  });
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// =============================================================================
// 숫자 유틸리티
// =============================================================================

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value, decimals = 2) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function percentage(value, total) {
  if (total === 0) return 0;
  return roundTo((value / total) * 100, 1);
}

// =============================================================================
// 객체 유틸리티
// =============================================================================

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function pick(obj, keys) {
  return keys.reduce((result, key) => {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
    return result;
  }, {});
}

function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

// =============================================================================
// 에러 처리
// =============================================================================

function createError(message, code = 'ERROR', statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function handleAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// =============================================================================
// 로깅
// =============================================================================

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

const logger = {
  info: (message, data) => log('info', message, data),
  warn: (message, data) => log('warn', message, data),
  error: (message, data) => log('error', message, data),
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      log('debug', message, data);
    }
  }
};

// =============================================================================
// 지연 및 재시도
// =============================================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry(fn, maxRetries = 3, delayMs = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await delay(delayMs * Math.pow(2, i)); // 지수 백오프
      }
    }
  }
  
  throw lastError;
}

// =============================================================================
// Export
// =============================================================================

module.exports = {
  generateId,
  formatDate,
  getHoursAgo,
  isWithinHours,
  truncateText,
  sanitizeInput,
  extractKeywords,
  groupBy,
  sortBy,
  chunk,
  clamp,
  roundTo,
  percentage,
  deepClone,
  pick,
  omit,
  createError,
  handleAsync,
  logger,
  delay,
  retry
};

