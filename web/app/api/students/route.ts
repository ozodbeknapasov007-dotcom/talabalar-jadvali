import { loadStudentsWithSource } from '@/lib/server/source'
import type { StudentsPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { students, source } = await loadStudentsWithSource()
    const body: StudentsPayload = { students, source, fetchedAt: new Date().toISOString() }
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
