# Talabalar shartnomalari va hujjatlari tizimi

Shahrisabz Tibbiyot Texnikumi 1-kurs talabalarining shartnoma, pasport va ta'lim hujjatlari bazasi.
Asosiy portal — **web/** (Next.js). Ma'lumotlar Excel'da saqlanadi, Python xizmati ularni yangilaydi
va GitHub'ga yuboradi, onlayn portal (Vercel) GitHub'dan o'qiydi.

## Ishga tushirish

| Fayl | Nima qiladi |
|---|---|
| `ISHGA_TUSHIRISH.bat` | Hisobotlarni yangilaydi, ma'lumot xizmatini (8080) va portalni (3000) ishga tushiradi, portalni ochadi |
| `WEB_ISHGA_TUSHIRISH.bat` | Faqat web portal (localhost:3000) |
| `BOTNI_ISHGA_TUSHIRISH.bat` | Faqat ma'lumot xizmati va Telegram bot |
| `YANGILASH.bat` | Hisobotlar, qabul shabloni va shubhali ma'lumotlar tekshiruvini qayta yaratadi |

Onlayn: https://talabalar-royhati.vercel.app (Vercel → Root Directory: `web`)

## Papkalar

| Papka | Ichida |
|---|---|
| `data/` | **Asosiy baza**: `Talabalar_Toliq_Royxati.xlsx` (manba), undan yaratiladigan `students.json`, `talabalar_bazasi.json`, `Talabalar_Yangilangan_Royxat.xlsx`; `manba/` — dastlabki 1-kurs ro'yxati |
| `hujjatlar/` | `shartnomalar/` — talabalar .docx shartnomalari (pasport/shahodatnoma rasmlari bilan), `TOPILGAN_30/`, `TEKSHIRUV/` (OCR natijalari), `tg_rasmlar/` |
| `hisobotlar/` | `rollar/` (1–4 bo'lim Excel), `qabul/` (qabul shabloni + guruhlar), `pdf_jurnallar/`, `tekshiruvlar/`, `shartnoma_raqamlari/`, `Sh.JSST/` |
| `web/` | **Asosiy portal** (Next.js): talabalar, tahrirlash, AI tahlil, eksport, jurnal, Telegram bot webhook (`/api/telegram_webhook`) |
| `xizmatlar/` | `telegram_sync_service.py` — Excel'ga yozish, Telegram bot, GitHub sinxron (8080); `telegram_channel_listener.py` |
| `qayta_tekshiruv/` | `03_hisobot_yasat.py` — Excel'dan JSON, hisobotlar va PDF jurnallarni yaratadi |
| `scripts/` | Yordamchi skriptlar (qabul shabloni, shubhali ma'lumotlar tekshiruvi, telefonlar, tekshiruvlar) |
| `eski_portal/` | Oldingi portal (localhost:8080 da arxiv sifatida ochiladi); `vercel_statik/` — eski Vercel fayllari |
| `arxiv/` | Eski zaxira nusxalar va vaqtinchalik fayllar |

## Ma'lumot oqimi

```
data/Talabalar_Toliq_Royxati.xlsx  ──(03_hisobot_yasat.py)──►  data/students.json, data/talabalar_bazasi.json,
        ▲                                                       hisobotlar/pdf_jurnallar, eski_portal/index.html
        │ yozadi                                                        │
xizmatlar/telegram_sync_service.py ◄── web/ (lokal: localhost:8080)     │ git push
        ▲                                                               ▼
        └──── scripts/remote_changes.json ◄── web/ (Vercel) ◄──── GitHub (data/students.json)
```
