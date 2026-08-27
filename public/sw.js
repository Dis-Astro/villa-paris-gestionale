const CACHE = 'villa-paris-beta-v3'
const DATA_CACHE = 'villa-paris-data-v1'
const APP_SHELL = ['/app-icon.svg', '/app-icon-512.png', '/apple-touch-icon.png']
const OFFLINE_API_PATHS = ['/api/auth/me', '/api/eventi', '/api/appuntamenti', '/api/clienti', '/api/piantine']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => ![CACHE, DATA_CACHE].includes(key)).map((key) => caches.delete(key))))
  )
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_PRIVATE_DATA') {
    event.waitUntil(Promise.all([caches.delete(CACHE), caches.delete(DATA_CACHE)]))
    return
  }

  if (event.data?.type !== 'CACHE_ROUTE' || !event.data.url) return
  event.waitUntil((async () => {
    try {
      const url = new URL(event.data.url, self.location.origin)
      if (url.origin !== self.location.origin || url.pathname === '/login') return
      const response = await fetch(url.href, { credentials: 'include' })
      if (!response.ok) return
      const cache = await caches.open(CACHE)
      await cache.put(new Request(url.href), response)
    } catch {
      // La cache della schermata è un miglioramento: non deve interrompere l'app.
    }
  })())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (OFFLINE_API_PATHS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(DATA_CACHE).then((cache) => cache.put(event.request, copy))
        }
        return response
      }).catch(async () => {
        const cached = await caches.match(event.request)
        return cached || new Response(JSON.stringify({ error: 'OFFLINE', message: 'Dato non ancora disponibile offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        })
      })
    )
    return
  }

  if (url.pathname.startsWith('/api/')) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok && url.pathname !== '/login') {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        }
        return response
      }).catch(async () => {
        const exact = await caches.match(event.request)
        if (exact) return exact
        const dashboard = await caches.match('/dashboard')
        if (dashboard) return dashboard
        return new Response(
          '<!doctype html><html lang="it"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:-apple-system;padding:32px;background:#f4f2ed;color:#173c37"><h1>Villa Paris</h1><p>La rete non è disponibile e questa schermata non è stata ancora aperta su questo dispositivo.</p><p>Riprova appena torna la connessione.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      })
    )
    return
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        return response
      }).catch(() => caches.match(event.request))
    )
    return
  }

  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        return response
      }))
    )
  }
})
