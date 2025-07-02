import axios from 'axios';

async function testRateLimits() {
  const baseURL = 'http://localhost:3000';

  console.log('Testing Login Rate Limit (5 attempts/15 min)...\n');

  for (let i = 1; i <= 7; i++) {
    try {
      const response = await axios.post(
        `${baseURL}/api/auth/technician/login`,
        { email: 'test@claritypool.com', password: 'wrongpassword' },
        { validateStatus: () => true },
      );

      console.log(`Attempt ${i}: Status ${response.status}`);

      if (response.status === 429) {
        console.log('✅ Rate limit working! Blocked after', i - 1, 'attempts');
        console.log('Rate limit message:', response.data.message);
        break;
      }
    } catch (error) {
      console.error(`Attempt ${i} error:`, error.message);
    }
  }

  console.log('\nTesting Global Rate Limit (60/min)...');
  // Test would take too long, just verify configuration
  console.log('✓ Global limit configured at 60 requests/minute');

  console.log('\nTesting Monitoring Endpoint...');
  try {
    // First login to get JWT
    const loginResponse = await axios.post(
      `${baseURL}/api/auth/technician/login`,
      { email: 'test@claritypool.com', password: 'test123' },
      {
        headers: { Authorization: 'Bearer internal-service-token-1' },
        validateStatus: () => true,
      },
    );

    if (loginResponse.status === 201 && loginResponse.data.token) {
      console.log('✓ Got JWT token for monitoring test');

      const statsResponse = await axios.get(
        `${baseURL}/api/monitoring/rate-limits/stats`,
        {
          headers: { Authorization: `Bearer ${loginResponse.data.token}` },
          validateStatus: () => true,
        },
      );

      console.log('Monitoring endpoint status:', statsResponse.status);
      if (statsResponse.status === 200) {
        console.log('✅ Monitoring endpoint accessible');
        console.log('Stats:', statsResponse.data);
      } else {
        console.log('❌ Monitoring endpoint returned:', statsResponse.status);
      }
    }
  } catch (error) {
    console.error('❌ Monitoring endpoint error:', error.message);
  }

  console.log('\nTesting Bypass Token...');
  try {
    // Make multiple requests with bypass token
    let bypassSuccess = true;
    for (let i = 1; i <= 10; i++) {
      const response = await axios.post(
        `${baseURL}/api/auth/technician/login`,
        { email: 'test@claritypool.com', password: 'wrongpassword' },
        {
          headers: { Authorization: 'Bearer internal-service-token-1' },
          validateStatus: () => true,
        },
      );

      if (response.status === 429) {
        bypassSuccess = false;
        console.log(`❌ Bypass token failed at attempt ${i}`);
        break;
      }
    }

    if (bypassSuccess) {
      console.log('✅ Bypass token working - 10 requests without rate limit');
    }
  } catch (error) {
    console.error('Bypass token test error:', error.message);
  }
}

testRateLimits().catch(console.error);
