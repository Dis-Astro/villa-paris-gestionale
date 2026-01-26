/**
 * VILLA PARIS GESTIONALE - MODELLI DATI
 * =====================================
 * Tipi TypeScript per il sistema di gestione eventi.
 * 
 * REGOLE:
 * - Vietate stringhe libere per varianti (usare sempre variantId)
 * - Snapshot versione = evento completo serializzato
 * - ID stabili per tutte le entità
 */

// ============================================
// VARIANTI - Dizionario Centrale
// ============================================

/**
 * Variante alimentare/dietetica.
 * Definita centralmente, referenziata per ID ovunque.
 */
export interface Variante {
  id: string                    // ID stabile (es: "vegetariano", "celiaco", "lattosio")
  nome: string                  // Nome visualizzato
  colore?: string               // Colore per UI (hex)
  icona?: string                // Icona opzionale
  descrizione?: string          // Descrizione estesa
  attiva: boolean               // Se disponibile per selezione
}

/**
 * Dizionario varianti: Record<variantId, Variante>
 * Usato come fonte unica di verità per tutte le varianti.
 */
export type DizionarioVarianti = Record<string, Variante>

/**
 * Varianti predefinite del sistema.
 */
export const VARIANTI_DEFAULT: DizionarioVarianti = {
  vegetariano: {
    id: 'vegetariano',
    nome: 'Vegetariano',
    colore: '#22c55e',
    icona: '🥬',
    attiva: true
  },
  vegano: {
    id: 'vegano',
    nome: 'Vegano',
    colore: '#16a34a',
    icona: '🌱',
    attiva: true
  },
  celiaco: {
    id: 'celiaco',
    nome: 'Celiaco/Gluten-free',
    colore: '#f59e0b',
    icona: '🌾',
    attiva: true
  },
  lattosio: {
    id: 'lattosio',
    nome: 'Intolleranza Lattosio',
    colore: '#3b82f6',
    icona: '🥛',
    attiva: true
  },
  allergie: {
    id: 'allergie',
    nome: 'Altre Allergie',
    colore: '#ef4444',
    icona: '⚠️',
    attiva: true
  },
  bambino: {
    id: 'bambino',
    nome: 'Menu Bambino',
    colore: '#a855f7',
    icona: '👶',
    attiva: true
  },
  kosher: {
    id: 'kosher',
    nome: 'Kosher',
    colore: '#6366f1',
    icona: '✡️',
    attiva: true
  },
  halal: {
    id: 'halal',
    nome: 'Halal',
    colore: '#14b8a6',
    icona: '☪️',
    attiva: true
  }
}

// ============================================
// PORTATE E MENU
// ============================================

/**
 * Singolo piatto all'interno di una portata.
 */
export interface Piatto {
  id: string                    // ID univoco
  nome: string                  // Nome del piatto
  descrizione?: string          // Descrizione opzionale
  variantiDisponibili: string[] // Array di variantId disponibili per questo piatto
}

/**
 * Portata del menu (antipasto, primo, secondo, etc.)
 */
export interface Portata {
  id: string                    // ID univoco
  nome: string                  // Nome portata (es: "Antipasto", "Primo")
  ordine: number                // Ordine di servizio (1, 2, 3...)
  piatti: Piatto[]              // Piatti inclusi nella portata
}

/**
 * Menu completo dell'evento.
 */
export interface MenuEvento {
  portate: Portata[]            // Lista ordinata delle portate
  variantiAttive: string[]      // variantId attivi per questo evento
  note?: string                 // Note generali sul menu
}

// ============================================
// PIANTINA E TAVOLI
// ============================================

/**
 * Posizione in coordinate percentuali (0-1).
 */
export interface PosizionePercentuale {
  xPerc: number
  yPerc: number
}

/**
 * Dimensione percentuale per stazioni.
 */
export interface DimensionePercentuale {
  larghezzaPerc: number
  altezzaPerc: number
}

/**
 * Tavolo con supporto varianti per ospite.
 * Estende il tipo esistente aggiungendo varianti.
 */
export interface TavoloEvento {
  id: number
  numero: string                          // Nome/numero tavolo
  posti: number                           // Numero posti
  posizione: PosizionePercentuale
  rotazione?: number
  forma?: 'rotondo' | 'rettangolare' | 'quadrato'
  dimensionePerc: number
  
  // NUOVO: varianti per questo tavolo
  // Record<variantId, quantità>
  varianti: Record<string, number>
  
  // Note specifiche per il tavolo
  note?: string
}

/**
 * Stazione di servizio (buffet, bar, etc.)
 */
export interface StazioneEvento {
  id: number
  nome: string
  tipo?: string
  posizione: PosizionePercentuale
  rotazione?: number
  dimensionePerc: DimensionePercentuale
}

/**
 * Disposizione completa della sala.
 */
export interface DisposizioneSala {
  tavoli: TavoloEvento[]
  stazioni: StazioneEvento[]
  immagine?: string               // Base64 o URL della planimetria
}

// ============================================
// EVENTO
// ============================================

/**
 * Stati possibili dell'evento.
 */
export type StatoEvento = 
  | 'bozza'
  | 'in_attesa'
  | 'confermato'
  | 'bloccato'
  | 'completato'
  | 'annullato'

/**
 * Fasce orarie evento.
 */
export type FasciaEvento = 'pranzo' | 'cena' | 'intera_giornata'

/**
 * Tipo di evento.
 */
export type TipoEvento = 
  | 'matrimonio'
  | 'battesimo'
  | 'comunione'
  | 'cresima'
  | 'compleanno'
  | 'anniversario'
  | 'aziendale'
  | 'altro'

/**
 * Cliente associato all'evento.
 */
export interface ClienteEvento {
  id: number
  nome: string
  cognome: string
  email?: string
  telefono?: string
}

/**
 * Evento completo - modello principale.
 */
export interface Evento {
  id: number
  titolo: string
  tipo: TipoEvento
  stato: StatoEvento
  
  // Date
  dataConfermata?: Date | string
  dateProposte?: string[]
  fascia: FasciaEvento
  
  // Dettagli
  personePreviste?: number
  note?: string
  
  // Relazioni
  clienti: ClienteEvento[]
  
  // Contenuti strutturati
  menu?: MenuEvento
  disposizioneSala?: DisposizioneSala
  
  // Metadata
  createdAt: Date | string
  updatedAt: Date | string
  
  // Blocco
  bloccato?: boolean
  bloccatoOverride?: {
    data: string
    utente: string
    commento: string
  }
}

// ============================================
// VERSIONI - Sistema Anti-Contestazione
// ============================================

/**
 * Tipo di versione/stampa generata.
 */
export type TipoVersione = 
  | 'bozza'           // Versione di lavoro
  | 'contratto'       // Inviato al cliente per approvazione
  | 'definitivo'      // Versione finale confermata

/**
 * Tipo di documento generato.
 */
export type TipoDocumento =
  | 'pacchetto_cliente'    // PDF completo per cliente
  | 'operativo_piantina'   // Solo piantina per staff
  | 'operativo_servizio'   // Fogli servizio per staff

/**
 * Versione dell'evento - snapshot immutabile.
 */
export interface VersioneEvento {
  id: string                      // UUID versione
  eventoId: number                // Riferimento evento
  
  // Metadata versione
  numero: number                  // Numero progressivo (v1, v2, v3...)
  tipo: TipoVersione
  tipoDocumento: TipoDocumento
  
  // Snapshot completo dell'evento al momento della creazione
  snapshot: Omit<Evento, 'id' | 'createdAt' | 'updatedAt'>
  
  // Audit
  createdAt: string               // ISO timestamp
  createdBy?: string              // Utente che ha creato
  commento?: string               // Commento obbligatorio per override
  
  // Hash per verifica integrità (opzionale)
  hash?: string
}

/**
 * Informazioni di blocco automatico (-10 giorni).
 */
export interface InfoBlocco {
  isBloccato: boolean
  dataEvento: Date | string
  giorniMancanti: number
  puoModificare: boolean          // false se bloccato senza override
  richiedeOverride: boolean       // true se serve commento admin
  ultimoOverride?: {
    data: string
    utente: string
    commento: string
  }
}

// ============================================
// STAMPA PDF
// ============================================

/**
 * Watermark per i documenti PDF.
 */
export type WatermarkPDF = 'BOZZA' | 'CONTRATTO' | 'DEFINITIVO'

/**
 * Opzioni per generazione PDF.
 */
export interface OpzioniPDF {
  tipoDocumento: TipoDocumento
  watermark: WatermarkPDF
  includiVersione: boolean
  includiDataStampa: boolean
  includiNote: boolean
}

/**
 * Header standard per documenti PDF.
 */
export interface HeaderPDF {
  titoloEvento: string
  dataEvento: string
  tipoEvento: string
  cliente: string
  numeroVersione: number
  dataOraStampa: string
  watermark: WatermarkPDF
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Risultato conteggio varianti per evento.
 */
export interface RiepilogoVarianti {
  totaleOspiti: number
  perVariante: Record<string, number>   // variantId -> count
  tavoliConVarianti: number
}

/**
 * Helper per validare che un ID variante esista.
 */
export function isValidVariantId(
  id: string, 
  dizionario: DizionarioVarianti = VARIANTI_DEFAULT
): boolean {
  return id in dizionario && dizionario[id].attiva
}

/**
 * Calcola riepilogo varianti da disposizione sala.
 */
export function calcolaRiepilogoVarianti(
  disposizione?: DisposizioneSala
): RiepilogoVarianti {
  const result: RiepilogoVarianti = {
    totaleOspiti: 0,
    perVariante: {},
    tavoliConVarianti: 0
  }
  
  if (!disposizione?.tavoli) return result
  
  for (const tavolo of disposizione.tavoli) {
    result.totaleOspiti += tavolo.posti
    
    if (tavolo.varianti && Object.keys(tavolo.varianti).length > 0) {
      result.tavoliConVarianti++
      
      for (const [variantId, count] of Object.entries(tavolo.varianti)) {
        if (count > 0) {
          result.perVariante[variantId] = (result.perVariante[variantId] || 0) + count
        }
      }
    }
  }
  
  return result
}

/**
 * Verifica se l'evento è bloccato (< 10 giorni).
 */
export function calcolaInfoBlocco(evento: Evento): InfoBlocco {
  const now = new Date()
  const dataEvento = evento.dataConfermata 
    ? new Date(evento.dataConfermata) 
    : null
  
  if (!dataEvento) {
    return {
      isBloccato: false,
      dataEvento: '',
      giorniMancanti: Infinity,
      puoModificare: true,
      richiedeOverride: false
    }
  }
  
  const diffMs = dataEvento.getTime() - now.getTime()
  const giorniMancanti = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const isBloccato = giorniMancanti <= 10 && giorniMancanti > 0
  
  return {
    isBloccato,
    dataEvento,
    giorniMancanti,
    puoModificare: !isBloccato || !!evento.bloccatoOverride,
    richiedeOverride: isBloccato,
    ultimoOverride: evento.bloccatoOverride
  }
}
