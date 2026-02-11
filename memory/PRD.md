# Villa Paris Gestionale - PRD

## Problema Originale
Applicazione gestionale per "Villa Paris" - location per wedding e eventi. Gestione completa di eventi, clienti, menu e disposizione sala.

## Stato: ✅ FUNZIONANTE (Feb 2025)

### Funzionalità Implementate e Testate

| Feature | Stato | Test |
|---------|-------|------|
| Dashboard con KPI | ✅ | Passato |
| Calendario Eventi | ✅ | Passato |
| Gestione Eventi CRUD | ✅ | Passato |
| Anagrafica Clienti | ✅ | Passato |
| Menu Base (template) | ✅ | Passato |
| Piantina Drag&Drop | ✅ | Passato |
| Varianti Alimentari | ✅ | Passato |
| Stampe PDF | ✅ | Passato |
| Versioning Eventi | ✅ | Passato |
| Blocco -10 giorni | ✅ | Passato |
| Report & Grafici | ✅ | Passato |
| Export Excel | ✅ | Passato |
| Impostazioni | ✅ | Passato |

### Architettura

```
/app
├── src/app/(app)/       # Pagine con layout AppShell
│   ├── dashboard/       # Homepage KPI
│   ├── calendario/      # Vista calendario
│   ├── eventi/          # Lista eventi
│   ├── clienti/         # Anagrafica
│   ├── menu-base/       # Template menu
│   ├── modifica-evento/ # Modifica evento
│   ├── piantina-evento/ # Disposizione sala
│   ├── nuovo-evento/    # Nuovo evento
│   ├── report/          # Reportistica
│   ├── stampe/          # Generazione PDF
│   └── impostazioni/    # Configurazione
├── src/app/api/         # API Routes
├── src/components/      # Componenti UI
│   ├── layout/          # AppShell
│   ├── nav/             # Sidebar, Topbar
│   └── stampe/          # PDF generation
├── prisma/              # Schema DB
└── scripts/             # Deploy Proxmox
```

### Stack Tecnologico
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Librerie**: pdfmake, exceljs, react-dnd, recharts, fullcalendar

### Test Report
- Backend: 12/12 test passati (100%)
- Frontend: Tutti i flussi verificati (100%)
- File test: `/app/test_reports/backend_test.py`

### Credenziali
- **Admin Override Token**: `VILLA-PARIS-ADMIN-2026`

### Deployment Proxmox
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/.../install-lxc.sh)
```

## Backlog (Priorità Bassa)
- [ ] Ripristino versione evento
- [ ] Issue doppio click tavoli sovrapposti
- [ ] Notifiche email
