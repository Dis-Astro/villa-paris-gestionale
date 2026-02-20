#!/usr/bin/env bash
# ==============================================================================
# VILLA PARIS GESTIONALE - PROXMOX LXC INSTALLER
# ==============================================================================
# One-liner: bash -c "$(curl -fsSL https://raw.githubusercontent.com/Dis-Astro/villa-paris-gestionale/main/proxmox/install-ct.sh)"
#
# Questo script:
# 1. Crea un container LXC su Proxmox VE
# 2. Installa Docker + Docker Compose nel container
# 3. Deploya Villa Paris Gestionale con PostgreSQL
# ==============================================================================

set -euo pipefail

# ==============================================================================
# CONFIGURAZIONE (override via env)
# ==============================================================================
CTID="${CTID:-}"                          # Auto-detect se vuoto
HOSTNAME="${CT_HOSTNAME:-villa-paris}"
CORES="${CT_CORES:-2}"
RAM="${CT_RAM:-2048}"
DISK="${CT_DISK:-16}"
BRIDGE="${CT_BRIDGE:-vmbr0}"
STORAGE="${CT_STORAGE:-}"                 # Auto-detect se vuoto
CT_IP="${CT_IP:-dhcp}"                    # "dhcp" o "192.168.1.100/24"
GATEWAY="${CT_GATEWAY:-}"                 # Richiesto solo se IP statico
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"

# Repository
REPO_URL="https://github.com/Dis-Astro/villa-paris-gestionale.git"
REPO_BRANCH="${REPO_BRANCH:-main}"

# Database defaults
DB_USER="${DB_USER:-villaparis}"
DB_PASS="${DB_PASS:-villaparis_$(date +%s | sha256sum | head -c 12)}"
DB_NAME="${DB_NAME:-villaparis}"

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# FUNZIONI UTILITY
# ==============================================================================

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
die()       { log_error "$1"; exit 1; }

header() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     VILLA PARIS GESTIONALE - PROXMOX LXC INSTALLER            ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ==============================================================================
# VERIFICA AMBIENTE
# ==============================================================================

check_proxmox() {
    log_info "Verifico ambiente Proxmox..."
    
    if [[ $EUID -ne 0 ]]; then
        die "Questo script deve essere eseguito come root sul nodo Proxmox"
    fi
    
    if ! command -v pct &> /dev/null; then
        die "Comando 'pct' non trovato. Esegui questo script su un nodo Proxmox VE."
    fi
    
    if ! command -v pvesm &> /dev/null; then
        die "Comando 'pvesm' non trovato. Ambiente Proxmox non valido."
    fi
    
    log_ok "Ambiente Proxmox VE rilevato"
}

# ==============================================================================
# AUTO-DETECT PARAMETRI
# ==============================================================================

get_next_ctid() {
    local max_id
    max_id=$(pct list 2>/dev/null | awk 'NR>1 {print $1}' | sort -n | tail -1)
    if [[ -z "$max_id" ]]; then
        echo "100"
    else
        echo $((max_id + 1))
    fi
}

detect_storage() {
    # Cerca storage LVM o directory con spazio disponibile
    local storage
    
    # Prova local-lvm prima
    if pvesm status | grep -q "local-lvm.*active"; then
        echo "local-lvm"
        return
    fi
    
    # Poi prova local
    if pvesm status | grep -q "local.*active"; then
        echo "local"
        return
    fi
    
    # Fallback: primo storage attivo
    storage=$(pvesm status | awk 'NR>1 && $2=="active" {print $1; exit}')
    if [[ -n "$storage" ]]; then
        echo "$storage"
        return
    fi
    
    die "Nessuno storage disponibile trovato"
}

# ==============================================================================
# DOWNLOAD TEMPLATE
# ==============================================================================

download_template() {
    local template_name="debian-12-standard_12.7-1_amd64.tar.zst"
    local template_path="${TEMPLATE_STORAGE}:vztmpl/${template_name}"
    
    log_info "Verifico template Debian 12..."
    
    if pveam list "$TEMPLATE_STORAGE" 2>/dev/null | grep -q "$template_name"; then
        log_ok "Template già presente"
    else
        log_info "Download template Debian 12 in corso..."
        pveam download "$TEMPLATE_STORAGE" "$template_name" || die "Download template fallito"
        log_ok "Template scaricato"
    fi
    
    echo "$template_path"
}

# ==============================================================================
# CREAZIONE CONTAINER
# ==============================================================================

create_container() {
    local template="$1"
    
    log_info "Creazione container LXC $CTID..."
    
    # Costruisci configurazione rete
    local net_config="name=eth0,bridge=${BRIDGE}"
    if [[ "$CT_IP" == "dhcp" ]]; then
        net_config="${net_config},ip=dhcp"
    else
        net_config="${net_config},ip=${CT_IP}"
        if [[ -n "$GATEWAY" ]]; then
            net_config="${net_config},gw=${GATEWAY}"
        fi
    fi
    
    # Crea container
    pct create "$CTID" "$template" \
        --hostname "$HOSTNAME" \
        --cores "$CORES" \
        --memory "$RAM" \
        --rootfs "${STORAGE}:${DISK}" \
        --net0 "$net_config" \
        --unprivileged 1 \
        --features nesting=1,keyctl=1 \
        --onboot 1 \
        --start 0 \
        || die "Creazione container fallita"
    
    log_ok "Container $CTID creato"
}

start_container() {
    log_info "Avvio container $CTID..."
    pct start "$CTID" || die "Avvio container fallito"
    
    # Attendi che sia pronto
    local attempts=0
    while ! pct status "$CTID" 2>/dev/null | grep -q "running"; do
        ((attempts++))
        if [[ $attempts -ge 30 ]]; then
            die "Timeout avvio container"
        fi
        sleep 1
    done
    
    log_ok "Container avviato"
}

wait_for_network() {
    log_info "Attendo connettività di rete..."
    
    local attempts=0
    while ! pct exec "$CTID" -- ping -c1 8.8.8.8 &>/dev/null; do
        ((attempts++))
        if [[ $attempts -ge 60 ]]; then
            die "Timeout connettività di rete"
        fi
        sleep 2
    done
    
    log_ok "Rete disponibile"
}

get_container_ip() {
    local ip
    # Prova più metodi per ottenere IP
    ip=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
    
    if [[ -z "$ip" ]]; then
        ip=$(pct exec "$CTID" -- ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}')
    fi
    
    echo "${ip:-UNKNOWN}"
}

# ==============================================================================
# PROVISIONING
# ==============================================================================

provision_container() {
    log_info "Provisioning container (questo può richiedere alcuni minuti)..."
    
    # Crea script di setup
    local setup_script="/tmp/ct-setup-${CTID}.sh"
    
    cat > "$setup_script" << 'SETUP_SCRIPT_EOF'
#!/bin/bash
set -euo pipefail

# Parametri passati
REPO_URL="__REPO_URL__"
REPO_BRANCH="__REPO_BRANCH__"
DB_USER="__DB_USER__"
DB_PASS="__DB_PASS__"
DB_NAME="__DB_NAME__"

APP_DIR="/opt/villa-paris"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

# ==============================================================================
# SETUP SISTEMA
# ==============================================================================

log "=== Aggiornamento sistema ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

log "=== Installazione dipendenze ==="
apt-get install -y -qq \
    curl \
    git \
    ca-certificates \
    gnupg \
    lsb-release

# ==============================================================================
# INSTALLAZIONE DOCKER
# ==============================================================================

log "=== Installazione Docker ==="

# Rimuovi vecchie versioni
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Aggiungi repository Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verifica installazione
docker --version || { log "ERRORE: Docker non installato"; exit 1; }
docker compose version || { log "ERRORE: Docker Compose non installato"; exit 1; }

log "Docker installato: $(docker --version)"

# ==============================================================================
# CLONE REPOSITORY
# ==============================================================================

log "=== Clone repository ==="

rm -rf "$APP_DIR"
git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

log "Repository clonato in $APP_DIR"

# ==============================================================================
# CONFIGURAZIONE AMBIENTE
# ==============================================================================

log "=== Configurazione ambiente ==="

# Crea .env
cat > "$APP_DIR/.env" << ENVFILE
# Villa Paris Gestionale - Configurazione
NODE_ENV=production

# PostgreSQL
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=${DB_NAME}

# Database URL per Prisma
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}?schema=public
ENVFILE

log ".env creato"

# Crea directory uploads
mkdir -p "$APP_DIR/public/uploads"
mkdir -p "$APP_DIR/public/planimetrie"
chmod -R 777 "$APP_DIR/public/uploads" "$APP_DIR/public/planimetrie"

log "Directory uploads create"

# ==============================================================================
# BUILD E AVVIO DOCKER
# ==============================================================================

log "=== Build Docker (questo richiede alcuni minuti) ==="
cd "$APP_DIR"
docker compose build --no-cache

log "=== Avvio servizi ==="
docker compose up -d

# Attendi che i servizi siano pronti
log "=== Attendo avvio servizi ==="
sleep 10

# Verifica stato
docker compose ps

# Verifica che l'app risponda
log "=== Verifica applicazione ==="
local attempts=0
local max_attempts=30

while [[ $attempts -lt $max_attempts ]]; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -qE "200|302|304"; then
        log "✓ Applicazione raggiungibile su porta 3000"
        break
    fi
    ((attempts++))
    log "Attendo avvio applicazione... ($attempts/$max_attempts)"
    sleep 5
done

if [[ $attempts -eq $max_attempts ]]; then
    log "⚠ Applicazione non risponde. Verifica con: docker compose logs"
fi

# ==============================================================================
# COMPLETAMENTO
# ==============================================================================

log ""
log "╔═══════════════════════════════════════════════════════════════╗"
log "║         INSTALLAZIONE COMPLETATA                              ║"
log "╠═══════════════════════════════════════════════════════════════╣"
log "║  Directory: $APP_DIR"
log "║  Database:  PostgreSQL (user: $DB_USER)"
log "║                                                               ║"
log "║  Comandi utili:                                               ║"
log "║    cd $APP_DIR && docker compose logs -f                      ║"
log "║    cd $APP_DIR && docker compose restart                      ║"
log "╚═══════════════════════════════════════════════════════════════╝"
log ""
SETUP_SCRIPT_EOF

    # Sostituisci placeholder
    sed -i "s|__REPO_URL__|${REPO_URL}|g" "$setup_script"
    sed -i "s|__REPO_BRANCH__|${REPO_BRANCH}|g" "$setup_script"
    sed -i "s|__DB_USER__|${DB_USER}|g" "$setup_script"
    sed -i "s|__DB_PASS__|${DB_PASS}|g" "$setup_script"
    sed -i "s|__DB_NAME__|${DB_NAME}|g" "$setup_script"

    # Copia ed esegui nel container
    pct push "$CTID" "$setup_script" /root/setup.sh
    pct exec "$CTID" -- chmod +x /root/setup.sh
    pct exec "$CTID" -- bash /root/setup.sh
    
    # Cleanup
    rm -f "$setup_script"
    
    log_ok "Provisioning completato"
}

# ==============================================================================
# OUTPUT FINALE
# ==============================================================================

show_result() {
    local ip
    ip=$(get_container_ip)
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║      VILLA PARIS GESTIONALE - INSTALLAZIONE COMPLETATA        ║${NC}"
    echo -e "${GREEN}╠═══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}                                                               ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  Container ID:    ${YELLOW}$CTID${NC}                                        ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  Hostname:        ${YELLOW}$HOSTNAME${NC}                                  ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  IP Address:      ${YELLOW}$ip${NC}                               ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  CPU Cores:       ${YELLOW}$CORES${NC}                                          ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  RAM:             ${YELLOW}${RAM}MB${NC}                                      ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  Disk:            ${YELLOW}${DISK}GB${NC}                                       ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                               ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ${GREEN}URL: http://${ip}:3000${NC}                             ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                               ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  Database:        PostgreSQL                                  ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  DB User:         ${YELLOW}$DB_USER${NC}                                   ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  DB Name:         ${YELLOW}$DB_NAME${NC}                                   ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                               ${GREEN}║${NC}"
    echo -e "${GREEN}╠═══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  Comandi utili:                                               ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    pct enter $CTID                    # Entra nel container   ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    pct stop $CTID                     # Ferma container       ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    pct start $CTID                    # Avvia container       ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                               ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  Nel container:                                               ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    cd /opt/villa-paris && docker compose logs -f              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}    cd /opt/villa-paris && docker compose restart              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                               ${GREEN}║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ==============================================================================
# MAIN
# ==============================================================================

main() {
    header
    check_proxmox
    
    # Auto-detect parametri mancanti
    if [[ -z "$CTID" ]]; then
        CTID=$(get_next_ctid)
        log_info "CTID auto-assegnato: $CTID"
    fi
    
    if [[ -z "$STORAGE" ]]; then
        STORAGE=$(detect_storage)
        log_info "Storage auto-rilevato: $STORAGE"
    fi
    
    # Mostra configurazione
    echo ""
    log_info "Configurazione:"
    echo "  CTID:     $CTID"
    echo "  Hostname: $HOSTNAME"
    echo "  Cores:    $CORES"
    echo "  RAM:      ${RAM}MB"
    echo "  Disk:     ${DISK}GB"
    echo "  Storage:  $STORAGE"
    echo "  Network:  $CT_IP"
    echo "  Branch:   $REPO_BRANCH"
    echo ""
    
    # Procedi con installazione
    local template
    template=$(download_template)
    
    create_container "$template"
    start_container
    wait_for_network
    provision_container
    
    show_result
}

# Esegui
main "$@"
