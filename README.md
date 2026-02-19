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

# Start con Docker
docker compose up -d

# App disponibile su http://localhost:3000
```

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
