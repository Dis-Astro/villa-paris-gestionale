'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Image, PieChart as PieChartIcon, TrendingUp, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
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

interface EventReportStats {
  monthly: MonthlyData[]
  byTipo: TipoData[]
}

interface EventReportChartsProps {
  stats: EventReportStats
  onExportChart: (chartId: string) => void
}

const COLORS = ['#1E3A5F', '#D4AF37', '#22C55E', '#3B82F6', '#A855F7', '#EF4444', '#F59E0B', '#14B8A6']

export default function EventReportCharts({ stats, onExportChart }: EventReportChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card data-testid="report-eventi-chart-revenue-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-500" />Ricavi per Mese</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onExportChart('chart-ricavi-eventi')} data-testid="report-eventi-export-chart-revenue"><Image className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent>
          <div id="chart-ricavi-eventi" className="h-72">
            <ResponsiveContainer width="99%" height={280} debounce={100}>
              <BarChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mese" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `EUR ${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => [`EUR ${Number(value).toLocaleString()}`, 'Ricavi']} labelFormatter={(label) => `Mese: ${label}`} />
                <Bar dataKey="ricavi" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="report-eventi-chart-events-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" />Eventi per Mese</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onExportChart('chart-eventi-storici')} data-testid="report-eventi-export-chart-events"><Image className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent>
          <div id="chart-eventi-storici" className="h-72">
            <ResponsiveContainer width="99%" height={280} debounce={100}>
              <LineChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mese" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="eventi" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="report-eventi-chart-guests-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-green-500" />Ospiti per Mese</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onExportChart('chart-ospiti-eventi')} data-testid="report-eventi-export-chart-guests"><Image className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent>
          <div id="chart-ospiti-eventi" className="h-72">
            <ResponsiveContainer width="99%" height={280} debounce={100}>
              <BarChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mese" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Ospiti']} />
                <Bar dataKey="ospiti" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="report-eventi-chart-types-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-purple-500" />Eventi per Tipo</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onExportChart('chart-tipo-eventi')} data-testid="report-eventi-export-chart-types"><Image className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent>
          <div id="chart-tipo-eventi" className="h-72">
            <ResponsiveContainer width="99%" height={280} debounce={100}>
              <PieChart>
                <Pie
                  data={stats.byTipo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="tipo"
                >
                  {stats.byTipo.map((entry, index) => <Cell key={`cell-${entry.tipo}-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Eventi']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
