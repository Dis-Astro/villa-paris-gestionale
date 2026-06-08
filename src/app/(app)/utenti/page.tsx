'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UserItem = {
  id: string
  email: string
  role: 'ADMIN' | 'REPORT' | 'WORKER'
  isActive: boolean
}

export default function UtentiPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [status, setStatus] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [form, setForm] = useState({ email: '', password: '', role: 'WORKER' as UserItem['role'] })

  const fetchUsers = async () => {
    const res = await fetch('/api/users')
    if (!res.ok) return
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    const loadMe = async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return
      const data = await res.json()
      setCurrentUserId(data.id || '')
    }
    loadMe()
    fetchUsers()
  }, [])

  const createUser = async () => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) {
      setStatus(`❌ ${data.error || 'Errore creazione utente'}`)
      return
    }
    setStatus('✅ Utente creato')
    setForm({ email: '', password: '', role: 'WORKER' })
    fetchUsers()
  }

  const updateUser = async (id: string, payload: any) => {
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload })
    })
    const data = await res.json()
    if (!res.ok) {
      setStatus(`❌ ${data.error || 'Errore aggiornamento utente'}`)
      return
    }
    setStatus('✅ Utente aggiornato')
    fetchUsers()
  }

  const deleteUser = async (u: UserItem) => {
    const confirmed = window.confirm(`Eliminare definitivamente l'account ${u.email}?`)
    if (!confirmed) return

    setDeletingId(u.id)
    const res = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(`❌ ${data.error || 'Errore eliminazione utente'}`)
      setDeletingId('')
      return
    }
    setStatus('✅ Utente eliminato')
    setDeletingId('')
    fetchUsers()
  }

  return (
    <div className="space-y-6" data-testid="utenti-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>
        <p className="text-sm text-gray-500">Solo Admin: creazione, attivazione, ruolo, reset password ed eliminazione account con protezioni.</p>
      </div>

      {status && <div className="px-3 py-2 rounded bg-amber-50 text-amber-700 text-sm" data-testid="utenti-status">{status}</div>}

      <Card data-testid="create-user-card">
        <CardHeader><CardTitle className="text-base">Nuovo utente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} data-testid="new-user-email" />
          <Input type="password" placeholder="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} data-testid="new-user-password" />
          <select className="border rounded px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as any }))} data-testid="new-user-role">
            <option value="ADMIN">ADMIN</option>
            <option value="REPORT">REPORT</option>
            <option value="WORKER">WORKER</option>
          </select>
          <Button onClick={createUser} data-testid="create-user-btn">Crea utente</Button>
        </CardContent>
      </Card>

      <Card data-testid="users-list-card">
        <CardHeader><CardTitle className="text-base">Utenti</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="border rounded-lg p-3 flex flex-col md:flex-row gap-2 md:items-center md:justify-between" data-testid={`user-row-${u.id}`}>
              <div>
                <p className="font-medium text-gray-800">{u.email}</p>
                <p className="text-xs text-gray-500">{u.role} · {u.isActive ? 'attivo' : 'disattivo'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={u.role}
                  onChange={(e) => updateUser(u.id, { role: e.target.value })}
                  data-testid={`user-role-select-${u.id}`}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="REPORT">REPORT</option>
                  <option value="WORKER">WORKER</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                  data-testid={`user-toggle-active-${u.id}`}
                >
                  {u.isActive ? 'Disattiva' : 'Attiva'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const pwd = prompt(`Nuova password per ${u.email}`)
                    if (!pwd) return
                    updateUser(u.id, { newPassword: pwd })
                  }}
                  data-testid={`user-reset-password-${u.id}`}
                >
                  Reset password
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => deleteUser(u)}
                  disabled={deletingId === u.id || currentUserId === u.id}
                  data-testid={`user-delete-${u.id}`}
                  title={currentUserId === u.id ? 'Non puoi eliminare il tuo account loggato' : 'Elimina account'}
                >
                  {deletingId === u.id ? 'Eliminazione...' : 'Elimina'}
                </Button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-gray-500">Nessun utente</p>}
        </CardContent>
      </Card>
    </div>
  )
}
