import { createHash } from 'crypto'
import type { calendar_v3 } from 'googleapis'
import prisma from '@/lib/prisma'
import { getActiveConfig, getAuthenticatedClient, getCalendarService } from '@/lib/google-calendar'

type GoogleEvent = calendar_v3.Schema$Event
type ResourceType = 'evento' | 'appuntamento'

export type ParsedGoogleEvent = {
  tipoRisorsa: ResourceType
  confidence: number
  warning: string | null
  titolo: string
  tipoEvento: string
  stato: string
  dataInizio: Date
  durataMinuti: number
  fascia: string
  personePreviste: number | null
  note: string | null
  luogo: string | null
  cliente: {
    nome: string
    cognome: string | null
    email: string | null
    telefono: string | null
  } | null
}

export type GoogleImportResult = {
  letti: number
  importati: number
  registrati: number
  aggiornati: number
  cancellati: number
  invariati: number
  daVerificare: number
  errori: number
  fullSync: boolean
  erroriDettaglio: string[]
}

const EVENT_KEYWORDS = [
  'matrimonio', 'battesimo', 'comunione', 'cresima', 'compleanno',
  'festa', 'evento', 'cerimonia', 'ricevimento', 'banchetto', 'aziendale'
]
const APPOINTMENT_KEYWORDS = [
  'appuntamento', 'colloquio', 'sopralluogo', 'incontro', 'riunione',
  'meeting', 'call', 'telefonata', 'degustazione', 'prova menu'
]
const KNOWN_EVENT_TYPES = ['matrimonio', 'battesimo', 'comunione', 'cresima', 'compleanno', 'aziendale']

function clean(value?: string | null) {
  return value?.trim() || null
}

function normalizedText(event: GoogleEvent) {
  return `${event.summary || ''}\n${event.description || ''}\n${event.location || ''}`.toLowerCase()
}

function parseFields(description?: string | null) {
  const fields = new Map<string, string>()
  for (const line of (description || '').split(/\r?\n/)) {
    const match = line.match(/^\s*([^:]{2,40})\s*:\s*(.+?)\s*$/)
    if (match) fields.set(match[1].trim().toLowerCase(), match[2].trim())
  }
  return fields
}

function firstField(fields: Map<string, string>, names: string[]) {
  for (const name of names) {
    const value = fields.get(name)
    if (value) return value
  }
  return null
}

function stripPrefix(summary: string) {
  return summary
    .replace(/^\s*\[(evento|appuntamento|opzione)(?:\s*[-–—][^\]]+)?\]\s*/i, '')
    .replace(/^\s*(evento|appuntamento|colloquio|sopralluogo|incontro|riunione|meeting)\s*[-–—:]\s*/i, '')
    .trim() || 'Voce importata da Google Calendar'
}

function splitName(value: string | null) {
  if (!value) return null
  const cleaned = value
    .replace(/^(con|cliente|sig\.?ra?|signor[ae]?)\s+/i, '')
    .replace(/\s*[-–—|].*$/, '')
    .trim()
  if (!cleaned) return null
  const parts = cleaned.split(/\s+/)
  return { nome: parts.shift()!, cognome: parts.length ? parts.join(' ') : null }
}

function eventStart(event: GoogleEvent) {
  const value = event.start?.dateTime || (event.start?.date ? `${event.start.date}T12:00:00.000Z` : null)
  const parsed = value ? new Date(value) : new Date(NaN)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function durationMinutes(event: GoogleEvent, start: Date) {
  const endValue = event.end?.dateTime || (event.end?.date ? `${event.end.date}T12:00:00.000Z` : null)
  const end = endValue ? new Date(endValue) : null
  if (!end || Number.isNaN(end.getTime())) return event.start?.date ? 0 : 60
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
  return event.start?.date ? 0 : Math.max(0, minutes)
}

function inferFascia(event: GoogleEvent, fields: Map<string, string>, start: Date) {
  const explicit = firstField(fields, ['fascia', 'orario', 'servizio'])
  if (explicit) return explicit
  if (event.start?.date) return 'intera_giornata'
  const hour = Number(new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    hour12: false,
    timeZone: event.start?.timeZone || 'Europe/Rome'
  }).format(start))
  if (hour < 16) return 'pranzo'
  return 'cena'
}

function extractPhone(text: string) {
  const match = text.match(/(?:\+39[\s.-]?)?(?:\d[\s.-]?){8,11}\d/)
  return match ? match[0].replace(/[^\d+]/g, '') : null
}

function extractEmail(text: string) {
  return text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0].toLowerCase() || null
}

export function parseGoogleCalendarEvent(event: GoogleEvent): ParsedGoogleEvent | null {
  const start = eventStart(event)
  if (!event.id || !start) return null

  const text = normalizedText(event)
  const fields = parseFields(event.description)
  const explicitType = firstField(fields, ['tipo', 'tipo evento', 'tipologia'])?.toLowerCase() || null
  const hasEventKeyword = EVENT_KEYWORDS.some((keyword) => text.includes(keyword))
  const hasAppointmentKeyword = APPOINTMENT_KEYWORDS.some((keyword) => text.includes(keyword))
  const privateType = event.extendedProperties?.private?.villaParisType

  let tipoRisorsa: ResourceType
  let confidence = 0.65
  if (privateType === 'evento' || privateType === 'appuntamento') {
    tipoRisorsa = privateType
    confidence = 1
  } else if (hasAppointmentKeyword && !hasEventKeyword) {
    tipoRisorsa = 'appuntamento'
    confidence = 0.9
  } else if (hasEventKeyword || event.start?.date) {
    tipoRisorsa = 'evento'
    confidence = hasEventKeyword ? 0.9 : 0.75
  } else {
    // Nel gestionale un elemento con orario è operativamente più utile come appuntamento.
    tipoRisorsa = 'appuntamento'
    confidence = 0.6
  }

  const rawText = `${event.summary || ''}\n${event.description || ''}`
  const email = extractEmail(rawText)
  const telefono = extractPhone(rawText)
  const customerField = firstField(fields, [
    'cliente', 'contatto', 'nome cliente', 'festeggiato', 'sposa', 'sposo', 'azienda'
  ])
  const summaryName = tipoRisorsa === 'appuntamento' ? stripPrefix(event.summary || '') : null
  const name = splitName(customerField || summaryName)
  const attendees = event.attendees?.filter((item) => !item.self)
  const attendeeEmail = attendees?.find((item) => item.email)?.email || null
  const guestText = firstField(fields, ['invitati', 'persone', 'ospiti', 'coperti', 'numero invitati'])
  const guestMatch = guestText?.match(/\d+/)
  const tipoEvento = KNOWN_EVENT_TYPES.find((type) => explicitType?.includes(type) || text.includes(type)) || 'altro'
  const note = firstField(fields, ['note', 'annotazioni', 'dettagli']) ||
    (privateType ? null : clean(event.description))

  let warning: string | null = null
  if (confidence < 0.7) warning = 'Tipologia dedotta automaticamente: verificare evento/appuntamento'
  if (tipoRisorsa === 'appuntamento' && !name && !email && !attendeeEmail && !telefono) {
    warning = [warning, 'Contatto non riconosciuto: creato un contatto tecnico'].filter(Boolean).join('; ')
  }

  return {
    tipoRisorsa,
    confidence,
    warning,
    titolo: stripPrefix(event.summary || ''),
    tipoEvento,
    stato: firstField(fields, ['stato'])?.toLowerCase().replace(/\s+/g, '_') || 'in_attesa',
    dataInizio: start,
    durataMinuti: durationMinutes(event, start),
    fascia: inferFascia(event, fields, start),
    personePreviste: guestMatch ? Number(guestMatch[0]) : null,
    note,
    luogo: clean(event.location) || firstField(fields, ['luogo', 'location', 'sala']),
    cliente: name || email || attendeeEmail || telefono ? {
      nome: name?.nome || event.summary?.trim() || 'Contatto Google Calendar',
      cognome: name?.cognome || null,
      email: email || attendeeEmail?.toLowerCase() || null,
      telefono
    } : null
  }
}

function fingerprint(event: GoogleEvent) {
  return createHash('sha256').update(JSON.stringify({
    status: event.status,
    updated: event.updated,
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: event.start,
    end: event.end,
    attendees: event.attendees
  })).digest('hex')
}

async function findOrCreateCliente(parsed: ParsedGoogleEvent, event: GoogleEvent) {
  const data = parsed.cliente || {
    nome: `Google Calendar: ${stripPrefix(event.summary || '')}`,
    cognome: null,
    email: null,
    telefono: null
  }

  if (data.email) {
    const byEmail = await prisma.cliente.findFirst({ where: { email: data.email } })
    if (byEmail) return byEmail
  }
  if (data.telefono) {
    const byPhone = await prisma.cliente.findFirst({ where: { telefono: data.telefono } })
    if (byPhone) return byPhone
  }
  if (data.nome) {
    const byName = await prisma.cliente.findFirst({
      where: { nome: data.nome, cognome: data.cognome }
    })
    if (byName) return byName
  }

  return prisma.cliente.create({
    data: {
      nome: data.nome,
      cognome: data.cognome,
      email: data.email,
      telefono: data.telefono,
      dataPrimoContatto: parsed.dataInizio,
      canalePrimoContatto: 'google_calendar',
      notaAnagrafica: 'Creato automaticamente durante l’importazione da Google Calendar'
    }
  })
}

async function applyDeletedEvent(imported: any) {
  if (!imported?.risorsaId) return
  if (imported.tipoRisorsa === 'evento') {
    await prisma.evento.updateMany({
      where: { id: imported.risorsaId },
      data: { stato: 'cancellato' }
    })
  } else if (imported.tipoRisorsa === 'appuntamento') {
    await prisma.appuntamento.updateMany({
      where: { id: imported.risorsaId },
      data: { esito: 'cancellato', statoFunnel: 'cancellato' }
    })
  }
}

async function importOne(event: GoogleEvent) {
  if (!event.id) return 'invariato' as const
  const previous = await prisma.googleCalendarImport.findUnique({ where: { gcalEventId: event.id } })
  const nextFingerprint = fingerprint(event)

  if (event.status === 'cancelled') {
    await applyDeletedEvent(previous)
    await prisma.googleCalendarImport.upsert({
      where: { gcalEventId: event.id },
      create: {
        gcalEventId: event.id,
        recurringEventId: event.recurringEventId || null,
        iCalUID: event.iCalUID || null,
        tipoRisorsa: previous?.tipoRisorsa || 'non_classificato',
        risorsaId: previous?.risorsaId || null,
        stato: 'deleted',
        confidence: previous?.confidence || 0,
        fingerprint: nextFingerprint,
        rawData: JSON.stringify(event),
        deletedAt: new Date()
      },
      update: {
        stato: 'deleted',
        fingerprint: nextFingerprint,
        rawData: JSON.stringify(event),
        lastImportedAt: new Date(),
        deletedAt: new Date()
      }
    })
    return 'cancellato' as const
  }

  if (previous?.fingerprint === nextFingerprint) {
    await prisma.googleCalendarImport.update({
      where: { id: previous.id },
      data: { lastImportedAt: new Date() }
    })
    return 'invariato' as const
  }

  const parsed = parseGoogleCalendarEvent(event)
  if (!parsed) return 'invariato' as const

  const linkedEvento = await prisma.evento.findFirst({ where: { gcalEventId: event.id } })
  const linkedAppuntamento = linkedEvento ? null : await prisma.appuntamento.findFirst({ where: { gcalEventId: event.id } })
  const existingType: ResourceType | null = linkedEvento ? 'evento' : linkedAppuntamento ? 'appuntamento' : null
  const tipoRisorsa = previous?.tipoRisorsa === 'evento' || previous?.tipoRisorsa === 'appuntamento'
    ? previous.tipoRisorsa as ResourceType
    : existingType || parsed.tipoRisorsa
  let risorsaId = previous?.risorsaId || linkedEvento?.id || linkedAppuntamento?.id || null
  let createdResource = previous?.createdResource || false
  const hasOperationalIdentity = parsed.tipoRisorsa === 'evento' || Boolean(parsed.cliente)
  const shouldMaterialize = Boolean(
    risorsaId || existingType || (parsed.confidence >= 0.8 && hasOperationalIdentity)
  )

  if (!shouldMaterialize) {
    const warning = parsed.warning || 'Voce archiviata senza creare record operativo: classificazione incerta'
    await prisma.googleCalendarImport.upsert({
      where: { gcalEventId: event.id },
      create: {
        gcalEventId: event.id,
        recurringEventId: event.recurringEventId || null,
        iCalUID: event.iCalUID || null,
        tipoRisorsa: parsed.tipoRisorsa,
        risorsaId: null,
        createdResource: false,
        stato: 'review',
        confidence: parsed.confidence,
        fingerprint: nextFingerprint,
        rawData: JSON.stringify(event),
        warning,
        aiStatus: 'pending'
      },
      update: {
        recurringEventId: event.recurringEventId || null,
        iCalUID: event.iCalUID || null,
        tipoRisorsa: parsed.tipoRisorsa,
        risorsaId: null,
        createdResource: false,
        stato: 'review',
        confidence: parsed.confidence,
        fingerprint: nextFingerprint,
        rawData: JSON.stringify(event),
        warning,
        aiStatus: 'pending',
        aiAnalyzedAt: null,
        lastImportedAt: new Date(),
        deletedAt: null
      }
    })
    return previous ? 'aggiornato' as const : 'registrato' as const
  }

  if (tipoRisorsa === 'evento') {
    const data = {
      titolo: parsed.titolo,
      tipo: parsed.tipoEvento,
      dataConfermata: parsed.dataInizio,
      fascia: parsed.fascia,
      stato: parsed.stato,
      personePreviste: parsed.personePreviste,
      note: parsed.note,
      luogo: parsed.luogo,
      gcalEventId: event.id
    }
    if (risorsaId) {
      await prisma.evento.update({ where: { id: risorsaId }, data })
    } else {
      const created = await prisma.evento.create({ data })
      risorsaId = created.id
      createdResource = true
      if (parsed.cliente) {
        const cliente = await findOrCreateCliente(parsed, event)
        await prisma.eventoCliente.create({ data: { eventoId: created.id, clienteId: cliente.id } })
      }
    }
  } else {
    const data = {
      dataAppuntamento: parsed.dataInizio,
      durataMinuti: parsed.durataMinuti || 60,
      noteColloquio: parsed.note,
      riassuntoColloquio: parsed.titolo,
      statoFunnel: parsed.stato === 'confermato' ? 'confermato' : 'in_trattativa',
      gcalEventId: event.id
    }
    if (risorsaId) {
      await prisma.appuntamento.update({ where: { id: risorsaId }, data })
    } else {
      if (!parsed.cliente) {
        throw new Error('Contatto obbligatorio per creare un appuntamento')
      }
      const cliente = await findOrCreateCliente(parsed, event)
      const created = await prisma.appuntamento.create({
        data: { ...data, clientePrincipaleId: cliente.id }
      })
      risorsaId = created.id
      createdResource = true
      await prisma.appuntamentoCliente.create({
        data: { appuntamentoId: created.id, clienteId: cliente.id }
      })
      await prisma.interazioneCliente.create({
        data: {
          clienteId: cliente.id,
          appuntamentoId: created.id,
          tipo: 'appuntamento',
          durataMinuti: parsed.durataMinuti || 60,
          sintesi: parsed.note || parsed.titolo,
          dataInterazione: parsed.dataInizio
        }
      })
    }
  }

  await prisma.googleCalendarImport.upsert({
    where: { gcalEventId: event.id },
    create: {
      gcalEventId: event.id,
      recurringEventId: event.recurringEventId || null,
      iCalUID: event.iCalUID || null,
      tipoRisorsa,
      risorsaId,
      createdResource,
      stato: parsed.warning ? 'review' : 'imported',
      confidence: parsed.confidence,
      fingerprint: nextFingerprint,
      rawData: JSON.stringify(event),
      warning: parsed.warning,
      aiStatus: 'pending'
    },
    update: {
      recurringEventId: event.recurringEventId || null,
      iCalUID: event.iCalUID || null,
      tipoRisorsa,
      risorsaId,
      createdResource,
      stato: parsed.warning ? 'review' : 'imported',
      confidence: parsed.confidence,
      fingerprint: nextFingerprint,
      rawData: JSON.stringify(event),
      warning: parsed.warning,
      aiStatus: 'pending',
      aiAnalyzedAt: null,
      lastImportedAt: new Date(),
      deletedAt: null
    }
  })

  return previous || existingType ? 'aggiornato' as const : 'importato' as const
}

async function runGoogleCalendarImport(options: { forceFull?: boolean } = {}): Promise<GoogleImportResult> {
  const config = await getActiveConfig()
  if (!config) throw new Error('Google Calendar non connesso')
  const authClient = await getAuthenticatedClient(config.userId)
  if (!authClient) throw new Error('Token Google scaduto o non valido')

  const calendar = getCalendarService(authClient.oauth2Client)
  const result: GoogleImportResult = {
    letti: 0,
    importati: 0,
    registrati: 0,
    aggiornati: 0,
    cancellati: 0,
    invariati: 0,
    daVerificare: 0,
    errori: 0,
    fullSync: options.forceFull || !config.syncToken,
    erroriDettaglio: []
  }
  let pageToken: string | undefined
  let syncToken = options.forceFull ? undefined : config.syncToken || undefined
  let nextSyncToken: string | undefined

  do {
    let response
    try {
      response = await calendar.events.list({
        calendarId: authClient.calendarId,
        maxResults: 2500,
        pageToken,
        showDeleted: true,
        singleEvents: false,
        syncToken
      })
    } catch (error: any) {
      // Un sync token scaduto restituisce 410: ripartiamo una volta con una scansione completa.
      if (syncToken && (error.code === 410 || error.status === 410)) {
        await prisma.googleCalendarConfig.update({
          where: { id: config.id },
          data: { syncToken: null }
        })
        return runGoogleCalendarImport({ forceFull: true })
      }
      throw error
    }

    for (const event of response.data.items || []) {
      result.letti++
      try {
        const outcome = await importOne(event)
        if (outcome === 'importato') result.importati++
        else if (outcome === 'registrato') result.registrati++
        else if (outcome === 'aggiornato') result.aggiornati++
        else if (outcome === 'cancellato') result.cancellati++
        else result.invariati++
      } catch (error: any) {
        result.errori++
        result.erroriDettaglio.push(`${event.summary || event.id}: ${error.message || String(error)}`)
      }
    }

    pageToken = response.data.nextPageToken || undefined
    nextSyncToken = response.data.nextSyncToken || nextSyncToken
  } while (pageToken)

  result.daVerificare = await prisma.googleCalendarImport.count({ where: { stato: 'review' } })
  await prisma.googleCalendarConfig.update({
    where: { id: config.id },
    data: { syncToken: nextSyncToken || config.syncToken, lastSyncAt: new Date() }
  })
  return result
}

let activeImport: Promise<GoogleImportResult> | null = null

export function importGoogleCalendar(options: { forceFull?: boolean } = {}): Promise<GoogleImportResult> {
  // Evita doppie creazioni se il cron e il pulsante manuale partono nello stesso istante.
  if (activeImport) return activeImport
  activeImport = runGoogleCalendarImport(options).finally(() => {
    activeImport = null
  })
  return activeImport
}
