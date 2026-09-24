import { localFlush, localSyncStatus, syncMode } from '@/lib/server/source'

export const dynamic = 'force-dynamic'

/** Lokal rejimda Python xizmatining GitHub'ga yuborish holati; Vercel'da navbat rejimi */
export async function GET() {
  if (syncMode() !== 'local') return Response.json({ mode: 'github', state: 'queue' })
  try {
    return Response.json({ mode: 'local', ...(await localSyncStatus()) })
  } catch {
    return Response.json({ mode: 'local', state: 'offline', message: "Python xizmati ishlamayapti" })
  }
}

/** "Hozir yuborish" — Python xizmatiga 30 soniyani kutmasdan GitHub'ga push qilishni aytadi */
export async function POST() {
  if (syncMode() !== 'local') return Response.json({ success: false, error: 'Faqat lokal rejimda' }, { status: 400 })
  try {
    return Response.json(await localFlush())
  } catch {
    return Response.json({ success: false, error: "Python xizmati ishlamayapti" }, { status: 502 })
  }
}
