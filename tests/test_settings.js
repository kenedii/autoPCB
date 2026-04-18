const http = require('http');

function request(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {}
          resolve({
            status: res.statusCode,
            body: parsed,
            setCookie: res.headers['set-cookie'] || [],
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  const email = `settings_test_${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log('[*] Registering test user:', email);
  const register = await request('POST', '/api/auth/register', { email, password });
  console.log('[*] Register status:', register.status);
  if (register.status !== 200) {
    console.log(register.body);
    process.exit(1);
  }

  const cookieHeader = register.setCookie.find((c) => c.startsWith('session='));
  const cookie = cookieHeader ? cookieHeader.split(';')[0] : null;
  if (!cookie) {
    console.error('[!] Missing session cookie');
    process.exit(1);
  }

  const settings1 = await request('GET', '/api/auth/settings', null, cookie);
  console.log('[*] Initial settings status:', settings1.status);
  console.log('[*] Initial settings body:', settings1.body);

  const patch = await request('PATCH', '/api/auth/settings', { compileEmailEnabled: true }, cookie);
  console.log('[*] Patch status:', patch.status);
  console.log('[*] Patch body:', patch.body);

  const settings2 = await request('GET', '/api/auth/settings', null, cookie);
  console.log('[*] Updated settings status:', settings2.status);
  console.log('[*] Updated settings body:', settings2.body);
})();
