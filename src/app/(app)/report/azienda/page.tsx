'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReportFilters } from '@/components/report/ReportFilters'
import { ReportSummaryCards } from '@/components/report/ReportSummaryCards'
import { ReportTables } from '@/components/report/ReportTables'
import { buildReportQuery, OperationalReportResponse, REPORT_SPAM_OPTIONS, REPORT_STATUS_OPTIONS, ReportQueryFilters } from '@/lib/report/types'

const ReportCharts = dynamic(
  () => import('@/components/report/ReportCharts').then((mod) => mod.ReportCharts),
  {
    ssr: false,
    loading: () => <div className="h-72 rounded-lg border bg-white" data-testid="report-charts-loading" />
  }
)

const DEFAULT_FILTERS: ReportQueryFilters = {
  period: 'week',
  referenceDate: new Date().toISOString().slice(0, 10),
  operatorId: '',
  source: '',
  status: '',
  spamMode: 'policy'
}

export default function ReportAziendaPage() {
  const [filters, setFilters] = useState<ReportQueryFilters>(DEFAULT_FILTERS)
  const [report, setReport] = useState<OperationalReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [error, setError] = useState('')

  const queryString = useMemo(() => buildReportQuery(filters), [filters])

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/report/stats?${queryString}`, { signal: controller.signal })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Errore ${res.status}`)
        }
        const data = await res.json()
        setReport(data)
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setError(err.message || 'Errore caricamento report')
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

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true)
    setError('')
    try {
      const res = await fetch(`/api/report/azienda.xlsx?${queryString}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Errore ${res.status}`)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `VillaParis_Report_${filters.period}_${filters.referenceDate}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || 'Errore export Excel')
    } finally {
      setDownloadingExcel(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!report) return
    setDownloadingPdf(true)
    try {
      const { downloadOperationalReportPdf } = await import('@/lib/report/pdf')
      downloadOperationalReportPdf(report)
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="report-operativo-page">
      <div className="rounded-[28px] border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white" data-testid="report-operativo-hero">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-amber-300">Villa Paris - fase 3</p>
            <h1 className="mt-3 text-4xl font-semibold">Reportistica operativa reale</h1>
            <p className="mt-3 text-sm text-slate-300" data-testid="report-operativo-description">
              KPI per contatti, appuntamenti, interazioni, tempo dedicato e conversione operativa. Policy spam applicata in modo coerente tra settimanale, mensile e annuale.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              data-testid="report-download-excel-button"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {downloadingExcel ? 'Export Excel...' : 'Export Excel'}
            </Button>
            <Button
              type="button"
              className="bg-amber-400 text-slate-900 hover:bg-amber-300"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || !report}
              data-testid="report-download-pdf-button"
            >
              <FileText className="w-4 h-4 mr-2" />
              {downloadingPdf ? 'Export PDF...' : 'Export PDF'}
            </Button>
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
        <Card className="border-red-200 bg-red-50" data-testid="report-error-card">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {loading || !report ? (
        <div className="flex items-center justify-center h-64" data-testid="report-loading-state">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-500" />
        </div>
      ) : (
        <>
          <Card className="border-amber-200 bg-amber-50" data-testid="report-policy-banner">
            <CardContent className="flex flex-col gap-2 p-4 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Periodo attivo: {report.meta.periodLabel}</p>
                <p data-testid="report-policy-banner-text">{report.meta.spamPolicyLabel}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700" data-testid="report-generated-at">
                <Download className="w-3.5 h-3.5" /> generato live
              </div>
            </CardContent>
          </Card>

          <ReportSummaryCards summary={report.summary} />
          <ReportCharts report={report} />
          <ReportTables report={report} />
        </>
      )}
    </div>
  )
}
