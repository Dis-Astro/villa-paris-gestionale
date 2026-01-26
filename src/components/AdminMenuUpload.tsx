'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

export default function AdminMenuUpload() {
  const [output, setOutput] = useState('')

  const handleFile = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return

    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const struttura: Record<string, { nome: string }[]> = {}

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet)
      struttura[sheetName] = rows.map((row: any) => ({ nome: row.nome || row.Nome || row.piatto }))
    }

    setOutput(JSON.stringify(struttura, null, 2))

    const nome = prompt('Nome per il menù base:')
    if (!nome) return

    const res = await fetch('/api/menu-base', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, contenuto: struttura })
    })

    if (res.ok) {
      alert('✅ Menù salvato')
    } else {
      alert('❌ Errore nel salvataggio')
    }
  }

  return (
    <div className="space-y-4">
      <input type="file" accept=".xlsx,.xls" onChange={handleFile} />
      <pre className="bg-muted text-sm p-2 rounded whitespace-pre-wrap break-words max-h-96 overflow-auto">
        {output}
      </pre>
    </div>
  )
}
