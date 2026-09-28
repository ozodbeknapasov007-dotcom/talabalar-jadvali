'use client'

import { memo, useMemo } from 'react'
import { BadgeCheck, Clock, FileWarning, UserMinus, Users } from 'lucide-react'
import { GROUPS, WITHDRAWN_GROUP } from '@/lib/config'
import { isOfficialGroup, type Filters } from '@/lib/student'
import type { Student } from '@/lib/types'
import GroupCards from './GroupCards'
import { cx, ProgressBar } from './ui'

interface Props {
  students: Student[]
  filters: Filters
  onFilter: (patch: Partial<Filters>) => void
}

function Tile({
  icon: Icon, label, value, sub, tone, active, onClick,
}: {
  icon: typeof Users; label: string; value: React.ReactNode; sub?: React.ReactNode
  tone: 'blue' | 'emerald' | 'amber' | 'sky' | 'rose'; active?: boolean; onClick?: () => void
}) {
  const tones = {
    blue: 'from-blue/25 to-blue/5 text-blue-soft',
    emerald: 'from-emerald/25 to-emerald/5 text-emerald-soft',
    amber: 'from-amber/25 to-amber/5 text-amber',
    sky: 'from-sky/25 to-sky/5 text-sky-soft',
    rose: 'from-rose/25 to-rose/5 text-rose',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'panel group flex items-center gap-3.5 p-3.5 text-left transition-colors hover:border-line-strong hover:bg-ink-850 sm:p-4 last:col-span-2 xl:last:col-span-1',
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

function Overview({ students, filters, onFilter }: Props) {
  const stats = useMemo(() => {
    const byGroup: Record<string, { total: number; ver: number }> = {}
    for (const g of GROUPS) byGroup[g] = { total: 0, ver: 0 }
    let official = 0, verified = 0, withdrawn = 0, chala = 0, yoq = 0
    for (const s of students) {
      const ok = s.verified === 'TASDIQLANDI'
      if (isOfficialGroup(s.group)) {
        official++
        byGroup[s.group].total++
        if (ok) { verified++; byGroup[s.group].ver++ }
        if (s.status === 'chala') chala++
        if (s.status === 'yoq') yoq++
      } else withdrawn++
    }
    return { byGroup, official, verified, withdrawn, chala, yoq }
  }, [students])

  const pct = stats.official ? Math.round((stats.verified / stats.official) * 100) : 0
  const onlyVerified = (v: string) => onFilter({ verified: filters.verified === v ? '' : v })

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Tile icon={Users} tone="blue" label="Rasmiy kontingent" value={stats.official} sub={`${GROUPS.length} ta akademik guruh`}
          active={!filters.group && !filters.verified && !filters.status} onClick={() => onFilter({ group: '', verified: '', status: '' })} />
        <Tile icon={BadgeCheck} tone="emerald" label="Tasdiqlangan" value={<>{stats.verified}<span className="text-[15px] text-fg-subtle"> / {stats.official}</span></>}
          sub={<span className="flex items-center gap-2"><span className="w-20"><ProgressBar value={pct} /></span>{pct}%</span>}
          active={filters.verified === 'TASDIQLANDI'} onClick={() => onlyVerified('TASDIQLANDI')} />
        <Tile icon={Clock} tone="amber" label="Kutilmoqda" value={stats.official - stats.verified} sub="Operator tasdig'ini kutmoqda"
          active={filters.verified === 'KUTILMOQDA'} onClick={() => onlyVerified('KUTILMOQDA')} />
        <Tile icon={FileWarning} tone="sky" label="Hujjati chala / yo'q" value={stats.chala + stats.yoq} sub={`${stats.chala} chala · ${stats.yoq} bo'sh`}
          active={filters.status === 'chala'} onClick={() => onFilter({ status: filters.status === 'chala' ? '' : 'chala' })} />
        <Tile icon={UserMinus} tone="rose" label="Safdan chiqarilgan" value={stats.withdrawn} sub="Kontingentga kirmaydi"
          active={filters.group === WITHDRAWN_GROUP} onClick={() => onFilter({ group: filters.group === WITHDRAWN_GROUP ? '' : WITHDRAWN_GROUP })} />
      </div>

      <GroupCards groups={GROUPS.map((g) => ({ g, ...stats.byGroup[g] }))} active={filters.group} onPick={(group) => onFilter({ group })} />
    </section>
  )
}

export default memo(Overview)
