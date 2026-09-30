'use client'

import { GROUPS, GROUP_LEADERS } from './config'
import { byName, formatDate, fullName, isAcademicLeave, isOfficialGroup, isOutside, isWithdrawn, kursOf, tugilganTuman } from './student'
import type { Student } from './types'
import ISTISNOLAR from './qabul-istisnolar.json'
import { ensureAiTranslations, withAiTranslation } from './qabul-ai'
import { QABUL_FILE, QABUL_HEADERS, QABUL_PINFL_COL, QABUL_SHEET, QABUL_WIDTHS, REVIEW_COL, qabulCells, qabulRow, type QabulIstisno } from './qabul'

/* Eski app.js dagi 4 bo'limli Excel eksportning aynan o'zi (ustunlar, ranglar, formatlar) */

export type Role = 'qabul_shablon' | 'buxgalteriya' | 'admin' | 'guruh_rahbari' | 'toliq'

export const ROLE_META: Record<Role, { file: string; title: string; sub: string }> = {
  qabul_shablon: { file: `${QABUL_FILE}.xlsx`, title: QABUL_FILE, sub: "Admin shabloni: 14 ustun (guruhi bilan), rasmiy UZ / EN tarjima" },
  buxgalteriya: { file: '1_Buxgalteriya_Shartnoma_va_Pasport.xlsx', title: 'Buxgalteriya', sub: "Shartnoma № va pasport ma'lumotlari" },
  admin: { file: '2_Baza_Admin_Pasport_va_Shahodatnoma.xlsx', title: 'Baza administratori', sub: 'Admin shabloni (Qabul uchun shablon): 14 ustun' },
  guruh_rahbari: { file: '3_Guruh_Rahbarlari_Talabalar_Malumotlari.xlsx', title: 'Guruh rahbarlari', sub: "Tug'ilgan sana, pasport, shahodatnoma" },
  toliq: { file: '4_Toliq_Malumotlar_Bazasi.xlsx', title: "To'liq ma'lumotlar", sub: 'Barcha ustunlar jamlangan baza' },
}

interface Col {
  header: string
  wch: number
  val: (s: Student, i: number) => string | number
  bold?: boolean
  num?: boolean
  center?: boolean
}

const numIf = (v: string) => {
  const s = String(v ?? '').trim()
  return /^\d{1,10}$/.test(s) ? Number(s) : s
}

/*
 * QABUL - 2026 / Baza administratori — administratorning qabul jadvali formati:
 * bitta "Лист1" sahifa, 1–2-qatorlar bo'sh, 3-qatorda sarlavha, 4-qatordan talabalar (№ 1 dan),
 * 14 ustun (guruhi bilan), Times New Roman 12, ingichka chegara. Qatorlar va tarjimalar lib/qabul.ts da (Python bilan umumiy).
 * Sariq katak — qoida ham, AI ham tarjima qila olmagan nom (qo'lda tekshirish).
 */
function buildQabulShablonSheet(X: XLSXModule, students: Student[]) {
  const thin = { style: 'thin', color: { rgb: '000000' } }
  const border = { top: thin, bottom: thin, left: thin, right: thin }
  const font = { sz: 12, name: 'Times New Roman', color: { rgb: '000000' } }
  const headStyle = { font, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border }
  const cellStyle = (review: boolean) => ({
    font,
    border,
    ...(review ? { fill: { fgColor: { rgb: 'FFF2CC' }, patternType: 'solid' } } : {}),
  })

  const rows = students.map((s) => withAiTranslation(qabulRow(s, (ISTISNOLAR as Record<string, QabulIstisno>)[String(s.pinfl || '').replace(/\D/g, '')])))
  const aoa: (string | number)[][] = [[], [], QABUL_HEADERS, ...rows.map((r, i) => qabulCells(r, i))]

  const ws = X.utils.aoa_to_sheet(aoa)
  for (let r = 2; r < aoa.length; r++) {
    const reviewCols = r === 2 ? [] : rows[r - 3].review.map((k) => REVIEW_COL[k]).filter((c) => c !== undefined)
    for (let c = 0; c < QABUL_HEADERS.length; c++) {
      const addr = X.utils.encode_cell({ r, c })
      if (!ws[addr]) ws[addr] = { t: 's', v: '' }
      const ref = ws[addr]
      if (r === 2) {
        ref.s = headStyle
      } else {
        if (c === QABUL_PINFL_COL) ref.t = 's'
        ref.s = cellStyle(reviewCols.includes(c))
      }
    }
  }
  ws['!ref'] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: QABUL_HEADERS.length - 1 } })
  ws['!cols'] = QABUL_WIDTHS.map((width) => ({ width })) // width — Excel birligida aniq (wch +0.83 qo'shadi)
  ws['!rows'] = [{ hpt: 15 }, { hpt: 15 }, { hpt: 47.25 }, ...rows.map(() => ({ hpt: 15.75 }))]
  return ws
}

const C = {
  tr: { header: 'T/R', wch: 6, val: (_s: Student, i: number) => i + 1, num: true } as Col,
  group: { header: 'Guruh', wch: 10, val: (s: Student) => s.group || '', center: true } as Col,
  leader: { header: 'Guruh rahbari', wch: 18, val: (s: Student) => GROUP_LEADERS[s.group] || '—' } as Col,
  fish: { header: 'F.I.SH (Talaba)', wch: 34, val: (s: Student) => fullName(s), bold: true } as Col,
  shnum: { header: 'Shartnoma №', wch: 14, val: (s: Student) => numIf(s.shnum), bold: true, num: true, center: true } as Col,
  pv: { header: 'Pasport seriya va raqami', wch: 18, val: (s: Student) => s.pv || '', bold: true, center: true } as Col,
  pinfl: { header: 'JSHSHIR (PINFL)', wch: 18, val: (s: Student) => s.pinfl || '', center: true } as Col,
  ber: { header: 'Pasport berilgan sanasi', wch: 16, val: (s: Student) => formatDate(s.ber), center: true } as Col,
  dob: { header: "Tug'ilgan sanasi", wch: 16, val: (s: Student) => formatDate(s.dob), center: true } as Col,
  tuman: { header: "Tug'ilgan tumani", wch: 20, val: (s: Student) => tugilganTuman(s.pinfl) } as Col,
  docTur: { header: 'Hujjat turi (Shahodatnoma/Diplom)', wch: 20, val: (s: Student) => s.doc_tur || '', center: true } as Col,
  shDoc: { header: 'Shahodatnoma / Diplom seriya №', wch: 22, val: (s: Student) => s.sh_doc || '', bold: true, center: true } as Col,
  mak: { header: "Tugatgan ta'lim muassasasi", wch: 38, val: (s: Student) => s.mak || '' } as Col,
  yil: { header: 'Bitirgan yili', wch: 14, val: (s: Student) => numIf(s.yil), num: true, center: true } as Col,
  tel: { header: 'Telefon raqami', wch: 16, val: (s: Student) => s.tel || '', center: true } as Col,
}

const ROLES: Record<Exclude<Role, QabulRole>, { bg: string; cols: Col[] }> = {
  buxgalteriya: { bg: '065F46', cols: [C.tr, C.group, C.fish, C.shnum, C.pv, C.pinfl, C.ber, C.dob] },
  guruh_rahbari: {
    bg: '4C1D95',
    cols: [C.tr, C.group, C.leader, C.fish, { ...C.dob, header: "Tug'ilgan sanasi (dd.mm.yyyy)", wch: 20, bold: true }, C.tuman, C.pv, C.pinfl, C.ber, C.docTur, C.shDoc, C.mak, C.yil, C.tel],
  },
  toliq: {
    bg: '0F172A',
    cols: [
      C.tr, C.group, C.leader, C.shnum, C.fish, { ...C.dob, header: "Tug'ilgan sanasi (dd.mm.yyyy)", wch: 18, bold: true }, C.tuman,
      C.pv, C.pinfl, C.ber, C.docTur, C.shDoc, C.mak, C.yil, C.tel,
      { header: 'Holati', wch: 14, val: (s) => s.verified || 'KUTILMOQDA', center: true },
      { header: 'Bazaga kiritilganligi', wch: 18, val: (s) => s.baza || 'KIRITILDI', center: true },
    ],
  },
}

type XLSXModule = typeof import('xlsx-js-style')

/** Kutubxona faqat eksport bosilganda yuklanadi — sahifa og'irlashmasin */
const loadXlsx = () => import('xlsx-js-style') as Promise<XLSXModule>

function buildSheet(X: XLSXModule, students: Student[], role: Exclude<Role, QabulRole>) {
  const { bg, cols } = ROLES[role]
  const grid = { style: 'thin', color: { rgb: '94A3B8' } }
  const border = { top: grid, bottom: grid, left: grid, right: grid }
  const head = {
    font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
    fill: { fgColor: { rgb: bg }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'medium', color: { rgb: '1E293B' } },
      bottom: { style: 'medium', color: { rgb: '1E293B' } },
      left: { style: 'thin', color: { rgb: '334155' } },
      right: { style: 'thin', color: { rgb: '334155' } },
    },
  }
  const cell = (alt: boolean, bold: boolean, center: boolean, color = '0F172A') => ({
    font: { sz: 12, name: 'Calibri', bold, color: { rgb: color } },
    fill: { fgColor: { rgb: alt ? 'F8FAFC' : 'FFFFFF' }, patternType: 'solid' },
    alignment: { horizontal: center ? 'center' : 'left', vertical: 'center' },
    border,
  })

  const aoa: (string | number)[][] = [cols.map((c) => c.header)]
  students.forEach((s, i) => aoa.push(cols.map((c) => c.val(s, i))))
  const ws = X.utils.aoa_to_sheet(aoa)
  const range = X.utils.decode_range(ws['!ref'] || 'A1')
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = X.utils.encode_cell({ r, c })
      const ref = ws[addr]
      if (!ref) continue
      const alt = r % 2 === 0
      if (r === 0) ref.s = head
      else if (c === 0) { ref.t = 'n'; ref.s = cell(alt, true, true, '475569') }
      else {
        const meta = cols[c]
        if (meta.num && typeof ref.v === 'number') ref.t = 'n'
        ref.s = cell(alt, !!meta.bold, !!meta.center)
      }
    }
  }
  ws['!cols'] = cols.map((c) => ({ wch: c.wch }))
  ws['!rows'] = [{ hpt: 28 }, ...students.map(() => ({ hpt: 22 }))]
  ws['!autofilter'] = { ref: `A1:${X.utils.encode_col(cols.length - 1)}1` }
  return ws
}

const groupOrder = (a: string, b: string) => {
  const na = /^\d/.test(a), nb = /^\d/.test(b)
  if (na !== nb) return na ? -1 : 1
  return a.localeCompare(b, 'uz')
}

/**
 * Admin shablonidagi rollar: bitta "Лист1" sahifa, 1-kurs (joriy qabul) guruhlari — Python
 * (generate_qabul_shablon.py) bilan bir xil; guruh tartibida, ichida alifbo bo'yicha.
 */
type QabulRole = 'qabul_shablon' | 'admin'
const isQabulRole = (role: Role): role is QabulRole => role === 'qabul_shablon' || role === 'admin'

async function buildRoleWorkbook(X: XLSXModule, students: Student[], role: Role) {
  const wb = X.utils.book_new()
  if (isQabulRole(role)) {
    const official = students
      .filter((s) => isOfficialGroup(s.group) && kursOf(s.group) === 1)
      .sort((a, b) => groupOrder((a.group || '').trim(), (b.group || '').trim()) || byName(a, b))
    await ensureAiTranslations(official)
    X.utils.book_append_sheet(wb, buildQabulShablonSheet(X, official), QABUL_SHEET)
    return { wb, count: official.length }
  }
  const all = [...students].sort((a, b) => groupOrder((a.group || '').trim(), (b.group || '').trim()) || byName(a, b))
  X.utils.book_append_sheet(wb, buildSheet(X, all, role), 'Jami talabalar')
  const groups = [...new Set(students.map((s) => (s.group || '').trim()).filter(Boolean))].sort(groupOrder)
  for (const g of groups) {
    const list = students.filter((s) => (s.group || '').trim() === g).sort(byName)
    const name = (/^\d/.test(g) ? `Guruh ${g}` : g).replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)
    X.utils.book_append_sheet(wb, buildSheet(X, list, role), name)
  }
  const noGroup = students.filter((s) => !(s.group || '').trim())
  if (noGroup.length) X.utils.book_append_sheet(wb, buildSheet(X, noGroup, role), 'Guruhsizlar')
  return { wb, count: students.length }
}

/** 1-sahifa "Jami talabalar" (yoki qabul_shablon uchun har bir guruh alohida sahifada) */
export async function exportRole(students: Student[], role: Role) {
  const X = await loadXlsx()
  const { wb } = await buildRoleWorkbook(X, students, role)
  X.writeFile(wb, ROLE_META[role].file, { cellStyles: true, bookSST: false })
  return wb.SheetNames.length
}

/** Bitta guruhni QABUL - 2026 formatida yuklab olish */
export async function exportQabulShablonGroup(students: Student[], group: string) {
  const X = await loadXlsx()
  const list = students.filter((s) => s.group === group).sort(byName)
  await ensureAiTranslations(list)
  const wb = X.utils.book_new()
  X.utils.book_append_sheet(wb, buildQabulShablonSheet(X, list), QABUL_SHEET)
  X.writeFile(wb, `${QABUL_FILE} (${group}).xlsx`, { cellStyles: true, bookSST: false })
  return list.length
}

/** Guruh tanlovi: guruh kodi yoki maxsus kalit — 'safdan' (safdan chiqarilgan / guruhsiz), 'akademik' */
function inSelection(s: Student, key: string) {
  if (key === 'safdan') return isOutside(s.group)
  if (key === 'akademik') return isAcademicLeave(s.group)
  return (s.group || '').trim() === key
}

function sheetName(key: string) {
  const name = key === 'safdan' ? 'Safdan chiqarilganlar' : key === 'akademik' ? "Akademik ta'til" : /^\d/.test(key) ? `Guruh ${key}` : key
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)
}

/** Bitta guruh (yoki maxsus guruh) — guruh rahbari ustunlari bilan */
export async function exportGroup(students: Student[], group: string) {
  const X = await loadXlsx()
  const key = isWithdrawn(group) ? 'safdan' : isAcademicLeave(group) ? 'akademik' : group
  const list = students.filter((s) => inSelection(s, key)).sort(byName)
  const wb = X.utils.book_new()
  X.utils.book_append_sheet(wb, buildSheet(X, list, 'guruh_rahbari'), sheetName(key))
  const file = key === 'safdan' ? 'Talabalar_Safidan_Chiqarilganlar.xlsx' : key === 'akademik' ? 'Akademik_Tatil_Olganlar.xlsx' : `Guruh_${group}_Talabalar_Royxati.xlsx`
  X.writeFile(wb, file, { cellStyles: true, bookSST: false })
  return list.length
}

/** Ekranda ko'rinib turgan (filtrlangan) talabalar — bitta sahifada */
export async function exportFiltered(students: Student[]) {
  const X = await loadXlsx()
  const wb = X.utils.book_new()
  X.utils.book_append_sheet(wb, buildSheet(X, students, 'toliq'), 'Talabalar')
  X.writeFile(wb, 'Talabalar_Tanlangan_Royxat.xlsx', { cellStyles: true, bookSST: false })
}

const TG_BOT_TOKEN = '8645386410:AAGpMWubDaLI6KQ_hR9WuqkhCaoOAK2qWEM'
const TG_CHAT_ID = '8135594558'
const TG_CHANNEL_ID = '-1004375713276'

/** Excel faylni to'g'ridan-to'g'ri Telegram botga yuborish */
export async function sendRoleToTelegram(students: Student[], role: Role) {
  const X = await loadXlsx()
  const { wb, count } = await buildRoleWorkbook(X, students, role)

  const wbout = X.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const meta = ROLE_META[role]

  const formData = new FormData()
  formData.append('chat_id', TG_CHAT_ID)
  formData.append('caption', `📊 ${meta.title} (${meta.sub})\n👥 Jami talabalar: ${count} nafar`)
  formData.append('document', blob, meta.file)

  const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'Telegramga yuborilmadi')
  }
}

export type TgTarget = 'channel' | 'bot' | 'both'

/** Guruh(lar) ro'yxati va Excel jurnalini Telegram kanalga / shaxsiy botga yuborish */
export async function sendGroupsToTelegram(
  students: Student[],
  groupFilter: string | string[],
  target: TgTarget = 'both',
): Promise<{ sent: string[]; failed: string[] }> {
  const X = await loadXlsx()
  const wb = X.utils.book_new()
  const selected = Array.isArray(groupFilter) ? groupFilter : (!groupFilter || groupFilter === 'ALL' ? [] : [groupFilter])
  const isAll = selected.length === 0 || selected.length >= GROUPS.length

  const subset = isAll && selected.length === 0
    ? [...students].sort((a, b) => groupOrder((a.group || '').trim(), (b.group || '').trim()) || byName(a, b))
    : students
        .filter((s) => selected.some((g) => inSelection(s, g)))
        .sort((a, b) => groupOrder((a.group || '').trim(), (b.group || '').trim()) || byName(a, b))

  const mainSheetTitle = selected.length === 1 ? sheetName(selected[0]) : 'Jami talabalar'
  X.utils.book_append_sheet(wb, buildSheet(X, subset, 'guruh_rahbari'), mainSheetTitle)

  if (selected.length !== 1) {
    const groupsToInclude = selected.length > 0
      ? selected
      : [...new Set(students.map((s) => (s.group || '').trim()).filter(Boolean))].sort(groupOrder)
    for (const g of groupsToInclude) {
      const list = students.filter((s) => inSelection(s, g)).sort(byName)
      X.utils.book_append_sheet(wb, buildSheet(X, list, 'guruh_rahbari'), sheetName(g))
    }
  }

  const wbout = X.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = selected.length === 1 ? `Guruh_${selected[0]}_Jurnali.xlsx` : 'Guruhlar_Jurnali_2026-2027.xlsx'

  const dests: { id: string; label: string }[] =
    target === 'both'
      ? [{ id: TG_CHANNEL_ID, label: 'Kanal' }, { id: TG_CHAT_ID, label: 'Shaxsiy bot' }]
      : target === 'bot'
        ? [{ id: TG_CHAT_ID, label: 'Shaxsiy bot' }]
        : [{ id: TG_CHANNEL_ID, label: 'Kanal' }]

  const sent: string[] = []
  const failed: string[] = []

  for (const d of dests) {
    try {
      const fd = new FormData()
      fd.append('chat_id', d.id)
      fd.append('caption', `📋 ${selected.length === 1 ? `Guruh ${selected[0]} jurnali` : `Guruhlar jurnali (${selected.length || GROUPS.length} ta guruh)`}\n👥 Talabalar soni: ${subset.length} nafar`)
      fd.append('document', blob, fileName)
      const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.ok) sent.push(d.label)
      else failed.push(`${d.label}: ${data.description || res.statusText}`)
    } catch (e) {
      failed.push(`${d.label}: ${(e as Error).message}`)
    }
  }

  return { sent, failed }
}


