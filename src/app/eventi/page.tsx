'use client'

import { useEffect, useState } from 'react'

type Evento = {
  id: number
  tipo: string
  titolo: string
  dataEvento: string
  fascia: string
  clienteNome: string
  clienteEmail: string
}

export default function ListaEventiPage() {
  const [eventi, setEventi] = useState<Evento[]>([])
  const [annoSelezionato, setAnnoSelezionato] = useState<string>('')
  const [meseSelezionato, setMeseSelezionato] = useState<string>('')
  const [tipoSelezionato, setTipoSelezionato] = useState<string>('')
  const [fasciaSelezionata, setFasciaSelezionata] = useState<string>('')

  const fetchEventi = async () => {
    const res = await fetch('/api/eventi')
    const data = await res.json()
    setEventi(data)
  }

  useEffect(() => {
    fetchEventi()
  }, [])

  const eliminaEvento = async (id: number) => {
    const conferma = confirm('Sei sicuro di voler eliminare questo evento?')
    if (!conferma) return
    await fetch(`/api/eventi?id=${id}`, { method: 'DELETE' })
    fetchEventi()
  }

  const vaiAModifica = (id: number) => {
    window.location.href = `/modifica-evento/${id}`
  }

  const eventiFiltrati = eventi.filter((evento) => {
    const data = new Date(evento.dataEvento)
    const anno = data.getFullYear().toString()
    const mese = (data.getMonth() + 1).toString().padStart(2, '0')

    return (
      (annoSelezionato === '' || anno === annoSelezionato) &&
      (meseSelezionato === '' || mese === meseSelezionato) &&
      (tipoSelezionato === '' || evento.tipo === tipoSelezionato) &&
      (fasciaSelezionata === '' || evento.fascia === fasciaSelezionata)
    )
  })

  const eventiPerMese: { [mese: string]: Evento[] } = {}
  eventiFiltrati.forEach((evento) => {
    const mese = new Date(evento.dataEvento).toLocaleString('default', { month: 'long' })
    if (!eventiPerMese[mese]) {
      eventiPerMese[mese] = []
    }
    eventiPerMese[mese].push(evento)
  })

  const anniDisponibili = Array.from(new Set(eventi.map(e => new Date(e.dataEvento).getFullYear().toString()))).sort()

  const mesi = [
    { val: '01', nome: 'Gennaio' },
    { val: '02', nome: 'Febbraio' },
    { val: '03', nome: 'Marzo' },
    { val: '04', nome: 'Aprile' },
    { val: '05', nome: 'Maggio' },
    { val: '06', nome: 'Giugno' },
    { val: '07', nome: 'Luglio' },
    { val: '08', nome: 'Agosto' },
    { val: '09', nome: 'Settembre' },
    { val: '10', nome: 'Ottobre' },
    { val: '11', nome: 'Novembre' },
    { val: '12', nome: 'Dicembre' }
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <h1>📅 Eventi</h1>

      {/* 🎛️ FILTRI */}
      <div style={{ marginBottom: '2rem' }}>
        <label>Anno:</label>
        <select value={annoSelezionato} onChange={(e) => setAnnoSelezionato(e.target.value)}>
          <option value="">Tutti</option>
          {anniDisponibili.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <label style={{ marginLeft: '1rem' }}>Mese:</label>
        <select value={meseSelezionato} onChange={(e) => setMeseSelezionato(e.target.value)}>
          <option value="">Tutti</option>
          {mesi.map((m) => (
            <option key={m.val} value={m.val}>{m.nome}</option>
          ))}
        </select>

        <label style={{ marginLeft: '1rem' }}>Tipo:</label>
        <select value={tipoSelezionato} onChange={(e) => setTipoSelezionato(e.target.value)}>
          <option value="">Tutti</option>
          {Array.from(new Set(eventi.map(e => e.tipo))).map((tipo) => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>

        <label style={{ marginLeft: '1rem' }}>Fascia:</label>
        <select value={fasciaSelezionata} onChange={(e) => setFasciaSelezionata(e.target.value)}>
          <option value="">Tutte</option>
          <option value="pranzo">Pranzo</option>
          <option value="cena">Cena</option>
        </select>
      </div>

      {/* 🔢 CONTATORI */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>📊 Statistiche</h3>

        <p>
          Totale eventi trovati: <strong>{eventiFiltrati.length}</strong>
        </p>

        <p>
          📅 Per anno:
          {' '}
          {Array.from(new Set(eventiFiltrati.map(e => new Date(e.dataEvento).getFullYear())))
            .sort()
            .map(anno => {
              const count = eventiFiltrati.filter(e => new Date(e.dataEvento).getFullYear() === anno).length
              return <span key={anno}> {anno} ({count}) </span>
            })}
        </p>

        <p>
          🗓️ Per mese:
          {' '}
          {mesi.map(m => {
            const count = eventiFiltrati.filter(e =>
              (new Date(e.dataEvento).getMonth() + 1).toString().padStart(2, '0') === m.val
            ).length
            return count > 0 ? <span key={m.val}> {m.nome} ({count}) </span> : null
          })}
        </p>

        <p>
          🏷️ Per tipo:
          {' '}
          {Array.from(new Set(eventiFiltrati.map(e => e.tipo))).map(tipo => {
            const count = eventiFiltrati.filter(e => e.tipo === tipo).length
            return <span key={tipo}> {tipo} ({count}) </span>
          })}
        </p>
      </div>

      {/* LISTA EVENTI */}
      {Object.keys(eventiPerMese).length === 0 ? (
        <p>Nessun evento corrisponde ai filtri.</p>
      ) : (
        Object.entries(eventiPerMese).map(([mese, eventiDelMese]) => (
          <div key={mese}>
            <h2>{mese}</h2>
            <ul>
              {eventiDelMese.map(evento => (
                <li key={evento.id} style={{ marginBottom: '1.5rem' }}>
                  <strong>{evento.titolo}</strong> — {evento.tipo} <br />
                  📆 {new Date(evento.dataEvento).toLocaleDateString()} — {evento.fascia} <br />
                  👤 {evento.clienteNome} ({evento.clienteEmail}) <br />
                  <button onClick={() => eliminaEvento(evento.id)}>🗑️ Elimina</button>
                  <button onClick={() => vaiAModifica(evento.id)} style={{ marginLeft: '1rem' }}>✏️ Modifica</button>
                  <hr />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
