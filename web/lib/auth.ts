/*
  Portalga kirish (login + parol). Hisob faqat muhit o'zgaruvchilaridan — kodga yozilmaydi (repo ommaviy):
    PORTAL_LOGIN, PORTAL_PASSWORD           — Netlify → Environment variables, kompyuterda web/.env.local
    PORTAL_SESSION_SECRET (ixtiyoriy)       — bo'lmasa login+paroldan hosil qilinadi (parol o'zgarsa
                                              barcha eski sessiyalar o'zi bekor bo'ladi)
  Sessiya: HttpOnly cookie "<tugash_vaqti>.<HMAC-SHA256>". proxy.ts har so'rovda imzoni tekshiradi.
  Web Crypto ishlatiladi — proxy va route handler'larda bir xil ishlaydi.
*/

export const AUTH_COOKIE = 'portal_session'
export const SESSION_DAYS = 30

const enc = new TextEncoder()

export function authConfigured(): boolean {
  return !!(process.env.PORTAL_LOGIN?.trim() && process.env.PORTAL_PASSWORD)
}

function secret(): string {
  return process.env.PORTAL_SESSION_SECRET?.trim() ||
    `session:${process.env.PORTAL_LOGIN?.trim() ?? ''}:${process.env.PORTAL_PASSWORD ?? ''}`
}

async function hmacHex(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)))
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Uzunligi va mazmuni bo'yicha vaqtga bog'liq bo'lmagan taqqoslash */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

/** Login va parolni tekshirish (har ikkisi HMAC orqali — vaqt bo'yicha farq sezilmaydi) */
export async function checkCredentials(login: string, password: string): Promise<boolean> {
  if (!authConfigured()) return false
  const key = 'credentials-check'
  const [a, b, c, d] = await Promise.all([
    hmacHex(key, login.trim()), hmacHex(key, process.env.PORTAL_LOGIN!.trim()),
    hmacHex(key, password), hmacHex(key, process.env.PORTAL_PASSWORD!),
  ])
  return safeEqual(a, b) && safeEqual(c, d)
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const exp = now + SESSION_DAYS * 24 * 3600 * 1000
  return `${exp}.${await hmacHex(secret(), `portal:${exp}`)}`
}

export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !authConfigured()) return false
  const [expStr, sig] = token.split('.')
  const exp = Number(expStr)
  if (!sig || !Number.isFinite(exp) || exp < now) return false
  return safeEqual(sig, await hmacHex(secret(), `portal:${exp}`))
}
