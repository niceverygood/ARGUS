/**
 * ARGUS SKY - API Test Script
 * 백엔드 API 엔드포인트 테스트
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 ARGUS API Test Suite');
  console.log('========================================');
  console.log(`📡 Testing: ${BASE_URL}\n`);

  const tests = [
    {
      name: 'Health Check',
      path: '/health',
      method: 'GET',
      expect: { status: 200 }
    },
    {
      name: 'Root Endpoint',
      path: '/',
      method: 'GET',
      expect: { status: 200 }
    },
    {
      name: 'Dashboard Data',
      path: '/api/dashboard',
      method: 'GET',
      expect: { status: 200, hasData: true }
    },
    {
      name: 'Threats List',
      path: '/api/threats',
      method: 'GET',
      expect: { status: 200, hasData: true }
    },
    {
      name: 'Threats with Filter',
      path: '/api/threats?category=CYBER&limit=10',
      method: 'GET',
      expect: { status: 200 }
    },
    {
      name: 'Analytics (24h)',
      path: '/api/analytics?period=24h',
      method: 'GET',
      expect: { status: 200 }
    },
    {
      name: 'Analytics (7d)',
      path: '/api/analytics?period=7d',
      method: 'GET',
      expect: { status: 200 }
    },
    {
      name: 'Trend Data',
      path: '/api/trend?period=24h',
      method: 'GET',
      expect: { status: 200 }
    },
    {
      name: 'Evidence Data',
      path: '/api/evidence',
      method: 'GET',
      expect: { status: 200 }
    },
    {
      name: 'System Status',
      path: '/api/status',
      method: 'GET',
      expect: { status: 200 }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      process.stdout.write(`  Testing ${test.name}... `);
      
      const result = await makeRequest(test.path, test.method, test.body);
      
      if (result.status === test.expect.status) {
        console.log('✅ PASS');
        passed++;
        
        // 추가 검증
        if (test.expect.hasData && result.data.data) {
          console.log(`     └─ Data received: ${typeof result.data.data}`);
        }
      } else {
        console.log(`❌ FAIL (Expected ${test.expect.status}, got ${result.status})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

// 서버가 준비될 때까지 대기
async function waitForServer(maxAttempts = 10) {
  console.log('⏳ Waiting for server...');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await makeRequest('/health');
      console.log('✅ Server is ready!\n');
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  console.log('❌ Server not available after', maxAttempts, 'attempts');
  return false;
}

async function main() {
  const serverReady = await waitForServer();
  
  if (serverReady) {
    await runTests();
  } else {
    console.log('\n💡 Make sure the server is running: npm start\n');
    process.exit(1);
  }
}

main().catch(console.error);

