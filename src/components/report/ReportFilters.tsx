'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { REPORT_PERIOD_OPTIONS, ReportOption, ReportQueryFilters } from '@/lib/report/types'

interface ReportFiltersProps {
  filters: ReportQueryFilters
  operatorOptions: ReportOption[]
  sourceOptions: ReportOption[]
  statusOptions: ReportOption[]
  spamOptions: ReportOption[]
  onChange: (patch: Partial<ReportQueryFilters>) => void
  onReset?: () => void
}

export function ReportFilters({
  filters,
  operatorOptions,
  sourceOptions,
  statusOptions,
  spamOptions,
  onChange,
  onReset
}: ReportFiltersProps) {
  const spamDisabled = filters.period !== 'week'

  return (
    <Card data-testid="report-filters-card">
      <CardHeader>
        <CardTitle className="text-base">Filtri report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
            <select
              value={filters.period}
              onChange={(e) => onChange({ period: e.target.value as ReportQueryFilters['period'] })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              data-testid="report-period-select"
            >
              {REPORT_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data di riferimento</label>
            <Input
              type="date"
              value={filters.referenceDate}
              onChange={(e) => onChange({ referenceDate: e.target.value })}
              data-testid="report-reference-date-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Operatore</label>
            <select
              value={filters.operatorId}
              onChange={(e) => onChange({ operatorId: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              data-testid="report-operator-select"
            >
              <option value="">Tutti</option>
              {operatorOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Provenienza lead</label>
            <select
              value={filters.source}
              onChange={(e) => onChange({ source: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              data-testid="report-source-select"
            >
              <option value="">Tutte</option>
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Stato / esito</label>
            <select
              value={filters.status}
              onChange={(e) => onChange({ status: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              data-testid="report-status-select"
            >
              {statusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Spam</label>
            <select
              value={spamDisabled ? 'policy' : filters.spamMode}
              onChange={(e) => onChange({ spamMode: e.target.value as ReportQueryFilters['spamMode'] })}
              className="w-full rounded-md border px-3 py-2 text-sm disabled:bg-slate-100"
              disabled={spamDisabled}
              data-testid="report-spam-select"
            >
              {spamOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500" data-testid="report-spam-policy-note">
              {spamDisabled ? 'Mensile/annuale: spam escluso automaticamente dalla policy.' : 'Settimanale: gli spam restano visibili in rosso salvo esclusione manuale.'}
            </p>
          </div>
        </div>

        {onReset && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onReset} data-testid="report-reset-filters-button">
              Reimposta filtri
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}