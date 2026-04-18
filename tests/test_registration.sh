#!/bin/bash
# Test registration with email
EMAIL="testuser_$(date +%s)@example.com"
PASSWORD="TestPassword123"

echo "[*] Testing registration with email: $EMAIL"

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }" 2>&1

echo ""
echo "[*] Test completed, check app logs for email send status"
