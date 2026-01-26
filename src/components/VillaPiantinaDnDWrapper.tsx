import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { useState, useEffect } from 'react'

export default function VillaPiantinaDnDWrapper({ children }: { children: React.ReactNode }) {
  const [isTouch, setIsTouch] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setIsTouch(
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) || (navigator.maxTouchPoints > 0))
    )
    setHydrated(true)
  }, [])

  if (!hydrated) return null

  return (
    <DndProvider
      backend={isTouch ? TouchBackend : HTML5Backend}
      options={isTouch ? { enableMouseEvents: true } : undefined}
    >
      {children}
    </DndProvider>
  )
}
