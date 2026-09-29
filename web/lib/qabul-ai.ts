import ISTISNOLAR from './qabul-istisnolar.json'
import { qabulRow, type QabulIstisno, type QabulRow } from './qabul'
import type { Student } from './types'

/*
  QABUL shabloni uchun AI tarjima — faqat lib/qabul.ts qoidalari tanimagan muassasa
  nomlari uchun (Excelda sariq bo'ladiganlar). Tanilgan nomlar qoidalar bo'yicha qoladi.
  /api/ai-translate: rasmiy o'zbekcha → ruscha → inglizcha. Natija brauzerda eslab
  qolinadi, bir nom qayta so'ralmaydi.
*/

interface Tarjima { uz: string; ru: string; en: string }

const KEY = 'qabul_ai_tarjima_v1'
let cache: Record<string, Tarjima> | null = null

const keyOf = (makUz: string) => makUz.trim().toLowerCase()

function load(): Record<string, Tarjima> {
  if (cache) return cache
  try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { cache = {} }
  return cache!
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache ?? {})) } catch { /* xotirada ishlayveradi */ }
}

const needsAi = (r: QabulRow) => r.review.includes('makEn') && !!r.makUz

export function rowsFor(students: Student[]): QabulRow[] {
  return students.map((s) => qabulRow(s, (ISTISNOLAR as Record<string, QabulIstisno>)[String(s.pinfl || '').replace(/\D/g, '')]))
}

/** Qoidalar tanimagan nomlarni AI dan olib keshga yozadi. Xato bo'lsa jim — qoidalar natijasi (sariq) qoladi. */
export async function ensureAiTranslations(students: Student[]): Promise<{ translated: number; error?: string }> {
  const c = load()
  const todo = new Map<string, QabulRow>()
  for (const r of rowsFor(students)) if (needsAi(r) && !c[keyOf(r.makUz)]) todo.set(keyOf(r.makUz), r)
  if (!todo.size) return { translated: 0 }

  const list = [...todo.values()]
  let translated = 0
  for (let i = 0; i < list.length; i += 40) {
    const chunk = list.slice(i, i + 40)
    try {
      const res = await fetch('/api/ai-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: chunk.map((r) => ({ uz: r.makUz, hudud: r.viloyat, turi: r.eduType })) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) return { translated, error: body.error || `AI tarjima xatosi (${res.status})` }
      for (const t of body.results as (Tarjima & { source: string })[]) {
        c[keyOf(t.source)] = { uz: t.uz, ru: t.ru, en: t.en }
        translated++
      }
      save()
    } catch (e) {
      return { translated, error: (e as Error).message }
    }
  }
  return { translated }
}

/** Qator uchun AI tarjimasi bo'lsa qo'llaydi (sariq belgisi olib tashlanadi) */
export function withAiTranslation(r: QabulRow): QabulRow {
  if (!needsAi(r)) return r
  const t = load()[keyOf(r.makUz)]
  if (!t) return r
  return { ...r, makUz: t.uz, makRu: t.ru, makEn: t.en, review: r.review.filter((k) => k !== 'makEn' && k !== 'makRu') }
}
