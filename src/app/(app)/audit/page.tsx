'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [entityType, setEntityType] = useState('')

  const fetchLogs = async () => {
    const query = entityType ? `?entityType=${encodeURIComponent(entityType)}` : ''
    const res = await fetch(`/api/audit${query}`)
    if (!res.ok) return
    const data = await res.json()
    setLogs(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6" data-testid="audit-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500">Tracciamento modifiche (solo Admin/Report).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtri</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Entity type (es. EVENT, CLIENT, APPOINTMENT, USER)" value={entityType} onChange={(e) => setEntityType(e.target.value)} data-testid="audit-entity-filter" />
          <button className="px-3 py-2 rounded bg-amber-500 text-white text-sm" onClick={fetchLogs} data-testid="audit-refresh-btn">Aggiorna</button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="border rounded-lg p-3 text-sm" data-testid={`audit-row-${l.id}`}>
              <p className="font-medium text-gray-800">{l.entityType} · {l.action} · #{l.entityId}</p>
              <p className="text-xs text-gray-500">{new Date(l.createdAt).toLocaleString('it-IT')} · {l.actorEmail || l.actorRole || 'SYSTEM'}</p>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-gray-500">Nessun log</p>}
        </CardContent>
      </Card>
    </div>
  )
}
