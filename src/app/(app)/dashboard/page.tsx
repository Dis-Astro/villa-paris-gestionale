'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronRight, Clock3, FileText, Plus, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReportFilters } from '@/components/report/ReportFilters'
import { ReportSummaryCards } from '@/components/report/ReportSummaryCards'
import { buildReportQuery, OperationalReportResponse, REPORT_SPAM_OPTIONS, REPORT_STATUS_OPTIONS, ReportQueryFilters, formatDateTime, formatMinutes } from '@/lib/report/types'

const DEFAULT_FILTERS: ReportQueryFilters = {
  period: 'month',
  referenceDate: new Date().toISOString().slice(0, 10),
  operatorId: '',
  source: '',
  status: '',
  spamMode: 'policy'
}

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<'ADMIN' | 'REPORT' | 'WORKER' | null>(null)
  const [filters, setFilters] = useState<ReportQueryFilters>(DEFAULT_FILTERS)
  const [report, setReport] = useState<OperationalReportResponse | null>(null)
  const [nextEvent, setNextEvent] = useState<any | null>(null)
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const queryString = useMemo(() => buildReportQuery(filters), [filters])

  useEffect(() => {
    const loadMe = async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return
      const data = await res.json()
      setRole(data.role)
    }
    loadMe()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [reportRes, eventsRes] = await Promise.all([
          fetch(`/api/report/stats?${queryString}`, { signal: controller.signal }),
          fetch('/api/eventi', { signal: controller.signal })
        ])

        if (!reportRes.ok) {
          const body = await reportRes.json().catch(() => ({}))
          throw new Error(body.error || `Errore ${reportRes.status}`)
        }

        const reportData = await reportRes.json()
        const eventsData = eventsRes.ok ? await eventsRes.json() : []
        const now = new Date()
        const upcoming = (Array.isArray(eventsData) ? eventsData : [])
          .filter((event) => event.dataConfermata && new Date(event.dataConfermata) > now)
          .sort((a, b) => new Date(a.dataConfermata).getTime() - new Date(b.dataConfermata).getTime())

        setReport(reportData)
        setNextEvent(upcoming[0] || null)
        setRecentEvents(
          (Array.isArray(eventsData) ? eventsData : [])
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 4)
        )
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setError(err.message || 'Errore caricamento dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [queryString])

  const updateFilters = (patch: Partial<ReportQueryFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch }
      if (patch.period && patch.period !== 'week') {
        next.spamMode = 'policy'
      }
      return next
    })
  }

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading-state">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="dashboard-operativa-page">
      <div className="rounded-[28px] border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white" data-testid="dashboard-hero">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-amber-300">Villa Paris · dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold">Cruscotto operativo</h1>
            <p className="mt-3 text-sm text-slate-300" data-testid="dashboard-description">
              Vista rapida su contatti, appuntamenti, interazioni, tempo dedicato e stato del funnel con la stessa policy spam dei report.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push('/report/azienda')} className="bg-amber-400 text-slate-900 hover:bg-amber-300" data-testid="dashboard-open-report-button">
              <FileText className="w-4 h-4 mr-2" /> Apri report completo
            </Button>
            {role && role !== 'REPORT' && (
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => router.push('/nuovo-evento')} data-testid="dashboard-new-event-button">
                <Plus className="w-4 h-4 mr-2" /> Nuovo evento
              </Button>
            )}
          </div>
        </div>
      </div>

      <ReportFilters
        filters={filters}
        operatorOptions={report?.availableFilters.operators || []}
        sourceOptions={report?.availableFilters.sources || []}
        statusOptions={report?.availableFilters.statuses || REPORT_STATUS_OPTIONS}
        spamOptions={REPORT_SPAM_OPTIONS}
        onChange={updateFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {error && (
        <Card className="border-red-200 bg-red-50" data-testid="dashboard-error-card">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {report && (
        <>
          <ReportSummaryCards summary={report.summary} compact />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card data-testid="dashboard-sources-card">
              <CardHeader>
                <CardTitle className="text-base">Top provenienze</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.sources.slice(0, 5).map((source) => (
                  <div key={source.source} className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3" data-testid={`dashboard-source-${source.source}`}>
                    <div>
                      <p className="font-medium text-slate-900">{source.source}</p>
                      <p className="text-xs text-slate-500">validi {source.contactsValid} • spam {source.contactsSpam}</p>
                    </div>
                    <span className="text-2xl font-semibold text-slate-900">{source.contactsTotal}</span>
                  </div>
                ))}
                {report.sources.length === 0 && <p className="text-sm text-slate-500" data-testid="dashboard-sources-empty">Nessuna provenienza nel periodo.</p>}
              </CardContent>
            </Card>

            <Card data-testid="dashboard-operators-card">
              <CardHeader>
                <CardTitle className="text-base">Operatori più attivi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.operators.slice(0, 5).map((operator) => (
                  <div key={operator.operatorId} className="rounded-xl border bg-slate-50 px-4 py-3" data-testid={`dashboard-operator-${operator.operatorId}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{operator.operatorName}</p>
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-500">{formatMinutes(operator.totalTimeMinutes)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">clienti {operator.clientsCount} • appuntamenti {operator.appointmentsScheduled} • interazioni {operator.interactionsCount}</p>
                  </div>
                ))}
                {report.operators.length === 0 && <p className="text-sm text-slate-500" data-testid="dashboard-operators-empty">Nessuna attività operatore.</p>}
              </CardContent>
            </Card>

            <Card data-testid="dashboard-policy-card">
              <CardHeader>
                <CardTitle className="text-base">Policy spam attiva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p data-testid="dashboard-policy-message">{report.meta.spamPolicyLabel}</p>
                <div className="rounded-xl border bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Periodo attuale</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900" data-testid="dashboard-period-label">{report.meta.periodLabel}</p>
                  <p className="mt-2 text-xs text-slate-500">tempo medio cliente {formatMinutes(report.summary.averageTimePerClientMinutes)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card data-testid="dashboard-next-event-card">
              <CardHeader>
                <CardTitle className="text-base">Prossimo evento confermato</CardTitle>
              </CardHeader>
              <CardContent>
                {nextEvent ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Evento</p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-900">{nextEvent.titolo}</h3>
                      <p className="text-sm text-slate-500">{nextEvent.tipo} • {nextEvent.stato}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-xl border bg-slate-50 p-4">
                        <p className="text-slate-500">Data</p>
                        <p className="mt-1 font-medium text-slate-900">{formatDateTime(nextEvent.dataConfermata)}</p>
                      </div>
                      <div className="rounded-xl border bg-slate-50 p-4">
                        <p className="text-slate-500">Ospiti previsti</p>
                        <p className="mt-1 font-medium text-slate-900">{nextEvent.personePreviste || 'N/D'}</p>
                      </div>
                    </div>
                    {role === null ? null : role !== 'REPORT' ? (
                      <Button variant="outline" className="w-full" onClick={() => router.push(`/modifica-evento/${nextEvent.id}`)} data-testid="dashboard-next-event-open-button">
                        Vai all'evento <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <div className="w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-600" data-testid="dashboard-next-event-readonly-box">
                        Vista report: riepilogo evento senza accesso alla modifica.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500" data-testid="dashboard-next-event-empty">
                    <Calendar className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                    Nessun evento confermato in programma.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="dashboard-activities-card">
              <CardHeader>
                <CardTitle className="text-base">Ultime attività cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.activities.slice(0, 6).map((activity) => (
                  <div key={activity.id} className={`rounded-xl border px-4 py-3 ${activity.isSpam ? 'border-red-200 bg-red-50 text-red-900' : 'bg-slate-50'}`} data-testid={`dashboard-activity-${activity.id}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{activity.clientName}</p>
                        <p className="text-xs opacity-80">{activity.type} • {activity.operator}</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.24em] opacity-80">{formatMinutes(activity.durationMinutes)}</span>
                    </div>
                    <p className="mt-2 text-sm opacity-90">{activity.summary}</p>
                    <p className="mt-2 text-xs opacity-75">{formatDateTime(activity.date)} • {activity.outcome}</p>
                  </div>
                ))}
                {report.activities.length === 0 && <p className="text-sm text-slate-500" data-testid="dashboard-activities-empty">Nessuna attività nel periodo selezionato.</p>}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="dashboard-recent-events-card">
            <CardHeader>
              <CardTitle className="text-base">Eventi recenti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {recentEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => role && role !== 'REPORT' && router.push(`/modifica-evento/${event.id}`)}
                    className="rounded-2xl border bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100"
                    data-testid={`dashboard-recent-event-${event.id}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{event.titolo}</p>
                        <p className="text-xs text-slate-500">{event.tipo}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{event.stato}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{formatDateTime(event.dataConfermata)}</p>
                  </button>
                ))}
                {recentEvents.length === 0 && <p className="text-sm text-slate-500" data-testid="dashboard-recent-events-empty">Nessun evento recente.</p>}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="dashboard-quick-actions-card">
            <CardHeader>
              <CardTitle className="text-base">Azioni rapide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {role === null ? null : role !== 'REPORT' ? (
                  <>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push('/nuovo-evento')} data-testid="dashboard-quick-new-event">
                      <Plus className="w-5 h-5 text-amber-500" />
                      <span>Nuovo evento</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push('/clienti')} data-testid="dashboard-quick-clients">
                      <Users className="w-5 h-5 text-sky-500" />
                      <span>Clienti</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push('/rapportini-interni')} data-testid="dashboard-quick-rapportini">
                      <FileText className="w-5 h-5 text-amber-500" />
                      <span>Rapportini</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push('/stampe')} data-testid="dashboard-quick-stampe">
                      <FileText className="w-5 h-5 text-sky-500" />
                      <span>Stampe</span>
                    </Button>
                  </>
                )}
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push('/report/azienda')} data-testid="dashboard-quick-report">
                  <FileText className="w-5 h-5 text-emerald-500" />
                  <span>Report</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push('/calendario')} data-testid="dashboard-quick-calendar">
                  <Clock3 className="w-5 h-5 text-violet-500" />
                  <span>Calendario</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
