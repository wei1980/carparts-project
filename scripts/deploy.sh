#!/bin/bash
# C:/carparts/scripts/deploy.sh
# Production deployment script

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/carparts"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"
BACKUP_DIR="/opt/carparts/backups"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file $ENV_FILE not found"
        exit 1
    fi
    
    log_info "Prerequisites OK"
}

# Backup database
backup_database() {
    log_info "Backing up database..."
    
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/carparts_$TIMESTAMP.sql"
    
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
        -U "${POSTGRES_USER:-carparts}" \
        "${POSTGRES_DB:-carparts}" > "$BACKUP_FILE"
    
    if [[ $? -eq 0 ]]; then
        log_info "Database backed up to $BACKUP_FILE"
        # Keep only last 7 days of backups
        find "$BACKUP_DIR" -name "carparts_*.sql" -mtime +7 -delete
    else
        log_error "Database backup failed"
        exit 1
    fi
}

# Pull latest images
pull_images() {
    log_info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    log_info "Images pulled"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" run --rm api npx prisma migrate deploy
    log_info "Migrations completed"
}

# Deploy services
deploy() {
    log_info "Deploying services..."
    docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans
    log_info "Services deployed"
}

# Health check
health_check() {
    log_info "Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "unhealthy\|starting"; then
            log_info "Attempt $attempt/$max_attempts - Services still starting..."
            sleep 10
            ((attempt++))
        else
            log_info "All services healthy"
            return 0
        fi
    done
    
    log_error "Health check timeout"
    docker-compose -f "$COMPOSE_FILE" ps
    return 1
}

# Rollback on failure
rollback() {
    log_warn "Rolling back..."
    docker-compose -f "$COMPOSE_FILE" down
    # Restore from backup if needed
    # docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "$BACKUP_FILE"
    log_error "Deployment failed, rolled back"
    exit 1
}

# Main deployment flow
main() {
    log_info "Starting deployment..."
    
    cd "$PROJECT_DIR"
    
    check_prerequisites
    backup_database
    pull_images
    run_migrations
    deploy
    
    if health_check; then
        log_info "Deployment successful!"
        log_info "API: http://localhost:3000"
        log_info "Web: http://localhost:80"
    else
        rollback
    fi
}

# Run main function
main "$@"