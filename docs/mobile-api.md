# API mobile Villa Paris — versione 1

Base URL produzione: `https://gestionale.villaparis.it`

Tutte le risposte usano JSON. Le route protette richiedono:

```http
Authorization: Bearer <accessToken>
Accept: application/json
```

## Autenticazione

### Login

`POST /api/v1/mobile/auth/login`

```json
{
  "email": "utente@example.com",
  "password": "...",
  "deviceName": "iPhone di Utente"
}
```

Restituisce `accessToken`, `refreshToken`, le rispettive scadenze e l'utente. Il refresh token deve essere conservato esclusivamente nel Keychain.

### Rinnovo

`POST /api/v1/mobile/auth/refresh`

```json
{
  "refreshToken": "...",
  "deviceName": "iPhone di Utente"
}
```

Il rinnovo ruota il refresh token: quello precedente diventa immediatamente inutilizzabile. Se due richieste tentano di usare contemporaneamente lo stesso token, soltanto una può riuscire.

### Logout

`POST /api/v1/mobile/auth/logout`, autenticata, con il refresh token nel corpo. Revoca la sessione del dispositivo.

## Avvio applicazione

`GET /api/v1/mobile/bootstrap`

Restituisce utente, ruolo, capacità e feature disponibili. L'app deve usare queste capacità per mostrare l'interfaccia, mentre il server continua sempre ad applicare i permessi effettivi.

## Calendario

`GET /api/v1/mobile/calendar?from=<ISO8601>&to=<ISO8601>`

Restituisce eventi confermati e appuntamenti nel periodo. Il periodo predefinito va da 7 giorni fa a 90 giorni nel futuro; una singola richiesta non può superare un anno.

## Compatibilità

Le API web esistenti continuano a usare il cookie `vp_token`. Le stesse route applicative possono ora ricevere anche il Bearer token mobile, ma le nuove integrazioni native devono preferire `/api/v1/mobile` per avere un contratto stabile e payload ridotti.

Errori delle API mobili:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Messaggio leggibile"
  }
}
```
