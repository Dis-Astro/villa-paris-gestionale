'use client'

import { useEffect, useState } from 'react'

export default function MenuBaseSelector({
  onLoad,
  current
}: {
  onLoad: (struttura: any, selezione: Record<string, string[]>) => void
  current: Record<string, string[]>
}) {
  const [menuBase, setMenuBase] = useState<any[]>([])
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/menu-base')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMenuBase(data)
        else setMenuBase([])
      })
      .catch(() => setMenuBase([]))
  }, [])

  const salvaMenu = async () => {
    if (!nome) return alert('Inserisci un nome')
    setLoading(true)
    const res = await fetch('/api/menu-base', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, contenuto: current })
    })
    setLoading(false)
    if (res.ok) {
      const nuovo = await res.json()
      setMenuBase(prev => [nuovo, ...prev])
      setNome('')
    }
  }

  const applicaMenuCompleto = (menu: any) => {
    // Assicuriamoci che la struttura sia un oggetto valido
    const struttura = JSON.parse(JSON.stringify(menu.struttura || {}))
    
    // Creiamo una selezione iniziale che include solo i piatti del menù
    // Questo è il punto chiave: invece di selezionare tutti i piatti,
    // creiamo una selezione vuota che verrà popolata solo con i piatti scelti
    const selezioneIniziale: Record<string, string[]> = {}
    
    // Inizializziamo le categorie con array vuoti
    Object.keys(struttura).forEach(cat => {
      selezioneIniziale[cat] = []
    })
    
    console.log('📦 STRUTTURA:', struttura)
    console.log('✅ SELEZIONE INIZIALE:', selezioneIniziale)
    
    // Passiamo sia la struttura completa che la selezione iniziale vuota
    onLoad(struttura, selezioneIniziale)
  }

  return (
    <div className="mb-6 border rounded p-4">
      <h2 className="font-semibold mb-2">⭐ Menù Base</h2>

      <select
        onChange={e => {
          const id = parseInt(e.target.value)
          if (isNaN(id)) return // Ignora se non è un numero valido
          
          console.log('🔍 ID selezionato:', id)
          console.log('📚 Menu Base:', menuBase)
          const selezionato = menuBase.find(m => m.id === id)
          if (selezionato) {
            console.log('🍽️ Menu selezionato:', selezionato)
            applicaMenuCompleto(selezionato)
          }
        }}
        className="mb-3 border px-2 py-1 w-full"
      >
        <option value="">🔁 Carica un menù base</option>
        {menuBase.map(m => (
          <option key={m.id} value={m.id}>{m.nome}</option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Salva questo menù come..."
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="border px-2 py-1 w-full"
        />
        <button
          onClick={salvaMenu}
          disabled={loading}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          💾 Salva
        </button>
      </div>
    </div>
  )
}
