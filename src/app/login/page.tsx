'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Errore login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white flex items-center justify-center p-4" data-testid="login-page">
      <Card className="w-full max-w-md" data-testid="login-card">
        <CardHeader>
          <CardTitle>Login Villa Paris</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin} data-testid="login-form">
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email-input" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" />
            </div>
            {error && <p className="text-sm text-red-600" data-testid="login-error">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full" data-testid="login-submit-btn">
              {loading ? 'Accesso...' : 'Accedi'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
