import { NextResponse } from 'next/server'
import path from 'path'
import { readFile, mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  const filePath = path.join(uploadsDir, 'piatti.json')

  try {
    // Ensure directory exists
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }
    
    // Create default file if not exists
    if (!existsSync(filePath)) {
      await writeFile(filePath, JSON.stringify({}), 'utf-8')
    }
    
    const file = await readFile(filePath, 'utf-8')
    const dati = JSON.parse(file)
    return NextResponse.json(dati)
  } catch (err) {
    console.error('Errore lettura piatti:', err)
    return NextResponse.json({}, { status: 500 })
  }
}
