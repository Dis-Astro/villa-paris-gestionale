#!/bin/sh
set -e

echo "=== Villa Paris Gestionale - Starting ==="

# Wait for database to be ready
echo "Waiting for database..."
sleep 3

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node server.js
