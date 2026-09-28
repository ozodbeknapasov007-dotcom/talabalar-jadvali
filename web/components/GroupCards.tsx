'use client'

import { useEffect, useState } from 'react'
import { GROUP_LEADERS, GROUP_TITLES } from '@/lib/config'
import { cx, ProgressBar } from './ui'

/*
  Guruhlar kesimida kontingent — 10 xil ko'rinish. Har birida guruhni bosish
  filtr bo'ladi (qayta bosish — filtrni olib tashlaydi). Tanlangan ko'rinish
  brauzerda eslab qolinadi.

  Rang guruhning yo'nalishini bildiradi: yashil — Farmatsiya, ko'k — Hamshiralik.
*/

export interface GroupStat { g: string; total: number; ver: number }

interface Props {
  groups: GroupStat[]
  active: string
  onPick: (g: string) => void
}

interface Item extends GroupStat {
  p: number
  farm: boolean
  title: string
  leader: string
  active: boolean
  tip: string
  pick: () => void
}

export const VARIANTS = [
  { id: 'kartalar', name: 'Kartalar' },
  { id: 'ixcham', name: 'Ixcham' },
  { id: 'halqa', name: 'Halqalar' },
  { id: 'ustun', name: 'Ustunlar' },
  { id: 'chiziq', name: 'Chiziqlar' },
  { id: 'jadval', name: 'Jadval' },
  { id: 'raqam', name: 'Katta raqam' },
  { id: 'ulush', name: 'Ulush' },
  { id: 'rahbar', name: 'Rahbarlar' },
  { id: 'tab', name: 'Tablar' },
] as const
type VariantId = (typeof VARIANTS)[number]['id']

const STORAGE_KEY = 'kontingent_variant'

const accentText = (farm: boolean) => (farm ? 'text-emerald-soft' : 'text-blue-soft')
const accentBg = (farm: boolean) => (farm ? 'bg-emerald' : 'bg-blue')
const activeRing = 'border-sky/55 bg-ink-850 ring-1 ring-sky/35'

/** Guruhlar soniga moslashadigan to'r: katta ekranda hamma guruh bitta qatorda (bo'sh katak qolmaydi) */
function Grid({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ '--n': n } as React.CSSProperties}>
      {children}
    </div>
  )
}

function Pct({ it }: { it: Item }) {
  return <span className={cx('text-[11.5px] font-bold tabular-nums', it.p === 100 ? 'text-emerald-soft' : 'text-fg-muted')}>{it.ver}/{it.total}</span>
}

/* 1. Kartalar — oldingi ko'rinish, to'r tuzatilgan */
function Kartalar({ items }: { items: Item[] }) {
  return (
    <Grid n={items.length}>
      {items.map((it) => (
        <button key={it.g} type="button" title={it.tip} onClick={it.pick}
          className={cx('panel relative overflow-hidden p-3.5 text-left transition-colors hover:border-line-strong hover:bg-ink-850', it.active && activeRing)}>
          <span className={cx('absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r', it.farm ? 'from-emerald to-emerald-soft' : 'from-blue to-sky')} />
          <div className="flex items-baseline justify-between gap-2">
            <span className={cx('mono text-[15px] font-bold', accentText(it.farm))}>{it.g}</span>
            <span className="text-[12px] font-semibold text-fg-muted tabular-nums">{it.total} nafar</span>
          </div>
          <div className="mt-0.5 truncate text-[12px] text-fg-muted">{it.title}</div>
          <div className="mt-0.5 truncate text-[12.5px] font-semibold text-fg">{it.leader}</div>
          <div className="mt-2.5 flex items-center gap-2"><ProgressBar value={it.p} /><Pct it={it} /></div>
        </button>
      ))}
    </Grid>
  )
}

/* 2. Ixcham — bir qatorli kichik tugmalar */
function Ixcham({ items }: { items: Item[] }) {
  return (
    <Grid n={items.length}>
      {items.map((it) => (
        <button key={it.g} type="button" title={it.tip} onClick={it.pick}
          className={cx('panel flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:border-line-strong hover:bg-ink-850', it.active && activeRing)}>
          <span className={cx('size-2 rounded-full', accentBg(it.farm))} />
          <span className="mono text-[13.5px] font-bold whitespace-nowrap text-fg">{it.g}</span>
          <span className="text-[12.5px] font-semibold text-fg-muted tabular-nums">{it.total}</span>
          <span className="hidden min-w-6 flex-1 sm:block"><ProgressBar value={it.p} /></span>
          <span className={cx('ml-auto text-[11.5px] font-bold tabular-nums sm:ml-0', it.p === 100 ? 'text-emerald-soft' : 'text-fg-subtle')}>{it.p}%</span>
        </button>
      ))}
    </Grid>
  )
}

/* 3. Halqalar — tasdiqlanganlar ulushi halqa ko'rinishida */
function Ring({ p, farm }: { p: number; farm: boolean }) {
  const r = 26, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-ink-700" />
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${(c * p) / 100} ${c}`} className={p === 100 ? 'stroke-emerald' : farm ? 'stroke-emerald-soft' : 'stroke-blue-soft'} />
    </svg>
  )
}
function Halqa({ items }: { items: Item[] }) {
  return (
    <Grid n={items.length}>
      {items.map((it) => (
        <button key={it.g} type="button" title={it.tip} onClick={it.pick}
          className={cx('panel flex items-center gap-3 p-3 text-left transition-colors hover:border-line-strong hover:bg-ink-850', it.active && activeRing)}>
          <span className="relative grid place-items-center">
            <Ring p={it.p} farm={it.farm} />
            <span className="absolute text-[13px] font-extrabold text-fg tabular-nums">{it.p}%</span>
          </span>
          <span className="min-w-0">
            <span className={cx('mono block text-[15px] font-bold', accentText(it.farm))}>{it.g}</span>
            <span className="block text-[12.5px] font-semibold text-fg tabular-nums">{it.total} nafar</span>
            <span className="block truncate text-[12px] text-fg-muted">{it.leader}</span>
          </span>
        </button>
      ))}
    </Grid>
  )
}

/* 4. Ustunlar — balandlik = talabalar soni, to'q qism = tasdiqlanganlar */
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-fg-muted">
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-blue" />Hamshiralik ishi</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald" />Farmatsiya ishi</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ink-600" />Tasdiqlanmagan</span>
    </div>
  )
}
function Ustun({ items }: { items: Item[] }) {
  const max = Math.max(1, ...items.map((i) => i.total))
  return (
    <div className="panel space-y-3 p-4">
      <Legend />
      <div className="flex h-44 items-end gap-1.5 border-b border-line sm:gap-3">
        {items.map((it) => (
          <button key={it.g} type="button" title={it.tip} onClick={it.pick}
            className={cx('group flex h-full flex-1 flex-col items-center justify-end rounded-t-lg px-1 pt-1 transition-colors hover:bg-ink-850', it.active && 'bg-ink-850 ring-1 ring-sky/35')}>
            <span className="mb-1 text-[12.5px] font-bold text-fg tabular-nums">{it.total}</span>
            <span className="flex w-full max-w-14 flex-col gap-[2px]" style={{ height: `${(it.total / max) * 78}%` }}>
              <span className="w-full rounded-t-[4px] bg-ink-600" style={{ flex: it.total - it.ver }} />
              <span className={cx('w-full', accentBg(it.farm), it.total === it.ver && 'rounded-t-[4px]')} style={{ flex: it.ver }} />
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 sm:gap-3">
        {items.map((it) => (
          <div key={it.g} className="min-w-0 flex-1 text-center">
            <div className={cx('mono text-[11px] font-bold sm:text-[13px]', it.active ? 'text-sky-soft' : 'text-fg')}>{it.g}</div>
            <div className="hidden truncate text-[11px] text-fg-subtle sm:block">{it.leader}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* 5. Chiziqlar — gorizontal ustunlar */
function Chiziq({ items }: { items: Item[] }) {
  const max = Math.max(1, ...items.map((i) => i.total))
  return (
    <div className="panel space-y-1 p-3">
      {items.map((it) => (
        <button key={it.g} type="button" title={it.tip} onClick={it.pick}
          className={cx('grid w-full grid-cols-[56px_1fr_88px] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-ink-850 sm:grid-cols-[64px_120px_1fr_88px]', it.active && 'bg-ink-850 ring-1 ring-sky/35')}>
          <span className={cx('mono text-[14px] font-bold', accentText(it.farm))}>{it.g}</span>
          <span className="hidden truncate text-[12.5px] text-fg-muted sm:block">{it.leader}</span>
          <span className="flex h-3.5 gap-[2px]" style={{ width: `${(it.total / max) * 100}%` }}>
            <span className={cx('h-full rounded-l-[4px]', accentBg(it.farm), it.ver === it.total && 'rounded-r-[4px]')} style={{ flex: it.ver }} />
            <span className="h-full rounded-r-[4px] bg-ink-600" style={{ flex: it.total - it.ver }} />
          </span>
          <span className="text-right text-[12.5px] font-bold whitespace-nowrap text-fg tabular-nums">{it.total} <span className="font-semibold text-fg-subtle">({it.p}%)</span></span>
        </button>
      ))}
    </div>
  )
}

/* 6. Jadval */
function Jadval({ items }: { items: Item[] }) {
  const sum = items.reduce((a, i) => ({ total: a.total + i.total, ver: a.ver + i.ver }), { total: 0, ver: 0 })
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[560px] text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-bold tracking-wider text-fg-subtle uppercase">
            <th className="px-4 py-2.5">Guruh</th><th className="px-2 py-2.5">Yo‘nalish</th><th className="px-2 py-2.5">Rahbar</th>
            <th className="px-2 py-2.5 text-right">Soni</th><th className="px-4 py-2.5">Tasdiqlangan</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.g} onClick={it.pick} title={it.tip}
              className={cx('cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-ink-850', it.active && 'bg-sky/10')}>
              <td className={cx('mono px-4 py-2 font-bold', accentText(it.farm))}>{it.g}</td>
              <td className="px-2 py-2 text-fg-muted">{it.title}</td>
              <td className="px-2 py-2 font-semibold text-fg">{it.leader}</td>
              <td className="px-2 py-2 text-right font-bold text-fg tabular-nums">{it.total}</td>
              <td className="px-4 py-2"><span className="flex items-center gap-2"><span className="w-24"><ProgressBar value={it.p} /></span><Pct it={it} /></span></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line-strong text-fg">
            <td className="px-4 py-2 font-bold" colSpan={3}>Jami</td>
            <td className="px-2 py-2 text-right font-extrabold tabular-nums">{sum.total}</td>
            <td className="px-4 py-2 text-[12px] font-bold text-fg-muted tabular-nums">{sum.ver}/{sum.total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/* 7. Katta raqam */
function Raqam({ items }: { items: Item[] }) {
  return (
    <Grid n={items.length}>
      {items.map((it) => (
        <button key={it.g} type="button" title={it.tip} onClick={it.pick}
          className={cx('panel p-4 text-left transition-colors hover:border-line-strong hover:bg-ink-850', it.active && activeRing)}>
          <div className="flex items-center justify-between">
            <span className={cx('mono text-[13px] font-bold', accentText(it.farm))}>{it.g}</span>
            <Pct it={it} />
          </div>
          <div className="mt-1 text-[40px] leading-none font-extrabold tracking-tight text-fg tabular-nums">{it.total}</div>
          <div className="mt-1.5 truncate text-[12px] text-fg-muted">{it.leader} · {it.title}</div>
        </button>
      ))}
    </Grid>
  )
}

/* 8. Ulush — kontingentning guruhlar bo'yicha bo'linishi (bitta chiziq) */
function Ulush({ items }: { items: Item[] }) {
  const total = items.reduce((n, i) => n + i.total, 0) || 1
  return (
    <div className="panel space-y-3 p-4">
      <div className="flex h-9 gap-[2px] overflow-hidden rounded-lg">
        {items.map((it) => (
          <button key={it.g} type="button" title={it.tip} onClick={it.pick} style={{ flex: it.total }}
            className={cx('mono grid min-w-0 place-items-center text-[12px] font-bold text-white transition-opacity',
              accentBg(it.farm), it.active ? 'opacity-100 ring-2 ring-sky ring-inset' : 'opacity-80 hover:opacity-100')}>
            <span className="truncate px-1">{it.g}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => (
          <button key={it.g} type="button" onClick={it.pick}
            className={cx('flex items-center gap-2 rounded-lg px-2 py-1 text-left text-[12.5px] hover:bg-ink-850', it.active && 'bg-ink-850')}>
            <span className={cx('size-2.5 rounded-sm', accentBg(it.farm))} />
            <span className="mono font-bold text-fg">{it.g}</span>
            <span className="truncate text-fg-muted">{it.leader}</span>
            <span className="ml-auto font-bold text-fg tabular-nums">{it.total}</span>
            <span className="w-10 text-right text-fg-subtle tabular-nums">{Math.round((it.total / total) * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* 9. Rahbarlar — guruh rahbari birinchi o'rinda */
function initials(name: string) {
  const parts = name.replace(/\./g, ' ').split(/\s+/).filter(Boolean)
  return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?'
}
function Rahbar({ items }: { items: Item[] }) {
  return (
    <Grid n={items.length}>
      {items.map((it) => (
        <button key={it.g} type="button" title={it.tip} onClick={it.pick}
          className={cx('panel flex items-center gap-3 p-3 text-left transition-colors hover:border-line-strong hover:bg-ink-850', it.active && activeRing)}>
          <span className={cx('grid size-11 shrink-0 place-items-center rounded-full text-[14px] font-extrabold text-white bg-gradient-to-br', it.farm ? 'from-emerald to-emerald-soft' : 'from-blue to-sky')}>{initials(it.leader)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-bold text-fg">{it.leader}</span>
            <span className="block text-[12px] text-fg-muted"><span className={cx('mono font-bold', accentText(it.farm))}>{it.g}</span> · {it.total} nafar</span>
            <span className="mt-1.5 block"><ProgressBar value={it.p} /></span>
          </span>
        </button>
      ))}
    </Grid>
  )
}

/* 10. Tablar — "Barchasi" bilan birga segmentli tanlagich */
function Tab({ items, anyActive, clear }: { items: Item[]; anyActive: boolean; clear: () => void }) {
  const total = items.reduce((n, i) => n + i.total, 0)
  const cls = (on: boolean) => cx('flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors',
    on ? 'bg-gradient-to-r from-blue to-sky text-white shadow' : 'text-fg-muted hover:bg-ink-700/60 hover:text-fg')
  return (
    <div className="panel flex gap-1 overflow-x-auto p-1.5">
      <button type="button" onClick={clear} className={cls(!anyActive)}>
        Barchasi <span className={cx('rounded-md px-1.5 text-[11.5px] tabular-nums', !anyActive ? 'bg-white/20' : 'bg-ink-700')}>{total}</span>
      </button>
      {items.map((it) => (
        <button key={it.g} type="button" title={it.tip} onClick={it.pick} className={cls(it.active)}>
          <span className={cx('size-2 rounded-full', it.active ? 'bg-white' : accentBg(it.farm))} />
          <span className="mono">{it.g}</span>
          <span className={cx('rounded-md px-1.5 text-[11.5px] tabular-nums', it.active ? 'bg-white/20' : 'bg-ink-700')}>{it.total}</span>
        </button>
      ))}
    </div>
  )
}

export default function GroupCards({ groups, active, onPick }: Props) {
  const [variant, setVariant] = useState<VariantId>('kartalar')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (VARIANTS.some((v) => v.id === saved)) setVariant(saved as VariantId)
    } catch { /* bo'sh */ }
  }, [])

  const choose = (v: VariantId) => {
    setVariant(v)
    try { localStorage.setItem(STORAGE_KEY, v) } catch { /* bo'sh */ }
  }

  const items: Item[] = groups.map(({ g, total, ver }) => {
    const p = total ? Math.round((ver / total) * 100) : 0
    return {
      g, total, ver, p,
      farm: g === '26-01',
      title: GROUP_TITLES[g] || 'Hamshiralik ishi',
      leader: GROUP_LEADERS[g] || '—',
      active: active === g,
      tip: `Guruh ${g} · ${total} nafar · ${ver} tasdiqlangan (${p}%) — bosib filtrlang`,
      pick: () => onPick(active === g ? '' : g),
    }
  })

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-bold tracking-wider text-fg-subtle uppercase">Ko‘rinish</span>
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {VARIANTS.map((v, i) => (
            <button key={v.id} type="button" onClick={() => choose(v.id)}
              className={cx('shrink-0 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-colors',
                variant === v.id ? 'border-sky/50 bg-sky/15 text-sky-soft' : 'border-line bg-ink-800/60 text-fg-muted hover:border-line-strong hover:text-fg')}>
              <span className="mr-1 text-fg-subtle tabular-nums">{i + 1}.</span>{v.name}
            </button>
          ))}
        </div>
      </div>
      {variant === 'kartalar' && <Kartalar items={items} />}
      {variant === 'ixcham' && <Ixcham items={items} />}
      {variant === 'halqa' && <Halqa items={items} />}
      {variant === 'ustun' && <Ustun items={items} />}
      {variant === 'chiziq' && <Chiziq items={items} />}
      {variant === 'jadval' && <Jadval items={items} />}
      {variant === 'raqam' && <Raqam items={items} />}
      {variant === 'ulush' && <Ulush items={items} />}
      {variant === 'rahbar' && <Rahbar items={items} />}
      {variant === 'tab' && <Tab items={items} anyActive={items.some((i) => i.active)} clear={() => onPick('')} />}
    </div>
  )
}
