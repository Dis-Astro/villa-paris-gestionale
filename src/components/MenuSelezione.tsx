'use client'

import { useEffect, useState } from 'react'

export default function MenuSelezione({
  struttura = {},
  selezione = {},
  onChange
}: {
  struttura: Record<string, { nome: string }[]>
  selezione: Record<string, string[]>
  onChange: (menu: Record<string, string[]>) => void
}) {
  // Validazione e normalizzazione dei dati in ingresso
  const safeStruttura = struttura && typeof struttura === 'object' ? struttura : {}
  const safeSelezione = selezione && typeof selezione === 'object' ? selezione : {}
  
  console.log('🎯 struttura prop:', safeStruttura)
  console.log('🎯 selezione prop:', safeSelezione)
  console.log('🔍 STRUTTURA KEYS:', Object.keys(safeStruttura))

  const [menu, setMenu] = useState<Record<string, string[]>>(safeSelezione)

  // Aggiorniamo lo stato locale quando cambiano le props
  useEffect(() => {
    console.log('🔄 Aggiornamento menu da props:', safeSelezione)
    setMenu(safeSelezione)
  }, [safeSelezione])

  const toggleVoce = (cat: string, voce: string) => {
    const esiste = menu[cat]?.includes(voce)
    const nuove = esiste
      ? menu[cat].filter(v => v !== voce)
      : [...(menu[cat] || []), voce]

    const aggiornato = { ...menu, [cat]: nuove }
    console.log('✅ Menu aggiornato dopo toggle:', aggiornato)
    setMenu(aggiornato)
    onChange(aggiornato)
  }

  // Se non ci sono categorie, mostriamo un messaggio
  if (Object.keys(safeStruttura).length === 0) {
    return (
      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-2">🍽️ Menù Selezionato</h2>
        <p className="text-sm text-muted-foreground">Nessun menù selezionato</p>
      </div>
    )
  }

  return (
    <div className="border p-4 rounded">
      <h2 className="font-semibold mb-2">🍽️ Menù Selezionato</h2>
      {Object.keys(safeStruttura).map(cat => (
        <div key={cat} className="mb-3">
          <h3 className="text-sm font-semibold mb-1">{cat}</h3>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(safeStruttura[cat]) ? (
              safeStruttura[cat].map((p: any) => (
                <label key={p.nome} className={`text-sm border rounded px-2 py-1 cursor-pointer ${menu[cat]?.includes(p.nome) ? 'bg-green-100' : 'bg-gray-100'} hover:bg-green-100`}>
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={menu[cat]?.includes(p.nome) || false}
                    onChange={() => toggleVoce(cat, p.nome)}
                  />
                  {p.nome}
                </label>
              ))
            ) : (
              <p className="text-sm text-red-500">Formato categoria non valido</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
