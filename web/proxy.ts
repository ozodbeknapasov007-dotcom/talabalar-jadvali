import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIE, isLocalRequest, verifySessionToken } from '@/lib/auth'

/*
  Portalga kirish nazorati: login qilinmagan so'rov sahifada /login ga yo'naltiriladi, API'da 401.
  Kompyuterda localhost orqali ochilgan portal — loginsiz (lib/auth.ts → isLocalRequest).
  Ochiq yo'llar (o'z himoyasi bor): Telegram webhook (maxfiy kalit / &key=), MyTest (Bearer token),
  kirish sahifasi va kirish API'si. Statik fayllar matcher'da chiqarib tashlangan.
*/

const PUBLIC_PATHS = new Set(['/login', '/api/telegram_webhook', '/api/mytest-roster'])
const isPublic = (p: string) => PUBLIC_PATHS.has(p) || p.startsWith('/api/auth/')

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  // nextUrl.hostname Next serverida doim "localhost" bo'ladi — brauzer ochgan haqiqiy manzil Host sarlavhasida
  const host = (request.headers.get('host') || '').replace(/:\d+$/, '')
  if (isLocalRequest(host)) {
    // Lokalda kirish sahifasi kerak emas — to'g'ridan-to'g'ri portalga
    return pathname === '/login' ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next()
  }
  if (isPublic(pathname)) return NextResponse.next()
  if (await verifySessionToken(request.cookies.get(AUTH_COOKIE)?.value)) {
    return NextResponse.next()
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'Kirish talab qilinadi' }, { status: 401 })
  }
  const login = new URL('/login', request.url)
  if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(login)
}

export const config = {
  // Next ichki fayllari, rasm optimizatsiyasi va ikonkalar — har doim ochiq
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.svg|robots.txt).*)'],
}
