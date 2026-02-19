import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import * as xlsx from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file: File | null = formData.get('file') as unknown as File

  if (!file) {
    return NextResponse.json({ error: 'Nessun file ricevuto' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  
  // Ensure uploads directory exists
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }
  
  const filePath = path.join(uploadsDir, 'menu_servizi.xlsx')
  await writeFile(filePath, buffer)

  const workbook = xlsx.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const json = xlsx.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

  const struttura: Record<string, { nome: string; preferito: boolean }[]> = {}

  json.forEach(row => {
    for (const categoria in row) {
      const voce = row[categoria]?.trim()
      if (voce) {
        if (!struttura[categoria]) struttura[categoria] = []
        struttura[categoria].push({ nome: voce, preferito: false })
      }
    }
  })

  const outPath = path.join(uploadsDir, 'piatti.json')
  await writeFile(outPath, JSON.stringify(struttura, null, 2))

  return NextResponse.json(struttura)
}
