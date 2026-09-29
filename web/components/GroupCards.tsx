'use client'

import { Check, Settings2, X } from 'lucide-react'
import { GROUP_LEADERS } from '@/lib/config'
import { groupTitle, kursOf, selectedGroups } from '@/lib/student'
import { cx, ProgressBar } from './ui'

/*
  Kontingent: kurslar ustunlarda (I · II · III), ichida guruh plitkalari.
  Plitka rangi — kurs, to'qligi — tasdiqlanish foizi.
  Bosish — faqat shu guruh (qayta bosish — filtrni olib tashlash);
  Ctrl/⌘ + bosish — bir nechta guruhni belgilash; kurs sarlavhasi — shu kursning hamma guruhi.
*/

export interface GroupStat { g: string; total: number; ver: number }

interface Props {
  groups: GroupStat[]
  /** filters.group — bitta guruh yoki "24-11,24-12" */
  active: string
  onPick: (group: string) => void
  onSettings: () => void
}

const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' }
// Tailwind ranglari (globals.css @theme) — CSS o'zgaruvchi orqali foizga qarab aralashtiriladi
const TONE: Record<number, { v: string; text: string; ring: string }> = {
  1: { v: '--color-sky', text: 'text-sky-soft', ring: 'border-sky/45' },
  2: { v: '--color-violet', text: 'text-violet', ring: 'border-violet/45' },
  3: { v: '--color-amber', text: 'text-amber', ring: 'border-amber/45' },
}

export default function GroupCards({ groups, active, onPick, onSettings }: Props) {
  const chosen = selectedGroups(active).filter((g) => groups.some((x) => x.g === g))
  const anyActive = chosen.length > 0

  const pick = (g: string, multi: boolean) => {
    if (!multi) return onPick(chosen.length === 1 && chosen[0] === g ? '' : g)
    const next = chosen.includes(g) ? chosen.filter((x) => x !== g) : [...chosen, g]
    onPick(next.sort().join(','))
  }
  const pickKurs = (list: string[]) => {
    const all = list.length > 0 && list.every((g) => chosen.includes(g)) && chosen.length === list.length
    onPick(all ? '' : [...list].sort().join(','))
  }

  const columns = [1, 2, 3]
    .map((k) => {
      const list = groups.filter((x) => kursOf(x.g) === k)
      return { k, list, total: list.reduce((a, x) => a + x.total, 0), ver: list.reduce((a, x) => a + x.ver, 0) }
    })
    .filter((c) => c.list.length)

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-bold text-fg">Kontingent — guruhlar</span>
        <span className="hidden text-[12px] text-fg-subtle sm:inline">
          Bosing — bitta guruh · <kbd className="rounded border border-line bg-ink-800 px-1 font-mono text-[11px]">Ctrl</kbd> + bosing — bir nechta · kurs sarlavhasi — butun kurs
        </span>
        {chosen.length > 1 && (
          <span className="chip border-sky/45 bg-sky/10 text-sky-soft">
            {chosen.length} ta guruh tanlandi
            <button type="button" className="ml-0.5 hover:text-fg" onClick={() => onPick('')} title="Tanlovni tozalash"><X size={13} /></button>
          </span>
        )}
        <button type="button" className="btn-ghost ml-auto h-8 px-2.5 text-[12px]" onClick={onSettings} title="Kurs, guruh rahbari va yo'nalishni o'zgartirish">
          <Settings2 size={14} className="text-sky" /> Guruh sozlamalari
        </button>
      </div>

      {/* Ustun kengligi guruhlar soniga mos — ko'p guruhli kurs kengroq, ustunlar balandligi teng */}
      <div
        className="grid gap-3 lg:grid-cols-[var(--cols)]"
        style={{ '--cols': columns.map((c) => `minmax(0,${Math.max(2, Math.ceil(c.list.length / 2))}fr)`).join(' ') } as React.CSSProperties}
      >
        {columns.map((c) => {
          const tone = TONE[c.k]
          const cp = c.total ? Math.round((c.ver / c.total) * 100) : 0
          return (
            <section key={c.k} className="panel overflow-hidden" style={{ borderTop: `3px solid var(${tone.v})` }}>
              <button
                type="button"
                onClick={() => pickKurs(c.list.map((x) => x.g))}
                title={`${ROMAN[c.k]}-kursning hamma guruhini tanlash`}
                className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-ink-850"
              >
                <span className={cx('mono text-[24px] leading-none font-extrabold', tone.text)}>{ROMAN[c.k]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-fg">{c.k}-kurs</span>
                  <span className="block text-[12px] text-fg-muted">{c.list.length} ta guruh</span>
                </span>
                <span className="text-right">
                  <span className="block text-[22px] leading-none font-extrabold text-fg tabular-nums">{c.total}</span>
                  <span className={cx('text-[11.5px] font-bold tabular-nums', cp === 100 ? 'text-emerald-soft' : 'text-fg-muted')}>{c.ver} tasdiqlangan</span>
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 xl:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                {c.list.map(({ g, total, ver }) => {
                  const p = total ? Math.round((ver / total) * 100) : 0
                  const on = chosen.includes(g)
                  return (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={on}
                      title={`${g} · ${GROUP_LEADERS[g] || '—'} · ${groupTitle(g)}\nCtrl + bosish — bir nechtasini tanlash`}
                      onClick={(e) => pick(g, e.ctrlKey || e.metaKey)}
                      className={cx(
                        'relative rounded-xl border p-3 text-left transition-all duration-150 select-none',
                        tone.ring,
                        on ? 'ring-2 ring-sky shadow-[0_10px_28px_-12px_rgb(56_189_248/0.7)]' : 'hover:-translate-y-px hover:brightness-125',
                        anyActive && !on && 'opacity-45 saturate-50 hover:opacity-100 hover:saturate-100',
                      )}
                      style={{ background: `color-mix(in srgb, var(${tone.v}) ${8 + p / 7}%, transparent)` }}
                    >
                      {on && (
                        <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-sky text-ink-950">
                          <Check size={13} strokeWidth={3.5} />
                        </span>
                      )}
                      <span className={cx('mono block text-[17px] font-bold', tone.text)}>{g}</span>
                      <span className="mt-0.5 block text-[28px] leading-tight font-extrabold text-fg tabular-nums">
                        {total}<span className="ml-1 text-[12px] font-semibold text-fg-muted">nafar</span>
                      </span>
                      <span className="block truncate text-[13px] font-semibold text-fg">{GROUP_LEADERS[g] || '—'}</span>
                      <span className="block truncate text-[11.5px] text-fg-muted">{groupTitle(g)}</span>
                      <span className="mt-2 flex items-center gap-2">
                        <ProgressBar value={p} />
                        <span className={cx('text-[11.5px] font-bold tabular-nums', p === 100 ? 'text-emerald-soft' : 'text-fg-muted')}>{ver}/{total}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
