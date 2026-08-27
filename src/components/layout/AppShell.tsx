'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, LayoutDashboard, LayoutGrid, Plus } from 'lucide-react'
import Sidebar from '../nav/Sidebar'
import Topbar from '../nav/Topbar'
import PwaInstaller from '../PwaInstaller'

export interface CurrentUser {
  email: string
  role: 'ADMIN' | 'REPORT' | 'WORKER'
}

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    let active = true

    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        if (active) setUser(data)
      } catch {
        if (active) setUser(null)
      }
    }

    loadUser()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-[var(--app-surface)]">
      <PwaInstaller />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#0b1f1c]/55 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        currentPath={pathname}
        user={user}
      />

      {/* Main content area */}
      <div className="flex min-h-screen flex-col transition-[padding] duration-300 md:pl-20 lg:pl-72">
        {/* Top bar */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} user={user} />

        {/* Page content */}
        <main className="flex-1 px-3 pb-28 pt-4 sm:px-5 md:px-6 md:pb-8 md:pt-6 xl:px-9 xl:py-8">
          <div className="mx-auto w-full max-w-[1680px]">{children}</div>
        </main>

        {/* Footer */}
        <footer className="hidden border-t border-[#173c37]/8 bg-white/70 px-6 py-4 md:block">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-500">
            <span>© 2026 Villa Paris Gestionale</span>
            <span className="font-medium text-[#7a6847]">Beta iPad · v3.0</span>
          </div>
        </footer>
      </div>

      <nav className="safe-bottom fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-[22px] border border-white/70 bg-[#173c37]/95 p-1.5 text-white shadow-[0_18px_45px_rgba(12,35,31,.28)] backdrop-blur-xl md:hidden" aria-label="Navigazione rapida">
        <MobileLink href={user?.role === 'WORKER' ? '/calendario' : '/dashboard'} active={pathname === '/dashboard'} icon={LayoutDashboard} label="Oggi" />
        <MobileLink href="/calendario" active={pathname.startsWith('/calendario')} icon={CalendarDays} label="Calendario" />
        {user?.role === 'REPORT' ? (
          <>
            <MobileLink href="/report/azienda" active={pathname.startsWith('/report/azienda')} icon={LayoutGrid} label="Operativo" />
            <MobileLink href="/report/eventi" active={pathname.startsWith('/report/eventi')} icon={Plus} label="Eventi" />
          </>
        ) : (
          <>
            <MobileLink href="/eventi" active={pathname.startsWith('/eventi')} icon={LayoutGrid} label="Eventi" />
            <MobileLink href="/nuovo-evento" active={pathname.startsWith('/nuovo-evento')} icon={Plus} label="Nuovo" />
          </>
        )}
      </nav>
    </div>
  )
}

function MobileLink({ href, active, icon: Icon, label }: { href: string; active: boolean; icon: typeof CalendarDays; label: string }) {
  return (
    <Link
      href={href}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-medium transition ${active ? 'bg-[#c9a96a] text-[#102d29]' : 'text-white/70 active:bg-white/10'}`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
      <span>{label}</span>
    </Link>
  )
}
