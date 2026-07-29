import prisma from '@/lib/prisma'
import { syncAppuntamentoToGcal, syncEventoToGcal } from '@/lib/google-calendar-sync'

type Entity = 'cliente' | 'evento' | 'appuntamento'

const FIELDS: Record<Entity, Set<string>> = {
  cliente: new Set([
    'nome', 'cognome', 'email', 'telefono', 'telefonoAlt', 'indirizzo', 'cap',
    'citta', 'dataNascita', 'codiceFiscale', 'tipoCliente', 'canalePrimoContatto',
    'dataPrimoContatto', 'secondoContattoNome', 'secondoContattoTelefono',
    'secondoContattoEmail', 'notaAnagrafica'
  ]),
  evento: new Set([
    'titolo', 'tipo', 'dataConfermata', 'fascia', 'stato', 'personePreviste',
    'note', 'dateProposte', 'luogo', 'prezzo', 'menuPasto', 'menuBuffet', 'sposa', 'sposo'
  ]),
  appuntamento: new Set([
    'clientePrincipaleId', 'dataAppuntamento', 'durataMinuti', 'esito',
    'riassuntoColloquio', 'noteColloquio', 'statoFunnel', 'datiMancanti',
    'tipoEventoRichiesto', 'personePreviste', 'dataEventoRichiesta',
    'dateOpzionate', 'dataScadenzaOpzione', 'statoOpzione'
  ])
}

const DATE_FIELDS = new Set([
  'dataNascita', 'dataPrimoContatto', 'dataConfermata', 'dataAppuntamento',
  'dataEventoRichiesta', 'dataScadenzaOpzione'
])

export const aiToolDefinitions = [
  {
    type: 'function',
    name: 'search_records',
    description: 'Cerca clienti, eventi o appuntamenti nel gestionale.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['entity'],
      properties: {
        entity: { type: 'string', enum: ['cliente', 'evento', 'appuntamento'] },
        query: { type: ['string', 'null'] },
        limit: { type: ['integer', 'null'], minimum: 1, maximum: 100 }
      }
    }
  },
  {
    type: 'function',
    name: 'get_record',
    description: 'Legge un record completo tramite tipo e ID.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['entity', 'id'],
      properties: {
        entity: { type: 'string', enum: ['cliente', 'evento', 'appuntamento'] },
        id: { type: 'integer', minimum: 1 }
      }
    }
  },
  {
    type: 'function',
    name: 'create_record',
    description: 'Crea un cliente, evento o appuntamento usando soltanto campi consentiti.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['entity', 'data', 'reason'],
      properties: {
        entity: { type: 'string', enum: ['cliente', 'evento', 'appuntamento'] },
        data: { type: 'object' },
        reason: { type: 'string' }
      }
    }
  },
  {
    type: 'function',
    name: 'update_record',
    description: 'Modifica un record esistente usando soltanto campi consentiti.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['entity', 'id', 'data', 'reason'],
      properties: {
        entity: { type: 'string', enum: ['cliente', 'evento', 'appuntamento'] },
        id: { type: 'integer', minimum: 1 },
        data: { type: 'object' },
        reason: { type: 'string' }
      }
    }
  },
  {
    type: 'function',
    name: 'run_quality_audit',
    description: 'Trova dati mancanti o incoerenti nel gestionale senza modificarli.',
    parameters: { type: 'object', additionalProperties: false, properties: {} }
  },
  {
    type: 'function',
    name: 'generate_management_report',
    description: 'Genera un rapporto gestionale aggregato sugli ultimi tre anni: clienti, appuntamenti, funnel, eventi, ospiti e dati incompleti.',
    parameters: { type: 'object', additionalProperties: false, properties: {} }
  }
]

function entity(value: unknown): Entity {
  if (value === 'cliente' || value === 'evento' || value === 'appuntamento') return value
  throw new Error('Entità non valida')
}

function cleanData(type: Entity, data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Dati non validi')
  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!FIELDS[type].has(key)) continue
    if (DATE_FIELDS.has(key)) {
      if (value === null) cleaned[key] = null
      else {
        const date = new Date(String(value))
        if (Number.isNaN(date.getTime())) throw new Error(`Data non valida per ${key}`)
        cleaned[key] = date
      }
    } else {
      cleaned[key] = value
    }
  }
  if (!Object.keys(cleaned).length) throw new Error('Nessun campo consentito ricevuto')
  return cleaned
}

async function getRecord(type: Entity, id: number) {
  if (type === 'cliente') {
    return prisma.cliente.findUnique({
      where: { id },
      include: { eventi: true, appuntamentiPrincipali: true }
    })
  }
  if (type === 'evento') {
    return prisma.evento.findUnique({
      where: { id },
      include: { clienti: { include: { cliente: true } } }
    })
  }
  return prisma.appuntamento.findUnique({
    where: { id },
    include: { clientePrincipale: true, clienti: { include: { cliente: true } } }
  })
}

async function searchRecords(type: Entity, query: string | null, limit: number) {
  if (type === 'cliente') {
    return prisma.cliente.findMany({
      where: query ? {
        OR: [
          { nome: { contains: query } },
          { cognome: { contains: query } },
          { email: { contains: query } },
          { telefono: { contains: query } }
        ]
      } : undefined,
      take: limit,
      orderBy: { updatedAt: 'desc' }
    })
  }
  if (type === 'evento') {
    return prisma.evento.findMany({
      where: query ? {
        OR: [{ titolo: { contains: query } }, { note: { contains: query } }, { luogo: { contains: query } }]
      } : undefined,
      take: limit,
      orderBy: { updatedAt: 'desc' }
    })
  }
  return prisma.appuntamento.findMany({
    where: query ? {
      OR: [
        { riassuntoColloquio: { contains: query } },
        { noteColloquio: { contains: query } },
        { clientePrincipale: { nome: { contains: query } } }
      ]
    } : undefined,
    include: { clientePrincipale: true },
    take: limit,
    orderBy: { updatedAt: 'desc' }
  })
}

async function writeAudit(
  type: Entity,
  id: number,
  action: 'CREATE' | 'UPDATE',
  actor: string,
  reason: string,
  oldValue: unknown,
  newValue: unknown
) {
  await prisma.auditLog.create({
    data: {
      entityType: type.toUpperCase(),
      entityId: String(id),
      action: `AI_${action}`,
      oldValue: oldValue as any,
      newValue: newValue as any,
      actorEmail: actor,
      actorRole: 'AI',
      metadata: { reason, source: 'ai_tools_gateway' }
    }
  })
}

async function createRecord(type: Entity, rawData: unknown, actor: string, reason: string) {
  const data = cleanData(type, rawData)
  if (type === 'cliente') {
    if (!data.nome?.trim()) throw new Error('Il nome cliente è obbligatorio')
    const created = await prisma.cliente.create({ data: data as any })
    await writeAudit(type, created.id, 'CREATE', actor, reason, null, created)
    return created
  }
  if (type === 'evento') {
    for (const key of ['titolo', 'tipo', 'fascia', 'stato']) {
      if (!data[key]) throw new Error(`Campo evento obbligatorio: ${key}`)
    }
    const created = await prisma.evento.create({ data: data as any })
    await writeAudit(type, created.id, 'CREATE', actor, reason, null, created)
    syncEventoToGcal(created.id).catch(() => {})
    return created
  }

  if (!data.clientePrincipaleId || !data.dataAppuntamento) {
    throw new Error('clientePrincipaleId e dataAppuntamento sono obbligatori')
  }
  const cliente = await prisma.cliente.findUnique({ where: { id: Number(data.clientePrincipaleId) } })
  if (!cliente) throw new Error('Cliente principale non trovato')
  const created = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appuntamento.create({ data: data as any })
    await tx.appuntamentoCliente.create({
      data: { appuntamentoId: appointment.id, clienteId: appointment.clientePrincipaleId }
    })
    return appointment
  })
  await writeAudit(type, created.id, 'CREATE', actor, reason, null, created)
  syncAppuntamentoToGcal(created.id).catch(() => {})
  return created
}

async function updateRecord(type: Entity, id: number, rawData: unknown, actor: string, reason: string) {
  const before = await getRecord(type, id)
  if (!before) throw new Error('Record non trovato')
  const data = cleanData(type, rawData)
  let updated
  if (type === 'cliente') updated = await prisma.cliente.update({ where: { id }, data })
  else if (type === 'evento') updated = await prisma.evento.update({ where: { id }, data })
  else updated = await prisma.appuntamento.update({ where: { id }, data })
  await writeAudit(type, id, 'UPDATE', actor, reason, before, updated)
  if (type === 'evento') syncEventoToGcal(id).catch(() => {})
  if (type === 'appuntamento') syncAppuntamentoToGcal(id).catch(() => {})
  return updated
}

async function runQualityAudit() {
  const [eventi, appuntamenti, clienti] = await Promise.all([
    prisma.evento.findMany({
      where: {
        OR: [
          { dataConfermata: null },
          { personePreviste: null },
          { luogo: null },
          { note: null }
        ]
      },
      select: {
        id: true, titolo: true, dataConfermata: true, personePreviste: true,
        luogo: true, note: true
      },
      take: 100
    }),
    prisma.appuntamento.findMany({
      where: { OR: [{ durataMinuti: { lte: 0 } }, { noteColloquio: null }] },
      include: { clientePrincipale: true },
      take: 100
    }),
    prisma.cliente.findMany({
      where: { AND: [{ email: null }, { telefono: null }] },
      select: { id: true, nome: true, cognome: true },
      take: 100
    })
  ])

  return {
    eventi: eventi.map((item) => ({
      ...item,
      missing: [
        !item.dataConfermata && 'dataConfermata',
        item.personePreviste === null && 'personePreviste',
        !item.luogo && 'luogo',
        !item.note && 'note'
      ].filter(Boolean)
    })),
    appuntamenti: appuntamenti.map((item) => ({
      id: item.id,
      cliente: `${item.clientePrincipale.nome} ${item.clientePrincipale.cognome || ''}`.trim(),
      missing: [
        (!item.durataMinuti || item.durataMinuti <= 0) && 'durataMinuti',
        !item.noteColloquio && 'noteColloquio'
      ].filter(Boolean)
    })),
    clienti: clienti.map((item) => ({ ...item, missing: ['email', 'telefono'] }))
  }
}

async function generateManagementReport() {
  const from = new Date()
  from.setFullYear(from.getFullYear() - 3)
  from.setHours(0, 0, 0, 0)
  const [
    clienti,
    appuntamenti,
    eventi,
    funnel,
    tipiEvento,
    prossimiEventi,
    invitati
  ] = await Promise.all([
    prisma.cliente.count({ where: { createdAt: { gte: from } } }),
    prisma.appuntamento.count({ where: { dataAppuntamento: { gte: from } } }),
    prisma.evento.count({
      where: { OR: [{ dataConfermata: { gte: from } }, { createdAt: { gte: from } }] }
    }),
    prisma.appuntamento.groupBy({
      by: ['statoFunnel'],
      where: { dataAppuntamento: { gte: from } },
      _count: { _all: true }
    }),
    prisma.evento.groupBy({
      by: ['tipo'],
      where: { OR: [{ dataConfermata: { gte: from } }, { createdAt: { gte: from } }] },
      _count: { _all: true }
    }),
    prisma.evento.findMany({
      where: { dataConfermata: { gte: new Date() }, stato: { not: 'annullato' } },
      orderBy: { dataConfermata: 'asc' },
      take: 10,
      select: { id: true, titolo: true, tipo: true, dataConfermata: true, personePreviste: true }
    }),
    prisma.evento.aggregate({
      where: { dataConfermata: { gte: from } },
      _sum: { personePreviste: true }
    })
  ])
  return {
    periodoDa: from.toISOString(),
    totali: {
      clientiCreati: clienti,
      appuntamenti,
      eventi,
      invitatiPrevisti: invitati._sum.personePreviste || 0
    },
    funnel: funnel.map((item) => ({ stato: item.statoFunnel || 'non_definito', totale: item._count._all })),
    tipiEvento: tipiEvento.map((item) => ({ tipo: item.tipo, totale: item._count._all })),
    prossimiEventi
  }
}

export async function executeAITool(
  name: string,
  args: any,
  context: { actor: string; writesEnabled: boolean }
) {
  if (name === 'search_records') {
    return searchRecords(entity(args.entity), args.query || null, Math.max(1, Math.min(100, Number(args.limit || 25))))
  }
  if (name === 'get_record') return getRecord(entity(args.entity), Number(args.id))
  if (name === 'run_quality_audit') return runQualityAudit()
  if (name === 'generate_management_report') return generateManagementReport()
  if (name === 'create_record' || name === 'update_record') {
    if (!context.writesEnabled) throw new Error('Scritture AI disabilitate lato server')
    if (!String(args.reason || '').trim()) throw new Error('Motivazione obbligatoria per le scritture AI')
    if (name === 'create_record') {
      return createRecord(entity(args.entity), args.data, context.actor, String(args.reason))
    }
    return updateRecord(entity(args.entity), Number(args.id), args.data, context.actor, String(args.reason))
  }
  throw new Error('Strumento AI non riconosciuto')
}
