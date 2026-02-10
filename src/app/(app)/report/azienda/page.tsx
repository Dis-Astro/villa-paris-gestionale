'use client'

import { useEffect, useState } from 'react'
import { 
  Download, 
  FileSpreadsheet, 
  Filter, 
  TrendingUp,
  Users,
  Euro,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Image
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

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

const COLORS = ['#1E3A5F', '#D4AF37', '#22C55E', '#3B82F6', '#A855F7', '#EF4444', '#F59E0B', '#14B8A6']

export default function ReportAziendaPage() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  
  // Filters
  const [year, setYear] = useState(new Date().getFullYear())
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [luogoFilter, setLuogoFilter] = useState('')

  useEffect(() => {
    fetchStats()
  }, [year])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/report/stats?year=${year}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadExcel = async () => {
    setDownloading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('from', dateFrom)
      if (dateTo) params.append('to', dateTo)
      if (tipoFilter) params.append('tipo', tipoFilter)
      if (luogoFilter) params.append('luogo', luogoFilter)

      const res = await fetch(`/api/report/azienda.xlsx?${params.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `VillaParis_Report_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      }
    } catch (error) {
      console.error('Error downloading Excel:', error)
    } finally {
      setDownloading(false)
    }
  }

  const handleExportChartPNG = async (chartId: string) => {
    // Export chart as PNG using html2canvas
    const chartElement = document.getElementById(chartId)
    if (!chartElement) return

    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(chartElement, { backgroundColor: '#ffffff' })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `${chartId}_${new Date().toISOString().split('T')[0]}.png`
      a.click()
    } catch (error) {
      console.error('Error exporting chart:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Azienda</h1>
          <p className="text-gray-500">Statistiche e export dati eventi</p>
        </div>
        <Button 
          onClick={handleDownloadExcel}
          disabled={downloading}
          className="bg-green-600 hover:bg-green-700"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          {downloading ? 'Download...' : 'Scarica Excel'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Year selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anno</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data a</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Tipo evento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo evento</label>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Tutti</option>
                <option value="matrimonio">Matrimonio</option>
                <option value="battesimo">Battesimo</option>
                <option value="comunione">Comunione</option>
                <option value="cresima">Cresima</option>
                <option value="compleanno">Compleanno</option>
                <option value="aziendale">Aziendale</option>
              </select>
            </div>

            {/* Luogo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
              <input
                type="text"
                value={luogoFilter}
                onChange={(e) => setLuogoFilter(e.target.value)}
                placeholder="Es: Villa Paris"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Eventi Totali</p>
                  <p className="text-3xl font-bold">{stats.totals.eventiTotali}</p>
                </div>
                <Calendar className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ospiti Totali</p>
                  <p className="text-3xl font-bold">{stats.totals.ospitiTotali.toLocaleString()}</p>
                </div>
                <Users className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ricavi Totali</p>
                  <p className="text-3xl font-bold">€{stats.totals.ricaviTotali.toLocaleString()}</p>
                </div>
                <Euro className="w-10 h-10 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ticket Medio</p>
                  <p className="text-3xl font-bold">€{stats.totals.ticketMedio}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ricavi per mese */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                Ricavi per Mese
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExportChartPNG('chart-ricavi')}
              >
                <Image className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div id="chart-ricavi" className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="mese" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v/1000}k`} />
                    <Tooltip 
                      formatter={(value) => [`€${Number(value).toLocaleString()}`, 'Ricavi']}
                      labelFormatter={(label) => `Mese: ${label}`}
                    />
                    <Bar dataKey="ricavi" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Eventi per mese */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Eventi per Mese
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExportChartPNG('chart-eventi')}
              >
                <Image className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div id="chart-eventi" className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="mese" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="eventi" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Ospiti per mese */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                Ospiti per Mese
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExportChartPNG('chart-ospiti')}
              >
                <Image className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div id="chart-ospiti" className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="mese" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), 'Ospiti']}
                    />
                    <Bar dataKey="ospiti" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Distribuzione per tipo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-500" />
                Eventi per Tipo
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExportChartPNG('chart-tipo')}
              >
                <Image className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div id="chart-tipo" className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byTipo}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ tipo, percent }) => `${tipo} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.byTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [value, 'Eventi']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Anteprima Dati</CardTitle>
          <Button 
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={downloading}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                {stats?.monthly.map((m, i) => (
                  <tr key={m.mese} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 font-medium">{m.meseFull}</td>
                    <td className="px-4 py-3">{m.eventi}</td>
                    <td className="px-4 py-3 text-right">{m.ospiti.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">€{m.ricavi.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">€{m.ticketMedio}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-100 font-bold">
                  <td className="px-4 py-3">TOTALE</td>
                  <td className="px-4 py-3">{stats?.totals.eventiTotali}</td>
                  <td className="px-4 py-3 text-right">{stats?.totals.ospitiTotali.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">€{stats?.totals.ricaviTotali.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">€{stats?.totals.ticketMedio}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
