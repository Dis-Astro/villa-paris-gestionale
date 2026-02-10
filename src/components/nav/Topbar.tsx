'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Menu, 
  Search, 
  Bell, 
  ChevronRight,
  Home
} from 'lucide-react'

interface TopbarProps {
  onMenuClick: () => void
}

// Mappa percorsi a breadcrumb
const pathLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/calendario': 'Calendario',
  '/eventi': 'Eventi',
  '/clienti': 'Clienti',
  '/menu-base': 'Menu Base',
  '/report': 'Report',
  '/report/azienda': 'Report Azienda',
  '/stampe': 'Stampe',
  '/impostazioni': 'Impostazioni',
  '/nuovo-evento': 'Nuovo Evento',
  '/modifica-evento': 'Modifica Evento',
  '/piantina-evento': 'Piantina Evento',
  '/gestione-menu': 'Gestione Menu'
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/cerca?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
      setSearchOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left side - Menu button + Breadcrumb */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
            aria-label="Apri menu"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>

          {/* Breadcrumb (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
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
                ) : index === breadcrumbs.length - 1 ? (
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
            {breadcrumbs[breadcrumbs.length - 1]?.label || 'Villa Paris'}
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
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Cerca"
              >
                <Search className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Notifications */}
          <button
            className="relative p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Notifiche"
          >
            <Bell className="w-5 h-5 text-gray-500" />
            {/* Badge notifiche */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User avatar (mobile) */}
          <button className="lg:hidden p-1">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">A</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}
