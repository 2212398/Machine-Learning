#!/bin/bash
set -e

echo "Deploy Frontend - Plant Leaf AI"
echo "================================"

if [ ! -f "code/.env" ]; then
  echo "Missing code/.env"
  echo "Copy code/.env.example to code/.env and fill real values."
  exit 1
fi

echo "Pulling latest code..."
git pull origin main

echo "Building frontend container..."
cd code
docker compose build --no-cache frontend

echo "Restarting frontend..."
docker compose up -d frontend

echo "Waiting 30 seconds for frontend startup..."
sleep 30

echo "Checking health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$HTTP_CODE" = "200" ]; then
  echo "Frontend is healthy (HTTP $HTTP_CODE)"
else
  echo "Health check returned HTTP $HTTP_CODE"
  echo "View logs: docker compose logs -f frontend"
  exit 1
fi

echo ""
echo "Deploy complete."
echo "Logs: docker compose logs -f frontend"
