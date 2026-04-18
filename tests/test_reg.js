// Test registration via Node fetch API
const http = require('http');

const testEmail = 'testuser_' + Date.now() + '@example.com';
const testPassword = 'TestPassword123';

const postData = JSON.stringify({
  email: testEmail,
  password: testPassword
});

console.log('[*] Testing registration with:', testEmail);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`[*] Status: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(data);
      console.log('[*] Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('[*] Response (raw):', data);
    }
    console.log('[*] Test completed, check app logs');
  });
});

req.on('error', (e) => {
  console.error('[!] Request failed:', e.message);
});

req.write(postData);
req.end();
