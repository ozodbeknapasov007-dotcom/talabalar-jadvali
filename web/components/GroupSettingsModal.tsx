'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Loader2, Plus, Save, Settings2, X } from 'lucide-react'
import { GROUP_CODE, GROUP_DIRECTIONS, KURS_LIST, type GroupSetting, type GroupSettings } from '@/lib/config'
import { cx } from './ui'

const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' }

interface Props {
  settings: GroupSettings
  /** Guruhdagi talabalar soni (ko'rsatish uchun) */
  counts: Record<string, number>
  /** Kontingentda belgilangan guruhlar — oynada oldindan belgilanadi */
  preselected: string[]
  onClose: () => void
  onSave: (settings: GroupSettings) => Promise<void>
}

/** Guruh sozlamalari: kursdan kursga ko'chirish, guruh rahbari va yo'nalish */
export default function GroupSettingsModal({ settings, counts, preselected, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<GroupSettings>(() => structuredClone(settings))
  const [checked, setChecked] = useState<Set<string>>(() => new Set(preselected.filter((g) => g in settings)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nw, setNw] = useState<GroupSetting & { g: string }>({ g: '', kurs: 1, rahbar: '', yonalish: GROUP_DIRECTIONS[0] })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const codes = useMemo(() => Object.keys(draft).sort((a, b) => draft[a].kurs - draft[b].kurs || a.localeCompare(b)), [draft])
  const changed = (g: string) => {
    const a = settings[g], b = draft[g]
    return !a ? 'new' : a.kurs !== b.kurs || a.rahbar !== b.rahbar || a.yonalish !== b.yonalish ? 'edit' : ''
  }
  const dirty = codes.some((g) => changed(g))

  const patch = (g: string, p: Partial<GroupSetting>) => setDraft((d) => ({ ...d, [g]: { ...d[g], ...p } }))
  const toggle = (g: string) => setChecked((s) => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n })
  const moveChecked = (kurs: number) => setDraft((d) => {
    const n = { ...d }
    for (const g of checked) n[g] = { ...n[g], kurs }
    return n
  })

  const nwCode = nw.g.trim()
  const nwError = !nwCode ? '' : !GROUP_CODE.test(nwCode) ? "Kod YY-NN ko'rinishida bo'lsin (masalan 26-07)" : nwCode in draft ? 'Bu guruh allaqachon bor' : ''
  const addGroup = () => {
    if (!nwCode || nwError) return
    setDraft((d) => ({ ...d, [nwCode]: { kurs: nw.kurs, rahbar: nw.rahbar.trim(), yonalish: nw.yonalish } }))
    setNw({ g: '', kurs: nw.kurs, rahbar: '', yonalish: nw.yonalish })
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-[60] flex items-stretch justify-center bg-ink-950/85 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="animate-pop-in flex h-full w-full max-w-[920px] flex-col overflow-hidden border-line-strong bg-ink-900 shadow-2xl shadow-black/60 sm:h-auto sm:max-h-[92vh] sm:rounded-3xl sm:border"
        role="dialog" aria-modal="true" aria-label="Guruh sozlamalari">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="grid size-10 place-items-center rounded-2xl bg-sky/15 text-sky"><Settings2 size={20} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold text-fg">Guruh sozlamalari</h3>
            <p className="text-[12.5px] text-fg-muted">Kursdan kursga ko'chirish, guruh rahbari va yo'nalish. Talabalarning guruhi o'zgarmaydi.</p>
          </div>
          <button type="button" className="grid size-9 place-items-center rounded-xl text-fg-muted hover:bg-ink-700 hover:text-fg" onClick={onClose} disabled={saving} title="Yopish (Esc)"><X size={19} /></button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-ink-950/50 px-5 py-2.5">
          <span className="text-[12.5px] text-fg-muted">Belgilanganlar ({checked.size}):</span>
          {KURS_LIST.map((k) => (
            <button key={k} type="button" className="btn-ghost h-8 px-2.5 text-[12px]" disabled={!checked.size} onClick={() => moveChecked(k)}>
              <ArrowRight size={13} /> {ROMAN[k]}-kursga
            </button>
          ))}
          {checked.size > 0 && <button type="button" className="text-[12px] text-sky hover:underline" onClick={() => setChecked(new Set())}>belgilashni olib tashlash</button>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[11px] font-bold tracking-wider text-fg-subtle uppercase">
                <th className="w-8 py-2" />
                <th className="py-2">Guruh</th>
                <th className="py-2">Kurs</th>
                <th className="py-2">Guruh rahbari</th>
                <th className="py-2">Yo'nalish</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((g) => {
                const c = changed(g)
                return (
                  <tr key={g} className={cx('border-t border-line/70', c && 'bg-sky/5')}>
                    <td className="py-1.5"><input type="checkbox" className="size-4 cursor-pointer accent-sky" checked={checked.has(g)} onChange={() => toggle(g)} aria-label={`${g} ni belgilash`} /></td>
                    <td className="py-1.5 pr-3">
                      <span className="mono font-bold text-blue-soft">{g}</span>
                      <span className="ml-2 text-[11.5px] text-fg-subtle">{counts[g] ?? 0} nafar</span>
                      {c === 'new' && <span className="chip ml-2 border-emerald/45 bg-emerald/10 text-emerald-soft">yangi</span>}
                      {c === 'edit' && settings[g]?.kurs !== draft[g].kurs && (
                        <span className="chip ml-2 border-amber/45 bg-amber/10 text-amber">{ROMAN[settings[g].kurs]} → {ROMAN[draft[g].kurs]}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3">
                      <div className="inline-flex overflow-hidden rounded-lg border border-line">
                        {KURS_LIST.map((k) => (
                          <button key={k} type="button" onClick={() => patch(g, { kurs: k })}
                            className={cx('mono px-2.5 py-1 text-[12px] font-bold', draft[g].kurs === k ? 'bg-gradient-to-r from-blue/80 to-sky/80 text-white' : 'text-fg-muted hover:bg-ink-800 hover:text-fg')}>
                            {ROMAN[k]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-1.5 pr-3"><input className="field h-8 py-1 text-[12.5px]" value={draft[g].rahbar} onChange={(e) => patch(g, { rahbar: e.target.value })} placeholder="Familiya.I" /></td>
                    <td className="py-1.5">
                      <select className="field h-8 cursor-pointer py-1 text-[12.5px]" value={draft[g].yonalish} onChange={(e) => patch(g, { yonalish: e.target.value })}>
                        {[...new Set([draft[g].yonalish, ...GROUP_DIRECTIONS])].map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t border-line">
                <td className="py-2"><Plus size={15} className="text-emerald-soft" /></td>
                <td className="py-2 pr-3"><input className="field mono h-8 py-1 text-[12.5px]" value={nw.g} onChange={(e) => setNw({ ...nw, g: e.target.value })} placeholder="Yangi: 26-07" /></td>
                <td className="py-2 pr-3">
                  <select className="field h-8 cursor-pointer py-1 text-[12.5px]" value={nw.kurs} onChange={(e) => setNw({ ...nw, kurs: Number(e.target.value) })}>
                    {KURS_LIST.map((k) => <option key={k} value={k}>{ROMAN[k]}-kurs</option>)}
                  </select>
                </td>
                <td className="py-2 pr-3"><input className="field h-8 py-1 text-[12.5px]" value={nw.rahbar} onChange={(e) => setNw({ ...nw, rahbar: e.target.value })} placeholder="Guruh rahbari" /></td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <select className="field h-8 cursor-pointer py-1 text-[12.5px]" value={nw.yonalish} onChange={(e) => setNw({ ...nw, yonalish: e.target.value })}>
                      {GROUP_DIRECTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button type="button" className="btn-ghost h-8 shrink-0 px-2.5 text-[12px]" disabled={!nwCode || !!nwError} onClick={addGroup}><Plus size={13} /> Qo'shish</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          {nwError && <div className="mt-2 text-[12px] text-amber">{nwError}</div>}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3.5">
          {error && <span className="w-full text-[12.5px] text-rose">{error}</span>}
          <span className="text-[12px] text-fg-subtle">Saqlangach barcha kompyuter va Vercel'dagi portalda ham yangilanadi.</span>
          <button type="button" className="btn-ghost ml-auto py-2" onClick={onClose} disabled={saving}>Bekor qilish</button>
          <button type="button" className="btn-success py-2" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </footer>
      </div>
    </div>
  )
}
