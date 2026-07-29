import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { actorFromHeaders, writeAuditLog } from '@/lib/audit'
import { getAIConfig } from '@/lib/ai-config'
import { requestGeminiAudioAnalysis } from '@/lib/ai-provider'
import { syncAppuntamentoToGcal } from '@/lib/google-calendar-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ALLOWED_MIME = new Set([
  'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3',
  'audio/aac', 'audio/ogg', 'audio/flac'
])
const MAX_AUDIO_BYTES = 20 * 1024 * 1024
const FUNNEL = new Set(['nuovo_contatto', 'in_trattativa', 'opzionata', 'confermato', 'perso', 'spam'])
const OUTCOMES = new Set(['da_fare', 'svolto', 'positivo', 'negativo', 'rinviato', 'annullato'])

const audioAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['transcription', 'summary', 'confidence', 'warnings', 'fields'],
  properties: {
    transcription: { type: 'string' },
    summary: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    warnings: { type: 'array', items: { type: 'string' } },
    fields: {
      type: 'object',
      additionalProperties: false,
      required: [
        'customerName', 'customerSurname', 'customerEmail', 'customerPhone',
        'eventType', 'guestCount', 'requestedEventDate', 'dateOptions',
        'appointmentOutcome', 'funnelStatus', 'notes', 'missingData'
      ],
      properties: {
        customerName: { type: ['string', 'null'] },
        customerSurname: { type: ['string', 'null'] },
        customerEmail: { type: ['string', 'null'] },
        customerPhone: { type: ['string', 'null'] },
        eventType: { type: ['string', 'null'] },
        guestCount: { type: ['integer', 'null'], minimum: 0 },
        requestedEventDate: { type: ['string', 'null'], description: 'Data ISO YYYY-MM-DD' },
        dateOptions: { type: 'array', items: { type: 'string', description: 'Data ISO YYYY-MM-DD' } },
        appointmentOutcome: { type: ['string', 'null'] },
        funnelStatus: { type: ['string', 'null'] },
        notes: { type: ['string', 'null'] },
        missingData: { type: 'array', items: { type: 'string' } }
      }
    }
  }
}

function recordingsDir() {
  return path.resolve(process.env.RECORDINGS_DIR || path.join(process.cwd(), 'storage', 'recordings'))
}

function extensionFor(mime: string) {
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('aac')) return 'aac'
  if (mime.includes('flac')) return 'flac'
  return 'mp3'
}

function validDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function validDateOptions(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string =>
    typeof item === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item)
  ))]
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const appointmentId = Number(req.nextUrl.searchParams.get('appointmentId'))
    if (!appointmentId) return NextResponse.json({ error: 'ID appuntamento mancante' }, { status: 400 })
    const appointment = await prisma.appuntamento.findUnique({
      where: { id: appointmentId },
      select: {
        registrazioneAudioPath: true,
        registrazioneAudioNome: true,
        registrazioneAudioMime: true
      }
    })
    if (!appointment?.registrazioneAudioPath) {
      return NextResponse.json({ error: 'Registrazione non trovata' }, { status: 404 })
    }
    const absolute = path.resolve(appointment.registrazioneAudioPath)
    const root = recordingsDir()
    if (!absolute.startsWith(`${root}${path.sep}`)) {
      return NextResponse.json({ error: 'Percorso registrazione non valido' }, { status: 400 })
    }
    const bytes = await readFile(absolute)
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': appointment.registrazioneAudioMime || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${appointment.registrazioneAudioNome || 'registrazione'}"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Errore lettura registrazione' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  let appointmentId = 0
  try {
    const data = await req.formData()
    appointmentId = Number(data.get('appointmentId'))
    const consent = data.get('consent') === 'true'
    const audio = data.get('audio')
    if (!appointmentId) throw new Error('ID appuntamento mancante')
    if (!consent) throw new Error('Conferma il consenso alla registrazione e all’analisi')
    if (!(audio instanceof File)) throw new Error('File audio mancante')
    if (!ALLOWED_MIME.has(audio.type)) throw new Error(`Formato audio non supportato: ${audio.type || 'sconosciuto'}`)
    if (audio.size <= 0 || audio.size > MAX_AUDIO_BYTES) throw new Error('La registrazione deve essere compresa tra 1 byte e 20 MB')

    const appointment = await prisma.appuntamento.findUnique({
      where: { id: appointmentId },
      include: { clientePrincipale: true }
    })
    if (!appointment) throw new Error('Appuntamento non trovato')
    const config = await getAIConfig()
    if (!config.configured) throw new Error('Gemini non è configurata o è disabilitata')

    const root = recordingsDir()
    await mkdir(root, { recursive: true })
    const filename = `${appointmentId}-${randomUUID()}.${extensionFor(audio.type)}`
    const absolute = path.join(root, filename)
    const bytes = Buffer.from(await audio.arrayBuffer())
    await writeFile(absolute, bytes)

    await prisma.appuntamento.update({
      where: { id: appointmentId },
      data: {
        registrazioneAudioPath: absolute,
        registrazioneAudioNome: audio.name || filename,
        registrazioneAudioMime: audio.type,
        analisiAudioStato: 'processing',
        analisiAudioAt: new Date()
      }
    })

    const { parsed } = await requestGeminiAudioAnalysis(
      config,
      bytes,
      audio.type === 'audio/x-wav' ? 'audio/wav' : audio.type,
      audioAnalysisSchema,
      [
        'Trascrivi integralmente questa registrazione di un appuntamento commerciale per una location eventi.',
        'Poi estrai soltanto informazioni dette esplicitamente, senza inventare nulla.',
        'Riconosci nome e contatti del cliente, tipologia evento, numero invitati, data richiesta e date alternative.',
        'Produci un riassunto operativo e note utili alla scheda appuntamento.',
        'Se un dato manca, usa null oppure inseriscilo in missingData.',
        'Normalizza funnelStatus solo tra nuovo_contatto, in_trattativa, opzionata, confermato, perso, spam.',
        'Normalizza appointmentOutcome solo tra da_fare, svolto, positivo, negativo, rinviato, annullato.',
        'La risposta deve rispettare esattamente lo schema JSON richiesto.'
      ].join('\n')
    )

    await prisma.appuntamento.update({
      where: { id: appointmentId },
      data: {
        trascrizioneAI: parsed.transcription,
        analisiAudioAI: parsed,
        analisiAudioStato: 'review',
        analisiAudioAt: new Date()
      }
    })
    return NextResponse.json({
      success: true,
      status: 'review',
      transcription: parsed.transcription,
      summary: parsed.summary,
      confidence: parsed.confidence,
      warnings: parsed.warnings,
      proposedChanges: parsed.fields
    })
  } catch (error: any) {
    if (appointmentId) {
      await prisma.appuntamento.updateMany({
        where: { id: appointmentId },
        data: { analisiAudioStato: 'failed', analisiAudioAt: new Date() }
      }).catch(() => {})
    }
    return NextResponse.json({ error: error.message || 'Errore analisi registrazione' }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const body = await req.json()
    const appointmentId = Number(body.appointmentId)
    if (!appointmentId) throw new Error('ID appuntamento mancante')
    const existing = await prisma.appuntamento.findUnique({
      where: { id: appointmentId },
      include: { clientePrincipale: true }
    })
    if (!existing) throw new Error('Appuntamento non trovato')
    const analysis: any = existing.analisiAudioAI
    const fields = analysis?.fields
    if (!fields) throw new Error('Nessuna proposta AI da applicare')

    const updateAppointment: any = {
      trascrizioneAI: analysis.transcription || existing.trascrizioneAI,
      riassuntoColloquio: analysis.summary || existing.riassuntoColloquio,
      analisiAudioStato: 'applied',
      analisiAudioAt: new Date()
    }
    if (fields.eventType) updateAppointment.tipoEventoRichiesto = String(fields.eventType).trim()
    if (Number.isInteger(fields.guestCount) && fields.guestCount >= 0) updateAppointment.personePreviste = fields.guestCount
    const requestedDate = validDate(fields.requestedEventDate)
    if (requestedDate) updateAppointment.dataEventoRichiesta = requestedDate
    const options = validDateOptions(fields.dateOptions)
    if (options.length) updateAppointment.dateOpzionate = options
    if (fields.appointmentOutcome && OUTCOMES.has(fields.appointmentOutcome)) updateAppointment.esito = fields.appointmentOutcome
    if (fields.funnelStatus && FUNNEL.has(fields.funnelStatus)) updateAppointment.statoFunnel = fields.funnelStatus
    if (fields.notes) updateAppointment.noteColloquio = String(fields.notes).trim()
    if (Array.isArray(fields.missingData)) updateAppointment.datiMancanti = fields.missingData.join(', ')

    const updated = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appuntamento.update({
        where: { id: appointmentId },
        data: updateAppointment,
        include: { clientePrincipale: true }
      })
      const customerData: any = {}
      if (fields.customerName) customerData.nome = String(fields.customerName).trim()
      if (fields.customerSurname) customerData.cognome = String(fields.customerSurname).trim()
      if (fields.customerEmail) customerData.email = String(fields.customerEmail).trim().toLowerCase()
      if (fields.customerPhone) customerData.telefono = String(fields.customerPhone).trim()
      if (Object.keys(customerData).length) {
        await tx.cliente.update({ where: { id: existing.clientePrincipaleId }, data: customerData })
      }
      return appointment
    })

    await writeAuditLog({
      entityType: 'APPOINTMENT',
      entityId: appointmentId,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
      actor: {
        ...actorFromHeaders(req.headers),
        actorId: auth.user.id,
        actorRole: auth.user.role,
        actorEmail: auth.user.email
      },
      metadata: { operation: 'AI_AUDIO_APPLY', provider: 'gemini', confidence: analysis.confidence }
    })
    syncAppuntamentoToGcal(appointmentId).catch(() => {})
    return NextResponse.json({ success: true, appointment: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Errore applicazione analisi audio' }, { status: 400 })
  }
}
