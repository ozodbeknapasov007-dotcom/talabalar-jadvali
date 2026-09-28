import type { NextRequest } from 'next/server'
import { GROUPS, GROUP_LEADERS, GROUP_TITLES } from '@/lib/config'
import { malumotnomaBlocker, malumotnomaData, malumotnomaFileName } from '@/lib/malumotnoma'
import { renderMalumotnoma } from '@/lib/server/malumotnoma'
import { REPO_PATHS, readRepoFile, readRepoFileIn } from '@/lib/server/source'
import { tgSendPhoto } from '@/lib/server/telegram'
import type { Student } from '@/lib/types'

/*
  24/7 Telegram bot webhook va kunlik hisobotlar (eski api/telegram_webhook.js dan ko'chirilgan).

  GET  ?action=kontingent   — 09:00 kontingent hisoboti (GitHub Actions chaqiradi)
  GET  ?action=backup_json  — 18:00 JSON baza + 4-Excel zahirasi
  POST                      — Telegram'dan kelgan xabar (bot tugmalari, talaba qidiruvi,
                              /malumotnoma <shartnoma № yoki F.I.SH> — faqat TELEGRAM_CHAT_ID chatida)

  Ma'lumot: data/talabalar_bazasi.json, hisobotlar/rollar/*.xlsx, hisobotlar/pdf_jurnallar/
  (Vercel'da GitHub'dan, kompyuterda diskdan). Token: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
*/

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

const BOT_KEYBOARD = {
  keyboard: [
    [{ text: '📈 Kontingentni olish' }, { text: "📋 4. To'liq Ma'lumotlar (.xlsx)" }],
    [{ text: '📊 1. Buxgalteriya (.xlsx)' }, { text: '🗂 2. Baza Admin (.xlsx)' }],
    [{ text: '👥 3. Guruh Rahbarlari (.xlsx)' }, { text: '📦 JSON Baza (.json)' }],
    [{ text: "⚠️ Kamchiliklar ro'yxati" }, { text: '📑 Guruh Jurnallari (PDF)' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
}

const ROLE_FILES = [
  { match: ['buxgalter', '1. buxgalter', '/buxgalteriya'], file: '1_Buxgalteriya_Shartnoma_va_Pasport.xlsx', title: '1. Buxgalteriya (Shartnoma № va Pasport)' },
  { match: ['baza admin', '2. baza', '/admin'], file: '2_Baza_Admin_Pasport_va_Shahodatnoma.xlsx', title: '2. Baza Administratori (Pasport va Shahodatnoma/Diplom)' },
  { match: ['guruh rahbar', '3. guruh', '/guruh_rahbari'], file: '3_Guruh_Rahbarlari_Talabalar_Malumotlari.xlsx', title: "3. Guruh Rahbarlari (Tug'ilgan sana, Pasport va Shahodatnoma)" },
  { match: ["to'liq", 'toliq', '4.', '/toliq'], file: '4_Toliq_Malumotlar_Bazasi.xlsx', title: "4. To'liq Ma'lumotlar (O'zim uchun barcha ustunlar)" },
]

const OFFICIAL: readonly string[] = GROUPS

async function loadStudentsDb(): Promise<Student[]> {
  const buf = await readRepoFile(REPO_PATHS.baza)
  if (!buf) return []
  try {
    const data = JSON.parse(buf.toString('utf-8'))
    return Array.isArray(data.students) ? data.students : []
  } catch {
    return []
  }
}

async function tg(method: string, body: BodyInit, json = false) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    ...(json ? { headers: { 'Content-Type': 'application/json' } } : {}),
    body,
  })
  return res.json().catch(() => ({ ok: false }))
}

function sendMessage(chatId: string | number, text: string) {
  return tg('sendMessage', JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: BOT_KEYBOARD }), true)
}

function sendDocument(chatId: string | number, buf: Buffer, fileName: string, caption: string) {
  const fd = new FormData()
  fd.append('chat_id', String(chatId))
  fd.append('caption', caption)
  fd.append('parse_mode', 'HTML')
  fd.append('document', new Blob([new Uint8Array(buf)]), fileName)
  return tg('sendDocument', fd)
}

function tashkentStamp() {
  const now = new Date(Date.now() + 5 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  const dd = p(now.getUTCDate()), mm = p(now.getUTCMonth() + 1)
  return { stamp: `${dd}.${mm}.${now.getUTCFullYear()} | ${p(now.getUTCHours())}:${p(now.getUTCMinutes())}`, ddmm: `${dd}.${mm}` }
}

async function kontingentText(reason: string) {
  const students = await loadStudentsDb()
  const official = students.filter((s) => OFFICIAL.includes(s.group))
  const withdrawn = students.filter((s) => !OFFICIAL.includes(s.group))
  const ver = official.filter((s) => s.verified === 'TASDIQLANDI').length
  const { stamp, ddmm } = tashkentStamp()
  const lines = [
    '🏛 <b>SHAHRISABZ TIBBIYOT TEXNIKUMI</b>',
    `📈 <b>TALABALAR KONTINGENTI MA'LUMOTI (${reason})</b>`,
    `🕒 Sana: <b>${stamp}</b>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👥 <b>Faol kontingent (${OFFICIAL.length} ta guruh): ${official.length} nafar</b>`,
    `✅ Tasdiqlangan hujjatlar: <b>${ver} / ${official.length} (${official.length ? Math.round((ver / official.length) * 100) : 0}%)</b>`,
    `🚫 Safdan chiqarilganlar: <b>${withdrawn.length} nafar</b>`,
    `📦 Umumiy bazada jami: <b>${students.length} nafar</b>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    '📋 <b>GURUHLAR VA RAHBARLAR KESIMIDA:</b>',
    '',
  ]
  OFFICIAL.forEach((g, i) => {
    const n = students.filter((s) => s.group === g).length
    lines.push(`<b>${i + 1}. Guruh ${g}</b> (${GROUP_TITLES[g] || 'Hamshiralik ishi'})\n   👤 Rahbar: <b>${GROUP_LEADERS[g] || '—'}</b> — <b>${n} nafar</b>`)
  })
  if (withdrawn.length) lines.push(`\n🔸 <b>Safdan chiqarilganlar:</b> ${withdrawn.length} nafar`)
  const bdays = official.filter((s) => String(s.dob || '').startsWith(`${ddmm}.`))
  if (bdays.length) {
    lines.push("\n🎂 <b>Bugun tug'ilgan kuni bo'lgan talabalar:</b>")
    for (const b of bdays) lines.push(`🎉 <b>${b.fish}</b> (Guruh ${b.group}, ${b.dob})`)
  }
  return lines.join('\n')
}

async function kamchiliklarText() {
  const students = (await loadStudentsDb()).filter((s) => OFFICIAL.includes(s.group))
  const lines = [
    '⚠️ <b>HUJJATIDA KAMCHILIGI BOR TALABALAR HISOBOTI</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `• Pasport seriyasi yo'q: <b>${students.filter((s) => !s.pv).length} nafar</b>`,
    `• JSHSHIR (PINFL) yo'q: <b>${students.filter((s) => !s.pinfl).length} nafar</b>`,
    `• Shahodatnoma/Diplom raqami yo'q: <b>${students.filter((s) => !s.sh_doc).length} nafar</b>`,
    `• Shartnoma № yo'q: <b>${students.filter((s) => !s.shnum).length} nafar</b>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
  ]
  students
    .filter((s) => !s.pv || !s.pinfl || !s.sh_doc || !s.shnum)
    .forEach((s, i) => {
      const miss = [!s.pv && 'Pasport', !s.pinfl && 'JSHSHIR', !s.sh_doc && 'Shahodatnoma/Diplom', !s.shnum && 'Shartnoma №'].filter(Boolean)
      lines.push(`${i + 1}. <b>${s.fish}</b> (Guruh ${s.group}, ${GROUP_LEADERS[s.group] || '—'})\n   ❌ <i>Yo'q: ${miss.join(', ')}</i>`)
    })
  return lines.join('\n')
}

async function searchText(query: string) {
  const q = query.trim().toLowerCase()
  const matches = (await loadStudentsDb()).filter((s) =>
    String(s.fish || '').toLowerCase().includes(q) ||
    String(s.shnum || '').toLowerCase() === q ||
    String(s.pv || '').toLowerCase().includes(q) ||
    String(s.pinfl || '').includes(q))
  if (!matches.length) return null
  const lines = [`🔍 <b>Qidiruv natijasi (${matches.length} ta topildi):</b>\n`]
  matches.slice(0, 8).forEach((s, i) => {
    lines.push(
      `<b>${i + 1}. ${s.fish}</b>\n` +
      `   • Guruh: <b>${s.group || '—'}</b> (Rahbar: ${GROUP_LEADERS[s.group] || '—'})\n` +
      `   • Shartnoma №: <b>${s.shnum || '—'}</b>\n` +
      `   • Tug'ilgan sana: <b>${s.dob || '—'}</b>\n` +
      `   • Pasport: <b>${s.pv || '—'}</b> (Berilgan: ${s.ber || '—'})\n` +
      `   • JSHSHIR: <code>${s.pinfl || '—'}</code>\n` +
      `   • Hujjat (${s.doc_tur || 'Shahodatnoma'}): <b>${s.sh_doc || '—'}</b>\n` +
      `   • Muassasa: ${s.mak || '—'} (${s.yil || '—'}-yil)\n` +
      `   • Tel: ${s.tel || '—'}`,
    )
  })
  if (matches.length > 8) lines.push(`\n<i>...va yana ${matches.length - 8} nafar talaba.</i>`)
  return lines.join('\n\n')
}

/** /malumotnoma 285 — bitta talaba topilsa ma'lumotnoma rasmini yuboradi */
async function malumotnomaCommand(chatId: string | number, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) {
    await sendMessage(chatId, "📄 Ma'lumotnoma uchun shartnoma raqami yoki F.I.SH yozing:\n<code>/malumotnoma 285</code>")
    return
  }
  const students = await loadStudentsDb()
  const exact = students.filter((s) => String(s.shnum || '').toLowerCase() === q)
  const found = exact.length ? exact : students.filter((s) => String(s.fish || '').toLowerCase().includes(q))
  if (!found.length) {
    await sendMessage(chatId, '❓ Bunday talaba topilmadi.')
    return
  }
  if (found.length > 1) {
    await sendMessage(chatId, `🔍 ${found.length} ta talaba topildi — shartnoma raqami bilan yozing:\n\n` +
      found.slice(0, 10).map((s) => `• ${s.fish} (Guruh ${s.group || '—'}) — <code>/malumotnoma ${s.shnum || '—'}</code>`).join('\n'))
    return
  }
  const s = found[0]
  const blocker = malumotnomaBlocker(s)
  if (blocker) {
    await sendMessage(chatId, `❌ ${s.fish}: ${blocker}`)
    return
  }
  const data = malumotnomaData(s)
  await tgSendPhoto(chatId, await renderMalumotnoma(data), malumotnomaFileName(s),
    `📄 <b>O‘qiyotganligi haqida ma’lumotnoma</b>\n👤 <b>${s.fish}</b>\n👥 Guruh ${s.group} · Shartnoma №${s.shnum || '—'}\n🗓 Sana: ${data.sana}`,
    BOT_KEYBOARD)
}

const notConfigured = () =>
  Response.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID sozlanmagan (Vercel → Settings → Environment Variables)' }, { status: 500 })

export async function GET(request: NextRequest) {
  const action = (request.nextUrl.searchParams.get('action') || '').toLowerCase()
  if (!action) return Response.json({ ok: true, status: 'Telegram 24/7 Webhook Active' })
  if (!BOT_TOKEN || !DEFAULT_CHAT_ID) return notConfigured()

  if (action === 'kontingent') {
    const result = await sendMessage(DEFAULT_CHAT_ID, await kontingentText('Kunlik 09:00 avto-hisobot'))
    return Response.json({ ok: true, action, result })
  }
  if (action === 'backup_json') {
    const { stamp } = tashkentStamp()
    const json = await readRepoFile(REPO_PATHS.baza)
    const excel = await readRepoFileIn(REPO_PATHS.rollar, '4_Toliq_Malumotlar_Bazasi.xlsx')
    if (json) await sendDocument(DEFAULT_CHAT_ID, json, 'talabalar_bazasi.json', `📦 <b>Talabalar bazasi (.json) — Kunlik 18:00 avto-zahira</b>\n🕒 Sana: ${stamp}`)
    if (excel) await sendDocument(DEFAULT_CHAT_ID, excel, '4_Toliq_Malumotlar_Bazasi.xlsx', `📊 <b>4. To'liq Ma'lumotlar Bazasi (.xlsx)</b>\n🕒 Sana: ${stamp}`)
    return Response.json({ ok: true, action, sent: { json: !!json, excel: !!excel } })
  }
  return Response.json({ ok: false, error: `Noma'lum action: ${action}` }, { status: 400 })
}

export async function POST(request: NextRequest) {
  if (!BOT_TOKEN) return notConfigured()
  // Telegram har doim 200 kutadi — aks holda xabarni qayta-qayta yuboradi
  try {
    const body = await request.json().catch(() => ({}))
    const msg = body.message || body.edited_message
    if (!msg?.chat?.id) return Response.json({ ok: true })
    const chatId = msg.chat.id
    const text = String(msg.text || '').trim()
    const t = text.toLowerCase()
    const { stamp } = tashkentStamp()

    if (['/start', '/menu', '/help', 'menyu', 'start'].includes(t)) {
      await sendMessage(chatId,
        "🤖 <b>Talabalar Bazasi va Shartnomalar Boti (24/7 Cloud Webhook)</b>\n\n" +
        "Quyidagi tugmalar orqali istalgan vaqtda kerakli Excel hisobotlarni, <b>Kontingent</b> ma'lumotini, <b>Guruh jurnallarini (PDF)</b> yoki <b>.json</b> bazani olishingiz mumkin:\n\n" +
        '• <b>📈 Kontingentni olish</b> — Guruhlar va rahbarlar kesimida kontingent\n' +
        '• <b>📊 1. Buxgalteriya (.xlsx)</b> — Shartnoma № va Pasport\n' +
        '• <b>🗂 2. Baza Admin (.xlsx)</b> — Pasport va Shahodatnoma/Diplom\n' +
        "• <b>👥 3. Guruh Rahbarlari (.xlsx)</b> — Tug'ilgan sana, Pasport, Shahodatnoma\n" +
        "• <b>📋 4. To'liq Ma'lumotlar (.xlsx)</b> — O'zingiz uchun to'liq baza\n" +
        '• <b>📦 JSON Baza (.json)</b> — To\'liq JSON baza fayli\n' +
        "• <b>⚠️ Kamchiliklar ro'yxati</b> — Hujjati to'liq bo'lmagan talabalar\n" +
        `• <b>📑 Guruh Jurnallari (PDF)</b> — Barcha ${OFFICIAL.length} ta guruh A4 PDF jurnallari\n\n` +
        "📄 <b>/malumotnoma 285</b> — talabaning o'qiyotganligi haqida ma'lumotnomasi (rasm)\n\n" +
        "🔍 <i>Tezkor qidiruv:</i> Istalgan talabaning <b>Ism-familiyasi</b>, <b>Shartnoma №</b> yoki <b>Pasport seriyasini</b> yozib yuboring!")
      return Response.json({ ok: true })
    }
    const cert = /^\/?ma['‘’`]?lumotnoma(?:@\w+)?(?:\s+(.*))?$/i.exec(text)
    if (cert) {
      // Muhrli hujjat — faqat hisobot chatida (TELEGRAM_CHAT_ID)
      if (String(chatId) !== DEFAULT_CHAT_ID) await sendMessage(chatId, "⛔ Ma'lumotnoma faqat asosiy chatda beriladi.")
      else await malumotnomaCommand(chatId, cert[1] ?? '')
      return Response.json({ ok: true })
    }
    if (t.includes('kontingent') || t.includes('kontengent')) {
      await sendMessage(chatId, await kontingentText('Bot tugmasi orqali'))
      return Response.json({ ok: true })
    }
    if (t.includes('kamchilik')) {
      await sendMessage(chatId, await kamchiliklarText())
      return Response.json({ ok: true })
    }
    for (const rf of ROLE_FILES) {
      if (rf.match.some((m) => t.includes(m))) {
        const buf = await readRepoFileIn(REPO_PATHS.rollar, rf.file)
        if (buf) {
          const total = (await loadStudentsDb()).length
          await sendDocument(chatId, buf, rf.file, `📊 <b>${rf.title}</b>\n🕒 Sana: ${stamp}\n👥 Jami talabalar: ${total} nafar`)
        } else {
          await sendMessage(chatId, `❌ Fayl yuklashda xatolik: ${rf.file}`)
        }
        return Response.json({ ok: true })
      }
    }
    if (t.includes('json')) {
      const buf = await readRepoFile(REPO_PATHS.baza)
      if (buf) await sendDocument(chatId, buf, 'talabalar_bazasi.json', `📦 <b>talabalar_bazasi.json (To'liq baza)</b>\n🕒 Sana: ${stamp}`)
      else await sendMessage(chatId, '❌ JSON baza fayli topilmadi.')
      return Response.json({ ok: true })
    }
    if (t.includes('guruh jurnallari') || t === '/guruhlar') {
      const buf = await readRepoFileIn(REPO_PATHS.pdfJurnallar, 'Barcha_Guruhlar_Jurnali.pdf')
      if (buf) await sendDocument(chatId, buf, 'Barcha_Guruhlar_Jurnali.pdf', `📑 <b>Barcha ${OFFICIAL.length} ta guruh jurnallari (A4 PDF)</b>\n🕒 Sana: ${stamp}`)
      else await sendMessage(chatId, '❌ PDF jurnal topilmadi.')
      return Response.json({ ok: true })
    }
    if (text.length >= 2) {
      const res = await searchText(text)
      if (res) {
        await sendMessage(chatId, res)
        return Response.json({ ok: true })
      }
    }
    await sendMessage(chatId, '❓ Bunday talaba topilmadi. Pastdagi tugmalardan birini bosing yoki talaba familiyasini / shartnoma raqamini yozing:')
    return Response.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return Response.json({ ok: true })
  }
}
