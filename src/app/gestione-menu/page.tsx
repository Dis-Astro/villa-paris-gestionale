'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function GestioneMenuPage() {
  const router = useRouter()
  const [menu, setMenu] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/menu-base')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMenu(data)
        else setMenu([])
      })
      .catch(err => {
        console.error("❌ Errore nel fetch menù:", err)
        setMenu([])
      })
  }, [])

  const eliminaMenu = async (id: number) => {
    const conferma = confirm('Vuoi eliminare questo menù?')
    if (!conferma) return
    await fetch(`/api/menu-base?id=${id}`, { method: 'DELETE' })
    setMenu(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">📚 Menù Salvati</h1>

      <Link href="/villa">
        <Button variant="secondary">🏠 Torna alla Home</Button>
      </Link>

      {menu.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun menù disponibile.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {menu.map((m, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <h2 className="font-semibold text-lg">{m.nome}</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/gestione-menu/${m.id}/gestisci`)}
                  >
                    🔧 Gestisci
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => eliminaMenu(m.id)}
                  >
                    🗑 Elimina
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
