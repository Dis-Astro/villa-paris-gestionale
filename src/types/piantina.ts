// src/types/piantina.ts

export type Tavolo = {
  id: number
  numero: string
  posti: number
  posizione: { xPerc: number; yPerc: number } // Coordinate in percentuale
  rotazione?: number
  forma?: string // 'rotondo', 'rettangolare', ecc
  dimensionePerc: number // Percentuale rispetto a larghezza container
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
