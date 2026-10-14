import { createHash } from 'node:crypto'
import { loadStudentsWithSource } from '@/lib/server/source'
import type { StudentsPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Talabalar ro'yxati. Trafikni tejash uchun ETag: ma'lumot o'zgarmagan bo'lsa brauzer 400 KB o'rniga
 * bo'sh 304 javob oladi (Vercel/Netlify «origin transfer» limiti shu so'rovdan tugab qolgan edi).
 */
export async function GET(req: Request) {
  try {
    const { students, source } = await loadStudentsWithSource()
    const etag = `"${createHash('sha1').update(JSON.stringify(students)).update(source).digest('base64url')}"`
    const headers = { ETag: etag, 'Cache-Control': 'private, no-cache' }
    if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })
    const body: StudentsPayload = { students, source, fetchedAt: new Date().toISOString() }
    return Response.json(body, { headers })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
