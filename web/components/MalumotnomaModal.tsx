'use client'

import { useState } from 'react'
import { Download, FileText, Loader2, Send, X } from 'lucide-react'
import { malumotnomaBlocker, malumotnomaData, malumotnomaFileName, todayTashkent } from '@/lib/malumotnoma'
import { fullName } from '@/lib/student'
import type { Student } from '@/lib/types'
import { cx } from './ui'

/** DD.MM.YYYY ↔ YYYY-MM-DD (input type="date") */
const toIso = (d: string) => d.split('.').reverse().join('-')
const fromIso = (d: string) => d.split('-').reverse().join('.')

export default function MalumotnomaModal({ student: s, onClose }: { student: Student; onClose: () => void }) {
  const [sana, setSana] = useState(todayTashkent)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const blocker = malumotnomaBlocker(s)
  const d = malumotnomaData(s, sana)
  const href = `/api/malumotnoma?row=${s.row}&sana=${encodeURIComponent(sana)}`

  const send = async () => {
    setSending(true)
    setMsg(null)
    try {
      const res = await fetch('/api/malumotnoma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row: s.row, sana }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Server ${res.status} qaytardi`)
      setMsg({ ok: true, text: 'Telegram botga yuborildi' })
    } catch (e) {
      setMsg({ ok: false, text: `Yuborilmadi: ${(e as Error).message}` })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-[60] flex items-stretch justify-center bg-ink-950/85 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="animate-pop-in flex h-full w-full max-w-[720px] flex-col overflow-hidden border-line-strong bg-ink-900 shadow-2xl shadow-black/60 sm:h-auto sm:max-h-[94vh] sm:rounded-3xl sm:border" role="dialog" aria-modal="true" aria-label="Ma'lumotnoma">
        <header className="flex items-center gap-3 border-b border-line bg-ink-850/80 px-4 py-3">
          <FileText size={18} className="shrink-0 text-sky" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-extrabold text-fg">O‘qiyotganligi haqida ma’lumotnoma</h2>
            <div className="truncate text-[12px] text-fg-muted">{fullName(s)} · {s.group || '—'}</div>
          </div>
          <button type="button" className="grid size-9 place-items-center rounded-xl text-fg-muted hover:bg-ink-700 hover:text-fg" onClick={onClose} title="Yopish (Esc)"><X size={20} /></button>
        </header>

        {blocker ? (
          <div className="m-4 rounded-xl border border-rose/45 bg-rose/10 p-4 text-[13px] text-rose">{blocker}</div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2 border-b border-line px-4 py-3">
              <label className="block">
                <span className="label">Sana</span>
                <input
                  type="date"
                  className="field mono w-[170px]"
                  value={toIso(sana)}
                  onChange={(e) => { if (e.target.value) setSana(fromIso(e.target.value)) }}
                />
              </label>
              <div className="ml-auto flex gap-2">
                <a className="btn-primary h-[38px]" href={href} download={malumotnomaFileName(s)}>
                  <Download size={15} /> Yuklab olish (.docx)
                </a>
                <button type="button" className="btn-ghost h-[38px] text-sky hover:text-sky-soft" onClick={send} disabled={sending}>
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Botga yuborish
                </button>
              </div>
            </div>
            {msg && (
              <div className={cx('border-b px-4 py-2 text-[12.5px] font-semibold', msg.ok ? 'border-emerald/30 bg-emerald/10 text-emerald-soft' : 'border-rose/30 bg-rose/10 text-rose')}>{msg.text}</div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto bg-ink-950/60 p-4">
              {/* Faqat matn — Word fayldagi shablon (logotip, imzo) o'zgarmaydi */}
              <div className="mx-auto max-w-[620px] rounded-md bg-white px-7 py-6 text-[15px] leading-[2] text-black shadow-xl shadow-black/40" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                <div className="flex justify-between text-[14px] leading-normal"><span>Qarshi shahri</span><span>{d.sana} y.</span></div>
                <div className="my-4 text-center text-[17px] font-bold">MA’LUMOTNOMA</div>
                <p className="indent-10 text-justify">
                  Ushbu ma’lumotnoma shuni tasdiqlaydiki, haqiqatdan ham <b>{d.fish}</b> {d.oquvYili}-o‘quv yilida <b>{d.yon}</b> yo‘nalishiga
                  to‘lov-shartnoma asosida o‘qishga qabul qilingan. Hozirgi kunda {d.bosqich}-bosqich <b>{d.group}-guruhda</b> tahsil olmoqda.
                </p>
                <p className="mt-2 indent-10 italic">Ma’lumotnoma so‘ralgan joyga taqdim etish uchun berildi</p>
              </div>
              <p className="mt-3 text-center text-[12px] text-fg-subtle">Bu — matn ko‘rinishi. Word faylda sarlavha, logotip va imzo qismi shablondagidek bo‘ladi.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
