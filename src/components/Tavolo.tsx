'use client'

import { useDrag } from 'react-dnd'
import { useRef, useEffect, useState } from 'react'
import { type VariantiTavolo, VARIANTI_DEFAULT } from '@/lib/types'

type TavoloProps = {
  tavolo: {
    id: number
    numero: string
    posti: number
    posizione: { xPerc: number, yPerc: number }
    rotazione?: number
    forma?: string
    dimensionePerc: number
    varianti?: VariantiTavolo
    note?: string
    [key: string]: any
  }
  selected: boolean
  onSelect: () => void
  onDragEnd: (pos: { x: number, y: number }) => void
  onRotate: (rot: number) => void
  onDelete: () => void
  onRename: (nome: string) => void
  onOpenVarianti?: () => void  // Nuovo callback per aprire pannello varianti
  editabile: boolean
  containerRef: React.RefObject<HTMLDivElement>
}

export default function Tavolo({
  tavolo,
  selected,
  onSelect,
  onDragEnd,
  onRotate,
  onDelete,
  onRename,
  onOpenVarianti,
  editabile,
  containerRef
}: TavoloProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 })

  useEffect(() => {
    function updateSize() {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [containerRef])

  const left = (tavolo.posizione?.xPerc ?? 0) * containerSize.width
  const top = (tavolo.posizione?.yPerc ?? 0) * containerSize.height
  const diametro = (tavolo.dimensionePerc ?? 0.1) * containerSize.width

  const [, drag] = useDrag({
    type: 'TAVOLO',
    item: { id: tavolo.id },
    end: (item, monitor) => {
      const offset = monitor.getDifferenceFromInitialOffset()
      if (
        offset &&
        ref.current &&
        editabile &&
        containerRef?.current
      ) {
        const newX = left + offset.x
        const newY = top + offset.y
        const xPerc = Math.max(0, Math.min(1, newX / containerSize.width))
        const yPerc = Math.max(0, Math.min(1, newY / containerSize.height))
        onDragEnd({ x: xPerc, y: yPerc })
      }
    },
    canDrag: editabile
  })

  drag(ref)

  // Calcola totale varianti e colore predominante
  const hasVarianti = tavolo.varianti && Object.keys(tavolo.varianti).length > 0
  const totaleVarianti = hasVarianti 
    ? Object.values(tavolo.varianti!).reduce((sum, val) => sum + (val || 0), 0)
    : 0
  
  // Trova la variante con più occorrenze per il colore del badge
  const variantePrincipale = hasVarianti
    ? Object.entries(tavolo.varianti!).reduce((max, [key, val]) => 
        (val || 0) > (max.val || 0) ? { key, val } : max, { key: '', val: 0 })
    : null
  const coloreBadge = variantePrincipale?.key 
    ? VARIANTI_DEFAULT[variantePrincipale.key as keyof typeof VARIANTI_DEFAULT]?.colore || '#3b82f6'
    : '#3b82f6'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (editabile && onOpenVarianti) {
      onOpenVarianti()
    }
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left,
        top,
        width: diametro,
        height: diametro,
        border: selected ? '3px solid #2563eb' : hasVarianti ? `2px solid ${coloreBadge}` : '1px solid #999',
        borderRadius: '50%',
        background: hasVarianti ? `${coloreBadge}15` : '#f9f9f9',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `rotate(${tavolo.rotazione || 0}deg)`,
        zIndex: selected ? 10 : 1,
        cursor: editabile ? 'move' : 'default',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-testid={`tavolo-${tavolo.id}`}
    >
      {/* Nome tavolo */}
      <span style={{ fontSize: diametro * 0.25, fontWeight: 'bold' }}>
        {tavolo.numero}
      </span>
      
      {/* Badge varianti */}
      {hasVarianti && (
        <div 
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 20,
            height: 20,
            backgroundColor: coloreBadge,
            color: 'white',
            borderRadius: '50%',
            fontSize: 11,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}
          data-testid={`badge-varianti-${tavolo.id}`}
        >
          {totaleVarianti}
        </div>
      )}

      {/* Controlli quando selezionato */}
      {editabile && selected && (
        <div 
          style={{ 
            position: 'absolute',
            bottom: -45,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff', 
            borderRadius: 8, 
            padding: '4px 8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            zIndex: 20
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            style={{
              color: 'red',
              border: 0,
              background: 'none',
              cursor: 'pointer',
              padding: 4
            }}
            data-testid={`delete-tavolo-${tavolo.id}`}
          >🗑</button>
          <button
            onClick={(e) => { e.stopPropagation(); onRotate(((tavolo.rotazione || 0) + 45) % 360) }}
            style={{ border: 0, background: 'none', cursor: 'pointer', padding: 4 }}
          >↻</button>
          {onOpenVarianti && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenVarianti() }}
              style={{ 
                border: 0, 
                background: hasVarianti ? coloreBadge : '#3b82f6', 
                color: 'white',
                cursor: 'pointer', 
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 'bold'
              }}
              data-testid={`varianti-btn-${tavolo.id}`}
            >
              🍽
            </button>
          )}
          <input
            type="text"
            value={tavolo.numero}
            onChange={e => onRename(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{
              width: 40,
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: '2px 4px',
              textAlign: 'center'
            }}
          />
        </div>
      )}
    </div>
  )
}
