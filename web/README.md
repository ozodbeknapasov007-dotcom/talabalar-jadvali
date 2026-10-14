# Talabalar portali (Next.js)

Eski `index.html` (2.8 MB, ma'lumot HTML ichiga qotirilgan) o'rniga yangi sayt.
Ma'lumot alohida `students.json` dan yuklanadi, ro'yxatda faqat ekranda ko'rinib
turgan kartalar chiziladi — 177 ta talaba ham, 3000 ta ham bir xil tez ishlaydi.

## Kompyuterda ishga tushirish

```bash
cd web
npm install
npm run dev
```

Brauzerda: http://localhost:3000

Lokal rejimda talabalar ota papkadagi `students.json` dan o'qiladi. Tahrirlar
kompyuterdagi Python xizmatiga (`ISHGA_TUSHIRISH.bat`, `localhost:8080`) yuboriladi.
Xizmat o'chiq bo'lsa, sarlavhada **"Python xizmati o'chiq"** degan qizil belgi chiqadi.
Tahrirlar brauzerda saqlanib turadi va xizmat yoqilgach qayta yuboriladi.

## Netlify'ga joylash

Sayt: https://talabalar-jadvali.netlify.app. Sozlama repo ildizidagi `netlify.toml` da
(base = `web`, `@netlify/plugin-nextjs`, Node 22) — `main` ga push qilinganda o'zi yig'iladi.

**Site configuration → Environment variables** (o'zgartirgach **Deploys → Trigger deploy** qiling):
- `PORTAL_LOGIN`, `PORTAL_PASSWORD` — portalga kirish (`/login`). Ikkalasi bo'lmasa hech kim kira olmaydi.
  `proxy.ts` barcha sahifa va API'larni yopadi; ochiq qoladiganlar: `/api/telegram_webhook` (maxfiy kalit)
  va `/api/mytest-roster` (Bearer token). Sessiya 30 kun; parol almashtirilsa hamma qayta kiradi.
- `GITHUB_TOKEN` — repo'ga `contents: read & write` huquqli token.
- `TELEGRAM_BOT_TOKEN` — @BotFather bergan token (kodda zaxira token yo'q, repo ommaviy).
- `TELEGRAM_CHAT_ID`, ixtiyoriy `TELEGRAM_CHANNEL_ID` — hisobotlar boradigan chat/kanal.
- `TELEGRAM_ALLOWED_IDS` — botdan foydalana oladigan boshqa xodimlar ID lari (vergul bilan). Bot faqat
  `TELEGRAM_CHAT_ID` va shu ro'yxatdagilarga javob beradi; begona odam o'z ID sini ko'radi (`/id`).
- `OPENROUTER_API_KEY`, `WEB_JURNAL_API_KEY`, `MYTEST_ROSTER_TOKEN` — tegishli funksiyalar uchun.

**Botni ulash** (yangi token qo'yib, qayta deploy qilingach) — brauzerda bir marta oching:
`https://talabalar-jadvali.netlify.app/api/telegram_webhook?action=setup`.
Javobda `"ok": true` va `"set_webhook": "ulandi"` chiqishi kerak. Webhook maxfiy kalit bilan ulanadi
(tokendan hosil qilinadi), shuning uchun Telegram'ning `setWebhook` havolasini qo'lda ochmang — bot
xabarlarni rad etadi. Holatni tekshirish: `...?action=status` (oxirgi xato, navbatdagi xabarlar).
Webhook ulangach kompyuterdagi Python xizmati `getUpdates` qilmaydi; xizmat uchun tokenni
`scripts/backup_config.json` → `bot_token` ga ham yozing (boshqa xodimlar: `"allowed_ids": "123,456"`).
Kunlik hisobotlar — Netlify jadval funksiyalari: `netlify/functions/kunlik-kontingent.mts` (har kuni 09:00)
va `kunlik-zahira.mts` (18:00, Toshkent vaqti). Netlify → Logs & metrics → Functions da ko'rinadi, **Run now** bilan sinash mumkin.

Saytda o'zgarishlar `scripts/remote_changes.json` navbatiga yoziladi. Kompyuterdagi
Python xizmati navbatni tortib, Excelga qo'llaydi va `students.json` ni yangilaydi.
Sayt har 45 soniyada (va oynaga qaytilganda) yangi ma'lumotni o'zi tortadi.

## Tuzilishi

| Fayl | Vazifasi |
| --- | --- |
| `lib/server/source.ts` | Ma'lumot o'qish/yozish: lokal (Python xizmati) yoki GitHub navbati |
| `lib/store.ts` | Tahrirlarni darhol ko'rsatish, brauzerda saqlash, server yetib olgach tozalash |
| `lib/excel.ts` | 4 bo'limli Excel eksport (eski saytdagi bilan bir xil ustunlar) |
| `components/StudentList.tsx` | Virtual ro'yxat — karta va jadval ko'rinishi |
| `components/StudentModal.tsx` | Talaba oynasi: ko'rish, tahrirlash, hujjat rasmlari |
| `lib/server/malumotnoma-rasm.tsx` | Ma'lumotnoma JPG rasmi — shablon joylashuvi bo'yicha chiziladi (`/api/malumotnoma`) |
| `lib/server/malumotnoma.ts` | Word shablonini to'ldiradi (`/api/malumotnoma?format=docx`), shablondagi rasmlarni beradi |
| `assets/malumotnoma/` | `shablon.docx` (Word shablon) va shriftlar (Liberation Serif = Times New Roman o'lchamlari) |

## Kurslar va maxsus guruhlar

- Kurslar va ularning guruhlari — `lib/config.ts` → `COURSES`. Guruh kodi qabul yilini bildiradi
  (26-xx — 1-kurs, 25-xx — 2-kurs, 24-xx — 3-kurs); ro'yxatda yo'q "YY-NN" guruh ham avtomatik to'g'ri kursga tushadi.
- Maxsus guruhlar (rasmiy kontingentga kirmaydi): **Akademik ta'til olganlar** va **Talabalar safidan chiqarilganlar**.
  Talabani ularga o'tkazish — talaba oynasida "Akademik guruh" maydonidan.

## O'qiyotganligi haqida ma'lumotnoma

- **Portal**: talaba oynasi → **Ma'lumotnoma** → sanani tanlash → rasm ko'rinadi → **Yuklab olish (.jpg)** yoki **Botga yuborish** (rasm). Tahrirlash uchun **Word (.docx)** havolasi ham bor.
- **Bot**: `/malumotnoma 285` (shartnoma raqami yoki F.I.SH) — faqat `TELEGRAM_CHAT_ID` chatida ishlaydi, JPG rasm yuboradi.
- Matn faqat bazadan olinadi (F.I.SH, yo'nalish, guruh); o'quv yili va bosqich sanadan hisoblanadi.
  Safdan chiqarilgan talabaga berilmaydi.
- Botga yuborish uchun `TELEGRAM_BOT_TOKEN` va `TELEGRAM_CHAT_ID` kerak (Netlify'da yoki `.env.local` da).
- **Shablonni o'zgartirish**: `assets/malumotnoma/shablon.docx` ni Word'da oching va tahrirlang.
  `{{FISH}}`, `{{OQUV_YILI}}`, `{{YONALISH}}`, `{{BOSQICH}}`, `{{GURUH}}`, `{{SANA}}` belgilarini o'chirmang —
  shu joylarga talaba ma'lumotlari qo'yiladi. Word fayl shablonning o'zidan to'ldiriladi. JPG rasm esa logotip va
  direktor bloki rasmini (o'lchami va chap-o'ng joyi bilan) shablondan oladi, matn joylashuvi esa kodda
  (`malumotnoma-rasm.tsx`) — shablonda matn joyini o'zgartirsangiz, JPG uchun uni ham moslash kerak.

## Hali ko'chirilmagan (2-bosqich)

- AI bilan hujjat tahlili, QR skaner, fayl biriktirish / buferdan qo'yish
- Yangi talaba qo'shish
- Telegram'ga yuborish (guruh jurnallari va Excel)
- Guruh PDF jurnallari hozircha eski saytdan ochiladi
