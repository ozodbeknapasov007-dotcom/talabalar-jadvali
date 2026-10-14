import type { NextRequest } from 'next/server'
import { COURSES, GROUP_LEADERS } from '@/lib/config'
import { malumotnomaBlocker, malumotnomaData, malumotnomaFileName } from '@/lib/malumotnoma'
import { renderMalumotnomaJpg } from '@/lib/server/malumotnoma-rasm'
import { academicGroups, groupTitle, isAcademicLeave, isOfficialGroup, isOutside, kursOf } from '@/lib/student'
import { loadGroupSettings, REPO_PATHS, readRepoFile, readRepoFileIn } from '@/lib/server/source'
import { TG_ALLOWED_IDS, TG_BOT_TOKEN, TG_CHAT_ID, TG_WEBHOOK_SECRET, tgCall, tgEsc as esc, tgSendPhoto } from '@/lib/server/telegram'
import type { Student } from '@/lib/types'

/*
  24/7 Telegram bot webhook va kunlik hisobotlar (eski api/telegram_webhook.js dan ko'chirilgan).

  GET  ?action=kontingent   — 09:00 kontingent hisoboti (GitHub Actions chaqiradi)
  GET  ?action=backup_json  — 18:00 JSON baza + 4-Excel zahirasi
  GET  ?action=setup        — webhookni shu sayt manziliga ulash (maxfiy kalit bilan)
  GET  ?action=status       — bot va webhook holati (oxirgi xato, navbatdagi xabarlar)
  POST                      — Telegram'dan kelgan xabar (bot tugmalari, talaba/guruh qidiruvi,
                              /malumotnoma <shartnoma № yoki F.I.SH>)

  Bot faqat TELEGRAM_CHAT_ID va TELEGRAM_ALLOWED_IDS dagi chatlarga javob beradi; begona
  so'rovlar X-Telegram-Bot-Api-Secret-Token sarlavhasi bo'yicha rad etiladi.
  Ma'lumot: data/talabalar_bazasi.json, hisobotlar/rollar/*.xlsx, hisobotlar/pdf_jurnallar/
  (Netlify'da GitHub'dan, kompyuterda diskdan).
*/

const BOT_TOKEN = TG_BOT_TOKEN
const DEFAULT_CHAT_ID = TG_CHAT_ID

const BOT_KEYBOARD = {
  keyboard: [
    [{ text: '📈 Kontingentni olish' }, { text: "📋 4. To'liq Ma'lumotlar (.xlsx)" }],
    [{ text: '📊 1. Buxgalteriya (.xlsx)' }, { text: '🗂 2. Baza Admin (.xlsx)' }],
    [{ text: '👥 3. Guruh Rahbarlari (.xlsx)' }, { text: '📝 Davomat Jurnali (.xlsx)' }],
    [{ text: '📦 JSON Baza (.json)' }, { text: '📑 Guruh Jurnallari (PDF)' }],
    [{ text: "⚠️ Kamchiliklar ro'yxati" }, { text: "📋 1-kurs So'rovnoma (.xlsx)" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
}

const ROLE_FILES = [
  { match: ['buxgalter', '1. buxgalter', '/buxgalteriya'], file: '1_Buxgalteriya_Shartnoma_va_Pasport.xlsx', title: '1. Buxgalteriya (Shartnoma № va Pasport)' },
  { match: ['baza admin', '2. baza', '/admin'], file: '2_Baza_Admin_Pasport_va_Shahodatnoma.xlsx', title: '2. Baza Administratori (Pasport va Shahodatnoma/Diplom)' },
  { match: ['guruh rahbar', '3. guruh', '/guruh_rahbari'], file: '3_Guruh_Rahbarlari_Talabalar_Malumotlari.xlsx', title: "3. Guruh Rahbarlari (Tug'ilgan sana, Pasport va Shahodatnoma)" },
  { match: ["to'liq", 'toliq', '4. to', '/toliq'], file: '4_Toliq_Malumotlar_Bazasi.xlsx', title: "4. To'liq Ma'lumotlar (O'zim uchun barcha ustunlar)" },
]

/** PDF jurnallar (Python generate_pdfs.py) faqat 1-kurs guruhlari uchun yasaladi */
const pdfGroups = () => COURSES.find((c) => c.kurs === 1)?.groups ?? []

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

/** Telegram bitta xabarga 4096 belgidan ko'p qabul qilmaydi — uzun hisobot qatorlar bo'yicha bo'linadi */
const MAX_MESSAGE = 3900

function splitMessage(text: string): string[] {
  const parts: string[] = []
  let cur = ''
  // Qatorlar ichidagi <b>…</b> teglari o'sha qatorda yopiladi, shuning uchun qator chegarasida bo'lish xavfsiz
  for (const block of text.split('\n')) {
    const line = block.length > MAX_MESSAGE ? block.slice(0, MAX_MESSAGE) : block
    if (cur && cur.length + line.length + 1 > MAX_MESSAGE) {
      parts.push(cur)
      cur = line
    } else {
      cur = cur ? `${cur}\n${line}` : line
    }
  }
  if (cur) parts.push(cur)
  return parts
}

async function sendMessage(chatId: string | number, text: string) {
  let last: { ok?: boolean; description?: string } = { ok: false }
  for (const part of splitMessage(text)) {
    last = await tg('sendMessage', JSON.stringify({ chat_id: chatId, text: part, parse_mode: 'HTML', reply_markup: BOT_KEYBOARD }), true)
    if (!last.ok) console.error('sendMessage xatosi:', last.description)
  }
  return last
}

function sendDocument(chatId: string | number, buf: Buffer, fileName: string, caption: string) {
  const fd = new FormData()
  fd.append('chat_id', String(chatId))
  fd.append('caption', caption)
  fd.append('parse_mode', 'HTML')
  fd.append('document', new Blob([new Uint8Array(buf)]), fileName)
  return tg('sendDocument', fd)
}

/** O‘zbekcha apostroflarning barcha ko‘rinishlarini bittaga keltirish (o‘g‘li = o'g'li = o`g`li) */
const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/[‘’ʻʼ`´]/g, "'").replace(/\s+/g, ' ').trim()

function tashkentStamp() {
  const now = new Date(Date.now() + 5 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  const dd = p(now.getUTCDate()), mm = p(now.getUTCMonth() + 1)
  return { stamp: `${dd}.${mm}.${now.getUTCFullYear()} | ${p(now.getUTCHours())}:${p(now.getUTCMinutes())}`, ddmm: `${dd}.${mm}` }
}

async function kontingentText(reason: string) {
  const students = await loadStudentsDb()
  const groups = academicGroups(students)
  const official = students.filter((s) => isOfficialGroup(s.group))
  const leave = students.filter((s) => isAcademicLeave(s.group))
  const withdrawn = students.filter((s) => isOutside(s.group))
  const ver = official.filter((s) => s.verified === 'TASDIQLANDI').length
  const { stamp, ddmm } = tashkentStamp()
  const lines = [
    '🏛 <b>SHAHRISABZ TIBBIYOT TEXNIKUMI</b>',
    `📈 <b>TALABALAR KONTINGENTI MA'LUMOTI (${reason})</b>`,
    `🕒 Sana: <b>${stamp}</b>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👥 <b>Faol kontingent (${groups.length} ta guruh): ${official.length} nafar</b>`,
    ...COURSES.map((c) => `   • ${c.kurs}-kurs: <b>${official.filter((s) => kursOf(s.group) === c.kurs).length} nafar</b>`),
    `✅ Tasdiqlangan hujjatlar: <b>${ver} / ${official.length} (${official.length ? Math.round((ver / official.length) * 100) : 0}%)</b>`,
    `⏸ Akademik ta'tilda: <b>${leave.length} nafar</b>`,
    `🚫 Safdan chiqarilganlar: <b>${withdrawn.length} nafar</b>`,
    `📦 Umumiy bazada jami: <b>${students.length} nafar</b>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    '📋 <b>GURUHLAR VA RAHBARLAR KESIMIDA:</b>',
    '',
  ]
  groups.forEach((g, i) => {
    const n = students.filter((s) => String(s.group || '').trim() === g).length
    lines.push(`<b>${i + 1}. Guruh ${esc(g)}</b> (${kursOf(g)}-kurs, ${esc(groupTitle(g))})\n   👤 Rahbar: <b>${esc(GROUP_LEADERS[g] || '—')}</b> — <b>${n} nafar</b>`)
  })
  if (leave.length) lines.push(`\n⏸ <b>Akademik ta'tilda:</b> ${leave.length} nafar`)
  if (withdrawn.length) lines.push(`${leave.length ? '' : '\n'}🔸 <b>Safdan chiqarilganlar:</b> ${withdrawn.length} nafar`)
  const bdays = official.filter((s) => String(s.dob || '').startsWith(`${ddmm}.`))
  if (bdays.length) {
    lines.push("\n🎂 <b>Bugun tug'ilgan kuni bo'lgan talabalar:</b>")
    for (const b of bdays) lines.push(`🎉 <b>${esc(b.fish)}</b> (Guruh ${esc(b.group)}, ${esc(b.dob)})`)
  }
  return lines.join('\n')
}

async function kamchiliklarText() {
  const students = (await loadStudentsDb()).filter((s) => isOfficialGroup(s.group))
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
      lines.push(`${i + 1}. <b>${esc(s.fish)}</b> (Guruh ${esc(s.group)}, ${esc(GROUP_LEADERS[s.group] || '—')})\n   ❌ <i>Yo'q: ${miss.join(', ')}</i>`)
    })
  return lines.join('\n')
}

function studentCard(s: Student, i: number) {
  return `<b>${i + 1}. ${esc(s.fish)}</b>\n` +
    `   • Guruh: <b>${esc(s.group || '—')}</b> (Rahbar: ${esc(GROUP_LEADERS[s.group] || '—')})\n` +
    `   • Shartnoma №: <b>${esc(s.shnum || '—')}</b>\n` +
    `   • Tug'ilgan sana: <b>${esc(s.dob || '—')}</b>\n` +
    `   • Pasport: <b>${esc(s.pv || '—')}</b> (Berilgan: ${esc(s.ber || '—')})\n` +
    `   • JSHSHIR: <code>${esc(s.pinfl || '—')}</code>\n` +
    `   • Hujjat (${esc(s.doc_tur || 'Shahodatnoma')}): <b>${esc(s.sh_doc || '—')}</b>\n` +
    `   • Muassasa: ${esc(s.mak || '—')} (${esc(s.yil || '—')}-yil)\n` +
    `   • Tel: ${esc(s.tel || '—')}`
}

/** "26-01" — guruh ro'yxati (F.I.SH va shartnoma raqami) */
async function groupText(group: string) {
  const list = (await loadStudentsDb())
    .filter((s) => String(s.group || '').trim() === group)
    .sort((a, b) => String(a.fish || '').localeCompare(String(b.fish || '')))
  if (!list.length) return null
  return [
    `👥 <b>Guruh ${esc(group)}</b> (${kursOf(group)}-kurs, ${esc(groupTitle(group))})`,
    `👤 Rahbar: <b>${esc(GROUP_LEADERS[group] || '—')}</b> — <b>${list.length} nafar</b>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    ...list.map((s, i) => `${i + 1}. ${esc(s.fish)} — №<b>${esc(s.shnum || '—')}</b>${s.verified === 'TASDIQLANDI' ? ' ✅' : ''}`),
    '',
    "<i>Batafsil ma'lumot uchun talaba familiyasini yoki shartnoma raqamini yozing.</i>",
  ].join('\n')
}

async function searchText(query: string) {
  const q = norm(query)
  const digits = q.replace(/\s/g, '')
  const matches = (await loadStudentsDb()).filter((s) =>
    norm(s.fish).includes(q) ||
    norm(s.shnum) === q ||
    (q.length >= 4 && norm(s.pv).replace(/\s/g, '').includes(digits)) ||
    (/^\d{4,}$/.test(digits) && String(s.pinfl || '').includes(digits)))
  if (!matches.length) return null
  const lines = [`🔍 <b>Qidiruv natijasi (${matches.length} ta topildi):</b>\n`]
  matches.slice(0, 8).forEach((s, i) => lines.push(studentCard(s, i)))
  if (matches.length > 8) lines.push(`\n<i>...va yana ${matches.length - 8} nafar talaba. Aniqroq yozing.</i>`)
  return lines.join('\n\n')
}

/** /malumotnoma 285 — bitta talaba topilsa ma'lumotnoma rasmini (JPG) yuboradi */
async function malumotnomaCommand(chatId: string | number, query: string) {
  const q = norm(query)
  if (!q) {
    await sendMessage(chatId, "📄 Ma'lumotnoma uchun shartnoma raqami yoki F.I.SH yozing:\n<code>/malumotnoma 285</code>")
    return
  }
  const students = await loadStudentsDb()
  const exact = students.filter((s) => norm(s.shnum) === q)
  const found = exact.length ? exact : students.filter((s) => norm(s.fish).includes(q))
  if (!found.length) {
    await sendMessage(chatId, '❓ Bunday talaba topilmadi.')
    return
  }
  if (found.length > 1) {
    await sendMessage(chatId, `🔍 ${found.length} ta talaba topildi — shartnoma raqami bilan yozing:\n\n` +
      found.slice(0, 10).map((s) => `• ${esc(s.fish)} (Guruh ${esc(s.group || '—')}) — <code>/malumotnoma ${esc(s.shnum || '—')}</code>`).join('\n'))
    return
  }
  const s = found[0]
  const blocker = malumotnomaBlocker(s)
  if (blocker) {
    await sendMessage(chatId, `❌ ${esc(s.fish)}: ${esc(blocker)}`)
    return
  }
  const data = malumotnomaData(s)
  await tgSendPhoto(chatId, await renderMalumotnomaJpg(data), malumotnomaFileName(s),
    `📄 <b>O‘qiyotganligi haqida ma’lumotnoma</b>\n👤 <b>${esc(s.fish)}</b>\n👥 Guruh ${esc(s.group)} · Shartnoma №${esc(s.shnum || '—')}\n🗓 Sana: ${esc(data.sana)}`,
    BOT_KEYBOARD)
}

const notConfigured = () =>
  Response.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID sozlanmagan (Netlify → Site configuration → Environment variables, keyin qayta deploy)' }, { status: 500 })

/** Telegram xatosini tushunarli qilish (eng ko'p uchraydiganlari) */
function explainTgError(r: { ok?: boolean; error_code?: number; description?: string }) {
  if (r.ok) return undefined
  if (r.error_code === 401) return "Token noto'g'ri yoki bekor qilingan — @BotFather'dan olingan yangi tokenni TELEGRAM_BOT_TOKEN ga qo'yib, qayta deploy qiling"
  if (r.error_code === 404) return "Token formati noto'g'ri (123456789:AA... ko'rinishida bo'lishi kerak)"
  return r.description || "Telegram'ga ulanib bo'lmadi"
}

async function botStatus(expectedUrl: string) {
  const me = await tgCall('getMe')
  const info = me.ok ? await tgCall('getWebhookInfo') : null
  const w = info?.result ?? {}
  return {
    ok: !!me.ok && w.url === expectedUrl,
    bot: me.ok ? `@${me.result.username}` : null,
    error: explainTgError(me),
    webhook: me.ok ? {
      url: w.url || null,
      connected: w.url === expectedUrl,
      pending_updates: w.pending_update_count ?? 0,
      last_error: w.last_error_message || null,
      last_error_at: w.last_error_date ? new Date(w.last_error_date * 1000).toISOString() : null,
    } : null,
    allowed_chats: TG_ALLOWED_IDS.size,
  }
}

export async function GET(request: NextRequest) {
  const action = (request.nextUrl.searchParams.get('action') || '').toLowerCase()
  if (!action) return Response.json({ ok: true, configured: !!(BOT_TOKEN && DEFAULT_CHAT_ID), hint: 'Holat: ?action=status, ulash: ?action=setup' })
  if (!BOT_TOKEN || !DEFAULT_CHAT_ID) return notConfigured()
  const webhookUrl = `${request.nextUrl.origin}/api/telegram_webhook`

  if (action === 'status') return Response.json(await botStatus(webhookUrl))

  if (action === 'migrate_bot' || action === 'setup') {
    const set = await tgCall('setWebhook', {
      url: webhookUrl,
      secret_token: TG_WEBHOOK_SECRET,
      allowed_updates: ['message'],
      drop_pending_updates: true,
      max_connections: 10,
    })
    if (set.ok) {
      await tgCall('setMyCommands', {
        commands: [
          { command: 'start', description: 'Menyu va tugmalar' },
          { command: 'kontingent', description: 'Guruhlar kesimida kontingent' },
          { command: 'malumotnoma', description: "O'qiyotganligi haqida ma'lumotnoma: /malumotnoma 285" },
          { command: 'davomat', description: 'Davomat jurnallari: /davomat 26-03 yoki /davomat barcha' },
          { command: 'id', description: 'Chat ID raqamim' },
        ],
      })
    }
    // Bot tokeni hech qachon javobda qaytarilmaydi
    const status = await botStatus(webhookUrl)
    return Response.json({ ...status, ok: !!set.ok && status.ok, set_webhook: set.ok ? 'ulandi' : explainTgError(set) }, { status: set.ok ? 200 : 502 })
  }

  await loadGroupSettings()
  if (action === 'kontingent') {
    const result = await sendMessage(DEFAULT_CHAT_ID, await kontingentText('Kunlik 09:00 avto-hisobot'))
    return Response.json({ ok: !!result.ok, action, error: explainTgError(result) }, { status: result.ok ? 200 : 502 })
  }
  if (action === 'backup_json') {
    const { stamp } = tashkentStamp()
    const json = await readRepoFile(REPO_PATHS.baza)
    const excel = await readRepoFileIn(REPO_PATHS.rollar, '4_Toliq_Malumotlar_Bazasi.xlsx')
    const rj = json ? await sendDocument(DEFAULT_CHAT_ID, json, 'talabalar_bazasi.json', `📦 <b>Talabalar bazasi (.json) — Kunlik 18:00 avto-zahira</b>\n🕒 Sana: ${stamp}`) : null
    const rx = excel ? await sendDocument(DEFAULT_CHAT_ID, excel, '4_Toliq_Malumotlar_Bazasi.xlsx', `📊 <b>4. To'liq Ma'lumotlar Bazasi (.xlsx)</b>\n🕒 Sana: ${stamp}`) : null
    const ok = !!rj?.ok && !!rx?.ok
    return Response.json({ ok, action, sent: { json: !!rj?.ok, excel: !!rx?.ok }, error: rj && !rj.ok ? explainTgError(rj) : undefined }, { status: ok ? 200 : 502 })
  }
  return Response.json({ ok: false, error: `Noma'lum action: ${action}` }, { status: 400 })
}

export async function POST(request: NextRequest) {
  if (!BOT_TOKEN) return notConfigured()
  // Faqat Telegram'ning o'zi (setup paytida berilgan maxfiy kalit bilan) xabar yubora oladi
  if (request.headers.get('x-telegram-bot-api-secret-token') !== TG_WEBHOOK_SECRET) {
    return Response.json({ ok: false }, { status: 403 })
  }
  // Telegram har doim 200 kutadi — aks holda xabarni qayta-qayta yuboradi
  let chatId: string | number | null = null
  try {
    const body = await request.json().catch(() => ({}))
    const msg = body.message
    if (!msg?.chat?.id) return Response.json({ ok: true })
    chatId = msg.chat.id as string | number
    const text = String(msg.text || '').trim()
    // "/start@bot_nomi" (guruh chatlarida) → "/start"
    const t = norm(text).replace(/^(\/\w+)@\w+/, '$1')

    if (t === '/id') {
      await sendMessage(chatId, `🆔 Chat ID: <code>${esc(chatId)}</code>`)
      return Response.json({ ok: true })
    }
    // Bot shaxsiy ma'lumot (pasport, JSHSHIR, telefon) beradi — faqat ruxsat berilgan chatlarga
    if (!TG_ALLOWED_IDS.has(String(chatId))) {
      await sendMessage(chatId,
        `⛔ Bu bot faqat texnikum xodimlari uchun.\n\nKirish kerak bo'lsa, administratorga ID raqamingizni yuboring: <code>${esc(chatId)}</code>`)
      return Response.json({ ok: true })
    }
    await loadGroupSettings().catch(() => null)
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
        "• <b>📝 Davomat Jurnali (.xlsx)</b> — Barcha guruhlar andozasi + 26-02 Word jurnali (yoki /davomat)\n" +
        "• <b>📋 1-kurs So'rovnoma (.xlsx)</b> — Manzillar, ota-ona va telefonlar (yoki /sorovnoma)\n" +
        '• <b>📦 JSON Baza (.json)</b> — To\'liq JSON baza fayli\n' +
        "• <b>⚠️ Kamchiliklar ro'yxati</b> — Hujjati to'liq bo'lmagan talabalar\n" +
        `• <b>📑 Guruh Jurnallari (PDF)</b> — Barcha ${pdfGroups().length} ta guruh A4 PDF jurnallari\n\n` +
        "📄 <b>/malumotnoma 285</b> — talabaning o'qiyotganligi haqida ma'lumotnomasi (rasm)\n\n" +
        "🔍 <i>Tezkor qidiruv:</i> Istalgan talabaning <b>Ism-familiyasi</b>, <b>Shartnoma №</b>, <b>Pasport seriyasi</b> yoki <b>JSHSHIR</b>ini yozib yuboring!\n" +
        "👥 <i>Guruh ro'yxati:</i> guruh raqamini yozing, masalan <b>26-01</b>")
      return Response.json({ ok: true })
    }
    const cert = /^\/?ma['‘’`]?lumotnoma(?:@\w+)?(?:\s+(.*))?$/i.exec(text)
    if (cert) {
      // Muhrli hujjat — faqat hisobot chatida (TELEGRAM_CHAT_ID)
      if (String(chatId) !== DEFAULT_CHAT_ID) await sendMessage(chatId, "⛔ Ma'lumotnoma faqat asosiy chatda beriladi.")
      else await malumotnomaCommand(chatId, cert[1] ?? '')
      return Response.json({ ok: true })
    }
    const groupOnly = /^(2[4-9]-\d{2})$/.exec(t)
    if (groupOnly) {
      const res = await groupText(groupOnly[1])
      await sendMessage(chatId, res ?? `❓ ${esc(groupOnly[1])} guruhida talaba topilmadi.`)
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
      if (buf) await sendDocument(chatId, buf, 'Barcha_Guruhlar_Jurnali.pdf', `📑 <b>Barcha ${pdfGroups().length} ta guruh jurnallari (A4 PDF)</b>\n🕒 Sana: ${stamp}`)
      else await sendMessage(chatId, '❌ PDF jurnal topilmadi.')
      return Response.json({ ok: true })
    }
    if (t.includes('davomat') || t.startsWith('/davomat')) {
      const dirs = ['hisobotlar/davomat_jurnallari', 'hisobotlar', '']
      // 1. Agar foydalanuvchi ma'lum bir guruhni so'ragan bo'lsa (masalan /davomat 26-01 yoki /davomat 25-16)
      const grpMatch = /(2[4-6]-\d{2})/i.exec(text)
      if (grpMatch) {
        const grp = grpMatch[1].toUpperCase()
        const gDoc = await readRepoFileIn(dirs, `Davomat_jurnali_${grp}.docx`)
        if (gDoc) {
          await sendDocument(chatId, gDoc, `Davomat_jurnali_${grp}.docx`, `📄 <b>Guruh ${grp} Davomat jurnali (Word .docx)</b>\n🕒 Sana: ${stamp}\n✅ Barcha talabalar, telefonlar va manzillar to'ldirilgan`)
          return Response.json({ ok: true })
        }
      }

      // 2. Agar barcha guruhlar so'ralsa (/davomat all yoki /davomat barcha yoki zip)
      if (t.includes('all') || t.includes('barcha') || t.includes('hamma')) {
        const allZip = await readRepoFileIn(dirs, 'Barcha_Guruhlar_Davomat_Jurnallari_Word.zip')
        if (allZip) {
          await sendDocument(chatId, allZip, 'Barcha_Guruhlar_Davomat_Jurnallari_Word.zip', `📦 <b>Barcha 19 ta Guruh Davomat Jurnallari (Word .docx ZIP)</b>\n🕒 Sana: ${stamp}\n👥 1-kurs, 2-kurs va 3-kurs to'ldirilgan jurnallari`)
          return Response.json({ ok: true })
        }
      }

      // 3. Standart holatda: Excel andoza + 1-kurs jurnallari ZIP arxivi + 26-02 Word namunasi
      const excel = await readRepoFileIn(dirs, 'Davomat_Jurnali_Uchun_Malumotlar.xlsx')
      const c1Zip = await readRepoFileIn(dirs, '1-kurs_Guruhlar_Davomat_Jurnallari_Word.zip')
      const docx = await readRepoFileIn(dirs, "Davomat jurnali 26-02 (TO'LDIRILGAN).docx")

      if (excel) {
        await sendDocument(chatId, excel, 'Davomat_Jurnali_Uchun_Malumotlar.xlsx', `📝 <b>Davomat Jurnali Uchun Talabalar Ma'lumotlari (.xlsx)</b>\n🕒 Sana: ${stamp}\n👥 Barcha 1-kurs va 26-02 guruhlari uchun andoza`)
      }
      if (c1Zip) {
        await sendDocument(chatId, c1Zip, '1-kurs_Guruhlar_Davomat_Jurnallari_Word.zip', `📦 <b>1-kurs Guruhlari Davomat Jurnallari (Word .docx ZIP)</b>\n🕒 Sana: ${stamp}\n✅ Barcha 6 ta guruh (26-01 dan 26-06 gacha) to'liq to'ldirilgan jurnallari\n\n💡 <i>Barcha 19 ta guruhni olish uchun:</i> <code>/davomat barcha</code>\n💡 <i>Alohida guruh uchun:</i> <code>/davomat 26-03</code>`)
      } else if (docx) {
        await sendDocument(chatId, docx, "Davomat jurnali 26-02 (TO'LDIRILGAN).docx", `📄 <b>Davomat jurnali 26-02 (Avtomatik to'ldirilgan Word hujjati)</b>\n🕒 Sana: ${stamp}\n✅ Barcha jadvallari to'liq to'ldirilgan`)
      }
      if (!excel && !c1Zip && !docx) {
        await sendMessage(chatId, '❌ Davomat jurnali fayllari topilmadi.')
      }
      return Response.json({ ok: true })
    }
    if (t.includes('sorovnoma') || t.includes("so'rovnoma")) {
      const buf = await readRepoFileIn(['hisobotlar', ''], '1-kurs_Sorovnoma_Malumotlari.xlsx')
      if (buf) {
        await sendDocument(chatId, buf, '1-kurs_Sorovnoma_Malumotlari.xlsx', `📊 <b>1-kurs Talabalari So'rovnoma Ma'lumotlari (.xlsx)</b>\n🕒 Sana: ${stamp}\n✅ Manzillar, ota-ona ma'lumotlari va toza telefon raqamlar`)
      } else {
        await sendMessage(chatId, "❌ So'rovnoma fayli topilmadi.")
      }
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
    // Foydalanuvchi javobsiz qolmasin
    if (chatId !== null) await sendMessage(chatId, "⚠️ Ichki xatolik yuz berdi, birozdan keyin qayta urinib ko'ring.").catch(() => null)
    return Response.json({ ok: true })
  }
}
