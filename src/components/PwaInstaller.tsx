'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { syncPendingPlanimetrie } from '@/lib/planimetria-offline'

export default function PwaInstaller() {
  const pathname = usePathname()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
        // L'app resta pienamente utilizzabile nel browser se la registrazione non è disponibile.
      })
    }

    const sync = () => {
      if (navigator.onLine) void syncPendingPlanimetrie()
    }
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }

    sync()
    window.addEventListener('online', sync)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', syncWhenVisible)

    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [])

  useEffect(() => {
    if (!pathname || pathname === '/login') return

    if (navigator.onLine) {
      localStorage.setItem('villa-paris:last-route', pathname)
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.ready.then((registration) => {
          registration.active?.postMessage({ type: 'CACHE_ROUTE', url: window.location.href })
        })
      }
      return
    }

    if (pathname === '/dashboard') {
      const lastRoute = localStorage.getItem('villa-paris:last-route')
      if (lastRoute?.startsWith('/') && lastRoute !== '/dashboard' && !lastRoute.startsWith('/login')) {
        window.location.replace(lastRoute)
      }
    }
  }, [pathname])

  return null
}
