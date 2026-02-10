'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Download, 
  Printer,
  Mail,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react'

interface Cliente {
  id: number
  nome: string
  cognome?: string
  email?: string
  telefono?: string
  indirizzo?: string
  eventi: { id: number }[]
}

export default function ClientiPage() {
  const router = useRouter()
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [filteredClienti, setFilteredClienti] = useState<Cliente[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClienti = async () => {
      try {
        const res = await fetch('/api/clienti')
        const data = await res.json()
        setClienti(data)
        setFilteredClienti(data)
      } catch (error) {
        console.error('Errore nel caricamento clienti:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchClienti()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      setFilteredClienti(clienti.filter(c => 
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cognome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    } else {
      setFilteredClienti(clienti)
    }
  }, [searchTerm, clienti])

  const stampa = () => {
    window.print()
  }

  const esportaExcel = () => {
    const headers = ['Nome', 'Cognome', 'Email', 'Telefono', 'Indirizzo', 'Eventi']
    const rows = clienti.map(c => [
      c.nome,
      c.cognome ?? '',
      c.email ?? '',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="clienti-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-amber-500" />
            Anagrafica Clienti
          </h1>
          <p className="text-gray-500">{filteredClienti.length} clienti totali</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={stampa}>
            <Printer className="w-4 h-4 mr-2" />
            Stampa
          </Button>
          <Button variant="outline" onClick={esportaExcel}>
            <Download className="w-4 h-4 mr-2" />
            Esporta Excel
          </Button>
        </div>
      </div>

      {/* Ricerca */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cerca cliente per nome, cognome o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista Clienti */}
      {filteredClienti.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nessun cliente trovato</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClienti.map((cliente) => (
            <Card 
              key={cliente.id}
              className="hover:shadow-md transition-shadow"
              data-testid={`cliente-card-${cliente.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">
                        {cliente.nome.charAt(0)}{cliente.cognome?.charAt(0) || ''}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {cliente.nome} {cliente.cognome}
                      </h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {cliente.eventi.length} eventi
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  {cliente.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${cliente.email}`} className="hover:text-amber-600">
                        {cliente.email}
                      </a>
                    </div>
                  )}
                  {cliente.telefono && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${cliente.telefono}`} className="hover:text-amber-600">
                        {cliente.telefono}
                      </a>
                    </div>
                  )}
                  {cliente.indirizzo && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {cliente.indirizzo}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/eventi?clienteId=${cliente.id}`)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Eventi
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/clienti/${cliente.id}`)}
                  >
                    <Edit className="w-4 h-4" />
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
