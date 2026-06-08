import prisma from '@/lib/prisma'
import {
  OperationalReportResponse,
  REPORT_SPAM_OPTIONS,
  REPORT_STATUS_OPTIONS,
  ReportActivityRow,
  ReportClientRow,
  ReportOperatorRow,
  ReportPeriod,
  ReportQueryFilters,
  ReportTrendPoint,
  SpamMode
} from '@/lib/report/types'

const COMPLETED_OUTCOMES = new Set(['svolto', 'positivo', 'negativo'])

type EffectiveSpamMode = 'include' | 'exclude'

type ClientAccumulator = {
  clientId: number
  client: any
  contactInPeriod: boolean
  appointments: any[]
  interactions: any[]
  events: any[]
}

function parseDateInput(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return new Date()
  return date
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function toIso(value?: Date | string | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function safeText(value: any) {
  return typeof value === 'string' ? value.trim() : ''
}

function fullName(client: any) {
  return [safeText(client?.nome), safeText(client?.cognome)].filter(Boolean).join(' ').trim() || 'Cliente senza nome'
}

function operatorLabel(operator: any) {
  return safeText(operator?.email) || 'Non assegnato'
}

function sourceLabel(source?: string | null) {
  return safeText(source) || 'Non specificata'
}

function formatPeriodLabel(period: ReportPeriod, start: Date, end: Date) {
  if (period === 'week') {
    return `Settimana ${start.toLocaleDateString('it-IT')} → ${end.toLocaleDateString('it-IT')}`
  }
  if (period === 'month') {
    return start.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  }
  return `Anno ${start.getFullYear()}`
}

function resolveRange(period: ReportPeriod, referenceDate: string) {
  const base = parseDateInput(referenceDate)
  const start = new Date(base)
  const end = new Date(base)

  if (period === 'week') {
    const day = base.getDay() === 0 ? 7 : base.getDay()
    start.setDate(base.getDate() - day + 1)
    end.setDate(start.getDate() + 6)
    return { start: startOfDay(start), end: endOfDay(end) }
  }

  if (period === 'month') {
    return {
      start: startOfDay(new Date(base.getFullYear(), base.getMonth(), 1)),
      end: endOfDay(new Date(base.getFullYear(), base.getMonth() + 1, 0))
    }
  }

  return {
    start: startOfDay(new Date(base.getFullYear(), 0, 1)),
    end: endOfDay(new Date(base.getFullYear(), 11, 31))
  }
}

function normalizePeriod(value?: string | null): ReportPeriod {
  return value === 'week' || value === 'year' ? value : 'month'
}

function normalizeSpamMode(period: ReportPeriod, value?: string | null): EffectiveSpamMode {
  const requested = value === 'exclude' ? 'exclude' : 'policy'
  if (requested === 'exclude') return 'exclude'
  return period === 'week' ? 'include' : 'exclude'
}

export function parseReportFilters(searchParams: URLSearchParams): ReportQueryFilters {
  const period = normalizePeriod(searchParams.get('period'))
  const referenceDate = searchParams.get('referenceDate') || new Date().toISOString().slice(0, 10)
  const spamMode = (searchParams.get('spamMode') === 'exclude' ? 'exclude' : 'policy') as SpamMode

  return {
    period,
    referenceDate,
    operatorId: searchParams.get('operatorId') || '',
    source: searchParams.get('source') || '',
    status: searchParams.get('status') || '',
    spamMode
  }
}

function isCompletedAppointment(app: any) {
  return COMPLETED_OUTCOMES.has(safeText(app?.esito).toLowerCase())
}

function shouldCountInteraction(interaction: any) {
  return safeText(interaction?.tipo).toLowerCase() !== 'appuntamento'
}

function matchesStatus(item: any, status: string) {
  if (!status) return true
  return [safeText(item?.esito), safeText(item?.statoFunnel), safeText(item?.stato)]
    .filter(Boolean)
    .some((value) => value === status)
}

function pushUnique(items: any[], candidate: any) {
  if (!candidate || items.some((item) => item.id === candidate.id)) return
  items.push(candidate)
}

function createTrendSkeleton(period: ReportPeriod, start: Date, end: Date) {
  const points: ReportTrendPoint[] = []

  if (period === 'year') {
    for (let month = 0; month < 12; month += 1) {
      const date = new Date(start.getFullYear(), month, 1)
      points.push({
        key: `${date.getFullYear()}-${String(month + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('it-IT', { month: 'short' }),
        contacts: 0,
        appointments: 0,
        completedAppointments: 0,
        interactions: 0,
        confirmedEvents: 0
      })
    }
    return points
  }

  const cursor = new Date(start)
  while (cursor <= end) {
    points.push({
      key: cursor.toISOString().slice(0, 10),
      label: period === 'week'
        ? cursor.toLocaleDateString('it-IT', { weekday: 'short' })
        : cursor.toLocaleDateString('it-IT', { day: '2-digit' }),
      contacts: 0,
      appointments: 0,
      completedAppointments: 0,
      interactions: 0,
      confirmedEvents: 0
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return points
}

function trendKeyForDate(period: ReportPeriod, value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (period === 'year') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  return date.toISOString().slice(0, 10)
}

function buildSummaryText(values: string[]) {
  const unique = Array.from(new Set(values.map((value) => safeText(value)).filter(Boolean)))
  if (!unique.length) return 'Nessun riassunto disponibile'
  return unique.slice(0, 3).join(' • ')
}

function buildActivityLabels(activities: ReportActivityRow[]) {
  return activities
    .slice(0, 5)
    .map((activity) => `${new Date(activity.date).toLocaleDateString('it-IT')}: ${activity.type}${activity.summary ? ` — ${activity.summary}` : ''}`)
}

export async function getOperationalReport(filters: ReportQueryFilters): Promise<OperationalReportResponse> {
  const range = resolveRange(filters.period, filters.referenceDate)
  const effectiveSpamMode = normalizeSpamMode(filters.period, filters.spamMode)

  const [contacts, appointments, interactions, events, users] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        dataPrimoContatto: {
          gte: range.start,
          lte: range.end
        }
      }
    }),
    prisma.appuntamento.findMany({
      where: {
        dataAppuntamento: {
          gte: range.start,
          lte: range.end
        }
      },
      include: {
        clientePrincipale: true,
        clienti: { include: { cliente: true } },
        interazioni: true,
        operatore: true,
        eventi: {
          select: {
            id: true,
            titolo: true,
            stato: true,
            dataConfermata: true
          }
        }
      },
      orderBy: { dataAppuntamento: 'desc' }
    }),
    prisma.interazioneCliente.findMany({
      where: {
        dataInterazione: {
          gte: range.start,
          lte: range.end
        }
      },
      include: {
        cliente: true,
        operatore: true,
        appuntamento: {
          select: {
            id: true,
            esito: true,
            statoFunnel: true,
            operatoreId: true
          }
        }
      },
      orderBy: { dataInterazione: 'desc' }
    }),
    prisma.evento.findMany({
      where: {
        tipo: { not: 'Appuntamento' },
        stato: { not: 'annullato' },
        dataConfermata: {
          gte: range.start,
          lte: range.end
        }
      },
      include: {
        clienti: { include: { cliente: true } },
        appuntamentoOrigine: {
          include: {
            operatore: true,
            clientePrincipale: true
          }
        }
      },
      orderBy: { dataConfermata: 'desc' }
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { email: 'asc' }
    })
  ])

  const clientsMap = new Map<number, ClientAccumulator>()
  const ensureClient = (client: any) => {
    if (!client?.id) return null
    const existing = clientsMap.get(client.id)
    const contactInPeriod = !!client.dataPrimoContatto && new Date(client.dataPrimoContatto) >= range.start && new Date(client.dataPrimoContatto) <= range.end
    if (existing) {
      existing.client = { ...existing.client, ...client }
      existing.contactInPeriod = existing.contactInPeriod || contactInPeriod
      return existing
    }
    const created: ClientAccumulator = {
      clientId: client.id,
      client,
      contactInPeriod,
      appointments: [],
      interactions: [],
      events: []
    }
    clientsMap.set(client.id, created)
    return created
  }

  contacts.forEach((client) => {
    ensureClient(client)
  })

  appointments.forEach((appointment) => {
    const clientIds = new Set<number>()
    clientIds.add(appointment.clientePrincipaleId)
    appointment.clienti.forEach((entry: any) => {
      if (entry?.cliente?.id) clientIds.add(entry.cliente.id)
      if (entry?.cliente) ensureClient(entry.cliente)
    })
    ensureClient(appointment.clientePrincipale)
    clientIds.forEach((clientId) => {
      const acc = clientsMap.get(clientId)
      if (!acc) return
      pushUnique(acc.appointments, appointment)
    })
  })

  interactions.forEach((interaction) => {
    const acc = ensureClient(interaction.cliente)
    if (!acc) return
    pushUnique(acc.interactions, interaction)
  })

  events.forEach((event) => {
    event.clienti.forEach((entry: any) => {
      const acc = ensureClient(entry.cliente)
      if (!acc) return
      pushUnique(acc.events, event)
    })
    if (!event.clienti.length && event.appuntamentoOrigine?.clientePrincipale) {
      const acc = ensureClient(event.appuntamentoOrigine.clientePrincipale)
      if (acc) pushUnique(acc.events, event)
    }
  })

  const rawClientAccumulators = Array.from(clientsMap.values())
  const sourceOptions = Array.from(
    new Set(rawClientAccumulators.map((entry) => sourceLabel(entry.client?.canalePrimoContatto)).filter(Boolean))
  )

  const visibleClients = rawClientAccumulators
    .map((entry) => {
      const filteredAppointments = entry.appointments.filter((appointment) => {
        if (filters.operatorId && safeText(appointment.operatoreId) !== filters.operatorId) return false
        return matchesStatus(appointment, filters.status)
      })

      const filteredInteractions = entry.interactions.filter((interaction) => {
        if (filters.operatorId && safeText(interaction.operatoreId) !== filters.operatorId) return false
        if (!filters.status) return true
        return matchesStatus(interaction.appuntamento, filters.status)
      })

      const filteredEvents = entry.events.filter((event) => {
        if (filters.operatorId && safeText(event.appuntamentoOrigine?.operatoreId) !== filters.operatorId) return false
        return matchesStatus(event, filters.status)
      })

      const hasVisibleActivities = filteredAppointments.length > 0 || filteredInteractions.length > 0 || filteredEvents.length > 0
      if (filters.status && !hasVisibleActivities) {
        return null
      }

      if (filters.operatorId && !hasVisibleActivities) {
        return null
      }

      if (filters.source && sourceLabel(entry.client?.canalePrimoContatto) !== filters.source) {
        return null
      }

      if (effectiveSpamMode === 'exclude' && entry.client?.isSpam) {
        return null
      }

      if (!entry.contactInPeriod && !hasVisibleActivities) {
        return null
      }

      return {
        ...entry,
        appointments: filteredAppointments,
        interactions: filteredInteractions,
        events: filteredEvents
      }
    })
    .filter(Boolean) as ClientAccumulator[]

  const hiddenSpamCount = rawClientAccumulators.filter((entry) => {
    if (!entry.client?.isSpam) return false
    if (!entry.contactInPeriod && !entry.appointments.length && !entry.interactions.length && !entry.events.length) return false
    if (filters.source && sourceLabel(entry.client?.canalePrimoContatto) !== filters.source) return false
    if (filters.operatorId) {
      const hasMatchingOperator = entry.appointments.some((appointment) => safeText(appointment.operatoreId) === filters.operatorId)
        || entry.interactions.some((interaction) => safeText(interaction.operatoreId) === filters.operatorId)
        || entry.events.some((event) => safeText(event.appuntamentoOrigine?.operatoreId) === filters.operatorId)
      if (!hasMatchingOperator) return false
    }
    if (filters.status) {
      const hasMatchingStatus = entry.appointments.some((appointment) => matchesStatus(appointment, filters.status))
        || entry.interactions.some((interaction) => matchesStatus(interaction.appuntamento, filters.status))
        || entry.events.some((event) => matchesStatus(event, filters.status))
      if (!hasMatchingStatus) return false
    }
    return true
  }).length

  const clientRows: ReportClientRow[] = []
  const activityRows: ReportActivityRow[] = []
  const uniqueAppointments = new Map<number, any>()
  const uniqueManualInteractions = new Map<number, any>()
  const uniqueEvents = new Map<number, any>()
  const trend = createTrendSkeleton(filters.period, range.start, range.end)
  const trendMap = new Map(trend.map((point) => [point.key, point]))

  visibleClients.forEach((entry) => {
    if (entry.contactInPeriod) {
      const trendPoint = trendMap.get(trendKeyForDate(filters.period, entry.client?.dataPrimoContatto) || '')
      if (trendPoint) trendPoint.contacts += 1
    }

    entry.appointments.forEach((appointment) => {
      if (!uniqueAppointments.has(appointment.id)) {
        uniqueAppointments.set(appointment.id, appointment)
        const trendPoint = trendMap.get(trendKeyForDate(filters.period, appointment.dataAppuntamento) || '')
        if (trendPoint) {
          trendPoint.appointments += 1
          if (isCompletedAppointment(appointment)) trendPoint.completedAppointments += 1
        }
      }
    })

    entry.interactions.forEach((interaction) => {
      if (!shouldCountInteraction(interaction)) return
      if (uniqueManualInteractions.has(interaction.id)) return
      uniqueManualInteractions.set(interaction.id, interaction)
      const trendPoint = trendMap.get(trendKeyForDate(filters.period, interaction.dataInterazione) || '')
      if (trendPoint) trendPoint.interactions += 1
    })

    entry.events.forEach((event) => {
      if (uniqueEvents.has(event.id)) return
      uniqueEvents.set(event.id, event)
      const trendPoint = trendMap.get(trendKeyForDate(filters.period, event.dataConfermata) || '')
      if (trendPoint) trendPoint.confirmedEvents += 1
    })

    const manualInteractions = entry.interactions.filter(shouldCountInteraction)
    const totalTimeMinutes = entry.appointments.reduce((sum, appointment) => sum + (appointment.durataMinuti || 0), 0)
      + manualInteractions.reduce((sum, interaction) => sum + (interaction.durataMinuti || 0), 0)

    const clientActivityRows: ReportActivityRow[] = [
      ...entry.appointments.map((appointment) => ({
        id: `appointment-${appointment.id}`,
        clientId: entry.clientId,
        clientName: fullName(entry.client),
        date: toIso(appointment.dataAppuntamento) || new Date().toISOString(),
        type: 'Appuntamento',
        summary: buildSummaryText([appointment.riassuntoColloquio, appointment.noteColloquio]),
        operator: operatorLabel(appointment.operatore),
        outcome: safeText(appointment.esito) || safeText(appointment.statoFunnel) || '—',
        durationMinutes: appointment.durataMinuti || 0,
        isSpam: Boolean(entry.client?.isSpam)
      })),
      ...manualInteractions.map((interaction) => ({
        id: `interaction-${interaction.id}`,
        clientId: entry.clientId,
        clientName: fullName(entry.client),
        date: toIso(interaction.dataInterazione) || new Date().toISOString(),
        type: `Interazione ${safeText(interaction.tipo) || 'cliente'}`,
        summary: safeText(interaction.sintesi) || 'Interazione registrata',
        operator: operatorLabel(interaction.operatore),
        outcome: safeText(interaction.appuntamento?.esito) || safeText(interaction.appuntamento?.statoFunnel) || '—',
        durationMinutes: interaction.durataMinuti || 0,
        isSpam: Boolean(entry.client?.isSpam)
      })),
      ...entry.events.map((event) => ({
        id: `event-${event.id}`,
        clientId: entry.clientId,
        clientName: fullName(entry.client),
        date: toIso(event.dataConfermata) || new Date().toISOString(),
        type: 'Evento confermato',
        summary: safeText(event.titolo) || 'Evento confermato',
        operator: operatorLabel(event.appuntamentoOrigine?.operatore),
        outcome: safeText(event.stato) || 'confermato',
        durationMinutes: 0,
        isSpam: Boolean(entry.client?.isSpam)
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    clientActivityRows.forEach((activity) => activityRows.push(activity))

    const operators = Array.from(new Set(clientActivityRows.map((activity) => activity.operator).filter(Boolean)))
    const outcomes = Array.from(new Set(entry.appointments.map((appointment) => safeText(appointment.esito)).filter(Boolean)))
    const funnels = Array.from(new Set(entry.appointments.map((appointment) => safeText(appointment.statoFunnel)).filter(Boolean)))

    clientRows.push({
      clientId: entry.clientId,
      fullName: fullName(entry.client),
      source: sourceLabel(entry.client?.canalePrimoContatto),
      firstContactAt: toIso(entry.client?.dataPrimoContatto),
      isSpam: Boolean(entry.client?.isSpam),
      spamReason: safeText(entry.client?.spamReason) || null,
      appointmentsScheduled: entry.appointments.length,
      appointmentsCompleted: entry.appointments.filter(isCompletedAppointment).length,
      interactionsCount: manualInteractions.length,
      totalTimeMinutes,
      confirmedEvents: entry.events.length,
      summary: buildSummaryText([
        ...entry.appointments.flatMap((appointment) => [appointment.riassuntoColloquio, appointment.noteColloquio]),
        ...manualInteractions.map((interaction) => interaction.sintesi)
      ]),
      activities: buildActivityLabels(clientActivityRows),
      operators,
      outcomes,
      funnels,
      latestActivityAt: clientActivityRows[0]?.date || toIso(entry.client?.dataPrimoContatto)
    })
  })

  const isContactInRange = (value?: string | null) => {
    if (!value) return false
    const firstContact = new Date(value)
    return firstContact >= range.start && firstContact <= range.end
  }

  const contactsTotal = clientRows.filter((client) => {
    if (!client.firstContactAt) return false
    return isContactInRange(client.firstContactAt)
  }).length
  const contactsSpam = clientRows.filter((client) => client.isSpam && isContactInRange(client.firstContactAt)).length
  const contactsValid = clientRows.filter((client) => !client.isSpam && isContactInRange(client.firstContactAt)).length

  const sourcesMap = new Map<string, { total: number; valid: number; spam: number }>()
  clientRows.forEach((client) => {
    if (!isContactInRange(client.firstContactAt)) return
    const bucket = sourcesMap.get(client.source) || { total: 0, valid: 0, spam: 0 }
    bucket.total += 1
    if (client.isSpam) bucket.spam += 1
    else bucket.valid += 1
    sourcesMap.set(client.source, bucket)
  })

  const operatorsMap = new Map<string, ReportOperatorRow>()
  const operatorClients = new Map<string, Set<number>>()
  Array.from(uniqueAppointments.values()).forEach((appointment) => {
    const key = safeText(appointment.operatoreId) || 'unassigned'
    const row = operatorsMap.get(key) || {
      operatorId: key,
      operatorName: operatorLabel(appointment.operatore),
      clientsCount: 0,
      appointmentsScheduled: 0,
      appointmentsCompleted: 0,
      interactionsCount: 0,
      totalTimeMinutes: 0,
      confirmedEvents: 0
    }
    row.appointmentsScheduled += 1
    row.totalTimeMinutes += appointment.durataMinuti || 0
    if (isCompletedAppointment(appointment)) row.appointmentsCompleted += 1
    operatorsMap.set(key, row)
    if (!operatorClients.has(key)) operatorClients.set(key, new Set())
    operatorClients.get(key)?.add(appointment.clientePrincipaleId)
  })

  Array.from(uniqueManualInteractions.values()).forEach((interaction) => {
    const key = safeText(interaction.operatoreId) || 'unassigned'
    const row = operatorsMap.get(key) || {
      operatorId: key,
      operatorName: operatorLabel(interaction.operatore),
      clientsCount: 0,
      appointmentsScheduled: 0,
      appointmentsCompleted: 0,
      interactionsCount: 0,
      totalTimeMinutes: 0,
      confirmedEvents: 0
    }
    row.interactionsCount += 1
    row.totalTimeMinutes += interaction.durataMinuti || 0
    operatorsMap.set(key, row)
    if (!operatorClients.has(key)) operatorClients.set(key, new Set())
    operatorClients.get(key)?.add(interaction.clienteId)
  })

  Array.from(uniqueEvents.values()).forEach((event) => {
    const key = safeText(event.appuntamentoOrigine?.operatoreId) || 'unassigned'
    const row = operatorsMap.get(key) || {
      operatorId: key,
      operatorName: operatorLabel(event.appuntamentoOrigine?.operatore),
      clientsCount: 0,
      appointmentsScheduled: 0,
      appointmentsCompleted: 0,
      interactionsCount: 0,
      totalTimeMinutes: 0,
      confirmedEvents: 0
    }
    row.confirmedEvents += 1
    operatorsMap.set(key, row)
    if (!operatorClients.has(key)) operatorClients.set(key, new Set())
    event.clienti.forEach((entry: any) => operatorClients.get(key)?.add(entry.clienteId))
  })

  operatorsMap.forEach((row, key) => {
    row.clientsCount = operatorClients.get(key)?.size || 0
  })

  const outcomesMap = new Map<string, number>()
  Array.from(uniqueAppointments.values()).forEach((appointment) => {
    const value = safeText(appointment.esito)
    if (!value) return
    outcomesMap.set(value, (outcomesMap.get(value) || 0) + 1)
  })

  const funnelsMap = new Map<string, number>()
  Array.from(uniqueAppointments.values()).forEach((appointment) => {
    const value = safeText(appointment.statoFunnel)
    if (!value) return
    funnelsMap.set(value, (funnelsMap.get(value) || 0) + 1)
  })

  const appointmentsScheduled = uniqueAppointments.size
  const appointmentsCompleted = Array.from(uniqueAppointments.values()).filter(isCompletedAppointment).length
  const interactionsCount = uniqueManualInteractions.size
  const totalTimeMinutes = Array.from(uniqueAppointments.values()).reduce((sum, appointment) => sum + (appointment.durataMinuti || 0), 0)
    + Array.from(uniqueManualInteractions.values()).reduce((sum, interaction) => sum + (interaction.durataMinuti || 0), 0)

  const sortedClients = clientRows.sort((a, b) => {
    const dateA = a.latestActivityAt ? new Date(a.latestActivityAt).getTime() : 0
    const dateB = b.latestActivityAt ? new Date(b.latestActivityAt).getTime() : 0
    return dateB - dateA || a.fullName.localeCompare(b.fullName, 'it')
  })
  const sortedActivities = activityRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const spamClients = sortedClients.filter((client) => client.isSpam)

  return {
    meta: {
      period: filters.period,
      periodLabel: formatPeriodLabel(filters.period, range.start, range.end),
      from: range.start.toISOString(),
      to: range.end.toISOString(),
      generatedAt: new Date().toISOString(),
      effectiveSpamMode,
      spamPolicyLabel: effectiveSpamMode === 'include'
        ? 'Gli spam sono visibili nel report e vanno evidenziati in rosso.'
        : 'Gli spam sono esclusi da conteggi e liste principali per questo periodo.'
    },
    appliedFilters: filters,
    summary: {
      contactsPrimary: effectiveSpamMode === 'include' ? contactsTotal : contactsValid,
      contactsTotal,
      contactsValid,
      contactsSpam,
      contactsExcludedByPolicy: effectiveSpamMode === 'exclude' ? hiddenSpamCount : 0,
      appointmentsScheduled,
      appointmentsCompleted,
      interactionsCount,
      totalTimeMinutes,
      confirmedEvents: uniqueEvents.size,
      clientsCount: sortedClients.length,
      averageInteractionsPerClient: sortedClients.length ? Number((interactionsCount / sortedClients.length).toFixed(2)) : 0,
      averageTimePerClientMinutes: sortedClients.length ? Math.round(totalTimeMinutes / sortedClients.length) : 0
    },
    sources: Array.from(sourcesMap.entries())
      .map(([source, bucket]) => ({
        source,
        contactsTotal: bucket.total,
        contactsValid: bucket.valid,
        contactsSpam: bucket.spam
      }))
      .sort((a, b) => b.contactsTotal - a.contactsTotal),
    operators: Array.from(operatorsMap.values()).sort((a, b) => b.totalTimeMinutes - a.totalTimeMinutes || b.appointmentsScheduled - a.appointmentsScheduled),
    outcomes: Array.from(outcomesMap.entries()).map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count),
    funnels: Array.from(funnelsMap.entries()).map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count),
    trend,
    clients: sortedClients,
    activities: sortedActivities.slice(0, 120),
    spamClients,
    availableFilters: {
      operators: users.map((user) => ({ value: user.id, label: `${user.email} (${user.role})` })),
      sources: sourceOptions.map((value) => ({ value, label: value })),
      statuses: REPORT_STATUS_OPTIONS,
      spamModes: REPORT_SPAM_OPTIONS
    }
  }
}