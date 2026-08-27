# Beta iPad e app installabile

Questa beta mantiene il gestionale Next.js come applicazione completa e lo rende installabile dalla schermata Home di iPad. In questo modo tutte le funzioni continuano a usare lo stesso backend, lo stesso database, gli stessi ruoli e le stesse integrazioni di `https://gestionale.villaparis.it`.

## Copertura funzionale verificata

| Area | Funzioni mantenute nella beta |
| --- | --- |
| Accesso | Login protetto, ruoli Admin/Report/Worker, sessione e logout |
| Dashboard | KPI, funnel, attività operatori, prossimi eventi e filtri |
| Calendario | Eventi, appuntamenti, spostamento date e gestione rapida |
| Eventi | Creazione, modifica, eliminazione, clienti collegati, blocco a 10 giorni e override |
| Appuntamenti | Funnel, contatti, note, opzioni, registrazioni audio e analisi |
| Clienti | Anagrafica, contatti multipli, spam, storico e interazioni |
| Menu | Menu base, piatti, varianti, menu evento e upload |
| Planimetrie | Libreria, Piano A/B, tavoli rotondi e imperiali, stazioni, varianti, copia schema, PNG, PDF e stampa |
| Operatività | Rapportini interni, presenze in villa, suggerimenti e meteo |
| Controllo | Versioni, storico, audit log, utenti e permessi |
| Report | Report operativo/eventi, grafici, PDF ed export Excel |
| Integrazioni | Google Calendar bidirezionale, import, verifica modifiche, rollback e AI server-side |

## Novità del workspace planimetrie

- trascinamento diretto con mouse, Apple Pencil o dito, senza attesa da pressione prolungata;
- area di contatto minima per selezionare comodamente anche i tavoli piccoli;
- tavola immersiva a tutto schermo, aperta automaticamente quando si entra nella planimetria;
- zoom gestuale dal 70% al 325% con pizzico a due dita e spostamento della tavola con due dita, senza pulsanti `+`/`−`;
- doppio tocco sullo spazio vuoto per ricentrare la tavola e griglia magnetica opzionale;
- cronologia locale con annulla/ripeti fino a 40 passaggi;
- inspector separato per nome, posti, rotazione, posizione, duplicazione, varianti ed eliminazione;
- spostamento di precisione dal pannello contestuale o con le frecce della tastiera;
- avviso per modifiche non salvate e scorciatoia `⌘S`;
- bozza automatica locale dopo ogni modifica, conservata anche chiudendo l'app;
- coda di invio offline con sincronizzazione automatica al ritorno della rete;
- stato sempre visibile: bozza locale, in attesa, sincronizzazione, sincronizzato o conflitto;
- protezione dalle modifiche contemporanee fra PC e iPad, con scelta esplicita della versione da mantenere;
- salvataggio del Piano B con il nome campo corretto, mantenendo compatibilità con i client precedenti.

## Installazione su iPad

1. Aprire il gestionale in Safari.
2. Toccare **Condividi**.
3. Scegliere **Aggiungi alla schermata Home**.
4. Aprire **Villa Paris** dalla nuova icona.

L'app usa la modalità standalone e conserva le stesse API del sito. Le schermate e i dati di consultazione già aperti vengono mantenuti nella cache del dispositivo. Per la planimetria, ogni modifica viene salvata in un archivio locale e una pressione su **Salva** senza rete crea una coda che viene trasmessa automaticamente quando la connessione ritorna. I dati restano nell'area privata dell'app/browser e bozze, cache operative e ultima schermata vengono eliminate automaticamente al logout.

Se lo stesso evento viene modificato su PC e iPad, il server rifiuta la sovrascrittura automatica e conserva la bozza locale. L'operatore può quindi scegliere tra la versione del server e quella del dispositivo.

## Smartphone

Sotto i 768 px la navigazione principale si riduce a Oggi, Calendario, Eventi e azione rapida. Il menu laterale espone soltanto le sezioni essenziali; ruoli e permessi del server restano comunque l'autorità finale.

## Distribuzione

La beta web può essere pubblicata con la procedura Docker/Next.js già esistente, senza cambiare dominio o callback Google. L'app in `ios/` apre su iPad il gestionale completo e ricorda l'ultima schermata utilizzata; in Release punta a `https://gestionale.villaparis.it`. Le modifiche puramente web diventano disponibili dopo il deploy del server, mentre le modifiche Swift richiedono una nuova compilazione/TestFlight.
