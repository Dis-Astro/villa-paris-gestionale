'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Users, Plus, Search, Edit, Trash2, Download,
  Mail, Phone, MapPin, Calendar, X, Save
} from 'lucide-react'

interface Cliente {
  id: number
  nome: string
  cognome?: string
  email?: string
  telefono?: string
  telefonoAlt?: string
  indirizzo?: string
  cap?: string
  citta?: string
  dataNascita?: string
  codiceFiscale?: string
  tipoCliente?: string
  canalePrimoContatto?: string
  dataPrimoContatto?: string
  notaAnagrafica?: string
  isSpam?: boolean
  spamReason?: string
  spamMarkedAt?: string
  statsPreEvento?: {
    totaleAppuntamenti: number
    tempoTotaleDedicatoMin: number
    totaleInterazioni: number
  }
  eventi: { id: number }[]
}

const TIPI_CLIENTE = ['sposa', 'sposo', 'festeggiato', 'azienda', 'altro']
const CANALI = [
  { value: 'telefono',        label: 'Telefono',        icon: '📞' },
  { value: 'email',           label: 'Mail',            icon: '📧' },
  { value: 'matrimonio.com',  label: 'Matrimonio.com',  icon: '💒' },
  { value: 'social',          label: 'Social',          icon: '📱' },
  { value: 'passaparola',     label: 'Passaparola',     icon: '🗣️' },
  { value: 'altro',           label: 'Altro',           icon: '•'  },
]

const vuotoCliente = (): Omit<Cliente, 'id' | 'eventi'> => ({
  nome: '', cognome: '', email: '', telefono: '', telefonoAlt: '',
  indirizzo: '', cap: '', citta: '', dataNascita: '', codiceFiscale: '',
  tipoCliente: '', canalePrimoContatto: '', dataPrimoContatto: new Date().toISOString().slice(0, 10),
  notaAnagrafica: '',
  isSpam: false,
  spamReason: ''
})

const toDateInputValue = (value?: string) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function ClienteForm({
  cliente, onSave, onClose
}: {
  cliente: Partial<Cliente> | null,
  onSave: () => void,
  onClose: () => void
}) {
  const isNew = !cliente?.id
  const [form, setForm] = useState<Omit<Cliente, 'id' | 'eventi'>>(
    cliente
      ? {
          ...vuotoCliente(),
          ...cliente,
          dataNascita: toDateInputValue(cliente.dataNascita),
          dataPrimoContatto: toDateInputValue(cliente.dataPrimoContatto)
        }
      : vuotoCliente()
  )
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({
      ...f,
      [k]: e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : e.target.value
    }))

  const salva = async () => {
    if (!form.nome.trim()) { setErrore('Il nome è obbligatorio'); return }
    setSaving(true)
    setErrore('')
    try {
      const url = isNew ? '/api/clienti' : `/api/clienti?id=${cliente!.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        onSave()
      } else {
        const err = await res.text()
        setErrore(err || 'Errore nel salvataggio')
      }
    } catch {
      setErrore('Errore di connessione')
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, k, type = 'text', required = false }: { label: string, k: keyof typeof form, type?: string, required?: boolean }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <Input
        type={type}
        value={(form[k] as string) || ''}
        onChange={set(k)}
        className="text-sm"
      />
    </div>
  )

  const Select = ({ label, k, options }: { label: string, k: keyof typeof form, options: string[] }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={(form[k] as string) || ''}
        onChange={set(k)}
        className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-amber-400"
      >
        <option value="">— Seleziona —</option>
        {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto" data-testid="modal-cliente">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {isNew ? 'Nuovo Cliente' : `Modifica — ${cliente!.nome} ${cliente!.cognome || ''}`}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Dati anagrafici principali */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Dati Anagrafici</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome" k="nome" required />
              <Field label="Cognome" k="cognome" />
              <Field label="Telefono" k="telefono" />
              <Field label="Telefono Alternativo" k="telefonoAlt" />
              <div className="col-span-2">
                <Field label="Email" k="email" type="email" />
              </div>
              <div className="col-span-2">
                <Field label="Indirizzo" k="indirizzo" />
              </div>
              <Field label="CAP" k="cap" />
              <Field label="Citta" k="citta" />
              <Field label="Codice Fiscale" k="codiceFiscale" />
              <Field label="Data di Nascita" k="dataNascita" type="date" />
            </div>
          </section>

          {/* Classificazione commerciale */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Classificazione</h3>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Tipo Cliente" k="tipoCliente" options={TIPI_CLIENTE} />
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Canale di contatto
                </label>
                <div className="flex flex-wrap gap-2">
                  {CANALI.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, canalePrimoContatto: f.canalePrimoContatto === c.value ? '' : c.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                        form.canalePrimoContatto === c.value
                          ? 'border-amber-500 bg-amber-500 text-white shadow-sm scale-105'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                      data-testid={`canale-btn-${c.value}`}
                    >
                      <span>{c.icon}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <Field label="Data Primo Contatto" k="dataPrimoContatto" type="date" />
              </div>
              <div className="col-span-2 border rounded-lg p-3 bg-red-50" data-testid="cliente-spam-section">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-red-700">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isSpam)}
                    onChange={set('isSpam' as any)}
                    data-testid="cliente-is-spam-checkbox"
                  />
                  Segna contatto come SPAM
                </label>
                {form.isSpam && (
                  <div className="mt-2">
                    <Field label="Motivo SPAM" k={('spamReason' as keyof typeof form)} />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Note */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Note</h3>
            <textarea
              value={form.notaAnagrafica || ''}
              onChange={e => setForm(f => ({ ...f, notaAnagrafica: e.target.value }))}
              className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-amber-400 resize-none"
              rows={3}
              placeholder="Informazioni aggiuntive, preferenze, ecc."
            />
          </section>

          {errore && (
            <div className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm">{errore}</div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button
            onClick={salva}
            disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-600"
            data-testid="salva-cliente-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvataggio...' : (isNew ? 'Crea Cliente' : 'Salva Modifiche')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ClientiPage() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [filtrati, setFiltrati] = useState<Cliente[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [mostraForm, setMostraForm] = useState(false)
  const [clienteEdit, setClienteEdit] = useState<Cliente | null>(null)

  const fetchClienti = useCallback(async () => {
    try {
      const res = await fetch('/api/clienti')
      if (res.ok) {
        const data = await res.json()
        setClienti(data)
        setFiltrati(data)
      }
    } catch { /* ignora */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClienti() }, [fetchClienti])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltrati(
      q ? clienti.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        (c.cognome ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.telefono ?? '').includes(q) ||
        (c.citta ?? '').toLowerCase().includes(q)
      ) : clienti
    )
  }, [search, clienti])

  const handleSave = () => {
    setMostraForm(false)
    setClienteEdit(null)
    fetchClienti()
  }

  const elimina = async (id: number) => {
    if (!confirm('Eliminare questo cliente?')) return
    await fetch(`/api/clienti?id=${id}`, { method: 'DELETE' })
    fetchClienti()
  }

  const esportaExcel = () => {
    const headers = [
      'Nome', 'Cognome', 'Tipo', 'Telefono', 'Tel.Alt', 'Email',
      'Indirizzo', 'CAP', 'Citta', 'CF',
      'Canale Contatto', 'Data 1 Contatto',
      'N Eventi', 'Note'
    ]
    const rows = filtrati.map(c => [
      c.nome, c.cognome ?? '', c.tipoCliente ?? '',
      c.telefono ?? '', c.telefonoAlt ?? '', c.email ?? '',
      c.indirizzo ?? '', c.cap ?? '', c.citta ?? '', c.codiceFiscale ?? '',
      c.canalePrimoContatto ?? '',
      c.dataPrimoContatto ? new Date(c.dataPrimoContatto).toLocaleDateString('it-IT') : '',
      c.eventi.length.toString(), c.notaAnagrafica ?? ''
    ])
    let csv = '\uFEFF' + headers.join(';') + '\r\n'
    rows.forEach(r => { csv += r.map(v => `"${v}"`).join(';') + '\r\n' })
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'clienti.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-amber-500" />
            Anagrafica Clienti
          </h1>
          <p className="text-gray-500">{filtrati.length} clienti</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={esportaExcel} data-testid="esporta-clienti-btn">
            <Download className="w-4 h-4 mr-2" />
            Esporta CSV
          </Button>
          <Button
            onClick={() => { setClienteEdit(null); setMostraForm(true) }}
            className="bg-amber-500 hover:bg-amber-600"
            data-testid="nuovo-cliente-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Cliente
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cerca per nome, email, telefono, citta..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
              data-testid="cerca-cliente-input"
            />
          </div>
        </CardContent>
      </Card>

      {filtrati.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nessun cliente trovato</p>
            <Button
              onClick={() => { setClienteEdit(null); setMostraForm(true) }}
              className="mt-4 bg-amber-500 hover:bg-amber-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi il primo cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtrati.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow" data-testid={`cliente-card-${c.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold">
                        {c.nome.charAt(0)}{c.cognome?.charAt(0) || ''}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {c.nome} {c.cognome}
                      </h3>
                      <div className="flex items-center gap-2">
                        {c.tipoCliente && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full capitalize">
                            {c.tipoCliente}
                          </span>
                        )}
                    <span className="text-xs text-gray-400">{c.eventi.length} eventi</span>
                    {c.statsPreEvento && (
                      <span className="text-xs text-violet-500">· {c.statsPreEvento.totaleAppuntamenti} appunt.</span>
                    )}
                    {c.isSpam && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">SPAM</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon"
                      className="w-8 h-8"
                      onClick={() => { setClienteEdit(c); setMostraForm(true) }}
                      data-testid={`modifica-cliente-${c.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="w-8 h-8 text-red-400 hover:text-red-600"
                      onClick={() => elimina(c.id)}
                      data-testid={`elimina-cliente-${c.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {c.telefono && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <a href={`tel:${c.telefono}`} className="hover:text-amber-600 truncate">{c.telefono}</a>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <a href={`mailto:${c.email}`} className="hover:text-amber-600 truncate">{c.email}</a>
                    </div>
                  )}
                  {(c.citta || c.indirizzo) && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{[c.indirizzo, c.citta].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {c.dataPrimoContatto && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>1 contatto: {new Date(c.dataPrimoContatto).toLocaleDateString('it-IT')}</span>
                    </div>
                  )}
                  {c.canalePrimoContatto && (
                    <div className="text-xs text-gray-400 ml-5 capitalize">
                      {CANALI.find(k => k.value === c.canalePrimoContatto)?.icon || ''} {CANALI.find(k => k.value === c.canalePrimoContatto)?.label || c.canalePrimoContatto}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {mostraForm && (
        <ClienteForm
          cliente={clienteEdit}
          onSave={handleSave}
          onClose={() => { setMostraForm(false); setClienteEdit(null) }}
        />
      )}
    </div>
  )
}
