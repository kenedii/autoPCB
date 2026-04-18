#!/bin/bash
set -e

echo "Waiting for database to be ready..."
until pg_isready -h db -U postgres > /dev/null 2>&1; do
  sleep 1
done

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting Next.js server..."
exec node server.js
