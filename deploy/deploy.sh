#!/usr/bin/env bash
# =============================================================================
# ArtVerse Deploy Script
# Called by GitHub Actions via SSH on the VPS.
# Usage: bash deploy.sh <image-tag>
# Runs as the staging or production user in ~/app/
# =============================================================================
set -euo pipefail

IMAGE_TAG="${1:?Usage: bash deploy.sh <image-tag>}"
APP_DIR="$HOME/app"

cd "$APP_DIR"

echo "=== Pulling image ghcr.io/ilv78/art-world-hub:$IMAGE_TAG ==="
docker pull "ghcr.io/ilv78/art-world-hub:$IMAGE_TAG"

echo "=== Updating IMAGE_TAG in .env ==="
if grep -q "^IMAGE_TAG=" .env 2>/dev/null; then
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$IMAGE_TAG/" .env
else
  echo "IMAGE_TAG=$IMAGE_TAG" >> .env
fi

echo "=== Deploying with docker compose ==="
docker compose up -d --remove-orphans

echo "=== Waiting for app to be healthy ==="
for i in $(seq 1 30); do
  if docker compose exec -T app wget -q --spider http://localhost:5000/api/artists 2>/dev/null; then
    echo "App is healthy after ${i}s"
    exit 0
  fi
  sleep 1
done

echo "ERROR: Health check failed after 30s"
docker compose logs --tail=50 app
exit 1
