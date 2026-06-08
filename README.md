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
