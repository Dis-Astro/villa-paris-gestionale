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
  onUpdatePosti: (posti: number) => void
  onOpenVarianti?: () => void
  editabile: boolean
  dragEnabled?: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
}

export default function Tavolo({
  tavolo,
  selected,
  onSelect,
  onDragEnd,
  onRotate,
  onDelete,
  onRename,
  onUpdatePosti,
  onOpenVarianti,
  editabile,
  dragEnabled = true,
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
  const isImperiale = tavolo.forma === 'imperiale'
  const diametro = (tavolo.dimensionePerc ?? 0.1) * containerSize.width

  // Imperiale: rettangolare lungo (3:1 ratio)
  const width = isImperiale ? diametro * 3 : diametro
  const height = isImperiale ? diametro * 0.8 : diametro

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
    canDrag: editabile && dragEnabled
  })

  drag(ref)

  // Calcola totale varianti e colore predominante
  const hasVarianti = tavolo.varianti && Object.keys(tavolo.varianti).length > 0
  const totaleVarianti = hasVarianti 
    ? Object.values(tavolo.varianti!).reduce((sum, val) => sum + (val || 0), 0)
    : 0
  
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

  const borderColor = selected ? '#2563eb' : hasVarianti ? coloreBadge : (isImperiale ? '#b45309' : '#999')
  const bgColor = isImperiale 
    ? (hasVarianti ? `${coloreBadge}15` : '#fef3c7')
    : (hasVarianti ? `${coloreBadge}15` : '#f9f9f9')

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        border: selected ? `3px solid ${borderColor}` : `${isImperiale ? 2 : 1}px solid ${borderColor}`,
        borderRadius: isImperiale ? 8 : '50%',
        background: bgColor,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `rotate(${tavolo.rotazione || 0}deg)`,
        zIndex: selected ? 10 : 1,
        cursor: editabile ? (dragEnabled ? 'move' : 'default') : 'default',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
      onClick={handleClick}
      data-testid={`tavolo-${tavolo.id}`}
    >
      {/* Nome tavolo */}
      <span style={{ fontSize: Math.max(diametro * 0.25, 10), fontWeight: 'bold', color: isImperiale ? '#92400e' : undefined }}>
        {tavolo.numero}
      </span>
      <span style={{ fontSize: Math.max(diametro * 0.14, 8), color: '#4b5563' }}>
        {tavolo.posti}p
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

      {/* Label imperiale */}
      {isImperiale && !selected && (
        <span style={{ fontSize: 8, color: '#b45309', position: 'absolute', bottom: 2 }}>IMP</span>
      )}

      {/* Controlli quando selezionato */}
      {editabile && selected && (
        <div 
          style={{ 
            position: 'absolute',
            bottom: -52,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff', 
            borderRadius: 8, 
            padding: '6px 8px',
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
            onPointerDown={e => e.stopPropagation()}
            style={{
              width: 48,
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: '2px 4px',
              textAlign: 'center'
            }}
            data-testid={`rename-tavolo-${tavolo.id}`}
          />
          <input
            type="number"
            min={1}
            max={40}
            value={tavolo.posti || 1}
            onChange={(e) => onUpdatePosti(Math.max(1, Number(e.target.value) || 1))}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ width: 48, border: '1px solid #ccc', borderRadius: 4, padding: '2px 4px' }}
            data-testid={`posti-tavolo-${tavolo.id}`}
          />
        </div>
      )}
    </div>
  )
}
