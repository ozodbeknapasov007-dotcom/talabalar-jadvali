import { loadGroupSettings, saveGroupSettings } from '@/lib/server/source'

export const dynamic = 'force-dynamic'

/** Guruh sozlamalari: kurs, guruh rahbari, yo'nalish (data/guruhlar.json) */
export async function GET() {
  try {
    return Response.json({ settings: await loadGroupSettings() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { settings?: unknown } | null
  try {
    return Response.json({ success: true, settings: await saveGroupSettings(body?.settings) })
  } catch (e) {
    return Response.json({ success: false, error: (e as Error).message }, { status: 400 })
  }
}
