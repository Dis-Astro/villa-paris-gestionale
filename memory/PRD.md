# Villa Paris Gestionale - PRD

## Problema Originale
Completare un'applicazione di gestione eventi per "Villa Paris" (location per wedding e eventi). L'applicazione deve permettere la gestione completa degli eventi, clienti, menu e disposizione sala.

## Requisiti Implementati

### STEP 1-6 (Completati)
1. ✅ **Modelli Dati**: Tipi TypeScript definiti in `/src/lib/types/index.ts`
2. ✅ **Menu Evento**: Gestione CRUD portate e varianti (`/eventi/[id]/menu`)
3. ✅ **Varianti per Tavolo**: Piantina drag&drop con varianti alimentari
4. ✅ **Stampe PDF**: Generazione PDF client-side con pdfmake (watermark, versioning)
5. ✅ **Versioning**: Snapshot immutabili degli eventi per anti-contestazione
6. ✅ **Blocco automatico**: Impedisce modifiche a -10 giorni con override admin

### Fase 2 (Completata - Feb 2025)
7. ✅ **DevOps Proxmox LXC**: Script one-liner per deploy su container Proxmox
8. ✅ **UI/UX Rework**: Layout AppShell unificato (sidebar + topbar) per tutte le pagine
9. ✅ **Report & Grafici**: Modulo reportistica con export Excel e grafici ricavi
10. ✅ **Menu Base**: Sistema template menu con checkbox per selezione piatti

## Architettura

```
/app
├── prisma/schema.prisma          # Schema DB (SQLite dev, PostgreSQL prod)
├── src/
│   ├── app/
│   │   ├── (app)/                # Pagine protette con AppShell
│   │   │   ├── dashboard/        # Homepage con KPI
│   │   │   ├── calendario/       # Vista calendario eventi
│   │   │   ├── eventi/           # Lista e gestione eventi
│   │   │   ├── clienti/          # Anagrafica clienti
│   │   │   ├── menu-base/        # Template menu predefiniti
│   │   │   ├── modifica-evento/  # Modifica singolo evento
│   │   │   ├── piantina-evento/  # Disposizione sala drag&drop
│   │   │   ├── nuovo-evento/     # Creazione nuovo evento
│   │   │   ├── report/           # Reportistica e grafici
│   │   │   ├── stampe/           # Generazione documenti PDF
│   │   │   └── impostazioni/     # Configurazione sistema
│   │   └── api/                  # API Routes Next.js
│   └── components/
│       ├── layout/AppShell.tsx   # Layout principale
│       ├── nav/Sidebar.tsx       # Navigazione laterale
│       ├── VillaPiantina.tsx     # Canvas piantina sala
│       └── stampe/MenuStampa.tsx # Modale generazione PDF
├── scripts/
│   ├── proxmox/install-lxc.sh    # Installer Proxmox
│   └── lxc/provision.sh          # Provisioning LXC
└── package.json
```

## Stack Tecnologico
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM con SQLite (dev) / PostgreSQL (prod)
- **Librerie**: pdfmake (PDF), exceljs (Excel), react-dnd (D&D), recharts (grafici)

## Stato Attuale (Feb 2025)

### ✅ Completato
- Unificazione UI con AppShell su tutte le pagine
- Sistema Menu Base con selezione piatti tramite checkbox
- Pagina Impostazioni funzionante
- Navigazione calendario sistemata
- Tutte le pagine accessibili dalla sidebar
- Test al 100% passati

### 📋 Backlog (Priorità Bassa)
- Issue doppio click su tavoli sovrapposti nella piantina
- Ripristino versione evento (attualmente solo creazione snapshot)
- Integrazione con sistema di notifiche email

## Credenziali Test
- **Admin Override Token**: `VILLA-PARIS-ADMIN-2026` (per bypassare blocco -10 giorni)

## Note Deployment
- Lo script Proxmox è in `/scripts/proxmox/install-lxc.sh`
- Comando: `bash <(curl -fsSL https://raw.githubusercontent.com/.../install-lxc.sh)`
- Il database di produzione deve essere PostgreSQL
