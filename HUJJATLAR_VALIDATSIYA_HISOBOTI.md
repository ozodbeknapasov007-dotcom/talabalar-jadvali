# O'zbekiston Shaxsni Tasdiqlovchi Hujjatlari Bo'yicha Ma'lumotlar Validatsiyasi Hisoboti

**Tashkilot:** Abu Ali ibn Sino nomidagi Shahrisabz Jamoat salomatligi texnikumi  
**O'quv yili:** 2026/2027 o'quv yili (1-kurs talabalari)  
**Tekshiruv sanasi:** 18.09.2026  
**Tekshiruvchi:** Validator-Agent (Qat'iy format, sana, o'zaro moslik va checksum qoidalari asosida)

---

## 1. Asosiy Qoidalar va Metodologiya

Ushbu tekshiruv quyidagi qat'iy tamoyillar asosida amalga oshirildi:
1. **Format tekshiruvi:** Pasport 2 ta lotin bosh harfi va 7 ta raqamdan (`^[A-Z]{2}[0-9]{7}$`) iboratligi, kirill-lotin aralashuvi va OCR xatolari (O/0, B/8, I/1) tekshirildi.
2. **Sanalarning mantiqiy mosligi:** Kalendar sanalari mavjudligi, tug'ilgan sana va berilgan sana kelajakda emasligi, pasport berilgan sana tug'ilgan sanadan keyin ekanligi va berilgan kundagi yosh hisoblandi.
3. **JSHSHIR (PINFL) anatomiyasi va 14-raqam Nazorat Formulasi:**
   - 1-raqam jins va asr kodi (5/6 — 2000-yillar, 3/4 — 1900-yillar);
   - 2–7 raqamlar tug'ilgan sana (`KK.OO.YY`);
   - 14-raqam rasmiy og'irlik koeffitsiyentlari bo'yicha hisoblandi:
     $$\text{Vaznlar} = [7, 3, 1, 7, 3, 1, 7, 3, 1, 7, 3, 1, 7]$$
     $$\text{Nazorat Raqami} = \left( \sum_{i=1}^{13} \text{raqam}_i \times \text{vazn}_i \right) \pmod{10}$$
4. **Shaxsiy ma'lumotlarni niqoblash:** Barcha pasportlar `AA***4567`, barcha JShShIRlar esa `612********28` ko'rinishida yashirildi.
5. **Huquqiy eslatma:** Davlat idoralari (IIV / Soliq) rasmiy API bazasiga ulanish mavjud bo'lmagani sababli, **"Rasmiy bazada tekshirilmagan"** tamoyiliga amal qilindi.

---

## 2. Umumiy Audit Statistikasi

| Holat | Talabalar soni | Foiz ulushi | Izoh |
| :--- | :---: | :---: | :--- |
| **`PASS_FORMAT`** | **117 ta** | **70.1%** | Barcha formatlar, sanalar, jins, 14 xonali JShShIR va matematik checksum to'liq to'g'ri |
| **`NOT_CHECKABLE`** | **34 ta** | **20.4%** | Hujjati biriktirilmagan yoki pasport/JShShIR kiritilmagan |
| **`MANUAL_REVIEW`** | **12 ta** | **7.2%** | Format to'g'ri, lekin qo'lda asl hujjat bilan solishtirish talab etiladi |
| **`DATA_MISMATCH`** | **3 ta** | **1.8%** | Boshqa shaxsning hujjati yoki ma'lumot mos kelmasligi |
| **`FAIL_FORMAT`** | **1 ta** | **0.6%** | Sana maydonida kalendar sanasi o'rniga matn yozilgan |
| **JAMI** | **167 ta** | **100%** | Barcha 7 ta akademik guruh talabalari |

---

## 3. JShShIR (PINFL) va 14-raqam Nazorat Formulasi Tahlili

Bazada JShShIR kiritilgan **131 nafar** talaba bo'yicha quyidagi matematik xulosalar olindi:
- **14 xonali format:** 131 ta (100%) — barcha JShShIRlar aynan 14 ta raqamdan iborat.
- **Jins va asr kodi mosligi:** 131 ta (100%) — talabaning ismi/sharifi va jinsi JShShIRning 1-raqamiga to'liq mos keldi.
- **Tug'ilgan sana mosligi:** 131 ta (100%) — JShShIRdagi `KK.OO.YY` qismi talabaning pasport/shahodatnomasidagi tug'ilgan sana bilan aynan bir xil.
- **14-raqam Checksum formulasi:** 131 ta (100%) — **bitta ham matematik xatolik chiqmadi!** Barcha 131 ta JShShIRning 14-raqami rasmiy formula bo'yicha to'liq tasdiqlandi.

---

## 4. Aniq Xatoliklar Aniqlangan Talabalar Ro'yxati

| T/R | Guruh | F.I.SH (Asl ro'yxat) | Niqoblangan Pasport | Niqoblangan JSHSHIR | Aniqlangan Xato | Tavsiya etilgan tuzatish |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **#72** | 26-03 | Xayrullayeva Umida | `AD***6798` | `619********96` | Berilgan sana maydonida `'Noma'lum'` matni kiritilgan (`FAIL_FORMAT`). | Pasport rasmidan berilgan sana (kun.oy.yil) aniqlanib, qayta yozilishi kerak. |
| **#32** | 26-02 | Saidaliyeva Ruxshona | `—` | `—` | Shartnoma fayli mavjud emas, bazada "Boshqa odamning hujjati" belgilangan (`DATA_MISMATCH`). | Talabaning haqiqiy shartnoma Word fayli topilib, biriktirilishi kerak. |
| **#91** | 26-04 | Qodirova Sabina | `—` | `—` | Shartnoma fayli ichidagi rasmlar boshqa talabaga tegishli (`DATA_MISMATCH`). | Haqiqiy hujjat nusxalari biriktirilishi kerak. |
| **#141** | 26-06 | Mahmamurodova Sevara | `AE***3843` | `607********87` | Fayl ichidagi ma'lumotlar boshqa talabaga tegishli deb belgilangan (`DATA_MISMATCH`). | Operator tomonidan hujjat rasmlari qo'lda solishtirilishi lozim. |

---

## 5. Qo'lda Tekshirilishi Talab Etiladigan Talabalar (`MANUAL_REVIEW` — 12 nafar)

| T/R | Guruh | F.I.SH | Niqoblangan Pasport | Holat | Sabab va Tekshiruv Yo'nalishi |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **#165** | 26-07 | Nazirova Intizor | `AB***9926` | `MANUAL_REVIEW` | Asl ro'yxatda **Nazirova**, pasportda esa **Narziyeva** deb yozilgan. Familiyani rasmiy tasdiqlash kerak. |
| **#18** | 26-02 | G'aybullayeva Ruxsora | `AD***1218` | `MANUAL_REVIEW` | Pasport berilgandagi yoshi **10 yosh** ko'rsatilgan (ehtimol xorijga chiqish biometrik pasporti bo'lgan). Yangi ID-karta sanasini kiritish tavsiya qilinadi. |
| **#29** | 26-02 | Ochildiyeva Dinara | `AE***4333` | `MANUAL_REVIEW` | Shahodatnoma va pasportdagi ismda asl ro'yxatdan harfiy tafovut mavjud. |
| **#31** | 26-02 | Ruzimurodova Larisa | `AE***4961` | `MANUAL_REVIEW` | Shahodatnomadagi ism ro'yxatdan farq qiladi. |
| **#36** | 26-02 | To'raboyeva Sabrina | `AE***8477` | `MANUAL_REVIEW` | Shahodatnomada ro'yxatdan farq mavjud. |
| **#54** | 26-03 | Mustafayeva Madina | `AE***6447` | `MANUAL_REVIEW` | Pasport va shahodatnomadagi ism ro'yxatdan farq qiladi. |
| **#76** | 26-04 | Abdixalilova Shahzoda | `AD***3449` | `MANUAL_REVIEW` | Pasport va shahodatnomadagi ism ro'yxatdan farq qiladi. |
| **#82** | 26-04 | Hamraqulova Marjona | `AE***5748` | `MANUAL_REVIEW` | Pasport va shahodatnomadagi ism ro'yxatdan farq qiladi. |
| **#109** | 26-05 | Ergashova Shabbona | `AE***4828` | `MANUAL_REVIEW` | Pasportdagi ism ro'yxatdan farq qiladi. |
| **#132** | 26-05 | Xolmirzayeva Zebiniso | `AD***2477` | `MANUAL_REVIEW` | Pasportdagi ism ro'yxatdan farq qiladi. |
| **#134** | 26-06 | Abduxoliqova Elmira | `AE***2271` | `MANUAL_REVIEW` | Pasport va shahodatnomadagi ism ro'yxatdan farq qiladi. |
| **#156** | 26-06 | Sayfullayeva Shodiyona | `AE***5111` | `MANUAL_REVIEW` | Pasport va shahodatnomadagi ism ro'yxatdan farq qiladi. |

---

## 6. Xulosa va Keyingi Qadamlar

1. **Format va Checksum ishonchliligi:** Bazadagi 131 ta mavjud pasport va JShShIR ma'lumotlari kiritilishida 100% matematik va mantiqiy to'g'ri shakllantirilgan.
2. **Qo'lda ko'rish talabi:** Yuqoridagi 16 nafar talaba bo'yicha operator shartnoma fayllarini ochib, ismlarni tasdiqlashi kerak.
3. **Tasdiqlash tizimi:** Har bir talabani operator tomonidan bittalab ko'rib, "Ma'lumotlar to'g'ri" tugmasi orqali tasdiqlash imkoniyati platformaga integratsiya qilindi.
4. **Rasmiy maqom:** Mazkur tahlil ichki nazorat hisoblanib, davlat idoralari bazasiga so'rov yuborilmagan.
