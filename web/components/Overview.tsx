'use client'

import { memo, useMemo } from 'react'
import { BadgeCheck, CalendarOff, Clock, Database, FileWarning, UserMinus, Users } from 'lucide-react'
import { ACADEMIC_LEAVE_GROUP, WITHDRAWN_GROUP } from '@/lib/config'
import { isAcademicLeave, isBazaEntered, isOfficialGroup, type Filters } from '@/lib/student'
import type { Student } from '@/lib/types'
import GroupCards from './GroupCards'
import { cx, ProgressBar } from './ui'

interface Props {
  students: Student[]
  /** Tanlangan kursdagi akademik guruhlar */
  groups: string[]
  filters: Filters
  onFilter: (patch: Partial<Filters>) => void
  onGroupSettings: () => void
}

function Tile({
  icon: Icon, label, value, sub, tone, active, onClick,
}: {
  icon: typeof Users; label: string; value: React.ReactNode; sub?: React.ReactNode
  tone: 'blue' | 'emerald' | 'amber' | 'sky' | 'rose' | 'violet'; active?: boolean; onClick?: () => void
}) {
  const tones = {
    blue: 'from-blue/25 to-blue/5 text-blue-soft',
    emerald: 'from-emerald/25 to-emerald/5 text-emerald-soft',
    amber: 'from-amber/25 to-amber/5 text-amber',
    sky: 'from-sky/25 to-sky/5 text-sky-soft',
    rose: 'from-rose/25 to-rose/5 text-rose',
    violet: 'from-violet/25 to-violet/5 text-violet',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'panel group flex items-center gap-3.5 p-3.5 text-left transition-colors hover:border-line-strong hover:bg-ink-850 sm:p-4',
        active && 'border-sky/50 bg-ink-850 ring-1 ring-sky/30',
      )}
    >
      <span className={cx('hidden size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br sm:grid', tones[tone])}>
        <Icon size={21} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] font-bold tracking-wide text-fg-subtle uppercase">{label}</span>
        <span className="block text-[22px] leading-tight font-extrabold tracking-tight text-fg tabular-nums">{value}</span>
        {sub && <span className="block truncate text-[12px] text-fg-muted">{sub}</span>}
      </span>
    </button>
  )
}

function Overview({ students, groups, filters, onFilter, onGroupSettings }: Props) {
  const stats = useMemo(() => {
    const byGroup: Record<string, { total: number; ver: number }> = {}
    for (const g of groups) byGroup[g] = { total: 0, ver: 0 }
    let official = 0, verified = 0, bazaIn = 0, leave = 0, withdrawn = 0, chala = 0, yoq = 0
    for (const s of students) {
      const ok = s.verified === 'TASDIQLANDI'
      const inDb = isBazaEntered(s)
      if (isOfficialGroup(s.group)) {
        const g = byGroup[s.group.trim()]
        if (!g) continue // boshqa kurs
        official++
        g.total++
        if (ok) { verified++; g.ver++ }
        if (inDb) bazaIn++
        if (s.status === 'chala') chala++
        if (s.status === 'yoq') yoq++
      } else if (isAcademicLeave(s.group)) leave++
      else withdrawn++
    }
    return { byGroup, official, verified, bazaIn, bazaOut: official - bazaIn, leave, withdrawn, chala, yoq }
  }, [students, groups])

  const pct = stats.official ? Math.round((stats.verified / stats.official) * 100) : 0
  const bazaPct = stats.official ? Math.round((stats.bazaIn / stats.official) * 100) : 0
  const onlyVerified = (v: string) => onFilter({ verified: filters.verified === v ? '' : v })
  const toggleBazaFilter = () => {
    // 1-bosish: kiritilmaganlar (agar bor bo'lsa), keyin kiritilganlar, keyin barchasi
    if (!filters.baza) onFilter({ baza: stats.bazaOut > 0 ? 'KIRITILMAGAN' : 'KIRITILDI' })
    else if (filters.baza === 'KIRITILMAGAN') onFilter({ baza: 'KIRITILDI' })
    else onFilter({ baza: '' })
  }
  const toggleGroup = (g: string) => onFilter({ group: filters.group === g ? '' : g })

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7">
        <Tile icon={Users} tone="blue" label={filters.kurs ? `${filters.kurs}-kurs kontingenti` : 'Rasmiy kontingent'} value={stats.official} sub={`${groups.length} ta akademik guruh`}
          active={!filters.group && !filters.verified && !filters.baza && !filters.status} onClick={() => onFilter({ group: '', verified: '', baza: '', status: '' })} />
        <Tile icon={BadgeCheck} tone="emerald" label="Tasdiqlangan" value={<>{stats.verified}<span className="text-[15px] text-fg-subtle"> / {stats.official}</span></>}
          sub={<span className="flex items-center gap-2"><span className="w-16"><ProgressBar value={pct} /></span>{pct}%</span>}
          active={filters.verified === 'TASDIQLANDI'} onClick={() => onlyVerified('TASDIQLANDI')} />
        <Tile icon={Clock} tone="amber" label="Kutilmoqda" value={stats.official - stats.verified} sub="Operator tasdig'i"
          active={filters.verified === 'KUTILMOQDA'} onClick={() => onlyVerified('KUTILMOQDA')} />
        <Tile icon={Database} tone="sky" label="Bazaga kiritilgan"
          value={<>{stats.bazaIn}<span className="text-[15px] text-fg-subtle"> / {stats.official}</span></>}
          sub={stats.bazaOut > 0 ? <span className="font-semibold text-rose">{stats.bazaOut} ta kiritilmagan</span> : <span className="flex items-center gap-2"><span className="w-16"><ProgressBar value={bazaPct} tone="sky" /></span>{bazaPct}%</span>}
          active={!!filters.baza} onClick={toggleBazaFilter} />
        <Tile icon={FileWarning} tone="sky" label="Hujjati chala" value={stats.chala + stats.yoq} sub={`${stats.chala} chala · ${stats.yoq} bo'sh`}
          active={filters.status === 'chala'} onClick={() => onFilter({ status: filters.status === 'chala' ? '' : 'chala' })} />
        <Tile icon={CalendarOff} tone="violet" label="Akademik ta'til" value={stats.leave} sub="Kontingentga kirmaydi"
          active={filters.group === ACADEMIC_LEAVE_GROUP} onClick={() => toggleGroup(ACADEMIC_LEAVE_GROUP)} />
        <Tile icon={UserMinus} tone="rose" label="Safdan chiqarilgan" value={stats.withdrawn} sub="Kontingentga kirmaydi"
          active={filters.group === WITHDRAWN_GROUP} onClick={() => toggleGroup(WITHDRAWN_GROUP)} />
      </div>

      {groups.length ? (
        <GroupCards groups={groups.map((g) => ({ g, ...stats.byGroup[g] }))} active={filters.group} onPick={(group) => onFilter({ group })} onSettings={onGroupSettings} />
      ) : (
        <div className="panel px-5 py-6 text-center text-[13px] text-fg-muted">
          {filters.kurs}-kurs guruhlari va talabalari hali kiritilmagan.
        </div>
      )}
    </section>
  )
}

export default memo(Overview)
