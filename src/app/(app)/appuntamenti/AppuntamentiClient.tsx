'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Plus, Save, Search, UserRound, ArrowRight } from 'lucide-react'

type Appuntamento = any

const ESITI = ['da_fare', 'svolto', 'positivo', 'negativo', 'rinviato', 'annullato']
const FUNNEL = ['nuovo_contatto', 'in_trattativa', 'opzionata', 'confermato', 'perso', 'spam']

function toInputDateTime(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AppuntamentiClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusId = searchParams.get('id')

  const [list, setList] = useState<Appuntamento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState<any>(null)
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [newForm, setNewForm] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    dataAppuntamento: '',
    durataMinuti: '60',
    canalePrimoContatto: '',
    noteColloquio: '',
    riassuntoColloquio: ''
  })

  const fetchAppuntamenti = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/appuntamenti')
      const data = await res.json()
      const items = Array.isArray(data) ? data : []
      setList(items)

      const preferredId = focusId ? Number(focusId) : items[0]?.id
      if (preferredId) {
        setSelectedId(preferredId)
      }
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppuntamenti()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedId) {
        setForm(null)
        return
      }
      const res = await fetch(`/api/appuntamenti?id=${selectedId}`)
      const data = await res.json()
      setForm({
        ...data,
        dataAppuntamento: toInputDateTime(data.dataAppuntamento)
      })
    }
    loadDetail()
  }, [selectedId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) => {
      const nome = `${a.clientePrincipale?.nome || ''} ${a.clientePrincipale?.cognome || ''}`.toLowerCase()
      const titolo = `${a.riassuntoColloquio || ''} ${a.noteColloquio || ''}`.toLowerCase()
      return nome.includes(q) || titolo.includes(q)
    })
  }, [list, search])

  const addDateOption = () => {
    const value = prompt('Inserisci data opzionata (YYYY-MM-DD)')
    if (!value) return
    setForm((prev: any) => ({
      ...prev,
      dateOpzionate: Array.from(new Set([...(prev?.dateOpzionate || []), value]))
    }))
  }

  const removeDateOption = (date: string) => {
    setForm((prev: any) => ({
      ...prev,
      dateOpzionate: (prev?.dateOpzionate || []).filter((d: string) => d !== date)
    }))
  }

  const saveSelected = async () => {
    if (!form?.id) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/appuntamenti?id=${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataAppuntamento: form.dataAppuntamento,
          durataMinuti: Number(form.durataMinuti || 0),
          esito: form.esito,
          riassuntoColloquio: form.riassuntoColloquio,
          noteColloquio: form.noteColloquio,
          statoFunnel: form.statoFunnel,
          datiMancanti: form.datiMancanti,
          dateOpzionate: form.dateOpzionate || [],
          statoOpzione: form.statoOpzione
        })
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus('✅ Appuntamento aggiornato')
      await fetchAppuntamenti()
    } catch (e: any) {
      setStatus(`❌ ${e.message || 'Errore salvataggio appuntamento'}`)
    } finally {
      setIsSaving(false)
      setTimeout(() => setStatus(''), 2500)
    }
  }

  const createQuick = async () => {
    if (!newForm.nome.trim() || !newForm.dataAppuntamento) {
      setStatus('⚠️ Inserisci nome cliente e data appuntamento')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/appuntamenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataAppuntamento: newForm.dataAppuntamento,
          durataMinuti: Number(newForm.durataMinuti || 0),
          canalePrimoContatto: newForm.canalePrimoContatto || null,
          noteColloquio: newForm.noteColloquio || null,
          riassuntoColloquio: newForm.riassuntoColloquio || null,
          statoFunnel: 'in_trattativa',
          clienti: [{
            nome: newForm.nome,
            cognome: newForm.cognome,
            email: newForm.email,
            telefono: newForm.telefono,
            ruolo: 'principale'
          }]
        })
      })
      if (!res.ok) throw new Error(await res.text())
      const created = await res.json()
      setNewForm({ nome: '', cognome: '', email: '', telefono: '', dataAppuntamento: '', durataMinuti: '60', canalePrimoContatto: '', noteColloquio: '', riassuntoColloquio: '' })
      setStatus('✅ Appuntamento creato')
      await fetchAppuntamenti()
      setSelectedId(created.id)
    } catch (e: any) {
      setStatus(`❌ ${e.message || 'Errore creazione appuntamento'}`)
    } finally {
      setIsSaving(false)
      setTimeout(() => setStatus(''), 2500)
    }
  }

  return (
    <div className="space-y-6" data-testid="appuntamenti-page">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheda Appuntamenti</h1>
          <p className="text-sm text-gray-500">Centro operativo pre-evento: colloquio, esito, date opzionate e funnel.</p>
        </div>
      </div>

      <Card data-testid="quick-create-appuntamento-card">
        <CardHeader><CardTitle className="text-base">Nuovo Appuntamento</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Nome*" value={newForm.nome} onChange={(e) => setNewForm((p) => ({ ...p, nome: e.target.value }))} data-testid="new-app-nome" />
          <Input placeholder="Cognome" value={newForm.cognome} onChange={(e) => setNewForm((p) => ({ ...p, cognome: e.target.value }))} data-testid="new-app-cognome" />
          <Input placeholder="Telefono" value={newForm.telefono} onChange={(e) => setNewForm((p) => ({ ...p, telefono: e.target.value }))} data-testid="new-app-telefono" />
          <Input type="datetime-local" value={newForm.dataAppuntamento} onChange={(e) => setNewForm((p) => ({ ...p, dataAppuntamento: e.target.value }))} data-testid="new-app-data" />
          <Input placeholder="Email" value={newForm.email} onChange={(e) => setNewForm((p) => ({ ...p, email: e.target.value }))} data-testid="new-app-email" />
          <Input placeholder="Canale (telefono/mail/whatsapp...)" value={newForm.canalePrimoContatto} onChange={(e) => setNewForm((p) => ({ ...p, canalePrimoContatto: e.target.value }))} data-testid="new-app-canale" />
          <Input type="number" placeholder="Durata minuti" value={newForm.durataMinuti} onChange={(e) => setNewForm((p) => ({ ...p, durataMinuti: e.target.value }))} data-testid="new-app-durata" />
          <Button onClick={createQuick} disabled={isSaving} data-testid="new-app-submit-btn">
            <Plus className="w-4 h-4 mr-2" /> Crea
          </Button>
          <div className="md:col-span-2">
            <Textarea placeholder="Riassunto colloquio" value={newForm.riassuntoColloquio} onChange={(e) => setNewForm((p) => ({ ...p, riassuntoColloquio: e.target.value }))} data-testid="new-app-riassunto" />
          </div>
          <div className="md:col-span-2">
            <Textarea placeholder="Note appuntamento" value={newForm.noteColloquio} onChange={(e) => setNewForm((p) => ({ ...p, noteColloquio: e.target.value }))} data-testid="new-app-note" />
          </div>
        </CardContent>
      </Card>

      {status && <div className="text-sm px-3 py-2 rounded bg-amber-50 text-amber-700" data-testid="app-status">{status}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1" data-testid="appuntamenti-list-card">
          <CardHeader>
            <CardTitle className="text-base">Appuntamenti</CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input className="pl-9" placeholder="Cerca cliente o note..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="search-app-input" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[68vh] overflow-y-auto">
            {loading ? <p className="text-sm text-gray-500">Caricamento...</p> : filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedId(a.id)}
                className={`w-full text-left border rounded-lg p-3 ${selectedId === a.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white'}`}
                data-testid={`app-item-${a.id}`}
              >
                <p className="text-sm font-semibold text-gray-800 truncate">{a.clientePrincipale?.nome} {a.clientePrincipale?.cognome || ''}</p>
                <p className="text-xs text-gray-500">{new Date(a.dataAppuntamento).toLocaleString('it-IT')}</p>
                <p className="text-xs text-gray-500">Funnel: {a.statoFunnel || 'in_trattativa'}</p>
              </button>
            ))}
            {!loading && filtered.length === 0 && <p className="text-sm text-gray-500">Nessun appuntamento</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="appuntamento-detail-card">
          <CardHeader>
            <CardTitle className="text-base">Dettaglio Appuntamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!form ? (
              <p className="text-sm text-gray-500">Seleziona un appuntamento dalla lista.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg bg-gray-50" data-testid="cliente-kpi-box">
                    <p className="text-xs text-gray-500">Cliente principale</p>
                    <p className="font-semibold text-gray-800 flex items-center gap-2"><UserRound className="w-4 h-4" />{form.clientePrincipale?.nome} {form.clientePrincipale?.cognome || ''}</p>
                    <p className="text-xs text-gray-500 mt-1">Appuntamenti totali: {form.statsCliente?.totaleAppuntamenti || 0}</p>
                    <p className="text-xs text-gray-500">Tempo totale dedicato: {form.statsCliente?.tempoTotaleDedicatoMin || 0} min</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-gray-50" data-testid="appointment-kpi-box">
                    <p className="text-xs text-gray-500">Progressivo</p>
                    <p className="font-semibold text-gray-800">#{form.numeroProgressivo || '-'}</p>
                    <p className="text-xs text-gray-500 mt-1">Stato opzione: {form.statoOpzione || 'nessuna'}</p>
                    <p className="text-xs text-gray-500">Scadenza: {form.dataScadenzaOpzione ? new Date(form.dataScadenzaOpzione).toLocaleDateString('it-IT') : '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Data appuntamento</label>
                    <Input type="datetime-local" value={form.dataAppuntamento || ''} onChange={(e) => setForm((p: any) => ({ ...p, dataAppuntamento: e.target.value }))} data-testid="app-detail-data" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Durata (min)</label>
                    <Input type="number" value={form.durataMinuti || 0} onChange={(e) => setForm((p: any) => ({ ...p, durataMinuti: e.target.value }))} data-testid="app-detail-durata" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Esito</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.esito || ''} onChange={(e) => setForm((p: any) => ({ ...p, esito: e.target.value }))} data-testid="app-detail-esito">
                      <option value="">--</option>
                      {ESITI.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Stato funnel</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.statoFunnel || 'in_trattativa'} onChange={(e) => setForm((p: any) => ({ ...p, statoFunnel: e.target.value }))} data-testid="app-detail-funnel">
                      {FUNNEL.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Dati mancanti da completare</label>
                    <Input value={form.datiMancanti || ''} onChange={(e) => setForm((p: any) => ({ ...p, datiMancanti: e.target.value }))} data-testid="app-detail-missing" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Riassunto colloquio</label>
                  <Textarea rows={2} value={form.riassuntoColloquio || ''} onChange={(e) => setForm((p: any) => ({ ...p, riassuntoColloquio: e.target.value }))} data-testid="app-detail-summary" />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Note appuntamento</label>
                  <Textarea rows={3} value={form.noteColloquio || ''} onChange={(e) => setForm((p: any) => ({ ...p, noteColloquio: e.target.value }))} data-testid="app-detail-notes" />
                </div>

                <div className="border rounded-lg p-3" data-testid="app-date-options-box">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2"><Calendar className="w-4 h-4" />Date opzionate</p>
                    <Button variant="outline" size="sm" onClick={addDateOption} data-testid="app-add-date-option-btn">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Aggiungi
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(form.dateOpzionate || []).map((d: string) => (
                      <span key={d} className="inline-flex items-center gap-2 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs" data-testid={`app-date-option-${d}`}>
                        {d}
                        <button type="button" onClick={() => removeDateOption(d)} className="text-red-600">✕</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={saveSelected} disabled={isSaving} data-testid="app-save-btn">
                    <Save className="w-4 h-4 mr-2" /> Salva appuntamento
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/nuovo-evento?appuntamentoId=${form.id}`)}
                    data-testid="app-convert-to-event-btn"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" /> Crea evento da appuntamento
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-red-600"
                    onClick={async () => {
                      if (!confirm('Eliminare appuntamento?')) return
                      await fetch(`/api/appuntamenti?id=${form.id}`, { method: 'DELETE' })
                      setSelectedId(null)
                      await fetchAppuntamenti()
                    }}
                    data-testid="app-delete-btn"
                  >
                    Elimina
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
