// src/types/piantina.ts
// Tipi legacy per compatibilità con componenti esistenti.
// Per nuovi sviluppi, usare /lib/types/index.ts

export type Tavolo = {
  id: number
  numero: string
  posti: number
  posizione: { xPerc: number; yPerc: number } // Coordinate in percentuale
  rotazione?: number
  forma?: string // 'rotondo', 'rettangolare', ecc
  dimensionePerc: number // Percentuale rispetto a larghezza container
  
  // NUOVO: varianti alimentari per questo tavolo
  // Record<variantId, quantità> - es: { "vegetariano": 2, "celiaco": 1 }
  varianti?: Record<string, number>
  
  // Note specifiche per il tavolo
  note?: string
  
  [key: string]: any
}

export type Stazione = {
  id: number
  nome: string
  tipo?: string
  posizione: { xPerc: number; yPerc: number } // Coordinate in percentuale
  rotazione?: number
  dimensionePerc: {
    larghezzaPerc: number // Percentuale rispetto a larghezza container
    altezzaPerc: number   // Percentuale rispetto ad altezza container
  }
  [key: string]: any
}
