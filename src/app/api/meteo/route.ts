import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Coordinate di Villa Paris (Roma, area Castelli Romani - approssimazione)
const LATITUDE = 41.75
const LONGITUDE = 12.65

const WMO_CODES: Record<number, string> = {
  0: 'Sereno',
  1: 'Prevalentemente sereno',
  2: 'Parzialmente nuvoloso',
  3: 'Coperto',
  45: 'Nebbia',
  48: 'Nebbia con brina',
  51: 'Pioviggine leggera',
  53: 'Pioviggine moderata',
  55: 'Pioviggine intensa',
  61: 'Pioggia leggera',
  63: 'Pioggia moderata',
  65: 'Pioggia intensa',
  71: 'Neve leggera',
  73: 'Neve moderata',
  75: 'Neve intensa',
  80: 'Rovescio leggero',
  81: 'Rovescio moderato',
  82: 'Rovescio violento',
  85: 'Rovescio di neve leggero',
  86: 'Rovescio di neve intenso',
  95: 'Temporale',
  96: 'Temporale con grandine leggera',
  99: 'Temporale con grandine forte',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Rome&start_date=${date}&end_date=${date}`
    const res = await fetch(url, { next: { revalidate: 600 } })

    if (!res.ok) {
      return NextResponse.json({ error: 'Errore API meteo' }, { status: 502 })
    }

    const data = await res.json()
    const daily = data.daily

    if (!daily || !daily.time || daily.time.length === 0) {
      return NextResponse.json({ error: 'Dati meteo non disponibili per questa data' }, { status: 404 })
    }

    const weatherCode = daily.weathercode?.[0] ?? 0
    const tempMax = daily.temperature_2m_max?.[0]
    const tempMin = daily.temperature_2m_min?.[0]
    const descrizione = WMO_CODES[weatherCode] || `Codice ${weatherCode}`

    const meteoString = `${descrizione}, ${tempMin !== null ? tempMin : '?'}°/${tempMax !== null ? tempMax : '?'}°C`

    return NextResponse.json({
      date,
      weatherCode,
      descrizione,
      tempMax,
      tempMin,
      meteoString
    })
  } catch (error) {
    console.error('Errore fetch meteo:', error)
    return NextResponse.json({ error: 'Errore nel recupero dati meteo' }, { status: 500 })
  }
}
