#!/usr/bin/env python3
"""
Patch the registration bundle to include Resend email API call.
"""
import sys
import re
from pathlib import Path

BUNDLE_FILE = Path("x:/coding_projects/Auto-SKIDL/patch_bundle.js")

# Read the bundle
content = BUNDLE_FILE.read_text(encoding="utf-8")

print("[*] Checking if Resend API call already exists...")
if "resend.com/emails" in content:
    print("[✓] Resend API call ALREADY present in bundle!")
    sys.exit(0)

print("[*] Resend API call NOT found - bundle is stale")
print("[*] Bundle size:", len(content), "bytes")

# Look for the pattern where we create session and return response
# Pattern: createSession(...), NextResponse.json(...)
# We need to add email sending between these two

# Search for the create session call followed by NextResponse
# The minified pattern might look like: },t.NextResponse.json(...) or similar

# Let's look for common patterns
patterns_to_try = [
    # Pattern 1: Session creation followed by JSON response
    (r'(\(0,S\.createSession\)\({[^}]+}\))\s*(,\w+\.NextResponse\.json)',
     r'\1,await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"AutoPCB <onboarding@resend.dev>",to:e,subject:"Welcome!",html:"welcome"})})\2'),
]

patched = False
for old_pattern, new_pattern in patterns_to_try:
    if re.search(old_pattern, content):
        print(f"[*] Found pattern, attempting patch...")
        content = re.sub(old_pattern, new_pattern, content)
        patched = True
        break

if not patched:
    print("[!] Could not find expected pattern in bundle")
    print("[*] Searching for 'createSession' mentions...")
    matches = re.findall(r'.{0,100}createSession.{0,100}', content)
    if matches:
        print(f"[*] Found {len(matches)} matches:")
        for i, match in enumerate(matches[:3]):
            print(f"    [{i}]: {match[:80]}")
    
    # As fallback, try simple text replacement
    print("[*] Trying simple text replacement...")
    old_simple = "}, NewResponse.json({"
    if old_simple in content:
        new_simple = '''},fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY},body:JSON.stringify({from:"AutoPCB <onboarding@resend.dev>",to:___email___,subject:"Welcome to AutoPCB!",html:"<h1>Welcome</h1>"})}).catch(e=>console.error(e)),NewResponse.json({'''
        content = content.replace(old_simple, new_simple)
        patched = True
        print("[✓] Applied simple replacement")

if patched:
    print("[✓] Patch applied successfully")
    BUNDLE_FILE.write_text(content, encoding="utf-8")
    print(f"[✓] Saved patched bundle back to {BUNDLE_FILE}")
else:
    print("[!] Patching failed - could not find injection point")
    sys.exit(1)
