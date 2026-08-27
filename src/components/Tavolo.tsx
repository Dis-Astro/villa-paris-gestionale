'use client'

import { useEffect, useRef, useState } from 'react'
import { type VariantiTavolo, VARIANTI_DEFAULT } from '@/lib/types'

type TavoloProps = {
  tavolo: {
    id: number
    numero: string
    posti: number
    posizione: { xPerc: number; yPerc: number }
    rotazione?: number
    forma?: string
    dimensionePerc: number
    varianti?: VariantiTavolo
    note?: string
    [key: string]: any
  }
  selected: boolean
  onSelect: () => void
  onDragEnd: (pos: { x: number; y: number }) => void
  onRotate: (rot: number) => void
  onDelete: () => void
  onRename: (nome: string) => void
  onUpdatePosti: (posti: number) => void
  onOpenVarianti?: () => void
  editabile: boolean
  dragEnabled?: boolean
  viewScale?: number
  containerRef: React.RefObject<HTMLDivElement | null>
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

export default function Tavolo({
  tavolo,
  selected,
  onSelect,
  onDragEnd,
  editabile,
  dragEnabled = true,
  viewScale = 1,
  containerRef,
}: TavoloProps) {
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 })
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<DragState | null>(null)
  const previewPositionRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      setContainerSize({ width: container.clientWidth || rect.width || 1, height: container.clientHeight || rect.height || 1 })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef])

  useEffect(() => {
    if (!dragging) setPreviewPosition(null)
  }, [tavolo.posizione?.xPerc, tavolo.posizione?.yPerc, dragging])

  useEffect(() => {
    const finishFromWindow = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      if (previewPositionRef.current) onDragEnd(previewPositionRef.current)
      dragRef.current = null
      previewPositionRef.current = null
      setDragging(false)
      setPreviewPosition(null)
    }
    window.addEventListener('pointerup', finishFromWindow)
    window.addEventListener('pointercancel', finishFromWindow)
    return () => {
      window.removeEventListener('pointerup', finishFromWindow)
      window.removeEventListener('pointercancel', finishFromWindow)
    }
  }, [onDragEnd])

  const posizione = previewPosition ?? {
    x: tavolo.posizione?.xPerc ?? 0,
    y: tavolo.posizione?.yPerc ?? 0,
  }
  const left = posizione.x * containerSize.width
  const top = posizione.y * containerSize.height
  const isImperiale = tavolo.forma === 'imperiale'
  const diametro = (tavolo.dimensionePerc ?? 0.03) * containerSize.width
  const width = isImperiale ? diametro * 3 : diametro
  const height = isImperiale ? diametro * 0.8 : diametro
  const hitWidth = Math.max(width, 46 / viewScale)
  const hitHeight = Math.max(height, 46 / viewScale)

  const hasVarianti = Boolean(tavolo.varianti && Object.keys(tavolo.varianti).length)
  const totaleVarianti = hasVarianti
    ? Object.values(tavolo.varianti!).reduce((sum, value) => sum + (value || 0), 0)
    : 0
  const variantePrincipale = hasVarianti
    ? Object.entries(tavolo.varianti!).reduce(
        (max, [key, value]) => (value || 0) > (max.value || 0) ? { key, value } : max,
        { key: '', value: 0 },
      )
    : null
  const coloreBadge = variantePrincipale?.key
    ? VARIANTI_DEFAULT[variantePrincipale.key as keyof typeof VARIANTI_DEFAULT]?.colore || '#718d7e'
    : '#718d7e'

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    onSelect()
    if (!editabile || !dragEnabled || event.button > 0) return
    event.preventDefault()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: tavolo.posizione?.xPerc ?? 0,
      originY: tavolo.posizione?.yPerc ?? 0,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const maxX = Math.max(0, 1 - width / containerSize.width)
    const maxY = Math.max(0, 1 - height / containerSize.height)
    const nextPosition = {
      x: Math.max(0, Math.min(maxX, drag.originX + (event.clientX - drag.startX) / (containerSize.width * viewScale))),
      y: Math.max(0, Math.min(maxY, drag.originY + (event.clientY - drag.startY) / (containerSize.height * viewScale))),
    }
    previewPositionRef.current = nextPosition
    setPreviewPosition(nextPosition)
  }

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    if (previewPositionRef.current) onDragEnd(previewPositionRef.current)
    dragRef.current = null
    previewPositionRef.current = null
    setDragging(false)
    setPreviewPosition(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const borderColor = selected ? '#173c37' : hasVarianti ? coloreBadge : isImperiale ? '#a67832' : '#718d7e'
  const bgColor = isImperiale ? '#f3e5bf' : '#fffdf8'

  return (
    <div
      className="absolute grid place-items-center"
      style={{
        left: left - (hitWidth - width) / 2,
        top: top - (hitHeight - height) / 2,
        width: hitWidth,
        height: hitHeight,
        zIndex: selected || dragging ? 20 : 2,
        cursor: editabile && dragEnabled ? (dragging ? 'grabbing' : 'grab') : 'default',
        touchAction: editabile && dragEnabled ? 'none' : 'manipulation',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={finishDrag}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect()
      }}
      role="button"
      tabIndex={editabile ? 0 : -1}
      aria-label={`${tavolo.numero}, ${tavolo.posti} posti`}
      aria-pressed={selected}
      data-testid={`tavolo-${tavolo.id}`}
    >
      <div
        className="relative flex flex-col items-center justify-center text-center shadow-[0_3px_10px_rgba(24,55,50,.12)] transition-[box-shadow,opacity]"
        style={{
          width,
          height,
          border: selected ? `3px solid ${borderColor}` : `1.5px solid ${borderColor}`,
          outline: selected ? '4px solid rgba(201,169,106,.28)' : undefined,
          borderRadius: isImperiale ? Math.max(7, height * 0.2) : '50%',
          background: hasVarianti ? `linear-gradient(135deg, ${coloreBadge}20, ${bgColor} 60%)` : bgColor,
          transform: `rotate(${tavolo.rotazione || 0}deg) scale(${dragging ? 1.04 : 1})`,
          opacity: dragging ? 0.9 : 1,
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: Math.max(diametro * 0.24, 9), fontWeight: 700, color: '#173c37', lineHeight: 1 }}>
          {tavolo.numero}
        </span>
        <span style={{ fontSize: Math.max(diametro * 0.14, 8), color: '#667a75', lineHeight: 1.15 }}>
          {tavolo.posti}p
        </span>
        {hasVarianti && (
          <div
            className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: coloreBadge }}
            data-testid={`badge-varianti-${tavolo.id}`}
          >
            {totaleVarianti}
          </div>
        )}
      </div>
    </div>
  )
}
