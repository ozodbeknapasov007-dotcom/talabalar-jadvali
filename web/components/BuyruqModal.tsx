'use client'

import { useEffect, useRef, useState } from 'react'
import { FileSignature, X } from 'lucide-react'
import { fullName, isAcademicLeave, ORDER_DATE_RE } from '@/lib/student'
import type { Student } from '@/lib/types'
import { GroupBadge } from './ui'

export interface Buyruq { buyruq: string; buyruq_sana: string }

const today = () => new Date().toLocaleDateString('ru-RU') // KK.OO.YYYY

/**
 * Talabani safdan chiqarish yoki akademik ta'tilga o'tkazishda buyruq raqami va
 * sanasini so'raydi. Bekor qilinsa guruh o'zgarmaydi.
 */
export default function BuyruqModal({ student, group, onSubmit, onCancel }: {
  student: Student
  group: string
  onSubmit: (b: Buyruq) => void
  onCancel: () => void
}) {
  const [raqam, setRaqam] = useState('')
  const [sana, setSana] = useState(today)
  const [error, setError] = useState('')
  const first = useRef<HTMLInputElement>(null)

  useEffect(() => { first.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  const submit = () => {
    if (!raqam.trim()) return setError('Buyruq raqamini kiriting')
    if (!ORDER_DATE_RE.test(sana.trim())) return setError('Sanani KK.OO.YYYY ko\'rinishida kiriting (masalan 29.09.2026)')
    onSubmit({ buyruq: raqam.trim(), buyruq_sana: sana.trim() })
  }

  const action = isAcademicLeave(group) ? "akademik ta'tilga o'tkazish" : 'talabalar safidan chiqarish'

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
      onClick={(e) => e.stopPropagation()}
    >
      <form
        className="animate-pop-in w-full max-w-[440px] space-y-4 rounded-3xl border border-line-strong bg-ink-900 p-5 shadow-2xl shadow-black/60"
        role="dialog"
        aria-modal="true"
        aria-label="Buyruq ma'lumotlari"
        onSubmit={(e) => { e.preventDefault(); submit() }}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber/15 text-amber"><FileSignature size={20} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-bold text-fg">Buyruq ma'lumotlari</h3>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              <b className="text-fg">{fullName(student)}</b> — {action}
            </p>
            <div className="mt-1.5"><GroupBadge group={group} /></div>
          </div>
          <button type="button" className="grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-ink-700 hover:text-fg" onClick={onCancel} title="Bekor qilish (Esc)">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Buyruq raqami *</span>
            <input ref={first} value={raqam} onChange={(e) => { setRaqam(e.target.value); setError('') }} className="field mono" placeholder="123-T" spellCheck={false} />
          </label>
          <label className="block">
            <span className="label">Buyruq sanasi *</span>
            <input value={sana} onChange={(e) => { setSana(e.target.value); setError('') }} className="field mono" placeholder="KK.OO.YYYY" spellCheck={false} />
          </label>
        </div>
        {error && <div className="rounded-xl border border-rose/45 bg-rose/10 px-3 py-2 text-[12.5px] text-rose">{error}</div>}

        <div className="flex gap-2">
          <button type="submit" className="btn-success flex-1 py-2.5">Saqlash</button>
          <button type="button" className="btn-ghost py-2.5" onClick={onCancel}>Bekor qilish</button>
        </div>
      </form>
    </div>
  )
}
