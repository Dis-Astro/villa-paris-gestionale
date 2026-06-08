import type { MenuEvento, Portata, Piatto } from '@/lib/types'

const CATEGORIA_LABELS: Record<string, string> = {
  antipasto: 'Antipasti',
  primo: 'Primi',
  secondo: 'Secondi',
  contorno: 'Contorni',
  dolce: 'Dolci',
  bevanda: 'Bevande',
  altro: 'Altro'
}

const ORDINE_CATEGORIE = ['antipasto', 'primo', 'secondo', 'contorno', 'dolce', 'bevanda', 'altro']

export const REGOLE_CATEGORIE: Record<string, string> = {
  antipasto: 'antipasti',
  primo: 'primi',
  secondo: 'secondi',
  contorno: 'contorni',
  dolce: 'dolci'
}

export function normalizeStrutturaMenuBase(raw: any): any {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return raw
}

export function getPrezzoDaStruttura(raw: any): number | null {
  const struttura = normalizeStrutturaMenuBase(raw)
  const prezzo = Number(struttura?.prezzo)
  return Number.isFinite(prezzo) && prezzo > 0 ? prezzo : null
}

export function parseListaPietanzeDaDescrizione(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^•\s*/, '').split('—')[0].trim())
    .filter(Boolean)
}

export function buildMenuEventoFromStruttura(raw: any): MenuEvento {
  const struttura = normalizeStrutturaMenuBase(raw)
  const piatti = Array.isArray(struttura?.piatti) ? struttura.piatti : []

  const portate = ORDINE_CATEGORIE.reduce<Portata[]>((acc, categoria, idx) => {
    const piattiCategoria: Piatto[] = piatti
      .filter((p: any) => p?.categoria === categoria && p?.nome)
      .map((p: any, piattoIdx: number) => ({
        id: p.id || `base-${categoria}-${idx}-${piattoIdx}`,
        nome: p.nome,
        descrizione: p.descrizione || '',
        categoria,
        defaultSelected: Boolean(p.defaultSelected),
        selezionato: Boolean(p.defaultSelected)
      }))

    if (!piattiCategoria.length) return acc

    const righeDefault = piattiCategoria
      .filter((p) => p.selezionato)
      .map((p) => `• ${p.nome}${p.descrizione ? ` — ${p.descrizione}` : ''}`)

    acc.push({
      id: `base-${categoria}-${idx}`,
      nome: CATEGORIA_LABELS[categoria] || categoria,
      ordine: idx + 1,
      descrizione: righeDefault.join('\n'),
      piatti: piattiCategoria
    })

    return acc
  }, [])

  return {
    portate,
    variantiAttive: [],
    note: ''
  }
}

export function normalizeMenuEvento(menuRaw: any): MenuEvento {
  const menu = (menuRaw && typeof menuRaw === 'object') ? menuRaw : {}
  const portateRaw = Array.isArray(menu.portate) ? menu.portate : []

  const portate: Portata[] = portateRaw.map((p: any, idx: number) => ({
    id: p.id || `portata-${idx + 1}`,
    nome: p.nome || `Portata ${idx + 1}`,
    ordine: Number(p.ordine) || idx + 1,
    descrizione: typeof p.descrizione === 'string' ? p.descrizione : '',
    piatti: Array.isArray(p.piatti)
      ? p.piatti.map((piatto: any, pIdx: number) => ({
          id: piatto.id || `piatto-${idx + 1}-${pIdx + 1}`,
          nome: piatto.nome || '',
          descrizione: piatto.descrizione || '',
          categoria: piatto.categoria,
          selezionato: piatto.selezionato !== false,
          defaultSelected: Boolean(piatto.defaultSelected),
          isExtra: Boolean(piatto.isExtra)
        }))
      : undefined
  }))

  return {
    portate,
    variantiAttive: Array.isArray(menu.variantiAttive) ? menu.variantiAttive : [],
    note: menu.note || ''
  }
}
