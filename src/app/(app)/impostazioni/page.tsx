'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Settings, 
  Save, 
  Building, 
  Mail, 
  Phone, 
  MapPin,
  Globe,
  FileText,
  Shield,
  Bell,
  Calendar,
  RefreshCw,
  Unlink,
  Check,
  X,
  AlertTriangle,
  Clock,
  ExternalLink,
  Bot,
  Play,
  Download,
  Archive
} from 'lucide-react'

type GCalChange = {
  id: number
  gcalEventId: string
  tipoRisorsa: string
  risorsaId: number | null
  tipoModifica: string
  dettagli: string | null
  modificatoDa: string | null
  stato: string
  createdAt: string
}

export default function ImpostazioniPage() {
  const [settings, setSettings] = useState({
    azienda: { nome: 'Villa Paris', indirizzo: '', citta: '', cap: '', telefono: '', email: '', website: '', piva: '', cf: '' },
    documenti: { intestazionePDF: 'Villa Paris - Location per Eventi', footerPDF: '© Villa Paris - Tutti i diritti riservati', noteContrattuali: '' },
    notifiche: { emailEvento: true, reminderGiorni: 7 }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [role, setRole] = useState<string | null>(null)

  // Google Calendar state
  const [gcalConnected, setGcalConnected] = useState(false)
  const [gcalConfig, setGcalConfig] = useState<any>(null)
  const [gcalChanges, setGcalChanges] = useState<GCalChange[]>([])
  const [gcalImportReview, setGcalImportReview] = useState<any[]>([])
  const [gcalImportTotal, setGcalImportTotal] = useState(0)
  const [gcalImportReviewTotal, setGcalImportReviewTotal] = useState(0)
  const [rollbackPreview, setRollbackPreview] = useState<any>(null)
  const [rollbackLoading, setRollbackLoading] = useState(false)
  const [gcalLoading, setGcalLoading] = useState(false)
  const [gcalSyncing, setGcalSyncing] = useState(false)
  const [gcalChecking, setGcalChecking] = useState(false)
  const [gcalStatus, setGcalStatus] = useState('')
  const [syncResult, setSyncResult] = useState<any>(null)
  const [syncErrors, setSyncErrors] = useState<string[] | null>(null)
  const [aiConfig, setAiConfig] = useState<any>(null)
  const [aiOperations, setAiOperations] = useState<any[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState('')
  const [historyBefore, setHistoryBefore] = useState(`${new Date().getFullYear()}-01-01`)
  const [historyPreview, setHistoryPreview] = useState<any>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyStatus, setHistoryStatus] = useState('')
  const [aiForm, setAiForm] = useState({
    provider: 'openai',
    model: 'gpt-5.6-terra',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    enabled: false,
    autoApply: false,
    minConfidence: 0.9,
    includePersonalData: false
  })

  // Load settings and role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('villa-paris-settings')
      if (saved) {
        try { setSettings(JSON.parse(saved)) } catch (e) { /* ignore */ }
      }
    }

    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setRole(d.role)
      if (d.role === 'ADMIN') {
        fetchGcalStatus()
        fetchAIStatus()
      }
    }).catch(() => {})

    // Check for gcal callback params
    const params = new URLSearchParams(window.location.search)
    if (params.get('gcal') === 'success') {
      setGcalStatus('Google Calendar connesso con successo!')
      fetchGcalStatus()
      // Clean URL
      window.history.replaceState({}, '', '/impostazioni')
    } else if (params.get('gcal') === 'error') {
      setGcalStatus(`Errore connessione: ${params.get('msg') || 'Sconosciuto'}`)
      window.history.replaceState({}, '', '/impostazioni')
    }
  }, [])

  const fetchGcalStatus = async () => {
    setGcalLoading(true)
    try {
      const res = await fetch('/api/google-calendar/sync')
      if (res.ok) {
        const data = await res.json()
        setGcalConnected(data.connected)
        setGcalConfig(data.config)
        setGcalChanges(data.pendingChanges || [])
        setGcalImportReview(data.imports?.review || [])
        setGcalImportTotal(data.imports?.total || 0)
        setGcalImportReviewTotal(data.imports?.reviewTotal || 0)
      }
    } catch { /* ignore */ } finally {
      setGcalLoading(false)
    }
  }

  const handleGcalConnect = async () => {
    setGcalLoading(true)
    try {
      const res = await fetch('/api/oauth/google-calendar/login')
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setGcalStatus('Errore: URL di autorizzazione non disponibile')
      }
    } catch {
      setGcalStatus('Errore nella connessione a Google')
    } finally {
      setGcalLoading(false)
    }
  }

  const fetchAIStatus = async () => {
    try {
      const res = await fetch('/api/ai/operations')
      if (!res.ok) return
      const data = await res.json()
      setAiConfig(data.config)
      setAiOperations(data.operations || [])
      if (data.config) {
        setAiForm((current) => ({
          ...current,
          provider: data.config.provider || 'openai',
          model: data.config.model || 'gpt-5.6-terra',
          baseUrl: data.config.baseUrl || 'https://api.openai.com/v1',
          enabled: data.config.enabled === true,
          autoApply: data.config.autoApply === true,
          minConfidence: Number(data.config.minConfidence ?? 0.9),
          includePersonalData: data.config.includePersonalData === true
        }))
      }
    } catch { /* ignore */ }
  }

  const handleSaveAI = async () => {
    setAiLoading(true)
    setAiStatus('')
    try {
      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiForm((current) => ({ ...current, apiKey: '' }))
      setAiStatus('Configurazione AI salvata in modo sicuro')
      await fetchAIStatus()
    } catch (error: any) {
      setAiStatus(`Errore: ${error.message || 'salvataggio AI non riuscito'}`)
    } finally {
      setAiLoading(false)
    }
  }

  const handleTestAI = async () => {
    setAiLoading(true)
    setAiStatus('')
    try {
      const res = await fetch('/api/ai/config', { method: 'POST' })
      const data = await res.json()
      setAiStatus(res.ok ? data.message : `Errore: ${data.error}`)
    } catch {
      setAiStatus('Errore: test connessione AI non riuscito')
    } finally {
      setAiLoading(false)
    }
  }

  const handleRollbackPreview = async () => {
    setRollbackLoading(true)
    setGcalStatus('')
    try {
      const res = await fetch('/api/google-calendar/rollback-import')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRollbackPreview(data)
    } catch (error: any) {
      setGcalStatus(`Errore: ${error.message || 'anteprima ripristino non riuscita'}`)
    } finally {
      setRollbackLoading(false)
    }
  }

  const handleRollback = async () => {
    const phrase = window.prompt(
      'Questa operazione rimuove solo i record creati dall’importazione errata. Digita ROLLBACK_GOOGLE_IMPORT per confermare.'
    )
    if (phrase !== 'ROLLBACK_GOOGLE_IMPORT') return
    setRollbackLoading(true)
    try {
      const res = await fetch('/api/google-calendar/rollback-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: phrase })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGcalStatus(
        `Ripristino completato: rimossi ${data.removed.eventi} eventi, ` +
        `${data.removed.appuntamenti} appuntamenti e ${data.removed.clienti} contatti importati`
      )
      setRollbackPreview(null)
      await fetchGcalStatus()
    } catch (error: any) {
      setGcalStatus(`Errore: ${error.message || 'ripristino non riuscito'}`)
    } finally {
      setRollbackLoading(false)
    }
  }

  const handleRunAI = async () => {
    setAiLoading(true)
    setAiStatus('')
    try {
      const res = await fetch('/api/ai/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze_pending', limit: 10 })
      })
      const data = await res.json()
      setAiStatus(res.ok
        ? `Analisi completata: ${data.processed} record, ${data.applied} corretti, ${data.review} da verificare`
        : `Errore: ${data.error}`)
      fetchAIStatus()
      fetchGcalStatus()
    } catch {
      setAiStatus('Errore durante l’analisi AI')
    } finally {
      setAiLoading(false)
    }
  }

  const handleHistoryPreview = async () => {
    setHistoryLoading(true)
    setHistoryStatus('')
    try {
      const res = await fetch(`/api/storico?before=${encodeURIComponent(historyBefore)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHistoryPreview(data)
    } catch (error: any) {
      setHistoryStatus(`Errore: ${error.message || 'anteprima storico non riuscita'}`)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleHistoryArchive = async () => {
    const phrase = window.prompt(
      `Verranno rimossi dal gestionale i record precedenti al ${historyBefore}, dopo aver creato il file storico. Digita ARCHIVIA_STORICO per confermare.`
    )
    if (phrase !== 'ARCHIVIA_STORICO') return
    setHistoryLoading(true)
    setHistoryStatus('')
    try {
      const res = await fetch('/api/storico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ before: historyBefore, confirm: phrase })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHistoryStatus(`Archivio creato: ${data.removed.eventi} eventi e ${data.removed.appuntamenti} appuntamenti alleggeriti`)
      setHistoryPreview(null)
      window.location.href = data.downloadUrl
    } catch (error: any) {
      setHistoryStatus(`Errore: ${error.message || 'archiviazione non riuscita'}`)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleReviewAI = async (operationId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/ai/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, operationId })
      })
      const data = await res.json()
      setAiStatus(res.ok
        ? `Proposta AI ${action === 'approve' ? 'applicata' : 'rifiutata'}`
        : `Errore: ${data.error}`)
      fetchAIStatus()
      fetchGcalStatus()
    } catch {
      setAiStatus('Errore durante la revisione AI')
    }
  }

  const handleGcalDisconnect = async () => {
    if (!confirm('Sei sicuro di voler disconnettere Google Calendar?')) return
    setGcalLoading(true)
    try {
      await fetch('/api/google-calendar/sync', { method: 'DELETE' })
      setGcalConnected(false)
      setGcalConfig(null)
      setGcalChanges([])
      setGcalStatus('Google Calendar disconnesso')
    } catch {
      setGcalStatus('Errore durante la disconnessione')
    } finally {
      setGcalLoading(false)
    }
  }

  const handleSync = async () => {
    setGcalSyncing(true)
    setSyncResult(null)
    setSyncErrors(null)
    setGcalStatus('')
    try {
      const res = await fetch('/api/google-calendar/import?ai=0', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncResult(data)
        setSyncErrors(data.erroriDettaglio || null)
        setGcalStatus(data.errori > 0
          ? `Importazione completata con ${data.errori} errori`
          : 'Importazione delle novità completata!')
        fetchGcalStatus()
      } else {
        setGcalStatus(`Errore: ${data.error}`)
      }
    } catch {
      setGcalStatus('Errore durante la sincronizzazione')
    } finally {
      setGcalSyncing(false)
    }
  }

  const handleCheckChanges = async () => {
    setGcalChecking(true)
    setGcalStatus('')
    try {
      const res = await fetch('/api/google-calendar/check-changes', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setGcalStatus(data.changesDetected > 0
          ? `${data.changesDetected} modifiche rilevate su Google Calendar!`
          : 'Nessuna modifica rilevata su Google Calendar.')
        fetchGcalStatus()
      } else {
        setGcalStatus(`Errore: ${data.error}`)
      }
    } catch {
      setGcalStatus('Errore durante il controllo')
    } finally {
      setGcalChecking(false)
    }
  }

  const handleValidateChange = async (changeId: number, azione: 'accetta' | 'rifiuta') => {
    const labels = { accetta: 'accettare', rifiuta: 'rifiutare e ripristinare' }
    if (!confirm(`Vuoi ${labels[azione]} questa modifica?`)) return
    try {
      const res = await fetch('/api/google-calendar/validate-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId, azione })
      })
      const data = await res.json()
      if (res.ok) {
        setGcalStatus(`Modifica ${azione === 'accetta' ? 'accettata' : 'rifiutata'}`)
        fetchGcalStatus()
      } else {
        setGcalStatus(`Errore: ${data.error}`)
      }
    } catch {
      setGcalStatus('Errore nella validazione')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setStatus('Salvataggio in corso...')
    await new Promise(resolve => setTimeout(resolve, 500))
    if (typeof window !== 'undefined') {
      localStorage.setItem('villa-paris-settings', JSON.stringify(settings))
    }
    setStatus('Impostazioni salvate')
    setIsSaving(false)
    setTimeout(() => setStatus(''), 3000)
  }

  const parseDettagli = (d: string | null) => {
    if (!d) return {}
    try { return JSON.parse(d) } catch { return {} }
  }

  return (
    <div className="space-y-6" data-testid="impostazioni-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-amber-500" />
            Impostazioni
          </h1>
          <p className="text-gray-500">Configura il sistema gestionale</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600" data-testid="save-settings-btn">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvataggio...' : 'Salva Impostazioni'}
        </Button>
      </div>

      {status && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm" data-testid="settings-status">{status}</div>
      )}

      {/* Google Calendar - Solo Admin */}
      {role === 'ADMIN' && (
        <Card className="border-blue-200" data-testid="gcal-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Google Calendar
            </CardTitle>
            <CardDescription>
              Importa automaticamente tutto ciò che viene scritto su Google Calendar e sincronizza le modifiche del gestionale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gcalStatus && (
              <div className={`px-4 py-2 rounded-lg text-sm ${
                gcalStatus.includes('Errore') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
              }`} data-testid="gcal-status">
                {gcalStatus}
              </div>
            )}

            {!gcalConnected ? (
              <div className="text-center py-8 space-y-4" data-testid="gcal-not-connected">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50">
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Google Calendar non connesso</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Collega il tuo account Google per sincronizzare automaticamente eventi e appuntamenti
                  </p>
                </div>
                <Button 
                  onClick={handleGcalConnect}
                  disabled={gcalLoading}
                  className="bg-blue-500 hover:bg-blue-600"
                  data-testid="gcal-connect-btn"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {gcalLoading ? 'Caricamento...' : 'Connetti Google Calendar'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4" data-testid="gcal-connected">
                {/* Connection info */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="font-medium text-green-800">Connesso</p>
                      <p className="text-xs text-green-600">
                        {gcalConfig?.userEmail && `Account: ${gcalConfig.userEmail}`}
                        {gcalConfig?.lastSyncAt && ` | Ultima sync: ${new Date(gcalConfig.lastSyncAt).toLocaleString('it-IT')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGcalConnect}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      data-testid="gcal-reconnect-btn"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> Riconnetti
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGcalDisconnect}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      data-testid="gcal-disconnect-btn"
                    >
                      <Unlink className="w-4 h-4 mr-1" /> Disconnetti
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleSync}
                    disabled={gcalSyncing}
                    className="bg-blue-500 hover:bg-blue-600"
                    data-testid="gcal-sync-btn"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${gcalSyncing ? 'animate-spin' : ''}`} />
                    {gcalSyncing ? 'Importazione novità...' : 'Importa novità da Google'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCheckChanges}
                    disabled={gcalChecking}
                    data-testid="gcal-check-changes-btn"
                  >
                    <AlertTriangle className={`w-4 h-4 mr-2 ${gcalChecking ? 'animate-spin' : ''}`} />
                    {gcalChecking ? 'Controllo...' : 'Controlla modifiche esterne'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRollbackPreview}
                    disabled={rollbackLoading}
                    className="text-amber-700 border-amber-300"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {rollbackLoading ? 'Analisi...' : 'Analizza importazione errata'}
                  </Button>
                </div>

                {rollbackPreview && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
                    <p className="font-medium text-red-900">Anteprima ripristino — nessun dato è stato ancora eliminato</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-red-800 sm:grid-cols-4">
                      <span>Eventi: {rollbackPreview.eventiDaRimuovere}</span>
                      <span>Appuntamenti: {rollbackPreview.appuntamentiDaRimuovere}</span>
                      <span>Contatti: {rollbackPreview.clientiDaRimuovere}</span>
                      <span>Record preservati: {rollbackPreview.preservedLinkedResources}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRollback}
                      disabled={rollbackLoading}
                      className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Conferma ripristino controllato
                    </Button>
                  </div>
                )}

                {/* Sync result */}
                {syncResult && (
                  <div className="p-3 rounded-lg border bg-blue-50 text-sm" data-testid="gcal-sync-result">
                    <p className="font-medium text-blue-800 mb-1">Risultato importazione da Google:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-blue-700">
                      <span>Letti: {syncResult.letti}</span>
                      <span>Nuovi: {syncResult.importati}</span>
                      <span>Aggiornati: {syncResult.aggiornati}</span>
                      <span>Invariati: {syncResult.invariati}</span>
                      <span>Archiviati: {syncResult.registrati}</span>
                      <span>Da verificare: {syncResult.daVerificare}</span>
                      {syncResult.errori > 0 && <span className="text-red-600 col-span-2">Errori: {syncResult.errori}</span>}
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-800">
                  <p className="font-medium">Importazione automatica pronta</p>
                  <p className="mt-1">
                    La prima esecuzione acquisisce l’intero calendario. In seguito vengono lette solo le novità:
                    titolo, date, orari, durata, luogo, note, invitati, contatti e numero di ospiti.
                    Le voci poco chiare vengono comunque registrate e marcate “da verificare”.
                  </p>
                  {gcalImportTotal > 0 && (
                    <p className="mt-2 font-medium">
                      {gcalImportTotal} voci Google acquisite · {gcalImportReviewTotal} da verificare
                    </p>
                  )}
                </div>
                {gcalImportReview.length > 0 && (
                  <div className="space-y-2" data-testid="gcal-import-review-list">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Importazioni da verificare ({gcalImportReviewTotal}; ultime {gcalImportReview.length} mostrate)
                    </h4>
                    {gcalImportReview.map((item) => (
                      <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium capitalize">{item.tipoRisorsa}</span>
                          {item.risorsaId && <span className="text-gray-500">#{item.risorsaId}</span>}
                          <span className="text-xs text-gray-500">
                            affidabilità {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                        <p className="mt-1 text-amber-800">{item.warning}</p>
                      </div>
                    ))}
                  </div>
                )}
                {syncErrors && syncErrors.length > 0 && (
                  <div className="p-3 rounded-lg border bg-red-50 text-sm" data-testid="gcal-sync-errors">
                    <p className="font-medium text-red-800 mb-1">Dettaglio errori:</p>
                    <ul className="list-disc pl-4 text-red-700 space-y-1">
                      {syncErrors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pending changes */}
                {gcalChanges.length > 0 && (
                  <div className="space-y-2" data-testid="gcal-changes-list">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Modifiche esterne da validare ({gcalChanges.length})
                    </h4>
                    {gcalChanges.map((change) => {
                      const det = parseDettagli(change.dettagli)
                      return (
                        <div key={change.id} className="border rounded-lg p-3 bg-amber-50 border-amber-200" data-testid={`gcal-change-${change.id}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  change.tipoModifica === 'cancellato' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {change.tipoModifica === 'cancellato' ? 'CANCELLATO' : 'MODIFICATO'}
                                </span>
                                <span className="text-xs text-gray-500 capitalize">{change.tipoRisorsa}</span>
                                {change.risorsaId && <span className="text-xs text-gray-400">#{change.risorsaId}</span>}
                              </div>
                              <p className="text-sm text-gray-800 mt-1">{det.messaggio || 'Modifica rilevata'}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {new Date(change.createdAt).toLocaleString('it-IT')}
                                {change.modificatoDa && <span> | Da: {change.modificatoDa}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleValidateChange(change.id, 'accetta')}
                                className="text-green-600 border-green-200 hover:bg-green-50 h-8 px-2"
                                data-testid={`gcal-accept-${change.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleValidateChange(change.id, 'rifiuta')}
                                className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-2"
                                data-testid={`gcal-reject-${change.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {role === 'ADMIN' && (
        <Card className="border-slate-200" data-testid="history-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-slate-600" /> Storico leggero
            </CardTitle>
            <CardDescription>
              Scaricare un file non cancella nulla. La rimozione dal database avviene soltanto con il comando separato “Archivia e rimuovi dal DB” e una conferma testuale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs text-gray-600">Archivia record precedenti al</label>
                <Input type="date" value={historyBefore} onChange={(event) => {
                  setHistoryBefore(event.target.value)
                  setHistoryPreview(null)
                }} />
              </div>
              <Button variant="outline" onClick={handleHistoryPreview} disabled={historyLoading}>
                {historyLoading ? 'Analisi...' : 'Calcola anteprima'}
              </Button>
            </div>
            {historyStatus && <p className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">{historyStatus}</p>}
            {historyPreview && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-900">Nessun dato è stato ancora rimosso</p>
                <div className="mt-2 flex flex-wrap gap-4 text-amber-800">
                  <span>Eventi: {historyPreview.eventi}</span>
                  <span>Appuntamenti: {historyPreview.appuntamenti}</span>
                  <span>Voci “ristorante” escluse: {historyPreview.esclusiRistorante}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/storico?before=${encodeURIComponent(historyBefore)}&download=1`}>
                      <Download className="mr-2 h-4 w-4" /> Scarica copia (non cancella)
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleHistoryArchive}
                    disabled={historyLoading || (!historyPreview.eventi && !historyPreview.appuntamenti)}
                    className="bg-amber-700 hover:bg-amber-800"
                  >
                    <Archive className="mr-2 h-4 w-4" /> Archivia e rimuovi dal DB
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {role === 'ADMIN' && (
        <Card className="border-violet-200" data-testid="ai-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-violet-600" />
              Controllore AI
            </CardTitle>
            <CardDescription>
              Solo Administrator: analizza le importazioni, rileva problemi e propone correzioni tracciate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiStatus && (
              <div className={`rounded-lg px-4 py-2 text-sm ${
                aiStatus.startsWith('Errore') ? 'bg-red-50 text-red-700' : 'bg-violet-50 text-violet-800'
              }`}>
                {aiStatus}
              </div>
            )}

            <div className={`rounded-lg border p-4 ${
              aiConfig?.configured ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {aiConfig?.configured ? 'AI connessa e pronta' : 'AI non ancora configurata'}
                  </p>
                  {aiConfig?.configured ? (
                    <p className="text-xs text-gray-600 mt-1">
                      {aiConfig.provider} · {aiConfig.model} ·
                      {aiConfig.autoApply
                        ? ` applicazione automatica da ${Math.round(aiConfig.minConfidence * 100)}%`
                        : ' approvazione Admin richiesta'}
                      {!aiConfig.includePersonalData && ' · dati personali oscurati'}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-800 mt-1">
                      Inserisci qui sotto la chiave API e abilita la connessione.
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleRunAI}
                  disabled={aiLoading || !aiConfig?.configured}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {aiLoading ? 'Analisi in corso...' : 'Analizza dati pendenti'}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-violet-100 p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Provider</label>
                  <Input
                    value={aiForm.provider}
                    onChange={(event) => setAiForm({ ...aiForm, provider: event.target.value })}
                    placeholder="openai"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Modello</label>
                  <Input
                    value={aiForm.model}
                    onChange={(event) => setAiForm({ ...aiForm, model: event.target.value })}
                    placeholder="gpt-5.6-terra"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Indirizzo API</label>
                  <Input
                    value={aiForm.baseUrl}
                    onChange={(event) => setAiForm({ ...aiForm, baseUrl: event.target.value })}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Chiave API {aiConfig?.hasApiKey && '(già salvata; lascia vuoto per mantenerla)'}
                  </label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={aiForm.apiKey}
                    onChange={(event) => setAiForm({ ...aiForm, apiKey: event.target.value })}
                    placeholder={aiConfig?.hasApiKey ? '••••••••••••••••' : 'sk-...'}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Soglia applicazione automatica: {Math.round(aiForm.minConfidence * 100)}%
                  </label>
                  <Input
                    type="number"
                    min="0.5"
                    max="1"
                    step="0.01"
                    value={aiForm.minConfidence}
                    onChange={(event) => setAiForm({ ...aiForm, minConfidence: Number(event.target.value) })}
                  />
                </div>
                <div className="space-y-2 pt-1 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={aiForm.enabled}
                      onChange={(event) => setAiForm({ ...aiForm, enabled: event.target.checked })}
                    />
                    Abilita connessione AI
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={aiForm.autoApply}
                      onChange={(event) => setAiForm({ ...aiForm, autoApply: event.target.checked })}
                    />
                    Applica automaticamente sopra soglia
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={aiForm.includePersonalData}
                      onChange={(event) => setAiForm({ ...aiForm, includePersonalData: event.target.checked })}
                    />
                    Invia all’AI anche email e telefoni
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                La chiave viene cifrata sul server. Per prudenza l’applicazione automatica resta disattivata finché non la abiliti.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveAI} disabled={aiLoading} className="bg-violet-600 hover:bg-violet-700">
                  <Save className="w-4 h-4 mr-2" /> Salva connessione AI
                </Button>
                <Button variant="outline" onClick={handleTestAI} disabled={aiLoading || !aiConfig?.configured}>
                  <Play className="w-4 h-4 mr-2" /> Prova connessione
                </Button>
              </div>
            </div>

            {aiOperations.filter((item) => item.status === 'review').length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Correzioni AI da approvare
                </h4>
                {aiOperations.filter((item) => item.status === 'review').map((item) => (
                  <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {item.sourceType} #{item.sourceId}
                        </p>
                        <p className="text-xs text-gray-500">
                          Affidabilità {Math.round((item.confidence || 0) * 100)}% · {item.model}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleReviewAI(item.id, 'approve')}
                          className="text-green-700 border-green-300">
                          <Check className="w-4 h-4 mr-1" /> Applica
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReviewAI(item.id, 'reject')}
                          className="text-red-700 border-red-300">
                          <X className="w-4 h-4 mr-1" /> Rifiuta
                        </Button>
                      </div>
                    </div>
                    {item.proposedChanges && (
                      <pre className="mt-2 overflow-x-auto rounded bg-white/70 p-2 text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(JSON.parse(item.proposedChanges), null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}

            {aiOperations.some((item) => item.status === 'failed') && (
              <p className="text-xs text-red-700">
                Alcune analisi sono fallite: il dettaglio è conservato nel registro AI e può essere rieseguito.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dati Azienda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5" /> Dati Azienda</CardTitle>
          <CardDescription>Informazioni aziendali per fatturazione e documenti</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Azienda</label>
              <Input value={settings.azienda.nome} onChange={(e) => setSettings({ ...settings, azienda: { ...settings.azienda, nome: e.target.value } })} placeholder="Villa Paris" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
              <Input value={settings.azienda.piva} onChange={(e) => setSettings({ ...settings, azienda: { ...settings.azienda, piva: e.target.value } })} placeholder="IT12345678901" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><MapPin className="w-4 h-4 inline mr-1" />Indirizzo</label>
            <Input value={settings.azienda.indirizzo} onChange={(e) => setSettings({ ...settings, azienda: { ...settings.azienda, indirizzo: e.target.value } })} placeholder="Via Roma 123" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Citta</label>
              <Input value={settings.azienda.citta} onChange={(e) => setSettings({ ...settings, azienda: { ...settings.azienda, citta: e.target.value } })} placeholder="Roma" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
              <Input value={settings.azienda.cap} onChange={(e) => setSettings({ ...settings, azienda: { ...settings.azienda, cap: e.target.value } })} placeholder="00100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
              <Input value={settings.azienda.cf} onChange={(e) => setSettings({ ...settings, azienda: { ...settings.azienda, cf: e.target.value } })} placeholder="ABCDEF12G34H567I" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><Phone className="w-4 h-4 inline mr-1" />Telefono</label>
              <Input value={settings.azienda.telefono} onChange={(e) => setSettings({ ...settings, azienda: { ...settings.azienda, telefono: e.target.value } })} placeholder="+39 06 12345678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><Mail className="w-4 h-4 inline mr-1" />Email</label>
              <Input type="email" value={settings.azienda.email} onChange={(e) => setSettings({ ...settings, azienda: { ...settings.azienda, email: e.target.value } })} placeholder="info@villaparis.it" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><Globe className="w-4 h-4 inline mr-1" />Sito Web</label>
              <Input value={settings.azienda.website} onChange={(e) => setSettings({ ...settings, azienda: { ...settings.azienda, website: e.target.value } })} placeholder="www.villaparis.it" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documenti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Documenti PDF</CardTitle>
          <CardDescription>Personalizza l'aspetto dei documenti generati</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intestazione PDF</label>
            <Input value={settings.documenti.intestazionePDF} onChange={(e) => setSettings({ ...settings, documenti: { ...settings.documenti, intestazionePDF: e.target.value } })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Footer PDF</label>
            <Input value={settings.documenti.footerPDF} onChange={(e) => setSettings({ ...settings, documenti: { ...settings.documenti, footerPDF: e.target.value } })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note Contrattuali Standard</label>
            <Textarea value={settings.documenti.noteContrattuali} onChange={(e) => setSettings({ ...settings, documenti: { ...settings.documenti, noteContrattuali: e.target.value } })} placeholder="Note legali da inserire nei contratti..." rows={4} />
          </div>
        </CardContent>
      </Card>

      {/* Notifiche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Notifiche</CardTitle>
          <CardDescription>Configura promemoria e avvisi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Notifica eventi imminenti</p>
              <p className="text-sm text-gray-500">Ricevi un promemoria prima degli eventi</p>
            </div>
            <input type="checkbox" checked={settings.notifiche.emailEvento} onChange={(e) => setSettings({ ...settings, notifiche: { ...settings.notifiche, emailEvento: e.target.checked } })} className="h-5 w-5 rounded border-gray-300 text-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giorni di anticipo per reminder</label>
            <Input type="number" min="1" max="30" value={settings.notifiche.reminderGiorni} onChange={(e) => setSettings({ ...settings, notifiche: { ...settings.notifiche, reminderGiorni: parseInt(e.target.value) || 7 } })} className="w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Info Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Informazioni Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Versione</p>
              <p className="font-medium">2.0.0</p>
            </div>
            <div>
              <p className="text-gray-500">Database</p>
              <p className="font-medium">SQLite (Dev)</p>
            </div>
            <div>
              <p className="text-gray-500">Framework</p>
              <p className="font-medium">Next.js 15</p>
            </div>
            <div>
              <p className="text-gray-500">Override Token</p>
              <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">VILLA-PARIS-ADMIN-2026</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
