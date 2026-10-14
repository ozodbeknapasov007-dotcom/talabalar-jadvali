import { createHash } from 'node:crypto'
import { loadStudentsWithSource } from '@/lib/server/source'
import type { StudentsPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Talabalar ro'yxati. Trafikni tejash: mijoz oxirgi olgan versiyasini `x-students-version` sarlavhasida yuboradi;
 * ma'lumot o'zgarmagan bo'lsa 400 KB o'rniga `{ unchanged: true }` qaytadi. (Standart If-None-Match ni Netlify
 * funksiyaga yetkazmaydi, shuning uchun o'z sarlavhamiz.) Vercel «origin transfer» limiti shu so'rovdan tugagan edi.
 */
export async function GET(req: Request) {
  try {
    const { students, source } = await loadStudentsWithSource()
    const version = createHash('sha1').update(JSON.stringify(students)).update(source).digest('base64url')
    const headers = { 'Cache-Control': 'no-store', 'x-students-version': version }
    if (req.headers.get('x-students-version') === version) return Response.json({ unchanged: true, version }, { headers })
    const body: StudentsPayload & { version: string } = { students, source, fetchedAt: new Date().toISOString(), version }
    return Response.json(body, { headers })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
