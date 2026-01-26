'use client'

import { useDrag } from 'react-dnd'
import { useRef, useEffect, useState } from 'react'

type StazioneProps = {
  stazione: {
    id: number
    nome: string
    tipo?: string
    posizione: { xPerc: number, yPerc: number }
    rotazione?: number
    dimensionePerc?: {
      larghezzaPerc: number
      altezzaPerc: number
    }
    [key: string]: any
  }
  selected: boolean
  onSelect: () => void
  onDragEnd: (pos: { x: number, y: number }) => void
  onRotate: (rot: number) => void
  onDelete: () => void
  onRename: (nome: string) => void
  editabile: boolean
  containerRef: React.RefObject<HTMLDivElement> // obbligatorio!
}

export default function Stazione({
  stazione,
  selected,
  onSelect,
  onDragEnd,
  onRotate,
  onDelete,
  onRename,
  editabile,
  containerRef
}: StazioneProps) {
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

  const left = (stazione.posizione?.xPerc ?? 0) * containerSize.width
  const top = (stazione.posizione?.yPerc ?? 0) * containerSize.height
  const larghezza = (stazione.dimensionePerc?.larghezzaPerc ?? 0.15) * containerSize.width
  const altezza = (stazione.dimensionePerc?.altezzaPerc ?? 0.06) * containerSize.height

  const [, drag] = useDrag({
    type: 'STAZIONE',
    item: { id: stazione.id },
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
        width: larghezza,
        height: altezza,
        border: selected ? '2px solid #16a34a' : '1px solid #999',
        borderRadius: 12,
        background: '#e9f7ef',
        textAlign: 'center',
        lineHeight: `${altezza}px`,
        transform: `rotate(${stazione.rotazione || 0}deg)`,
        zIndex: selected ? 10 : 1,
        cursor: editabile ? 'move' : 'default',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
      onClick={onSelect}
    >
      {stazione.nome}
      {editabile && selected && (
        <div style={{ marginTop: 8, background: '#fff', borderRadius: 4, padding: 2 }}>
          <button onClick={onDelete} style={{ color: 'red', marginRight: 4, border: 0, background: 'none' }}>🗑</button>
          <button onClick={() => onRotate(((stazione.rotazione || 0) + 45) % 360)} style={{ border: 0, background: 'none' }}>↻</button>
          <input
            type="text"
            value={stazione.nome}
            onChange={e => onRename(e.target.value)}
            style={{ width: 80, marginLeft: 4, border: '1px solid #ccc', borderRadius: 4, padding: '0 2px' }}
          />
        </div>
      )}
    </div>
  )
}
