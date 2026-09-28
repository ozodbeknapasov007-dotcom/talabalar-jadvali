'use client'

import { Check } from 'lucide-react'
import { GROUP_LEADERS } from '@/lib/config'
import { groupTitle } from '@/lib/student'
import { cx, ProgressBar } from './ui'

/*
  Guruhlar kesimida kontingent. Kartani bosish — shu guruh bo'yicha filtr,
  qayta bosish — filtrni olib tashlash. Tanlangan karta ajralib turadi,
  qolganlari xiralashadi.
*/

export interface GroupStat { g: string; total: number; ver: number }

interface Props {
  groups: GroupStat[]
  active: string
  onPick: (g: string) => void
}

export default function GroupCards({ groups, active, onPick }: Props) {
  const anyActive = groups.some((x) => x.g === active)
  return (
    // Katta ekranda hamma guruh bitta qatorda — guruhlar soni o'zgarsa ham bo'sh katak qolmaydi
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ '--n': groups.length } as React.CSSProperties}>
      {groups.map(({ g, total, ver }) => {
        const p = total ? Math.round((ver / total) * 100) : 0
        const on = active === g
        const farm = groupTitle(g).startsWith('Farmatsiya')
        return (
          <button
            key={g}
            type="button"
            aria-pressed={on}
            title={on ? 'Filtrni olib tashlash' : `Faqat ${g} guruhini ko'rsatish`}
            onClick={() => onPick(on ? '' : g)}
            className={cx(
              'panel relative overflow-hidden p-3.5 text-left transition-all duration-200',
              on
                ? 'border-sky/70 bg-gradient-to-br from-sky/15 via-blue/10 to-transparent shadow-[0_10px_30px_-12px_rgb(56_189_248/0.6)] ring-2 ring-sky/45'
                : 'hover:border-line-strong hover:bg-ink-850',
              anyActive && !on && 'opacity-50 saturate-50 hover:opacity-100 hover:saturate-100',
            )}
          >
            <span className={cx('absolute inset-x-0 top-0 bg-gradient-to-r', on ? 'h-1 from-sky to-blue' : farm ? 'h-0.5 from-emerald to-emerald-soft' : 'h-0.5 from-blue to-sky')} />
            {on && (
              <span className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-sky text-ink-950">
                <Check size={13} strokeWidth={3.5} />
              </span>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <span className={cx('mono text-[15px] font-bold', on ? 'text-sky-soft' : farm ? 'text-emerald-soft' : 'text-blue-soft')}>{g}</span>
              <span className={cx('text-[12px] font-semibold tabular-nums', on ? 'mr-6 text-fg' : 'text-fg-muted')}>{total} nafar</span>
            </div>
            <div className="mt-0.5 truncate text-[12px] text-fg-muted">{groupTitle(g)}</div>
            <div className="mt-0.5 truncate text-[12.5px] font-semibold text-fg">{GROUP_LEADERS[g] || '—'}</div>
            <div className="mt-2.5 flex items-center gap-2">
              <ProgressBar value={p} />
              <span className={cx('text-[11.5px] font-bold tabular-nums', p === 100 ? 'text-emerald-soft' : 'text-fg-muted')}>{ver}/{total}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
