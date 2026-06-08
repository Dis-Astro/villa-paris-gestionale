'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OperationalReportResponse, formatDateTime, formatMinutes } from '@/lib/report/types'

interface ReportTablesProps {
  report: OperationalReportResponse
}

export function ReportTables({ report }: ReportTablesProps) {
  const weeklySpamVisible = report.meta.period === 'week' && report.meta.effectiveSpamMode === 'include'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" data-testid="report-operators-table-card">
          <CardHeader>
            <CardTitle className="text-base">Riepilogo operatori</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm" data-testid="report-operators-table">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-3">Operatore</th>
                  <th className="py-2 pr-3">Clienti</th>
                  <th className="py-2 pr-3">App. fissati</th>
                  <th className="py-2 pr-3">App. svolti</th>
                  <th className="py-2 pr-3">Interazioni</th>
                  <th className="py-2 pr-3">Tempo</th>
                  <th className="py-2">Eventi</th>
                </tr>
              </thead>
              <tbody>
                {report.operators.map((operator) => (
                  <tr key={operator.operatorId} className="border-b last:border-0" data-testid={`report-operator-row-${operator.operatorId}`}>
                    <td className="py-3 pr-3 font-medium text-slate-900">{operator.operatorName}</td>
                    <td className="py-3 pr-3">{operator.clientsCount}</td>
                    <td className="py-3 pr-3">{operator.appointmentsScheduled}</td>
                    <td className="py-3 pr-3">{operator.appointmentsCompleted}</td>
                    <td className="py-3 pr-3">{operator.interactionsCount}</td>
                    <td className="py-3 pr-3">{formatMinutes(operator.totalTimeMinutes)}</td>
                    <td className="py-3">{operator.confirmedEvents}</td>
                  </tr>
                ))}
                {report.operators.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500" data-testid="report-operators-empty">Nessuna attivita operatore nel periodo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card data-testid="report-spam-policy-card">
          <CardHeader>
            <CardTitle className="text-base">Policy spam</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p data-testid="report-spam-policy-message">{report.meta.spamPolicyLabel}</p>
            {weeklySpamVisible ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4" data-testid="report-spam-highlight-box">
                <p className="font-medium text-red-800">Spam visibili nel settimanale</p>
                <p className="mt-1 text-red-700">I contatti marcati spam restano in lista e sono evidenziati in rosso.</p>
                <p className="mt-2 text-red-700">Totale spam visibili: {report.spamClients.length}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" data-testid="report-spam-excluded-box">
                <p className="font-medium text-slate-800">Spam esclusi dai conteggi principali</p>
                <p className="mt-1 text-slate-600">Esclusi dalla policy: {report.summary.contactsExcludedByPolicy}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="report-clients-table-card">
        <CardHeader>
          <CardTitle className="text-base">Dettaglio clienti e attivita</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-sm" data-testid="report-clients-table">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Provenienza</th>
                <th className="py-2 pr-3">Primo contatto</th>
                <th className="py-2 pr-3">App.</th>
                <th className="py-2 pr-3">Svolti</th>
                <th className="py-2 pr-3">Interazioni</th>
                <th className="py-2 pr-3">Tempo</th>
                <th className="py-2 pr-3">Operatori</th>
                <th className="py-2 pr-3">Esiti</th>
                <th className="py-2 pr-3">Funnel</th>
                <th className="py-2 pr-3">Attivita</th>
                <th className="py-2">Riassunto</th>
              </tr>
            </thead>
            <tbody>
              {report.clients.map((client) => (
                <tr
                  key={client.clientId}
                  className={`border-b last:border-0 align-top ${client.isSpam ? 'bg-red-50 text-red-900' : ''}`}
                  data-testid={`report-client-row-${client.clientId}`}
                >
                  <td className="py-3 pr-3">
                    <div className="font-medium">{client.fullName}</div>
                    {client.isSpam && <div className="mt-1 text-xs font-semibold uppercase tracking-wide">SPAM {client.spamReason ? `- ${client.spamReason}` : ''}</div>}
                  </td>
                  <td className="py-3 pr-3">{client.source}</td>
                  <td className="py-3 pr-3">{formatDateTime(client.firstContactAt)}</td>
                  <td className="py-3 pr-3">{client.appointmentsScheduled}</td>
                  <td className="py-3 pr-3">{client.appointmentsCompleted}</td>
                  <td className="py-3 pr-3">{client.interactionsCount}</td>
                  <td className="py-3 pr-3">{formatMinutes(client.totalTimeMinutes)}</td>
                  <td className="py-3 pr-3">{client.operators.join(', ') || '-'}</td>
                  <td className="py-3 pr-3">{client.outcomes.join(', ') || '-'}</td>
                  <td className="py-3 pr-3">{client.funnels.join(', ') || '-'}</td>
                  <td className="py-3 pr-3">
                    <ul className="space-y-1 list-disc pl-4">
                      {client.activities.map((activity) => <li key={`${client.clientId}-${activity}`}>{activity}</li>)}
                    </ul>
                  </td>
                  <td className="py-3">{client.summary}</td>
                </tr>
              ))}
              {report.clients.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-slate-500" data-testid="report-clients-empty">Nessun cliente nel periodo selezionato.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card data-testid="report-activities-table-card">
        <CardHeader>
          <CardTitle className="text-base">Attivita registrate nel periodo</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm" data-testid="report-activities-table">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Operatore</th>
                <th className="py-2 pr-3">Esito/Stato</th>
                <th className="py-2 pr-3">Durata</th>
                <th className="py-2">Dettaglio</th>
              </tr>
            </thead>
            <tbody>
              {report.activities.map((activity) => (
                <tr key={activity.id} className={`border-b last:border-0 ${activity.isSpam ? 'bg-red-50 text-red-900' : ''}`} data-testid={`report-activity-row-${activity.id}`}>
                  <td className="py-3 pr-3">{formatDateTime(activity.date)}</td>
                  <td className="py-3 pr-3 font-medium">{activity.clientName}</td>
                  <td className="py-3 pr-3">{activity.type}</td>
                  <td className="py-3 pr-3">{activity.operator}</td>
                  <td className="py-3 pr-3">{activity.outcome}</td>
                  <td className="py-3 pr-3">{formatMinutes(activity.durationMinutes)}</td>
                  <td className="py-3">{activity.summary}</td>
                </tr>
              ))}
              {report.activities.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500" data-testid="report-activities-empty">Nessuna attivita trovata.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
