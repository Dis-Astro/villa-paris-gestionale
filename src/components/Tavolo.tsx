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

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left,
        top,
        width: diametro,
        height: diametro,
        border: selected ? '2px solid #2563eb' : '1px solid #999',
        borderRadius: '50%',
        background: '#f9f9f9',
        textAlign: 'center',
        lineHeight: `${diametro}px`,
        transform: `rotate(${tavolo.rotazione || 0}deg)`,
        zIndex: selected ? 10 : 1,
        cursor: editabile ? 'move' : 'default',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
      onClick={onSelect}
    >
      {tavolo.numero}
      {editabile && selected && (
        <div style={{ marginTop: 8, background: '#fff', borderRadius: 4, padding: 2 }}>
          <button
            onClick={onDelete}
            style={{
              color: 'red',
              marginRight: 4,
              border: 0,
              background: 'none'
            }}
          >🗑</button>
          <button
            onClick={() => onRotate(((tavolo.rotazione || 0) + 45) % 360)}
            style={{ border: 0, background: 'none' }}
          >↻</button>
          <input
            type="text"
            value={tavolo.numero}
            onChange={e => onRename(e.target.value)}
            style={{
              width: 40,
              marginLeft: 4,
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: '0 2px'
            }}
          />
        </div>
      )}
    </div>
  )
}
