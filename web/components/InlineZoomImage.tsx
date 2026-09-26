'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cx } from './ui'

const MIN = 1
const MAX = 6
const STEP = 1.15

interface View { z: number; x: number; y: number }

/**
 * Kartadagi hujjat rasmini joyida kattalashtirish: Shift + g'ildirak — kursor turgan nuqtaga zoom,
 * kattalashganda sichqoncha bilan surish, ikki marta bosish — asl holat.
 * Kattalashtirilmagan holatda bosish — onOpen (to'liq ekran).
 */
export default function InlineZoomImage({ src, alt, rotation, imgClassName, onOpen, onZoomChange, resetKey }: {
  src: string
  alt: string
  rotation: number
  imgClassName?: string
  onOpen: () => void
  onZoomChange?: (zoom: number) => void
  resetKey?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null)
  const dragged = useRef(false)
  const [panning, setPanning] = useState(false)
  const onZoomRef = useRef(onZoomChange)
  useEffect(() => { onZoomRef.current = onZoomChange })

  const apply = useCallback((v: View) => {
    const el = box.current
    if (el) {
      // rasm konteynerdan chiqib ketmasin
      const w = el.clientWidth, h = el.clientHeight
      v = { z: v.z, x: Math.min(0, Math.max(w - w * v.z, v.x)), y: Math.min(0, Math.max(h - h * v.z, v.y)) }
    }
    if (v.z <= MIN) v = { z: 1, x: 0, y: 0 }
    viewRef.current = v
    setView(v)
    onZoomRef.current?.(v.z)
  }, [])

  // Burilganda yoki tashqaridan "asl holat" bosilganda zoom bekor qilinadi
  useEffect(() => { apply({ z: 1, x: 0, y: 0 }) }, [rotation, resetKey, src, apply])

  // React onWheel passive — sahifa aylanib ketmasligi uchun native listener (passive: false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return
      e.preventDefault()
      // Shift bosilganda ko'p brauzerlar deltaY ni deltaX ga o'tkazadi
      const d = e.deltaY || e.deltaX
      if (!d) return
      const cur = viewRef.current
      const z = Math.max(MIN, Math.min(MAX, d < 0 ? cur.z * STEP : cur.z / STEP))
      const r = el.getBoundingClientRect()
      const px = e.clientX - r.left, py = e.clientY - r.top
      apply({ z, x: px - (px - cur.x) * (z / cur.z), y: py - (py - cur.y) * (z / cur.z) })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [apply])

  const zoomed = view.z > 1

  return (
    <div className="bg-ink-950 p-2">
      <div
        ref={box}
        role="button"
        tabIndex={0}
        title={zoomed ? "Surish — sichqoncha bilan · Asl holat — ikki marta bosing" : "Shift + g'ildirak — shu yerda kattalashtirish · Bosish — to'liq ekran"}
        className={cx('relative block w-full overflow-hidden rounded-lg select-none', zoomed ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-zoom-in')}
        onPointerDown={(e) => {
          dragged.current = false
          if (!zoomed || e.button !== 0) return
          drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false }
          e.currentTarget.setPointerCapture(e.pointerId)
          setPanning(true)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          const dx = e.clientX - d.sx, dy = e.clientY - d.sy
          if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
          apply({ z: viewRef.current.z, x: d.vx + dx, y: d.vy + dy })
        }}
        onPointerUp={() => { dragged.current = !!drag.current?.moved; drag.current = null; setPanning(false) }}
        onClick={() => { if (!zoomed && !dragged.current) onOpen() }}
        onDoubleClick={() => apply({ z: 1, x: 0, y: 0 })}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      >
        <div
          className={cx('origin-top-left', !panning && 'transition-transform duration-100 ease-out')}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            draggable={false}
            className={imgClassName}
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        </div>
      </div>
    </div>
  )
}
