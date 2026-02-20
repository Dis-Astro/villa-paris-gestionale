# Villa Paris Gestionale - PRD

## Problema originale
Sistema gestionale per location eventi (matrimoni, battesimi, feste).
L'utente vuole un'applicazione finita, pulita e facilmente deployabile.

## Target
Gestori di Villa Paris (location eventi).

## Requisiti implementati

### UI & Layout
- [x] Layout AppShell (sidebar + topbar) unificato su tutte le pagine
- [x] Navigazione coerente tra dashboard, calendario, eventi, clienti, report

### Funzionalità Core
- [x] Dashboard con KPI e statistiche
- [x] Calendario eventi con appuntamenti rapidi (1-click)
- [x] Gestione eventi CRUD completa
- [x] Menu Base - template con selezione piatti
- [x] Piantina sala - drag & drop con varianti alimentari
- [x] Stampe PDF - contratti e documenti operativi
- [x] Report con export Excel
- [x] Versioning - snapshot anti-contestazione
- [x] Blocco automatico modifiche a -10 giorni

### Database & Backend
- [x] Migrazione da SQLite a PostgreSQL
- [x] Prisma ORM con schema aggiornato
- [x] Singleton client Prisma per connessioni efficienti
- [x] Migrazioni SQL versionate

### Deploy & Infrastructure
- [x] Dockerfile multi-stage per Next.js 15
- [x] docker-compose.yml con variabili d'ambiente (no credenziali hardcoded)
- [x] docker/entrypoint.sh per migrazioni automatiche all'avvio
- [x] .env.example completo
- [x] Script Proxmox one-liner (install-ct.sh + ct-setup.sh)
- [x] Bug fix: stdout contaminato in download_template → tutti i log su stderr (>&2)
- [x] GitHub Actions CI/CD deploy automatico (.github/workflows/deploy.yml)

### Pulizia & Standardizzazione
- [x] Rimossi tutti i riferimenti a "Emergent"
- [x] Standardizzato su npm (rimosso yarn.lock)
- [x] .gitignore pulito
- [x] Struttura file organizzata

## Architettura

```
/app
├── docker/
│   └── entrypoint.sh         # Migrazioni DB all'avvio
├── prisma/
│   ├── migrations/
│   └── schema.prisma          # Schema PostgreSQL
├── proxmox/
│   ├── install-ct.sh          # Installer Proxmox (crea LXC, push ct-setup.sh)
│   └── ct-setup.sh            # Setup container (Docker, clone, .env, build, up)
├── public/uploads/
├── src/
│   ├── app/
│   │   ├── (app)/             # Pagine con layout AppShell
│   │   └── api/               # API Routes Next.js
│   ├── components/layout/
│   │   └── AppShell.tsx
│   └── lib/
│       └── prisma.ts          # Singleton Prisma client
├── .env.example
├── docker-compose.yml         # Usa ${POSTGRES_USER:-default}
├── Dockerfile
└── README.md
```

## Stack Tecnologico
- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Next.js API Routes
- Database: PostgreSQL 16 + Prisma ORM
- Deploy: Docker, Docker Compose, Bash (Proxmox LXC)
- Librerie: pdfmake, exceljs, react-dnd, recharts, FullCalendar

## Backlog P0/P1/P2

### P1 - Upcoming
- [ ] Pagina Impostazioni (attualmente placeholder)
- [ ] Ripristino versione evento (API + UI button)

### P2 - Backlog
- [ ] CRUD Clienti migliorato
- [ ] Fix doppio click su tavoli sovrapposti nella piantina

## One-Liner Proxmox
```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Dis-Astro/villa-paris-gestionale/main/proxmox/install-ct.sh)"
```
