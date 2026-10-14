import { createHash } from 'node:crypto'

/*
  Netlify jadval funksiyalari (functions/kunlik-kontingent, functions/kunlik-zahira) uchun umumiy qism:
  saytning o'z /api/telegram_webhook?action=... manzilini kalit bilan chaqiradi. Kalit
  lib/server/telegram.ts dagi TG_REPORT_KEY bilan bir xil hisoblanadi. Jadval faqat production deployda ishlaydi.
  Qo'lda sinash: Netlify → Logs & metrics → Functions → kunlik-kontingent → Run now.
*/
export async function runDailyReport(action: 'kontingent' | 'backup_json') {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) {
    console.error(`[${action}] TELEGRAM_BOT_TOKEN sozlanmagan`)
    return new Response('TELEGRAM_BOT_TOKEN sozlanmagan', { status: 500 })
  }
  const key = createHash('sha256').update(`report:${token}`).digest('hex').slice(0, 32)
  const site = (process.env.URL || 'https://talabalar-jadvali.netlify.app').replace(/\/$/, '')

  // Qayta urinilmaydi: javob kechiksa ham xabar ketgan bo'lishi mumkin — ikki marta yuborilmasin.
  // Jadval funksiyasiga 30 soniya beriladi.
  try {
    const res = await fetch(`${site}/api/telegram_webhook?action=${action}&key=${key}`, { signal: AbortSignal.timeout(28_000) })
    const body = await res.text()
    console.log(`[${action}] ${res.status} ${body.slice(0, 300)}`)
    return new Response(body, { status: res.status })
  } catch (e) {
    console.error(`[${action}] xato:`, (e as Error).message)
    return new Response('Hisobot yuborilmadi', { status: 500 })
  }
}
