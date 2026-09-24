# Shahrisabz Abu Ali ibn Sino nomidagi Jamoat Salomatligi Texnikumi (Sh.JSST)
## 2026/2027-o'quv yili Yakuniy Tanlov Natijalari Qaydnomasi

Ushbu papkada **"Шахрисабз ЖСТ.pdf"** fayli to'liq tahlil qilinib, Oliy ta'lim, fan va innovatsiyalar vazirligi huzuridagi Bilim va malakalarni baholash agentligi (DTM) tomonidan tasdiqlangan **843 nafar abituriyentning** imtihon natijalari, ballari, yo'nalishlari va qabul holatlari (Grant / Kontrakt / Chegaradan tashqari) to'liq raqamlashtirilgan.

---

## 📊 Umumiy Qabul Statistikasi

| Ko'rsatkich | Soni (Nafar) | Ulushi (%) |
| :--- | :---: | :---: |
| **Jami Abituriyentlar** | **843** | **100%** |
| 🟢 **Davlat granti asosida qabul qilinganlar** | **108** | **12.8%** |
| 🔵 **To'lov-kontrakt asosida qabul qilinganlar** | **312** | **37.0%** |
| 🟠 **Qabul chegarasidan tashqarida qolganlar** | **423** | **50.2%** |

---

## 🩺 Yo'nalishlar Bo'yicha Qabul Ko'rsatkichlari

### 1. 50910208 — Hamshiralik ishi (Jami: 467 nafar)
- **Davlat granti**: 54 nafar (O'tish bali: **69.50 — 189.00**, O'rtacha: **102.09**)
- **To'lov-kontrakt**: 216 nafar (O'tish bali: **49.40 — 69.40**, O'rtacha: **57.62**)
- **Chegaradan tashqari**: 197 nafar (Ballar: **5.50 — 49.30**)

### 2. 50910204 — Davolash ishi (Jami: 177 nafar)
- **Davlat granti**: 12 nafar (O'tish bali: **118.20 — 188.10**, O'rtacha: **146.64**)
- **To'lov-kontrakt**: 48 nafar (O'tish bali: **57.90 — 114.80**, O'rtacha: **74.16**)
- **Chegaradan tashqari**: 117 nafar (Ballar: **2.20 — 57.20**)

### 3. 50910402 — Farmatsiya (Jami: 82 nafar)
- **Davlat granti**: 30 nafar (O'tish bali: **51.50 — 139.90**, O'rtacha: **66.38**)
- **To'lov-kontrakt**: 0 nafar (Faqat grant kvotasi ajratilgan)
- **Chegaradan tashqari**: 52 nafar (Ballar: **5.50 — 51.40**)

### 4. 50910205 — Funksional diagnostika ishi (Jami: 60 nafar)
- **Davlat granti**: 6 nafar (O'tish bali: **59.00 — 71.50**, O'rtacha: **63.52**)
- **To'lov-kontrakt**: 24 nafar (O'tish bali: **48.60 — 58.60**, O'rtacha: **52.99**)
- **Chegaradan tashqari**: 30 nafar (Ballar: **8.80 — 48.30**)

### 5. 40910302 — Tibbiy profilaktika ishi (Jami: 57 nafar)
- **Davlat granti**: 6 nafar (O'tish bali: **49.90 — 61.10**, O'rtacha: **54.32**)
- **To'lov-kontrakt**: 24 nafar (O'tish bali: **39.00 — 49.40**, O'rtacha: **44.85**)
- **Chegaradan tashqari**: 27 nafar (Ballar: **5.50 — 38.90**)

---

## 📁 Yaratilgan Fayllar

1. **`Shahrisabz_JSST_Qaydnomasi.xlsx`**:
   - 5 ta alohida varaqdan (sheet) iborat boy bezatilgan Excel kitobi:
     1. *Barcha Abituriyentlar (843)* — to'liq filtrli va rangli jadval.
     2. *Davlat Granti (108)* — grant yutgan talabalar.
     3. *To'lov-Kontrakt (312)* — kontraktga kirgan talabalar.
     4. *Chegaradan Tashqari (423)* — o'ta olmaganlar.
     5. *Yo'nalishlar Statistikasi* — o'tish ballari, kvotalar va o'rtacha ballar.
2. **`hisobot.html` (va `index.html`)**:
   - Brauzerda ochiluvchi interaktiv veb dashboard:
     - Real-vaqtda F.I.SH, ID, Sharif bo'yicha qidiruv.
     - Qabul holati, yo'nalish, jinsi va minimal ball bo'yicha tezkor filtrlar.
     - Chart.js orqali interaktiv vizual diagrammalar.
     - Excel (.xlsx) va CSV ga eksport qilish tugmalari.
3. **`talabalar_bazasi.json`**:
   - Dasturlash va boshqa tizimlarga integratsiya qilish uchun toza JSON formatidagi to'liq ma'lumotlar bazasi.
4. **`extract_shahrisabz_jsst.py`**:
   - Ma'lumotlarni PDF dan qayta ajratib olish va hisobotlarni yangilash skripti.

---

## ⚡ Qayta Ishga Tushirish
Agar yangi ma'lumotlar qo'shilsa yoki tahrirlansa:
```bash
python extract_shahrisabz_jsst.py
```
yoki `HISOBOTNI_OCHISH.bat` faylini ikki marta bosing.
