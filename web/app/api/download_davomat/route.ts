import type { NextRequest } from 'next/server'
import { readRepoFileIn } from '@/lib/server/source'
import { TG_BOT_TOKEN, TG_CHAT_ID, tgSendDocument } from '@/lib/server/telegram'

/**
 * Barcha hisobotlar, rollar, davomat jurnallari va so'rovnoma fayllarini yuklab olish / Telegramga yuborish:
 * GET  /api/download_davomat?type=excel|docx|zip|sorovnoma|topshirmaganlar&group=26-01&role=buxgalteriya|guruh_rahbari|toliq|qabul_shablon
 * POST /api/download_davomat  { type?: string, role?: string, group?: string, chatId?: string }
 */
export async function GET(request: NextRequest) {
  const type = (request.nextUrl.searchParams.get('type') || '').toLowerCase().trim()
  const role = (request.nextUrl.searchParams.get('role') || '').toLowerCase().trim()
  const group = (request.nextUrl.searchParams.get('group') || '').trim()

  let fileName = 'Davomat_Jurnali_Uchun_Malumotlar.xlsx'
  let mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const dirs = [
    'Kontraktlar',
    'hisobotlar/rollar',
    'hisobotlar/qabul',
    'hisobotlar/qabul/guruhlar',
    'hisobotlar/davomat_jurnallari',
    'hisobotlar',
    '',
  ]

  // 1. Rollar bo'yicha .xlsx eksportlar
  if (role === 'buxgalteriya' || role === '1') {
    fileName = '1_Buxgalteriya_Shartnoma_va_Pasport.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (role === 'admin' || role === 'baza_admin' || role === '2') {
    fileName = '2_Baza_Admin_Pasport_va_Shahodatnoma.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (role === 'guruh_rahbari' || role === 'guruh_rahbarlari' || role === '3') {
    fileName = '3_Guruh_Rahbarlari_Talabalar_Malumotlari.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (role === 'toliq' || role === '4') {
    fileName = '4_Toliq_Malumotlar_Bazasi.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (role === 'qabul_shablon' || role === 'qabul') {
    fileName = 'QABUL - 2026.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  // 2. Turlar bo'yicha hisobotlar
  else if (type === 'qabul_group' && group) {
    fileName = `QABUL - 2026 (${group}).xlsx`
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (type === 'topshirmaganlar' || type === 'topshirmaganlar_xlsx') {
    fileName = '1-kurs_Sorovnoma_Topshirmaganlar_Hisoboti.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (type === 'topshirmaganlar_docx') {
    fileName = '1-kurs_Sorovnoma_Topshirmaganlar_Hisoboti.docx'
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  } else if (type === 'zip') {
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
  } else if (type === 'contracts_file' || type === '02.10') {
    fileName = '02.10.2026_GACHA_KONTRAKTLAR.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (type === 'contracts' || type === 'kontraktlar' || role === 'contracts') {
    fileName = '02.10.2026_GACHA_KONTRAKTLAR.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (type === 'sorovnoma') {
    fileName = '1-kurs_Sorovnoma_Malumotlari.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (type === 'excel' || type === 'davomat_excel' || !type) {
    fileName = 'Davomat_Jurnali_Uchun_Malumotlar.xlsx'
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }

  const buf = await readRepoFileIn(dirs, fileName)
  if (!buf) {
    return Response.json({ error: `${fileName} fayli topilmadi` }, { status: 404 })
  }

  const asciiName = fileName.replace(/[^\x20-\x7E]/g, '_')
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
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
    const t = (body.type || '').toLowerCase().trim()
    const r = (body.role || '').toLowerCase().trim()
    const group = (body.group || '').trim()
    const chatId = body.chatId || TG_CHAT_ID

    let fileName = 'Davomat_Jurnali_Uchun_Malumotlar.xlsx'
    let caption = "📝 <b>Davomat Jurnali Uchun Talabalar Ma'lumotlari (.xlsx)</b>\nBarcha 1-kurs va 26-02 guruhlari uchun andoza"
    const dirs = [
      'hisobotlar/rollar',
      'hisobotlar/qabul',
      'hisobotlar/qabul/guruhlar',
      'hisobotlar/davomat_jurnallari',
      'hisobotlar',
      '',
    ]

    if (r === 'buxgalteriya' || r === '1') {
      fileName = '1_Buxgalteriya_Shartnoma_va_Pasport.xlsx'
      caption = "📊 <b>1. Buxgalteriya (Shartnoma № va Pasport) (.xlsx)</b>\nBarcha 19 ta guruh sahifalari bilan"
    } else if (r === 'guruh_rahbari' || r === '3') {
      fileName = '3_Guruh_Rahbarlari_Talabalar_Malumotlari.xlsx'
      caption = "📊 <b>3. Guruh Rahbarlari Uchun Ma'lumotlar (.xlsx)</b>\nTug'ilgan sana, pasport, shahodatnoma va barcha guruhlar"
    } else if (r === 'toliq' || r === '4') {
      fileName = '4_Toliq_Malumotlar_Bazasi.xlsx'
      caption = "📊 <b>4. To'liq Ma'lumotlar Bazasi (.xlsx)</b>\nBarcha ustunlar jamlangan to'liq hisobot"
    } else if (r === 'qabul_shablon' || r === 'qabul') {
      fileName = 'QABUL - 2026.xlsx'
      caption = "📋 <b>QABUL - 2026 Rasmiy Admin Shabloni (.xlsx)</b>\n180 nafar 1-kurs talabalari rasmiy tarjimalari bilan"
    } else if (t === 'topshirmaganlar' || t === 'topshirmaganlar_xlsx') {
      fileName = '1-kurs_Sorovnoma_Topshirmaganlar_Hisoboti.xlsx'
      caption = "⚠️ <b>1-kurs So'rovnoma Topshirmagan Talabalar Hisoboti (.xlsx)</b>\nBarcha guruhlar bo'yicha alohida sahifalarda"
    } else if (t === 'topshirmaganlar_docx') {
      fileName = '1-kurs_Sorovnoma_Topshirmaganlar_Hisoboti.docx'
      caption = "⚠️ <b>1-kurs So'rovnoma Topshirmagan Talabalar Rasmiy Hisoboti (.docx)</b>\nChop etishga tayyor rasmiy hujjat"
    } else if (t === 'zip') {
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
