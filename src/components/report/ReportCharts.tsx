'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OperationalReportResponse } from '@/lib/report/types'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ReportChartsProps {
  report: OperationalReportResponse
}

export function ReportCharts({ report }: ReportChartsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card data-testid="report-trend-card">
        <CardHeader>
          <CardTitle className="text-base">Trend periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72" data-testid="report-trend-chart">
            <ResponsiveContainer width="99%" height={280} debounce={100}>
              <LineChart data={report.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="contacts" stroke="#0EA5E9" strokeWidth={2.5} name="Contatti" />
                <Line type="monotone" dataKey="appointments" stroke="#F59E0B" strokeWidth={2.5} name="Appuntamenti" />
                <Line type="monotone" dataKey="interactions" stroke="#8B5CF6" strokeWidth={2.5} name="Interazioni" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="report-sources-card">
        <CardHeader>
          <CardTitle className="text-base">Provenienza lead</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72" data-testid="report-sources-chart">
            <ResponsiveContainer width="99%" height={280} debounce={100}>
              <BarChart data={report.sources.slice(0, 6)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis dataKey="source" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="contactsValid" fill="#22C55E" radius={[0, 8, 8, 0]} name="Contatti validi" />
                <Bar dataKey="contactsSpam" fill="#EF4444" radius={[0, 8, 8, 0]} name="Spam" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="report-operators-card">
        <CardHeader>
          <CardTitle className="text-base">Operatori coinvolti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72" data-testid="report-operators-chart">
            <ResponsiveContainer width="99%" height={280} debounce={100}>
              <BarChart data={report.operators.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="operatorName" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="appointmentsScheduled" fill="#1E3A5F" radius={[8, 8, 0, 0]} name="Appuntamenti fissati" />
                <Bar dataKey="interactionsCount" fill="#A855F7" radius={[8, 8, 0, 0]} name="Interazioni" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}