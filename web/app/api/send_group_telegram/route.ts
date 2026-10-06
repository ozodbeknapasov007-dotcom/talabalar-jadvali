import type { NextRequest } from 'next/server'
import { REPO_PATHS, loadGroupSettings, loadStudents, readRepoFileIn } from '@/lib/server/source'
import { TG_BOT_TOKEN, TG_CHANNEL_ID, TG_CHAT_ID, tgSendPhoto } from '@/lib/server/telegram'
import { isAcademicLeave, isOutside } from '@/lib/student'

/**
 * Guruhning 1-varoqli A4 PDF rasm jurnalini Telegram kanalga va/yoki botga yuborish:
 * POST /api/send_group_telegram
 * Body: { groups: string[], target: 'channel' | 'bot' | 'both' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groups, target = 'both' } = body as { groups: string[]; target?: 'channel' | 'bot' | 'both' }

    if (!Array.isArray(groups) || !groups.length) {
      return Response.json({ error: "Guruhlar ro'yxati berilmadi" }, { status: 400 })
    }

    if (!TG_BOT_TOKEN) {
      return Response.json({ error: 'TELEGRAM_BOT_TOKEN sozlanmagan' }, { status: 500 })
    }

    const dests: { id: string; label: string }[] =
      target === 'both'
        ? [{ id: TG_CHANNEL_ID, label: 'Kanal' }, { id: TG_CHAT_ID, label: 'Shaxsiy bot' }]
        : target === 'bot'
          ? [{ id: TG_CHAT_ID, label: 'Shaxsiy bot' }]
          : [{ id: TG_CHANNEL_ID, label: 'Kanal' }]

    const [allStudents, groupSettings] = await Promise.all([
      loadStudents(),
      loadGroupSettings(),
    ])

    const sent: string[] = []
    const failed: string[] = []

    for (const group of groups) {
      const gTrim = String(group ?? '').trim()
      const isSafdan = gTrim === 'safdan' || gTrim.toLowerCase().includes('chiqaril')
      const isAkademik = gTrim === 'akademik' || gTrim.toLowerCase().includes('akademik')

      let fileName: string
      let caption: string
      let count = 0

      if (isSafdan) {
        fileName = 'Guruh_Talabalar_safidan_chiqarilganlar.jpg'
        count = allStudents.filter((s) => isOutside(s.group)).length
        caption = `📋 <b>Talabalar safidan chiqarilganlar jurnali</b>\n👥 <b>Talabalar soni:</b> ${count} nafar\n🏛 <b>Shahrisabz Tibbiyot Texnikumi</b>`
      } else if (isAkademik) {
        fileName = 'Guruh_Akademik_tatil_olganlar.jpg'
        count = allStudents.filter((s) => isAcademicLeave(s.group)).length
        caption = `📋 <b>Akademik ta'til olganlar jurnali</b>\n👥 <b>Talabalar soni:</b> ${count} nafar\n🏛 <b>Shahrisabz Tibbiyot Texnikumi</b>`
      } else {
        fileName = `Guruh_${gTrim}.jpg`
        const gInfo = groupSettings[gTrim] || {}
        count = allStudents.filter((s) => (s.group || '').trim() === gTrim).length
        const rahbar = gInfo.rahbar || '—'
        const yonalish = gInfo.yonalish || 'Hamshiralik ishi'
        caption = `📋 <b>Guruh ${gTrim} jurnali</b>\n📚 <b>Yo'nalish:</b> ${yonalish}\n👤 <b>Guruh rahbari:</b> ${rahbar}\n👥 <b>Talabalar soni:</b> ${count} nafar\n🏛 <b>Shahrisabz Tibbiyot Texnikumi</b>`
      }

      const imgBuf = await readRepoFileIn(REPO_PATHS.pdfJurnallar, fileName)
      if (!imgBuf) {
        failed.push(`${gTrim} (${fileName} topilmadi)`)
        continue
      }

      let groupSentOk = false
      for (const dest of dests) {
        try {
          await tgSendPhoto(dest.id, imgBuf, fileName, caption)
          groupSentOk = true
        } catch (err) {
          failed.push(`${gTrim} -> ${dest.label}: ${(err as Error).message}`)
        }
      }

      if (groupSentOk) {
        sent.push(gTrim)
      }

      // Kichik tanaffus (Telegram rate limit ga tushmaslik uchun)
      if (groups.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    }

    return Response.json({ ok: true, sent, failed })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
}
