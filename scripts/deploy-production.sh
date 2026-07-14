#!/usr/bin/env bash
# Deploy SaarthiWorkforce Help & Support to production (same Docker app as local).
#
# Run ON the production server from the Help-and-Support- repo root (or via this script path).
#
# Usage:
#   chmod +x scripts/deploy-production.sh
#   ./scripts/deploy-production.sh
#
# Options:
#   FULL_REBUILD=1 ./scripts/deploy-production.sh     # docker build --no-cache
#   SITE_URL=https://help.example.com ./scripts/deploy-production.sh
#   SKIP_NETWORK_CHECK=1 ./scripts/deploy-production.sh
#   COMPOSE_PROFILES=isolated ./scripts/deploy-production.sh  # start bundled Mongo
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
SITE_URL="${SITE_URL:-}"
BUILD_FLAGS=()
if [ "${FULL_REBUILD:-0}" = "1" ]; then
  BUILD_FLAGS+=(--no-cache)
fi

NETWORK_NAME="${DOCKER_NETWORK_NAME:-somethingx_saarthix-network}"

echo "==> Help & Support production deploy"
echo "    repo: $ROOT"

# ── 1. Prerequisites ─────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed or not in PATH."
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin is required."
  exit 1
fi

if [ ! -f .env ]; then
  if [ -f .env.production.example ]; then
    echo "No .env found. Creating from .env.production.example — edit secrets before going live."
    cp .env.production.example .env
    echo "ERROR: Fill in .env (JWT_SECRET, APP_FRONTEND_URL, MONGODB_URI, mail/Twilio keys), then re-run."
    exit 1
  fi
  echo "ERROR: Missing .env — copy .env.production.example to .env and configure it."
  exit 1
fi

# Load key values from .env for validation (portable; no process substitution)
get_env() {
  local key="$1"
  local line
  line="$(grep -E "^[[:space:]]*${key}=" .env | tail -n 1 || true)"
  line="${line#*=}"
  line="${line%$'\r'}"
  line="${line%\"}"
  line="${line#\"}"
  line="${line%\'}"
  line="${line#\'}"
  printf '%s' "$line"
}

APP_FRONTEND_URL="$(get_env APP_FRONTEND_URL)"
JWT_SECRET="$(get_env JWT_SECRET)"
MONGODB_URI="$(get_env MONGODB_URI)"
NEXT_PUBLIC_WORKFORCE_APP_URL="$(get_env NEXT_PUBLIC_WORKFORCE_APP_URL)"
HELP_SUPPORT_HOST_PORT="$(get_env HELP_SUPPORT_HOST_PORT)"
HELP_SUPPORT_HOST_PORT="${HELP_SUPPORT_HOST_PORT:-3003}"

if [ -z "${SITE_URL}" ]; then
  SITE_URL="${APP_FRONTEND_URL:-}"
fi
if [ -z "${SITE_URL}" ]; then
  echo "ERROR: Set APP_FRONTEND_URL in .env (or SITE_URL=... when invoking this script)."
  exit 1
fi
SITE_URL="${SITE_URL%/}"

warn_local=0
case "${APP_FRONTEND_URL:-}" in
  *localhost*|*127.0.0.1*) warn_local=1 ;;
esac
case "${NEXT_PUBLIC_WORKFORCE_APP_URL:-}" in
  *localhost*|*127.0.0.1*) warn_local=1 ;;
esac
if [ "$warn_local" = "1" ]; then
  echo "WARNING: Production .env still contains localhost URLs."
  echo "         Update APP_FRONTEND_URL / NEXT_PUBLIC_WORKFORCE_APP_URL / SUPPORT_WEBHOOK_BASE_URL."
fi
if [ -z "${JWT_SECRET:-}" ] || [ "${JWT_SECRET}" = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET" ] || [ "${JWT_SECRET}" = "change-this-in-production" ]; then
  echo "ERROR: Set a real JWT_SECRET in .env (must match Employeemanage / TalentX)."
  exit 1
fi
if [ -z "${MONGODB_URI:-}" ]; then
  echo "ERROR: MONGODB_URI is required in .env."
  exit 1
fi

# ── 2. Docker network (shared with SaarthiX / Workforce stack) ───────────────
if [ "${SKIP_NETWORK_CHECK:-0}" != "1" ]; then
  if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo "==> Creating external network: $NETWORK_NAME"
    docker network create "$NETWORK_NAME"
  else
    echo "==> Docker network OK: $NETWORK_NAME"
  fi
fi

# ── 3. Build + start ─────────────────────────────────────────────────────────
echo "==> [1/3] Building production image (same app as local)..."
"${COMPOSE[@]}" build "${BUILD_FLAGS[@]}" web

echo "==> [2/3] Starting help-support-web..."
"${COMPOSE[@]}" up -d web

echo "==> Waiting for container health..."
ready=0
for i in $(seq 1 40); do
  status="$(docker inspect --format='{{.State.Health.Status}}' help-support-web 2>/dev/null || echo starting)"
  if [ "$status" = "healthy" ]; then
    ready=1
    break
  fi
  if [ "$status" = "unhealthy" ]; then
    echo "Container reported unhealthy. Recent logs:"
    "${COMPOSE[@]}" logs --tail 60 web || true
    exit 1
  fi
  # Fallback if healthcheck not yet reporting
  if curl -sf "http://127.0.0.1:${HELP_SUPPORT_HOST_PORT:-3003}/" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 3
done

if [ "$ready" != "1" ]; then
  echo "WARNING: Health wait timed out. Check: docker compose logs -f web"
  "${COMPOSE[@]}" ps || true
fi

# ── 4. Verify ────────────────────────────────────────────────────────────────
echo "==> [3/3] Verifying endpoints..."
if [ -x scripts/verify-production.sh ]; then
  SITE_URL="$SITE_URL" bash scripts/verify-production.sh || VERIFY_FAIL=1
else
  bash scripts/verify-production.sh || VERIFY_FAIL=1
fi

echo ""
echo "==> Post-deploy checklist"
echo "  - Public URL:     $SITE_URL"
echo "  - Local probe:    http://127.0.0.1:${HELP_SUPPORT_HOST_PORT:-3003}/"
echo "  - Hard-refresh browsers (Ctrl+Shift+R)"
echo "  - Twilio webhook: SUPPORT_WEBHOOK_BASE_URL must be publicly reachable"
echo "  - Brevo: authorize this server's public IP if SMTP/API fails"
echo "  - Mongo: confirm MONGODB_URI reaches the production DB"
echo "  - Logs:  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f web"
echo ""

if [ "${VERIFY_FAIL:-0}" = "1" ]; then
  echo "PARTIAL: Container is up but verification failed — check reverse proxy / firewall."
  exit 1
fi

echo "SUCCESS: Help & Support production deploy finished (parity with local Docker build)."
