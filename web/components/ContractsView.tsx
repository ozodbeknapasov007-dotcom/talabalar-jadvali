'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownUp,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { exportContractsExcel } from '@/lib/excel'
import type { ContractGroupSummary, ContractKPI, ContractStudent, ContractsPayload } from '@/lib/types'
import { cx } from './ui'

interface ContractsViewProps {
  notify: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void
}

type StatusFilter = 'all' | 'qarzdor' | 'tolangan' | 'avans' | '1-kurs' | 'akademik_tsg'
type SortMode = 'debt_desc' | 'debt_asc' | 'fio_asc' | 'group_asc' | 'percent_asc' | 'percent_desc'

function formatMoney(amount: number): string {
  if (!amount && amount !== 0) return '0'
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function ContractsView({ notify }: ContractsViewProps) {
  const [data, setData] = useState<ContractsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filtrlar
  const [search, setSearch] = useState('')
  const [kursFilter, setKursFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('debt_desc')
  const [pageSize, setPageSize] = useState<number>(50)
  const [page, setPage] = useState<number>(1)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/contracts', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Server ${res.status} qaytardi`)
      }
      const json = (await res.json()) as ContractsPayload
      setData(json)
      if (isRefresh) notify("Kontrakt ma'lumotlari yangilandi", 'success')
    } catch (e) {
      const msg = (e as Error).message
      setError(msg)
      notify(`Yuklab bo'lmadi: ${msg}`, 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [notify])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Talabalarni filtrlash
  const filteredStudents = useMemo(() => {
    if (!data?.students) return []
    let list = data.students

    // Kurs
    if (kursFilter !== 'all') {
      const k = Number(kursFilter)
      list = list.filter((s) => s.kurs === k)
    }

    // Guruh
    if (groupFilter !== 'all') {
      list = list.filter((s) => (s.group || s.contract_group) === groupFilter)
    }

    // Status
    if (statusFilter === 'qarzdor') {
      list = list.filter((s) => s.qarzdorlik > 0)
    } else if (statusFilter === 'tolangan') {
      list = list.filter((s) => s.qarzdorlik === 0 && (s.shartnoma_summa > 0 || s.tolangan_summa > 0))
    } else if (statusFilter === 'avans') {
      list = list.filter((s) => s.qarzdorlik < 0)
    } else if (statusFilter === '1-kurs') {
      list = list.filter((s) => s.toifa === '1-kurs')
    } else if (statusFilter === 'akademik_tsg') {
      list = list.filter((s) => s.toifa === 'akademik_tsg')
    }

    // Qidiruv
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((s) => {
        return (
          (s.fish && s.fish.toLowerCase().includes(q)) ||
          (s.contract_fio && s.contract_fio.toLowerCase().includes(q)) ||
          (s.group && s.group.toLowerCase().includes(q)) ||
          (s.contract_group && s.contract_group.toLowerCase().includes(q)) ||
          (s.pinfl && s.pinfl.includes(q)) ||
          (s.tel && s.tel.includes(q))
        )
      })
    }

    // Saralash
    list = [...list].sort((a, b) => {
      if (sortMode === 'debt_desc') return b.qarzdorlik - a.qarzdorlik
      if (sortMode === 'debt_asc') return a.qarzdorlik - b.qarzdorlik
      if (sortMode === 'fio_asc') return (a.fish || '').localeCompare(b.fish || '', 'uz')
      if (sortMode === 'group_asc') return (a.group || '').localeCompare(b.group || '')
      if (sortMode === 'percent_desc') return b.tolov_foiz - a.tolov_foiz
      if (sortMode === 'percent_asc') return a.tolov_foiz - b.tolov_foiz
      return 0
    })

    return list
  }, [data?.students, kursFilter, groupFilter, statusFilter, search, sortMode])

  // Sahifalash
  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredStudents.length / pageSize)
  const paginatedStudents = useMemo(() => {
    if (pageSize === 0) return filteredStudents
    const start = (page - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, page, pageSize])

  // Filtr o'zgarganda sahifani 1-ga qaytarish
  useEffect(() => {
    setPage(1)
  }, [kursFilter, groupFilter, statusFilter, search, sortMode, pageSize])

  // Filtrlanganlar bo'yicha jami summa
  const filteredTotals = useMemo(() => {
    let req = 0
    let paid = 0
    let debt = 0
    let adv = 0
    let debtors = 0
    for (const s of filteredStudents) {
      req += s.shartnoma_summa || 0
      paid += s.tolangan_summa || 0
      if (s.qarzdorlik > 0) {
        debt += s.qarzdorlik
        debtors++
      } else if (s.qarzdorlik < 0) {
        adv += Math.abs(s.qarzdorlik)
      }
    }
    return { req, paid, debt, adv, debtors, total: filteredStudents.length }
  }, [filteredStudents])

  // Excel eksport
  const handleExportFiltered = async () => {
    try {
      await exportContractsExcel(filteredStudents, `Kontraktlar_Qarzdorlik_${new Date().toISOString().slice(0, 10)}.xlsx`)
      notify(`${filteredStudents.length} nafar talaba Excelga yuklandi`, 'success')
    } catch (e) {
      notify(`Eksport qilib bo'lmadi: ${(e as Error).message}`, 'error')
    }
  }

  const handleDownloadFullReport = () => {
    window.open('/api/download_davomat?type=contracts', '_blank')
    notify("To'liq taqqoslash hisoboti yuklanmoqda…", 'info')
  }

  // Mavjud guruhlar ro'yxati
  const availableGroups = useMemo(() => {
    if (!data?.groups) return []
    if (kursFilter === 'all') return data.groups
    const k = Number(kursFilter)
    return data.groups.filter((g) => g.kurs === k)
  }, [data?.groups, kursFilter])

  if (loading) {
    return (
      <div className="panel grid place-items-center gap-3 py-24 text-fg-muted">
        <Loader2 size={32} className="animate-spin text-sky" />
        <span className="text-[14px]">Kontrakt va qarzdorlik ma'lumotlari yuklanmoqda…</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="panel grid place-items-center gap-3 px-6 py-20 text-center">
        <AlertCircle size={36} className="text-rose" />
        <div className="text-[16px] font-semibold text-fg">Kontrakt ma'lumotlarini yuklab bo'lmadi</div>
        <div className="max-w-md text-[13px] text-fg-muted">{error || "Noma'lum xatolik"}</div>
        <button
          type="button"
          className="btn-primary mt-2"
          onClick={() => fetchData()}
        >
          Qayta urinish
        </button>
      </div>
    )
  }

  const { kpi } = data

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-fg tracking-tight">Kontraktlar va Qarzdorlik Tizimi</h2>
              <p className="text-[12.5px] text-fg-muted">
                Buxgalteriya to'lovlari, qarzdorliklar va avans to'lovlari monitoringi (Yangilangan: {kpi.updated_at})
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-ink-800/80 px-3 py-2 text-[12.5px] font-semibold text-fg transition hover:border-sky/50 hover:text-sky disabled:opacity-60"
            title="Qayta yuklash"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-sky' : ''} />
            Yangilash
          </button>

          <button
            type="button"
            onClick={handleExportFiltered}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-950/40 px-3.5 py-2 text-[12.5px] font-semibold text-emerald-300 transition hover:bg-emerald-900/60"
          >
            <FileSpreadsheet size={15} />
            Excelga yuklash ({filteredStudents.length})
          </button>

          <button
            type="button"
            onClick={handleDownloadFullReport}
            className="flex items-center gap-1.5 rounded-xl border border-sky/40 bg-sky/10 px-3.5 py-2 text-[12.5px] font-semibold text-sky transition hover:bg-sky/20"
            title="Buxgalteriya taqqoslash hisoboti (6 varaqli to'liq Excel fayl)"
          >
            <Download size={15} />
            To'liq taqqoslash hisoboti
          </button>
        </div>
      </div>

      {/* 2. Asosiy KPI Kartalari */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Shartnoma summasi */}
        <div className="panel flex flex-col justify-between p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-[11.5px] font-medium uppercase tracking-wider">Shartnoma Summasi</span>
            <Wallet size={16} className="text-blue-400" />
          </div>
          <div className="mt-2 text-[18px] font-bold tracking-tight text-fg tabular-nums">
            {formatMoney(kpi.total_req_sum)}
          </div>
          <div className="mt-1 text-[11px] text-fg-muted">2-3 kurs talabalari</div>
        </div>

        {/* To'langan summa */}
        <div className="panel flex flex-col justify-between p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-[11.5px] font-medium uppercase tracking-wider">To'langan Summa</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-[18px] font-bold tracking-tight text-emerald-400 tabular-nums">
            {formatMoney(kpi.total_paid_sum)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400/80 font-medium">
            {kpi.total_pay_percent}% yig'ilgan
          </div>
        </div>

        {/* Qarzdorlik */}
        <div
          onClick={() => setStatusFilter('qarzdor')}
          className={cx(
            'panel flex flex-col justify-between p-4 border-l-4 border-l-rose-500 cursor-pointer transition hover:bg-rose-950/20',
            statusFilter === 'qarzdor' && 'ring-2 ring-rose-500'
          )}
        >
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-[11.5px] font-medium uppercase tracking-wider text-rose-400">Jami Qarz</span>
            <TrendingDown size={16} className="text-rose-400" />
          </div>
          <div className="mt-2 text-[18px] font-bold tracking-tight text-rose-400 tabular-nums">
            {formatMoney(kpi.total_debt_sum)}
          </div>
          <div className="mt-1 text-[11px] text-rose-300 font-medium">
            {kpi.total_debtors_count} nafar qarzdor
          </div>
        </div>

        {/* Ortiqcha to'lov (Avans) */}
        <div
          onClick={() => setStatusFilter('avans')}
          className={cx(
            'panel flex flex-col justify-between p-4 border-l-4 border-l-amber-500 cursor-pointer transition hover:bg-amber-950/20',
            statusFilter === 'avans' && 'ring-2 ring-amber-500'
          )}
        >
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-[11.5px] font-medium uppercase tracking-wider text-amber-400">Avans (Ortiqcha)</span>
            <CheckCircle2 size={16} className="text-amber-400" />
          </div>
          <div className="mt-2 text-[18px] font-bold tracking-tight text-amber-400 tabular-nums">
            {formatMoney(kpi.total_advance_sum)}
          </div>
          <div className="mt-1 text-[11px] text-amber-300 font-medium">
            {kpi.total_advance_count} nafar talaba
          </div>
        </div>

        {/* To'liq to'laganlar */}
        <div
          onClick={() => setStatusFilter('tolangan')}
          className={cx(
            'panel flex flex-col justify-between p-4 border-l-4 border-l-teal-500 cursor-pointer transition hover:bg-teal-950/20',
            statusFilter === 'tolangan' && 'ring-2 ring-teal-500'
          )}
        >
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-[11.5px] font-medium uppercase tracking-wider text-teal-400">To'liq To'lagan</span>
            <CheckCircle2 size={16} className="text-teal-400" />
          </div>
          <div className="mt-2 text-[18px] font-bold tracking-tight text-fg tabular-nums">
            {kpi.total_paid_full_count} nafar
          </div>
          <div className="mt-1 text-[11px] text-teal-400/80">Qarzsiz faol</div>
        </div>

        {/* 1-Kurs Yangi Qabul */}
        <div
          onClick={() => setStatusFilter('1-kurs')}
          className={cx(
            'panel flex flex-col justify-between p-4 border-l-4 border-l-purple-500 cursor-pointer transition hover:bg-purple-950/20',
            statusFilter === '1-kurs' && 'ring-2 ring-purple-500'
          )}
        >
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-[11.5px] font-medium uppercase tracking-wider text-purple-400">1-Kurs Qabul</span>
            <Clock size={16} className="text-purple-400" />
          </div>
          <div className="mt-2 text-[18px] font-bold tracking-tight text-purple-300 tabular-nums">
            {kpi.course1_count} nafar
          </div>
          <div className="mt-1 text-[11px] text-purple-400/80">Shartnoma shakllanmoqda</div>
        </div>
      </div>

      {/* 3. Guruhlar kesimidagi qarzdorlik slayd/kartalari */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-fg">
            <Layers size={15} className="text-sky" />
            Guruhlar bo'yicha qarzdorlik ko'rsatkichlari:
          </div>
          {groupFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setGroupFilter('all')}
              className="flex items-center gap-1 text-[12px] text-sky hover:underline"
            >
              <X size={13} /> Guruh filtrini tozalash ({groupFilter})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
          {data.groups.map((g) => {
            const isSelected = groupFilter === g.group
            const hasDebt = g.total_debt > 0
            return (
              <button
                key={g.group}
                type="button"
                onClick={() => setGroupFilter(isSelected ? 'all' : g.group)}
                className={cx(
                  'flex flex-col justify-between rounded-xl border p-2.5 text-left transition',
                  isSelected
                    ? 'border-sky bg-sky/15 shadow-sm'
                    : hasDebt
                    ? 'border-line bg-ink-900/60 hover:border-rose/50 hover:bg-rose-950/10'
                    : 'border-line bg-ink-900/40 hover:border-line-bright'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-bold text-fg">{g.group}</span>
                  <span className="text-[10px] text-fg-muted">{g.kurs}-kurs</span>
                </div>
                <div className="mt-1">
                  <div className={cx('text-[12px] font-bold tabular-nums', hasDebt ? 'text-rose-400' : 'text-emerald-400')}>
                    {hasDebt ? `${formatMoney(g.total_debt)} so'm` : "Qarz yo'q"}
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] text-fg-muted mt-0.5">
                    <span>{g.debtors_count ? `${g.debtors_count} qarzdor` : `${g.total_students} talaba`}</span>
                    {g.total_req > 0 && <span>{g.pay_percent}%</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. Filtrlar Paneli */}
      <div className="panel space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Qidiruv */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="F.I.Sh, guruh, PINFL yoki telefon bo'yicha qidirish…"
              className="w-full rounded-xl border border-line bg-ink-950/80 py-2 pl-9 pr-8 text-[13px] text-fg placeholder:text-fg-muted/60 focus:border-sky focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtr selektorlari */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Kurs */}
            <select
              value={kursFilter}
              onChange={(e) => setKursFilter(e.target.value)}
              className="rounded-xl border border-line bg-ink-900/80 px-3 py-2 text-[12.5px] font-medium text-fg focus:border-sky focus:outline-none"
            >
              <option value="all">Barcha kurslar</option>
              <option value="1">1-kurs (Qabul-2026)</option>
              <option value="2">2-kurs</option>
              <option value="3">3-kurs</option>
            </select>

            {/* Guruh */}
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="rounded-xl border border-line bg-ink-900/80 px-3 py-2 text-[12.5px] font-medium text-fg focus:border-sky focus:outline-none"
            >
              <option value="all">Barcha guruhlar</option>
              {availableGroups.map((g) => (
                <option key={g.group} value={g.group}>
                  {g.group} ({g.total_students} ta)
                </option>
              ))}
            </select>

            {/* Saralash */}
            <div className="flex items-center gap-1 rounded-xl border border-line bg-ink-900/80 px-2 py-1.5 text-[12.5px]">
              <ArrowUpDown size={13} className="text-fg-muted ml-1" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-transparent text-fg focus:outline-none pr-1"
              >
                <option value="debt_desc">Eng ko'p qarz (Kamayish)</option>
                <option value="debt_asc">Eng kam qarz / Avans</option>
                <option value="fio_asc">F.I.Sh (A-Z)</option>
                <option value="group_asc">Guruh bo'yicha</option>
                <option value="percent_asc">To'lov % (Kamayish)</option>
                <option value="percent_desc">To'lov % (O'sish)</option>
              </select>
            </div>

            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-xl border border-line bg-ink-900/80 px-2.5 py-2 text-[12.5px] font-medium text-fg focus:border-sky focus:outline-none"
            >
              <option value={25}>25 tadan</option>
              <option value={50}>50 tadan</option>
              <option value={100}>100 tadan</option>
              <option value={0}>Barchasi</option>
            </select>
          </div>
        </div>

        {/* Holat tablari */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-3">
          {(
            [
              ['all', 'Barchasi', data.students.length],
              ['qarzdor', 'Qarzdorlar', kpi.total_debtors_count],
              ['tolangan', "To'liq to'lagan", kpi.total_paid_full_count],
              ['avans', 'Ortiqcha (Avans)', kpi.total_advance_count],
              ['1-kurs', '1-kurs yangi qabul', kpi.course1_count],
              ['akademik_tsg', 'Akademik & TSCH', kpi.akademik_debtors_count || 48],
            ] as const
          ).map(([val, label, count]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={cx(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition',
                statusFilter === val
                  ? val === 'qarzdor'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : val === 'tolangan'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : val === 'avans'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-sky/20 text-sky border border-sky/40'
                  : 'bg-ink-800/60 text-fg-muted hover:text-fg hover:bg-ink-800'
              )}
            >
              {label}
              <span className="rounded-md bg-ink-900/80 px-1 text-[10.5px] tabular-nums">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Asosiy Jadval (Table) */}
      <div className="panel overflow-hidden">
        {/* Jadval sarlavhasi / statistika */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-ink-900/70 px-4 py-3 text-[12.5px]">
          <div className="flex items-center gap-2 text-fg">
            <span>Ko'rsatilmoqda: <strong>{filteredStudents.length}</strong> nafar talaba</span>
            {filteredTotals.debtors > 0 && (
              <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-rose-300 font-medium">
                {filteredTotals.debtors} qarzdor
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-fg-muted">
            <div>Jami shartnoma: <strong className="text-fg tabular-nums">{formatMoney(filteredTotals.req)} so'm</strong></div>
            <div>To'langan: <strong className="text-emerald-400 tabular-nums">{formatMoney(filteredTotals.paid)} so'm</strong></div>
            <div>Qarzdorlik: <strong className="text-rose-400 tabular-nums">{formatMoney(filteredTotals.debt)} so'm</strong></div>
            {filteredTotals.adv > 0 && (
              <div>Avans: <strong className="text-amber-400 tabular-nums">{formatMoney(filteredTotals.adv)} so'm</strong></div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-ink-950/60 text-[11.5px] font-semibold text-fg-muted uppercase tracking-wider">
                <th className="py-3 pl-4 pr-2 text-center w-12">T/r</th>
                <th className="py-3 px-3">F.I.Sh (Talaba)</th>
                <th className="py-3 px-3 text-center">Guruhi</th>
                <th className="py-3 px-3 text-center">Kurs</th>
                <th className="py-3 px-3">Telefon</th>
                <th className="py-3 px-3 text-right">Shartnoma</th>
                <th className="py-3 px-3 text-right">To'langan</th>
                <th className="py-3 px-3 text-right">Qoldiq Qarzdorlik</th>
                <th className="py-3 px-3 text-center">To'lov %</th>
                <th className="py-3 px-3 text-center">Holati</th>
                <th className="py-3 pr-4 pl-3 text-right">Manba</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-fg-muted">
                    Tanlangan filtrlar bo'yicha talabalar topilmadi.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s, idx) => {
                  const trNum = (page - 1) * pageSize + idx + 1
                  const isDebtor = s.qarzdorlik > 0
                  const isAdvance = s.qarzdorlik < 0
                  const isFull = s.qarzdorlik === 0 && (s.shartnoma_summa > 0 || s.tolangan_summa > 0)
                  const isC1 = s.toifa === '1-kurs'
                  const groupDiff = s.contract_group && s.group && s.contract_group !== s.group

                  return (
                    <tr
                      key={s.id}
                      className={cx(
                        'transition-colors hover:bg-ink-800/40',
                        isDebtor && 'bg-rose-950/5',
                        isAdvance && 'bg-amber-950/5'
                      )}
                    >
                      {/* T/r */}
                      <td className="py-3 pl-4 pr-2 text-center text-fg-muted tabular-nums">
                        {trNum}
                      </td>

                      {/* F.I.Sh */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-fg">{s.fish}</div>
                        {s.contract_fio && s.contract_fio !== s.fish && (
                          <div className="text-[11px] text-fg-muted">Buxg: {s.contract_fio}</div>
                        )}
                        {s.pinfl && <div className="text-[10.5px] text-fg-muted/60">PINFL: {s.pinfl}</div>}
                      </td>

                      {/* Guruhi */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-block rounded-md bg-ink-800 px-2 py-0.5 font-bold text-fg">
                          {s.group || s.contract_group || '—'}
                        </span>
                        {groupDiff && (
                          <div className="text-[10px] text-amber-400 mt-0.5">
                            (Buxg: {s.contract_group})
                          </div>
                        )}
                      </td>

                      {/* Kurs */}
                      <td className="py-3 px-3 text-center text-fg-muted whitespace-nowrap">
                        {s.kurs ? `${s.kurs}-kurs` : '—'}
                      </td>

                      {/* Telefon */}
                      <td className="py-3 px-3 text-fg-muted whitespace-nowrap">
                        {s.tel ? (
                          <a href={`tel:${s.tel}`} className="hover:text-sky hover:underline">
                            {s.tel}
                          </a>
                        ) : (
                          <span className="text-fg-muted/40">—</span>
                        )}
                      </td>

                      {/* Shartnoma summasi */}
                      <td className="py-3 px-3 text-right font-medium text-fg tabular-nums whitespace-nowrap">
                        {s.shartnoma_summa > 0 ? `${formatMoney(s.shartnoma_summa)} so'm` : '—'}
                      </td>

                      {/* To'langan summa */}
                      <td className="py-3 px-3 text-right font-medium text-emerald-400 tabular-nums whitespace-nowrap">
                        {s.tolangan_summa > 0 ? `${formatMoney(s.tolangan_summa)} so'm` : '0'}
                      </td>

                      {/* Qoldiq qarzdorlik */}
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">
                        {isDebtor ? (
                          <span className="inline-block rounded-lg bg-rose-500/15 px-2 py-0.5 font-bold text-rose-400">
                            +{formatMoney(s.qarzdorlik)} so'm
                          </span>
                        ) : isAdvance ? (
                          <span className="inline-block rounded-lg bg-amber-500/15 px-2 py-0.5 font-bold text-amber-400">
                            -{formatMoney(Math.abs(s.qarzdorlik))} (Avans)
                          </span>
                        ) : isFull ? (
                          <span className="inline-block rounded-lg bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-400">
                            0 (To'liq)
                          </span>
                        ) : isC1 ? (
                          <span className="text-purple-300/80 text-[11.5px]">Kutilmoqda</span>
                        ) : (
                          <span className="text-fg-muted">—</span>
                        )}
                      </td>

                      {/* To'lov % */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {s.shartnoma_summa > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold text-fg tabular-nums">{s.tolov_foiz}%</span>
                            <div className="h-1.5 w-14 rounded-full bg-ink-800 overflow-hidden">
                              <div
                                className={cx(
                                  'h-full rounded-full',
                                  s.tolov_foiz >= 100
                                    ? 'bg-emerald-400'
                                    : s.tolov_foiz >= 50
                                    ? 'bg-sky'
                                    : 'bg-rose-400'
                                )}
                                style={{ width: `${Math.min(s.tolov_foiz, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-fg-muted/40">—</span>
                        )}
                      </td>

                      {/* Holati */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isDebtor ? (
                          <span className="rounded-md bg-rose-950/80 border border-rose-500/30 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                            Qarzdor
                          </span>
                        ) : isAdvance ? (
                          <span className="rounded-md bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                            Avans
                          </span>
                        ) : isFull ? (
                          <span className="rounded-md bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                            To'liq to'langan
                          </span>
                        ) : isC1 ? (
                          <span className="rounded-md bg-purple-950/80 border border-purple-500/30 px-2 py-0.5 text-[11px] font-semibold text-purple-300">
                            1-Kurs (Qabul)
                          </span>
                        ) : (
                          <span className="rounded-md bg-ink-800 px-2 py-0.5 text-[11px] text-fg-muted">
                            {s.holat}
                          </span>
                        )}
                      </td>

                      {/* Manba */}
                      <td className="py-3 pr-4 pl-3 text-right text-[11px] text-fg-muted whitespace-nowrap">
                        {s.manba || '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sahifalash footer */}
        {pageSize > 0 && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ink-900/60 px-4 py-3 text-[12.5px]">
            <div className="text-fg-muted">
              Jami {filteredStudents.length} tadan {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, filteredStudents.length)} ko'rsatilmoqda
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="rounded-lg border border-line bg-ink-800 px-2.5 py-1 font-semibold text-fg disabled:opacity-40"
              >
                Oldingi
              </button>
              <span className="px-2 text-fg font-medium">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="rounded-lg border border-line bg-ink-800 px-2.5 py-1 font-semibold text-fg disabled:opacity-40"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
