import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLANIMETRIE_DIR = path.join(process.cwd(), 'public', 'planimetrie')

function ensureDir() {
  if (!fs.existsSync(PLANIMETRIE_DIR)) {
    fs.mkdirSync(PLANIMETRIE_DIR, { recursive: true })
  }
}

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'planimetria'
}

function getList() {
  ensureDir()
  return fs.readdirSync(PLANIMETRIE_DIR)
    .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .map((f) => ({
      nome: f
        .replace(/\.[^/.]+$/, '')
        .replace(/-\d{13}$/, '')
        .replace(/[-_]/g, ' ')
        .slice(0, 48),
      url: `/planimetrie/${f}`
    }))
}

// Restituisce l'elenco delle immagini disponibili in /public/planimetrie/
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const files = getList()
    return NextResponse.json(files)
  } catch (e) {
    console.error('Errore lettura planimetrie:', e)
    return new NextResponse(JSON.stringify([]), { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    ensureDir()
    
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'File mancante' }, { status: 400 })
    }
    
    const file = formData.get('file') as File | null
    const nomeInput = (formData.get('nome') as string | null) || ''

    if (!file) {
      return NextResponse.json({ error: 'File mancante' }, { status: 400 })
    }

    const ext = path.extname(file.name || '').toLowerCase() || '.png'
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      return NextResponse.json({ error: 'Formato non supportato' }, { status: 400 })
    }

    const base = slugifyName(nomeInput || file.name)
    const finalName = `${base}-${Date.now()}${ext}`
    const savePath = path.join(PLANIMETRIE_DIR, finalName)

    const arrayBuffer = await file.arrayBuffer()
    fs.writeFileSync(savePath, Buffer.from(arrayBuffer))

    return NextResponse.json({ nome: base.replace(/-/g, ' '), url: `/planimetrie/${finalName}` })
  } catch (e) {
    console.error('Errore upload planimetria:', e)
    return NextResponse.json({ error: 'Errore upload planimetria' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    ensureDir()
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')

    if (!url || !url.startsWith('/planimetrie/')) {
      return NextResponse.json({ error: 'URL planimetria non valido' }, { status: 400 })
    }

    const fileName = path.basename(url)
    const filePath = path.join(PLANIMETRIE_DIR, fileName)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Planimetria non trovata' }, { status: 404 })
    }

    fs.unlinkSync(filePath)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Errore eliminazione planimetria:', e)
    return NextResponse.json({ error: 'Errore eliminazione planimetria' }, { status: 500 })
  }
}
