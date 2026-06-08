#!/bin/sh
set -e

echo "=== Villa Paris Gestionale - Starting ==="

# Wait for database to be ready
echo "Waiting for database..."
sleep 5

# Sync database schema (creates tables if not exist, adds new columns)
echo "Syncing database schema..."
npx prisma db push --skip-generate 2>&1 || {
    echo "db push failed, retrying in 5s..."
    sleep 5
    npx prisma db push --skip-generate
}

echo "Starting application..."
exec node server.js
