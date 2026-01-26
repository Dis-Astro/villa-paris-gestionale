'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Evento = {
  id: number
  titolo: string
  tipo: string
  dataConfermata: string | null
  stato: string
}

type Cliente = {
  id: number
  nome: string
  email: string
  eventi: Evento[]
}

export default function ClientePage() {
  const { id } = useParams()
  const router = useRouter()

  const [cliente, setCliente] = useState<Cliente | null>(null)

  useEffect(() => {
    const fetchCliente = async () => {
      const res = await fetch(`/api/clienti?id=${id}`)
      const data = await res.json()
      setCliente(data)
    }

    fetchCliente()
  }, [id])

  if (!cliente) return <p style={{ padding: '2rem' }}>🔄 Caricamento...</p>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>👤 {cliente.nome}</h1>
      <p>Email: {cliente.email}</p>
      <p>Eventi totali: {cliente.eventi.length}</p>

      <h2 style={{ marginTop: '2rem' }}>📅 Eventi del cliente</h2>

      {cliente.eventi.length === 0 ? (
        <p>Nessun evento registrato.</p>
      ) : (
        <ul>
          {cliente.eventi
            .sort((a, b) => (a.dataConfermata || '').localeCompare(b.dataConfermata || ''))
            .map(evento => (
              <li key={evento.id} style={{ marginBottom: '1rem' }}>
                <strong>{evento.titolo}</strong> — {evento.tipo}<br />
                📆 {evento.dataConfermata ? new Date(evento.dataConfermata).toLocaleDateString('it-IT') : 'Data non confermata'}<br />
                🟡 Stato: {evento.stato}<br />
                <button onClick={() => router.push(`/modifica-evento/${evento.id}`)}>✏️ Modifica</button>
              </li>
            ))}
        </ul>
      )}

      <button onClick={() => router.push('/clienti')} style={{ marginTop: '2rem' }}>
        🔙 Torna all’elenco clienti
      </button>
    </div>
  )
}
