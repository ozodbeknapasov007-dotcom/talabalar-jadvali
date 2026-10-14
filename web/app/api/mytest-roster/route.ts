import { timingSafeEqual } from 'node:crypto'
import { loadStudentsWithSource } from '@/lib/server/source'
import { byName, fullName } from '@/lib/student'

export const dynamic = 'force-dynamic'

/*
  MyTest Admin uchun talabalar ro'yxati: faqat F.I.O va guruh (PINFL, pasport, telefon — yo'q).
  Chetlatilganlar va akademik ta'tildagilar berilmaydi.
  Kalit: Netlify → Environment variables → MYTEST_ROSTER_TOKEN; so'rovda "Authorization: Bearer <kalit>".
*/

const INACTIVE = /chiqarilgan|ta'til|taʼtil|ta’til/i

function authorized(request: Request): boolean {
  const expected = process.env.MYTEST_ROSTER_TOKEN || ''
  const got = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!expected || !got) return false
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(request: Request) {
  if (!process.env.MYTEST_ROSTER_TOKEN) {
    return Response.json({ error: 'MYTEST_ROSTER_TOKEN sozlanmagan' }, { status: 503 })
  }
  if (!authorized(request)) {
    return Response.json({ error: "Kalit noto'g'ri" }, { status: 401 })
  }
  try {
    const { students, source } = await loadStudentsWithSource()
    const list = students
      .filter((s) => s.group && !INACTIVE.test(s.group) && fullName(s))
      .sort((a, b) => a.group.localeCompare(b.group, 'uz') || byName(a, b))
      .map((s) => ({ name: fullName(s), group: s.group }))
    const groups = Array.from(new Set(list.map((s) => s.group)))
    return Response.json(
      { students: list, groups, count: list.length, source, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
