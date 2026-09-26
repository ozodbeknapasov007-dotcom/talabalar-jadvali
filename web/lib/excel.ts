'use client'

import { GROUP_LEADERS } from './config'
import { byName, formatDate, fullName, isOfficialGroup, isWithdrawn, tugilganTuman } from './student'
import type { Student } from './types'

/* Eski app.js dagi 4 bo'limli Excel eksportning aynan o'zi (ustunlar, ranglar, formatlar) */

export type Role = 'buxgalteriya' | 'admin' | 'guruh_rahbari' | 'toliq'

export const ROLE_META: Record<Role, { file: string; title: string; sub: string }> = {
  buxgalteriya: { file: '1_Buxgalteriya_Shartnoma_va_Pasport.xlsx', title: 'Buxgalteriya', sub: "Shartnoma № va pasport ma'lumotlari" },
  admin: { file: '2_Baza_Admin_Pasport_va_Shahodatnoma.xlsx', title: 'Baza administratori', sub: 'Pasport va shahodatnoma / diplom' },
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

const ROLES: Record<Role, { bg: string; cols: Col[] }> = {
  buxgalteriya: { bg: '065F46', cols: [C.tr, C.group, C.fish, C.shnum, C.pv, C.pinfl, C.ber, C.dob] },
  admin: { bg: '1E3A8A', cols: [C.tr, C.group, C.fish, C.pv, C.pinfl, C.ber, C.dob, C.tuman, C.docTur, C.shDoc, C.mak, C.yil] },
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
    ],
  },
}

type XLSXModule = typeof import('xlsx-js-style')

/** Kutubxona faqat eksport bosilganda yuklanadi — sahifa og'irlashmasin */
const loadXlsx = () => import('xlsx-js-style') as Promise<XLSXModule>

function buildSheet(X: XLSXModule, students: Student[], role: Role) {
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

/** 1-sahifa "Jami talabalar", keyin har bir guruh alohida sahifada */
export async function exportRole(students: Student[], role: Role) {
  const X = await loadXlsx()
  const wb = X.utils.book_new()
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

  X.writeFile(wb, ROLE_META[role].file, { cellStyles: true, bookSST: false })
  return wb.SheetNames.length
}

/** Bitta guruh (yoki safdan chiqarilganlar) — guruh rahbari ustunlari bilan */
export async function exportGroup(students: Student[], group: string) {
  const X = await loadXlsx()
  const withdrawn = isWithdrawn(group)
  const list = students
    .filter((s) => (withdrawn ? !isOfficialGroup(s.group) : s.group === group))
    .sort(byName)
  const wb = X.utils.book_new()
  X.utils.book_append_sheet(wb, buildSheet(X, list, 'guruh_rahbari'), withdrawn ? 'Safdan chiqarilganlar' : `Guruh ${group}`)
  X.writeFile(wb, withdrawn ? 'Talabalar_Safidan_Chiqarilganlar.xlsx' : `Guruh_${group}_Talabalar_Royxati.xlsx`, { cellStyles: true, bookSST: false })
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

/** 4 bo'limli Excel faylni to'g'ridan-to'g'ri Telegram botga yuborish */
export async function sendRoleToTelegram(students: Student[], role: Role) {
  const X = await loadXlsx()
  const wb = X.utils.book_new()
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

  const wbout = X.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const meta = ROLE_META[role]

  const formData = new FormData()
  formData.append('chat_id', TG_CHAT_ID)
  formData.append('caption', `📊 ${meta.title} (${meta.sub})\n👥 Jami talabalar: ${students.length} nafar`)
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
  const isAll = selected.length === 0 || selected.length >= 7

  const subset = isAll && selected.length === 0
    ? [...students].sort((a, b) => groupOrder((a.group || '').trim(), (b.group || '').trim()) || byName(a, b))
    : students
        .filter((s) => selected.some((g) => (g === 'safdan' ? !isOfficialGroup(s.group) : s.group === g)))
        .sort((a, b) => groupOrder((a.group || '').trim(), (b.group || '').trim()) || byName(a, b))

  const mainSheetTitle = selected.length === 1 ? `Guruh ${selected[0]}`.slice(0, 31) : 'Jami talabalar'
  X.utils.book_append_sheet(wb, buildSheet(X, subset, 'guruh_rahbari'), mainSheetTitle)

  if (selected.length !== 1) {
    const groupsToInclude = selected.length > 0
      ? selected
      : [...new Set(students.map((s) => (s.group || '').trim()).filter(Boolean))].sort(groupOrder)
    for (const g of groupsToInclude) {
      const list = students.filter((s) => (g === 'safdan' ? !isOfficialGroup(s.group) : (s.group || '').trim() === g)).sort(byName)
      const name = (g === 'safdan' ? 'Safdan chiqarilganlar' : /^\d/.test(g) ? `Guruh ${g}` : g).replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)
      X.utils.book_append_sheet(wb, buildSheet(X, list, 'guruh_rahbari'), name)
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
      fd.append('caption', `📋 ${selected.length === 1 ? `Guruh ${selected[0]} jurnali` : `Guruhlar jurnali (${selected.length || 7} ta guruh)`}\n👥 Talabalar soni: ${subset.length} nafar`)
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


