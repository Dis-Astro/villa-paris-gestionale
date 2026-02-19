/**
 * VILLA PARIS - BLOCCO EVENTO -10 GIORNI
 * Utility per gestione blocco modifiche pre-evento
 */

import prisma from './prisma'

// Campi protetti dal blocco
export const CAMPI_BLOCCATI = [
  'menu',
  'note', 
  'disposizioneSala',
  'struttura'
] as const

export type CampoBloccato = typeof CAMPI_BLOCCATI[number]

export interface InfoBlocco {
  isBloccato: boolean
  giorniMancanti: number
  dataEvento: string | null
  messaggioBlocco: string
}

export interface OverrideRequest {
  motivo: string
  autore?: string
  campoModificato?: string
}

/**
 * Calcola se un evento è bloccato (< 10 giorni dalla data)
 */
export function calcolaInfoBlocco(dataConfermata: Date | string | null): InfoBlocco {
  if (!dataConfermata) {
    return {
      isBloccato: false,
      giorniMancanti: Infinity,
      dataEvento: null,
      messaggioBlocco: ''
    }
  }

  const now = new Date()
  const dataEvento = new Date(dataConfermata)
  const diffMs = dataEvento.getTime() - now.getTime()
  const giorniMancanti = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  // Bloccato se <= 10 giorni E evento nel futuro
  const isBloccato = giorniMancanti <= 10 && giorniMancanti > 0

  return {
    isBloccato,
    giorniMancanti,
    dataEvento: dataEvento.toISOString(),
    messaggioBlocco: isBloccato 
      ? `Evento bloccato: mancano ${giorniMancanti} giorni. Richiesto override admin.`
      : ''
  }
}

/**
 * Verifica se un campo specifico è tra quelli bloccati
 */
export function isCampoBloccato(campo: string): campo is CampoBloccato {
  return CAMPI_BLOCCATI.includes(campo as CampoBloccato)
}

/**
 * Estrae i campi bloccati che vengono modificati nel body
 */
export function getCampiBloccatiModificati(body: Record<string, any>): CampoBloccato[] {
  return CAMPI_BLOCCATI.filter(campo => campo in body && body[campo] !== undefined)
}

/**
 * Registra un override nel log
 */
export async function registraOverride(
  eventoId: number,
  override: OverrideRequest
): Promise<void> {
  await prisma.overrideLog.create({
    data: {
      eventoId,
      motivo: override.motivo,
      autore: override.autore || null,
      campoModificato: override.campoModificato || null
    }
  })
}

/**
 * Recupera log override per evento
 */
export async function getOverrideLogs(eventoId: number) {
  return prisma.overrideLog.findMany({
    where: { eventoId },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Headers per override admin
 */
export const OVERRIDE_HEADERS = {
  TOKEN: 'X-Override-Token',
  MOTIVO: 'X-Override-Motivo',
  AUTORE: 'X-Override-Autore'
} as const

// Token semplice per demo (in produzione usare sistema auth)
export const OVERRIDE_TOKEN_VALID = 'VILLA-PARIS-ADMIN-2026'

/**
 * Valida headers di override
 */
export function validateOverrideHeaders(headers: Headers): {
  valid: boolean
  override?: OverrideRequest
  error?: string
} {
  const token = headers.get(OVERRIDE_HEADERS.TOKEN)
  const motivo = headers.get(OVERRIDE_HEADERS.MOTIVO)
  const autore = headers.get(OVERRIDE_HEADERS.AUTORE)

  if (!token) {
    return { valid: false, error: 'Override token mancante' }
  }

  if (token !== OVERRIDE_TOKEN_VALID) {
    return { valid: false, error: 'Override token non valido' }
  }

  if (!motivo || motivo.trim().length < 10) {
    return { valid: false, error: 'Motivo override obbligatorio (minimo 10 caratteri)' }
  }

  return {
    valid: true,
    override: {
      motivo: motivo.trim(),
      autore: autore || undefined
    }
  }
}
