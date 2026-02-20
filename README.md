# Villa Paris Gestionale

Sistema gestionale per location eventi (matrimoni, battesimi, feste).

## Funzionalità

- **Dashboard** con KPI e statistiche
- **Calendario Eventi** con appuntamenti rapidi (1 click)
- **Gestione Eventi** completa (CRUD)
- **Menu Base** - template menu con selezione piatti
- **Piantina Sala** - drag & drop con varianti alimentari
- **Stampe PDF** - contratti e documenti operativi
- **Report** con export Excel
- **Versioning** - snapshot anti-contestazione
- **Blocco automatico** - protezione modifiche a -10 giorni

## Quick Start con Docker

```bash
# Clone repository
git clone https://github.com/Dis-Astro/villa-paris-gestionale.git
cd villa-paris-gestionale

# (Opzionale) Configura credenziali personalizzate
cp .env.example .env
# Modifica .env con le tue password

# Start con Docker
docker compose up -d

# App disponibile su http://localhost:3000
```

## Deploy su Proxmox VE (One-Liner)

Esegui questo comando come **root** direttamente sul nodo Proxmox:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Dis-Astro/villa-paris-gestionale/main/proxmox/install-ct.sh)"
```

Lo script in automatico:
1. Crea un container LXC Debian 12 (con `nesting=1` e `keyctl=1` per Docker)
2. Installa Docker CE + Docker Compose plugin
3. Clona il repository
4. Crea il file `.env` con credenziali sicure casuali
5. Fa il build e avvia l'applicazione con `docker compose`
6. Stampa IP e URL dell'applicazione al termine

### Parametri personalizzabili (variabili d'ambiente)

```bash
CTID=200 \
CT_RAM=4096 \
CT_DISK=20 \
CT_IP=192.168.1.50/24 \
CT_GATEWAY=192.168.1.1 \
DB_PASS=mia_password_sicura \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Dis-Astro/villa-paris-gestionale/main/proxmox/install-ct.sh)"
```

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `CTID` | auto | ID container LXC |
| `CT_HOSTNAME` | `villa-paris` | Hostname del container |
| `CT_CORES` | `2` | CPU cores |
| `CT_RAM` | `2048` | RAM in MB |
| `CT_DISK` | `16` | Disco in GB |
| `CT_BRIDGE` | `vmbr0` | Bridge di rete |
| `CT_IP` | `dhcp` | IP statico o `dhcp` |
| `CT_GATEWAY` | — | Gateway (solo con IP statico) |
| `DB_USER` | `villaparis` | Utente PostgreSQL |
| `DB_PASS` | casuale | Password PostgreSQL |
| `DB_NAME` | `villaparis` | Nome database |
| `REPO_BRANCH` | `main` | Branch Git da clonare |

## Setup Locale (Development)

### Prerequisiti
- Node.js 20+
- PostgreSQL 16+

### Installazione

```bash
# Installa dipendenze
npm ci

# Configura ambiente
cp .env.example .env
# Modifica .env con i tuoi dati PostgreSQL

# Genera Prisma client e applica migrazioni
npx prisma generate
npx prisma migrate dev

# Avvia in development
npm run dev
```

## Variabili Ambiente

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| DATABASE_URL | Connection string PostgreSQL | postgresql://user:pass@localhost:5432/db |
| NODE_ENV | Ambiente | production / development |

## Stack Tecnologico

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **PDF**: pdfmake
- **Excel**: exceljs
- **Calendar**: FullCalendar
- **Charts**: Recharts

## Struttura Progetto

```
├── src/
│   ├── app/
│   │   ├── (app)/          # Pagine con layout AppShell
│   │   └── api/            # API Routes
│   ├── components/         # Componenti React
│   └── lib/                # Utilities e Prisma client
├── prisma/
│   ├── schema.prisma       # Schema database
│   └── migrations/         # Migrazioni SQL
├── public/                 # Asset statici
├── docker/                 # Docker entrypoint
├── Dockerfile
└── docker-compose.yml
```

## Comandi Utili

```bash
# Development
npm run dev

# Build produzione
npm run build
npm run start

# Prisma
npx prisma studio      # GUI database
npx prisma migrate dev # Nuova migrazione
npx prisma db push     # Sync schema (dev only)

# Docker
docker compose up -d      # Start
docker compose down       # Stop
docker compose logs -f    # Logs
```

## License

MIT
