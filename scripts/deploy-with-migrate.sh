#!/usr/bin/env bash
# Run on the server (e.g. after SSH). Ensures migrations are applied then restarts the app.
# Usage: sudo bash scripts/deploy-with-migrate.sh   (from repo root, e.g. /opt/housedash)

set -e
REPO_DIR="${1:-$(dirname "$(dirname "$(realpath "$0")")")}"
cd "$REPO_DIR"

echo "==> Pulling latest..."
git pull

echo "==> Rebuilding migrate image (no cache) so prisma/migrations is included..."
docker compose build --no-cache migrate

echo "==> Applying migrations..."
docker compose --profile tools run --rm migrate

echo "==> Rebuilding app image (Next.js build runs inside image)..."
docker compose build app

echo "==> Restarting app..."
docker compose up -d --force-recreate app

echo "==> App logs (tail 25)..."
docker compose logs app --tail 25
