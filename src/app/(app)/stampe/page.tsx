'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Search,
  Eye
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface EventoStampa {
  id: number
  titolo: string
  tipo: string
  dataConfermata?: string
  stato: string
  personePreviste?: number
}

export default function StampePage() {
  const router = useRouter()
  const [eventi, setEventi] = useState<EventoStampa[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEventi = async () => {
      try {
        const res = await fetch('/api/eventi')
        const data = await res.json()
        // Filtra solo eventi con data confermata
        setEventi(data.filter((e: any) => e.dataConfermata))
      } catch (error) {
        console.error('Errore:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchEventi()
  }, [])

  const filteredEventi = eventi.filter(e => 
    e.titolo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="stampe-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-amber-500" />
            Stampe Documenti
          </h1>
          <p className="text-gray-500">
            Genera PDF per clienti e staff operativo
          </p>
        </div>
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Come funziona:</strong> Seleziona un evento per accedere alla generazione 
            dei PDF. Puoi generare il pacchetto cliente (contratto + menu + piantina) o 
            i fogli operativi per lo staff (riepilogo varianti + disposizione sala).
          </p>
        </CardContent>
      </Card>

      {/* Ricerca */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cerca evento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista Eventi */}
      {filteredEventi.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {searchTerm ? 'Nessun evento trovato' : 'Nessun evento con data confermata'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Gli eventi devono avere una data confermata per poter generare i documenti
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEventi.map((evento) => (
            <Card 
              key={evento.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{evento.titolo}</h3>
                      <p className="text-sm text-gray-500">{evento.tipo}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>
                          {evento.dataConfermata && new Date(evento.dataConfermata).toLocaleDateString('it-IT')}
                        </span>
                        {evento.personePreviste && (
                          <>
                            <span>•</span>
                            <span>{evento.personePreviste} ospiti</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/modifica-evento/${evento.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizza
                    </Button>
                    <Button
                      onClick={() => router.push(`/modifica-evento/${evento.id}?stampa=true`)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Stampa
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tipi di stampa disponibili */}
      <Card>
        <CardHeader>
          <CardTitle>Tipi di Documenti Disponibili</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Pacchetto Cliente
              </h4>
              <p className="text-sm text-gray-600">
                Documento contrattuale completo con copertina, menu dettagliato, 
                piantina sala e pagina firme. Disponibile con watermark BOZZA, 
                CONTRATTO o DEFINITIVO.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                Documento Operativo
              </h4>
              <p className="text-sm text-gray-600">
                Per lo staff: riepilogo varianti alimentari per tavolo, 
                piantina con indicazioni varianti colorate, fogli servizio 
                per ogni portata.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
