/** Joriy o'quv yili boshlangan yil: 2026 → 2026/2027 */
export const OQUV_YILI_BOSHI = 2026

/** Maxsus guruhlar — rasmiy kontingentga kirmaydi */
export const ACADEMIC_LEAVE_GROUP = "Akademik ta'til olganlar"
export const WITHDRAWN_GROUP = 'Talabalar safidan chiqarilganlar'

/* ---------------------------------------------------------------- guruhlar */

export interface GroupSetting {
  kurs: number
  rahbar: string
  yonalish: string
}
export type GroupSettings = Record<string, GroupSetting>

export const KURS_LIST = [1, 2, 3] as const
export const GROUP_DIRECTIONS = ['Hamshiralik ishi', 'Farmatsiya ishi', 'Feldsherlik ishi', 'Davolash ishi']
/** Akademik guruh kodi: 26-01, 25-03 ... */
export const GROUP_CODE = /^\d{2}-\d{2}$/

const H = 'Hamshiralik ishi'
const s = (kurs: number, rahbar: string, yonalish = H): GroupSetting => ({ kurs, rahbar, yonalish })

/**
 * Boshlang'ich guruh sozlamalari. Portalda "Guruh sozlamalari" orqali o'zgartirilganlari
 * data/guruhlar.json da saqlanadi va applyGroupSettings() bilan shular ustiga qo'yiladi.
 * 26-07 guruhi 26.09.2026 da tugatildi (talabasi 26-03 ga o'tkazildi).
 * 2025-2026 kontingenti jadvalidagidek: 24-15, 24-16 — 2-kurs; 24-14 bitirgan (bazada yo'q).
 */
export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  '26-01': s(1, 'Mirzayeva.D', 'Farmatsiya ishi'),
  '26-02': s(1, 'Ochilov.D'),
  '26-03': s(1, 'A.Asraliyev'),
  '26-04': s(1, 'Xamdamova.M'),
  '26-05': s(1, 'Rayimova.X'),
  '26-06': s(1, 'Yuldashev.O'),
  '26-07': s(1, 'Asraliyev.A'),
  '24-15': s(2, 'Asraliyev.A'),
  '24-16': s(2, 'Yuldashev.O'),
  '25-16': s(2, 'Xidirova.N'),
  '25-17': s(2, 'Meyliyev.B'),
  '25-18': s(2, 'Eshnayev.B'),
  '25-19': s(2, 'Shukurova.G'),
  '25-20': s(2, 'Maxamadiyev.L'),
  '25-21': s(2, 'Eshnayev.B'),
  '25-22': s(2, 'Rahmatova.Sh'),
  '25-23': s(2, 'Quldosheva.K'),
  '24-11': s(3, 'Rahmatova.Sh'),
  '24-12': s(3, 'Botirova.G'),
  '24-13': s(3, 'Elmurodova.N'),
}

/*
  Quyidagilar applyGroupSettings() tomonidan O'RNIDA yangilanadi (import qilgan
  modullar doim eng so'nggi sozlamani ko'radi). Qo'lda o'zgartirmang.
*/
/** Kurslar va ularning akademik guruhlari */
export const COURSES: { kurs: number; groups: string[] }[] = KURS_LIST.map((kurs) => ({ kurs, groups: [] }))
/** Barcha rasmiy akademik guruhlar (kurs, keyin kod tartibida) */
export const GROUPS: string[] = []
export const GROUP_LEADERS: Record<string, string> = {}
export const GROUP_TITLES: Record<string, string> = {}
/** Hozir qo'llanilgan sozlamalar */
export const GROUP_SETTINGS: GroupSettings = {}

/** Sozlamalarni tekshirib, faqat to'g'ri yozuvlarni qaytaradi */
export function sanitizeGroupSettings(raw: unknown): GroupSettings {
  const out: GroupSettings = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [g, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!GROUP_CODE.test(g) || !v || typeof v !== 'object') continue
    const { kurs, rahbar, yonalish } = v as Partial<GroupSetting>
    const k = Number(kurs)
    if (!KURS_LIST.includes(k as 1 | 2 | 3)) continue
    out[g] = {
      kurs: k,
      rahbar: String(rahbar ?? '').trim().slice(0, 60),
      yonalish: String(yonalish ?? '').trim().slice(0, 60) || H,
    }
  }
  return out
}

export function applyGroupSettings(settings: GroupSettings) {
  const clean = sanitizeGroupSettings(settings)
  for (const k of Object.keys(GROUP_SETTINGS)) delete GROUP_SETTINGS[k]
  for (const k of Object.keys(GROUP_LEADERS)) delete GROUP_LEADERS[k]
  for (const k of Object.keys(GROUP_TITLES)) delete GROUP_TITLES[k]
  for (const c of COURSES) c.groups.length = 0
  GROUPS.length = 0

  for (const g of Object.keys(clean).sort()) {
    const v = clean[g]
    GROUP_SETTINGS[g] = v
    if (v.rahbar) GROUP_LEADERS[g] = v.rahbar
    GROUP_TITLES[g] = v.yonalish
    COURSES.find((c) => c.kurs === v.kurs)?.groups.push(g)
  }
  for (const c of COURSES) GROUPS.push(...c.groups)
}

applyGroupSettings(DEFAULT_GROUP_SETTINGS)

export const YON_OPTIONS = [
  'Hamshiralik ishi - 3 yillik',
  'Hamshiralik ishi - 2 yillik',
  'Hamshiralik ishi',
  'Feldsherlik ishi',
  'Farmatsiya ishi',
  'Davolash ishi',
]
