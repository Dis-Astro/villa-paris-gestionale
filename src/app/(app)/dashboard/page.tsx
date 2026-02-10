'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Euro,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  eventiMese: number
  eventiTotali: number
  clientiTotali: number
  ricaviMese: number
  ospitiMese: number
  prossimoEvento: any | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    eventiMese: 0,
    eventiTotali: 0,
    clientiTotali: 0,
    ricaviMese: 0,
    ospitiMese: 0,
    prossimoEvento: null
  })
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch eventi
        const eventiRes = await fetch('/api/eventi')
        const eventi = await eventiRes.json()
        
        // Fetch clienti
        const clientiRes = await fetch('/api/clienti')
        const clienti = await clientiRes.json()

        // Calculate stats
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const eventiMese = eventi.filter((e: any) => {
          if (!e.dataConfermata) return false
          const d = new Date(e.dataConfermata)
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        })

        const prossimi = eventi
          .filter((e: any) => e.dataConfermata && new Date(e.dataConfermata) > now)
          .sort((a: any, b: any) => new Date(a.dataConfermata).getTime() - new Date(b.dataConfermata).getTime())

        // Calculate revenue (using personePreviste * default price estimate)
        const ricaviMese = eventiMese.reduce((sum: number, e: any) => {
          const prezzo = e.struttura?.prezzo || 80 // Default €80/persona
          return sum + (e.personePreviste || 0) * prezzo
        }, 0)

        const ospitiMese = eventiMese.reduce((sum: number, e: any) => sum + (e.personePreviste || 0), 0)

        setStats({
          eventiMese: eventiMese.length,
          eventiTotali: eventi.length,
          clientiTotali: clienti.length,
          ricaviMese,
          ospitiMese,
          prossimoEvento: prossimi[0] || null
        })

        // Recent events (last 5)
        setRecentEvents(
          eventi
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
        )
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Panoramica generale Villa Paris</p>
        </div>
        <Button onClick={() => router.push('/nuovo-evento')}>
          <Calendar className="w-4 h-4 mr-2" />
          Nuovo Evento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Eventi questo mese</p>
                <p className="text-3xl font-bold text-gray-900">{stats.eventiMese}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +12% vs mese scorso
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ospiti previsti</p>
                <p className="text-3xl font-bold text-gray-900">{stats.ospitiMese}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +8% vs mese scorso
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ricavi stimati</p>
                <p className="text-3xl font-bold text-gray-900">
                  €{stats.ricaviMese.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <Euro className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              Ticket medio: €{stats.ospitiMese ? Math.round(stats.ricaviMese / stats.ospitiMese) : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Clienti totali</p>
                <p className="text-3xl font-bold text-gray-900">{stats.clientiTotali}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              {stats.eventiTotali} eventi totali
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prossimo evento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Prossimo Evento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.prossimoEvento ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{stats.prossimoEvento.titolo}</h3>
                    <p className="text-gray-500">{stats.prossimoEvento.tipo}</p>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                    {stats.prossimoEvento.stato}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Data</p>
                    <p className="font-medium">
                      {new Date(stats.prossimoEvento.dataConfermata).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ospiti</p>
                    <p className="font-medium">{stats.prossimoEvento.personePreviste || 'N/D'}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push(`/modifica-evento/${stats.prossimoEvento.id}`)}
                >
                  Vai all'evento
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nessun evento in programma</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => router.push('/nuovo-evento')}
                >
                  Crea il primo evento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventi recenti */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Eventi Recenti</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/eventi')}
            >
              Vedi tutti
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentEvents.length > 0 ? (
              <div className="space-y-3">
                {recentEvents.map((evento) => (
                  <div 
                    key={evento.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => router.push(`/modifica-evento/${evento.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{evento.titolo}</p>
                        <p className="text-xs text-gray-500">
                          {evento.dataConfermata 
                            ? new Date(evento.dataConfermata).toLocaleDateString('it-IT')
                            : 'Data da confermare'
                          }
                        </p>
                      </div>
                    </div>
                    <span className={`
                      px-2 py-1 rounded text-xs font-medium
                      ${evento.stato === 'confermato' ? 'bg-green-100 text-green-700' : ''}
                      ${evento.stato === 'bozza' ? 'bg-gray-100 text-gray-700' : ''}
                      ${evento.stato === 'in_attesa' ? 'bg-amber-100 text-amber-700' : ''}
                    `}>
                      {evento.stato}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nessun evento creato</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => router.push('/nuovo-evento')}
            >
              <Calendar className="w-6 h-6 text-amber-500" />
              <span>Nuovo Evento</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => router.push('/clienti')}
            >
              <Users className="w-6 h-6 text-blue-500" />
              <span>Gestione Clienti</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => router.push('/report/azienda')}
            >
              <TrendingUp className="w-6 h-6 text-green-500" />
              <span>Report Azienda</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => router.push('/calendario')}
            >
              <Clock className="w-6 h-6 text-purple-500" />
              <span>Calendario</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
