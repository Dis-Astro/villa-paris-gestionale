'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '../nav/Sidebar'
import Topbar from '../nav/Topbar'

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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
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
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} user={user} />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t bg-white px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-500">
            <span>© 2026 Villa Paris Gestionale</span>
            <span>v2.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
