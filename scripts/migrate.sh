#!/bin/bash
# C:/carparts/scripts/migrate.sh
# Database migration script

set -euo pipefail

ENV_FILE="${1:-.env.production}"
COMPOSE_FILE="docker-compose.yml"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: Environment file $ENV_FILE not found"
    echo "Usage: $0 [env-file]"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo "Running database migrations..."
docker-compose -f "$COMPOSE_FILE" run --rm api npx prisma migrate deploy

echo "Migrations completed successfully"

# Optionally generate Prisma client
echo "Generating Prisma client..."
docker-compose -f "$COMPOSE_FILE" run --rm api npx prisma generate

echo "Done"