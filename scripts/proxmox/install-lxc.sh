#!/usr/bin/env bash

# ==============================================================================
# VILLA PARIS GESTIONALE - LXC INSTALLER FOR PROXMOX VE
# ==============================================================================
# Community-scripts style installer
# One-command install: bash -c "$(wget -qLO - https://raw.githubusercontent.com/Dis-Astro/villa-paris-gestionale/develop/scripts/proxmox/install-lxc.sh)"
# ==============================================================================

set -euo pipefail

# Colors
RD=$(echo "\033[01;31m")
YW=$(echo "\033[33m")
GN=$(echo "\033[1;32m")
CL=$(echo "\033[m")
BFR="\\r\\033[K"
HOLD=" "
CM="${GN}✓${CL}"
CROSS="${RD}✗${CL}"
INFO="${YW}➜${CL}"

# Variables with defaults
APP_NAME="Villa Paris Gestionale"
APP_DIR="/opt/villaparis"
REPO_URL="https://github.com/Dis-Astro/villa-paris-gestionale.git"
REPO_BRANCH="develop"
DEFAULT_CTID=""
DEFAULT_HOSTNAME="villaparis"
DEFAULT_CPU="2"
DEFAULT_RAM="2048"
DEFAULT_DISK="8"
DEFAULT_PORT="3000"
TEMPLATE="local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst"

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

msg_info() { echo -ne " ${INFO} ${1}..."; }
msg_ok() { echo -e "${BFR} ${CM} ${1}"; }
msg_error() { echo -e "${BFR} ${CROSS} ${1}"; exit 1; }

header() {
    clear
    cat <<"EOF"
 __      ___ _ _        ____           _     
 \ \    / (_) | |      |  _ \ __ _ _ _(_)___ 
  \ \  / /| | | | __ _ | |_) / _` | '__| / __|
   \ \/ / | | | |/ _` ||  __/ (_| | |  | \__ \
    \__/  |_|_|_|\__,_||_|   \__,_|_|  |_|___/
                                              
    GESTIONALE - LXC INSTALLER v1.0
    
EOF
    echo -e "${GN}Community-Scripts Style Installer for Proxmox VE${CL}\n"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        msg_error "This script must be run as root on Proxmox VE host"
    fi
}

check_proxmox() {
    if ! command -v pct &> /dev/null; then
        msg_error "This script must be run on a Proxmox VE host (pct not found)"
    fi
    msg_ok "Proxmox VE detected"
}

get_next_ctid() {
    local max_id=$(pct list 2>/dev/null | awk 'NR>1 {print $1}' | sort -n | tail -1)
    if [[ -z "$max_id" ]]; then
        echo "100"
    else
        echo $((max_id + 1))
    fi
}

download_template() {
    msg_info "Checking Ubuntu 22.04 template"
    if ! pveam list local | grep -q "ubuntu-22.04-standard"; then
        msg_info "Downloading Ubuntu 22.04 template"
        pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst || {
            msg_error "Failed to download template"
        }
    fi
    msg_ok "Ubuntu 22.04 template available"
}

# ==============================================================================
# WHIPTAIL DIALOGS
# ==============================================================================

get_user_input() {
    # Welcome
    whiptail --title "$APP_NAME Installer" --msgbox \
        "Questo script installerà $APP_NAME in un nuovo container LXC.\n\nVerranno richieste alcune configurazioni." \
        12 60

    # CTID
    local next_ctid=$(get_next_ctid)
    CTID=$(whiptail --title "Container ID" --inputbox \
        "Inserisci il CTID per il container.\nLascia vuoto per auto-assegnazione (suggerito: $next_ctid)" \
        10 60 "" 3>&1 1>&2 2>&3) || exit 1
    [[ -z "$CTID" ]] && CTID="$next_ctid"

    # Hostname
    HOSTNAME=$(whiptail --title "Hostname" --inputbox \
        "Inserisci l'hostname del container:" \
        10 60 "$DEFAULT_HOSTNAME" 3>&1 1>&2 2>&3) || exit 1
    [[ -z "$HOSTNAME" ]] && HOSTNAME="$DEFAULT_HOSTNAME"

    # CPU Cores
    CPU=$(whiptail --title "CPU Cores" --inputbox \
        "Numero di CPU cores:" \
        10 60 "$DEFAULT_CPU" 3>&1 1>&2 2>&3) || exit 1
    [[ -z "$CPU" ]] && CPU="$DEFAULT_CPU"

    # RAM
    RAM=$(whiptail --title "RAM (MB)" --inputbox \
        "Quantità di RAM in MB:" \
        10 60 "$DEFAULT_RAM" 3>&1 1>&2 2>&3) || exit 1
    [[ -z "$RAM" ]] && RAM="$DEFAULT_RAM"

    # Disk
    DISK=$(whiptail --title "Disk (GB)" --inputbox \
        "Dimensione disco in GB:" \
        10 60 "$DEFAULT_DISK" 3>&1 1>&2 2>&3) || exit 1
    [[ -z "$DISK" ]] && DISK="$DEFAULT_DISK"

    # Network
    if whiptail --title "Network" --yesno \
        "Usare DHCP per la configurazione di rete?\n\nSì = DHCP automatico\nNo = Configurazione IP statico" \
        10 60; then
        NETWORK="dhcp"
        IP_DISPLAY="DHCP"
    else
        STATIC_IP=$(whiptail --title "IP Statico" --inputbox \
            "Inserisci IP/CIDR (es: 192.168.1.100/24):" \
            10 60 "" 3>&1 1>&2 2>&3) || exit 1
        GATEWAY=$(whiptail --title "Gateway" --inputbox \
            "Inserisci Gateway:" \
            10 60 "" 3>&1 1>&2 2>&3) || exit 1
        NETWORK="ip=${STATIC_IP},gw=${GATEWAY}"
        IP_DISPLAY="$STATIC_IP"
    fi

    # HTTP Port
    HTTP_PORT=$(whiptail --title "HTTP Port" --inputbox \
        "Porta HTTP per l'applicazione:" \
        10 60 "$DEFAULT_PORT" 3>&1 1>&2 2>&3) || exit 1
    [[ -z "$HTTP_PORT" ]] && HTTP_PORT="$DEFAULT_PORT"

    # Database choice
    if whiptail --title "Database" --yesno \
        "Quale database vuoi usare?\n\nSì = SQLite (raccomandato, nessuna configurazione)\nNo = PostgreSQL (richiede setup aggiuntivo)" \
        12 60; then
        DB_TYPE="sqlite"
    else
        DB_TYPE="postgresql"
    fi

    # Confirmation
    whiptail --title "Conferma Configurazione" --yesno \
        "Riepilogo configurazione:\n\n\
• CTID: $CTID\n\
• Hostname: $HOSTNAME\n\
• CPU: $CPU cores\n\
• RAM: ${RAM}MB\n\
• Disk: ${DISK}GB\n\
• Network: $IP_DISPLAY\n\
• HTTP Port: $HTTP_PORT\n\
• Database: $DB_TYPE\n\n\
Procedere con l'installazione?" \
        18 60 || exit 1
}

# ==============================================================================
# LXC CREATION
# ==============================================================================

create_container() {
    msg_info "Creating LXC container $CTID"
    
    local net_config
    if [[ "$NETWORK" == "dhcp" ]]; then
        net_config="name=eth0,bridge=vmbr0,ip=dhcp"
    else
        net_config="name=eth0,bridge=vmbr0,$NETWORK"
    fi

    pct create "$CTID" "$TEMPLATE" \
        --hostname "$HOSTNAME" \
        --cores "$CPU" \
        --memory "$RAM" \
        --rootfs "local-lvm:${DISK}" \
        --net0 "$net_config" \
        --unprivileged 1 \
        --features nesting=1 \
        --onboot 1 \
        --start 0 || msg_error "Failed to create container"

    msg_ok "Container $CTID created"
}

start_container() {
    msg_info "Starting container $CTID"
    pct start "$CTID" || msg_error "Failed to start container"
    sleep 5
    msg_ok "Container $CTID started"
}

wait_for_network() {
    msg_info "Waiting for network"
    local attempts=0
    while ! pct exec "$CTID" -- ping -c1 8.8.8.8 &>/dev/null; do
        ((attempts++))
        if [[ $attempts -ge 30 ]]; then
            msg_error "Network not available after 30 seconds"
        fi
        sleep 1
    done
    msg_ok "Network available"
}

# ==============================================================================
# PROVISIONING
# ==============================================================================

provision_container() {
    msg_info "Provisioning container (this may take several minutes)"

    # Copy provision script inside container
    local provision_script="/tmp/provision_$CTID.sh"
    
    cat > "$provision_script" << 'PROVISION_EOF'
#!/bin/bash
set -euo pipefail

APP_DIR="/opt/villaparis"
REPO_URL="__REPO_URL__"
REPO_BRANCH="__REPO_BRANCH__"
HTTP_PORT="__HTTP_PORT__"
DB_TYPE="__DB_TYPE__"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

log "Installing dependencies..."
apt-get install -y -qq curl git build-essential ca-certificates gnupg

log "Installing Node.js 20 LTS..."
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
apt-get update -qq
apt-get install -y -qq nodejs

log "Node version: $(node -v)"
log "NPM version: $(npm -v)"

# Install yarn
npm install -g yarn

# PostgreSQL setup if needed
if [[ "$DB_TYPE" == "postgresql" ]]; then
    log "Installing PostgreSQL..."
    apt-get install -y -qq postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    
    sudo -u postgres psql -c "CREATE USER villaparis WITH PASSWORD 'villaparis_secure_2026';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE villaparis OWNER villaparis;" 2>/dev/null || true
fi

log "Cloning repository..."
rm -rf "$APP_DIR"
git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

log "Installing dependencies..."
yarn install --frozen-lockfile 2>/dev/null || yarn install

log "Configuring environment..."
cat > "$APP_DIR/.env" << ENVEOF
# Villa Paris Gestionale Configuration
NODE_ENV=production
PORT=$HTTP_PORT

# Database
ENVEOF

if [[ "$DB_TYPE" == "sqlite" ]]; then
    echo 'DATABASE_URL="file:./prisma/prod.db"' >> "$APP_DIR/.env"
else
    echo 'DATABASE_URL="postgresql://villaparis:villaparis_secure_2026@localhost:5432/villaparis"' >> "$APP_DIR/.env"
fi

# Update Prisma schema for production
if [[ "$DB_TYPE" == "postgresql" ]]; then
    sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$APP_DIR/prisma/schema.prisma"
    sed -i 's|url.*=.*"file:.*"|url = env("DATABASE_URL")|' "$APP_DIR/prisma/schema.prisma"
fi

log "Running database migrations..."
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss

log "Building application..."
yarn build

log "Creating systemd service..."
cat > /etc/systemd/system/villaparis.service << SERVICEEOF
[Unit]
Description=Villa Paris Gestionale
Documentation=https://github.com/Dis-Astro/villa-paris-gestionale
After=network.target
$([ "$DB_TYPE" == "postgresql" ] && echo "After=postgresql.service")

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node $APP_DIR/.next/standalone/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=villaparis

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Alternative: use yarn start if standalone not available
if [[ ! -f "$APP_DIR/.next/standalone/server.js" ]]; then
    cat > /etc/systemd/system/villaparis.service << SERVICEEOF
[Unit]
Description=Villa Paris Gestionale
Documentation=https://github.com/Dis-Astro/villa-paris-gestionale
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/yarn start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=villaparis

[Install]
WantedBy=multi-user.target
SERVICEEOF
fi

log "Enabling and starting service..."
systemctl daemon-reload
systemctl enable villaparis
systemctl start villaparis

log "Waiting for service to start..."
sleep 5

if systemctl is-active --quiet villaparis; then
    log "✓ Service started successfully"
else
    log "✗ Service failed to start. Check: journalctl -u villaparis -n 50"
fi

log "Installation complete!"
echo ""
echo "=========================================="
echo "  VILLA PARIS GESTIONALE INSTALLED"
echo "=========================================="
echo ""
echo "  URL: http://$(hostname -I | awk '{print $1}'):$HTTP_PORT"
echo "  Database: $DB_TYPE"
echo ""
echo "  Commands:"
echo "    Status:  systemctl status villaparis"
echo "    Logs:    journalctl -u villaparis -f"
echo "    Restart: systemctl restart villaparis"
echo ""
echo "=========================================="
PROVISION_EOF

    # Replace placeholders
    sed -i "s|__REPO_URL__|$REPO_URL|g" "$provision_script"
    sed -i "s|__REPO_BRANCH__|$REPO_BRANCH|g" "$provision_script"
    sed -i "s|__HTTP_PORT__|$HTTP_PORT|g" "$provision_script"
    sed -i "s|__DB_TYPE__|$DB_TYPE|g" "$provision_script"

    # Copy and execute
    pct push "$CTID" "$provision_script" /root/provision.sh
    pct exec "$CTID" -- chmod +x /root/provision.sh
    pct exec "$CTID" -- bash /root/provision.sh

    rm -f "$provision_script"
    msg_ok "Provisioning complete"
}

# ==============================================================================
# FINAL OUTPUT
# ==============================================================================

show_result() {
    local ip
    ip=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
    
    clear
    echo ""
    echo -e "${GN}╔═══════════════════════════════════════════════════════════════╗${CL}"
    echo -e "${GN}║         VILLA PARIS GESTIONALE - INSTALLAZIONE COMPLETATA     ║${CL}"
    echo -e "${GN}╠═══════════════════════════════════════════════════════════════╣${CL}"
    echo -e "${GN}║${CL}                                                               ${GN}║${CL}"
    echo -e "${GN}║${CL}  Container ID:  ${YW}$CTID${CL}                                          ${GN}║${CL}"
    echo -e "${GN}║${CL}  Hostname:      ${YW}$HOSTNAME${CL}                                      ${GN}║${CL}"
    echo -e "${GN}║${CL}  IP Address:    ${YW}$ip${CL}                                  ${GN}║${CL}"
    echo -e "${GN}║${CL}  HTTP Port:     ${YW}$HTTP_PORT${CL}                                        ${GN}║${CL}"
    echo -e "${GN}║${CL}  Database:      ${YW}$DB_TYPE${CL}                                      ${GN}║${CL}"
    echo -e "${GN}║${CL}                                                               ${GN}║${CL}"
    echo -e "${GN}║${CL}  ${GN}URL: http://${ip}:${HTTP_PORT}${CL}                        ${GN}║${CL}"
    echo -e "${GN}║${CL}                                                               ${GN}║${CL}"
    echo -e "${GN}╠═══════════════════════════════════════════════════════════════╣${CL}"
    echo -e "${GN}║${CL}  Comandi utili:                                               ${GN}║${CL}"
    echo -e "${GN}║${CL}    pct enter $CTID                     # Entra nel container  ${GN}║${CL}"
    echo -e "${GN}║${CL}    systemctl status villaparis        # Stato servizio       ${GN}║${CL}"
    echo -e "${GN}║${CL}    journalctl -u villaparis -f        # Log in tempo reale   ${GN}║${CL}"
    echo -e "${GN}║${CL}                                                               ${GN}║${CL}"
    echo -e "${GN}╚═══════════════════════════════════════════════════════════════╝${CL}"
    echo ""
}

# ==============================================================================
# MAIN
# ==============================================================================

main() {
    header
    check_root
    check_proxmox
    download_template
    get_user_input
    create_container
    start_container
    wait_for_network
    provision_container
    show_result
}

main "$@"
