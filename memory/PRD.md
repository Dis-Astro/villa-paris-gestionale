# Villa Paris Gestionale - PRD

## Problem Statement
Sistema gestionale per Villa Paris, location per eventi.
**NON è un ristorante** - servizio simultaneo, menu prestabiliti, nessun controllo live.

Il sistema serve per:
- Preparazione pre-evento
- Gestione menu, piantina, varianti per tavolo
- Produzione PDF contrattuali/operativi
- Tracciamento versioni (anti-contestazione)
- Report aziendali ed export Excel

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + Recharts
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **PDF**: pdfmake (client-side)
- **Excel**: exceljs
- **UI**: Tailwind CSS + shadcn/ui
- **Deploy**: LXC Proxmox installer

## User Personas
1. **Organizzatore Evento**: Gestisce menu, piantina, varianti
2. **Staff Cucina**: Utilizza PDF operativi con riepilogo varianti
3. **Cliente**: Riceve PDF contrattuale per approvazione
4. **Admin**: Report aziendali, export Excel

---

## Implementation Status

### ✅ STEP 1-6 - Core Gestionale (Completato)
- Modelli dati TypeScript
- CRUD Menu Evento
- Varianti per Tavolo
- Stampe PDF (Cliente + Operativo)
- Versioning anti-contestazione
- Blocco -10 giorni + Override

### ✅ DevOps - LXC Proxmox Installer (Completato)
- `scripts/proxmox/install-lxc.sh` - One-liner installer
- `scripts/lxc/provision.sh` - Provisioning script
- `scripts/lxc/villaparis.service` - systemd unit
- `README_LXC.md` - Documentazione completa

### ✅ UI/UX - AppShell + Sidebar (Completato)
- `src/components/layout/AppShell.tsx`
- `src/components/nav/Sidebar.tsx`
- `src/components/nav/Topbar.tsx`
- Dashboard con KPI cards
- Navigazione responsive mobile-first

### ✅ Report Azienda + Excel (Completato)
- `src/app/(app)/report/azienda/page.tsx`
- `src/app/api/report/azienda.xlsx/route.ts`
- `src/app/api/report/stats/route.ts`
- Grafici: Ricavi, Eventi, Ospiti per mese
- Export PNG grafici
- Campi evento estesi: sposa, sposo, luogo, prezzo, menuPasto, menuBuffet

---

## Quick Reference

### One-liner Proxmox Install
```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Dis-Astro/villa-paris-gestionale/develop/scripts/proxmox/install-lxc.sh)"
```

### Override Token (blocco -10gg)
```
VILLA-PARIS-ADMIN-2026
```

### Test URLs
- Dashboard: `/dashboard`
- Report: `/report/azienda`
- Excel: `/api/report/azienda.xlsx`

---

## Backlog
- [ ] Issue double-click tavoli sovrapposti (P2)
- [ ] Restore versione precedente
- [ ] Multi-utente con ruoli
- [ ] PDF report grafici
