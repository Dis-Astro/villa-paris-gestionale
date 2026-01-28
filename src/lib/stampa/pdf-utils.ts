/**
 * VILLA PARIS - PDF STAMPE UTILITIES
 * Tipi e utilities comuni per generazione PDF con pdfmake
 */

import type { 
  Evento, 
  MenuEvento, 
  DisposizioneSala,
  VariantId,
  TipoVersione,
  VARIANTI_DEFAULT
} from '@/lib/types'

// ============================================
// TIPI PDF
// ============================================

export type WatermarkType = 'BOZZA' | 'CONTRATTO' | 'DEFINITIVO'

export interface PDFMetadata {
  titoloEvento: string
  dataEvento: string
  tipoEvento: string
  cliente: string
  personePreviste: number
  dataOraStampa: string
  versione: number
  watermark: WatermarkType
}

export interface StampaOptions {
  watermark: WatermarkType
  includiNote: boolean
  versioneNumero?: number
}

// ============================================
// UTILITIES
// ============================================

export function formatDataEvento(data: Date | string | undefined): string {
  if (!data) return 'Data da definire'
  const d = new Date(data)
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function formatDataOraStampa(): string {
  return new Date().toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getClienteNome(evento: Evento): string {
  if (!evento.clienti || evento.clienti.length === 0) return 'Cliente'
  const c = evento.clienti[0]
  return `${c.nome} ${c.cognome}`
}

export function getTipoEventoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    matrimonio: 'Matrimonio',
    battesimo: 'Battesimo',
    comunione: 'Prima Comunione',
    cresima: 'Cresima',
    compleanno: 'Compleanno',
    anniversario: 'Anniversario',
    aziendale: 'Evento Aziendale',
    altro: 'Evento'
  }
  return labels[tipo] || tipo
}

export function buildMetadata(evento: Evento, options: StampaOptions): PDFMetadata {
  return {
    titoloEvento: evento.titolo,
    dataEvento: formatDataEvento(evento.dataConfermata),
    tipoEvento: getTipoEventoLabel(evento.tipo),
    cliente: getClienteNome(evento),
    personePreviste: evento.personePreviste || 0,
    dataOraStampa: formatDataOraStampa(),
    versione: options.versioneNumero || 1,
    watermark: options.watermark
  }
}

// ============================================
// COLORI E STILI
// ============================================

export const PDF_COLORS = {
  primary: '#1e3a5f',      // Blu scuro elegante
  secondary: '#6b7280',    // Grigio
  accent: '#d4af37',       // Oro
  text: '#1f2937',
  lightGray: '#f3f4f6',
  border: '#e5e7eb',
  watermarkBozza: '#ef4444',
  watermarkContratto: '#f59e0b',
  watermarkDefinitivo: '#22c55e'
}

export function getWatermarkColor(watermark: WatermarkType): string {
  switch (watermark) {
    case 'BOZZA': return PDF_COLORS.watermarkBozza
    case 'CONTRATTO': return PDF_COLORS.watermarkContratto
    case 'DEFINITIVO': return PDF_COLORS.watermarkDefinitivo
  }
}

// ============================================
// PDFMAKE DOCUMENT DEFINITION HELPERS
// ============================================

export function createWatermark(watermark: WatermarkType) {
  return {
    text: watermark,
    color: getWatermarkColor(watermark),
    opacity: 0.15,
    bold: true,
    fontSize: 80,
    angle: -45
  }
}

export function createHeader(metadata: PDFMetadata) {
  return (currentPage: number, pageCount: number) => ({
    columns: [
      {
        text: 'VILLA PARIS',
        style: 'headerLeft',
        margin: [40, 20, 0, 0]
      },
      {
        text: `Rev. ${metadata.versione} - ${metadata.dataOraStampa}`,
        style: 'headerRight',
        alignment: 'right',
        margin: [0, 20, 40, 0]
      }
    ]
  })
}

export function createFooter(metadata: PDFMetadata) {
  return (currentPage: number, pageCount: number) => ({
    columns: [
      {
        text: metadata.titoloEvento,
        style: 'footerLeft',
        margin: [40, 0, 0, 20]
      },
      {
        text: `Pagina ${currentPage} di ${pageCount}`,
        style: 'footerRight',
        alignment: 'right',
        margin: [0, 0, 40, 20]
      }
    ]
  })
}

export const PDF_STYLES = {
  headerLeft: {
    fontSize: 9,
    color: PDF_COLORS.secondary,
    bold: true
  },
  headerRight: {
    fontSize: 8,
    color: PDF_COLORS.secondary
  },
  footerLeft: {
    fontSize: 8,
    color: PDF_COLORS.secondary,
    italics: true
  },
  footerRight: {
    fontSize: 8,
    color: PDF_COLORS.secondary
  },
  titoloPrincipale: {
    fontSize: 28,
    bold: true,
    color: PDF_COLORS.primary,
    alignment: 'center'
  },
  sottotitolo: {
    fontSize: 16,
    color: PDF_COLORS.secondary,
    alignment: 'center'
  },
  titoloSezione: {
    fontSize: 18,
    bold: true,
    color: PDF_COLORS.primary,
    margin: [0, 20, 0, 10]
  },
  titoloPortata: {
    fontSize: 14,
    bold: true,
    color: PDF_COLORS.primary,
    margin: [0, 15, 0, 5]
  },
  testoNormale: {
    fontSize: 11,
    color: PDF_COLORS.text,
    lineHeight: 1.4
  },
  testoSmall: {
    fontSize: 9,
    color: PDF_COLORS.secondary
  },
  badge: {
    fontSize: 10,
    bold: true
  }
}

// ============================================
// CALCOLI VARIANTI
// ============================================

export function calcolaTotaliVarianti(
  disposizione: DisposizioneSala | undefined,
  variantiDefault: typeof VARIANTI_DEFAULT
): Record<VariantId, { nome: string; totale: number; tavoli: { numero: string; quantita: number }[] }> {
  const result: Record<string, { nome: string; totale: number; tavoli: { numero: string; quantita: number }[] }> = {}
  
  if (!disposizione?.tavoli) return result as any
  
  for (const tavolo of disposizione.tavoli) {
    if (!tavolo.varianti) continue
    
    for (const [variantId, quantita] of Object.entries(tavolo.varianti)) {
      if (!quantita || quantita <= 0) continue
      
      if (!result[variantId]) {
        const variante = variantiDefault[variantId as VariantId]
        result[variantId] = {
          nome: variante?.nome || variantId,
          totale: 0,
          tavoli: []
        }
      }
      
      result[variantId].totale += quantita
      result[variantId].tavoli.push({
        numero: tavolo.numero,
        quantita
      })
    }
  }
  
  return result as any
}
