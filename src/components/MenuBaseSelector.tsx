'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { buildMenuEventoFromStruttura, getPrezzoDaStruttura, normalizeStrutturaMenuBase } from '@/lib/menu-utils'

export default function MenuBaseSelector({
  onLoad,
  current,
  onGoToMenuBase
}: {
  onLoad: (payload: { struttura: any; menu: any; menuPasto: string; prezzo: number | null }) => void
  current: any
  onGoToMenuBase?: () => void
}) {
  const [menuBase, setMenuBase] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/menu-base')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMenuBase(data)
        else setMenuBase([])
      })
      .catch(() => setMenuBase([]))
  }, [])

  return (
    <div className="mb-6 border rounded p-4 bg-amber-50/40" data-testid="menu-base-selector-card">
      <h2 className="font-semibold mb-2">⭐ Menù Base</h2>
      <p className="text-sm text-gray-600 mb-3">
        Carica un menù salvato e poi personalizzalo per questo evento (senza modificare il template originale).
      </p>

      <select
        data-testid="menu-base-selector-dropdown"
        onChange={e => {
          const id = parseInt(e.target.value)
          if (isNaN(id)) return // Ignora se non è un numero valido

          const selezionato = menuBase.find(m => m.id === id)
          if (selezionato) {
            const struttura = normalizeStrutturaMenuBase(selezionato.struttura)
            const menuEvento = buildMenuEventoFromStruttura(struttura)
            const prezzo = getPrezzoDaStruttura(struttura)

            onLoad({
              struttura,
              menu: menuEvento,
              menuPasto: selezionato.nome,
              prezzo
            })
          }
        }}
        className="mb-3 border px-2 py-1 w-full"
      >
        <option value="">🔁 Carica un menù base</option>
        {menuBase.map(m => (
          <option key={m.id} value={m.id}>
            {m.nome}
            {getPrezzoDaStruttura(m.struttura) ? ` — €${getPrezzoDaStruttura(m.struttura)}/persona` : ''}
          </option>
        ))}
      </select>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500" data-testid="menu-base-selector-current-status">
          {current?.portate?.length ? 'Menù evento già valorizzato e modificabile.' : 'Nessun menù caricato.'}
        </p>
        <Button variant="outline" size="sm" onClick={onGoToMenuBase} data-testid="menu-base-open-management-btn">
          Gestisci Menu Base
        </Button>
      </div>
    </div>
  )
}
