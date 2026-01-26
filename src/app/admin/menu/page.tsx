'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AdminMenuPage() {
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleUpload = async () => {
    if (!file) return
    setMessage('⏳ Caricamento in corso...')

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/piatti/upload', {
      method: 'POST',
      body: formData
    })

    if (res.ok) {
      const data = await res.json()
      const nome = prompt('Inserisci il nome per questo menù:', 'Menu da Excel')
      if (!nome) return setMessage('❌ Nome mancante, menù non salvato')

      const salva = await fetch('/api/menu-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          contenuto: data
        })
      })

      if (salva.ok) {
        setMessage('✅ Menù salvato con successo')
        setFile(null)
      } else {
        setMessage('❌ Errore nel salvataggio del menù')
      }
    } else {
      setMessage('❌ Errore durante il caricamento del file')
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">📤 Carica Menù da Excel</h1>

      <label
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded p-6 text-center cursor-pointer hover:bg-gray-50"
      >
        {file ? `📄 ${file.name}` : '📂 Trascina un file qui o clicca per selezionare'}
      </label>

      <input
        type="file"
        accept=".xlsx"
        ref={inputRef}
        onChange={e => setFile(e.target.files?.[0] || null)}
        className="hidden"
      />

      <Button onClick={() => inputRef.current?.click()} variant="outline">
        📁 Scegli file manualmente
      </Button>

      <Button onClick={handleUpload} disabled={!file}>
        📤 Carica e Salva
      </Button>

      {message && <p className="text-sm mt-2">{message}</p>}

      <div className="flex gap-4 mt-6">
        <Link href="/gestione-menu">
          <Button variant="secondary">🔙 Torna alla Gestione Menù</Button>
        </Link>
        <Link href="/villa">
          <Button variant="outline">🏠 Torna alla Home</Button>
        </Link>
      </div>
    </div>
  )
}
