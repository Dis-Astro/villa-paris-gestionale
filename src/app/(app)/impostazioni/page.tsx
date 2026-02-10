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
  Bell
} from 'lucide-react'

export default function ImpostazioniPage() {
  const [settings, setSettings] = useState({
    azienda: {
      nome: 'Villa Paris',
      indirizzo: '',
      citta: '',
      cap: '',
      telefono: '',
      email: '',
      website: '',
      piva: '',
      cf: ''
    },
    documenti: {
      intestazionePDF: 'Villa Paris - Location per Eventi',
      footerPDF: '© Villa Paris - Tutti i diritti riservati',
      noteContrattuali: ''
    },
    notifiche: {
      emailEvento: true,
      reminderGiorni: 7
    }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    setStatus('Salvataggio in corso...')
    
    // Simula salvataggio (in futuro collegare a API)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Salva in localStorage per persistenza locale
    if (typeof window !== 'undefined') {
      localStorage.setItem('villa-paris-settings', JSON.stringify(settings))
    }
    
    setStatus('✅ Impostazioni salvate')
    setIsSaving(false)
    setTimeout(() => setStatus(''), 3000)
  }

  // Carica settings da localStorage al mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('villa-paris-settings')
      if (saved) {
        try {
          setSettings(JSON.parse(saved))
        } catch (e) {
          console.error('Errore nel caricamento impostazioni:', e)
        }
      }
    }
  }, [])

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
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvataggio...' : 'Salva Impostazioni'}
        </Button>
      </div>

      {status && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm">
          {status}
        </div>
      )}

      {/* Dati Azienda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Dati Azienda
          </CardTitle>
          <CardDescription>
            Informazioni aziendali per fatturazione e documenti
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Azienda
              </label>
              <Input
                value={settings.azienda.nome}
                onChange={(e) => setSettings({
                  ...settings,
                  azienda: { ...settings.azienda, nome: e.target.value }
                })}
                placeholder="Villa Paris"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Partita IVA
              </label>
              <Input
                value={settings.azienda.piva}
                onChange={(e) => setSettings({
                  ...settings,
                  azienda: { ...settings.azienda, piva: e.target.value }
                })}
                placeholder="IT12345678901"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Indirizzo
            </label>
            <Input
              value={settings.azienda.indirizzo}
              onChange={(e) => setSettings({
                ...settings,
                azienda: { ...settings.azienda, indirizzo: e.target.value }
              })}
              placeholder="Via Roma 123"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Città
              </label>
              <Input
                value={settings.azienda.citta}
                onChange={(e) => setSettings({
                  ...settings,
                  azienda: { ...settings.azienda, citta: e.target.value }
                })}
                placeholder="Roma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CAP
              </label>
              <Input
                value={settings.azienda.cap}
                onChange={(e) => setSettings({
                  ...settings,
                  azienda: { ...settings.azienda, cap: e.target.value }
                })}
                placeholder="00100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Codice Fiscale
              </label>
              <Input
                value={settings.azienda.cf}
                onChange={(e) => setSettings({
                  ...settings,
                  azienda: { ...settings.azienda, cf: e.target.value }
                })}
                placeholder="ABCDEF12G34H567I"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Telefono
              </label>
              <Input
                value={settings.azienda.telefono}
                onChange={(e) => setSettings({
                  ...settings,
                  azienda: { ...settings.azienda, telefono: e.target.value }
                })}
                placeholder="+39 06 12345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <Input
                type="email"
                value={settings.azienda.email}
                onChange={(e) => setSettings({
                  ...settings,
                  azienda: { ...settings.azienda, email: e.target.value }
                })}
                placeholder="info@villaparis.it"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="w-4 h-4 inline mr-1" />
                Sito Web
              </label>
              <Input
                value={settings.azienda.website}
                onChange={(e) => setSettings({
                  ...settings,
                  azienda: { ...settings.azienda, website: e.target.value }
                })}
                placeholder="www.villaparis.it"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impostazioni Documenti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documenti PDF
          </CardTitle>
          <CardDescription>
            Personalizza l'aspetto dei documenti generati
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intestazione PDF
            </label>
            <Input
              value={settings.documenti.intestazionePDF}
              onChange={(e) => setSettings({
                ...settings,
                documenti: { ...settings.documenti, intestazionePDF: e.target.value }
              })}
              placeholder="Villa Paris - Location per Eventi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Footer PDF
            </label>
            <Input
              value={settings.documenti.footerPDF}
              onChange={(e) => setSettings({
                ...settings,
                documenti: { ...settings.documenti, footerPDF: e.target.value }
              })}
              placeholder="© Villa Paris - Tutti i diritti riservati"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note Contrattuali Standard
            </label>
            <Textarea
              value={settings.documenti.noteContrattuali}
              onChange={(e) => setSettings({
                ...settings,
                documenti: { ...settings.documenti, noteContrattuali: e.target.value }
              })}
              placeholder="Note legali da inserire nei contratti..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifiche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifiche
          </CardTitle>
          <CardDescription>
            Configura promemoria e avvisi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Notifica eventi imminenti</p>
              <p className="text-sm text-gray-500">Ricevi un promemoria prima degli eventi</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifiche.emailEvento}
              onChange={(e) => setSettings({
                ...settings,
                notifiche: { ...settings.notifiche, emailEvento: e.target.checked }
              })}
              className="h-5 w-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giorni di anticipo per reminder
            </label>
            <Input
              type="number"
              min="1"
              max="30"
              value={settings.notifiche.reminderGiorni}
              onChange={(e) => setSettings({
                ...settings,
                notifiche: { ...settings.notifiche, reminderGiorni: parseInt(e.target.value) || 7 }
              })}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Informazioni Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Versione</p>
              <p className="font-medium">1.0.0</p>
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
              <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                VILLA-PARIS-ADMIN-2026
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
