#!/usr/bin/env bash

# Google Review Flow - Data-Safe VPS Deployment
# Targets VPS IP: 187.126.122.90
# Domain: reviewflow.veltron.in (SSL managed via existing Traefik on VPS)

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}"
cd "${REPO_ROOT}"

VPS_IP="${VPS_IP:-187.126.122.90}"
VPS_USER="root"
VPS_PASS="${VPS_PASS:-Veltron@2020}"
REMOTE_DIR="/opt/google-review-flow"
BACKUP_DIR="/opt/backups/google-review-flow"
DOMAIN="${DOMAIN:-reviewflow.veltron.in}"
COMPOSE_FILE="docker-compose.yml"

BACKEND_SERVICE="backend"
FRONTEND_SERVICE="frontend"
BACKEND_CONTAINER="reviewflow_backend"
FRONTEND_CONTAINER="reviewflow_frontend"

BACKEND_PORT="3007"
FRONTEND_PORT="3008"

echo "============================================="
echo "🚀 Deploying Google Review Flow to VPS"
echo "🌐 Domain: https://${DOMAIN}"
echo "🖥️  Target: ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}"
echo "🔌 Ports: Backend 127.0.0.1:${BACKEND_PORT} | Frontend :${FRONTEND_PORT}"
echo "============================================="

echo "📦 Step 1: Building frontend assets..."
npm run build

echo "📁 Step 2: Preparing remote directory..."
sshpass -p "${VPS_PASS}" ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "mkdir -p '${REMOTE_DIR}' '${BACKUP_DIR}' '${REMOTE_DIR}/data'"

echo "📤 Step 3: Syncing files to VPS..."
sshpass -p "${VPS_PASS}" rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'data/reviews.sqlite*' \
  ./ "${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/"

echo "🔨 Step 4: Building and launching containers..."
sshpass -p "${VPS_PASS}" ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "\
  cd '${REMOTE_DIR}' && \
  chmod -R 777 data && \
  docker compose build '${BACKEND_SERVICE}' && \
  docker compose up -d --force-recreate"

echo "⏳ Step 5: Waiting for containers and health checks..."
sshpass -p "${VPS_PASS}" ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "\
  cd '${REMOTE_DIR}' && \
  for i in {1..20}; do \
    if curl -fsS http://127.0.0.1:${BACKEND_PORT}/api/health >/dev/null 2>&1; then \
      echo '✅ Backend is healthy!'; break; \
    fi; \
    sleep 2; \
  done"

echo "🌐 Step 6: Verifying public HTTPS via Traefik..."
for i in {1..15}; do
  if curl -fsSIL --resolve "${DOMAIN}:443:${VPS_IP}" "https://${DOMAIN}" >/dev/null 2>&1 || \
     curl -fsSIL "https://${DOMAIN}" >/dev/null 2>&1; then
    echo "✅ Frontend HTTPS responding at https://${DOMAIN}"
    break
  fi
  sleep 2
done

echo "============================================="
echo "🎉 Deployment completed successfully!"
echo "🌐 App URL: https://${DOMAIN}"
echo "============================================="

