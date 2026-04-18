const http = require('http');

function request(method, path, body, cookie, timeout = 180000) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        timeout,
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
    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  const email = `compile_notify_${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log('[*] Registering:', email);
  const register = await request('POST', '/api/auth/register', { email, password });
  if (register.status !== 200) {
    console.error('[!] Register failed:', register.status, register.body);
    process.exit(1);
  }

  const sessionCookieHeader = register.setCookie.find((c) => c.startsWith('session='));
  const cookie = sessionCookieHeader ? sessionCookieHeader.split(';')[0] : null;
  if (!cookie) {
    console.error('[!] Missing session cookie from registration response');
    process.exit(1);
  }

  const patch = await request('PATCH', '/api/auth/settings', { compileEmailEnabled: true }, cookie);
  if (patch.status !== 200) {
    console.error('[!] Failed to enable compile email setting:', patch.status, patch.body);
    process.exit(1);
  }
  console.log('[*] Enabled compile notifications');

  const skidlCode = `from skidl import *\nset_default_tool(KICAD6)\nr1 = Part('Device','R', value='1k')\nr2 = Part('Device','R', value='2k')\nvin = Net('VIN')\ngnd = Net('GND')\nvin += r1[1], r2[1]\ngnd += r1[2], r2[2]\nERC()\ngenerate_netlist()`;

  console.log('[*] Starting compile test...');
  const compile = await request('POST', '/api/compile', { skidlCode, model: 'deepseek-chat' }, cookie, 240000);
  console.log('[*] Compile status:', compile.status);
  if (compile.status !== 200) {
    console.error('[!] Compile request failed:', compile.body);
    process.exit(1);
  }

  console.log('[*] Compile success field:', !!compile.body?.success);
  if (!compile.body?.success) {
    console.log('[*] Compile error excerpt:', String(compile.body?.error || '').slice(0, 400));
  }
})();
