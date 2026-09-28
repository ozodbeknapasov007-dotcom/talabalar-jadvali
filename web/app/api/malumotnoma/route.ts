import type { NextRequest } from 'next/server'
import { isValidSana, malumotnomaBlocker, malumotnomaData, malumotnomaFileName, todayTashkent } from '@/lib/malumotnoma'
import { renderMalumotnoma } from '@/lib/server/malumotnoma'
import { loadStudents } from '@/lib/server/source'
import { DOCX_MIME, TG_BOT_TOKEN, TG_CHAT_ID, tgSendDocument } from '@/lib/server/telegram'
import { fullName } from '@/lib/student'

/*
  O'qiyotganligi haqida ma'lumotnoma — Word shablonidan (.docx).

  GET  ?row=99[&sana=28.09.2026]  — .docx faylni yuklab olish
  POST { row, sana? }             — .docx ni Telegram botga yuborish

  Matn faqat bazadagi talaba ma'lumotidan olinadi — erkin F.I.SH qabul qilinmaydi.
*/

export const dynamic = 'force-dynamic'

async function build(rowRaw: unknown, sanaRaw: unknown) {
  const row = Number(rowRaw)
  const sana = String(sanaRaw || '').trim() || todayTashkent()
  if (!Number.isInteger(row) || row <= 0) return { error: "row noto'g'ri", status: 400 } as const
  if (!isValidSana(sana)) return { error: "Sana DD.MM.YYYY ko'rinishida bo'lishi kerak", status: 400 } as const
  const student = (await loadStudents()).find((s) => s.row === row)
  if (!student) return { error: 'Talaba topilmadi', status: 404 } as const
  const blocker = malumotnomaBlocker(student)
  if (blocker) return { error: blocker, status: 422 } as const
  const data = malumotnomaData(student, sana)
  return { student, data, docx: await renderMalumotnoma(data) } as const
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams
  try {
    const r = await build(q.get('row'), q.get('sana'))
    if ('error' in r) return Response.json({ error: r.error }, { status: r.status })
    const name = malumotnomaFileName(r.student)
    return new Response(new Uint8Array(r.docx), {
      headers: {
        'Content-Type': DOCX_MIME,
        'Content-Disposition': `attachment; filename="malumotnoma.docx"; filename*=UTF-8''${encodeURIComponent(name).replace(/'/g, '%27')}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
    return Response.json({ error: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID sozlanmagan' }, { status: 500 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const r = await build(body.row, body.sana)
    if ('error' in r) return Response.json({ error: r.error }, { status: r.status })
    const s = r.student
    await tgSendDocument(TG_CHAT_ID, r.docx, malumotnomaFileName(s),
      `📄 <b>O‘qiyotganligi haqida ma’lumotnoma</b>\n` +
      `👤 <b>${fullName(s)}</b>\n` +
      `👥 Guruh ${s.group} · Shartnoma №${s.shnum || '—'}\n` +
      `🗓 Sana: ${r.data.sana}`)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
