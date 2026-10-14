import type { NextRequest } from 'next/server'
import { AUTH_COOKIE } from '@/lib/auth'

/** POST /api/auth/logout — sessiya cookie'sini o'chiradi */
export async function POST(request: NextRequest) {
  const res = Response.json({ ok: true })
  const https = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  const secure = https ? '; Secure' : ''
  res.headers.append('Set-Cookie', `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`)
  return res
}
