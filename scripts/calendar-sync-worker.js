const baseUrl = (process.env.CALENDAR_SYNC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const secret = process.env.CALENDAR_SYNC_SECRET
const checkIntervalMs = 30 * 1000

if (!secret) {
  console.error('[Calendar Worker] CALENDAR_SYNC_SECRET mancante: automazione non avviata')
  process.exit(1)
}

let running = false

async function synchronize() {
  if (running) return
  running = true
  try {
    const response = await fetch(`${baseUrl}/api/google-calendar/import?ai=0`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(240000)
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

let lastRunDate = ''

function romeClock() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    hour: value.hour,
    minute: value.minute
  }
}

function checkSchedule() {
  const clock = romeClock()
  if (clock.hour === '00' && clock.minute === '01' && lastRunDate !== clock.date) {
    lastRunDate = clock.date
    synchronize()
  }
}

console.log(`[Calendar Worker] sincronizzazione giornaliera alle 00:01 Europe/Rome su ${baseUrl}`)
checkSchedule()
const timer = setInterval(checkSchedule, checkIntervalMs)

function stop() {
  clearInterval(timer)
  process.exit(0)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
