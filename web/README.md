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

## Vercel'ga joylash (alohida manzil)

1. Vercel → **Add New Project** → shu GitHub repo.
2. **Root Directory**: `web` (Framework: Next.js avtomatik aniqlanadi).
3. **Environment Variables**:
   - `GITHUB_TOKEN` — repo'ga `contents: read & write` huquqli **yangi** token
     (eski `gho_...` tokenni bekor qiling — u ommaviy repoda ochiq turibdi).
4. Deploy. Hammasi to'g'ri ishlasa, asosiy domenni shu loyihaga o'tkazasiz.

Vercel'da o'zgarishlar `scripts/remote_changes.json` navbatiga yoziladi. Kompyuterdagi
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
| `lib/server/malumotnoma.ts` | O'qiyotganligi haqida ma'lumotnoma — Word shablonini to'ldiradi (`/api/malumotnoma`) |
| `assets/malumotnoma/shablon.docx` | Ma'lumotnoma shabloni (Word) |

## O'qiyotganligi haqida ma'lumotnoma

- **Portal**: talaba oynasi → **Ma'lumotnoma** → sanani tanlash → **Yuklab olish (.docx)** yoki **Botga yuborish**.
- **Bot**: `/malumotnoma 285` (shartnoma raqami yoki F.I.SH) — faqat `TELEGRAM_CHAT_ID` chatida ishlaydi, `.docx` yuboradi.
- Matn faqat bazadan olinadi (F.I.SH, yo'nalish, guruh); o'quv yili va bosqich sanadan hisoblanadi.
  Safdan chiqarilgan talabaga berilmaydi.
- Botga yuborish uchun `TELEGRAM_BOT_TOKEN` va `TELEGRAM_CHAT_ID` kerak (Vercel'da yoki `.env.local` da).
- **Shablonni o'zgartirish**: `assets/malumotnoma/shablon.docx` ni Word'da oching va tahrirlang.
  `{{FISH}}`, `{{OQUV_YILI}}`, `{{YONALISH}}`, `{{BOSQICH}}`, `{{GURUH}}`, `{{SANA}}` belgilarini o'chirmang —
  shu joylarga talaba ma'lumotlari qo'yiladi. Qolgan hammasi (rasmlar, shrift, joylashuv) o'zgarmaydi.

## Hali ko'chirilmagan (2-bosqich)

- AI bilan hujjat tahlili, QR skaner, fayl biriktirish / buferdan qo'yish
- Yangi talaba qo'shish
- Telegram'ga yuborish (guruh jurnallari va Excel)
- Guruh PDF jurnallari hozircha eski saytdan ochiladi
