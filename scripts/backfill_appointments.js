/*
  Migrazione conservativa legacy:
  converte Eventi con tipo='Appuntamento' in record Appuntamento
  senza cancellare lo storico esistente.

  Uso:
  node scripts/backfill_appointments.js
*/

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

async function main() {
  const legacy = await prisma.evento.findMany({
    where: {
      tipo: 'Appuntamento',
      appuntamentoOrigineId: null
    },
    include: {
      clienti: { include: { cliente: true } }
    }
  })

  let createdCount = 0

  for (const ev of legacy) {
    const primary = ev.clienti?.[0]?.cliente
    if (!primary) continue

    const dataAppuntamento = parseDate(ev.dataConfermata) || parseDate(ev.dataPrimoContatto) || parseDate(ev.createdAt)
    if (!dataAppuntamento) continue

    const existing = await prisma.appuntamento.findFirst({
      where: {
        clientePrincipaleId: primary.id,
        dataAppuntamento
      }
    })

    const app = existing || await prisma.appuntamento.create({
      data: {
        clientePrincipaleId: primary.id,
        dataAppuntamento,
        durataMinuti: 60,
        esito: 'svolto',
        riassuntoColloquio: ev.titolo || 'Appuntamento legacy',
        noteColloquio: ev.note || null,
        numeroProgressivo: null,
        statoFunnel: ev.stato === 'confermato' ? 'confermato' : 'in_trattativa',
        dateOpzionate: ev.dateProposte ? (typeof ev.dateProposte === 'string' ? ev.dateProposte : JSON.stringify(ev.dateProposte)) : JSON.stringify([]),
        dataScadenzaOpzione: null,
        statoOpzione: 'nessuna',
        clienti: {
          create: ev.clienti.map((c, idx) => ({
            clienteId: c.clienteId,
            ruolo: idx === 0 ? 'principale' : 'secondario'
          }))
        }
      }
    })

    await prisma.evento.update({
      where: { id: ev.id },
      data: { appuntamentoOrigineId: app.id }
    })

    if (!existing) createdCount += 1
  }

  console.log(`Backfill completato: ${createdCount} nuovi appuntamenti creati`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
