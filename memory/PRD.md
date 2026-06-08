# Villa Paris Gestionale - PRD

## Problema Originale
Gestionale full-stack per Villa Paris per gestione eventi, clienti, appuntamenti, calendario, planimetrie, menu, reportistica e presenze in villa.

## Architettura
- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes (App Router)
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **Auth**: JWT custom con cookie httpOnly (ruoli: ADMIN, REPORT, WORKER)
- **Google Calendar**: googleapis npm, OAuth2 con auto-refresh tokens
- **Meteo**: Open-Meteo API (gratuita)

## Funzionalita' implementate

### FASE 1-3 (Completate)
- Gestione Contatti/Appuntamenti/Eventi, Calendario, Dashboard, Auth JWT, Reportistica

### FASE 4 - v2.0.0 (Completata)
- Meteo automatico rapportini, Quick-fill visitatori, Tavolo Imperiale, Piano B planimetrie

### FASE 5 - Google Calendar (Completata + Fix)
- OAuth2 Connect con redirect a dominio produzione (gestionale.villaparis.it)
- Sync automatico eventi (con dataConfermata O dateProposte come fallback)
- Sync automatico appuntamenti (creazione/modifica/cancellazione)
- Rilevamento modifiche esterne + validazione admin
- Token refresh esplicito con gestione invalid_grant
- Pulsante Riconnetti per token scaduti

### Fix Google Calendar (Applicati)
- **Redirect OAuth**: Ora usa NEXT_PUBLIC_APP_URL invece di req.url (risolveva 0.0.0.0:3000)
- **Eventi non visibili**: Usa dateProposte come fallback quando dataConfermata e' null
- **Date tutto il giorno**: End date = giorno successivo (requisito Google Calendar API)
- **Duplicazione**: gcalEventId tracciato e controllato prima di creare nuovi eventi
- **Sync alla creazione**: Aggiunta auto-sync su POST eventi (prima solo PUT/DELETE)
- **Parsing dateProposte**: dbJsonParse applicato in sync route e auto-sync helper
- **Credenziali login**: Rimosse dal form (campi vuoti)

## Dominio produzione
- URL: https://gestionale.villaparis.it
- OAuth Callback: https://gestionale.villaparis.it/api/oauth/google-calendar/callback

## Credenziali di test
- Admin: admin@villaparis.local / Admin123!
- Worker: worker.check@villaparis.local / Worker123!

## Backlog
- (P2) Preset schemi tavoli per fasce di invitati
- (P2) Preset menu per tipologia evento
- (P2) Fix warning Recharts nei grafici
