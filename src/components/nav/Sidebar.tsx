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

const menuItems: Array<{ label: string; href: string; icon: any; description: string; roles: Role[] }> = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Panoramica generale',
    roles: ['ADMIN', 'REPORT']
  },
  {
    label: 'Calendario',
    href: '/calendario',
    icon: Calendar,
    description: 'Eventi e prenotazioni',
    roles: ['ADMIN', 'REPORT', 'WORKER']
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
        fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-hidden bg-slate-900 text-white
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      data-testid="sidebar-shell"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
            <span className="text-slate-900 font-bold text-lg">VP</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">Villa Paris</span>
            <span className="text-xs text-slate-400">Gestionale</span>
          </div>
        </Link>
        
        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-slate-800 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 space-y-1" data-testid="sidebar-scroll-area">
        {visibleMenu.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose()}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-lg
                transition-all duration-200 group
                ${active 
                  ? 'bg-amber-500 text-slate-900 font-medium' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-slate-900' : 'text-slate-400 group-hover:text-white'}`} />
              <div className="flex-1">
                <span className="block">{item.label}</span>
                <span className={`text-xs ${active ? 'text-slate-700' : 'text-slate-500'}`}>
                  {item.description}
                </span>
              </div>
              {active && <ChevronRight className="w-4 h-4" />}
            </Link>
          )
        })}
      </nav>

      {/* Quick actions */}
      <div className="shrink-0 border-t border-slate-700 p-4">
        <button
          onClick={() => {
            if (!role) return
            router.push(role === 'WORKER' ? '/rapportini-interni' : role === 'REPORT' ? '/report/azienda' : '/nuovo-evento')
            onClose()
          }}
          disabled={!role}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors"
        >
          <Calendar className="w-5 h-5" />
          {role === 'WORKER' ? 'Nuovo Rapportino' : role === 'REPORT' ? 'Apri Report' : 'Nuovo Evento'}
        </button>
      </div>

      {/* User info */}
      <div className="shrink-0 border-t border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{email || 'Utente autenticato'}</p>
            <p className="text-xs text-slate-400 truncate">{role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
