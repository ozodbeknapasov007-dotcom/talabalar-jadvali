import { sendChange } from '@/lib/server/source'
import { EDIT_FIELDS, type Change } from '@/lib/types'

/** Kiruvchi so'rovni faqat ruxsat etilgan maydonlar bilan qayta yig'amiz */
function parseChange(body: unknown): Change | null {
  if (!body || typeof body !== 'object') return null
  const { type, data } = body as { type?: string; data?: Record<string, unknown> }
  if (!data || typeof data !== 'object') return null
  const str = (v: unknown) => (v == null ? '' : String(v).slice(0, 500))

  if (type === 'add_student') {
    const fields: Record<string, string> = {}
    for (const f of EDIT_FIELDS) if (f in data) fields[f] = str(data[f]).trim()
    if (!fields.ism) return null
    return { type, data: fields }
  }

  const row = Number(data.row)
  if (!Number.isInteger(row) || row < 2) return null

  if (type === 'update_student') {
    const src = (data.fields ?? {}) as Record<string, unknown>
    const fields: Record<string, string> = {}
    for (const f of EDIT_FIELDS) if (f in src) fields[f] = str(src[f]).trim()
    if (!Object.keys(fields).length) return null
    return { type, data: { row, fields } }
  }
  if (type === 'verify_student') {
    const status = data.status === 'TASDIQLANDI' ? 'TASDIQLANDI' : 'KUTILMOQDA'
    return { type, data: { row, status, shnum: str(data.shnum), pinfl: str(data.pinfl), ism: str(data.ism) } }
  }
  if (type === 'delete_student') {
    return { type, data: { row, shnum: str(data.shnum), pinfl: str(data.pinfl), ism: str(data.ism), fish: str(data.fish) } }
  }
  return null
}

export async function POST(request: Request) {
  const change = parseChange(await request.json().catch(() => null))
  if (!change) return Response.json({ success: false, error: "O'zgarish ma'lumoti noto'g'ri" }, { status: 400 })
  try {
    await sendChange(change)
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ success: false, error: (e as Error).message }, { status: 502 })
  }
}
