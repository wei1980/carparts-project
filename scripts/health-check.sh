#!/bin/bash
# C:/carparts/scripts/health-check.sh
# Service health check script

set -euo pipefail

ENV_FILE="${1:-.env.production}"
COMPOSE_FILE="docker-compose.yml"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: Environment file $ENV_FILE not found"
    exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)

echo "=== CarParts Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Check Docker containers
echo "--- Container Status ---"
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "--- Service Health ---"

# Check API
if curl -sf "http://localhost:3000/health" > /dev/null; then
    echo "✓ API (port 3000) - HEALTHY"
    curl -s "http://localhost:3000/health" | jq . 2>/dev/null || curl -s "http://localhost:3000/health"
else
    echo "✗ API (port 3000) - UNHEALTHY"
fi

echo ""

# Check Database
if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
    echo "✓ PostgreSQL - HEALTHY"
else
    echo "✗ PostgreSQL - UNHEALTHY"
fi

echo ""

# Check Redis
if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis - HEALTHY"
else
    echo "✗ Redis - UNHEALTHY"
fi

echo ""

# Check Web (nginx)
if curl -sf "http://localhost:80" > /dev/null; then
    echo "✓ Web (port 80) - HEALTHY"
else
    echo "✗ Web (port 80) - UNHEALTHY"
fi

echo ""
echo "=== Health Check Complete ==="