#!/bin/bash
# ==============================================================================
# VILLA PARIS GESTIONALE - PROVISION SCRIPT (RUNS INSIDE LXC)
# ==============================================================================
# This script is called by install-lxc.sh via pct exec
# Can also be run standalone inside an existing Ubuntu 22.04 LXC/VM
# ==============================================================================

set -euo pipefail

# Configuration (can be overridden via environment)
APP_DIR="${APP_DIR:-/opt/villaparis}"
REPO_URL="${REPO_URL:-https://github.com/Dis-Astro/villa-paris-gestionale.git}"
REPO_BRANCH="${REPO_BRANCH:-develop}"
HTTP_PORT="${HTTP_PORT:-3000}"
DB_TYPE="${DB_TYPE:-sqlite}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ==============================================================================
# SYSTEM SETUP
# ==============================================================================

setup_system() {
    log_info "Updating system packages..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get upgrade -y -qq
    
    log_info "Installing base dependencies..."
    apt-get install -y -qq \
        curl \
        git \
        build-essential \
        ca-certificates \
        gnupg \
        lsb-release \
        wget \
        unzip
}

# ==============================================================================
# NODE.JS SETUP
# ==============================================================================

setup_nodejs() {
    log_info "Installing Node.js 20 LTS..."
    
    # Add NodeSource repository
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
        gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | \
        tee /etc/apt/sources.list.d/nodesource.list
    
    apt-get update -qq
    apt-get install -y -qq nodejs
    
    # Install yarn globally
    npm install -g yarn
    
    log_info "Node.js $(node -v) installed"
    log_info "Yarn $(yarn -v) installed"
}

# ==============================================================================
# DATABASE SETUP
# ==============================================================================

setup_database() {
    if [[ "$DB_TYPE" == "postgresql" ]]; then
        log_info "Setting up PostgreSQL..."
        apt-get install -y -qq postgresql postgresql-contrib
        
        systemctl enable postgresql
        systemctl start postgresql
        
        # Create user and database (idempotent)
        sudo -u postgres psql -c "CREATE USER villaparis WITH PASSWORD 'villaparis_secure_2026';" 2>/dev/null || true
        sudo -u postgres psql -c "CREATE DATABASE villaparis OWNER villaparis;" 2>/dev/null || true
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE villaparis TO villaparis;" 2>/dev/null || true
        
        log_info "PostgreSQL configured"
    else
        log_info "Using SQLite (no additional setup needed)"
    fi
}

# ==============================================================================
# APPLICATION SETUP
# ==============================================================================

setup_application() {
    log_info "Setting up application directory..."
    
    # Clone or update repository
    if [[ -d "$APP_DIR/.git" ]]; then
        log_info "Updating existing installation..."
        cd "$APP_DIR"
        git fetch origin
        git reset --hard "origin/$REPO_BRANCH"
    else
        log_info "Cloning repository..."
        rm -rf "$APP_DIR"
        git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
    fi
    
    cd "$APP_DIR"
    
    # Install dependencies
    log_info "Installing Node.js dependencies..."
    yarn install --frozen-lockfile 2>/dev/null || yarn install
}

# ==============================================================================
# ENVIRONMENT CONFIGURATION
# ==============================================================================

configure_environment() {
    log_info "Configuring environment..."
    
    # Create .env file
    cat > "$APP_DIR/.env" << EOF
# Villa Paris Gestionale - Production Configuration
# Generated: $(date)

NODE_ENV=production
PORT=$HTTP_PORT
HOSTNAME=0.0.0.0

# Database Configuration
EOF

    if [[ "$DB_TYPE" == "sqlite" ]]; then
        echo 'DATABASE_URL="file:./prisma/prod.db"' >> "$APP_DIR/.env"
    else
        echo 'DATABASE_URL="postgresql://villaparis:villaparis_secure_2026@localhost:5432/villaparis"' >> "$APP_DIR/.env"
    fi
    
    # Update Prisma schema if using PostgreSQL
    if [[ "$DB_TYPE" == "postgresql" ]]; then
        log_info "Configuring Prisma for PostgreSQL..."
        sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$APP_DIR/prisma/schema.prisma"
        sed -i 's|url.*=.*"file:.*"|url = env("DATABASE_URL")|' "$APP_DIR/prisma/schema.prisma"
    fi
}

# ==============================================================================
# DATABASE MIGRATION
# ==============================================================================

run_migrations() {
    log_info "Running database migrations..."
    cd "$APP_DIR"
    
    npx prisma generate
    npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss
    
    log_info "Database migrations complete"
}

# ==============================================================================
# BUILD APPLICATION
# ==============================================================================

build_application() {
    log_info "Building application (this may take a few minutes)..."
    cd "$APP_DIR"
    
    yarn build
    
    log_info "Build complete"
}

# ==============================================================================
# SYSTEMD SERVICE
# ==============================================================================

setup_systemd() {
    log_info "Configuring systemd service..."
    
    # Determine start command based on build output
    local exec_start
    if [[ -f "$APP_DIR/.next/standalone/server.js" ]]; then
        exec_start="/usr/bin/node $APP_DIR/.next/standalone/server.js"
    else
        exec_start="/usr/bin/yarn --cwd $APP_DIR start"
    fi
    
    # Create systemd unit file
    cat > /etc/systemd/system/villaparis.service << EOF
[Unit]
Description=Villa Paris Gestionale
Documentation=https://github.com/Dis-Astro/villa-paris-gestionale
After=network.target$([ "$DB_TYPE" == "postgresql" ] && echo " postgresql.service")

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$exec_start
Restart=always
RestartSec=10

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$APP_DIR

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=villaparis

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start service
    systemctl daemon-reload
    systemctl enable villaparis
    systemctl restart villaparis
    
    # Wait for startup
    sleep 5
    
    if systemctl is-active --quiet villaparis; then
        log_info "Service started successfully"
    else
        log_warn "Service may have failed to start. Check: journalctl -u villaparis -n 50"
    fi
}

# ==============================================================================
# SUMMARY
# ==============================================================================

print_summary() {
    local ip
    ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    
    echo ""
    echo "=============================================="
    echo "  VILLA PARIS GESTIONALE - INSTALLATION DONE"
    echo "=============================================="
    echo ""
    echo "  Application URL: http://${ip}:${HTTP_PORT}"
    echo "  Database Type:   $DB_TYPE"
    echo "  Install Path:    $APP_DIR"
    echo ""
    echo "  Service Commands:"
    echo "    systemctl status villaparis   # Check status"
    echo "    systemctl restart villaparis  # Restart"
    echo "    journalctl -u villaparis -f   # View logs"
    echo ""
    echo "  Update Command:"
    echo "    cd $APP_DIR && git pull && yarn && yarn build && systemctl restart villaparis"
    echo ""
    echo "=============================================="
}

# ==============================================================================
# MAIN
# ==============================================================================

main() {
    echo "╔════════════════════════════════════════════╗"
    echo "║  VILLA PARIS GESTIONALE - PROVISION SCRIPT ║"
    echo "╚════════════════════════════════════════════╝"
    echo ""
    
    setup_system
    setup_nodejs
    setup_database
    setup_application
    configure_environment
    run_migrations
    build_application
    setup_systemd
    print_summary
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
