'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import type { CurrentUser } from '../layout/AppShell'
import {
  Calendar,
  Users,
  UtensilsCrossed,
  LayoutGrid,
  FileText,
  BarChart3,
  Settings,
  Home,
  Handshake,
  Bot,
  X,
  ChevronRight
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  currentPath: string
  user: CurrentUser | null
}

type Role = 'ADMIN' | 'REPORT' | 'WORKER'

const menuItems: Array<{ label: string; href: string; icon: any; description: string; roles: Role[]; mobile?: boolean }> = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Panoramica generale',
    roles: ['ADMIN', 'REPORT'],
    mobile: true
  },
  {
    label: 'Calendario',
    href: '/calendario',
    icon: Calendar,
    description: 'Eventi e prenotazioni',
    roles: ['ADMIN', 'REPORT', 'WORKER'],
    mobile: true
  },
  {
    label: 'Appuntamenti',
    href: '/appuntamenti',
    icon: Handshake,
    description: 'Scheda centrale pre-evento',
    roles: ['ADMIN', 'WORKER']
  },
  {
    label: 'Eventi',
    href: '/eventi',
    icon: LayoutGrid,
    description: 'Gestione eventi',
    roles: ['ADMIN', 'WORKER']
  },
  {
    label: 'Clienti',
    href: '/clienti',
    icon: Users,
    description: 'Anagrafica clienti',
    roles: ['ADMIN', 'WORKER']
  },
  {
    label: 'Rapportini Interni',
    href: '/rapportini-interni',
    icon: FileText,
    description: 'Presenze e passaggi in Villa',
    roles: ['ADMIN', 'REPORT', 'WORKER']
  },
  {
    label: 'Menu Base',
    href: '/menu-base',
    icon: UtensilsCrossed,
    description: 'Template menu',
    roles: ['ADMIN', 'WORKER']
  },
  {
    label: 'Report Operativo',
    href: '/report/azienda',
    icon: BarChart3,
    description: 'Contatti, appuntamenti e funnel',
    roles: ['ADMIN', 'REPORT']
  },
  {
    label: 'Report Eventi',
    href: '/report/eventi',
    icon: FileText,
    description: 'Storico eventi ed export',
    roles: ['ADMIN', 'REPORT']
  },
  {
    label: 'Stampe',
    href: '/stampe',
    icon: FileText,
    description: 'Documenti PDF',
    roles: ['ADMIN', 'REPORT', 'WORKER']
  },
  {
    label: 'Audit Log',
    href: '/audit',
    icon: FileText,
    description: 'Storico modifiche',
    roles: ['ADMIN', 'REPORT']
  },
  {
    label: 'Assistente AI',
    href: '/assistente-ai',
    icon: Bot,
    description: 'Chat operativa e report',
    roles: ['ADMIN']
  },
  {
    label: 'Gestione Utenti',
    href: '/utenti',
    icon: Users,
    description: 'Ruoli e accessi',
    roles: ['ADMIN']
  },
  {
    label: 'Impostazioni',
    href: '/impostazioni',
    icon: Settings,
    description: 'Configurazione',
    roles: ['ADMIN']
  }
]

export default function Sidebar({ isOpen, onClose, currentPath, user }: SidebarProps) {
  const router = useRouter()
  const role = user?.role ?? null
  const email = user?.email ?? ''

  const visibleMenu = useMemo(() => (role ? menuItems.filter((item) => item.roles.includes(role)) : []), [role])

  const isActive = (href: string) => {
    if (href === '/dashboard') return currentPath === '/' || currentPath === '/dashboard'
    return currentPath.startsWith(href)
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(88vw,19rem)] flex-col overflow-hidden bg-[#173c37] text-white shadow-2xl shadow-[#102d29]/20
        transform transition-transform duration-300 ease-in-out
        md:w-20 md:translate-x-0 md:shadow-none lg:w-72
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      data-testid="sidebar-shell"
    >
      {/* Header */}
      <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-4 md:justify-center md:px-3 lg:justify-between lg:px-5">
        <Link href="/dashboard" className="flex items-center gap-3" aria-label="Villa Paris">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e4d3aa]/30 bg-[#c9a96a] shadow-inner">
            <span className="text-base font-bold tracking-tight text-[#102d29]">VP</span>
          </div>
          <div className="flex flex-col md:hidden lg:flex">
            <span className="text-lg font-semibold leading-tight tracking-tight">Villa Paris</span>
            <span className="text-[11px] uppercase tracking-[.18em] text-[#e4d3aa]/70">Gestionale</span>
          </div>
        </Link>
        
        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          className="rounded-xl p-2 hover:bg-white/10 md:hidden"
          aria-label="Chiudi menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 md:px-2 lg:px-3" data-testid="sidebar-scroll-area">
        {visibleMenu.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose()}
              className={`
                ${item.mobile ? '' : 'max-md:hidden'} flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5
                transition-all duration-200 group
                ${active 
                  ? 'bg-[#c9a96a] text-[#102d29] font-semibold shadow-sm'
                  : 'text-white/68 hover:bg-white/8 hover:text-white'
                }
              `}
              title={item.label}
            >
              <Icon className={`h-5 w-5 shrink-0 md:mx-auto lg:mx-0 ${active ? 'text-[#102d29]' : 'text-white/60 group-hover:text-white'}`} strokeWidth={active ? 2.3 : 1.8} />
              <div className="flex-1 md:hidden lg:block">
                <span className="block">{item.label}</span>
                <span className={`text-[11px] ${active ? 'text-[#173c37]/70' : 'text-white/38'}`}>
                  {item.description}
                </span>
              </div>
              {active && <ChevronRight className="h-4 w-4 md:hidden lg:block" />}
            </Link>
          )
        })}
      </nav>

      {/* Quick actions */}
      <div className="hidden shrink-0 border-t border-white/10 p-3 md:block lg:p-4">
        <button
          onClick={() => {
            if (!role) return
            router.push(role === 'WORKER' ? '/rapportini-interni' : role === 'REPORT' ? '/report/azienda' : '/nuovo-evento')
            onClose()
          }}
          disabled={!role}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-3 font-semibold text-[#102d29] transition-colors hover:bg-[#dcc18b]"
          title={role === 'WORKER' ? 'Nuovo Rapportino' : role === 'REPORT' ? 'Apri Report' : 'Nuovo Evento'}
        >
          <Calendar className="h-5 w-5 shrink-0" />
          <span className="md:hidden lg:inline">{role === 'WORKER' ? 'Nuovo Rapportino' : role === 'REPORT' ? 'Apri Report' : 'Nuovo Evento'}</span>
        </button>
      </div>

      {/* User info */}
      <div className="shrink-0 border-t border-white/10 p-4 md:hidden lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Users className="h-5 w-5 text-[#e4d3aa]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{email || 'Utente autenticato'}</p>
            <p className="truncate text-xs text-white/45">{role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
