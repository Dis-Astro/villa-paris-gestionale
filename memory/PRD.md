# Villa Paris Gestionale - PRD

## Problem Statement
Sistema gestionale per Villa Paris, location per eventi.
**NON è un ristorante** - servizio simultaneo, menu prestabiliti, nessun controllo live.

Il sistema serve per:
- Preparazione pre-evento
- Gestione menu, piantina, varianti per tavolo
- Produzione PDF contrattuali/operativi
- Tracciamento versioni (anti-contestazione)

## Tech Stack
- **Frontend**: Next.js 15 (App Router)
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **PDF**: pdfmake (client-side)
- **UI**: Tailwind CSS + shadcn/ui

## User Personas
1. **Organizzatore Evento**: Gestisce menu, piantina, varianti
2. **Staff Cucina**: Utilizza PDF operativi con riepilogo varianti
3. **Cliente**: Riceve PDF contrattuale per approvazione

## Core Requirements (Static)
- [x] CRUD Eventi
- [x] Gestione Menu (portate + varianti)
- [x] Piantina drag&drop con varianti per tavolo
- [x] Stampe PDF (Cliente + Operativo)
- [x] Sistema versioni anti-contestazione
- [x] Blocco automatico -10 giorni + override admin

---

## Implementation Status

### ✅ STEP 1 - Modelli Dati (Completato)
- File: `/src/lib/types/index.ts`
- VariantId tipizzato (11 varianti operative)
- Snapshot versione completo
- Utility functions (calcolaInfoBlocco, calcolaRiepilogoVarianti)

### ✅ STEP 2 - Menu Evento (Completato)
- Route: `/app/(app)/eventi/[id]/menu/page.tsx`
- CRUD portate con ordine
- Selezione varianti attive per evento
- Salvataggio su API esistente

### ✅ STEP 3 - Varianti per Tavolo (Completato)
- Componente: `/src/components/PannelloVariantiTavolo.tsx`
- Double-click tavolo → pannello varianti
- Input quantità +/- per variante
- Badge numero varianti + colore predominante
- Riepilogo varianti in header piantina

### ✅ STEP 4 - Stampe PDF (Completato)
- Files: `/src/lib/stampa/`
- PDF Cliente: copertina, menu, piantina pulita, firme
- PDF Operativo: riepilogo varianti, piantina dettagliata, fogli servizio
- Watermark: BOZZA / CONTRATTO / DEFINITIVO
- Header/footer con versione e data stampa

### ✅ STEP 5 - Versioning (Completato)
- Model: `VersioneEvento` (Prisma)
- API: `/api/versioni` (GET lista, POST crea)
- Snapshot JSON completo con hash
- AUTO_PRE_STAMPA per ogni stampa cliente

### ✅ STEP 6 - Blocco -10 Giorni (Completato)
- Utility: `/src/lib/blocco-evento.ts`
- Campi bloccati: menu, note, disposizioneSala, struttura
- Risposta 423 Locked con dettagli
- Override via headers (token + motivo)
- UI: BannerBlocco + Modal Override
- Log override in DB

---

## Backlog (P2)
- [ ] Issue double-click tavoli sovrapposti (minor)
- [ ] Restore versione precedente
- [ ] Export/import eventi
- [ ] Multi-utente con ruoli

## How to Test

### Blocco -10 giorni:
1. Vai a `/modifica-evento/3` (evento bloccato)
2. Vedi banner arancione "Evento Bloccato"
3. Tenta salvataggio → errore 423
4. Click "Override" → inserisci token `VILLA-PARIS-ADMIN-2026` + motivo (min 10 char)
5. Salvataggio funziona

### Stampa PDF:
1. Vai a `/modifica-evento/1`
2. Click "🖨️ Stampa Documenti"
3. Seleziona watermark + genera PDF
