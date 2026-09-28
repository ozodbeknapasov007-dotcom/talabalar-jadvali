/** Joriy o'quv yili boshlangan yil: 2026 → 2026/2027 */
export const OQUV_YILI_BOSHI = 2026

/**
 * Kurslar va ularning akademik guruhlari. Guruh kodi qabul yilini bildiradi:
 * 26-xx — 2026-yil qabuli (1-kurs), 25-xx — 2-kurs, 24-xx — 3-kurs.
 * Ro'yxatda yo'q, lekin "YY-NN" ko'rinishidagi guruh ham avtomatik akademik guruh hisoblanadi.
 */
export const COURSES: { kurs: number; groups: readonly string[] }[] = [
  // 26-07 guruhi 26.09.2026 da tugatildi (talabasi 26-03 ga o'tkazildi)
  { kurs: 1, groups: ['26-01', '26-02', '26-03', '26-04', '26-05', '26-06'] },
  { kurs: 2, groups: [] },
  { kurs: 3, groups: [] },
]

export const GROUPS: readonly string[] = COURSES.flatMap((c) => c.groups)

/** Maxsus guruhlar — rasmiy kontingentga kirmaydi */
export const ACADEMIC_LEAVE_GROUP = "Akademik ta'til olganlar"
export const WITHDRAWN_GROUP = 'Talabalar safidan chiqarilganlar'

export const GROUP_LEADERS: Record<string, string> = {
  '26-01': 'Mirzayeva.D',
  '26-02': 'Ochilov.D',
  '26-03': 'A.Asraliyev',
  '26-04': 'Xamdamova.M',
  '26-05': 'Rayimova.X',
  '26-06': 'Yuldashev.O',
}

export const GROUP_TITLES: Record<string, string> = {
  '26-01': 'Farmatsiya ishi',
  '26-02': 'Hamshiralik ishi',
  '26-03': 'Hamshiralik ishi',
  '26-04': 'Hamshiralik ishi',
  '26-05': 'Hamshiralik ishi',
  '26-06': 'Hamshiralik ishi',
}

export const YON_OPTIONS = [
  'Hamshiralik ishi - 3 yillik',
  'Hamshiralik ishi - 2 yillik',
  'Hamshiralik ishi',
  'Feldsherlik ishi',
  'Farmatsiya ishi',
  'Davolash ishi',
]

