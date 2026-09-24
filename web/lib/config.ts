export const GROUPS = ['26-01', '26-02', '26-03', '26-04', '26-05', '26-06', '26-07'] as const

export const WITHDRAWN_GROUP = 'Talabalar safidan chiqarilganlar'

export const GROUP_LEADERS: Record<string, string> = {
  '26-01': 'Mirzayeva.D',
  '26-02': 'Ochilov.D',
  '26-03': 'A.Asraliyev',
  '26-04': 'Xamdamova.M',
  '26-05': 'Rayimova.X',
  '26-06': 'Yuldashev.O',
  '26-07': 'Asraliyev.A',
}

export const GROUP_TITLES: Record<string, string> = {
  '26-01': 'Farmatsiya ishi',
  '26-02': 'Hamshiralik ishi',
  '26-03': 'Hamshiralik ishi',
  '26-04': 'Hamshiralik ishi',
  '26-05': 'Hamshiralik ishi',
  '26-06': 'Hamshiralik ishi',
  '26-07': 'Hamshiralik ishi',
}

export const YON_OPTIONS = [
  'Hamshiralik ishi - 3 yillik',
  'Hamshiralik ishi - 2 yillik',
  'Hamshiralik ishi',
  'Feldsherlik ishi',
  'Farmatsiya ishi',
  'Davolash ishi',
]

export const LEGACY_URL = process.env.NEXT_PUBLIC_LEGACY_URL || 'https://talabalar-ro-yhati.vercel.app'
