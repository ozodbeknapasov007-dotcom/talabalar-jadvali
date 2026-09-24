'use client'

import { memo, useMemo, useState } from 'react'
import { Download, FileText, Loader2, UserRound } from 'lucide-react'
import { GROUPS, GROUP_LEADERS, GROUP_TITLES, LEGACY_URL, WITHDRAWN_GROUP } from '@/lib/config'
import { exportGroup } from '@/lib/excel'
import { byName, fullName, isOfficialGroup } from '@/lib/student'
import type { Student } from '@/lib/types'
import type { Notify } from './Toast'
import { cx } from './ui'

function GroupCard({ code, title, leader, students, withdrawn, onOpen, notify }: {
  code: string; title: string; leader?: string; students: Student[]; withdrawn?: boolean
  onOpen: (s: Student) => void; notify: Notify
}) {
  const [busy, setBusy] = useState(false)
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
            <a className="btn-ghost h-8 px-2.5 text-[12px]" href={`${LEGACY_URL}/pdf_jurnallar/Guruh_${encodeURIComponent(code)}.pdf`} target="_blank" rel="noreferrer" title="Toza A4 PDF jurnal">
              <FileText size={14} /> PDF
            </a>
          )}
          <button type="button" className="btn-ghost h-8 px-2.5 text-[12px]" onClick={download} disabled={busy || !students.length}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} .xlsx
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
  const groups = useMemo(() => {
    const map = new Map<string, Student[]>(GROUPS.map((g) => [g, []]))
    const other: Student[] = []
    for (const s of students) (isOfficialGroup(s.group) ? map.get(s.group)! : other).push(s)
    for (const list of map.values()) list.sort(byName)
    return { map, other: other.sort(byName) }
  }, [students])

  return (
    <div className="space-y-4">
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
