'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { exportContractsExcel } from '@/lib/excel'
import type { ContractGroupSummary, ContractKPI, ContractStudent, ContractTopSummary, ContractsPayload } from '@/lib/types'
import { cx } from './ui'

interface ContractsViewProps {
  notify: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void
}

type StatusFilter = 'all' | 'qarzdor' | 'tolangan' | 'yashirilgan'
type SortMode = 'file_order' | 'debt_desc' | 'debt_asc' | 'fio_asc' | 'group_asc' | 'percent_asc' | 'percent_desc'

function formatMoney(amount: number): string {
  if (!amount && amount !== 0) return '0'
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function formatTiyin(amount: number): string {
  if (!amount && amount !== 0) return '0.00'
  return Number(amount).toLocaleString('uz-UZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ContractsView({ notify }: ContractsViewProps) {
  const [data, setData] = useState<ContractsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Yuqori xulosa jadvalini yoyish/yig'ish (accordion)
  const [summaryOpen, setSummaryOpen] = useState(true)

  // Filtrlar
  const [search, setSearch] = useState('')
  const [kursFilter, setKursFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('file_order')
  const [pageSize, setPageSize] = useState<number>(50)
  const [page, setPage] = useState<number>(1)

  // Kontraktni yashirish/ko'rsatish holatlari
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [hideModalStudent, setHideModalStudent] = useState<ContractStudent | null>(null)
  const [hideReason, setHideReason] = useState<string>('Davlat granti')
  const [customReason, setCustomReason] = useState<string>('')

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

  // Kontraktni yashirish yoki qayta ko'rsatish
  const handleToggleHide = async (student: ContractStudent, hidden: boolean, reason?: string) => {
    setTogglingId(student.id)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: student.id,
          studentRow: student.student_row,
          hidden,
          reason: reason || '',
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.error || `Server ${res.status} xatolik qaytardi`)
      }
      if (result.payload) {
        setData(result.payload)
      }
      if (hidden) {
        notify(`${student.fish} kontrakti yashirildi (${reason || 'Imtiyoz'})`, 'info')
      } else {
        notify(`${student.fish} kontrakti qayta ko'rsatildi`, 'success')
      }
      setHideModalStudent(null)
    } catch (e) {
      notify(`Amal bajarilmadi: ${(e as Error).message}`, 'error')
    } finally {
      setTogglingId(null)
    }
  }

  // Talabalarni filtrlash — Faqat bazadagi faol talabalar (Akademik va TSCH chiqarilgan)
  const filteredStudents = useMemo(() => {
    if (!data?.students) return []
    // Faol bo'lmagan (akademik yoki tsch) talabalar qat'iyan chiqarilmaydi
    let list = data.students.filter((s) => s.toifa === 'aktiv')

    // Kurs
    if (kursFilter !== 'all') {
      const k = Number(kursFilter)
      list = list.filter((s) => s.kurs === k)
    }

    // Guruh
    if (groupFilter !== 'all') {
      list = list.filter((s) => s.group === groupFilter)
    }

    // Status: Yashirilganlar yoki faol ko'rinadiganlar
    if (statusFilter === 'yashirilgan') {
      list = list.filter((s) => Boolean(s.is_hidden))
    } else {
      list = list.filter((s) => !s.is_hidden)
      if (statusFilter === 'qarzdor') {
        list = list.filter((s) => s.qarzdorlik > 0)
      } else if (statusFilter === 'tolangan') {
        list = list.filter((s) => s.qarzdorlik <= 0)
      }
    }

    // Qidiruv
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((s) => {
        return (
          (s.fish && s.fish.toLowerCase().includes(q)) ||
          (s.group && s.group.toLowerCase().includes(q)) ||
          (s.pinfl && s.pinfl.includes(q))
        )
      })
    }

    // Saralash
    if (sortMode === 'file_order') {
      list = [...list]
    } else {
      list = [...list].sort((a, b) => {
        if (sortMode === 'debt_desc') return b.qarzdorlik - a.qarzdorlik
        if (sortMode === 'debt_asc') return a.qarzdorlik - b.qarzdorlik
        if (sortMode === 'fio_asc') return (a.fish || '').localeCompare(b.fish || '', 'uz')
        if (sortMode === 'group_asc') return (a.group || '').localeCompare(b.group || '')
        if (sortMode === 'percent_desc') return b.tolov_foiz - a.tolov_foiz
        if (sortMode === 'percent_asc') return a.tolov_foiz - b.tolov_foiz
        return 0
      })
    }

    return list
  }, [data?.students, kursFilter, groupFilter, statusFilter, search, sortMode])

  // Sahifalash
  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredStudents.length / pageSize)
  const paginatedStudents = useMemo(() => {
    if (pageSize === 0) return filteredStudents
    const start = (page - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [kursFilter, groupFilter, statusFilter, search, sortMode, pageSize])

  // Filtrlanganlar summalari
  const filteredTotals = useMemo(() => {
    let req = 0
    let paid = 0
    let debt = 0
    let debtors = 0
    for (const s of filteredStudents) {
      req += s.shartnoma_summa || 0
      paid += s.tolangan_summa || 0
      if (s.qarzdorlik > 0) {
        debt += s.qarzdorlik
        debtors++
      }
    }
    return { req, paid, debt, debtors, total: filteredStudents.length }
  }, [filteredStudents])

  // Excel eksport
  const handleExportFiltered = async () => {
    try {
      await exportContractsExcel(
        filteredStudents,
        `02.10.2026_KONTRAKTLAR_${groupFilter !== 'all' ? groupFilter : 'BARCHA'}.xlsx`
      )
      notify(`${filteredStudents.length} nafar talaba Excelga yuklandi`, 'success')
    } catch (e) {
      notify(`Eksport qilib bo'lmadi: ${(e as Error).message}`, 'error')
    }
  }

  const handleDownloadOriginalExcel = () => {
    window.open('/api/download_davomat?type=contracts_file', '_blank')
    notify("02.10.2026_GACHA_KONTRAKTLAR.xlsx fayli yuklanmoqda…", 'info')
  }

  if (loading) {
    return (
      <div className="panel grid place-items-center gap-3 py-24 text-fg-muted">
        <Loader2 size={32} className="animate-spin text-sky" />
        <span className="text-[14px]">02.10.2026_GACHA_KONTRAKTLAR ma'lumotlari yuklanmoqda…</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="panel grid place-items-center gap-3 px-6 py-20 text-center">
        <AlertCircle size={36} className="text-rose" />
        <div className="text-[16px] font-semibold text-fg">Kontrakt ma'lumotlarini yuklab bo'lmadi</div>
        <div className="max-w-md text-[13px] text-fg-muted">{error || "Noma'lum xatolik"}</div>
        <button type="button" className="btn-primary mt-2" onClick={() => fetchData()}>
          Qayta urinish
        </button>
      </div>
    )
  }

  const { kpi, summary_table = [] } = data
  const totalStudents = kpi.total_students || 322
  const hiddenCount = kpi.hidden_students_count || 0
  const visibleCount = kpi.visible_students ?? (totalStudents - hiddenCount)
  const debtorsCount = kpi.total_debtors_count
  const paidCount = kpi.total_paid_full_count ?? Math.max(visibleCount - debtorsCount, 0)

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/20 text-sky border border-sky/30">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-fg tracking-tight">02.10.2026_GACHA_KONTRAKTLAR</h2>
                <span className="rounded-md bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
                  Rasmiy Buxgalteriya Jadvali
                </span>
              </div>
              <p className="text-[12.5px] text-fg-muted">
                Yangilangan sanasi: <strong className="text-fg">02.10.2026</strong> · Faol talabalar kontingenti:{' '}
                <strong className="text-fg">{visibleCount} nafar</strong>
                {hiddenCount > 0 && (
                  <span className="ml-1.5 rounded-md bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300">
                    {hiddenCount} ta yashirilgan
                  </span>
                )}{' '}
                (Akademik ta'til va safdan chiqarilganlar chiqarilgan)
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
            onClick={handleDownloadOriginalExcel}
            className="flex items-center gap-1.5 rounded-xl border border-sky/40 bg-sky/10 px-3.5 py-2 text-[12.5px] font-semibold text-sky transition hover:bg-sky/20"
            title="Faylning asl nusxasini to'g'ridan-to'g'ri yuklab olish"
          >
            <Download size={15} />
            Asl nusxani yuklash (.xlsx)
          </button>
        </div>
      </div>

      {/* 2. YUQORI GURUHLAR XULOSA JADVALI (Faylning 1-15 qatorlari) */}
      <div className="panel overflow-hidden border-sky/30">
        <button
          type="button"
          onClick={() => setSummaryOpen(!summaryOpen)}
          className="flex w-full items-center justify-between border-b border-line bg-ink-900/90 px-4 py-3 text-left transition hover:bg-ink-900"
        >
          <div className="flex items-center gap-2.5">
            <Layers size={17} className="text-sky" />
            <span className="text-[13.5px] font-bold text-fg">
              1. Guruhlar kesimida talabalar soni va qarzdorligi xulosasi (13 ta guruh)
            </span>
            <span className="rounded-md bg-ink-800 px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
              Faylning 1–15 qatorlari
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-fg-muted">
              Jami qarz: <strong className="text-rose-400 tabular-nums">{formatTiyin(kpi.total_debt_sum)} so'm</strong>
            </span>
            {summaryOpen ? <ChevronDown size={18} className="text-fg-muted" /> : <ChevronRight size={18} className="text-fg-muted" />}
          </div>
        </button>

        {summaryOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px] border-collapse">
              <thead>
                <tr className="border-b border-line bg-ink-950/70 text-[11.5px] font-semibold text-fg-muted uppercase tracking-wider">
                  <th className="py-2.5 pl-4 pr-2 text-center w-12">№</th>
                  <th className="py-2.5 px-3">Guruh rahbari</th>
                  <th className="py-2.5 px-3 text-center">Guruh</th>
                  <th className="py-2.5 px-3 text-center">Kurs</th>
                  <th className="py-2.5 px-3 text-right">Talabalar soni</th>
                  <th className="py-2.5 px-3 text-right">Qarzdorligi (so'm)</th>
                  <th className="py-2.5 px-3 text-center">To'lov ko'rsatkichi</th>
                  <th className="py-2.5 pr-4 pl-3 text-center w-28">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {summary_table.map((row, idx) => {
                  const isSelected = groupFilter === row.group
                  const groupDetails = data.groups.find((g) => g.group === row.group)
                  const payPct = groupDetails ? groupDetails.pay_percent : 0
                  return (
                    <tr
                      key={row.group}
                      onClick={() => setGroupFilter(isSelected ? 'all' : row.group)}
                      className={cx(
                        'cursor-pointer transition-colors hover:bg-ink-800/50',
                        isSelected ? 'bg-sky/15 font-medium' : idx % 2 === 1 ? 'bg-ink-900/30' : ''
                      )}
                    >
                      <td className="py-2.5 pl-4 pr-2 text-center text-fg-muted tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-fg">{row.rahbar}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block rounded-md bg-ink-800 px-2 py-0.5 font-bold text-fg">
                          {row.group}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-fg-muted">{row.kurs}-kurs</td>
                      <td className="py-2.5 px-3 text-right font-medium text-fg tabular-nums">
                        {row.students_count} nafar
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-400 tabular-nums">
                        {formatTiyin(row.total_debt)} so'm
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[11.5px] tabular-nums font-semibold text-fg">{payPct}%</span>
                          <div className="h-1.5 w-16 rounded-full bg-ink-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${Math.min(payPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 pl-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setGroupFilter(isSelected ? 'all' : row.group)
                          }}
                          className={cx(
                            'rounded-lg px-2.5 py-1 text-[11px] font-semibold transition',
                            isSelected
                              ? 'bg-sky text-white'
                              : 'bg-ink-800 text-fg-muted hover:text-fg hover:bg-ink-700'
                          )}
                        >
                          {isSelected ? 'Tanlangan' : 'Filtrlash'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-ink-950/80 font-bold text-[13px]">
                  <td colSpan={4} className="py-3 pl-4 pr-3 text-right text-fg">
                    JAMI:
                  </td>
                  <td className="py-3 px-3 text-right text-fg tabular-nums">
                    {kpi.total_students} nafar
                  </td>
                  <td className="py-3 px-3 text-right text-rose-400 tabular-nums">
                    {formatTiyin(kpi.total_debt_sum)} so'm
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-400 tabular-nums">
                    {kpi.total_pay_percent}% to'langan
                  </td>
                  <td className="py-3 pr-4 pl-3 text-center">
                    {groupFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setGroupFilter('all')}
                        className="text-[11px] text-sky hover:underline"
                      >
                        Barchasini ko'rish
                      </button>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 3. Filtrlash va Qidiruv Paneli */}
      <div className="panel space-y-3.5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Qidiruv */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="F.I.Sh, guruh yoki PINFL bo'yicha qidirish…"
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
              <option value="all">Barcha kurslar (2-3 kurs)</option>
              <option value="2">2-kurs</option>
              <option value="3">3-kurs</option>
            </select>

            {/* Guruh */}
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="rounded-xl border border-line bg-ink-900/80 px-3 py-2 text-[12.5px] font-medium text-fg focus:border-sky focus:outline-none"
            >
              <option value="all">Barcha guruhlar (13 ta)</option>
              {data.groups.map((g) => (
                <option key={g.group} value={g.group}>
                  {g.group} ({g.total_students} ta talaba)
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
                <option value="file_order">Fayldagi tartibda (Asl nusxa)</option>
                <option value="debt_desc">Eng ko'p qarz (Kamayish)</option>
                <option value="debt_asc">Qarz (O'sish)</option>
                <option value="fio_asc">F.I.Sh (A-Z)</option>
                <option value="group_asc">Guruh bo'yicha</option>
                <option value="percent_asc">To'lov % (Kamayish)</option>
                <option value="percent_desc">To'lov % (O'sish)</option>
              </select>
            </div>

            {/* Sahifalash hajmi */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-xl border border-line bg-ink-900/80 px-2.5 py-2 text-[12.5px] font-medium text-fg focus:border-sky focus:outline-none"
            >
              <option value={50}>50 tadan</option>
              <option value={100}>100 tadan</option>
              <option value={0}>Barchasi (322 talaba)</option>
            </select>
          </div>
        </div>

        {/* Holat tugmalari */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2.5">
          {(
            [
              ['all', 'Barcha faol talabalar', visibleCount],
              ['qarzdor', '🔴 Qarzdorlar', debtorsCount],
              ['tolangan', "🟢 Qarzi yo'qlar (To'langan)", paidCount],
              ['yashirilgan', "🚫 Yashirilganlar (Imtiyoz/Grant)", hiddenCount],
            ] as const
          ).map(([val, label, count]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={cx(
                'flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-semibold transition',
                statusFilter === val
                  ? val === 'qarzdor'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : val === 'tolangan'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : val === 'yashirilgan'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-sky/20 text-sky border border-sky/40'
                  : 'bg-ink-800/60 text-fg-muted hover:text-fg hover:bg-ink-800'
              )}
            >
              {label}
              <span className="rounded-md bg-ink-900/80 px-1 text-[10.5px] tabular-nums">{count}</span>
            </button>
          ))}

          {groupFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setGroupFilter('all')}
              className="ml-auto flex items-center gap-1 text-[11.5px] text-sky hover:underline"
            >
              <X size={13} /> Guruh filtrini tozalash ({groupFilter})
            </button>
          )}
        </div>
      </div>

      {/* 4. ASOSIY TALABALAR JADVALI (Faylning 18-340 qatorlari) */}
      <div className="panel overflow-hidden">
        {/* Jadval sarlavhasi / statistika */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-ink-900/80 px-4 py-3 text-[12.5px]">
          <div className="flex items-center gap-2 text-fg">
            <span>
              2. Asosiy Jadval (Faylning 18–340 qatorlari): <strong>{filteredStudents.length}</strong> nafar talaba
            </span>
            {filteredTotals.debtors > 0 && statusFilter !== 'yashirilgan' && (
              <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-rose-300 font-medium">
                {filteredTotals.debtors} qarzdor
              </span>
            )}
            {statusFilter === 'yashirilgan' && (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300 font-medium">
                Kontrakti yashirilgan talabalar
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-fg-muted">
            <div>
              Rejadagi to'lov:{' '}
              <strong className="text-fg tabular-nums">{formatMoney(filteredTotals.req)} so'm</strong>
            </div>
            <div>
              Jami to'langan:{' '}
              <strong className="text-emerald-400 tabular-nums">{formatMoney(filteredTotals.paid)} so'm</strong>
            </div>
            <div>
              Qarzdorlik:{' '}
              <strong className="text-rose-400 tabular-nums">{formatMoney(filteredTotals.debt)} so'm</strong>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-ink-950/70 text-[11.5px] font-semibold text-fg-muted uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-20">GURUHI</th>
                <th className="py-3 px-2 text-center w-12">№</th>
                <th className="py-3 px-3">Familiiyasi Ismi va Sharfi</th>
                <th className="py-3 px-3 text-right">Shu vaqtgacha bo'lishi kerak to'lov</th>
                <th className="py-3 px-3 text-right">Jami</th>
                <th className="py-3 px-3 text-right">Shu vaqtgacha qarzi</th>
                <th className="py-3 px-3 text-center">To'lov %</th>
                <th className="py-3 px-3 text-center">Holati</th>
                <th className="py-3 pr-4 pl-3 text-center w-28">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-fg-muted">
                    Tanlangan filtrlar bo'yicha talabalar topilmadi.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s, idx) => {
                  const trNum = (page - 1) * pageSize + idx + 1
                  const isDebtor = s.qarzdorlik > 0
                  const isNegative = s.qarzdorlik < 0

                  return (
                    <tr
                      key={s.id}
                      className={cx(
                        'transition-colors hover:bg-ink-800/40',
                        s.is_hidden ? 'bg-amber-950/10 opacity-80' : isDebtor ? 'bg-rose-950/5' : ''
                      )}
                    >
                      {/* GURUHI */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-block rounded-md bg-ink-800 px-2 py-0.5 font-bold text-fg">
                          {s.group}
                        </span>
                      </td>

                      {/* № (Fayldagi tartib raqami) */}
                      <td className="py-3 px-2 text-center text-fg-muted tabular-nums">
                        {s.file_tr || trNum}
                      </td>

                      {/* Familiiyasi Ismi va Sharfi */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-fg flex items-center gap-1.5">
                          {s.fish}
                          {s.is_hidden && (
                            <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[10px] text-amber-300 font-medium">
                              Yashirilgan
                            </span>
                          )}
                        </div>
                        {s.pinfl && <div className="text-[10.5px] text-fg-muted/60">PINFL: {s.pinfl}</div>}
                      </td>

                      {/* Shu vaqtgacha bo'lishi kerak bo'lgan to'lov */}
                      <td className="py-3 px-3 text-right font-medium text-fg tabular-nums whitespace-nowrap">
                        {formatMoney(s.shartnoma_summa)} so'm
                      </td>

                      {/* Jami (to'langan) */}
                      <td className="py-3 px-3 text-right font-medium text-emerald-400 tabular-nums whitespace-nowrap">
                        {formatMoney(s.tolangan_summa)} so'm
                      </td>

                      {/* Shu vaqtgacha qarzi */}
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">
                        {isDebtor ? (
                          <span className="inline-block rounded-lg bg-rose-500/15 px-2.5 py-0.5 font-bold text-rose-400">
                            +{formatMoney(s.qarzdorlik)} so'm
                          </span>
                        ) : isNegative ? (
                          <span className="inline-block rounded-lg bg-sky/15 px-2.5 py-0.5 font-bold text-sky">
                            -{formatMoney(Math.abs(s.qarzdorlik))} so'm
                          </span>
                        ) : (
                          <span className="inline-block rounded-lg bg-emerald-500/15 px-2.5 py-0.5 font-bold text-emerald-400">
                            0 so'm
                          </span>
                        )}
                      </td>

                      {/* To'lov % */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
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
                      </td>

                      {/* Holati */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {s.is_hidden ? (
                          <span
                            className="rounded-md bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-300"
                            title={s.hidden_reason || 'Kontrakti yashirilgan'}
                          >
                            🚫 {s.hidden_reason || 'Yashirilgan'}
                          </span>
                        ) : isDebtor ? (
                          <span className="rounded-md bg-rose-950/80 border border-rose-500/30 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                            Qarzdor
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                            To'liq to'langan
                          </span>
                        )}
                      </td>

                      {/* Amal */}
                      <td className="py-3 pr-4 pl-3 text-center whitespace-nowrap">
                        {s.is_hidden ? (
                          <button
                            type="button"
                            onClick={() => handleToggleHide(s, false)}
                            disabled={togglingId === s.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-sky/40 bg-sky/15 px-2.5 py-1 text-[11px] font-semibold text-sky transition hover:bg-sky/25 disabled:opacity-50"
                            title="Ushbu talabaning kontraktini qayta ko'rsatish"
                          >
                            {togglingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                            Ko'rsatish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setHideModalStudent(s)
                              setHideReason('Davlat granti')
                              setCustomReason('')
                            }}
                            disabled={togglingId === s.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-ink-800/80 px-2.5 py-1 text-[11px] font-medium text-fg-muted transition hover:border-amber-500/50 hover:text-amber-300 hover:bg-amber-950/20 disabled:opacity-50"
                            title="Kontrakti ko'rinmasin deb belgilash (Grant, imtiyoz yoki ozod qilingan)"
                          >
                            {togglingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
                            Yashirish
                          </button>
                        )}
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
              Jami {filteredStudents.length} tadan {(page - 1) * pageSize + 1}–
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

      {/* 5. Kontraktni yashirish modali */}
      {hideModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-ink-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-[16px] font-bold text-fg">Kontraktni yashirish</h3>
                <p className="text-[12.5px] text-fg-muted">
                  Talaba: <strong className="text-fg">{hideModalStudent.fish}</strong> ({hideModalStudent.group})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHideModalStudent(null)}
                className="rounded-lg p-1 text-fg-muted hover:bg-ink-800 hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-[12px] text-amber-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle size={15} />
                Eslatma
              </div>
              <div>
                Ushbu talabaning shartnomasi va qarzdorligi ({formatMoney(hideModalStudent.qarzdorlik)} so'm) faol hisobotlardan va asosiy jadvaldan chiqariladi.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12.5px] font-semibold text-fg">Yashirish / Imtiyoz sababi:</label>
              <div className="grid grid-cols-1 gap-2">
                {['Davlat granti', 'To‘lovdan ozod (Imtiyoz)', 'Xususiy kelishuv / Homiylik', 'Boshqa sabab'].map((reasonOption) => (
                  <label
                    key={reasonOption}
                    className={cx(
                      'flex items-center gap-2.5 rounded-xl border p-2.5 text-[12.5px] cursor-pointer transition',
                      hideReason === reasonOption
                        ? 'border-amber-500/60 bg-amber-500/10 text-amber-200 font-semibold'
                        : 'border-line bg-ink-950/50 text-fg-muted hover:bg-ink-800'
                    )}
                  >
                    <input
                      type="radio"
                      name="hideReason"
                      checked={hideReason === reasonOption}
                      onChange={() => setHideReason(reasonOption)}
                      className="text-amber-500 focus:ring-0"
                    />
                    <span>{reasonOption}</span>
                  </label>
                ))}
              </div>

              {hideReason === 'Boshqa sabab' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Sababni yozing…"
                  className="w-full mt-2 rounded-xl border border-line bg-ink-950 p-2.5 text-[12.5px] text-fg placeholder:text-fg-muted/60 focus:border-amber-500 focus:outline-none"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHideModalStudent(null)}
                className="rounded-xl border border-line bg-ink-800 px-4 py-2 text-[12.5px] font-semibold text-fg transition hover:bg-ink-700"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={togglingId === hideModalStudent.id}
                onClick={() => {
                  const finalReason = hideReason === 'Boshqa sabab' ? (customReason.trim() || 'Boshqa sabab') : hideReason
                  handleToggleHide(hideModalStudent, true, finalReason)
                }}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-600 px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
              >
                {togglingId === hideModalStudent.id ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
                Yashirish deb belgilash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
