import 'server-only'

/** Bot tokeni va hisobot chati — Foydalanuvchi talab qilgan rasmiy bot: @new_students_shtt_bot */
export const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() || '8615940322:AAHkeQ7MH9OE6uGXI7_24YE8KdEC-xz8P7o'
export const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim() || '8135594558'
export const TG_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID?.trim() || '-1004375713276'

/** JPG rasmni Telegram'ga rasm sifatida yuborish */
export async function tgSendPhoto(chatId: string | number, jpg: Buffer, fileName: string, caption: string, replyMarkup?: unknown) {
  const fd = new FormData()
  fd.append('chat_id', String(chatId))
  fd.append('caption', caption)
  fd.append('parse_mode', 'HTML')
  if (replyMarkup) fd.append('reply_markup', JSON.stringify(replyMarkup))
  fd.append('photo', new Blob([new Uint8Array(jpg)], { type: 'image/jpeg' }), fileName)
  const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({ ok: false }))
  if (!data.ok) throw new Error(data.description || `Telegram ${res.status} qaytardi`)
  return data
}

/** Hujjatni (.xlsx yoki .pdf) Telegram'ga yuborish */
export async function tgSendDocument(chatId: string | number, doc: Buffer, fileName: string, caption: string) {
  const fd = new FormData()
  fd.append('chat_id', String(chatId))
  fd.append('caption', caption)
  fd.append('document', new Blob([new Uint8Array(doc)]), fileName)
  const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({ ok: false }))
  if (!data.ok) throw new Error(data.description || `Telegram ${res.status} qaytardi`)
  return data
}
