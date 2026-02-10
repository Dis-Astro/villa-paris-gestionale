'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Users,
  UtensilsCrossed,
  LayoutGrid,
  FileText,
  BarChart3,
  Settings,
  Home,
  X,
  ChevronRight
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  currentPath: string
}

const menuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Panoramica generale'
  },
  {
    label: 'Calendario',
    href: '/calendario',
    icon: Calendar,
    description: 'Eventi e prenotazioni'
  },
  {
    label: 'Eventi',
    href: '/eventi',
    icon: LayoutGrid,
    description: 'Gestione eventi'
  },
  {
    label: 'Clienti',
    href: '/clienti',
    icon: Users,
    description: 'Anagrafica clienti'
  },
  {
    label: 'Menu Base',
    href: '/menu-base',
    icon: UtensilsCrossed,
    description: 'Template menu'
  },
  {
    label: 'Report',
    href: '/report/azienda',
    icon: BarChart3,
    description: 'Report e statistiche'
  },
  {
    label: 'Stampe',
    href: '/stampe',
    icon: FileText,
    description: 'Documenti PDF'
  },
  {
    label: 'Impostazioni',
    href: '/impostazioni',
    icon: Settings,
    description: 'Configurazione'
  }
]

export default function Sidebar({ isOpen, onClose, currentPath }: SidebarProps) {
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/dashboard') return currentPath === '/' || currentPath === '/dashboard'
    return currentPath.startsWith(href)
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
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
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
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
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => {
            router.push('/nuovo-evento')
            onClose()
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors"
        >
          <Calendar className="w-5 h-5" />
          Nuovo Evento
        </button>
      </div>

      {/* User info */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin</p>
            <p className="text-xs text-slate-400 truncate">Amministratore</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
