'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Award, Check, ClipboardPaste, FileImage, IdCard, ImageOff, Loader2, Maximize2, QrCode, RotateCw, Sparkles, Upload } from 'lucide-react'
import { AI_MODELS, analyzeAndUploadDocs, getFilesFromClipboard, getSavedAiModel, scanQrFromDataUrls, setSavedAiModel, type AiModelId } from '@/lib/ai-doc'
import type { EditFields } from '@/lib/types'
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

interface Props {
  file: string
  studentRow?: number
  onApplyFields?: (fields: Partial<EditFields>) => Promise<void> | void
}

export default function DocImages({ file, studentRow, onApplyFields }: Props) {
  const [images, setImages] = useState<Img[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const [rot, setRot] = useState<Record<number, number>>({})

  const [showUpload, setShowUpload] = useState(false)
  const [passFiles, setPassFiles] = useState<File[]>([])
  const [certFiles, setCertFiles] = useState<File[]>([])
  const [model, setModel] = useState<AiModelId>(() => getSavedAiModel())
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [extracted, setExtracted] = useState<Partial<EditFields> | null>(null)
  const [qrResult, setQrResult] = useState<string | null>(null)

  const passInputRef = useRef<HTMLInputElement>(null)
  const certInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    setImages(null)
    setError('')
    setRot({})
    setExtracted(null)
    setQrResult(null)
    setStatusMsg('')
    setPassFiles([])
    setCertFiles([])
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
  }, [file, studentRow])

  const handlePaste = useCallback(async (target: 'pass' | 'cert') => {
    const files = await getFilesFromClipboard()
    if (!files.length) {
      setStatusMsg("Buferda rasm yoki fayl topilmadi (avval rasmni Ctrl+C qiling)")
      return
    }
    if (target === 'pass') setPassFiles((prev) => [...prev, ...files].slice(0, 2))
    else setCertFiles((prev) => [...prev, ...files].slice(0, 2))
    setStatusMsg(`${files.length} ta fayl buferdan qo'shildi`)
  }, [])

  const handleRunAi = async () => {
    setBusy(true)
    setStatusMsg('AI va QR tahlil bajarilmoqda…')
    try {
      const res = await analyzeAndUploadDocs({
        row: studentRow,
        passFiles,
        certFiles,
        existingImages: images?.map((i) => i.src) ?? [],
        model,
      })
      setStatusMsg(res.message)
      if (res.qrFound) setQrResult(res.qrFound)
      if (Object.keys(res.fields).length > 0) {
        setExtracted(res.fields)
      }
      if (res.images.length > (images?.length ?? 0)) {
        const kinds = await Promise.all(res.images.map(classify))
        setImages(res.images.map((src, i) => ({ src, kind: kinds[i] })))
        if (file) cache.delete(file)
      }
    } catch (e) {
      setStatusMsg(`Tahlil xatosi: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleScanQrOnly = async () => {
    setBusy(true)
    setStatusMsg('QR kod qidirilmoqda…')
    try {
      const srcs = images?.map((i) => i.src) ?? []
      const qr = await scanQrFromDataUrls(srcs)
      if (qr) {
        setQrResult(qr)
        setStatusMsg(`QR kod topildi: ${qr}`)
      } else {
        setStatusMsg("Rasmlardan QR kod topilmadi (yoki AI Tahlil tugmasini bosing)")
      }
    } finally {
      setBusy(false)
    }
  }

  const handleApply = async () => {
    if (!extracted || !onApplyFields) return
    setBusy(true)
    try {
      await onApplyFields(extracted)
      setExtracted(null)
      setShowUpload(false)
      setStatusMsg("Ma'lumotlar talaba kartasiga muvaffaqiyatli saqlandi ✓")
    } finally {
      setBusy(false)
    }
  }

  const hasBoth = (images ?? []).some((i) => i.kind === 'passport') && (images ?? []).some((i) => i.kind === 'diploma')
  const label = (img: Img, i: number) => {
    const kind = hasBoth ? img.kind : i === 0 ? 'passport' : 'diploma'
    return kind === 'passport' ? { icon: IdCard, text: 'Pasport / ID-karta', tone: 'text-blue-soft' } : { icon: Award, text: 'Shahodatnoma / Diplom', tone: 'text-emerald-soft' }
  }

  return (
    <div className="space-y-3">
      {/* Compact AI / QR / Upload toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-ink-900/80 p-2">
        <select
          value={model}
          onChange={(e) => { const m = e.target.value as AiModelId; setModel(m); setSavedAiModel(m) }}
          className="field h-8 w-auto min-w-[165px] py-1 pr-7 pl-2.5 text-[11.5px]"
          title="AI Tahlil modeli"
        >
          {AI_MODELS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>

        <button
          type="button"
          className="btn-ghost h-8 px-2.5 text-[11.5px]"
          onClick={() => void handleScanQrOnly()}
          disabled={busy || !images?.length}
          title="Hujjat rasmlaridan QR kodni skanerlash"
        >
          <QrCode size={13} className="text-emerald-soft" /> QR Skaner
        </button>

        <button
          type="button"
          className={cx('btn-ghost ml-auto h-8 px-2.5 text-[11.5px]', showUpload && 'border-sky/50 text-sky-soft')}
          onClick={() => setShowUpload((v) => !v)}
        >
          <Upload size={13} className="text-sky" /> {showUpload ? 'Yopish' : 'Fayl / AI Tahlil'}
        </button>
      </div>

      {showUpload && (
        <div className="animate-pop-in space-y-3 rounded-2xl border border-sky/35 bg-ink-900/90 p-3.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-ink-950/60 p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-bold text-blue-soft">
                <span className="flex items-center gap-1.5"><IdCard size={13} /> Pasport (1–2 rasm/.docx)</span>
                <button type="button" className="text-[11px] text-sky hover:underline" onClick={() => void handlePaste('pass')}>
                  <ClipboardPaste size={11} className="mr-0.5 inline" /> Ctrl+V
                </button>
              </div>
              <input
                ref={passInputRef}
                type="file"
                accept="image/*,.docx"
                multiple
                onChange={(e) => setPassFiles(Array.from(e.target.files || []).slice(0, 2))}
                className="hidden"
              />
              <button type="button" className="btn-ghost h-8 w-full justify-center text-[11.5px]" onClick={() => passInputRef.current?.click()}>
                <Upload size={13} /> {passFiles.length ? `${passFiles.length} ta fayl tanlandi` : 'Fayl tanlash…'}
              </button>
            </div>

            <div className="rounded-xl border border-line bg-ink-950/60 p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-bold text-emerald-soft">
                <span className="flex items-center gap-1.5"><Award size={13} /> Shahodatnoma / Diplom</span>
                <button type="button" className="text-[11px] text-sky hover:underline" onClick={() => void handlePaste('cert')}>
                  <ClipboardPaste size={11} className="mr-0.5 inline" /> Ctrl+V
                </button>
              </div>
              <input
                ref={certInputRef}
                type="file"
                accept="image/*,.docx"
                multiple
                onChange={(e) => setCertFiles(Array.from(e.target.files || []).slice(0, 2))}
                className="hidden"
              />
              <button type="button" className="btn-ghost h-8 w-full justify-center text-[11.5px]" onClick={() => certInputRef.current?.click()}>
                <Upload size={13} /> {certFiles.length ? `${certFiles.length} ta fayl tanlandi` : 'Fayl tanlash…'}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary h-9 w-full justify-center text-[12.5px]"
            disabled={busy}
            onClick={() => void handleRunAi()}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {busy ? 'Tahlil qilinmoqda…' : passFiles.length || certFiles.length ? 'Yuklash va AI + QR Tahlil qilish' : 'Mavjud hujjatni AI + QR Tahlil qilish'}
          </button>
        </div>
      )}

      {(statusMsg || qrResult) && (
        <div className="rounded-xl border border-line bg-ink-900/80 px-3 py-2 text-[12px] text-fg-muted">
          {statusMsg && <div>{statusMsg}</div>}
          {qrResult && (
            <div className="mt-1 flex items-center gap-2 text-emerald-soft">
              <QrCode size={13} />
              <a href={qrResult} target="_blank" rel="noreferrer" className="truncate underline hover:text-emerald">{qrResult}</a>
            </div>
          )}
        </div>
      )}

      {extracted && Object.keys(extracted).length > 0 && (
        <div className="animate-pop-in space-y-2 rounded-2xl border border-emerald/45 bg-emerald/10 p-3 text-[12px]">
          <div className="font-bold text-emerald-soft">AI aniqlagan ma'lumotlar:</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-fg">
            {extracted.ism && <div><span className="text-fg-muted">Ism:</span> <b>{extracted.ism}</b></div>}
            {extracted.pv && <div><span className="text-fg-muted">Pasport:</span> <b className="mono">{extracted.pv}</b></div>}
            {extracted.pinfl && <div><span className="text-fg-muted">JSHSHIR:</span> <b className="mono">{extracted.pinfl}</b></div>}
            {extracted.dob && <div><span className="text-fg-muted">Sana:</span> <b>{extracted.dob}</b></div>}
            {extracted.sh_doc && <div><span className="text-fg-muted">Hujjat №:</span> <b className="mono">{extracted.sh_doc}</b></div>}
            {extracted.yil && <div><span className="text-fg-muted">Yil:</span> <b>{extracted.yil}</b></div>}
          </div>
          {onApplyFields && (
            <button type="button" className="btn-success mt-1 h-8 w-full justify-center text-[12px]" onClick={() => void handleApply()} disabled={busy}>
              <Check size={14} /> Kartaga qo'llash va saqlash
            </button>
          )}
        </div>
      )}

      {images === null ? (
        <div className="grid gap-3">
          {[0, 1].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl border border-line bg-ink-850" />)}
        </div>
      ) : !images.length ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-ink-950/40 px-6 py-12 text-center">
          <ImageOff size={28} className="text-fg-subtle" />
          <div className="text-[13.5px] font-semibold text-fg">{file ? "Hujjat rasmlari topilmadi" : 'Hujjat fayli biriktirilmagan'}</div>
          <div className="text-[12px] text-fg-muted">{error || (file ? file : "Yuqoridagi «Fayl / AI Tahlil» tugmasi orqali pasport va shahodatnomani biriktiring")}</div>
        </div>
      ) : (
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
          {file && <div className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle"><FileImage size={13} /> {file}</div>}
          {open !== null && (
            <Lightbox images={images.map((i) => i.src)} index={open} onIndex={setOpen} onClose={() => setOpen(null)} initialRotation={rot[open] ?? 0} />
          )}
        </div>
      )}
    </div>
  )
}
