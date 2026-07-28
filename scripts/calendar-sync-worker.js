const baseUrl = (process.env.CALENDAR_SYNC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const secret = process.env.CALENDAR_SYNC_SECRET
const rawInterval = Number(process.env.CALENDAR_SYNC_INTERVAL_SECONDS || '300')
const intervalMs = Math.max(60, Number.isFinite(rawInterval) ? rawInterval : 300) * 1000

if (!secret) {
  console.error('[Calendar Worker] CALENDAR_SYNC_SECRET mancante: automazione non avviata')
  process.exit(1)
}

let running = false

async function synchronize() {
  if (running) return
  running = true
  try {
    const response = await fetch(`${baseUrl}/api/google-calendar/import`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(Math.min(intervalMs - 1000, 240000))
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
    console.log(
      `[Calendar Worker] ${new Date().toISOString()} ` +
      `letti=${result.letti} importati=${result.importati} registrati=${result.registrati} ` +
      `aggiornati=${result.aggiornati} errori=${result.errori}`
    )
  } catch (error) {
    console.error(`[Calendar Worker] ${new Date().toISOString()} errore:`, error.message || error)
  } finally {
    running = false
  }
}

console.log(`[Calendar Worker] attivo ogni ${Math.round(intervalMs / 1000)} secondi su ${baseUrl}`)
synchronize()
const timer = setInterval(synchronize, intervalMs)

function stop() {
  clearInterval(timer)
  process.exit(0)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
