import prisma from '@/lib/prisma'

const PROXIMITY_MS = 10 * 60 * 1000

function chunks<T>(items: T[], size = 500) {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

export async function getGoogleImportRollbackPreview() {
  const imports = await prisma.googleCalendarImport.findMany({
    where: { risorsaId: { not: null } },
    select: {
      id: true,
      tipoRisorsa: true,
      risorsaId: true,
      createdResource: true,
      firstImportedAt: true
    }
  })
  const eventoIds = imports.filter((item) => item.tipoRisorsa === 'evento').map((item) => item.risorsaId!).filter(Boolean)
  const appuntamentoIds = imports.filter((item) => item.tipoRisorsa === 'appuntamento').map((item) => item.risorsaId!).filter(Boolean)
  const [eventi, appuntamenti] = await Promise.all([
    prisma.evento.findMany({
      where: { id: { in: eventoIds } },
      select: { id: true, createdAt: true }
    }),
    prisma.appuntamento.findMany({
      where: { id: { in: appuntamentoIds } },
      select: { id: true, createdAt: true }
    })
  ])
  const createdAtByResource = new Map<string, Date>()
  for (const item of eventi) createdAtByResource.set(`evento:${item.id}`, item.createdAt)
  for (const item of appuntamenti) createdAtByResource.set(`appuntamento:${item.id}`, item.createdAt)

  const candidates = imports.filter((item) => {
    if (item.createdResource) return true
    const resourceCreatedAt = createdAtByResource.get(`${item.tipoRisorsa}:${item.risorsaId}`)
    if (!resourceCreatedAt) return false
    return Math.abs(item.firstImportedAt.getTime() - resourceCreatedAt.getTime()) <= PROXIMITY_MS
  })
  const candidateEventIds = [...new Set(candidates
    .filter((item) => item.tipoRisorsa === 'evento')
    .map((item) => item.risorsaId!)
    .filter(Boolean))]
  const candidateAppointmentIds = [...new Set(candidates
    .filter((item) => item.tipoRisorsa === 'appuntamento')
    .map((item) => item.risorsaId!)
    .filter(Boolean))]
  const earliestImport = candidates.reduce<Date | null>(
    (earliest, item) => !earliest || item.firstImportedAt < earliest ? item.firstImportedAt : earliest,
    null
  )
  const possibleClients = earliestImport ? await prisma.cliente.findMany({
    where: {
      canalePrimoContatto: 'google_calendar',
      createdAt: { gte: new Date(earliestImport.getTime() - PROXIMITY_MS) },
      notaAnagrafica: { contains: 'importazione da Google Calendar' }
    },
    select: {
      id: true,
      eventi: { select: { eventoId: true } },
      appuntamentiPrincipali: { select: { id: true } },
      appuntamenti: { select: { appuntamentoId: true } }
    }
  }) : []
  const eventSet = new Set(candidateEventIds)
  const appointmentSet = new Set(candidateAppointmentIds)
  const candidateClientIds = possibleClients.filter((client) =>
    client.eventi.every((link) => eventSet.has(link.eventoId)) &&
    client.appuntamentiPrincipali.every((item) => appointmentSet.has(item.id)) &&
    client.appuntamenti.every((link) => appointmentSet.has(link.appuntamentoId))
  ).map((client) => client.id)

  return {
    totalImports: imports.length,
    candidateImports: candidates.length,
    eventiDaRimuovere: candidateEventIds.length,
    appuntamentiDaRimuovere: candidateAppointmentIds.length,
    clientiDaRimuovere: candidateClientIds.length,
    preservedLinkedResources: Math.max(0, imports.length - candidates.length),
    candidateImportIds: candidates.map((item) => item.id),
    candidateEventIds,
    candidateAppointmentIds,
    candidateClientIds,
    earliestImport
  }
}

export async function rollbackGoogleImport() {
  const preview = await getGoogleImportRollbackPreview()
  const importIds = preview.candidateImportIds
  const eventIds = preview.candidateEventIds
  const appointmentIds = preview.candidateAppointmentIds
  const clientIds = preview.candidateClientIds

  await prisma.$transaction(async (tx) => {
    for (const ids of chunks(appointmentIds)) {
      await tx.interazioneCliente.deleteMany({ where: { appuntamentoId: { in: ids } } })
      await tx.appuntamento.deleteMany({ where: { id: { in: ids } } })
    }
    for (const ids of chunks(eventIds)) {
      await tx.evento.deleteMany({ where: { id: { in: ids } } })
    }
    for (const ids of chunks(importIds)) {
      await tx.googleCalendarImport.updateMany({
        where: { id: { in: ids } },
        data: {
          risorsaId: null,
          createdResource: false,
          stato: 'review',
          fingerprint: null,
          aiStatus: 'pending',
          aiAnalyzedAt: null,
          warning: 'Importazione operativa annullata: in attesa di riclassificazione'
        }
      })
    }

    for (const ids of chunks(clientIds)) {
      const stillOrphan = await tx.cliente.findMany({
        where: {
          id: { in: ids },
          eventi: { none: {} },
          appuntamentiPrincipali: { none: {} },
          appuntamenti: { none: {} }
        },
        select: { id: true }
      })
      const orphanIds = stillOrphan.map((item) => item.id)
      if (orphanIds.length) {
        await tx.interazioneCliente.deleteMany({ where: { clienteId: { in: orphanIds } } })
        await tx.cliente.deleteMany({ where: { id: { in: orphanIds } } })
      }
    }
    await tx.googleCalendarConfig.updateMany({
      where: { isActive: true },
      data: { syncToken: null }
    })
  }, { timeout: 120000 })

  return {
    success: true,
    removed: {
      eventi: eventIds.length,
      appuntamenti: appointmentIds.length,
      clienti: clientIds.length,
      importsReset: importIds.length
    },
    preservedLinkedResources: preview.preservedLinkedResources
  }
}
