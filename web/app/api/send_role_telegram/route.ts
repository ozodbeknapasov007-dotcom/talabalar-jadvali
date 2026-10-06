import type { NextRequest } from 'next/server'
import { TG_BOT_TOKEN, TG_CHAT_ID, tgSendDocument } from '@/lib/server/telegram'

/**
 * Excel rollar faylini Telegram botga yuborish:
 * POST /api/send_role_telegram
 */
export async function POST(request: NextRequest) {
  try {
    if (!TG_BOT_TOKEN) {
      return Response.json({ error: 'TELEGRAM_BOT_TOKEN sozlanmagan' }, { status: 500 })
    }

    const fd = await request.formData()
    const file = fd.get('file') as File | null
    const caption = (fd.get('caption') as string) || ''
    const chatId = (fd.get('chat_id') as string) || TG_CHAT_ID

    if (!file) {
      return Response.json({ error: 'Fayl berilmadi' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    await tgSendDocument(chatId, buf, file.name, caption)

    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
}
