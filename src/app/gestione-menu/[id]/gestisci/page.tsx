'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function GestionePreferitiPage() {
  const { id } = useParams()
  const router = useRouter()
  const [menu, setMenu] = useState<any>(null)
  const [struttura, setStruttura] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchMenu = async () => {
      const res = await fetch(`/api/menu-base?id=${id}`)
      const data = await res.json()
      setMenu(data)
      setStruttura(data?.struttura || {})
    }
    fetchMenu()
  }, [id])

  const togglePreferito = (categoria: string, nome: string) => {
    const updated = struttura[categoria].map(p => ({
      ...p,
      preferito: p.nome === nome ? !p.preferito : p.preferito
    }))
    setStruttura({ ...struttura, [categoria]: updated })
  }

  const salvaPreferiti = async () => {
    setLoading(true)
    const res = await fetch(`/api/menu-base?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ struttura })
    })
    setLoading(false)
    if (res.ok) {
      alert('✅ Preferiti salvati con successo')
      router.push('/gestione-menu')
    } else {
      alert('❌ Errore nel salvataggio')
    }
  }

  if (!menu) return <p className="p-6">Caricamento...</p>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">🔧 Gestione Preferiti: {menu.nome}</h1>

      {Object.entries(struttura).map(([categoria, piatti]: any) => (
        <div key={categoria}>
          <h2 className="font-semibold mt-4 mb-2">{categoria}</h2>
          <ul className="space-y-1">
            {Array.isArray(piatti) &&
              piatti.map((p: any, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!p.preferito}
                    onChange={() => togglePreferito(categoria, p.nome)}
                  />
                  <span>{p.nome}</span>
                </li>
              ))}
          </ul>
        </div>
      ))}

      <Button onClick={salvaPreferiti} disabled={loading}>
        💾 Salva Preferiti
      </Button>
    </div>
  )
}
