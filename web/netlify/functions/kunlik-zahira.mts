import { runDailyReport } from '../kunlik.mts'

/** Har kuni 18:00 (Toshkent) — talabalar_bazasi.json + 4-Excel zahirasi. 13:00 UTC = 18:00 UTC+5 */
export default () => runDailyReport('backup_json')

export const config = { schedule: '0 13 * * *' }
