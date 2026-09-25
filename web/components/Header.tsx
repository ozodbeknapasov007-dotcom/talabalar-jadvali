'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, CloudCheck, CloudUpload, FileSpreadsheet, Loader2, RefreshCw, Download } from 'lucide-react'
import { exportRole, ROLE_META, type Role } from '@/lib/excel'
import type { Student } from '@/lib/types'
import type { Notify } from './Toast'
import { cx } from './ui'

interface SyncInfo { mode: 'local' | 'github'; state?: string; pending?: boolean; pending_seconds?: number; last_sync?: string }

/** Saqlash holati: brauzerdagi kutilayotgan o'zgarishlar + (lokalda) Python xizmatining GitHub navbati */
function SyncBadge({ pendingCount, notify }: { pendingCount: number; notify: Notify }) {
  const [info, setInfo] = useState<SyncInfo | null>(null)
  const [flushing, setFlushing] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/sync', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => alive && setInfo(d))
        .catch(() => {})
    load()
    const t = setInterval(load, 8000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const local = info?.mode === 'local'
  const offline = local && info?.state === 'offline'
  const gitPending = local && (info?.pending || info?.state === 'pending' || info?.state === 'syncing')
  const busy = pendingCount > 0 || gitPending

  const flush = async () => {
    setFlushing(true)
    try {
      const r = await fetch('/api/sync', { method: 'POST' }).then((x) => x.json())
      notify(r.success ? (r.had_pending ? "GitHub'ga yuborilmoqda..." : "Yuboriladigan o'zgarish yo'q") : r.error || 'Xatolik', r.success ? 'success' : 'error')
    } finally {
      setFlushing(false)
    }
  }

  let text: string
  if (offline) text = 'Python xizmati o\'chiq'
  else if (pendingCount > 0) text = `${pendingCount} ta o'zgarish saqlanmoqda`
  else if (gitPending) text = info?.state === 'syncing' ? "GitHub'ga yuborilmoqda" : `GitHub navbatda${info?.pending_seconds ? ` (${info.pending_seconds}s)` : ''}`
  else text = 'Hammasi saqlangan'

  return (
    <div className="flex items-center gap-2">
      <span
        className={cx(
          'chip h-9 rounded-xl px-3 text-[12.5px]',
          offline ? 'border-rose/45 bg-rose/10 text-rose' : busy ? 'border-sky/40 bg-sky/10 text-sky-soft' : 'border-emerald/40 bg-emerald/10 text-emerald-soft',
        )}
        title={local ? "Lokal rejim: o'zgarishlar kompyuterdagi Python xizmati orqali Excelga yoziladi" : "O'zgarishlar GitHub navbatiga yoziladi; kompyuterdagi xizmat ularni Excelga qo'llaydi"}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <CloudCheck size={14} />}
        {text}
      </span>
      {local && !offline && (
        <button type="button" className="btn-ghost h-9" onClick={flush} disabled={flushing} title="30 soniyani kutmasdan hisobotni qayta yaratib GitHub'ga yuborish">
          <CloudUpload size={15} />
          <span className="hidden sm:inline">Hozir yuborish</span>
        </button>
      )}
    </div>
  )
}

function ExportMenu({ students, notify }: { students: Student[]; notify: Notify }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<Role | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const run = async (role: Role) => {
    setBusy(role)
    try {
      const sheets = await exportRole(students, role)
      notify(`${ROLE_META[role].title}: ${sheets} sahifali Excel yuklab olindi`)
      setOpen(false)
    } catch (e) {
      notify(`Excel yaratilmadi: ${(e as Error).message}`, 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn-primary h-9" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <FileSpreadsheet size={16} />
        Excel<span className="hidden sm:inline"> eksport</span>
        <ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="animate-pop-in absolute right-0 z-50 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-ink-850 p-2 shadow-2xl shadow-black/50">
          <div className="px-3 pt-2 pb-2 text-[11px] font-bold tracking-wider text-fg-subtle uppercase">4 bo'lim uchun .xlsx</div>
          {(Object.keys(ROLE_META) as Role[]).map((role, i) => (
            <button
              key={role}
              type="button"
              onClick={() => run(role)}
              disabled={!!busy}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink-700/60"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald/20 to-sky/20 text-[13px] font-bold text-sky-soft">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-fg">{ROLE_META[role].title}</span>
                <span className="block truncate text-[12px] text-fg-muted">{ROLE_META[role].sub}</span>
              </span>
              {busy === role ? <Loader2 size={16} className="animate-spin text-sky" /> : <Download size={16} className="text-fg-subtle group-hover:text-sky" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Header({
  students, pendingCount, onRefresh, refreshing, onAdd, notify,
}: { students: Student[]; pendingCount: number; onRefresh: () => void; refreshing: boolean; onAdd: () => void; notify: Notify }) {
  return (
    <header className="z-40 border-b border-line bg-ink-950/85 backdrop-blur-md sm:sticky sm:top-0">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-sky/30 bg-gradient-to-br from-emerald/20 via-blue/20 to-sky/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="size-7" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[0.14em] text-emerald-soft uppercase">Shahrisabz Tibbiyot Texnikumi</div>
            <h1 className="truncate text-[17px] font-extrabold tracking-tight text-fg">
              Talabalar portali <span className="font-semibold text-fg-subtle">· 2026/2027</span>
            </h1>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <SyncBadge pendingCount={pendingCount} notify={notify} />
          <button type="button" className="btn-success h-9" onClick={onAdd} title="Yangi talaba qo'shish">
            <span className="text-[15px] leading-none font-bold">+</span>
            <span>Talaba qo'shish</span>
          </button>
          <button type="button" className="btn-ghost h-9" onClick={onRefresh} disabled={refreshing} title="Serverdan eng yangi ma'lumotni olish">
            <RefreshCw size={15} className={cx(refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Yangilash</span>
          </button>
          <ExportMenu students={students} notify={notify} />
        </div>
      </div>
    </header>
  )
}
