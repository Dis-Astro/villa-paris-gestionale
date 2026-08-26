# Villa Paris per iOS

Base nativa SwiftUI collegata alle API versionate del gestionale. La webapp resta il backend e continua a funzionare normalmente.

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

In Xcode selezionare il proprio Team in **Signing & Capabilities**. L'URL di produzione è configurato in `project.yml` tramite `API_BASE_URL`; usare un file di configurazione separato prima di collegare un ambiente di sviluppo.

## API utilizzate

- `POST /api/v1/mobile/auth/login`
- `POST /api/v1/mobile/auth/refresh`
- `POST /api/v1/mobile/auth/logout`
- `GET /api/v1/mobile/bootstrap`
- `GET /api/v1/mobile/calendar`

Access token e refresh token vengono conservati nel Keychain. Il client rinnova una volta la sessione dopo una risposta `401` e, se il rinnovo fallisce, torna al login.

## Prima della compilazione

Il server deve essere aggiornato e la migrazione Prisma deve essere applicata con `npx prisma db push` oppure durante la normale procedura di deploy.
