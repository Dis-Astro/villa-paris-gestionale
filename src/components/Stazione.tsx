'use client'

import { useEffect, useRef, useState } from 'react'

type StazioneProps = {
  stazione: {
    id: number
    nome: string
    tipo?: string
    posizione: { xPerc: number; yPerc: number }
    rotazione?: number
    dimensionePerc?: { larghezzaPerc: number; altezzaPerc: number }
    [key: string]: any
  }
  selected: boolean
  onSelect: () => void
  onDragEnd: (pos: { x: number; y: number }) => void
  onRotate: (rot: number) => void
  onDelete: () => void
  onRename: (nome: string) => void
  editabile: boolean
  dragEnabled?: boolean
  viewScale?: number
  containerRef: React.RefObject<HTMLDivElement | null>
}

export default function Stazione({ stazione, selected, onSelect, onDragEnd, editabile, dragEnabled = true, viewScale = 1, containerRef }: StazioneProps) {
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 })
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null)
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
    const finishFromWindow = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      if (previewPositionRef.current) onDragEnd(previewPositionRef.current)
      dragRef.current = null
      previewPositionRef.current = null
      setPreviewPosition(null)
    }
    window.addEventListener('pointerup', finishFromWindow)
    window.addEventListener('pointercancel', finishFromWindow)
    return () => {
      window.removeEventListener('pointerup', finishFromWindow)
      window.removeEventListener('pointercancel', finishFromWindow)
    }
  }, [onDragEnd])

  const posizione = previewPosition ?? { x: stazione.posizione?.xPerc ?? 0, y: stazione.posizione?.yPerc ?? 0 }
  const width = (stazione.dimensionePerc?.larghezzaPerc ?? 0.15) * containerSize.width
  const height = (stazione.dimensionePerc?.altezzaPerc ?? 0.06) * containerSize.height
  const hitWidth = Math.max(width, 46 / viewScale)
  const hitHeight = Math.max(height, 46 / viewScale)
  const left = posizione.x * containerSize.width
  const top = posizione.y * containerSize.height

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    onSelect()
    if (!editabile || !dragEnabled || event.button > 0) return
    event.preventDefault()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: stazione.posizione?.xPerc ?? 0,
      originY: stazione.posizione?.yPerc ?? 0,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const nextPosition = {
      x: Math.max(0, Math.min(Math.max(0, 1 - width / containerSize.width), drag.originX + (event.clientX - drag.startX) / (containerSize.width * viewScale))),
      y: Math.max(0, Math.min(Math.max(0, 1 - height / containerSize.height), drag.originY + (event.clientY - drag.startY) / (containerSize.height * viewScale))),
    }
    previewPositionRef.current = nextPosition
    setPreviewPosition(nextPosition)
  }

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    if (previewPositionRef.current) onDragEnd(previewPositionRef.current)
    dragRef.current = null
    previewPositionRef.current = null
    setPreviewPosition(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div
      className="absolute grid place-items-center"
      style={{
        left: left - (hitWidth - width) / 2,
        top: top - (hitHeight - height) / 2,
        width: hitWidth,
        height: hitHeight,
        zIndex: selected ? 20 : 3,
        touchAction: editabile && dragEnabled ? 'none' : 'manipulation',
        cursor: editabile && dragEnabled ? 'grab' : 'default',
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
      aria-label={stazione.nome}
      aria-pressed={selected}
      data-testid={`stazione-${stazione.id}`}
    >
      <div
        className="flex items-center justify-center overflow-hidden px-2 text-center font-semibold text-[#31594f] shadow-[0_3px_10px_rgba(24,55,50,.12)]"
        style={{
          width,
          height,
          minHeight: 16,
          border: selected ? '3px solid #3f7668' : '1.5px solid #718d7e',
          outline: selected ? '4px solid rgba(201,169,106,.28)' : undefined,
          borderRadius: Math.max(7, height * 0.25),
          background: '#e4eee7',
          transform: `rotate(${stazione.rotazione || 0}deg)`,
          fontSize: Math.max(9, Math.min(14, height * 0.35)),
          userSelect: 'none',
        }}
      >
        {stazione.nome}
      </div>
    </div>
  )
}
