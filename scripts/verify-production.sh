#!/usr/bin/env bash
# Smoke-check Help & Support after production deploy.
# Usage: SITE_URL=https://help.example.com ./scripts/verify-production.sh
set -euo pipefail

SITE_URL="${SITE_URL:-http://127.0.0.1:3003}"
SITE_URL="${SITE_URL%/}"
PORT="${HELP_SUPPORT_HOST_PORT:-3003}"
LOCAL="http://127.0.0.1:${PORT}"

fail=0

check() {
  local label="$1"
  local url="$2"
  if curl -sfL --max-time 15 "$url" >/dev/null 2>&1; then
    echo "  OK  $label — $url"
  else
    echo "  FAIL $label — $url"
    fail=1
  fi
}

echo "Verifying Help & Support at $SITE_URL (local $LOCAL)..."

check "local home" "$LOCAL/"
check "local admin" "$LOCAL/admin/"

# Public URL may be reverse-proxied; try if different from local
if [ "$SITE_URL" != "$LOCAL" ] && [ "$SITE_URL" != "http://localhost:${PORT}" ]; then
  check "public home" "$SITE_URL/"
  check "public admin" "$SITE_URL/admin/"
fi

if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'help-support-web'; then
  echo "  OK  container help-support-web is running"
else
  echo "  FAIL container help-support-web is not running"
  fail=1
fi

if [ "$fail" = "1" ]; then
  exit 1
fi
echo "All checks passed."
