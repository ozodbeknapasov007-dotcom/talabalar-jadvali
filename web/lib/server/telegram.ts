import 'server-only'

/** Bot tokeni va hisobot chati — Rasmiy yangi bot: @shartnoma_editor_bot */
export const OFFICIAL_BOT_TOKEN = '8645386410:AAGpMWubDaLI6KQ_hR9WuqkhCaoOAK2qWEM'
export const OFFICIAL_CHAT_ID = '8135594558'
export const OFFICIAL_CHANNEL_ID = '-1004375713276'

const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
// Muhim: agar Vercel muhitida eski bot tokeni (8615940322...) saqlanib qolgan bo'lsa,
// uni chetlab o'tib, yangi rasmiy botga (@shartnoma_editor_bot) ulanamiz!
export const TG_BOT_TOKEN = (envToken && !envToken.startsWith('8615940322')) ? envToken : OFFICIAL_BOT_TOKEN
export const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim() || OFFICIAL_CHAT_ID
export const TG_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID?.trim() || OFFICIAL_CHANNEL_ID

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
