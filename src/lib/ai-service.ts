import prisma from '@/lib/prisma'
import { getAIConfig, type AIConfig } from '@/lib/ai-config'
import { requestStructuredAI } from '@/lib/ai-provider'

type AIAnalysis = {
  resourceType: 'evento' | 'appuntamento'
  confidence: number
  shouldApply: boolean
  reasoningSummary: string
  warnings: string[]
  fields: {
    title: string | null
    eventType: string | null
    status: string | null
    startDate: string | null
    durationMinutes: number | null
    fascia: string | null
    guestCount: number | null
    notes: string | null
    location: string | null
    customerName: string | null
    customerSurname: string | null
    customerEmail: string | null
    customerPhone: string | null
  }
}

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['resourceType', 'confidence', 'shouldApply', 'reasoningSummary', 'warnings', 'fields'],
  properties: {
    resourceType: { type: 'string', enum: ['evento', 'appuntamento'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    shouldApply: { type: 'boolean' },
    reasoningSummary: { type: 'string' },
    warnings: { type: 'array', items: { type: 'string' } },
    fields: {
      type: 'object',
      additionalProperties: false,
      required: [
        'title', 'eventType', 'status', 'startDate', 'durationMinutes', 'fascia',
        'guestCount', 'notes', 'location', 'customerName', 'customerSurname',
        'customerEmail', 'customerPhone'
      ],
      properties: {
        title: { type: ['string', 'null'] },
        eventType: { type: ['string', 'null'] },
        status: { type: ['string', 'null'] },
        startDate: { type: ['string', 'null'], description: 'ISO 8601 con fuso orario se disponibile' },
        durationMinutes: { type: ['integer', 'null'], minimum: 0, maximum: 10080 },
        fascia: { type: ['string', 'null'] },
        guestCount: { type: ['integer', 'null'], minimum: 0 },
        notes: { type: ['string', 'null'] },
        location: { type: ['string', 'null'] },
        customerName: { type: ['string', 'null'] },
        customerSurname: { type: ['string', 'null'] },
        customerEmail: { type: ['string', 'null'] },
        customerPhone: { type: ['string', 'null'] }
      }
    }
  }
}

function redactPersonalData(value: string) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/(?:\+39[\s.-]?)?(?:\d[\s.-]?){8,11}\d/g, '[TELEFONO]')
}

function extractResponseText(response: any) {
  if (typeof response.output_text === 'string') return response.output_text
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text
    }
  }
  throw new Error('La risposta AI non contiene un output strutturato')
}

async function requestAnalysis(config: AIConfig, input: unknown): Promise<{ raw: any; parsed: AIAnalysis }> {
  if (!config.apiKey) throw new Error('Chiave API AI non configurata')
  const inputText = JSON.stringify(input)
  const safeInput = config.includePersonalData ? inputText : redactPersonalData(inputText)
  return requestStructuredAI(config, {
    name: 'villa_paris_calendar_analysis',
    schema: outputSchema,
    instructions: [
      'Sei il controllore dati del gestionale eventi Villa Paris.',
      'Analizza esclusivamente le informazioni fornite.',
      'Non inventare mai nomi, contatti, date, quantità o dettagli mancanti.',
      'Correggi refusi e normalizza i dati solo quando il significato è inequivocabile.',
      'Diciture operative senza un vero cliente, per esempio "Ristorante 6 pax+2", non sono nomi di persone.',
      'Per note interne, ristorante, cucina, staff, turni, manutenzione o conteggi pax senza cliente, non proporre un appuntamento cliente.',
      'Usa null per ogni campo non esplicitamente ricavabile.',
      'shouldApply deve essere true soltanto se le modifiche sono supportate dal testo originale.',
      'Segnala contraddizioni, ambiguità e dati sospetti in warnings.',
      'Mantieni note operative utili, senza aggiungere supposizioni.'
    ].join('\n'),
    input: safeInput
  }) as Promise<{ raw: any; parsed: AIAnalysis }>

  /*
  const response = await fetch(`${config.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      store: false,
      reasoning: { effort: 'low' },
      safety_identifier: 'villa-paris-calendar-automation',
      instructions: [
        'Sei il controllore dati del gestionale eventi Villa Paris.',
        'Analizza esclusivamente le informazioni fornite.',
        'Non inventare mai nomi, contatti, date, quantità o dettagli mancanti.',
        'Correggi refusi e normalizza i dati solo quando il significato è inequivocabile.',
        'Usa null per ogni campo non esplicitamente ricavabile.',
        'shouldApply deve essere true soltanto se le modifiche sono supportate dal testo originale.',
        'Segnala contraddizioni, ambiguità e dati sospetti in warnings.',
        'Mantieni note operative utili, senza aggiungere supposizioni.'
      ].join('\n'),
      input: safeInput,
      text: {
        format: {
          type: 'json_schema',
          name: 'villa_paris_calendar_analysis',
          strict: true,
          schema: outputSchema
        }
      }
    }),
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || '60000'))
  })

  const raw = await response.json()
  if (!response.ok) {
    throw new Error(raw?.error?.message || `Errore AI HTTP ${response.status}`)
  }
  const parsed = JSON.parse(extractResponseText(raw)) as AIAnalysis
  return { raw, parsed }
  */
}

function validDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function currentResource(imported: any) {
  if (!imported.risorsaId) return null
  if (imported.tipoRisorsa === 'evento') {
    return prisma.evento.findUnique({
      where: { id: imported.risorsaId },
      include: { clienti: { include: { cliente: true } } }
    })
  }
  if (imported.tipoRisorsa === 'appuntamento') {
    return prisma.appuntamento.findUnique({
      where: { id: imported.risorsaId },
      include: { clientePrincipale: true }
    })
  }
  return null
}

async function findOrCreateAICliente(fields: AIAnalysis['fields'], startDate: Date) {
  const email = fields.customerEmail?.trim().toLowerCase() || null
  const phone = fields.customerPhone?.trim() || null
  const name = fields.customerName?.trim() || null
  const surname = fields.customerSurname?.trim() || null
  if (!name && !surname && !email && !phone) return null

  if (email) {
    const existing = await prisma.cliente.findFirst({ where: { email } })
    if (existing) return existing
  }
  if (phone) {
    const existing = await prisma.cliente.findFirst({ where: { telefono: phone } })
    if (existing) return existing
  }
  if (name) {
    const existing = await prisma.cliente.findFirst({ where: { nome: name, cognome: surname } })
    if (existing) return existing
  }
  return prisma.cliente.create({
    data: {
      nome: name || surname || email || phone!,
      cognome: name ? surname : null,
      email,
      telefono: phone,
      dataPrimoContatto: startDate,
      canalePrimoContatto: 'google_calendar',
      notaAnagrafica: 'Creato da una classificazione AI approvata su dati Google Calendar'
    }
  })
}

async function applyAnalysis(imported: any, analysis: AIAnalysis) {
  const fields = analysis.fields
  const applied: Record<string, unknown> = {}
  const startDate = validDate(fields.startDate)
  let tipoRisorsa = imported.tipoRisorsa
  let risorsaId = imported.risorsaId

  if (!risorsaId && analysis.resourceType === 'evento') {
    if (!fields.title || !startDate) {
      throw new Error('Per creare un evento servono almeno titolo e data espliciti')
    }
    const created = await prisma.evento.create({
      data: {
        titolo: fields.title.trim(),
        tipo: fields.eventType?.trim().toLowerCase() || 'altro',
        dataConfermata: startDate,
        fascia: fields.fascia?.trim() || 'da_definire',
        stato: fields.status?.trim().toLowerCase().replace(/\s+/g, '_') || 'in_attesa',
        personePreviste: fields.guestCount,
        note: fields.notes?.trim() || null,
        luogo: fields.location?.trim() || null,
        gcalEventId: imported.gcalEventId
      }
    })
    tipoRisorsa = 'evento'
    risorsaId = created.id
    applied.created = { tipoRisorsa, risorsaId }
  } else if (!risorsaId && analysis.resourceType === 'appuntamento') {
    if (!startDate) throw new Error('Per creare un appuntamento serve una data esplicita')
    const cliente = await findOrCreateAICliente(fields, startDate)
    if (!cliente) {
      throw new Error('Per creare un appuntamento serve un contatto esplicito (nome, email o telefono)')
    }
    const created = await prisma.appuntamento.create({
      data: {
        clientePrincipaleId: cliente.id,
        dataAppuntamento: startDate,
        durataMinuti: fields.durationMinutes ?? 60,
        noteColloquio: fields.notes?.trim() || null,
        riassuntoColloquio: fields.title?.trim() || null,
        statoFunnel: fields.status?.trim().toLowerCase().replace(/\s+/g, '_') || 'in_trattativa',
        gcalEventId: imported.gcalEventId,
        clienti: { create: { clienteId: cliente.id } },
        interazioni: {
          create: {
            clienteId: cliente.id,
            tipo: 'appuntamento',
            durataMinuti: fields.durationMinutes ?? 60,
            sintesi: fields.notes?.trim() || fields.title?.trim() || null,
            dataInterazione: startDate
          }
        }
      }
    })
    tipoRisorsa = 'appuntamento'
    risorsaId = created.id
    applied.created = { tipoRisorsa, risorsaId, clienteId: cliente.id }
  }

  if (!imported.risorsaId && risorsaId) {
    await prisma.googleCalendarImport.update({
      where: { id: imported.id },
      data: {
        tipoRisorsa,
        risorsaId,
        createdResource: true,
        stato: 'imported'
      }
    })
  }

  if (tipoRisorsa === 'evento' && risorsaId) {
    const data: any = {}
    if (fields.title) data.titolo = applied.titolo = fields.title.trim()
    if (fields.eventType) data.tipo = applied.tipo = fields.eventType.trim().toLowerCase()
    if (fields.status) data.stato = applied.stato = fields.status.trim().toLowerCase().replace(/\s+/g, '_')
    if (startDate) data.dataConfermata = applied.dataConfermata = startDate
    if (fields.fascia) data.fascia = applied.fascia = fields.fascia.trim()
    if (fields.guestCount !== null) data.personePreviste = applied.personePreviste = fields.guestCount
    if (fields.notes) data.note = applied.note = fields.notes.trim()
    if (fields.location) data.luogo = applied.luogo = fields.location.trim()
    if (Object.keys(data).length) {
      await prisma.evento.update({ where: { id: risorsaId }, data })
    }
  } else if (tipoRisorsa === 'appuntamento' && risorsaId) {
    const data: any = {}
    if (startDate) data.dataAppuntamento = applied.dataAppuntamento = startDate
    if (fields.durationMinutes !== null) data.durataMinuti = applied.durataMinuti = fields.durationMinutes
    if (fields.notes) data.noteColloquio = applied.noteColloquio = fields.notes.trim()
    if (fields.title) data.riassuntoColloquio = applied.riassuntoColloquio = fields.title.trim()
    if (fields.status) data.statoFunnel = applied.statoFunnel = fields.status.trim().toLowerCase().replace(/\s+/g, '_')
    if (Object.keys(data).length) {
      await prisma.appuntamento.update({ where: { id: risorsaId }, data })
    }
  }

  if (risorsaId && (
    fields.customerName || fields.customerSurname || fields.customerEmail || fields.customerPhone
  )) {
    const cliente = tipoRisorsa === 'evento'
      ? await prisma.eventoCliente.findFirst({ where: { eventoId: risorsaId } })
      : await prisma.appuntamento.findUnique({
          where: { id: risorsaId },
          select: { clientePrincipaleId: true }
        })
    const clienteId = cliente && ('clienteId' in cliente ? cliente.clienteId : cliente.clientePrincipaleId)
    if (clienteId) {
      const data: any = {}
      if (fields.customerName) data.nome = applied.clienteNome = fields.customerName.trim()
      if (fields.customerSurname) data.cognome = applied.clienteCognome = fields.customerSurname.trim()
      if (fields.customerEmail) data.email = applied.clienteEmail = fields.customerEmail.trim().toLowerCase()
      if (fields.customerPhone) data.telefono = applied.clienteTelefono = fields.customerPhone.trim()
      await prisma.cliente.update({ where: { id: clienteId }, data })
    }
  }

  return applied
}

export async function analyzeCalendarImportWithAI(
  importId: number,
  options: { autoApply?: boolean } = {}
) {
  const config = await getAIConfig()
  if (!config.configured) throw new Error('Connessione AI non configurata o disabilitata')
  const imported = await prisma.googleCalendarImport.findUnique({ where: { id: importId } })
  if (!imported) throw new Error('Importazione Google Calendar non trovata')
  const resource = await currentResource(imported)
  const input = {
    source: 'google_calendar',
    classification: imported.tipoRisorsa,
    warning: imported.warning,
    originalGoogleEvent: JSON.parse(imported.rawData),
    currentGestionaleRecord: resource
  }
  const storedInput = config.includePersonalData ? JSON.stringify(input) : redactPersonalData(JSON.stringify(input))
  const operation = await prisma.aiOperation.create({
    data: {
      sourceType: 'google_calendar_import',
      sourceId: String(importId),
      operationType: 'analyze_complete_correct',
      status: 'running',
      provider: config.provider,
      model: config.model,
      inputData: storedInput
    }
  })

  try {
    const { raw, parsed } = await requestAnalysis(config, input)
    const canApply = (
      (options.autoApply ?? config.autoApply) &&
      parsed.shouldApply &&
      (!imported.risorsaId || parsed.resourceType === imported.tipoRisorsa) &&
      parsed.confidence >= config.minConfidence
    )
    const proposedChanges = parsed.fields
    const appliedChanges = canApply ? await applyAnalysis(imported, parsed) : null
    const status = canApply ? 'applied' : 'review'

    await prisma.$transaction([
      prisma.aiOperation.update({
        where: { id: operation.id },
        data: {
          status,
          outputData: JSON.stringify({
            responseId: raw.id || null,
            resourceType: parsed.resourceType,
            summary: parsed.reasoningSummary,
            warnings: parsed.warnings
          }),
          proposedChanges: JSON.stringify(proposedChanges),
          appliedChanges: appliedChanges ? JSON.stringify(appliedChanges) : null,
          confidence: parsed.confidence,
          requiresReview: !canApply,
          completedAt: new Date()
        }
      }),
      prisma.googleCalendarImport.update({
        where: { id: importId },
        data: {
          aiStatus: status,
          aiAnalyzedAt: new Date(),
          warning: parsed.warnings.length ? parsed.warnings.join('; ') : imported.warning
        }
      })
    ])
    return { operationId: operation.id, status, confidence: parsed.confidence, proposedChanges, appliedChanges }
  } catch (error: any) {
    await prisma.$transaction([
      prisma.aiOperation.update({
        where: { id: operation.id },
        data: { status: 'failed', error: error.message || String(error), completedAt: new Date() }
      }),
      prisma.googleCalendarImport.update({
        where: { id: importId },
        data: { aiStatus: 'failed', aiAnalyzedAt: new Date() }
      })
    ])
    throw error
  }
}

let activeBatch: Promise<any> | null = null

export function processPendingAIEnhancements(limit = Number(process.env.AI_BATCH_SIZE || '10')) {
  if (activeBatch) return activeBatch
  activeBatch = (async () => {
    const config = await getAIConfig()
    if (!config.configured) return { configured: false, processed: 0, applied: 0, review: 0, failed: 0 }
    const pending = await prisma.googleCalendarImport.findMany({
      where: {
        stato: { not: 'deleted' },
        OR: [{ aiStatus: null }, { aiStatus: 'pending' }, { aiStatus: 'failed' }]
      },
      orderBy: { lastImportedAt: 'asc' },
      take: Math.max(1, Math.min(50, limit))
    })
    const result = { configured: true, processed: 0, applied: 0, review: 0, failed: 0 }
    for (const item of pending) {
      if (item.aiStatus === 'failed') {
        const failures = await prisma.aiOperation.count({
          where: {
            sourceType: 'google_calendar_import',
            sourceId: String(item.id),
            status: 'failed'
          }
        })
        if (failures >= 3) continue
      }
      try {
        const analyzed = await analyzeCalendarImportWithAI(item.id)
        result.processed++
        if (analyzed.status === 'applied') result.applied++
        else result.review++
      } catch {
        result.processed++
        result.failed++
      }
    }
    return result
  })().finally(() => {
    activeBatch = null
  })
  return activeBatch
}

export async function reviewAIOperation(operationId: string, apply: boolean, reviewer: string) {
  const operation = await prisma.aiOperation.findUnique({ where: { id: operationId } })
  if (!operation) throw new Error('Operazione AI non trovata')
  if (operation.status !== 'review') throw new Error('Operazione AI non in attesa di revisione')
  if (operation.sourceType !== 'google_calendar_import' || !operation.sourceId) {
    throw new Error('Tipo di operazione AI non applicabile')
  }

  if (!apply) {
    await prisma.aiOperation.update({
      where: { id: operationId },
      data: { status: 'rejected', requiresReview: false, reviewedBy: reviewer, reviewedAt: new Date() }
    })
    return { status: 'rejected', appliedChanges: null }
  }

  const imported = await prisma.googleCalendarImport.findUnique({
    where: { id: Number(operation.sourceId) }
  })
  if (!imported) throw new Error('Importazione collegata non trovata')
  const fields = JSON.parse(operation.proposedChanges || '{}') as AIAnalysis['fields']
  const output = JSON.parse(operation.outputData || '{}')
  const analysis: AIAnalysis = {
    resourceType: output.resourceType === 'evento' || output.resourceType === 'appuntamento'
      ? output.resourceType
      : imported.tipoRisorsa as 'evento' | 'appuntamento',
    confidence: operation.confidence || 0,
    shouldApply: true,
    reasoningSummary: 'Applicazione approvata manualmente',
    warnings: [],
    fields
  }
  const appliedChanges = await applyAnalysis(imported, analysis)
  await prisma.$transaction([
    prisma.aiOperation.update({
      where: { id: operationId },
      data: {
        status: 'applied',
        appliedChanges: JSON.stringify(appliedChanges),
        requiresReview: false,
        reviewedBy: reviewer,
        reviewedAt: new Date()
      }
    }),
    prisma.googleCalendarImport.update({
      where: { id: imported.id },
      data: { aiStatus: 'applied' }
    })
  ])
  return { status: 'applied', appliedChanges }
}
