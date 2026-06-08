'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ReportSummary, formatMinutes } from '@/lib/report/types'
import { CalendarCheck2, Clock3, Flag, Handshake, MessageSquareText, Users } from 'lucide-react'

interface ReportSummaryCardsProps {
  summary: ReportSummary
  compact?: boolean
}

type SummaryCardConfig = {
  key: keyof Pick<ReportSummary, 'contactsPrimary' | 'appointmentsScheduled' | 'appointmentsCompleted' | 'interactionsCount' | 'totalTimeMinutes' | 'confirmedEvents'>
  label: string
  accent: string
  icon: any
  format?: (value: number) => string
}

const cards: SummaryCardConfig[] = [
  {
    key: 'contactsPrimary',
    label: 'Contatti principali',
    accent: 'bg-sky-100 text-sky-700',
    icon: Users
  },
  {
    key: 'appointmentsScheduled',
    label: 'Appuntamenti fissati',
    accent: 'bg-amber-100 text-amber-700',
    icon: Handshake
  },
  {
    key: 'appointmentsCompleted',
    label: 'Appuntamenti svolti',
    accent: 'bg-emerald-100 text-emerald-700',
    icon: CalendarCheck2
  },
  {
    key: 'interactionsCount',
    label: 'Interazioni cliente',
    accent: 'bg-violet-100 text-violet-700',
    icon: MessageSquareText
  },
  {
    key: 'totalTimeMinutes',
    label: 'Tempo dedicato',
    accent: 'bg-rose-100 text-rose-700',
    icon: Clock3,
    format: formatMinutes
  },
  {
    key: 'confirmedEvents',
    label: 'Eventi confermati',
    accent: 'bg-slate-200 text-slate-700',
    icon: Flag
  }
] as const

export function ReportSummaryCards({ summary, compact = false }: ReportSummaryCardsProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 ${compact ? 'xl:grid-cols-3' : ''}`}>
      {cards.map((card) => {
        const Icon = card.icon
        const rawValue = summary[card.key]
        const value = card.format ? card.format(Number(rawValue || 0)) : rawValue
        return (
          <Card key={card.key} data-testid={`report-summary-${card.key}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900" data-testid={`report-summary-value-${card.key}`}>
                    {value}
                  </p>
                </div>
                <div className={`rounded-2xl p-3 ${card.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              {card.key === 'contactsPrimary' && (
                <p className="mt-3 text-xs text-slate-500" data-testid="report-summary-contacts-breakdown">
                  validi {summary.contactsValid} • spam {summary.contactsSpam}
                </p>
              )}

              {card.key === 'totalTimeMinutes' && (
                <p className="mt-3 text-xs text-slate-500" data-testid="report-summary-time-average">
                  media cliente {formatMinutes(summary.averageTimePerClientMinutes)}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}