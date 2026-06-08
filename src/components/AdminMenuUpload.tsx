'use client'

import { useState } from 'react'

export default function AdminMenuUpload() {
  const [output, setOutput] = useState('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const uploadRes = await fetch('/api/piatti/upload', {
      method: 'POST',
      body: formData
    })

    if (!uploadRes.ok) {
      alert('Errore nella lettura del file')
      return
    }

    const struttura = await uploadRes.json()
    setOutput(JSON.stringify(struttura, null, 2))

    const nome = prompt('Nome per il menu base:')
    if (!nome) return

    const res = await fetch('/api/menu-base', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, struttura })
    })

    alert(res.ok ? 'Menu salvato' : 'Errore nel salvataggio')
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
