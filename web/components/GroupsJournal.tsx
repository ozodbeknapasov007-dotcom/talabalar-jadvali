'use client'

import { memo, useMemo, useState } from 'react'
import { Check, Download, FileSpreadsheet, FileText, Loader2, Printer, Send, UserRound } from 'lucide-react'
import { GROUPS, GROUP_LEADERS, GROUP_TITLES, WITHDRAWN_GROUP } from '@/lib/config'
import { exportGroup, exportQabulShablonGroup, exportRole, sendGroupsToTelegram, type TgTarget } from '@/lib/excel'
import { byName, fullName, isOfficialGroup } from '@/lib/student'
import type { Student } from '@/lib/types'
import type { Notify } from './Toast'
import { cx } from './ui'

function GroupCard({ code, title, leader, students, withdrawn, onOpen, notify }: {
  code: string; title: string; leader?: string; students: Student[]; withdrawn?: boolean
  onOpen: (s: Student) => void; notify: Notify
}) {
  const [busy, setBusy] = useState(false)
  const [qabulBusy, setQabulBusy] = useState(false)
  const [tgBusy, setTgBusy] = useState(false)
  const farm = code === '26-01'
  const download = async () => {
    setBusy(true)
    try {
      const n = await exportGroup(students, withdrawn ? WITHDRAWN_GROUP : code)
      notify(`${withdrawn ? 'Safdan chiqarilganlar' : `Guruh ${code}`}: ${n} nafar Excelga yuklandi`)
    } catch (e) {
      notify(`Excel yaratilmadi: ${(e as Error).message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const downloadQabul = async () => {
    setQabulBusy(true)
    try {
      const n = await exportQabulShablonGroup(students, code)
      notify(`Guruh ${code} Qabul shabloni (${n} nafar) yuklandi`)
    } catch (e) {
      notify(`Qabul shabloni yaratilmadi: ${(e as Error).message}`, 'error')
    } finally {
      setQabulBusy(false)
    }
  }

  const sendSingleTg = async () => {
    setTgBusy(true)
    try {
      const res = await sendGroupsToTelegram(students, [withdrawn ? 'safdan' : code], 'both')
      if (res.failed.length === 0) notify(`${withdrawn ? 'Safdan chiqarilganlar' : `Guruh ${code}`} Telegramga yuborildi!`)
      else notify(`Qisman yuborildi (${res.sent.join(', ')}). Xato: ${res.failed.join('; ')}`, 'warning')
    } catch (e) {
      notify(`Telegramga yuborilmadi: ${(e as Error).message}`, 'error')
    } finally {
      setTgBusy(false)
    }
  }

  return (
    <article className={cx('panel overflow-hidden', withdrawn && 'border-rose/35')}>
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-ink-850/70 px-4 py-3">
        <span className={cx('chip mono text-[12.5px]',
          withdrawn ? 'border-rose/45 bg-rose/10 text-rose' : farm ? 'border-emerald/45 bg-emerald/10 text-emerald-soft' : 'border-blue/45 bg-blue/10 text-blue-soft')}>
          {withdrawn ? 'Maxsus' : `Guruh ${code}`}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-fg">{title}</div>
          <div className="flex items-center gap-1.5 text-[12px] text-fg-muted">
            {leader && <><UserRound size={12} /> {leader} ·</>} {students.length} nafar
          </div>
        </div>
        <div className="flex gap-1.5">
          {!withdrawn && (
            <>
              <button
                type="button"
                className="btn-ghost h-8 px-2.5 text-[12px] border-emerald/35 text-emerald-soft hover:bg-emerald/10"
                onClick={downloadQabul}
                disabled={qabulBusy || !students.length}
                title="Shu guruhni Qabul uchun shablon (2).xlsx formatida yuklab olish"
              >
                {qabulBusy ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Qabul
              </button>
              <a className="btn-ghost h-8 px-2.5 text-[12px]" href={`/api/view_group_pdf?group=${encodeURIComponent(code)}`} target="_blank" rel="noreferrer" title="Toza A4 PDF jurnal">
                <FileText size={14} /> PDF
              </a>
            </>
          )}
          <button type="button" className="btn-ghost h-8 px-2.5 text-[12px]" onClick={download} disabled={busy || !students.length} title="Guruhni Excel (.xlsx) formatda yuklab olish">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} .xlsx
          </button>
          <button type="button" className="btn-ghost h-8 px-2 text-[12px] text-sky hover:text-sky-soft" onClick={sendSingleTg} disabled={tgBusy || !students.length} title="Shu guruhni Telegramga yuborish">
            {tgBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </header>
      {students.length === 0 ? (
        <div className="px-4 py-6 text-center text-[13px] text-fg-subtle">Bu guruhda talaba yo'q</div>
      ) : (
        <ol className="divide-y divide-line/70">
          {students.map((s, i) => (
            <li key={s.row}>
              <button type="button" onClick={() => onOpen(s)} className="grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 text-left text-[13px] transition-colors hover:bg-ink-800/70">
                <span className="mono text-center text-[12px] font-bold text-fg-subtle tabular-nums">{i + 1}</span>
                <span className={cx('truncate font-semibold', withdrawn ? 'text-rose' : 'text-fg')}>{fullName(s)}</span>
                <span className="mono text-[12px] text-fg-muted tabular-nums">{s.dob || '—'}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}

function GroupsJournal({ students, onOpen, notify }: { students: Student[]; onOpen: (s: Student) => void; notify: Notify }) {
  const [tgOpen, setTgOpen] = useState(false)
  const [tgTarget, setTgTarget] = useState<TgTarget>('both')
  const [selectedGroups, setSelectedGroups] = useState<string[]>(() => [...GROUPS])
  const [sendingTg, setSendingTg] = useState(false)

  const groups = useMemo(() => {
    const map = new Map<string, Student[]>(GROUPS.map((g) => [g, []]))
    const other: Student[] = []
    for (const s of students) (isOfficialGroup(s.group) ? map.get(s.group)! : other).push(s)
    for (const list of map.values()) list.sort(byName)
    return { map, other: other.sort(byName) }
  }, [students])

  const officialTotal = useMemo(() => {
    let sum = 0
    for (const list of groups.map.values()) sum += list.length
    return sum
  }, [groups])

  const toggleGroupSelection = (g: string) => {
    setSelectedGroups((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])
  }

  const handleSendBulkTg = async () => {
    if (!selectedGroups.length) return
    setSendingTg(true)
    try {
      const res = await sendGroupsToTelegram(students, selectedGroups, tgTarget)
      if (res.failed.length === 0) {
        notify(`${selectedGroups.length} ta guruh jurnali (${res.sent.join(' + ')}) Telegramga yuborildi!`)
        setTgOpen(false)
      } else {
        notify(`Yuborildi: ${res.sent.join(', ') || 'yo\'q'}. Xato: ${res.failed.join('; ')}`, 'warning')
      }
    } catch (e) {
      notify(`Telegramga yuborishda xatolik: ${(e as Error).message}`, 'error')
    } finally {
      setSendingTg(false)
    }
  }

  // Barcha guruhlar bitta PDF faylda — bir nechta oyna ochilsa brauzer bloklaydi
  const openAllPdfs = () => {
    window.open('/api/view_group_pdf?group=barcha', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
          <span className="font-bold text-fg">Akademik guruhlar jurnali</span>
          <span className="chip border-sky/35 bg-sky/10 text-sky-soft">{GROUPS.length} ta rasmiy guruh · {officialTotal} nafar talaba</span>
          {groups.other.length > 0 && (
            <span className="chip border-rose/35 bg-rose/10 text-rose">Safdan chiqarilgan: {groups.other.length} nafar</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-ghost h-9 border-emerald/40 bg-emerald/10 text-[12.5px] text-emerald-soft hover:bg-emerald/20"
            onClick={async () => {
              try {
                await exportRole(students, 'qabul_shablon')
                notify(`Qabul uchun shablon (${GROUPS.length} ta guruh) Excelga yuklandi!`)
              } catch (e) {
                notify(`Xatolik: ${(e as Error).message}`, 'error')
              }
            }}
            title="Barcha guruhlarni Qabul uchun shablon (2).xlsx formatida yuklab olish"
          >
            <FileSpreadsheet size={15} /> Qabul shabloni ({GROUPS.length} guruh)
          </button>
          <button type="button" className="btn-ghost h-9 text-[12.5px]" onClick={openAllPdfs} title="Barcha guruhlar PDF jurnalini (bitta fayl) yangi oynada ochish">
            <FileText size={15} className="text-sky" /> Barcha PDF ({GROUPS.length})
          </button>
          <button type="button" className="btn-ghost h-9 text-[12.5px]" onClick={() => window.print()} title="Jurnallarni chop etish (Ctrl+P)">
            <Printer size={15} /> Chop etish
          </button>
          <button
            type="button"
            className={cx('btn-primary h-9 text-[12.5px]', tgOpen && 'ring-2 ring-sky/40')}
            onClick={() => setTgOpen((o) => !o)}
          >
            <Send size={14} /> Telegramga yuborish
          </button>
        </div>
      </div>

      {tgOpen && (
        <div className="panel animate-pop-in space-y-3 border-sky/35 bg-ink-900/90 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13.5px] font-bold text-fg">Tanlangan guruhlarni bitta Excel faylda Telegramga yuborish</div>
            <div className="flex items-center gap-1.5 text-[12px]">
              <button type="button" className="btn-ghost h-7 px-2 text-[11.5px]" onClick={() => setSelectedGroups([...GROUPS])}>Barchasi ({GROUPS.length})</button>
              <button type="button" className="btn-ghost h-7 px-2 text-[11.5px]" onClick={() => setSelectedGroups([])}>Tozalash</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[...GROUPS, ...(groups.other.length ? ['safdan'] : [])].map((g) => {
              const active = selectedGroups.includes(g)
              const count = g === 'safdan' ? groups.other.length : (groups.map.get(g)?.length ?? 0)
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGroupSelection(g)}
                  className={cx(
                    'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                    active
                      ? 'border-sky/60 bg-sky/15 text-sky-soft'
                      : 'border-line bg-ink-950/60 text-fg-muted hover:text-fg',
                  )}
                >
                  <Check size={13} className={active ? 'opacity-100 text-sky' : 'opacity-0'} />
                  <span>{g === 'safdan' ? 'Safdan chiqarilganlar' : `Guruh ${g}`}</span>
                  <span className="mono text-[11px] text-fg-subtle">({count})</span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="text-fg-muted">Qayerga:</span>
              {([['both', 'Kanal + Shaxsiy bot'], ['channel', 'Faqat kanalga'], ['bot', 'Faqat shaxsiy botga']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTgTarget(val)}
                  className={cx(
                    'rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-colors',
                    tgTarget === val ? 'border-emerald/50 bg-emerald/15 text-emerald-soft' : 'border-line text-fg-muted hover:text-fg',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost h-9 text-[12.5px]" onClick={() => setTgOpen(false)}>Bekor qilish</button>
              <button
                type="button"
                className="btn-success h-9 text-[12.5px]"
                disabled={sendingTg || !selectedGroups.length}
                onClick={handleSendBulkTg}
              >
                {sendingTg ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                {sendingTg ? 'Yuborilmoqda…' : `Yuborish (${selectedGroups.length} ta guruh)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {GROUPS.map((g) => (
          <GroupCard key={g} code={g} title={GROUP_TITLES[g]} leader={GROUP_LEADERS[g]} students={groups.map.get(g)!} onOpen={onOpen} notify={notify} />
        ))}
      </div>
      {groups.other.length > 0 && (
        <GroupCard code="safdan" title="Talabalar safidan chiqarilganlar" students={groups.other} withdrawn onOpen={onOpen} notify={notify} />
      )}
    </div>
  )
}

export default memo(GroupsJournal)
