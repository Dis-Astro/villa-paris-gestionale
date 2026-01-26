'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Cliente {
  id: number
  nome: string
  cognome?: string
  email: string
  telefono?: string
  indirizzo?: string
  eventi: { id: number }[]
}

export default function ClientiPage() {
  const router = useRouter()
  const [clienti, setClienti] = useState<Cliente[]>([])

  useEffect(() => {
    const fetchClienti = async () => {
      const res = await fetch('/api/clienti')
      const data = await res.json()
      setClienti(data)
    }
    fetchClienti()
  }, [])

  const stampa = () => {
    window.print()
  }

  const esportaExcel = () => {
    const headers = ['Nome', 'Cognome', 'Email', 'Telefono', 'Indirizzo', 'Eventi']
    const rows = clienti.map(c => [
      c.nome,
      c.cognome ?? '',
      c.email,
      c.telefono ?? '',
      c.indirizzo ?? '',
      c.eventi.length.toString()
    ])

    let csvContent = '\uFEFF' + headers.join(';') + '\r\n'
    rows.forEach(row => {
      csvContent += row.map(val => `"${val}"`).join(';') + '\r\n'
    })

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'clienti.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">👥 Elenco Clienti</h1>
        <div className="space-x-2">
          <button className="bg-gray-200 px-3 py-1 rounded text-sm" onClick={stampa}>🖨 Stampa</button>
          <button className="bg-green-200 px-3 py-1 rounded text-sm" onClick={esportaExcel}>📁 Esporta Excel</button>
        </div>
      </div>

      {clienti.length === 0 ? (
        <p>Nessun cliente presente.</p>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Nome</th>
                <th className="p-2 text-left">Cognome</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Telefono</th>
                <th className="p-2 text-left">Indirizzo</th>
                <th className="p-2 text-left">Eventi</th>
                <th className="p-2 text-left">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {clienti.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.nome}</td>
                  <td className="p-2">{c.cognome ?? '-'}</td>
                  <td className="p-2">{c.email}</td>
                  <td className="p-2">{c.telefono ?? '-'}</td>
                  <td className="p-2">{c.indirizzo ?? '-'}</td>
                  <td className="p-2">{c.eventi.length}</td>
                  <td className="p-2 space-x-2">
                    <button
                      className="text-blue-600 underline text-xs"
                      onClick={() => router.push(`/eventi?clienteId=${c.id}`)}
                    >
                      🔍 Eventi
                    </button>
                    <button
                      className="text-yellow-700 underline text-xs"
                      onClick={() => router.push(`/clienti/modifica/${c.id}`)}
                    >
                      ✏️ Modifica
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
