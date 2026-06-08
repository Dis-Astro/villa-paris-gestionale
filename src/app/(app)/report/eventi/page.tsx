'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Calendar, Download, Euro, FileSpreadsheet, FileText, Filter, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const EventReportCharts = dynamic(() => import('@/components/report/EventReportCharts'), {
  ssr: false,
  loading: () => <div className="h-72 rounded-lg border bg-white" data-testid="report-eventi-charts-loading" />
})

interface MonthlyData {
  mese: string
  meseFull: string
  eventi: number
  ospiti: number
  ricavi: number
  ticketMedio: number
}

interface TipoData {
  tipo: string
  count: number
  ricavi: number
}

interface ReportStats {
  year: number
  monthly: MonthlyData[]
  byTipo: TipoData[]
  totals: {
    eventiTotali: number
    ospitiTotali: number
    ricaviTotali: number
    ticketMedio: number
  }
}

function money(value: number) {
  return `EUR ${Number(value || 0).toLocaleString('it-IT')}`
}

export default function ReportEventiPage() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [luogoFilter, setLuogoFilter] = useState('')
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function fetchStats() {
      setLoading(true)
      setDownloadError('')
      try {
        const res = await fetch(`/api/report/eventi/stats?year=${year}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`Errore ${res.status}`)
        setStats(await res.json())
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setStats(null)
          setDownloadError(error.message || 'Errore caricamento report eventi')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    return () => controller.abort()
  }, [year])

  const buildExportParams = () => {
    const params = new URLSearchParams()
    if (dateFrom) params.append('from', dateFrom)
    if (dateTo) params.append('to', dateTo)
    if (tipoFilter) params.append('tipo', tipoFilter)
    if (luogoFilter) params.append('luogo', luogoFilter)
    return params
  }

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true)
    setDownloadError('')
    try {
      const params = buildExportParams()
      const res = await fetch(`/api/report/eventi.xlsx?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || body.detail || `Errore ${res.status}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `VillaParis_Report_Eventi_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      link.remove()
    } catch (error: any) {
      setDownloadError(`Errore export eventi: ${error.message || error}`)
    } finally {
      setDownloadingExcel(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!stats) return
    setDownloadingPdf(true)
    setDownloadError('')
    try {
      const res = await fetch('/api/eventi')
      if (!res.ok) throw new Error(`Errore ${res.status}`)
      const eventi = await res.json()
      const { downloadEventReportPdf, filterHistoricEvents } = await import('@/lib/report/eventi-pdf')
      const filters = { year, dateFrom, dateTo, tipoFilter, luogoFilter }
      const filteredEvents = filterHistoricEvents(eventi, filters)
      downloadEventReportPdf(stats, filteredEvents, filters)
    } catch (error: any) {
      setDownloadError(`Errore export PDF eventi: ${error.message || error}`)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleExportChartPNG = async (chartId: string) => {
    const chartElement = document.getElementById(chartId)
    if (!chartElement) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(chartElement, { backgroundColor: '#ffffff' })
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = url
      link.download = `${chartId}_${new Date().toISOString().split('T')[0]}.png`
      link.click()
    } catch (error) {
      console.error('Errore export grafico eventi:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="report-eventi-loading-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="report-eventi-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" data-testid="report-eventi-title">Report Eventi</h1>
          <p className="text-gray-500" data-testid="report-eventi-description">
            Storico eventi, anagrafiche clienti collegate, dettagli evento ed export storico.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleDownloadExcel} disabled={downloadingExcel} className="bg-green-600 hover:bg-green-700" data-testid="report-eventi-download-excel-button">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {downloadingExcel ? 'Download Excel...' : 'Scarica Excel'}
          </Button>
          <Button onClick={handleDownloadPdf} disabled={downloadingPdf || !stats} className="bg-slate-900 hover:bg-slate-800" data-testid="report-eventi-download-pdf-button">
            <FileText className="w-4 h-4 mr-2" />
            {downloadingPdf ? 'Export PDF...' : 'Scarica PDF'}
          </Button>
        </div>
      </div>

      {downloadError && (
        <div className="mt-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm" data-testid="report-eventi-download-error">
          {downloadError}
        </div>
      )}

      <Card data-testid="report-eventi-filters-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filtri storico eventi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anno</label>
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg" data-testid="report-eventi-year-select">
                {[2024, 2025, 2026, 2027].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border rounded-lg" data-testid="report-eventi-date-from-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data a</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg" data-testid="report-eventi-date-to-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo evento</label>
              <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg" data-testid="report-eventi-type-select">
                <option value="">Tutti</option>
                <option value="matrimonio">Matrimonio</option>
                <option value="battesimo">Battesimo</option>
                <option value="comunione">Comunione</option>
                <option value="cresima">Cresima</option>
                <option value="compleanno">Compleanno</option>
                <option value="aziendale">Aziendale</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
              <input type="text" value={luogoFilter} onChange={(e) => setLuogoFilter(e.target.value)} placeholder="Es: Villa Paris" className="w-full px-3 py-2 border rounded-lg" data-testid="report-eventi-location-input" />
            </div>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="report-eventi-kpi-total-events">
            <CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Eventi Totali</p><p className="text-3xl font-bold">{stats.totals.eventiTotali}</p></div><Calendar className="w-10 h-10 text-blue-500" /></div></CardContent>
          </Card>
          <Card data-testid="report-eventi-kpi-total-guests">
            <CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Ospiti Totali</p><p className="text-3xl font-bold">{stats.totals.ospitiTotali.toLocaleString('it-IT')}</p></div><Users className="w-10 h-10 text-green-500" /></div></CardContent>
          </Card>
          <Card data-testid="report-eventi-kpi-total-revenue">
            <CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Ricavi Totali</p><p className="text-3xl font-bold">{money(stats.totals.ricaviTotali)}</p></div><Euro className="w-10 h-10 text-amber-500" /></div></CardContent>
          </Card>
          <Card data-testid="report-eventi-kpi-ticket">
            <CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Ticket Medio</p><p className="text-3xl font-bold">{money(stats.totals.ticketMedio)}</p></div><TrendingUp className="w-10 h-10 text-purple-500" /></div></CardContent>
          </Card>
        </div>
      )}

      {stats && <EventReportCharts stats={stats} onExportChart={handleExportChartPNG} />}

      <Card data-testid="report-eventi-preview-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Anteprima dati eventi</CardTitle>
          <Button variant="outline" onClick={handleDownloadExcel} disabled={downloadingExcel} data-testid="report-eventi-preview-download-button">
            <Download className="w-4 h-4 mr-2" />Download Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="report-eventi-preview-table">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-4 py-3 text-left">Mese</th>
                  <th className="px-4 py-3 text-left">Eventi</th>
                  <th className="px-4 py-3 text-right">Ospiti</th>
                  <th className="px-4 py-3 text-right">Ricavi</th>
                  <th className="px-4 py-3 text-right">Ticket Medio</th>
                </tr>
              </thead>
              <tbody>
                {stats?.monthly.map((month, index) => (
                  <tr key={month.mese} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 font-medium">{month.meseFull}</td>
                    <td className="px-4 py-3">{month.eventi}</td>
                    <td className="px-4 py-3 text-right">{month.ospiti.toLocaleString('it-IT')}</td>
                    <td className="px-4 py-3 text-right">{money(month.ricavi)}</td>
                    <td className="px-4 py-3 text-right">{money(month.ticketMedio)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-100 font-bold">
                  <td className="px-4 py-3">TOTALE</td>
                  <td className="px-4 py-3">{stats?.totals.eventiTotali}</td>
                  <td className="px-4 py-3 text-right">{stats?.totals.ospitiTotali.toLocaleString('it-IT')}</td>
                  <td className="px-4 py-3 text-right">{money(stats?.totals.ricaviTotali || 0)}</td>
                  <td className="px-4 py-3 text-right">{money(stats?.totals.ticketMedio || 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
