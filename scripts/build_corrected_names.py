# -*- coding: utf-8 -*-
"""
TO'RT USTUNLI ISM TUZILMASI
============================
  2 + 7-ustun : ASL RO'YXAT — foydalanuvchiniki, xatolari bilan. TEGILMAYDI.
  8-ustun     : TUZATILGAN F.I.SH — rasmiy hujjatga tayangan holda
  9-ustun     : PASPORTDA qanday yozilgan
 14-ustun     : SHAHODATNOMA / DIPLOMDA qanday yozilgan

8-ustun qanday hosil bo'ladi (ustuvorlik tartibi):
  1. Pasport (9-ustun) — tekshiruvdan o'tgan bo'lsa. Shaxsni tasdiqlovchi
     asosiy hujjat, shuning uchun birinchi o'rinda.
  2. Shahodatnoma / diplom (14-ustun) — pasport yo'q bo'lsa.
  3. Asl ro'yxat (2 + 7) — hech qanday hujjat bo'lmasa.

Manba 24-ustunda ko'rsatiladi, shunda qaysi qiymat qayerdan kelgani ko'rinadi.

    python scripts/build_corrected_names.py --dry-run
    python scripts/build_corrected_names.py
"""
import openpyxl
import os
import re
import sys
import shutil
import datetime

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
DRY = '--dry-run' in sys.argv

C_IFO, C_OTA, C_FISH, C_PASS, C_CERT, C_GURUH, C_MATCH = 2, 7, 8, 9, 14, 23, 24

HEADERS = {
    C_IFO:   "I.F.O (asl ro'yxat)",
    C_OTA:   "Otasining ismi (asl ro'yxat)",
    C_FISH:  "To'liq F.I.SH (tuzatilgan)",
    C_PASS:  "Passport bo'yicha F.I.SH",
    C_CERT:  "Shahodatnoma / Diplom bo'yicha F.I.SH",
}


def nb(v):
    return re.sub(r'\s+', ' ', str(v if v is not None else '').replace('\xa0', ' ')).strip()


def clean_uz_name(text):
    text = nb(text)
    if not text:
        return ''
    text = re.sub(r"[`‘’ʻʼ´]", "'", text)
    out = []
    for w in text.split(' '):
        wl = w.lower()
        if wl in ('qizi', 'kizi', 'qzy'):
            out.append('qizi')
        elif wl in ("o'g'li", 'ogli', 'ugli', "o'gli", 'uli'):
            out.append("o'g'li")
        elif "'" in w:
            parts = w.split("'")
            out.append("'".join(p.capitalize() if i == 0 else p.lower()
                                for i, p in enumerate(parts)))
        else:
            out.append(w.capitalize())
    return ' '.join(out)


def plain(s):
    return re.sub(r"[`‘’ʻʼ´']", '', nb(s)).lower()


wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb.active

for col, title in HEADERS.items():
    ws.cell(row=1, column=col, value=title)

rows = []
for r in range(2, ws.max_row + 1):
    ifo = nb(ws.cell(row=r, column=C_IFO).value)
    if not ifo:
        continue
    ota = nb(ws.cell(row=r, column=C_OTA).value)
    pas = nb(ws.cell(row=r, column=C_PASS).value)
    cer = nb(ws.cell(row=r, column=C_CERT).value)
    cur = nb(ws.cell(row=r, column=C_FISH).value)
    asl = f'{ifo} {ota}'.strip()

    # Shahodatnoma ustuni KATTA HARFDA saqlanadi (PDF dagidek) — tuzatilgan
    # ustun uchun oddiy harfga keltiramiz
    cer_norm = clean_uz_name(cer) if cer else ''

    if pas:
        yangi, manba = pas, 'pasport'
    elif cer_norm:
        yangi, manba = cer_norm, 'shahodatnoma'
    else:
        yangi, manba = asl, "asl ro'yxat"

    rows.append({'row': r, 'ifo': ifo, 'guruh': nb(ws.cell(row=r, column=C_GURUH).value),
                 'asl': asl, 'eski': cur, 'yangi': yangi, 'manba': manba,
                 'farq': plain(yangi) != plain(asl)})

ozgargan = [x for x in rows if x['eski'] != x['yangi']]
farqli = [x for x in rows if x['farq']]
by_src = {}
for x in rows:
    by_src[x['manba']] = by_src.get(x['manba'], 0) + 1

print('=' * 76)
print('  8-USTUN: TUZATILGAN F.I.SH')
print('=' * 76)
print(f'  Jami talaba                  : {len(rows)}')
for k in ('pasport', 'shahodatnoma', "asl ro'yxat"):
    print(f'    {k:14s} dan olindi   : {by_src.get(k, 0)}')
print('-' * 76)
print(f"  8-ustun o'zgaradi            : {len(ozgargan)}")
print(f"  Asl ro'yxatdan farq qiladi   : {len(farqli)}")
print('=' * 76)

if farqli:
    print()
    print('  ASL RO\'YXAT  ->  TUZATILGAN   (manba)')
    print('-' * 76)
    for x in farqli:
        print(f"  [{x['guruh']}] {x['asl']:34s} -> {x['yangi']:34s} ({x['manba']})")

if DRY:
    print('\n🔍 DRY-RUN — hech narsa yozilmadi')
    sys.exit(0)

stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
os.makedirs(os.path.join(BASE_DIR, 'backup'), exist_ok=True)
bp = os.path.join(BASE_DIR, 'backup',
                  f'Talabalar_Toliq_Royxati_TUZATILGAN_ISM_OLDIN_{stamp}.xlsx')
shutil.copy2(EXCEL_PATH, bp)

for x in rows:
    ws.cell(row=x['row'], column=C_FISH, value=x['yangi'])

wb.save(EXCEL_PATH)
print(f"\n✅ Zaxira: backup/{os.path.basename(bp)}")
print(f"💾 8-ustun yangilandi: {len(ozgargan)} ta qator o'zgardi")
print("   2 va 7-ustunga (asl ro'yxatingizga) TEGILMADI.")
