import type { NextRequest } from 'next/server'
import { readRepoFileIn } from '@/lib/server/source'
import { TG_BOT_TOKEN, TG_CHAT_ID, tgSendDocument } from '@/lib/server/telegram'

/**
 * Davomat jurnali va So'rovnoma fayllarini to'g'ridan-to'g'ri yuklab olish yoki Telegramga yuborish
 * GET  /api/download_davomat?type=excel|docx|zip|sorovnoma&group=26-01
 * POST /api/download_davomat  { type: 'excel'|'docx'|'zip'|'sorovnoma', group?: '26-01' }
 */
export async function GET(request: NextRequest) {
  const type = (request.nextUrl.searchParams.get('type') || 'excel').toLowerCase()
  const group = (request.nextUrl.searchParams.get('group') || '').trim()

  let fileName = 'Davomat_Jurnali_Uchun_Malumotlar.xlsx'
  let mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const dirs = ['hisobotlar/davomat_jurnallari', 'hisobotlar', '']

  if (type === 'zip') {
    if (group === '1-kurs' || group === '1') {
      fileName = '1-kurs_Guruhlar_Davomat_Jurnallari_Word.zip'
    } else {
      fileName = 'Barcha_Guruhlar_Davomat_Jurnallari_Word.zip'
    }
    mimeType = 'application/zip'
  } else if (type === 'docx' || type === 'word') {
    if (group && group !== 'barcha' && group !== 'all') {
      fileName = `Davomat_jurnali_${group}.docx`
    } else {
      fileName = "Davomat jurnali 26-02 (TO'LDIRILGAN).docx"
    }
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  } else if (type === 'sorovnoma') {
    fileName = '1-kurs_Sorovnoma_Malumotlari.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }

  const buf = await readRepoFileIn(dirs, fileName)
  if (!buf) {
    return Response.json({ error: `${fileName} fayli topilmadi` }, { status: 404 })
  }

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'no-store',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    if (!TG_BOT_TOKEN) {
      return Response.json({ error: 'TELEGRAM_BOT_TOKEN sozlanmagan' }, { status: 500 })
    }
    const body = await request.json().catch(() => ({}))
    const t = (body.type || 'excel').toLowerCase()
    const group = (body.group || '').trim()
    const chatId = body.chatId || TG_CHAT_ID

    let fileName = 'Davomat_Jurnali_Uchun_Malumotlar.xlsx'
    let caption = "📝 <b>Davomat Jurnali Uchun Talabalar Ma'lumotlari (.xlsx)</b>\nBarcha 1-kurs va 26-02 guruhlari uchun andoza"
    const dirs = ['hisobotlar/davomat_jurnallari', 'hisobotlar', '']

    if (t === 'zip') {
      if (group === '1-kurs' || group === '1') {
        fileName = '1-kurs_Guruhlar_Davomat_Jurnallari_Word.zip'
        caption = "📦 <b>1-kurs Guruhlari Davomat Jurnallari (Word .docx ZIP)</b>\nBarcha 6 ta 1-kurs guruhlari rasmiy jurnallari"
      } else {
        fileName = 'Barcha_Guruhlar_Davomat_Jurnallari_Word.zip'
        caption = "📦 <b>Barcha 19 ta Guruh Davomat Jurnallari (Word .docx ZIP)</b>\n1-kurs, 2-kurs va 3-kurs rasmiy to'ldirilgan jurnallari"
      }
    } else if (t === 'docx' || t === 'word') {
      if (group && group !== 'barcha' && group !== 'all') {
        fileName = `Davomat_jurnali_${group}.docx`
        caption = `📄 <b>Guruh ${group} Davomat jurnali (Word hujjati)</b>\nBarcha talabalar, telefonlar va manzillar to'ldirilgan`
      } else {
        fileName = "Davomat jurnali 26-02 (TO'LDIRILGAN).docx"
        caption = "📄 <b>Davomat jurnali 26-02 (Avtomatik to'ldirilgan Word hujjati)</b>\nBarcha jadvallari to'liq to'ldirilgan"
      }
    } else if (t === 'sorovnoma') {
      fileName = '1-kurs_Sorovnoma_Malumotlari.xlsx'
      caption = "📋 <b>1-kurs Talabalari So'rovnoma Ma'lumotlari (.xlsx)</b>\nManzillar, ota-ona ma'lumotlari va toza telefon raqamlar"
    }

    const buf = await readRepoFileIn(dirs, fileName)
    if (!buf) {
      return Response.json({ error: `${fileName} fayli topilmadi` }, { status: 404 })
    }

    await tgSendDocument(chatId, buf, fileName, caption)
    return Response.json({ ok: true, file: fileName })
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
}
