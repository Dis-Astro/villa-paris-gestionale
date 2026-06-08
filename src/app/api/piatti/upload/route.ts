import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import ExcelJS from 'exceljs'

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

  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }

  const filePath = path.join(uploadsDir, 'menu_servizi.xlsx')
  await writeFile(filePath, buffer)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as any)
  const sheet = workbook.worksheets[0]

  if (!sheet) {
    return NextResponse.json({ error: 'Il file Excel non contiene fogli' }, { status: 400 })
  }

  const struttura: Record<string, { nome: string; preferito: boolean }[]> = {}
  const headers: string[] = []

  sheet.getRow(1).eachCell((cell, colNumber) => {
    const categoria = String(cell.value ?? '').trim()
    headers[colNumber] = categoria
    if (categoria && !struttura[categoria]) struttura[categoria] = []
  })

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.eachCell((cell, colNumber) => {
      const categoria = headers[colNumber]
      const voce = String(cell.value ?? '').trim()
      if (categoria && voce) {
        struttura[categoria].push({ nome: voce, preferito: false })
      }
    })
  })

  const outPath = path.join(uploadsDir, 'piatti.json')
  await writeFile(outPath, JSON.stringify(struttura, null, 2))

  return NextResponse.json(struttura)
}
