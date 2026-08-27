# Villa Paris per iOS

App iOS/iPadOS collegata alle API versionate del gestionale. Su iPad apre lo spazio di lavoro completo, incluse planimetrie e funzioni operative; su iPhone mantiene l'esperienza nativa essenziale per consultazione e calendario. La webapp resta il backend e continua a funzionare normalmente.

## Requisiti sul Mac

- macOS con Xcode aggiornato
- iOS 17 come deployment target minimo
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)
- un account Apple Developer per installazione su dispositivi e distribuzione

## Prima apertura

```bash
cd ios
xcodegen generate
open VillaParis.xcodeproj
```

In Xcode selezionare il proprio Team in **Signing & Capabilities** per un dispositivo fisico. La configurazione Debug usa `http://localhost:3000` nel Simulator, mentre la Release usa `https://gestionale.villaparis.it`.

Su iPad la WebView ricorda l'ultima schermata utilizzata. La webapp conserva in locale le planimetrie in lavorazione, mette in coda i salvataggi effettuati senza rete e li invia al server alla riapertura o al ritorno della connessione. Le modifiche contemporanee da PC e iPad non vengono sovrascritte automaticamente: l'utente sceglie quale versione mantenere.

## API utilizzate

- `POST /api/v1/mobile/auth/login`
- `POST /api/v1/mobile/auth/refresh`
- `POST /api/v1/mobile/auth/logout`
- `GET /api/v1/mobile/bootstrap`
- `GET /api/v1/mobile/calendar`

Access token e refresh token vengono conservati nel Keychain. Il client rinnova una volta la sessione dopo una risposta `401` e, se il rinnovo fallisce, torna al login.

## Prima della compilazione

Il server deve essere aggiornato e la migrazione Prisma deve essere applicata con `npx prisma db push` oppure durante la normale procedura di deploy.
