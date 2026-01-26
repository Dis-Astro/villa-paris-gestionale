/**
 * VILLA PARIS GESTIONALE - MODELLI DATI
 * =====================================
 * Tipi TypeScript per il sistema di gestione eventi.
 * 
 * REGOLE:
 * - Vietate stringhe libere per varianti (usare sempre VariantId)
 * - Snapshot versione = evento completo serializzato
 * - ID stabili e operativi (usabili direttamente in cucina/stampa)
 */

// ============================================
// VARIANTI - Dizionario Centrale con Tipizzazione Forte
// ============================================

/**
 * ID varianti operativi - tipizzazione forte.
 * Questi ID sono usabili direttamente in cucina e stampe.
 */
export const VARIANT_IDS = [
  'vegetariano',
  'vegano', 
  'senza_glutine',
  'senza_lattosio',
  'senza_uova',
  'senza_frutta_secca',
  'senza_crostacei',
  'senza_pesce',
  'menu_bambino',
  'kosher',
  'halal'
] as const

/**
 * Tipo derivato dal dizionario - garantisce type-safety.
 */
export type VariantId = typeof VARIANT_IDS[number]

/**
 * Variante alimentare/dietetica.
 * Definita centralmente, referenziata per VariantId ovunque.
 */
export interface Variante {
  id: VariantId                 // ID operativo (es: "senza_glutine", "vegetariano")
  nome: string                  // Nome visualizzato per UI
  nomeStampa: string            // Nome breve per stampe/cucina
  colore: string                // Colore per UI (hex)
  attiva: boolean               // Se disponibile per selezione
}

/**
 * Dizionario varianti: Record<VariantId, Variante>
 * Usato come fonte unica di verità per tutte le varianti.
 */
export type DizionarioVarianti = Record<VariantId, Variante>

/**
 * Varianti predefinite del sistema - ID operativi per cucina/stampa.
 */
export const VARIANTI_DEFAULT: DizionarioVarianti = {
  vegetariano: {
    id: 'vegetariano',
    nome: 'Vegetariano',
    nomeStampa: 'VEGET',
    colore: '#22c55e',
    attiva: true
  },
  vegano: {
    id: 'vegano',
    nome: 'Vegano',
    nomeStampa: 'VEGAN',
    colore: '#16a34a',
    attiva: true
  },
  senza_glutine: {
    id: 'senza_glutine',
    nome: 'Senza Glutine',
    nomeStampa: 'NO GLUT',
    colore: '#f59e0b',
    attiva: true
  },
  senza_lattosio: {
    id: 'senza_lattosio',
    nome: 'Senza Lattosio',
    nomeStampa: 'NO LATT',
    colore: '#3b82f6',
    attiva: true
  },
  senza_uova: {
    id: 'senza_uova',
    nome: 'Senza Uova',
    nomeStampa: 'NO UOVA',
    colore: '#8b5cf6',
    attiva: true
  },
  senza_frutta_secca: {
    id: 'senza_frutta_secca',
    nome: 'Senza Frutta Secca',
    nomeStampa: 'NO FRUT.SEC',
    colore: '#ec4899',
    attiva: true
  },
  senza_crostacei: {
    id: 'senza_crostacei',
    nome: 'Senza Crostacei',
    nomeStampa: 'NO CROST',
    colore: '#ef4444',
    attiva: true
  },
  senza_pesce: {
    id: 'senza_pesce',
    nome: 'Senza Pesce',
    nomeStampa: 'NO PESCE',
    colore: '#06b6d4',
    attiva: true
  },
  menu_bambino: {
    id: 'menu_bambino',
    nome: 'Menu Bambino',
    nomeStampa: 'BAMBINO',
    colore: '#a855f7',
    attiva: true
  },
  kosher: {
    id: 'kosher',
    nome: 'Kosher',
    nomeStampa: 'KOSHER',
    colore: '#6366f1',
    attiva: true
  },
  halal: {
    id: 'halal',
    nome: 'Halal',
    nomeStampa: 'HALAL',
    colore: '#14b8a6',
    attiva: true
  }
}

// ============================================
// PORTATE E MENU (strutture opzionali)
// ============================================

/**
 * Singolo piatto all'interno di una portata.
 * Struttura opzionale per menu dettagliati.
 */
export interface Piatto {
  id: string                    // ID univoco
  nome: string                  // Nome del piatto
  descrizione?: string          // Descrizione opzionale
  variantiDisponibili?: VariantId[] // Array di VariantId disponibili per questo piatto
}

/**
 * Portata del menu (antipasto, primo, secondo, etc.)
 */
export interface Portata {
  id: string                    // ID univoco
  nome: string                  // Nome portata (es: "Antipasto", "Primo")
  ordine: number                // Ordine di servizio (1, 2, 3...)
  piatti?: Piatto[]             // Piatti inclusi (opzionale)
  descrizione?: string          // Testo libero per menu semplici
}

/**
 * Menu completo dell'evento.
 */
export interface MenuEvento {
  portate: Portata[]            // Lista ordinata delle portate
  variantiAttive: VariantId[]   // VariantId attivi per questo evento
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
 * Varianti per tavolo - tipizzazione forte con VariantId.
 */
export type VariantiTavolo = Partial<Record<VariantId, number>>

/**
 * Tavolo con supporto varianti per ospite.
 * Compatibile con API esistente (disposizioneSala).
 */
export interface TavoloEvento {
  id: number
  numero: string                          // Nome/numero tavolo
  posti: number                           // Numero posti
  posizione: PosizionePercentuale
  rotazione?: number
  forma?: 'rotondo' | 'rettangolare' | 'quadrato' | string
  dimensionePerc: number
  
  // Varianti per questo tavolo: Record<VariantId, quantità>
  varianti?: VariantiTavolo
  
  // Note specifiche per il tavolo
  note?: string
}

/**
 * Stazione di servizio (buffet, bar, etc.)
 * Struttura opzionale.
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
 * Nome coerente con API esistente: disposizioneSala
 */
export interface DisposizioneSala {
  tavoli: TavoloEvento[]
  stazioni?: StazioneEvento[]             // Opzionale
  immagine?: string                       // Base64 o URL della planimetria
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
