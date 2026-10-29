import { useState } from "react"

const STORAGE_KEY = "sidebar-width"
const DEFAULT_WIDTH = 256
const MIN_WIDTH = 208
const MAX_WIDTH = 420

const clamp = (width: number) =>
  Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)))

export function useSidebarWidth() {
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return stored ? clamp(stored) : DEFAULT_WIDTH
  })

  function update(next: number) {
    const clamped = clamp(next)
    setWidth(clamped)
    localStorage.setItem(STORAGE_KEY, String(clamped))
  }

  return [width, update] as const
}

// Drag handle on the sidebar's right edge. The sidebar sits flush at the left
// of the viewport, so the pointer's x position is the new width.
export function SidebarResizeHandle({
  onWidthChange,
}: {
  onWidthChange: (width: number) => void
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Seitenleiste anpassen"
      title="Ziehen zum Anpassen, Doppelklick zum Zurücksetzen"
      className="absolute inset-y-0 -right-2 z-20 hidden w-4 cursor-col-resize after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:transition-colors hover:after:bg-sidebar-border md:block"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        document.body.dataset.sidebarResizing = ""
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          onWidthChange(event.clientX)
        }
      }}
      onPointerUp={() => delete document.body.dataset.sidebarResizing}
      onLostPointerCapture={() => delete document.body.dataset.sidebarResizing}
      onDoubleClick={() => onWidthChange(DEFAULT_WIDTH)}
    />
  )
}
