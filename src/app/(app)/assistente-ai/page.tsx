'use client'

import { useState } from 'react'
import { Bot, Check, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type Proposal = {
  id: string
  name: string
  arguments: Record<string, unknown>
  status?: 'review' | 'applied' | 'rejected' | 'failed'
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  proposals?: Proposal[]
}

const STARTERS = [
  'Fammi un report gestionale sintetico degli ultimi tre anni.',
  'Controlla i dati incompleti e indicami le priorità.',
  'Cerca gli appuntamenti relativi a matrimoni e riassumili.',
  'Quali sono i prossimi eventi e quanti ospiti sono previsti?'
]

export default function AssistenteAIPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Sono l’assistente amministrativo di Villa Paris. Posso consultare dati, controllare anomalie, redigere report e preparare inserimenti o modifiche da approvare.'
  }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async (text?: string) => {
    const prompt = (text ?? input).trim()
    if (!prompt || busy) return
    const previous = messages
    setMessages([...previous, { role: 'user', content: prompt }])
    setInput('')
    setError('')
    setBusy(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: previous.map(({ role, content }) => ({ role, content }))
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Risposta AI non disponibile')
      setMessages((current) => [...current, {
        role: 'assistant',
        content: data.message,
        proposals: data.proposals || []
      }])
    } catch (reason: any) {
      setError(reason.message || 'Errore durante la conversazione')
    } finally {
      setBusy(false)
    }
  }

  const review = async (messageIndex: number, proposal: Proposal, action: 'approve' | 'reject') => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, operationId: proposal.id })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Operazione non riuscita')
      setMessages((current) => current.map((message, index) => index === messageIndex ? {
        ...message,
        proposals: message.proposals?.map((item) => item.id === proposal.id
          ? { ...item, status: action === 'approve' ? 'applied' : 'rejected' }
          : item)
      } : message))
      setMessages((current) => [...current, {
        role: 'assistant',
        content: action === 'approve'
          ? 'Modifica applicata e registrata nell’audit.'
          : 'Proposta rifiutata: nessun dato è stato modificato.'
      }])
    } catch (reason: any) {
      setError(reason.message || 'Errore durante la revisione')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4" data-testid="admin-ai-chat-page">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Bot className="h-6 w-6 text-violet-600" /> Assistente AI
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Chat operativa riservata agli Administrator, con azioni controllate e tracciate.
        </p>
      </div>

      <Card className="border-violet-200">
        <CardHeader className="border-b bg-violet-50/50">
          <CardTitle className="flex items-center gap-2 text-sm text-violet-900">
            <ShieldCheck className="h-4 w-4" />
            Letture e report immediati · modifiche sempre da approvare · eliminazioni disabilitate
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[58vh] min-h-[420px] space-y-4 overflow-y-auto p-4">
            {messages.map((message, messageIndex) => (
              <div key={`${messageIndex}-${message.role}`} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                  message.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'border border-gray-200 bg-white text-gray-800 shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.proposals?.map((proposal) => (
                    <div key={proposal.id} className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-gray-800">
                      <p className="font-semibold text-amber-900">
                        {proposal.name === 'create_record' ? 'Nuovo inserimento proposto' : 'Modifica proposta'}
                      </p>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 text-xs">
                        {JSON.stringify(proposal.arguments, null, 2)}
                      </pre>
                      {!proposal.status || proposal.status === 'review' ? (
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={() => review(messageIndex, proposal, 'approve')} disabled={busy}>
                            <Check className="mr-1 h-4 w-4" /> Approva e applica
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => review(messageIndex, proposal, 'reject')} disabled={busy}>
                            <X className="mr-1 h-4 w-4" /> Rifiuta
                          </Button>
                        </div>
                      ) : (
                        <p className={`mt-2 text-xs font-semibold ${
                          proposal.status === 'applied' ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          {proposal.status === 'applied' ? 'Applicata' : 'Rifiutata'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-violet-700">
                  <Sparkles className="mr-2 inline h-4 w-4 animate-pulse" /> Elaborazione…
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-gray-50 p-4">
            {messages.length <= 1 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <button
                    type="button"
                    key={starter}
                    onClick={() => send(starter)}
                    className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    send()
                  }
                }}
                rows={3}
                placeholder="Es. Cerca il cliente Rossi, controlla i suoi dati e proponi le correzioni necessarie…"
                disabled={busy}
              />
              <Button onClick={() => send()} disabled={busy || !input.trim()} className="bg-violet-600 hover:bg-violet-700">
                <Send className="h-4 w-4" />
                <span className="sr-only">Invia</span>
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              La chat opera sui dati gestionali. Può suggerire miglioramenti al programma, ma non modifica codice o file del server.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
