'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  UtensilsCrossed, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  ChevronDown,
  ChevronUp,
  Euro,
  Copy
} from 'lucide-react'

interface PiattoBase {
  id: string
  nome: string
  descrizione?: string
  categoria: 'antipasto' | 'primo' | 'secondo' | 'contorno' | 'dolce' | 'bevanda' | 'altro'
}

interface MenuBase {
  id: number
  nome: string
  descrizione?: string
  prezzo?: number
  piatti: PiattoBase[]
  // Regole: quanti piatti per categoria può scegliere il cliente
  regole: {
    antipasti: number
    primi: number
    secondi: number
    contorni: number
    dolci: number
  }
  createdAt: string
}

const CATEGORIE = [
  { id: 'antipasto', nome: 'Antipasti', emoji: '🥗' },
  { id: 'primo', nome: 'Primi', emoji: '🍝' },
  { id: 'secondo', nome: 'Secondi', emoji: '🥩' },
  { id: 'contorno', nome: 'Contorni', emoji: '🥬' },
  { id: 'dolce', nome: 'Dolci', emoji: '🍰' },
  { id: 'bevanda', nome: 'Bevande', emoji: '🥂' },
  { id: 'altro', nome: 'Altro', emoji: '✨' }
]

export default function MenuBasePage() {
  const router = useRouter()
  const [menuList, setMenuList] = useState<MenuBase[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMenu, setEditingMenu] = useState<MenuBase | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [expandedMenuId, setExpandedMenuId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')
  
  // Form state per nuovo/modifica menu
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    prezzo: '',
    regole: {
      antipasti: 2,
      primi: 2,
      secondi: 1,
      contorni: 2,
      dolci: 1
    }
  })
  const [piatti, setPiatti] = useState<PiattoBase[]>([])

  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu-base')
      const data = await res.json()
      setMenuList(data)
    } catch (error) {
      console.error('Errore nel caricamento menu:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMenu()
  }, [])

  const handleSave = async () => {
    const payload = {
      nome: formData.nome,
      struttura: {
        descrizione: formData.descrizione,
        prezzo: formData.prezzo ? parseFloat(formData.prezzo) : null,
        piatti,
        regole: formData.regole
      }
    }

    const method = editingMenu ? 'PUT' : 'POST'
    const url = editingMenu ? `/api/menu-base?id=${editingMenu.id}` : '/api/menu-base'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        fetchMenu()
        resetForm()
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo menu?')) return
    
    try {
      await fetch(`/api/menu-base?id=${id}`, { method: 'DELETE' })
      fetchMenu()
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error)
    }
  }

  const handleEdit = (menu: MenuBase) => {
    setEditingMenu(menu)
    setFormData({
      nome: menu.nome,
      descrizione: (menu as any).struttura?.descrizione || '',
      prezzo: (menu as any).struttura?.prezzo?.toString() || '',
      regole: (menu as any).struttura?.regole || {
        antipasti: 2,
        primi: 2,
        secondi: 1,
        contorni: 2,
        dolci: 1
      }
    })
    setPiatti((menu as any).struttura?.piatti || [])
    setIsCreating(true)
  }

  const handleDuplicate = (menu: MenuBase) => {
    setEditingMenu(null)
    setFormData({
      nome: `${menu.nome} (copia)`,
      descrizione: (menu as any).struttura?.descrizione || '',
      prezzo: (menu as any).struttura?.prezzo?.toString() || '',
      regole: (menu as any).struttura?.regole || {
        antipasti: 2,
        primi: 2,
        secondi: 1,
        contorni: 2,
        dolci: 1
      }
    })
    setPiatti((menu as any).struttura?.piatti || [])
    setIsCreating(true)
  }

  const resetForm = () => {
    setEditingMenu(null)
    setIsCreating(false)
    setFormData({
      nome: '',
      descrizione: '',
      prezzo: '',
      regole: {
        antipasti: 2,
        primi: 2,
        secondi: 1,
        contorni: 2,
        dolci: 1
      }
    })
    setPiatti([])
  }

  const aggiungiPiatto = (categoria: PiattoBase['categoria']) => {
    const nuovoPiatto: PiattoBase = {
      id: `piatto_${Date.now()}`,
      nome: '',
      descrizione: '',
      categoria
    }
    setPiatti([...piatti, nuovoPiatto])
  }

  const aggiornaPiatto = (id: string, campo: keyof PiattoBase, valore: string) => {
    setPiatti(piatti.map(p => p.id === id ? { ...p, [campo]: valore } : p))
  }

  const eliminaPiatto = (id: string) => {
    setPiatti(piatti.filter(p => p.id !== id))
  }

  const piattiPerCategoria = (categoria: string) => 
    piatti.filter(p => p.categoria === categoria)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  // Form di creazione/modifica
  if (isCreating) {
    return (
      <div className="space-y-6" data-testid="menu-base-form">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UtensilsCrossed className="w-7 h-7 text-amber-500" />
            {editingMenu ? 'Modifica Menu Base' : 'Nuovo Menu Base'}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetForm}>
              Annulla
            </Button>
            <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">
              <Save className="w-4 h-4 mr-2" />
              Salva
            </Button>
          </div>
        </div>

        {/* Info Menu */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Menu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Menu *
                </label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Es. Menu Matrimonio Classic"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prezzo per persona (€)
                </label>
                <Input
                  type="number"
                  value={formData.prezzo}
                  onChange={(e) => setFormData({...formData, prezzo: e.target.value})}
                  placeholder="Es. 85"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <Textarea
                value={formData.descrizione}
                onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
                placeholder="Descrizione del menu..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Regole selezione */}
        <Card>
          <CardHeader>
            <CardTitle>Regole Selezione Piatti</CardTitle>
            <p className="text-sm text-gray-500">
              Quanti piatti può scegliere il cliente per ogni categoria
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { key: 'antipasti', label: 'Antipasti' },
                { key: 'primi', label: 'Primi' },
                { key: 'secondi', label: 'Secondi' },
                { key: 'contorni', label: 'Contorni' },
                { key: 'dolci', label: 'Dolci' }
              ].map(item => (
                <div key={item.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {item.label}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.regole[item.key as keyof typeof formData.regole]}
                    onChange={(e) => setFormData({
                      ...formData,
                      regole: {
                        ...formData.regole,
                        [item.key]: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Piatti per categoria */}
        {CATEGORIE.map(cat => (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>{cat.emoji}</span>
                {cat.nome}
                <span className="text-sm font-normal text-gray-500">
                  ({piattiPerCategoria(cat.id).length} piatti)
                </span>
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => aggiungiPiatto(cat.id as PiattoBase['categoria'])}
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi
              </Button>
            </CardHeader>
            <CardContent>
              {piattiPerCategoria(cat.id).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nessun piatto in questa categoria
                </p>
              ) : (
                <div className="space-y-3">
                  {piattiPerCategoria(cat.id).map(piatto => (
                    <div key={piatto.id} className="flex gap-3 items-start">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={piatto.nome}
                          onChange={(e) => aggiornaPiatto(piatto.id, 'nome', e.target.value)}
                          placeholder="Nome piatto"
                        />
                        <Input
                          value={piatto.descrizione || ''}
                          onChange={(e) => aggiornaPiatto(piatto.id, 'descrizione', e.target.value)}
                          placeholder="Descrizione (opzionale)"
                          className="text-sm"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => eliminaPiatto(piatto.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Lista menu
  return (
    <div className="space-y-6" data-testid="menu-base-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UtensilsCrossed className="w-7 h-7 text-amber-500" />
            Menu Base
          </h1>
          <p className="text-gray-500">
            Template menu predefiniti per gli eventi
          </p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Menu
        </Button>
      </div>

      {/* Spiegazione */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <p className="text-sm text-amber-800">
            <strong>Come funziona:</strong> Crea menu base con tutti i piatti disponibili. 
            Quando assegni un menu ad un evento, il cliente potrà selezionare solo i piatti 
            che preferisce secondo le regole impostate (es. 2 primi su 8 disponibili).
          </p>
        </CardContent>
      </Card>

      {/* Lista */}
      {menuList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nessun menu base creato</p>
            <Button 
              variant="link" 
              onClick={() => setIsCreating(true)}
              className="mt-2"
            >
              Crea il primo menu
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {menuList.map((menu) => {
            const struttura = (menu as any).struttura || {}
            const isExpanded = expandedMenuId === menu.id
            const piattiMenu = struttura.piatti || []
            
            return (
              <Card key={menu.id} data-testid={`menu-base-${menu.id}`}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedMenuId(isExpanded ? null : menu.id)}
                  >
                    <CardTitle className="flex items-center gap-3">
                      <UtensilsCrossed className="w-5 h-5 text-amber-500" />
                      {menu.nome}
                      {struttura.prezzo && (
                        <span className="text-sm font-normal text-gray-500 flex items-center gap-1">
                          <Euro className="w-4 h-4" />
                          {struttura.prezzo}/persona
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </CardTitle>
                    {struttura.descrizione && (
                      <p className="text-sm text-gray-500 mt-1">{struttura.descrizione}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {piattiMenu.length} piatti totali
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(menu)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(menu)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500"
                      onClick={() => handleDelete(menu.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="border-t">
                    {/* Regole */}
                    {struttura.regole && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Regole selezione cliente:
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <span>{struttura.regole.antipasti} antipasti</span>
                          <span>•</span>
                          <span>{struttura.regole.primi} primi</span>
                          <span>•</span>
                          <span>{struttura.regole.secondi} secondi</span>
                          <span>•</span>
                          <span>{struttura.regole.contorni} contorni</span>
                          <span>•</span>
                          <span>{struttura.regole.dolci} dolci</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Piatti per categoria */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {CATEGORIE.map(cat => {
                        const piattiCat = piattiMenu.filter((p: PiattoBase) => p.categoria === cat.id)
                        if (piattiCat.length === 0) return null
                        
                        return (
                          <div key={cat.id} className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                              {cat.emoji} {cat.nome}
                            </h4>
                            <ul className="space-y-1">
                              {piattiCat.map((piatto: PiattoBase) => (
                                <li key={piatto.id} className="text-sm text-gray-600">
                                  • {piatto.nome}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
