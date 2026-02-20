#!/usr/bin/env bash
# ==============================================================================
# VILLA PARIS GESTIONALE - PROXMOX LXC INSTALLER
# ==============================================================================
# One-liner (esegui come root sul nodo Proxmox):
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/Dis-Astro/villa-paris-gestionale/main/proxmox/install-ct.sh)"
#
# Override parametri via variabili d'ambiente:
#   CTID=200 CT_RAM=4096 CT_IP=192.168.1.50/24 CT_GATEWAY=192.168.1.1 bash -c "$(curl ...)"
# ==============================================================================

set -euo pipefail

# ==============================================================================
# CONFIGURAZIONE (override via variabili d'ambiente)
# ==============================================================================
CTID="${CTID:-}"
CT_HOSTNAME="${CT_HOSTNAME:-villa-paris}"
CT_CORES="${CT_CORES:-2}"
CT_RAM="${CT_RAM:-2048}"
CT_DISK="${CT_DISK:-16}"
CT_BRIDGE="${CT_BRIDGE:-vmbr0}"
CT_STORAGE="${CT_STORAGE:-}"
CT_IP="${CT_IP:-dhcp}"
CT_GATEWAY="${CT_GATEWAY:-}"
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"

REPO_URL="${REPO_URL:-https://github.com/Dis-Astro/villa-paris-gestionale.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"

DB_USER="${DB_USER:-villaparis}"
DB_PASS="${DB_PASS:-$(tr -dc 'a-zA-Z0-9' </dev/urandom 2>/dev/null | head -c 16 || echo "villaparis_changeme")}"
DB_NAME="${DB_NAME:-villaparis}"

# ==============================================================================
# COLORI E LOG
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $*" >&2; }
log_ok()    { echo -e "${GREEN}[ OK ]${NC} $*" >&2; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_error() { echo -e "${RED}[ERR ]${NC} $*" >&2; }
die()       { log_error "$*"; exit 1; }

# Variante stdout per valori di ritorno (usare SOLO in funzioni catturate con $())
# Nessun log su stdout => zero contaminazione della command substitution

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
    [[ $EUID -ne 0 ]] && die "Esegui come root sul nodo Proxmox"
    command -v pct   &>/dev/null || die "'pct' non trovato. Esegui su un nodo Proxmox VE."
    command -v pvesm &>/dev/null || die "'pvesm' non trovato. Ambiente Proxmox non valido."
    log_ok "Proxmox VE rilevato"
}

# ==============================================================================
# AUTO-DETECT PARAMETRI
# ==============================================================================
get_next_ctid() {
    local max_id
    max_id=$(pct list 2>/dev/null | awk 'NR>1 {print $1}' | sort -n | tail -1)
    echo $(( ${max_id:-99} + 1 ))
}

detect_storage() {
    local s
    for s in local-lvm local; do
        pvesm status 2>/dev/null | awk '{print $1}' | grep -qx "$s" && echo "$s" && return 0
    done
    s=$(pvesm status 2>/dev/null | awk 'NR>1 && $2=="active" {print $1; exit}')
    [[ -n "$s" ]] && echo "$s" && return 0
    die "Nessuno storage disponibile trovato"
}

# ==============================================================================
# TEMPLATE
# ==============================================================================
download_template() {
    local name="debian-12-standard_12.7-1_amd64.tar.zst"
    log_info "Verifico template Debian 12..."
    if ! pveam list "$TEMPLATE_STORAGE" 2>/dev/null | grep -q "$name"; then
        log_info "Download template in corso (può richiedere qualche minuto)..."
        # stdout di pveam redirect su stderr: questa funzione viene catturata con $()
        pveam download "$TEMPLATE_STORAGE" "$name" >&2 || die "Download template fallito"
    fi
    log_ok "Template pronto: $name"
    # UNICO stdout: il path del template (usato da pct create)
    echo "${TEMPLATE_STORAGE}:vztmpl/${name}"
}

# ==============================================================================
# CREAZIONE CONTAINER
# ==============================================================================
create_container() {
    local template="$1"
    log_info "Creazione container LXC $CTID..."

    local net_config="name=eth0,bridge=${CT_BRIDGE}"
    if [[ "$CT_IP" == "dhcp" ]]; then
        net_config+=",ip=dhcp"
    else
        net_config+=",ip=${CT_IP}"
        [[ -n "$CT_GATEWAY" ]] && net_config+=",gw=${CT_GATEWAY}"
    fi

    pct create "$CTID" "$template" \
        --hostname  "$CT_HOSTNAME" \
        --cores     "$CT_CORES" \
        --memory    "$CT_RAM" \
        --rootfs    "${CT_STORAGE}:${CT_DISK}" \
        --net0      "$net_config" \
        --unprivileged 1 \
        --features  nesting=1,keyctl=1 \
        --onboot    1 \
        --start     0 \
        || die "Creazione container fallita"

    log_ok "Container $CTID creato (nesting=1, keyctl=1)"
}

start_container() {
    log_info "Avvio container $CTID..."
    pct start "$CTID" || die "Avvio container fallito"

    local i=0
    until pct status "$CTID" 2>/dev/null | grep -q "running"; do
        i=$((i + 1))
        [[ $i -ge 30 ]] && die "Timeout avvio container (30s)"
        sleep 1
    done
    log_ok "Container in esecuzione"
}

wait_for_network() {
    log_info "Attendo connettività di rete nel container..."
    local i=0
    until pct exec "$CTID" -- ping -c1 -W2 8.8.8.8 &>/dev/null; do
        i=$((i + 1))
        [[ $i -ge 60 ]] && die "Timeout connettività di rete (120s)"
        sleep 2
    done
    log_ok "Rete disponibile"
}

get_container_ip() {
    local ip
    ip=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
    if [[ -z "$ip" ]]; then
        ip=$(pct exec "$CTID" -- ip -4 addr show eth0 2>/dev/null \
             | grep -oP '(?<=inet\s)\d+(\.\d+){3}')
    fi
    echo "${ip:-UNKNOWN}"
}

# ==============================================================================
# PROVISIONING
# ==============================================================================
provision_container() {
    log_info "Provisioning container (richiede ~5-10 min)..."

    # 1. Recupera ct-setup.sh: prima cerca nella stessa directory, poi scarica da GitHub
    local setup_src
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo /tmp)"

    if [[ -f "${script_dir}/ct-setup.sh" ]]; then
        setup_src="${script_dir}/ct-setup.sh"
        log_info "Uso ct-setup.sh locale: $setup_src"
    else
        log_info "Download ct-setup.sh da GitHub..."
        curl -fsSL \
            "https://raw.githubusercontent.com/Dis-Astro/villa-paris-gestionale/${REPO_BRANCH}/proxmox/ct-setup.sh" \
            -o /tmp/vp-ct-setup-$$.sh \
            || die "Download ct-setup.sh fallito"
        setup_src="/tmp/vp-ct-setup-$$.sh"
    fi

    # 2. Scrivi file di configurazione sicuro (evita problemi con caratteri speciali negli args)
    local conf_file="/tmp/vp-install-conf-$$.sh"
    cat > "$conf_file" <<CONFEOF
REPO_URL="${REPO_URL}"
REPO_BRANCH="${REPO_BRANCH}"
DB_USER="${DB_USER}"
DB_PASS="${DB_PASS}"
DB_NAME="${DB_NAME}"
CONFEOF

    # 3. Push dei file nel container
    pct push "$CTID" "$conf_file"  /root/vp-install.conf
    pct push "$CTID" "$setup_src"  /root/ct-setup.sh
    pct exec "$CTID" -- chmod +x /root/ct-setup.sh

    # 4. Esegui lo script di setup
    pct exec "$CTID" -- bash /root/ct-setup.sh

    # 5. Cleanup file temporanei (host e container)
    rm -f "$conf_file" "/tmp/vp-ct-setup-$$.sh"
    pct exec "$CTID" -- rm -f /root/vp-install.conf /root/ct-setup.sh

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
    echo -e "${GREEN}║     VILLA PARIS GESTIONALE - INSTALLAZIONE COMPLETATA         ║${NC}"
    echo -e "${GREEN}╠═══════════════════════════════════════════════════════════════╣${NC}"
    printf "${GREEN}║${NC}  Container ID   : ${YELLOW}%-44s${GREEN}║${NC}\n" "$CTID"
    printf "${GREEN}║${NC}  IP Address     : ${YELLOW}%-44s${GREEN}║${NC}\n" "$ip"
    printf "${GREEN}║${NC}  URL App        : ${YELLOW}%-44s${GREEN}║${NC}\n" "http://${ip}:3000"
    printf "${GREEN}║${NC}  DB User        : ${YELLOW}%-44s${GREEN}║${NC}\n" "$DB_USER"
    printf "${GREEN}║${NC}  DB Password    : ${YELLOW}%-44s${GREEN}║${NC}\n" "$DB_PASS"
    printf "${GREEN}║${NC}  DB Name        : ${YELLOW}%-44s${GREEN}║${NC}\n" "$DB_NAME"
    echo -e "${GREEN}╠═══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Comandi utili:                                               ║${NC}"
    printf "${GREEN}║${NC}    pct enter %-51s${GREEN}║${NC}\n" "$CTID"
    echo -e "${GREEN}║    cd /opt/villa-paris && docker compose logs -f              ║${NC}"
    echo -e "${GREEN}║    cd /opt/villa-paris && docker compose restart              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ==============================================================================
# MAIN
# ==============================================================================
main() {
    header
    check_proxmox

    [[ -z "$CTID" ]]        && CTID=$(get_next_ctid)       && log_info "CTID auto-assegnato: $CTID"
    [[ -z "$CT_STORAGE" ]]  && CT_STORAGE=$(detect_storage) && log_info "Storage auto-rilevato: $CT_STORAGE"

    echo ""
    log_info "Configurazione:"
    echo "  CTID:     $CTID      | Hostname: $CT_HOSTNAME"
    echo "  Cores:    $CT_CORES   | RAM: ${CT_RAM}MB | Disk: ${CT_DISK}GB"
    echo "  Storage:  $CT_STORAGE  | Network: $CT_IP"
    echo "  Branch:   $REPO_BRANCH"
    echo ""

    local template
    template=$(download_template)

    create_container "$template"
    start_container
    wait_for_network
    provision_container
    show_result
}

main "$@"
