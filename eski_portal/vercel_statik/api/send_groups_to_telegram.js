// Vercel Serverless Function: Guruhlar ro'yxatini Telegramga yuborish
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8645386410:AAGpMWubDaLI6KQ_hR9WuqkhCaoOAK2qWEM';
  const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '-1004375713276';
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8135594558';

  let body = {};
  if (req.method === 'POST') {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } else {
    body = req.query || {};
  }

  const target = String(body.target || 'channel').trim().toLowerCase();
  const groupFilter = String(body.group || 'ALL').trim();

  let destChats = [];
  if (target === 'channel') {
    destChats = [CHANNEL_ID];
  } else if (target === 'chat' || target === 'personal' || target === 'private') {
    destChats = [CHAT_ID];
  } else if (target === 'both' || target === 'ikkalasi') {
    destChats = [CHANNEL_ID, CHAT_ID];
  } else if (body.target && body.target !== 'channel') {
    destChats = [String(body.target).trim()];
  } else {
    destChats = [CHANNEL_ID];
  }

  const GROUP_META = {
    "26-01": { specialty: "Farmatsiya ishi", leader: "Mirzayeva.D" },
    "26-02": { specialty: "Hamshiralik ishi", leader: "Ochilov.D" },
    "26-03": { specialty: "Hamshiralik ishi", leader: "A.Asraliyev" },
    "26-04": { specialty: "Hamshiralik ishi", leader: "Xamdamova.M" },
    "26-05": { specialty: "Hamshiralik ishi", leader: "Rayimova.X" },
    "26-06": { specialty: "Hamshiralik ishi", leader: "Yuldashev.O" },
    "26-07": { specialty: "Hamshiralik ishi", leader: "Asraliyev.A" },
    "Talabalar safidan chiqarilganlar": { specialty: "Maxsus ro'yxat", leader: "Texnikum ma'muriyati" }
  };

  const OFFICIAL_ORDER = [
    "26-01", "26-02", "26-03", "26-04", "26-05", "26-06", "26-07",
    "Talabalar safidan chiqarilganlar"
  ];

  // Agar mijoz brauzerdagi talabalar ro'yxatini to'g'ridan-to'g'ri jo'natgan bo'lsa
  let groupsData = body.groupsData;

  // Agar groupsData berilmagan bo'lsa, xom talabalarni ajratamiz yoki xato beramiz
  if (!groupsData || Object.keys(groupsData).length === 0) {
    if (body.students && Array.isArray(body.students)) {
      groupsData = {};
      for (const s of body.students) {
        let grp = String(s.group || s.guruh || '').trim();
        const grpLower = grp.toLowerCase();
        if (grpLower.includes('chiqaril') || grp === 'N' || grp === 'n') {
          grp = "Talabalar safidan chiqarilganlar";
        } else if (!grp) {
          grp = "Guruhsiz";
        }
        if (!groupsData[grp]) groupsData[grp] = [];
        const name = (s.fish_full || s.pass_fish || s.fish || s.ism || 'Talaba').trim();
        groupsData[grp].push({ name, shnum: s.shnum || '' });
      }
    }
  }

  if (!groupsData || Object.keys(groupsData).length === 0) {
    return res.status(400).json({
      ok: false,
      error: "Guruhlar ma'lumotlari topilmadi. Brauzerdan groupsData yuborilishi kerak."
    });
  }

  // Saralash
  for (const g in groupsData) {
    groupsData[g].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uz', { sensitivity: 'base' }));
  }

  let groupsToSend = [];
  if (groupFilter && groupFilter.toUpperCase() !== 'ALL' && groupFilter !== 'BARCHASI') {
    if (groupsData[groupFilter]) {
      groupsToSend = [groupFilter];
    } else {
      const match = Object.keys(groupsData).find(g => g.toLowerCase().includes(groupFilter.toLowerCase()));
      if (match) groupsToSend = [match];
    }
  } else {
    for (const og of OFFICIAL_ORDER) {
      if (groupsData[og]) groupsToSend.push(og);
    }
    for (const g of Object.keys(groupsData)) {
      if (!groupsToSend.includes(g)) groupsToSend.push(g);
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const results = [];
  let allSuccess = true;

  const fs = require('fs');
  const path = require('path');

  for (const grp of groupsToSend) {
    const stList = groupsData[grp] || [];
    if (stList.length === 0) continue;

    const meta = GROUP_META[grp] || {};
    const isWithdrawn = grp.toLowerCase().includes('chiqaril');

    const fnameBase = isWithdrawn ? 'Guruh_Talabalar_safidan_chiqarilganlar' : `Guruh_${grp}`;
    const jpgPath = path.join(process.cwd(), 'pdf_jurnallar', `${fnameBase}.jpg`);
    let fileBuffer = null;
    if (fs.existsSync(jpgPath)) {
      try {
        fileBuffer = fs.readFileSync(jpgPath);
      } catch (e) {
        console.warn("Rasm o'qishda xato:", e);
      }
    }

    const lines = [];
    lines.push("<b>Shahrisabz Tibbiyot Texnikumi</b>");
    if (isWithdrawn) {
      lines.push("<b>Talabalar safidan chiqarilganlar ro'yxati</b>");
      lines.push(`Talabalar soni: <b>${stList.length} nafar</b>`);
    } else {
      lines.push(`<b>Akademik guruh: ${grp} (${meta.specialty || 'Hamshiralik ishi'})</b>`);
      lines.push(`Mas'ul murabbiy: <b>${meta.leader || '—'}</b>`);
      lines.push(`Talabalar soni: <b>${stList.length} nafar</b>`);
    }
    const captionText = lines.join("\n");

    for (const cid of destChats) {
      try {
        let tgRes;
        if (fileBuffer) {
          const formData = new FormData();
          formData.append('chat_id', cid);
          formData.append('caption', captionText);
          formData.append('parse_mode', 'HTML');
          formData.append('photo', new Blob([fileBuffer], { type: 'image/jpeg' }), `${fnameBase}.jpg`);

          tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
          });
        } else {
          // Fallback matn
          const textLines = [captionText, ""];
          stList.forEach((s, idx) => {
            textLines.push(`${idx + 1}. ${escapeHtml(s.name)}`);
          });
          tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cid,
              text: textLines.join("\n"),
              parse_mode: 'HTML'
            })
          });
        }

        const data = await tgRes.json();
        if (tgRes.ok && data.ok) {
          results.push({
            group: grp,
            chat_id: cid,
            message_id: data.result ? data.result.message_id : null,
            count: stList.length,
            ok: true
          });
        } else {
          allSuccess = false;
          results.push({
            group: grp,
            chat_id: cid,
            error: data.description || 'Telegram xatosi',
            ok: false
          });
        }
      } catch (err) {
        allSuccess = false;
        results.push({
          group: grp,
          chat_id: cid,
          error: err.message,
          ok: false
        });
      }
      // Kichik tanaffus (flood limit)
      await new Promise(r => setTimeout(r, 250));
    }
  }

  return res.status(allSuccess ? 200 : 207).json({
    ok: allSuccess,
    sent_count: results.filter(r => r.ok).length,
    total_groups: groupsToSend.length,
    results
  });
};
