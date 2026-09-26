# -*- coding: utf-8 -*-
"""
BOSQICH 1: Barcha Pasport va Diplom/Shahodatnoma ma'lumotlarini tozalash
Saqlanadigan ustunlar: T/R, I.F.O, Yo'nalishi, To'lov statusi, 
                        Shartnoma raqami, Sanasi, Telefon raqami
O'chiriladigan ustunlar: 7-16, 21-22 (Ota, F.I.SH, Pasport, PINFL, Sana, Shahodatnoma...)
"""

import openpyxl, shutil, sys, os

sys.stdout.reconfigure(encoding='utf-8')

# 1. Avval zaxira nusxa yasaymiz
src = 'data/Talabalar_Toliq_Royxati.xlsx'
backup = 'qayta_tekshiruv/ZAXIRA_Talabalar_Toliq_Royxati.xlsx'
os.makedirs('qayta_tekshiruv', exist_ok=True)
shutil.copy2(src, backup)
print(f"[OK] Zaxira nusxa saqlandi: {backup}")

wb = openpyxl.load_workbook(src)
ws = wb.active

# O'chiriladigan ustunlar (pasport va diplom ma'lumotlari)
# 7: Otasining ismi
# 8: To'liq F.I.SH
# 9: Passport bo'yicha F.I.SH
# 10: Passport / ID-karta
# 11: JSHSHIR (PINFL)
# 12: Berilgan sanasi
# 13: Tug'ilgan sanasi
# 14: Shahodatnoma bo'yicha F.I.SH
# 15: Shahodatnoma / Diplom Seriyasi
# 16: Shahodatnoma QR Havolasi
# 17: Tugatgan o'qish joyi
# 18: Ta'lim muassasasi turi
# 19: Bitirgan yili
# 21: Qidiruv holati
# 22: Izoh va Eslatmalar

# DIQQAT: 9-ustun (Passport bo'yicha F.I.SH) va 14-ustun (Shahodatnoma
# bo'yicha F.I.SH) ham tozalanadi. Ular pasport/shahodatnoma rasmlaridan
# AI + matematik tekshiruv bilan to'ldirilgan. Bu skriptni ishga tushirsangiz,
# o'sha ish yo'qoladi va quyidagilarni qaytadan bajarish kerak bo'ladi:
#     python scripts/read_passport_names.py
#     python scripts/verify_passport_names.py --apply
# (AI natijalari scratch/passport_name_cache/ da keshlangan — qayta to'lov yo'q.)
CLEAR_COLS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22]

cleaned = 0
for r in range(2, ws.max_row + 1):
    ism = ws.cell(row=r, column=2).value
    if not ism:
        continue
    for c in CLEAR_COLS:
        ws.cell(row=r, column=c, value='')
    cleaned += 1

wb.save(src)
print(f"[OK] {cleaned} ta talabaning pasport va diplom ma'lumotlari tozalandi")
print(f"[OK] Saqlandi: {src}")
print("\nSaqlab qolingan ustunlar:")
print("  1: T/R")
print("  2: I.F.O (Ism va Familiya)")
print("  3: Yo'nalishi")
print("  4: To'lov statusi")
print("  5: Shartnoma raqami")
print("  6: Shartnoma sanasi")
print(" 20: Telefon raqami")
print("\nEndi qayta_tekshiruv/ papkasida 30 tadan guruhlab to'g'ri ma'lumotlar kiritiladi.")
