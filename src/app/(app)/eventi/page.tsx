'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  LayoutGrid, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Users,
  MapPin
} from 'lucide-react'

type Evento = {
  id: number
  tipo: string
  titolo: string
  dataEvento: string
  dataConfermata?: string
  fascia: string
  stato: string
  personePreviste?: number
  clienteNome: string
  clienteEmail: string
}

export default function EventiPage() {
  const router = useRouter()
  const [eventi, setEventi] = useState<Evento[]>([])
  const [filteredEventi, setFilteredEventi] = useState<Evento[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [annoSelezionato, setAnnoSelezionato] = useState<string>('')
  const [meseSelezionato, setMeseSelezionato] = useState<string>('')
  const [tipoSelezionato, setTipoSelezionato] = useState<string>('')
  const [statoSelezionato, setStatoSelezionato] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const fetchEventi = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/eventi')
      const data = await res.json()
      setEventi(data)
      setFilteredEventi(data)
    } catch (error) {
      console.error('Errore nel caricamento eventi:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEventi()
  }, [])

  useEffect(() => {
    let risultato = [...eventi]
    
    // Filtro ricerca testuale
    if (searchTerm) {
      risultato = risultato.filter(e => 
        e.titolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Filtro anno
    if (annoSelezionato) {
      risultato = risultato.filter(e => {
        const data = e.dataConfermata || e.dataEvento
        return data && new Date(data).getFullYear().toString() === annoSelezionato
      })
    }
    
    // Filtro mese
    if (meseSelezionato) {
      risultato = risultato.filter(e => {
        const data = e.dataConfermata || e.dataEvento
        return data && (new Date(data).getMonth() + 1).toString().padStart(2, '0') === meseSelezionato
      })
    }
    
    // Filtro tipo
    if (tipoSelezionato) {
      risultato = risultato.filter(e => e.tipo === tipoSelezionato)
    }
    
    // Filtro stato
    if (statoSelezionato) {
      risultato = risultato.filter(e => e.stato === statoSelezionato)
    }
    
    setFilteredEventi(risultato)
  }, [eventi, searchTerm, annoSelezionato, meseSelezionato, tipoSelezionato, statoSelezionato])

  const eliminaEvento = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo evento?')) return
    await fetch(`/api/eventi?id=${id}`, { method: 'DELETE' })
    fetchEventi()
  }

  const statoLabel = (stato: string) => {
    switch (stato) {
      case "confermato": return { text: "Confermato", color: "bg-green-100 text-green-700" }
      case "annullato": return { text: "Annullato", color: "bg-red-100 text-red-700" }
      default: return { text: "In attesa", color: "bg-amber-100 text-amber-700" }
    }
  }

  const anniDisponibili = Array.from(new Set(eventi.map(e => {
    const data = e.dataConfermata || e.dataEvento
    return data ? new Date(data).getFullYear().toString() : null
  }).filter(Boolean))).sort()

  const tipiDisponibili = Array.from(new Set(eventi.map(e => e.tipo)))

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="eventi-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutGrid className="w-7 h-7 text-amber-500" />
            Gestione Eventi
          </h1>
          <p className="text-gray-500">{filteredEventi.length} eventi trovati</p>
        </div>
        <Button 
          onClick={() => router.push('/nuovo-evento')}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Evento
        </Button>
      </div>

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Ricerca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cerca evento o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Anno */}
            <select 
              value={annoSelezionato} 
              onChange={(e) => setAnnoSelezionato(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Tutti gli anni</option>
              {anniDisponibili.map((a) => (
                <option key={a} value={a!}>{a}</option>
              ))}
            </select>

            {/* Mese */}
            <select 
              value={meseSelezionato} 
              onChange={(e) => setMeseSelezionato(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Tutti i mesi</option>
              {mesi.map((m) => (
                <option key={m.val} value={m.val}>{m.nome}</option>
              ))}
            </select>

            {/* Tipo */}
            <select 
              value={tipoSelezionato} 
              onChange={(e) => setTipoSelezionato(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Tutti i tipi</option>
              {tipiDisponibili.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>

            {/* Stato */}
            <select 
              value={statoSelezionato} 
              onChange={(e) => setStatoSelezionato(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Tutti gli stati</option>
              <option value="in_attesa">In attesa</option>
              <option value="confermato">Confermato</option>
              <option value="annullato">Annullato</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista Eventi */}
      <div className="grid gap-4">
        {filteredEventi.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Nessun evento trovato</p>
              <Button 
                variant="link" 
                onClick={() => router.push('/nuovo-evento')}
                className="mt-2"
              >
                Crea il primo evento
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredEventi.map((evento) => {
            const statoInfo = statoLabel(evento.stato)
            const dataEvento = evento.dataConfermata || evento.dataEvento
            return (
              <Card 
                key={evento.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/modifica-evento/${evento.id}`)}
                data-testid={`evento-card-${evento.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{evento.titolo}</h3>
                        <p className="text-sm text-gray-500">{evento.tipo}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                          {dataEvento && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(dataEvento).toLocaleDateString('it-IT')}
                            </span>
                          )}
                          {evento.personePreviste && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {evento.personePreviste} ospiti
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {evento.fascia === 'pranzo' ? 'Pranzo' : 'Cena'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statoInfo.color}`}>
                        {statoInfo.text}
                      </span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/modifica-evento/${evento.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => eliminaEvento(evento.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
