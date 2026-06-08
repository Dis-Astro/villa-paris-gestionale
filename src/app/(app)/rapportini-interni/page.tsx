'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { PresenzaVillaItem } from '@/lib/presenze-villa-pdf'
import { Calendar, CloudSun, FileText, Plus, Users, UserCheck } from 'lucide-react'

type Role = 'ADMIN' | 'REPORT' | 'WORKER'
type Suggerimento = { nome: string; cognome: string; azienda: string; count: number }

const TODAY = new Date().toISOString().slice(0, 10)

export default function RapportiniInterniPage() {
  const [role, setRole] = useState<Role | null>(null)
  const [mode, setMode] = useState<'day' | 'week'>('day')
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [items, setItems] = useState<PresenzaVillaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [meteo, setMeteo] = useState<string | null>(null)
  const [meteoLoading, setMeteoLoading] = useState(false)
  const [suggerimenti, setSuggerimenti] = useState<Suggerimento[]>([])
  const [showSuggerimenti, setShowSuggerimenti] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    cognome: '',
    azienda: '',
    orarioIngresso: '',
    orarioUscita: '',
    motivoVisita: '',
    mansioneSvolta: '',
    note: ''
  })

  const loadMe = async () => {
    const res = await fetch('/api/auth/me')
    if (!res.ok) return
    const data = await res.json()
    setRole(data.role)
    if (data.role === 'WORKER') setMode('day')
  }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ date: selectedDate, mode }).toString()
      const res = await fetch(`/api/presenze-villa?${query}`)
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMeteo = async (date: string) => {
    setMeteoLoading(true)
    try {
      const res = await fetch(`/api/meteo?date=${date}`)
      if (res.ok) {
        const data = await res.json()
        setMeteo(data.meteoString || null)
      } else {
        setMeteo(null)
      }
    } catch {
      setMeteo(null)
    } finally {
      setMeteoLoading(false)
    }
  }

  const fetchSuggerimenti = async () => {
    try {
      const res = await fetch('/api/presenze-villa/suggerimenti')
      if (res.ok) {
        const data = await res.json()
        setSuggerimenti(Array.isArray(data.visitatori) ? data.visitatori : [])
      }
    } catch {
      setSuggerimenti([])
    }
  }

  useEffect(() => {
    loadMe()
    fetchSuggerimenti()
  }, [])

  useEffect(() => {
    fetchItems()
    fetchMeteo(selectedDate)
  }, [selectedDate, mode])

  const applySuggerimento = (s: Suggerimento) => {
    setForm(prev => ({ ...prev, nome: s.nome, cognome: s.cognome, azienda: s.azienda }))
    setShowSuggerimenti(false)
  }

  const submit = async () => {
    setSaving(true)
    setStatus('')
    try {
      const res = await fetch('/api/presenze-villa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dataRiferimento: selectedDate, meteo: meteo || undefined })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore salvataggio')
      setForm({ nome: '', cognome: '', azienda: '', orarioIngresso: '', orarioUscita: '', motivoVisita: '', mansioneSvolta: '', note: '' })
      setStatus('Presenza registrata con successo')
      await fetchItems()
      await fetchSuggerimenti()
    } catch (error: any) {
      setStatus(`Errore: ${error.message || 'Errore registrazione presenza'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPdf = async () => {
    const { downloadPresenzeVillaPdf } = await import('@/lib/presenze-villa-pdf')
    downloadPresenzeVillaPdf({ mode, selectedDate, items })
  }

  const title = useMemo(() => (
    mode === 'week'
      ? 'Report settimanale presenze Villa'
      : 'Rapportino giornaliero presenze Villa'
  ), [mode])

  return (
    <div className="space-y-6" data-testid="rapportini-interni-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" data-testid="rapportini-title">Rapportini Interni</h1>
          <p className="text-sm text-gray-500" data-testid="rapportini-description">Registro presenze in Villa con apertura giornaliera automatica sulla data corrente.</p>
        </div>
        {role && role !== 'WORKER' && (
          <Button type="button" onClick={handleDownloadPdf} data-testid="rapportini-export-pdf-button">
            <FileText className="w-4 h-4 mr-2" /> Stampa / PDF
          </Button>
        )}
      </div>

      <Card data-testid="rapportini-toolbar-card">
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Data</label>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} data-testid="rapportini-date-input" />
          </div>
          {role && role !== 'WORKER' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Vista</label>
              <select className="border rounded px-3 py-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value as 'day' | 'week')} data-testid="rapportini-mode-select">
                <option value="day">Giornaliera</option>
                <option value="week">Settimanale</option>
              </select>
            </div>
          )}
          {/* Meteo del giorno */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50 text-sm" data-testid="rapportini-meteo-box">
            <CloudSun className="w-4 h-4 text-blue-500 flex-shrink-0" />
            {meteoLoading ? (
              <span className="text-gray-500">Caricamento meteo...</span>
            ) : meteo ? (
              <span className="text-blue-800 font-medium" data-testid="rapportini-meteo-text">{meteo}</span>
            ) : (
              <span className="text-gray-500">Meteo non disponibile</span>
            )}
          </div>
        </CardContent>
      </Card>

      {status && (
        <div className={`rounded px-3 py-2 text-sm ${status.startsWith('Errore') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`} data-testid="rapportini-status">
          {status}
        </div>
      )}

      {role && role !== 'REPORT' && (
        <Card data-testid="rapportini-form-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nuova presenza in Villa</CardTitle>
              {suggerimenti.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSuggerimenti(!showSuggerimenti)}
                  data-testid="rapportini-toggle-suggerimenti-btn"
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  Visitatori frequenti ({suggerimenti.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Quick-fill suggerimenti */}
            {showSuggerimenti && suggerimenti.length > 0 && (
              <div className="border rounded-lg p-3 bg-amber-50 space-y-2" data-testid="rapportini-suggerimenti-panel">
                <p className="text-xs text-amber-700 font-medium">Clicca per compilare automaticamente nome, cognome e azienda:</p>
                <div className="flex flex-wrap gap-2">
                  {suggerimenti.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applySuggerimento(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-amber-300 bg-white hover:bg-amber-100 transition-colors"
                      data-testid={`suggerimento-btn-${i}`}
                    >
                      <span className="font-medium">{s.nome} {s.cognome}</span>
                      <span className="text-gray-500 ml-1">({s.azienda})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} data-testid="rapportini-nome-input" />
              <Input placeholder="Cognome" value={form.cognome} onChange={(e) => setForm((p) => ({ ...p, cognome: e.target.value }))} data-testid="rapportini-cognome-input" />
              <Input placeholder="Azienda" value={form.azienda} onChange={(e) => setForm((p) => ({ ...p, azienda: e.target.value }))} data-testid="rapportini-azienda-input" />
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-600" data-testid="rapportini-data-preview">Data: {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('it-IT')}</div>
              <Input type="time" value={form.orarioIngresso} onChange={(e) => setForm((p) => ({ ...p, orarioIngresso: e.target.value }))} data-testid="rapportini-ingresso-input" />
              <Input type="time" value={form.orarioUscita} onChange={(e) => setForm((p) => ({ ...p, orarioUscita: e.target.value }))} data-testid="rapportini-uscita-input" />
              <Input placeholder="Motivo visita" value={form.motivoVisita} onChange={(e) => setForm((p) => ({ ...p, motivoVisita: e.target.value }))} data-testid="rapportini-motivo-input" />
              <Input placeholder="Mansione svolta" value={form.mansioneSvolta} onChange={(e) => setForm((p) => ({ ...p, mansioneSvolta: e.target.value }))} data-testid="rapportini-mansione-input" />
              <div className="md:col-span-3">
                <Textarea placeholder="Note interne (facoltative)" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} data-testid="rapportini-note-input" />
              </div>
              <Button type="button" onClick={submit} disabled={saving} data-testid="rapportini-submit-button">
                <Plus className="w-4 h-4 mr-2" /> {saving ? 'Salvataggio...' : 'Registra presenza'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="rapportini-list-card">
        <CardHeader><CardTitle className="text-base">Presenze registrate</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm" data-testid="rapportini-table">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Cognome</th>
                  <th className="py-2 pr-3">Azienda</th>
                  <th className="py-2 pr-3">Ingresso</th>
                  <th className="py-2 pr-3">Uscita</th>
                  <th className="py-2 pr-3">Motivo</th>
                  <th className="py-2 pr-3">Mansione</th>
                  <th className="py-2 pr-3">Meteo</th>
                  <th className="py-2">Registrato da</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0" data-testid={`rapportini-row-${item.id}`}>
                    <td className="py-3 pr-3">{new Date(item.dataRiferimento).toLocaleDateString('it-IT')}</td>
                    <td className="py-3 pr-3">{item.nome}</td>
                    <td className="py-3 pr-3">{item.cognome}</td>
                    <td className="py-3 pr-3">{item.azienda}</td>
                    <td className="py-3 pr-3">{item.orarioIngresso}</td>
                    <td className="py-3 pr-3">{item.orarioUscita}</td>
                    <td className="py-3 pr-3">{item.motivoVisita}</td>
                    <td className="py-3 pr-3">{item.mansioneSvolta}</td>
                    <td className="py-3 pr-3 text-xs text-blue-600">{(item as any).meteo || '—'}</td>
                    <td className="py-3">{item.createdByUser?.email || '—'}</td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-gray-500" data-testid="rapportini-empty-state">Nessuna presenza registrata per il periodo selezionato.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-gray-500" data-testid="rapportini-loading-state">Caricamento...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg border bg-gray-50 p-4 text-sm text-gray-600" data-testid="rapportini-summary-box">
            <p className="font-medium text-gray-900">Totale presenze nel periodo: {items.length}</p>
            <p className="mt-1 flex items-center gap-2"><Users className="w-4 h-4" /> Worker: inserimento rapido giornaliero · Admin/Report: vista completa e stampa PDF</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
