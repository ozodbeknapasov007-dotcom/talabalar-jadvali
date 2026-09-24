'use client'

import { useEffect, useState } from 'react'
import { Award, FileImage, IdCard, ImageOff, Maximize2, RotateCw } from 'lucide-react'
import Lightbox from './Lightbox'
import { cx } from './ui'

type Kind = 'passport' | 'diploma'
interface Img { src: string; kind: Kind }

const cache = new Map<string, string[]>()

/** Rasmning o'lchamiga qarab turini aniqlash: eni kattaroq — pasport/ID, bo'yi kattaroq — A4 diplom/shahodatnoma */
function classify(src: string): Promise<Kind> {
  return new Promise((resolve) => {
    const im = new Image()
    im.onload = () => resolve(im.naturalHeight > im.naturalWidth * 1.05 ? 'diploma' : 'passport')
    im.onerror = () => resolve('passport')
    im.src = src
  })
}

export default function DocImages({ file }: { file: string }) {
  const [images, setImages] = useState<Img[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const [rot, setRot] = useState<Record<number, number>>({})

  useEffect(() => {
    let alive = true
    setImages(null)
    setError('')
    setRot({})
    if (!file) { setImages([]); return }

    const load = async () => {
      let srcs = cache.get(file)
      if (!srcs) {
        const res = await fetch(`/api/doc-preview?file=${encodeURIComponent(file)}`)
        const body = await res.json()
        srcs = (body.images as string[]) ?? []
        if (!srcs.length && body.error) throw new Error(body.error)
        cache.set(file, srcs)
      }
      const kinds = await Promise.all(srcs.map(classify))
      if (alive) setImages(srcs.map((src, i) => ({ src, kind: kinds[i] })))
    }
    load().catch((e) => { if (alive) { setError((e as Error).message); setImages([]) } })
    return () => { alive = false }
  }, [file])

  if (images === null) {
    return (
      <div className="grid gap-3">
        {[0, 1].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl border border-line bg-ink-850" />)}
      </div>
    )
  }

  if (!images.length) {
    return (
      <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-ink-950/40 px-6 py-12 text-center">
        <ImageOff size={28} className="text-fg-subtle" />
        <div className="text-[13.5px] font-semibold text-fg">{file ? "Hujjat rasmlari topilmadi" : 'Hujjat fayli biriktirilmagan'}</div>
        <div className="text-[12px] text-fg-muted">{error || (file ? file : "Fayl biriktirish 2-bosqichda qo'shiladi")}</div>
      </div>
    )
  }

  // Hammasi bir turga tushib qolsa ham, birinchisi pasport, keyingilari diplom deb ko'rsatamiz
  const hasBoth = images.some((i) => i.kind === 'passport') && images.some((i) => i.kind === 'diploma')
  const label = (img: Img, i: number) => {
    const kind = hasBoth ? img.kind : i === 0 ? 'passport' : 'diploma'
    return kind === 'passport' ? { icon: IdCard, text: 'Pasport / ID-karta', tone: 'text-blue-soft' } : { icon: Award, text: 'Shahodatnoma / Diplom', tone: 'text-emerald-soft' }
  }

  return (
    <div className="grid gap-3">
      {images.map((img, i) => {
        const l = label(img, i)
        const Icon = l.icon
        const r = rot[i] ?? 0
        const sideways = Math.abs(r % 180) === 90
        return (
          <figure key={i} className="overflow-hidden rounded-2xl border border-line bg-ink-950/60">
            <figcaption className="flex items-center gap-2 border-b border-line px-3 py-2 text-[12px] font-semibold">
              <Icon size={14} className={l.tone} />
              <span className="text-fg">{l.text}</span>
              <span className="ml-auto flex items-center gap-1">
                <button type="button" className="grid size-7 place-items-center rounded-lg text-fg-muted hover:bg-ink-700 hover:text-fg" title="Burish" onClick={() => setRot((x) => ({ ...x, [i]: r + 90 }))}>
                  <RotateCw size={14} />
                </button>
                <button type="button" className="grid size-7 place-items-center rounded-lg text-fg-muted hover:bg-ink-700 hover:text-fg" title="To'liq ekranda" onClick={() => setOpen(i)}>
                  <Maximize2 size={14} />
                </button>
              </span>
            </figcaption>
            <button type="button" className="block w-full cursor-zoom-in bg-ink-950 p-2" onClick={() => setOpen(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={l.text}
                loading="lazy"
                className={cx('mx-auto rounded-lg object-contain transition-transform duration-200', sideways ? 'max-h-[300px]' : 'max-h-[440px]')}
                style={{ transform: `rotate(${r}deg)` }}
              />
            </button>
          </figure>
        )
      })}
      <div className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle"><FileImage size={13} /> {file}</div>
      {open !== null && (
        <Lightbox images={images.map((i) => i.src)} index={open} onIndex={setOpen} onClose={() => setOpen(null)} initialRotation={rot[open] ?? 0} />
      )}
    </div>
  )
}
