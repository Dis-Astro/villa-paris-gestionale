'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowRight, CalendarDays, ShieldCheck, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login fallito')
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Errore login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[100dvh] bg-[#f4f2ed] lg:grid-cols-[1.15fr_.85fr]" data-testid="login-page">
      <section className="relative hidden overflow-hidden bg-[#173c37] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-[#c9a96a]/20" />
        <div className="absolute -right-12 top-8 h-72 w-72 rounded-full border border-[#c9a96a]/15" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c9a96a] font-bold text-[#102d29]">VP</div>
          <div>
            <p className="text-lg font-semibold">Villa Paris</p>
            <p className="text-xs uppercase tracking-[.2em] text-white/45">Gestionale operativo</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#e4d3aa]">
            <Sparkles className="h-3.5 w-3.5" /> Beta ottimizzata per iPad
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-.035em] xl:text-6xl">Ogni evento, sotto controllo con naturalezza.</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/58">Calendario, clienti, menu e planimetrie in uno spazio di lavoro elegante, rapido e sincronizzato.</p>
        </div>

        <div className="relative grid grid-cols-2 gap-4 text-sm text-white/65">
          <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-[#c9a96a]" /> Agenda sempre aggiornata</div>
          <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#c9a96a]" /> Accesso protetto per ruolo</div>
        </div>
      </section>

      <main className="safe-top safe-bottom flex items-center justify-center p-5 sm:p-10">
      <Card className="vp-panel w-full max-w-[460px] rounded-[28px] border-0" data-testid="login-card">
        <CardHeader className="space-y-5 px-7 pb-3 pt-8 sm:px-9 sm:pt-10">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173c37] font-bold text-[#e4d3aa]">VP</div>
            <div><p className="font-semibold text-[#173c37]">Villa Paris</p><p className="text-xs text-gray-500">Gestionale operativo</p></div>
          </div>
          <div>
            <CardTitle className="text-3xl font-semibold tracking-tight text-[#173c37]">Bentornato</CardTitle>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">Accedi allo spazio di lavoro sincronizzato con gestionale.villaparis.it</p>
          </div>
        </CardHeader>
        <CardContent className="px-7 pb-8 sm:px-9 sm:pb-10">
          <form className="space-y-4" onSubmit={handleLogin} data-testid="login-form">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#294e48]">Email</label>
              <Input className="h-12 rounded-xl border-[#173c37]/12 bg-white px-4" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#294e48]">Password</label>
              <Input className="h-12 rounded-xl border-[#173c37]/12 bg-white px-4" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" />
            </div>
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" data-testid="login-error">{error}</p>}
            <Button type="submit" disabled={loading || !email || !password} className="h-12 w-full rounded-xl bg-[#173c37] text-base text-white hover:bg-[#214f48]" data-testid="login-submit-btn">
              {loading ? 'Accesso in corso…' : <span className="inline-flex items-center gap-2">Accedi <ArrowRight className="h-4 w-4" /></span>}
            </Button>
          </form>
        </CardContent>
      </Card>
      </main>
    </div>
  )
}
