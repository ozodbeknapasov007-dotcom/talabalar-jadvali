// Vercel Serverless Function: 24/7 Telegram Bot Webhook & Scheduled Reports
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8645386410:AAGpMWubDaLI6KQ_hR9WuqkhCaoOAK2qWEM';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8135594558';
const STATIC_BASE_URL = 'https://talabalar-royhati.vercel.app';

const GROUP_LEADERS = {
  "26-01": "Mirzayeva.D",
  "26-02": "Ochilov.D",
  "26-03": "A.Asraliyev",
  "26-04": "Xamdamova.M",
  "26-05": "Rayimova.X",
  "26-06": "Yuldashev.O",
  "26-07": "Asraliyev.A"
};

const GROUP_SPECIALTIES = {
  "26-01": "Farmatsiya ishi",
  "26-02": "Hamshiralik ishi",
  "26-03": "Hamshiralik ishi",
  "26-04": "Hamshiralik ishi",
  "26-05": "Hamshiralik ishi",
  "26-06": "Hamshiralik ishi",
  "26-07": "Hamshiralik ishi"
};

const BOT_KEYBOARD = {
  keyboard: [
    [{ text: "📈 Kontingentni olish" }, { text: "📋 4. To'liq Ma'lumotlar (.xlsx)" }],
    [{ text: "📊 1. Buxgalteriya (.xlsx)" }, { text: "🗂 2. Baza Admin (.xlsx)" }],
    [{ text: "👥 3. Guruh Rahbarlari (.xlsx)" }, { text: "📦 JSON Baza (.json)" }],
    [{ text: "⚠️ Kamchiliklar ro'yxati" }, { text: "📑 Guruh Jurnallari (PDF)" }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

async function loadDatabase() {
  // 1. Fetch from public Vercel static deployment (always 200 OK)
  try {
    const resp = await fetch(`${STATIC_BASE_URL}/talabalar_bazasi.json?t=${Date.now()}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data && Array.isArray(data.students)) return data;
    }
  } catch (e) {}

  // 2. Fallback to local filesystem if available
  try {
    const localPath = path.join(process.cwd(), 'talabalar_bazasi.json');
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    }
  } catch (e) {}

  return { students: [], total_students: 0 };
}

async function loadFileBuffer(relativePath) {
  // Clean path and encode segments safely
  const encodedPath = relativePath
    .split('/')
    .map(seg => encodeURIComponent(seg))
    .join('/');

  try {
    const resp = await fetch(`${STATIC_BASE_URL}/${encodedPath}?t=${Date.now()}`);
    if (resp.ok) {
      const ab = await resp.arrayBuffer();
      return Buffer.from(ab);
    }
  } catch (e) {}

  try {
    const localPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
  } catch (e) {}

  return null;
}

async function sendTelegramMessage(chatId, text, replyMarkup = BOT_KEYBOARD) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    })
  });
  return resp.json();
}

async function sendTelegramDocument(chatId, fileBuffer, fileName, caption) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
  const formData = new FormData();
  formData.append('chat_id', String(chatId));
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');
  const blob = new Blob([fileBuffer]);
  formData.append('document', blob, fileName);

  const resp = await fetch(url, {
    method: 'POST',
    body: formData
  });
  return resp.json();
}

function getTashkentStamp() {
  const now = new Date(Date.now() + 5 * 3600 * 1000);
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = now.getUTCFullYear();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  return { stamp: `${dd}.${mm}.${yyyy} | ${hh}:${min}`, ddmm: `${dd}.${mm}` };
}

async function buildKontingentText(reason = "Bot tugmasi orqali") {
  const db = await loadDatabase();
  const students = db.students || [];
  const officialGroups = ["26-01", "26-02", "26-03", "26-04", "26-05", "26-06", "26-07"];
  const officialStudents = students.filter(s => officialGroups.includes(s.group));
  const withdrawnStudents = students.filter(s => !officialGroups.includes(s.group));
  const verCount = officialStudents.filter(s => s.verified === 'TASDIQLANDI').length;
  const { stamp, ddmm } = getTashkentStamp();

  const lines = [
    "🏛 <b>SHAHRISABZ TIBBIYOT TEXNIKUMI</b>",
    `📈 <b>TALABALAR KONTINGENTI MA'LUMOTI (${reason})</b>`,
    `🕒 Sana: <b>${stamp}</b>`,
    "━━━━━━━━━━━━━━━━━━━━━━",
    `👥 <b>Faol kontingent (7 ta guruh): ${officialStudents.length} nafar</b>`,
    `✅ Tasdiqlangan hujjatlar: <b>${verCount} / ${officialStudents.length} (${officialStudents.length ? Math.round(verCount / officialStudents.length * 100) : 0}%)</b>`,
    `🚫 Safdan chiqarilganlar: <b>${withdrawnStudents.length} nafar</b>`,
    `📦 Umumiy bazada jami: <b>${students.length} nafar</b>`,
    "━━━━━━━━━━━━━━━━━━━━━━",
    "📋 <b>GURUHLAR VA RAHBARLAR KESIMIDA:</b>",
    ""
  ];

  officialGroups.forEach((g, idx) => {
    const gSt = students.filter(s => s.group === g);
    const leader = GROUP_LEADERS[g] || '—';
    const spec = GROUP_SPECIALTIES[g] || 'Hamshiralik ishi';
    lines.push(`<b>${idx + 1}. Guruh ${g}</b> (${spec})\n   👤 Rahbar: <b>${leader}</b> — <b>${gSt.length} nafar</b>`);
  });

  if (withdrawnStudents.length > 0) {
    lines.push(`\n🔸 <b>Safdan chiqarilganlar:</b> ${withdrawnStudents.length} nafar`);
  }

  const bdays = officialStudents.filter(s => String(s.dob || '').startsWith(ddmm + '.'));
  if (bdays.length > 0) {
    lines.push("\n🎂 <b>Bugun tug'ilgan kuni bo'lgan talabalar:</b>");
    bdays.forEach(b => {
      lines.push(`🎉 <b>${b.fish}</b> (Guruh ${b.group}, ${b.dob})`);
    });
  }

  return lines.join('\n');
}

async function buildKamchiliklarText() {
  const db = await loadDatabase();
  const officialGroups = ["26-01", "26-02", "26-03", "26-04", "26-05", "26-06", "26-07"];
  const students = (db.students || []).filter(s => officialGroups.includes(s.group));

  const noPass = students.filter(s => !s.pv);
  const noPinfl = students.filter(s => !s.pinfl);
  const noDoc = students.filter(s => !s.sh_doc);
  const noShnum = students.filter(s => !s.shnum);

  const lines = [
    "⚠️ <b>HUJJATIDA KAMCHILIGI BOR TALABALAR HISOBOTI</b>",
    "━━━━━━━━━━━━━━━━━━━━━━",
    `• Pasport seriyasi yo'q: <b>${noPass.length} nafar</b>`,
    `• JSHSHIR (PINFL) yo'q: <b>${noPinfl.length} nafar</b>`,
    `• Shahodatnoma/Diplom raqami yo'q: <b>${noDoc.length} nafar</b>`,
    `• Shartnoma № yo'q: <b>${noShnum.length} nafar</b>`,
    "━━━━━━━━━━━━━━━━━━━━━━"
  ];

  const missingAll = students.filter(s => !s.pv || !s.pinfl || !s.sh_doc || !s.shnum);
  missingAll.forEach((s, idx) => {
    const miss = [];
    if (!s.pv) miss.push("Pasport");
    if (!s.pinfl) miss.push("JSHSHIR");
    if (!s.sh_doc) miss.push("Shahodatnoma/Diplom");
    if (!s.shnum) miss.push("Shartnoma №");
    lines.push(`${idx + 1}. <b>${s.fish}</b> (Guruh ${s.group}, ${GROUP_LEADERS[s.group] || '—'})\n   ❌ <i>Yo'q: ${miss.join(', ')}</i>`);
  });

  return lines.join('\n');
}

async function searchStudentText(query) {
  const db = await loadDatabase();
  const q = String(query || '').trim().toLowerCase();
  const matches = (db.students || []).filter(s => {
    return (
      String(s.fish || '').toLowerCase().includes(q) ||
      String(s.shnum || '').toLowerCase() === q ||
      String(s.pv || '').toLowerCase().includes(q) ||
      String(s.pinfl || '').includes(q)
    );
  });

  if (matches.length === 0) return null;

  const top = matches.slice(0, 8);
  const lines = [`🔍 <b>Qidiruv natijasi (${matches.length} ta topildi):</b>\n`];
  top.forEach((s, i) => {
    const leader = GROUP_LEADERS[s.group] || '—';
    lines.push(
      `<b>${i + 1}. ${s.fish}</b>\n` +
      `   • Guruh: <b>${s.group || '—'}</b> (Rahbar: ${leader})\n` +
      `   • Shartnoma №: <b>${s.shnum || '—'}</b>\n` +
      `   • Tug'ilgan sana: <b>${s.dob || '—'}</b>\n` +
      `   • Pasport: <b>${s.pv || '—'}</b> (Berilgan: ${s.ber || '—'})\n` +
      `   • JSHSHIR: <code>${s.pinfl || '—'}</code>\n` +
      `   • Hujjat (${s.doc_tur || 'Shahodatnoma'}): <b>${s.sh_doc || '—'}</b>\n` +
      `   • Muassasa: ${s.mak || '—'} (${s.yil || '—'}-yil)\n` +
      `   • Tel: ${s.tel || '—'}`
    );
  });
  if (matches.length > 8) {
    lines.push(`\n<i>...va yana ${matches.length - 8} nafar talaba.</i>`);
  }
  return lines.join('\n\n');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = req.query || {};

  // 1. GET actions (Scheduled Cron / Setup)
  if (req.method === 'GET') {
    const action = String(query.action || '').toLowerCase();
    if (action === 'kontingent') {
      const text = await buildKontingentText("Kunlik 09:00 avto-hisobot");
      const r = await sendTelegramMessage(DEFAULT_CHAT_ID, text);
      return res.status(200).json({ ok: true, action: 'kontingent', result: r });
    }
    if (action === 'backup_json') {
      const { stamp } = getTashkentStamp();
      const jsonBuf = await loadFileBuffer('talabalar_bazasi.json');
      const excelBuf = await loadFileBuffer('4_Toliq_Malumotlar_Bazasi.xlsx');
      if (jsonBuf) {
        await sendTelegramDocument(
          DEFAULT_CHAT_ID,
          jsonBuf,
          'talabalar_bazasi.json',
          `📦 <b>Talabalar bazasi (.json) — Kunlik 18:00 avto-zahira</b>\n🕒 Sana: ${stamp}`
        );
      }
      if (excelBuf) {
        await sendTelegramDocument(
          DEFAULT_CHAT_ID,
          excelBuf,
          '4_Toliq_Malumotlar_Bazasi.xlsx',
          `📊 <b>4. To'liq Ma'lumotlar Bazasi (.xlsx)</b>\n🕒 Sana: ${stamp}`
        );
      }
      return res.status(200).json({ ok: true, action: 'backup_json' });
    }
    return res.status(200).json({ ok: true, status: "Telegram 24/7 Webhook Active" });
  }

  // 2. POST (Incoming Telegram Webhook update)
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const msg = body.message || body.edited_message;
    if (!msg || !msg.chat || !msg.chat.id) {
      return res.status(200).json({ ok: true });
    }

    const chatId = msg.chat.id;
    const text = String(msg.text || '').trim();
    const tLow = text.toLowerCase();
    const { stamp } = getTashkentStamp();

    if (tLow === '/start' || tLow === '/menu' || tLow === '/help' || tLow === 'menyu' || tLow === 'start') {
      const welcome =
        "🤖 <b>Talabalar Bazasi va Shartnomalar Boti (24/7 Cloud Webhook)</b>\n\n" +
        "Quyidagi tugmalar orqali istalgan vaqtda kerakli Excel hisobotlarni, <b>Kontingent</b> ma'lumotini, <b>Guruh jurnallarini (PDF)</b> yoki <b>.json</b> bazani olishingiz mumkin:\n\n" +
        "• <b>📈 Kontingentni olish</b> — Guruhlar va rahbarlar kesimida kontingent\n" +
        "• <b>📊 1. Buxgalteriya (.xlsx)</b> — Shartnoma № va Pasport\n" +
        "• <b>🗂 2. Baza Admin (.xlsx)</b> — Pasport va Shahodatnoma/Diplom\n" +
        "• <b>👥 3. Guruh Rahbarlari (.xlsx)</b> — Tug'ilgan sana, Pasport, Shahodatnoma\n" +
        "• <b>📋 4. To'liq Ma'lumotlar (.xlsx)</b> — O'zingiz uchun to'liq baza\n" +
        "• <b>📦 JSON Baza (.json)</b> — To'liq JSON baza fayli\n" +
        "• <b>⚠️ Kamchiliklar ro'yxati</b> — Hujjati to'liq bo'lmagan talabalar\n" +
        "• <b>📑 Guruh Jurnallari (PDF)</b> — Barcha 7 ta guruh A4 PDF jurnallari\n\n" +
        "🔍 <i>Tezkor qidiruv:</i> Istalgan talabaning <b>Ism-familiyasi</b>, <b>Shartnoma №</b> yoki <b>Pasport seriyasini</b> yozib yuboring!";
      await sendTelegramMessage(chatId, welcome);
      return res.status(200).json({ ok: true });
    }

    if (tLow.includes('kontingent') || tLow.includes('kontengent') || tLow === '/kontingent') {
      const kText = await buildKontingentText("Bot tugmasi orqali");
      await sendTelegramMessage(chatId, kText);
      return res.status(200).json({ ok: true });
    }

    if (tLow.includes('kamchilik') || tLow === '/kamchilik') {
      const kamText = await buildKamchiliklarText();
      await sendTelegramMessage(chatId, kamText);
      return res.status(200).json({ ok: true });
    }

    const roleFiles = [
      { match: ['buxgalter', '1. buxgalter', '/buxgalteriya'], file: '1_Buxgalteriya_Shartnoma_va_Pasport.xlsx', title: '1. Buxgalteriya (Shartnoma № va Pasport)' },
      { match: ['baza admin', '2. baza', '/admin'], file: '2_Baza_Admin_Pasport_va_Shahodatnoma.xlsx', title: '2. Baza Administratori (Pasport va Shahodatnoma/Diplom)' },
      { match: ['guruh rahbar', '3. guruh', '/guruh_rahbari'], file: '3_Guruh_Rahbarlari_Talabalar_Malumotlari.xlsx', title: "3. Guruh Rahbarlari (Tug'ilgan sana, Pasport va Shahodatnoma)" },
      { match: ["to'liq", 'toliq', '4.', '/toliq'], file: '4_Toliq_Malumotlar_Bazasi.xlsx', title: "4. To'liq Ma'lumotlar (O'zim uchun barcha ustunlar)" }
    ];

    for (const rf of roleFiles) {
      if (rf.match.some(m => tLow.includes(m))) {
        const buf = await loadFileBuffer(rf.file);
        if (buf) {
          await sendTelegramDocument(
            chatId,
            buf,
            rf.file,
            `📊 <b>${rf.title}</b>\n🕒 Sana: ${stamp}\n👥 Jami talabalar: 177 nafar`
          );
        } else {
          await sendTelegramMessage(chatId, `❌ Fayl yuklashda xatolik: ${rf.file}`);
        }
        return res.status(200).json({ ok: true });
      }
    }

    if (tLow.includes('json') || tLow === '/json') {
      const buf = await loadFileBuffer('talabalar_bazasi.json');
      if (buf) {
        await sendTelegramDocument(chatId, buf, 'talabalar_bazasi.json', `📦 <b>talabalar_bazasi.json (To'liq baza)</b>\n🕒 Sana: ${stamp}`);
      } else {
        await sendTelegramMessage(chatId, "❌ JSON baza fayli topilmadi.");
      }
      return res.status(200).json({ ok: true });
    }

    if (tLow.includes('guruh jurnallari') || tLow === '/guruhlar') {
      const pdfBuf = await loadFileBuffer('pdf_jurnallar/Barcha_Guruhlar_Jurnali.pdf');
      if (pdfBuf) {
        await sendTelegramDocument(
          chatId,
          pdfBuf,
          'Barcha_Guruhlar_Jurnali.pdf',
          `📑 <b>Barcha 7 ta guruh jurnallari (A4 PDF)</b>\n🕒 Sana: ${stamp}\n👤 26-03: A.Asraliyev | 26-04: Xamdamova.M`
        );
      } else {
        await sendTelegramMessage(chatId, "❌ PDF jurnal topilmadi.");
      }
      return res.status(200).json({ ok: true });
    }

    // Student search by Name / Contract # / Passport / PINFL
    if (text.length >= 2) {
      const searchRes = await searchStudentText(text);
      if (searchRes) {
        await sendTelegramMessage(chatId, searchRes);
        return res.status(200).json({ ok: true });
      }
    }

    await sendTelegramMessage(
      chatId,
      "❓ Bunday talaba topilmadi. Pastdagi tugmalardan birini bosing yoki talaba familiyasini / shartnoma raqamini yozing:"
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ ok: true });
  }
};
