#!/usr/bin/env bash
# Builds and starts the Docker stack, waits for every service, then runs smoke tests
# through the API Gateway, like the front does.
#
# Usage: scripts/test-docker.sh [--down]
#   --down   stop the stack at the end (useful in CI)
#
# Exit code: 0 if every check passes, 1 otherwise.

set -uo pipefail

cd "$(dirname "$0")/.."

STOP_AT_END=false
[[ "${1:-}" == "--down" ]] && STOP_AT_END=true

GATEWAY=http://localhost:3000
FRONT=http://localhost:8080
TIMEOUT_SECONDS=90
FAILURES=0
BODY_FILE=$(mktemp)
trap 'rm -f "$BODY_FILE"' EXIT

green() { printf '\033[32m%s\033[0m\n' "$1"; }
red() { printf '\033[31m%s\033[0m\n' "$1"; }

for cmd in docker curl; do
  command -v "$cmd" >/dev/null || { red "Missing command: $cmd"; exit 1; }
done
[[ -f .env ]] || { red "Missing .env file: run 'cp .env.example .env' and set CLASH_ROYALE_API_KEY"; exit 1; }

echo "==> Building and starting the stack"
docker compose up -d --build || { red "docker compose up failed"; exit 1; }

echo "==> Waiting for services (max ${TIMEOUT_SECONDS}s each)"
wait_for() {
  local name=$1 url=$2 elapsed=0
  until curl -sf "$url" >/dev/null; do
    sleep 2
    elapsed=$((elapsed + 2))
    if ((elapsed >= TIMEOUT_SECONDS)); then
      red "  ✗ $name not ready ($url)"
      docker compose logs --tail=30 "$name"
      FAILURES=$((FAILURES + 1))
      return 1
    fi
  done
  green "  ✓ $name"
}

wait_for public-api http://localhost:3001/health
wait_for user-service http://localhost:3002/health
wait_for item-service http://localhost:3003/health
wait_for clash-data-service http://localhost:3004/health
wait_for link-service http://localhost:3005/health
wait_for meta-tracker-service http://localhost:3006/health
wait_for api-gateway "$GATEWAY/health"
wait_for front "$FRONT"

# check <label> <expected status> <method> <url> [json body] [bearer token]
check() {
  local label=$1 expected=$2 method=$3 url=$4 body=${5:-} token=${6:-}
  local args=(-s -o "$BODY_FILE" -w '%{http_code}' -X "$method" -H 'Content-Type: application/json')
  [[ -n "$body" ]] && args+=(-d "$body")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  local status
  status=$(curl "${args[@]}" "$url")
  if [[ "$status" == "$expected" ]]; then
    green "  ✓ $label ($status)"
  else
    red "  ✗ $label: expected $expected, got $status"
    head -c 300 "$BODY_FILE"
    echo
    FAILURES=$((FAILURES + 1))
  fi
}

echo "==> Smoke tests through the API Gateway"
EMAIL="smoke-$(date +%s)@example.com"
PASSWORD="Smoke-test-123"

check "register" 201 POST "$GATEWAY/api/users/register" \
  "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
check "register duplicate email" 409 POST "$GATEWAY/api/users/register" \
  "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
check "login" 200 POST "$GATEWAY/api/users/login" \
  "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
TOKEN=$(sed -n 's/.*"token":"\([^"]*\)".*/\1/p' "$BODY_FILE")
check "login wrong password" 401 POST "$GATEWAY/api/users/login" \
  "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}"
check "me with token" 200 GET "$GATEWAY/api/users/me" "" "$TOKEN"
check "me without token" 401 GET "$GATEWAY/api/users/me"
check "delete smoke account" 204 DELETE "$GATEWAY/api/users/me" "" "$TOKEN"

check "clash cards (requires a valid CLASH_ROYALE_API_KEY)" 200 GET "$GATEWAY/api/clash/cards"
check "meta snapshot" 200 GET "$GATEWAY/api/meta/snapshot"
check "swagger spec" 200 GET "$GATEWAY/openapi.json"

echo
if ((FAILURES == 0)); then
  green "All checks passed."
else
  red "$FAILURES check(s) failed. Inspect logs with: docker compose logs <service> --tail=50"
fi

if $STOP_AT_END; then
  docker compose down
fi

((FAILURES == 0))
