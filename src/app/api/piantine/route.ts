import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Restituisce l'elenco delle immagini disponibili in /public/planimetrie/
export async function GET() {
  const planimetrieDir = path.join(process.cwd(), 'public', 'planimetrie')
  let files: string[] = []

  try {
    files = fs.readdirSync(planimetrieDir)
      .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
      .map(f => `/planimetrie/${f}`)
  } catch (e) {
    console.error('Errore lettura planimetrie:', e)
    return new NextResponse(JSON.stringify([]), { status: 200 })
  }

  return NextResponse.json(files)
}
