# Villa Paris Gestionale

Gestionale operativo per Villa Paris: eventi, clienti, appuntamenti, rapportini interni, planimetrie, menu, stampe PDF e report.

## Funzionalita principali

- Dashboard con KPI operativi
- Calendario eventi e appuntamenti
- Gestione completa eventi/clienti/appuntamenti
- Rapportini interni con presenze in villa e meteo
- Menu base e selezione piatti
- Piantina sala con drag and drop
- Stampe PDF ed export Excel
- Report aziendali e storico eventi
- Autenticazione con ruoli Admin, Report e Worker

## Avvio locale

Prerequisiti:

- Node.js 20+
- PostgreSQL 16+ oppure SQLite per sviluppo locale

```bash
npm ci
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

App disponibile su [http://localhost:3000](http://localhost:3000).

## Avvio produzione

```bash
npm ci
npm run build
npm run start
```

`npm run start` avvia il server Next.js di produzione. Per lo sviluppo usa `npm run dev`.

## Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Configura almeno `JWT_SECRET` con un valore lungo e casuale. Se pubblichi l'app in HTTPS, imposta anche:

```env
NEXT_PUBLIC_APP_URL="https://tuo-dominio.it"
COOKIE_SECURE="true"
```

## Variabili ambiente

| Variabile | Descrizione |
| --- | --- |
| `DATABASE_URL` | Connection string del database |
| `JWT_SECRET` | Segreto per firmare i token di login |
| `JWT_EXPIRES_HOURS` | Durata sessione in ore |
| `COOKIE_SECURE` | `true` solo con HTTPS |
| `NEXT_PUBLIC_APP_URL` | URL pubblico dell'app |
| `GOOGLE_CLIENT_ID` | Opzionale, OAuth Google Calendar |
| `GOOGLE_CLIENT_SECRET` | Opzionale, OAuth Google Calendar |
| `CALENDAR_SYNC_SECRET` | Token Bearer per l’importazione automatica Google Calendar |
| `CALENDAR_SYNC_INTERVAL_SECONDS` | Frequenza del controllo automatico, predefinita a 300 secondi |
| `AI_ENABLED` | Abilita l’analisi AI server-side |
| `AI_CONFIG_ENCRYPTION_KEY` | Segreto per cifrare la chiave AI salvata dal pannello; se assente usa `JWT_SECRET` |
| `AI_API_KEY` | Chiave del provider AI, mai esposta al browser |
| `AI_BASE_URL` | Endpoint Responses API; predefinito OpenAI |
| `AI_MODEL` | Modello usato per analisi e correzioni |
| `AI_AUTO_APPLY` | Applica automaticamente solo correzioni sopra soglia |
| `AI_MIN_CONFIDENCE` | Soglia di applicazione automatica, predefinita a 0.90 |
| `AI_INCLUDE_PERSONAL_DATA` | Consente l’invio di email e telefoni al provider |
| `AI_TOOL_SECRET` | Token separato per collegare un agente AI esterno |
| `AI_TOOLS_WRITE_ENABLED` | Abilita creazioni e modifiche tramite gateway AI |

## Importazione automatica Google Calendar

La sincronizzazione è bidirezionale. Ogni voce creata o modificata direttamente su
Google Calendar viene importata nel gestionale come evento o appuntamento. Titolo,
date, orari, durata, luogo, note, invitati, recapiti e numero di ospiti vengono
estratti anche da descrizioni non strutturate. Il payload Google originale resta
archiviato nel registro `GoogleCalendarImport`.

Con Docker Compose il servizio `calendar-sync` esegue già il controllo ogni 5 minuti.
È sufficiente valorizzare `CALENDAR_SYNC_SECRET`. Per installazioni diverse da
Docker Compose configura un cron HTTP verso:

```text
GET https://tuo-dominio.it/api/google-calendar/import
Authorization: Bearer valore_di_CALENDAR_SYNC_SECRET
```

Con PM2 puoi mantenere attivo lo stesso controllo come processo separato:

```bash
pm2 start npm --name villa-calendar-sync -- run start:calendar-sync
pm2 save
```

La prima esecuzione legge tutto il calendario; le successive usano il sync token
incrementale di Google. Per forzare una nuova scansione completa usa `?full=1`.

## Controllore AI dei dati

Il gestionale supporta la Responses API di OpenAI e provider compatibili configurabili
dalla schermata **Impostazioni > Controllore AI** oppure tramite variabili ambiente.
La chiave salvata dall’interfaccia viene cifrata sul server e non viene mai restituita
al browser. L’AI analizza ogni nuova importazione Calendar, completa i campi
ricavabili, segnala contraddizioni e propone correzioni. Non riceve accesso diretto al
database: restituisce un output JSON vincolato e il server applica esclusivamente una
lista consentita di campi.

Con `AI_AUTO_APPLY=false` tutte le modifiche richiedono approvazione Admin. Con
`AI_AUTO_APPLY=true` vengono applicate automaticamente soltanto quando il modello
indica che i dati sono supportati dal testo originale, la classificazione coincide e
l’affidabilità supera `AI_MIN_CONFIDENCE`. Ogni operazione resta registrata in
`AiOperation`. I dati personali vengono oscurati salvo
`AI_INCLUDE_PERSONAL_DATA=true`.

Un agente esterno può leggere lo schema degli strumenti da
`GET /api/ai/tools` e invocarli con `POST /api/ai/tools`, autenticandosi con
`Authorization: Bearer <AI_TOOL_SECRET>`. Il gateway permette ricerca, lettura,
controllo qualità, inserimento e modifica di clienti, eventi e appuntamenti.
Le scritture restano bloccate finché `AI_TOOLS_WRITE_ENABLED` non viene impostato
esplicitamente a `true`; ogni scrittura richiede una motivazione e genera un audit log.

## Stack

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL / SQLite dev
- pdfmake, jsPDF, ExcelJS
- FullCalendar, Recharts, React DnD

## Comandi utili

```bash
npm run dev
npm run build
npm run start
npm run db:push
npm run prisma:generate
```

## Note operative

Il progetto usa API Routes Next.js come backend principale. La cartella `backend/` contiene solo un proxy HTTP legacy/opzionale per installazioni che espongono la porta 8001.
