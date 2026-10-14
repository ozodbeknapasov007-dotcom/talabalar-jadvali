import { runDailyReport } from '../kunlik.mts'

/** Har kuni 09:00 (Toshkent) — kontingent hisoboti TELEGRAM_CHAT_ID ga. Netlify cron UTC da: 04:00 UTC = 09:00 UTC+5 */
export default () => runDailyReport('kontingent')

export const config = { schedule: '0 4 * * *' }
