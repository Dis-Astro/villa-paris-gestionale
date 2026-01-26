import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'piatti.json')

  try {
    const file = await readFile(filePath, 'utf-8')
    const dati = JSON.parse(file)
    return NextResponse.json(dati)
  } catch (err) {
    console.error('Errore lettura piatti:', err)
    return NextResponse.json({}, { status: 500 })
  }
}
