#!/usr/bin/env bash
# ==============================================================================
# VILLA PARIS GESTIONALE - CONTAINER SETUP SCRIPT
# ==============================================================================
# Questo script viene eseguito DENTRO il container LXC da install-ct.sh.
# Legge la configurazione da /root/vp-install.conf (push dal nodo Proxmox).
# Può anche essere eseguito manualmente dentro un container già esistente.
#
# Configurazione manuale (senza install-ct.sh):
#   REPO_URL=... REPO_BRANCH=main DB_USER=... DB_PASS=... DB_NAME=... bash ct-setup.sh
# ==============================================================================

set -euo pipefail

# ==============================================================================
# CONFIGURAZIONE
# ==============================================================================

# Carica conf file se presente (push da install-ct.sh)
CONFIG_FILE="/root/vp-install.conf"
if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
fi

# Valori di default (override da config file o variabili d'ambiente)
REPO_URL="${REPO_URL:-https://github.com/Dis-Astro/villa-paris-gestionale.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
DB_USER="${DB_USER:-villaparis}"
DB_PASS="${DB_PASS:-villaparis}"
DB_NAME="${DB_NAME:-villaparis}"
APP_DIR="/opt/villa-paris"

# ==============================================================================
# LOG
# ==============================================================================
log() { echo "[$(date '+%H:%M:%S')] $*"; }
die() { log "ERRORE FATALE: $*"; exit 1; }

# ==============================================================================
# 1. AGGIORNAMENTO SISTEMA
# ==============================================================================
log "=== [1/6] Aggiornamento sistema ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

log "=== Installazione dipendenze base ==="
apt-get install -y -qq \
    curl \
    git \
    ca-certificates \
    gnupg

# ==============================================================================
# 2. INSTALLAZIONE DOCKER
# ==============================================================================
log "=== [2/6] Installazione Docker CE ==="

# Rimuovi versioni precedenti (ignora errori se non presenti)
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Aggiungi chiave GPG Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Aggiungi repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -qq
apt-get install -y -qq \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

# Abilita e avvia Docker
systemctl enable --now docker

# Verifica
docker --version    || die "Docker non installato correttamente"
docker compose version || die "Docker Compose plugin non installato"
log "Docker installato: $(docker --version)"

# ==============================================================================
# 3. CLONE REPOSITORY
# ==============================================================================
log "=== [3/6] Clone repository ==="
rm -rf "$APP_DIR"
git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$APP_DIR" \
    || die "Clone repository fallito (URL: $REPO_URL, branch: $REPO_BRANCH)"
log "Repository clonato in $APP_DIR"

# ==============================================================================
# 4. CONFIGURAZIONE .env
# ==============================================================================
log "=== [4/6] Configurazione .env ==="

cat > "$APP_DIR/.env" <<ENVEOF
NODE_ENV=production

# PostgreSQL
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=${DB_NAME}

# Prisma (database URL deve puntare al servizio 'db' di docker-compose)
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}?schema=public
ENVEOF

# Crea directory per upload file
mkdir -p "$APP_DIR/public/uploads" "$APP_DIR/public/planimetrie"
chmod -R 777 "$APP_DIR/public/uploads" "$APP_DIR/public/planimetrie"

log ".env creato, directory uploads configurate"

# ==============================================================================
# 5. BUILD E AVVIO
# ==============================================================================
log "=== [5/6] Build Docker (può richiedere 5-10 minuti) ==="
cd "$APP_DIR"
docker compose build --no-cache

log "=== Avvio servizi ==="
docker compose up -d

# Attendi avvio iniziale
sleep 15
docker compose ps

# ==============================================================================
# 6. HEALTHCHECK
# ==============================================================================
log "=== [6/6] Healthcheck applicazione su :3000 ==="
attempts=0
max_attempts=36  # 6 minuti totali (36 x 10s)

while [[ $attempts -lt $max_attempts ]]; do
    http_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000 2>/dev/null || echo "000")
    case "$http_status" in
        200|301|302|304)
            log "Applicazione risponde correttamente (HTTP $http_status)"
            break
            ;;
        000)
            log "  Attendo avvio... ($((attempts + 1))/$max_attempts, nessuna risposta)"
            ;;
        *)
            log "  Attendo avvio... ($((attempts + 1))/$max_attempts, HTTP $http_status)"
            ;;
    esac
    attempts=$((attempts + 1))
    sleep 10
done

if [[ $attempts -eq $max_attempts ]]; then
    log "ATTENZIONE: L'applicazione non risponde dopo $((max_attempts * 10))s."
    log "  Verifica con: cd $APP_DIR && docker compose logs app"
    log "  (Potrebbe ancora essere in avvio - riprova tra qualche minuto)"
else
    log "Healthcheck superato."
fi

# ==============================================================================
# RIEPILOGO
# ==============================================================================
log ""
log "╔═══════════════════════════════════════════════════════════════╗"
log "║         SETUP CONTAINER COMPLETATO                            ║"
log "╠═══════════════════════════════════════════════════════════════╣"
log "║  Directory app : $APP_DIR"
log "║  Porta         : 3000"
log "║  DB User       : $DB_USER"
log "║  DB Name       : $DB_NAME"
log "║                                                               ║"
log "║  Comandi utili:                                               ║"
log "║    cd $APP_DIR && docker compose logs -f"
log "║    cd $APP_DIR && docker compose restart"
log "║    cd $APP_DIR && docker compose ps"
log "╚═══════════════════════════════════════════════════════════════╝"
log ""
