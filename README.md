# Talabalar Ro'yxatiga Otasining Ismini (Sharifini) Avtomatik To'ldirish Dasturi

Ushbu dastur **Word (.docx)** shartnomalari/arizalari va **Excel (.xlsx)** talabalar ro'yxati o'rtasida aqlli tahlil (NLP, RegEx va Fuzzy Matching) o'tkazib, bo'sh qolgan "Otasining ismi" (Sharifi) ustunini avtomatik ravishda to'ldiradi va yangi to'liq shakllangan Excel fayli hamda interaktiv HTML hisobotini yaratadi.

---

## 🚀 Asosiy Imkoniyatlar

1. **Ko'p manbali hujjatlarni o'qish**:
   - Papka va barcha ichki papkalardagi `.docx` fayllarni rekursiv qidirish.
   - `.zip` arxivlarni to'g'ridan-to'g'ri ochib, ichidagi shartnomalarni tahlil qilish.
2. **O'zbek tili uchun maxsus moslashuv**:
   - Turli xil apostroflar (`o‘`, `g‘`, `o'`, `g'`, `o` `, `g` `, `ʻ`, `ʼ`, `’`)ni avtomatik to'g'rilash.
   - `o'g'li`, `qizi`, `uli`, `qzy`, `ovich`, `ovna`, `evich`, `evna` formatlarini to'g'ri ajratish va formatlash (`Sherali o'g'li`, `G'ulomjon qizi`).
3. **5 Bosqichli Aqlli Moslashtirish (Smart Matching Engine)**:
   - **1-bosqich**: To'liq Aniq Fonetik Moslik (Exact Normalized Match).
   - **2-bosqich**: Teskari Nom Mosligi (Familiya Ism <-> Ism Familiya).
   - **3-bosqich**: Shartnoma Raqami va Qisman O'xshashlik (Contract ID Match).
   - **4-bosqich**: Fonetik va Harf Xatolariga Chidamli Moslik (`x`/`h`, `e`/`ye`, `temur`/`temir`, `sattor`/`sottor`, `luqmon`/`luxmon`).
   - **5-bosqich**: Keng qamrovli Fuzzy Matching ($\ge 78\%$).
4. **Excel Uslublarini To'liq Saqlash**:
   - Original Excel jadvalidagi ranglar, shriftlar, hoshiyalar va qator balandliklari saqlanadi.
   - "Otasining ismi (Sharifi)", "To'liq F.I.SH" va "Qidiruv holati (Status)" ustunlari qo'shiladi.
5. **Zamonaviy Interaktiv HTML Hisoboti**:
   - `natijalar_hisoboti.html` — qidiruv, real vaqtda filtrlash (Topilganlar / Topilmaganlar) va to'liq statistika bilan ta'minlangan dashboard.

---

## 🛠 O'rnatish va Talablar

Dastur ishlashi uchun quyidagi kutubxonalar zarur:
```bash
pip install python-docx openpyxl
```

---

## 💻 Foydalanish

### 1. Standart Ishga Tushirish:
Joriy papkada `talabalar ro'yhati.xlsx` va `files` papkasi mavjud bo'lsa, oddiygina quyidagi buyruqni bering:
```bash
python student_name_filler.py
```

### 2. Maxsus Fayl va Papkalar Bilan Ishga Tushirish:
```bash
python student_name_filler.py --excel "yangi_royxat.xlsx" --word-dir "shartnomalar_papkasi"
```

### 3. ZIP Arxiv Bilan Ishga Tushirish:
```bash
python student_name_filler.py --excel "royxat.xlsx" --word-dir "shartnomalar.zip"
```

---

## 📊 Natijaviy Fayllar

- **`Talabalar_Toliq_Royxati.xlsx`** — Otasining ismi va to'liq F.I.SH bilan to'ldirilgan yangi Excel fayli.
- **`natijalar_hisoboti.html`** — Brauzerda ochib ko'rish mumkin bo'lgan interaktiv hisobot sahifasi.
- **`hisobot_natijasi.txt`** — Matnli hisobot fayli.
