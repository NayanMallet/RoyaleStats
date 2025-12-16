#!/usr/bin/env bash
set -euo pipefail

echo "This script builds the docker images, starts the stack, waits for services, and runs basic smoke tests."

echo "Make sure Docker daemon is running."

docker-compose build --build-arg ARCH=amd64

docker-compose up -d

# wait for health endpoints (max 60s)
wait_for() {
  local url=$1
  local name=$2
  local i=0
  until curl -s $url >/dev/null; do
    sleep 1
    i=$((i+1))
    if [ $i -ge 60 ]; then
      echo "Timeout waiting for $name ($url)" >&2
      docker-compose logs --tail=200 || true
      exit 1
    fi
  done
}



echo "Waiting for user-service..."
wait_for http://localhost:3002/health "user-service"

# smoke-tests



echo "Testing user-service (register + login)..."
curl -s -X POST http://localhost:3002/users -H "Content-Type: application/json" -d '{"name":"Docker User","email":"docker@example.com","password":"secret"}' | jq -r '.' || true
sleep 0.5
curl -s -X POST http://localhost:3002/login -H "Content-Type: application/json" -d '{"email":"docker@example.com","password":"secret"}' | jq -r '.' || true

echo "Logs (last 200 lines combined):"
docker-compose logs --tail=200

echo "All done. If tests failed, inspect logs above."
