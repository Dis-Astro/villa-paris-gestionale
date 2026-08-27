'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { CurrentUser } from '../layout/AppShell'
import { clearOfflineWorkspace } from '@/lib/planimetria-offline'
import { 
  Menu, 
  Search, 
  Bell, 
  ChevronRight,
  Home,
  Calendar,
  Clock,
  X,
  LogOut
} from 'lucide-react'

interface TopbarProps {
  onMenuClick: () => void
  user: CurrentUser | null
}

// Mappa percorsi a breadcrumb
const pathLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/calendario': 'Calendario',
  '/eventi': 'Eventi',
  '/clienti': 'Clienti',
  '/rapportini-interni': 'Rapportini Interni',
  '/appuntamenti': 'Appuntamenti',
  '/menu-base': 'Menu Base',
  '/report': 'Report',
  '/report/azienda': 'Report Operativo',
  '/report/eventi': 'Report Eventi',
  '/audit': 'Audit',
  '/utenti': 'Gestione Utenti',
  '/stampe': 'Stampe',
  '/assistente-ai': 'Assistente AI',
  '/impostazioni': 'Impostazioni',
  '/nuovo-evento': 'Nuovo Evento',
  '/modifica-evento': 'Modifica Evento',
  '/piantina-evento': 'Piantina Evento',
  '/gestione-menu': 'Gestione Menu'
}

interface Notifica {
  id: string
  testo: string
  tipo: 'evento' | 'sistema' | 'reminder'
  data: string
  sortValue: number
  letta: boolean
}

function NotificheDropdown({ role }: { role?: string }) {
  const [open, setOpen] = useState(false)
  const [notifiche, setNotifiche] = useState<Notifica[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !role || loaded) return
    let active = true

    async function loadNotifiche() {
      setLoading(true)
      try {
        const [eventiRes, appuntamentiRes] = await Promise.all([
          fetch('/api/eventi?summary=notifications'),
          role !== 'WORKER' ? fetch('/api/appuntamenti?summary=notifications') : Promise.resolve(null)
        ])
        if (!eventiRes.ok) return
        const eventi = await eventiRes.json()
        const appuntamenti = appuntamentiRes && appuntamentiRes.ok ? await appuntamentiRes.json() : []
        const oggi = new Date()
        const nots: Notifica[] = []

        for (const ev of eventi) {
          if (!ev.dataConfermata) continue
          const d = new Date(ev.dataConfermata)
          const diff = Math.ceil((d.getTime() - oggi.getTime()) / 86400000)
          if (diff > 0 && diff <= 30) {
            nots.push({
              id: `ev-${ev.id}`,
              testo: `${ev.titolo} tra ${diff} giorni`,
              tipo: 'evento',
              data: d.toLocaleDateString('it-IT'),
              sortValue: d.getTime(),
              letta: diff > 7
            })
          }
        }

        for (const app of Array.isArray(appuntamenti) ? appuntamenti : []) {
          if (!app.dataScadenzaOpzione || app.statoOpzione === 'confermata') continue
          const d = new Date(app.dataScadenzaOpzione)
          const diff = Math.ceil((d.getTime() - oggi.getTime()) / 86400000)
          if (diff <= 7) {
            const nome = `${app.clientePrincipale?.nome || ''} ${app.clientePrincipale?.cognome || ''}`.trim() || 'Cliente'
            nots.push({
              id: `app-${app.id}`,
              testo: diff < 0 ? `${nome}: opzione scaduta` : `${nome}: opzione in scadenza tra ${diff} giorni`,
              tipo: 'reminder',
              data: d.toLocaleDateString('it-IT'),
              sortValue: d.getTime(),
              letta: diff > 2
            })
          }
        }

        nots.sort((a, b) => a.sortValue - b.sortValue)
        if (active) {
          setNotifiche(nots.slice(0, 10))
          setLoaded(true)
        }
      } catch {
        if (active) setLoaded(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadNotifiche()
    return () => {
      active = false
    }
  }, [open, role, loaded])

  useEffect(() => {
    setLoaded(false)
    setNotifiche([])
  }, [role])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const nonLette = notifiche.filter(n => !n.letta).length

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative p-2 hover:bg-gray-100 rounded-lg"
        aria-label="Notifiche"
        onClick={() => setOpen(!open)}
        data-testid="notifiche-btn"
      >
        <Bell className="w-5 h-5 text-gray-500" />
        {nonLette > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">{nonLette}</span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50 overflow-hidden" data-testid="notifiche-panel">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="text-sm font-bold text-gray-800">Notifiche</h3>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-200 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!role ? (
              <div className="py-8 text-center text-sm text-gray-400">
                Utente in caricamento
              </div>
            ) : loading ? (
              <div className="py-8 text-center text-sm text-gray-400">
                Caricamento notifiche
              </div>
            ) : notifiche.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                Nessun evento imminente
              </div>
            ) : (
              notifiche.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-0 flex items-start gap-3 hover:bg-gray-50 ${!n.letta ? 'bg-amber-50' : ''}`}
                >
                  <Calendar className={`w-4 h-4 mt-0.5 flex-shrink-0 ${n.tipo === 'reminder' ? 'text-red-500' : (!n.letta ? 'text-amber-500' : 'text-gray-400')}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!n.letta ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                      {n.testo}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {n.data}
                    </p>
                  </div>
                  {!n.letta && <span className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Topbar({ onMenuClick, user }: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    await clearOfflineWorkspace()
    router.push('/login')
    router.refresh()
  }

  // Build breadcrumb from pathname
  const buildBreadcrumb = () => {
    const parts = pathname.split('/').filter(Boolean)
    const crumbs: { label: string; href: string }[] = [
      { label: 'Home', href: '/dashboard' }
    ]

    let currentPath = ''
    for (const part of parts) {
      currentPath += `/${part}`
      
      // Skip dynamic segments display
      if (part.match(/^\d+$/)) {
        crumbs.push({ label: `#${part}`, href: currentPath })
      } else {
        const label = pathLabels[currentPath] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
        crumbs.push({ label, href: currentPath })
      }
    }

    return crumbs
  }

  const breadcrumbs = buildBreadcrumb()
  // De-duplicate crumbs con la stessa href (es. /dashboard appare come Home e Dashboard)
  const uniqueCrumbs = breadcrumbs.filter((c, i, arr) =>
    i === 0 || arr.findIndex(x => x.href === c.href) === i
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/cerca?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
      setSearchOpen(false)
    }
  }

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-[#173c37]/8 bg-white/88 shadow-[0_1px_16px_rgba(18,51,46,.045)] backdrop-blur-xl">
      <div className="flex h-[72px] items-center justify-between px-4 md:px-6 xl:px-9">
        {/* Left side - Menu button + Breadcrumb */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="-ml-2 rounded-xl p-2 hover:bg-[#173c37]/5 md:hidden"
            aria-label="Apri menu"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>

          {/* Breadcrumb (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Breadcrumb">
            {uniqueCrumbs.map((crumb, index) => (
              <div key={`${index}-${crumb.href}`} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
                )}
                {index === 0 ? (
                  <button
                    onClick={() => router.push(crumb.href)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Home className="w-4 h-4 text-gray-500" />
                  </button>
                ) : index === uniqueCrumbs.length - 1 ? (
                  <span className="font-medium text-gray-900">{crumb.label}</span>
                ) : (
                  <button
                    onClick={() => router.push(crumb.href)}
                    className="text-gray-500 hover:text-gray-700 hover:underline"
                  >
                    {crumb.label}
                  </button>
                )}
              </div>
            ))}
          </nav>

          {/* Mobile: Current page title */}
          <h1 className="md:hidden font-semibold text-gray-900 truncate">
            {uniqueCrumbs[uniqueCrumbs.length - 1]?.label || 'Villa Paris'}
          </h1>
        </div>

        {/* Right side - Search + Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center">
                <input
                  type="text"
                  placeholder="Cerca eventi, clienti..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 md:w-64 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                  onBlur={() => !searchQuery && setSearchOpen(false)}
                />
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden rounded-xl p-2 hover:bg-[#173c37]/5 sm:block"
                aria-label="Cerca"
              >
                <Search className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Notifications */}
              <NotificheDropdown role={user?.role} />

          {/* Desktop user + logout */}
          <span className="hidden rounded-full border border-[#c9a96a]/35 bg-[#f8f3e8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#7a6847] lg:inline-flex">Beta iPad</span>

          <div className="hidden items-center gap-2 border-l border-[#173c37]/10 pl-2 ml-1 lg:flex" data-testid="topbar-user-area">
            <div className="text-right">
              <p className="text-xs text-gray-700 truncate max-w-[180px]">{user?.email || 'utente'}</p>
              <p className="text-[10px] text-gray-500">{user?.role || ''}</p>
            </div>
            <button
              className="rounded-xl p-2 hover:bg-[#173c37]/5"
              onClick={handleLogout}
              data-testid="topbar-logout-btn"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* User avatar (mobile) */}
          <button
            className="p-1 lg:hidden"
            onClick={handleLogout}
            data-testid="topbar-mobile-logout-btn"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c9a96a]">
              <span className="text-sm font-semibold text-[#102d29]">{(user?.email || 'U')[0].toUpperCase()}</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}
