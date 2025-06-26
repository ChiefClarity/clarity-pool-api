import axios from 'axios';

async function testRateLimits() {
  const baseURL = 'http://localhost:3000';
  const endpoints = [
    { url: '/api/auth/technician/login', method: 'POST', limit: 5, ttl: 900, data: { email: 'test@test.com', password: 'wrong' } },
    { url: '/health', method: 'GET', limit: 60, ttl: 60 },
  ];

  console.log('🧪 Testing Rate Limiting System\n');

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.url} - Limit: ${endpoint.limit}/${endpoint.ttl}s`);
    
    let successCount = 0;
    let rateLimitHit = false;
    let lastError = null;
    
    for (let i = 0; i < endpoint.limit + 5; i++) {
      try {
        if (endpoint.method === 'POST') {
          await axios.post(baseURL + endpoint.url, endpoint.data);
        } else {
          await axios.get(baseURL + endpoint.url);
        }
        successCount++;
      } catch (error: any) {
        if (error.response?.status === 429) {
          rateLimitHit = true;
          lastError = error.response.data;
          console.log(`  ✅ Rate limit hit after ${successCount} requests`);
          console.log(`  Message: ${error.response.data.message}`);
          break;
        } else {
          // Other errors (like 401) are expected for auth endpoints
          successCount++;
        }
      }
    }
    
    if (!rateLimitHit) {
      console.log(`  ❌ Rate limit NOT triggered after ${successCount} requests!`);
    } else {
      console.log(`  ✅ Rate limiting working correctly`);
    }
    console.log('');
  }

  // Test bypass token
  console.log('Testing bypass token...');
  const bypassToken = 'internal-service-token-1';
  let bypassWorked = true;
  
  for (let i = 0; i < 10; i++) {
    try {
      await axios.get(baseURL + '/health', {
        headers: { Authorization: `Bearer ${bypassToken}` }
      });
    } catch (error: any) {
      if (error.response?.status === 429) {
        bypassWorked = false;
        break;
      }
    }
  }
  
  console.log(bypassWorked ? '✅ Bypass token working' : '❌ Bypass token failed');
  console.log('\n🎉 Rate limit testing complete!');
}

// Run tests
testRateLimits().catch(console.error);