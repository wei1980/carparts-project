#!/bin/bash
# C:/carparts/scripts/backup.sh
# Database backup script

set -euo pipefail

ENV_FILE="${1:-.env.production}"
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="/opt/carparts/backups"
RETENTION_DAYS=7

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: Environment file $ENV_FILE not found"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/carparts_$TIMESTAMP.sql"

echo "Creating database backup..."
docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
    -U "$POSTGRES_USER" \
    "$POSTGRES_DB" > "$BACKUP_FILE"

if [[ $? -eq 0 ]]; then
    echo "Backup created: $BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    echo "Backup compressed: $BACKUP_FILE.gz"
    
    # Clean old backups
    find "$BACKUP_DIR" -name "carparts_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "Old backups cleaned (retention: $RETENTION_DAYS days)"
else
    echo "Backup failed"
    exit 1
fi