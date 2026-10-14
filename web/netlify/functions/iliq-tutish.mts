/*
  Ish vaqtida (08:00–20:59, Toshkent) har 5 daqiqada saytning server funksiyasini "uyg'otib" turadi.
  Bot kam ishlatilgani uchun Netlify funksiyani har safar sovuq holatdan ishga tushirardi (+1–3 s),
  keshlangan fayllar ham yo'qolardi. Oyiga ~4 700 chaqiruv (13 soat × 12 × 30) — bepul tarif chegarasidan ancha past.
  Cron UTC da: 03–15 UTC = 08–20 Toshkent (UTC+5).
*/
export default async () => {
  const site = (process.env.URL || 'https://talabalar-jadvali.netlify.app').replace(/\/$/, '')
  try {
    // Yengil so'rov: Telegram'ga ham, GitHub'ga ham murojaat qilmaydi; t= — CDN keshini chetlab o'tish
    const res = await fetch(`${site}/api/telegram_webhook?t=${Date.now()}`, { signal: AbortSignal.timeout(20_000) })
    return new Response(null, { status: res.status })
  } catch (e) {
    console.error('[iliq-tutish] xato:', (e as Error).message)
    return new Response(null, { status: 500 })
  }
}

export const config = { schedule: '*/5 3-15 * * *' }
