'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpenCheck, Database, Loader2, ServerCrash } from 'lucide-react'
import { exportFiltered } from '@/lib/excel'
import { useStudents } from '@/lib/store'
import { EMPTY_FILTERS, fullName, matches, scanDuplicates, searchText, type Filters } from '@/lib/student'
import type { EditFields, Student } from '@/lib/types'
import FilterBar, { type DisplayMode } from './FilterBar'
import GroupsJournal from './GroupsJournal'
import Header from './Header'
import Overview from './Overview'
import StudentList from './StudentList'
import StudentModal from './StudentModal'
import { Toasts, useToasts } from './Toast'
import { cx } from './ui'

type View = 'database' | 'groups'

const PREFS_KEY = 'portal_v2_prefs'

function readPrefs(): { filters: Filters; mode: DisplayMode; view: View } | null {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null')
    if (p && typeof p === 'object') return { filters: { ...EMPTY_FILTERS, ...p.filters }, mode: p.mode === 'table' ? 'table' : 'cards', view: p.view === 'groups' ? 'groups' : 'database' }
  } catch { /* bo'sh */ }
  return null
}

export default function Portal() {
  const data = useStudents()
  const { toasts, notify } = useToasts()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [mode, setMode] = useState<DisplayMode>('cards')
  const [view, setView] = useState<View>('database')
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [openRow, setOpenRow] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filtr, ko'rinish va rejim F5 dan keyin ham saqlanib qoladi
  useEffect(() => {
    const p = readPrefs()
    if (p) { setFilters(p.filters); setMode(p.mode); setView(p.view) }
    setPrefsLoaded(true)
  }, [])
  useEffect(() => {
    if (!prefsLoaded) return
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ filters, mode, view })) } catch { /* bo'sh */ }
  }, [filters, mode, view, prefsLoaded])

  const patchFilters = useCallback((patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch })), [])

  // Qidiruv matni kechiktirilgan qiymat bilan ishlaydi — yozish hech qachon qotmaydi
  const deferredFilters = useDeferredValue(filters)
  const indexed = useMemo(() => data.students.map((s) => ({ s, text: searchText(s) })), [data.students])
  const shown = useMemo(() => {
    const q = deferredFilters.search.trim().toLowerCase()
    return indexed.filter((x) => matches(x.s, x.text, deferredFilters, q)).map((x) => x.s)
  }, [indexed, deferredFilters])

  const dupGroups = useMemo(() => scanDuplicates(data.students), [data.students])
  const duplicateRows = useMemo(() => new Set(dupGroups.flatMap((g) => g.students.map((s) => s.row))), [dupGroups])

  const current = openRow === null ? null : data.students.find((s) => s.row === openRow) ?? null
  const navList = view === 'groups' ? data.students : shown
  const navIdx = current ? navList.findIndex((s) => s.row === current.row) : -1

  const onOpen = useCallback((s: Student) => setOpenRow(s.row), [])
  const onClose = useCallback(() => setOpenRow(null), [])
  const onNav = useCallback((dir: -1 | 1) => {
    const next = navList[navIdx + dir]
    if (next) setOpenRow(next.row)
  }, [navList, navIdx])

  const { saveEdit, toggleVerify, remove, refresh } = data

  const onToggleVerify = useCallback(async (s: Student) => {
    try {
      const st = await toggleVerify(s)
      notify(st === 'TASDIQLANDI' ? `${s.ism} tasdiqlandi` : `${s.ism} tasdig'i bekor qilindi`, st === 'TASDIQLANDI' ? 'success' : 'warning')
    } catch (e) {
      notify(`Tasdiq serverga yetmadi: ${(e as Error).message}. Brauzerda saqlandi, qayta yuboriladi.`, 'warning')
    }
  }, [toggleVerify, notify])

  const onSave = useCallback(async (s: Student, fields: EditFields) => {
    try {
      await saveEdit(s, fields)
      notify(`${fields.ism || s.ism} ma'lumotlari saqlandi`)
    } catch (e) {
      notify(`Serverga yetmadi: ${(e as Error).message}. Tahrir brauzerda saqlandi, qayta yuboriladi.`, 'warning')
    }
  }, [saveEdit, notify])

  const onDelete = useCallback(async (s: Student) => {
    const next = navList[navIdx + 1] ?? navList[navIdx - 1]
    try {
      await remove(s)
      notify(`${fullName(s)} bazadan o'chirildi`)
      setOpenRow(next && next.row !== s.row ? next.row : null)
    } catch (e) {
      notify(`O'chirilmadi: ${(e as Error).message}`, 'error')
    }
  }, [remove, notify, navList, navIdx])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const onExportShown = useCallback(async () => {
    try {
      await exportFiltered(shown)
      notify(`${shown.length} nafar talaba Excelga yuklandi`)
    } catch (e) {
      notify(`Excel yaratilmadi: ${(e as Error).message}`, 'error')
    }
  }, [shown, notify])

  return (
    <>
      <Header students={data.students} pendingCount={data.pendingCount} onRefresh={onRefresh} refreshing={refreshing} notify={notify} />

      <main className="mx-auto max-w-[1680px] space-y-5 px-4 py-5 sm:px-6">
        {data.state === 'loading' && (
          <div className="panel grid place-items-center gap-3 py-24 text-fg-muted">
            <Loader2 size={30} className="animate-spin text-sky" />
            Talabalar ro'yxati yuklanmoqda…
          </div>
        )}

        {data.state === 'error' && (
          <div className="panel grid place-items-center gap-3 px-6 py-20 text-center">
            <ServerCrash size={32} className="text-rose" />
            <div className="text-[15px] font-semibold text-fg">Ma'lumotni yuklab bo'lmadi</div>
            <div className="max-w-lg text-[13px] text-fg-muted">{data.error}</div>
            <button type="button" className="btn-primary mt-2" onClick={onRefresh}>Qayta urinish</button>
          </div>
        )}

        {data.state === 'ready' && (
          <>
            <nav className="flex flex-wrap items-center gap-2">
              {([['database', Database, 'Umumiy baza', data.students.length], ['groups', BookOpenCheck, 'Guruhlar jurnali', 7]] as const).map(([v, Icon, t, n]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cx('flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-[13.5px] font-semibold transition-colors sm:flex-none sm:px-4',
                    view === v ? 'border-sky/50 bg-gradient-to-r from-blue/25 to-sky/15 text-fg' : 'border-line bg-ink-900/60 text-fg-muted hover:text-fg')}
                >
                  <Icon size={16} className={view === v ? 'text-sky' : ''} /> {t}
                  <span className="rounded-md bg-ink-700/80 px-1.5 text-[11.5px] tabular-nums">{n}</span>
                </button>
              ))}
              {data.error && <span className="ml-auto text-[12px] text-amber">Oxirgi yangilash xatosi: {data.error}</span>}
            </nav>

            {view === 'database' ? (
              <>
                <Overview students={data.students} filters={filters} onFilter={patchFilters} />

                {dupGroups.length > 0 && (
                  <div className="panel border-rose/40 bg-rose/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-[13.5px] font-bold text-rose">
                      <AlertTriangle size={16} /> Pasport yoki JSHSHIR bir xil bo'lgan talabalar ({dupGroups.length} ta holat)
                    </div>
                    <div className="space-y-1.5">
                      {dupGroups.map((g) => (
                        <div key={g.kind + g.value} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                          <span className="text-fg-muted">{g.kind}: <b className="mono text-fg">{g.value}</b> —</span>
                          {g.students.map((s) => (
                            <button key={s.row} type="button" onClick={() => onOpen(s)} className="chip border-rose/45 bg-rose/10 text-rose hover:bg-rose/20">
                              {fullName(s)} ({s.group || '—'})
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <FilterBar filters={filters} onFilter={patchFilters} shown={shown.length} total={data.students.length} mode={mode} onMode={setMode} onExportShown={onExportShown} />
                <StudentList students={shown} mode={mode} duplicateRows={duplicateRows} onOpen={onOpen} onToggleVerify={onToggleVerify} />
              </>
            ) : (
              <GroupsJournal students={data.students} onOpen={onOpen} notify={notify} />
            )}

            <footer className="pt-4 pb-8 text-center text-[12px] text-fg-subtle">
              Manba: {data.source === 'local' ? "kompyuterdagi baza (lokal rejim)" : 'GitHub'} · yangilangan {data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString('uz-UZ') : '—'}
            </footer>
          </>
        )}
      </main>

      {current && (
        <StudentModal
          student={current}
          all={data.students}
          hasPrev={navIdx > 0}
          hasNext={navIdx >= 0 && navIdx < navList.length - 1}
          onNav={onNav}
          onClose={onClose}
          onSave={onSave}
          onToggleVerify={onToggleVerify}
          onDelete={onDelete}
          onOpenRow={setOpenRow}
        />
      )}

      <Toasts toasts={toasts} />
    </>
  )
}
