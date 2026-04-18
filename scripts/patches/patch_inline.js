// Patch script to inject email sending into the minified Next.js registration bundle
const fs = require('fs');
const path = require('path');

const BUNDLE_PATH = '/app/.next/server/chunks/[root-of-the-server]__f52491ce._.js';

console.log('[*] Reading bundle...');
let content = fs.readFileSync(BUNDLE_PATH, 'utf-8');

console.log(`[*] Bundle size: ${content.length} bytes`);

// Check if Resend is already present
if (content.includes('resend.com') || content.includes('Resend')) {
  console.log('[✓] Email code already present!');
  process.exit(0);
}

console.log('[!] Email code is missing, this bundle is stale');
console.log('[*] Looking for injection point...');

// The exact minified pattern from earlier analysis:
// await _.default.user.create({data:{id:s,email:t,passwordHash:a}}),await (0,S.createSession)({userId:s,email:t}),v.NextResponse.json({success:!0,user:{id:s,email:t}})

// Try to find this pattern and inject email fetching
const searchPattern = 'await (0,S.createSession)({userId:s,email:t}),v.NextResponse.json({success:!0,user:{id:s,email:t}})';

if (content.includes(searchPattern)) {
  console.log('[*] Found the exact session+response pattern!');
  
  const replacement = `await (0,S.createSession)({userId:s,email:t}),
  await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+(process.env.RESEND_API_KEY||""),
"Content-Type":"application/json"},body:JSON.stringify({from:"AutoPCB <onboarding@resend.dev>",to:t,subject:"Welcome to AutoPCB!",html:"<h1>Welcome!</h1>"})}).catch(e=>console.error("Email send failed:",e)),
  v.NextResponse.json({success:!0,user:{id:s,email:t}})`;
  
  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(BUNDLE_PATH, content, 'utf-8');
  console.log('[✓] PATCH APPLIED SUCCESSFULLY');
  console.log('[✓] To activate: restart app container with: docker-compose restart app');
  process.exit(0);
}

console.log('[!] Exact pattern not found');
console.log('[*] Trying alternative searchpatterns...');

// More flexible search patterns
const alternatives = [
  'createSession',
  'NextResponse.json',
  's,email:t',
  'passwordHash:a'
];

for (const alt of alternatives) {
  const count = (content.match(new RegExp(alt, 'g')) || []).length;
  console.log(`[*] Found "${alt}": ${count} times`);
}

console.log('[!] Could not apply patch - bundle structure different than expected');
console.log('[*] Recommend: rebuild Docker image with email code from source');
process.exit(1);
