import { readRepoFile } from '@/lib/server/source'
import type { ContractsPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Buxgalteriya shartnomalari va qarzdorlik hisoboti */
export async function GET() {
  try {
    const buf = await readRepoFile(['data/contracts.json', 'contracts.json'])
    if (!buf) {
      return Response.json({ error: "data/contracts.json fayli topilmadi" }, { status: 404 })
    }
    const data = JSON.parse(buf.toString('utf-8')) as ContractsPayload
    return Response.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
