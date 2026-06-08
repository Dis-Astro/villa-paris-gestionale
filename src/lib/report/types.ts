export type ReportPeriod = 'week' | 'month' | 'year'
export type SpamMode = 'policy' | 'exclude'

export interface ReportQueryFilters {
  period: ReportPeriod
  referenceDate: string
  operatorId: string
  source: string
  status: string
  spamMode: SpamMode
}

export interface ReportOption {
  value: string
  label: string
}

export interface ReportSummary {
  contactsPrimary: number
  contactsTotal: number
  contactsValid: number
  contactsSpam: number
  contactsExcludedByPolicy: number
  appointmentsScheduled: number
  appointmentsCompleted: number
  interactionsCount: number
  totalTimeMinutes: number
  confirmedEvents: number
  clientsCount: number
  averageInteractionsPerClient: number
  averageTimePerClientMinutes: number
}

export interface ReportSourceRow {
  source: string
  contactsTotal: number
  contactsValid: number
  contactsSpam: number
}

export interface ReportOperatorRow {
  operatorId: string
  operatorName: string
  clientsCount: number
  appointmentsScheduled: number
  appointmentsCompleted: number
  interactionsCount: number
  totalTimeMinutes: number
  confirmedEvents: number
}

export interface ReportBreakdownRow {
  key: string
  label: string
  count: number
}

export interface ReportTrendPoint {
  key: string
  label: string
  contacts: number
  appointments: number
  completedAppointments: number
  interactions: number
  confirmedEvents: number
}

export interface ReportActivityRow {
  id: string
  clientId: number
  clientName: string
  date: string
  type: string
  summary: string
  operator: string
  outcome: string
  durationMinutes: number
  isSpam: boolean
}

export interface ReportClientRow {
  clientId: number
  fullName: string
  source: string
  firstContactAt: string | null
  isSpam: boolean
  spamReason: string | null
  appointmentsScheduled: number
  appointmentsCompleted: number
  interactionsCount: number
  totalTimeMinutes: number
  confirmedEvents: number
  summary: string
  activities: string[]
  operators: string[]
  outcomes: string[]
  funnels: string[]
  latestActivityAt: string | null
}

export interface OperationalReportResponse {
  meta: {
    period: ReportPeriod
    periodLabel: string
    from: string
    to: string
    generatedAt: string
    effectiveSpamMode: 'include' | 'exclude'
    spamPolicyLabel: string
  }
  appliedFilters: ReportQueryFilters
  summary: ReportSummary
  sources: ReportSourceRow[]
  operators: ReportOperatorRow[]
  outcomes: ReportBreakdownRow[]
  funnels: ReportBreakdownRow[]
  trend: ReportTrendPoint[]
  clients: ReportClientRow[]
  activities: ReportActivityRow[]
  spamClients: ReportClientRow[]
  availableFilters: {
    operators: ReportOption[]
    sources: ReportOption[]
    statuses: ReportOption[]
    spamModes: ReportOption[]
  }
}

export const REPORT_PERIOD_OPTIONS: ReportOption[] = [
  { value: 'week', label: 'Settimanale' },
  { value: 'month', label: 'Mensile' },
  { value: 'year', label: 'Annuale' }
]

export const REPORT_STATUS_OPTIONS: ReportOption[] = [
  { value: '', label: 'Tutti gli esiti/stati' },
  { value: 'da_fare', label: 'Da fare' },
  { value: 'svolto', label: 'Svolto' },
  { value: 'positivo', label: 'Positivo' },
  { value: 'negativo', label: 'Negativo' },
  { value: 'rinviato', label: 'Rinviato' },
  { value: 'annullato', label: 'Annullato' },
  { value: 'nuovo_contatto', label: 'Nuovo contatto' },
  { value: 'in_trattativa', label: 'In trattativa' },
  { value: 'opzionata', label: 'Opzionata' },
  { value: 'confermato', label: 'Confermato' },
  { value: 'perso', label: 'Perso' },
  { value: 'spam', label: 'Spam' }
]

export const REPORT_SPAM_OPTIONS: ReportOption[] = [
  { value: 'policy', label: 'Policy automatica' },
  { value: 'exclude', label: 'Escludi spam' }
]

export function buildReportQuery(filters: Partial<ReportQueryFilters>) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      params.set(key, value)
    }
  })
  return params.toString()
}

export function formatMinutes(totalMinutes: number) {
  if (!totalMinutes) return '0 min'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return `${minutes} min`
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('it-IT', options)
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}