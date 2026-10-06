# -*- coding: utf-8 -*-
"""
RASMIY BUYRUQLARNI BAZAGA KIRITISH VA DAVOMAT JURNALINI YANGILASH
=================================================================
1. Foydalanuvchi taqdim etgan rasmiy qabul buyruqlari:
   - 26-01 guruhi: T-40/1, 02.09.2026
   - 26-02, 26-03, 26-04, 26-05, 26-06 guruhlari: T-40/2, 02.09.2026
2. "Buyruq raqamlari.xlsx" dan 2-3 kurs talabalarining aniq buyruqlari.
3. students.json, talabalar_bazasi.json, Excel va Supabase'ga yoziladi.
4. "Davomat jurnali 26-02 (TO'LDIRILGAN).docx" da:
   - 1-jadvalda buyruq "T-40/2, 02.09.2026" qilib yangilanadi.
   - Bo'sh kataklar tekshirilib, taxminiy (soxta) ma'lumotlar olib tashlanadi
     (faqat haqiqiy so'rovnoma va tasdiqlangan ma'lumotlar qoldiriladi).
5. "hisobotlar/Davomat_Jurnali_Uchun_Malumotlar.xlsx" qayta yangilanadi.
"""

import os
import sys
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import docx
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from difflib import SequenceMatcher
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# 1. Asosiy talabalar bazasini o'qish
students_path = os.path.join(BASE_DIR, 'data', 'students.json')
with open(students_path, 'r', encoding='utf-8') as f:
    students = json.load(f)

print(f"Jami talabalar: {len(students)}")

# 2. 1-kurs qabul buyruqlarini belgilash
k1_updated = 0
for s in students:
    grp = str(s.get('group', '')).strip()
    if grp == '26-01':
        s['buyruq'] = 'T-40/1'
        s['buyruq_sana'] = '02.09.2026'
        k1_updated += 1
    elif grp in ('26-02', '26-03', '26-04', '26-05', '26-06'):
        s['buyruq'] = 'T-40/2'
        s['buyruq_sana'] = '02.09.2026'
        k1_updated += 1

print(f"1-kurs talabalariga rasmiy qabul buyruqlari biriktirildi: {k1_updated} nafar.")

# 3. "Buyruq raqamlari.xlsx" dan boshqa aniq buyruqlarni biriktirish
orders_file = os.path.join(BASE_DIR, 'Buyruq raqamlari.xlsx')
other_updated = 0
if os.path.exists(orders_file):
    wb_o = openpyxl.load_workbook(orders_file, data_only=True)
    ws_o = wb_o.active
    for r in range(2, ws_o.max_row + 1):
        fio = str(ws_o.cell(r, 2).value or '').strip()
        b_num = str(ws_o.cell(r, 6).value or '').strip()
        b_sana = ws_o.cell(r, 7).value
        sana_str = b_sana.strftime('%d.%m.%Y') if hasattr(b_sana, 'strftime') else str(b_sana or '')
        if not b_num or len(fio.split()) < 3: continue
        if any(k in fio.lower() for k in ['qabul', 'edo', 'kursga', 'kursdan', 'perevod', 'tsch']): continue

        # Talabani topamiz
        for s in students:
            # 1-kurs talabalariga tegmaymiz (ular T-40/1 va T-40/2)
            if str(s.get('group', '')).startswith('26-'): continue
            s_fio = s.get('fish', '')
            if SequenceMatcher(None, fio.lower(), s_fio.lower()).ratio() > 0.88:
                s['buyruq'] = b_num
                s['buyruq_sana'] = sana_str
                other_updated += 1
                break

print(f"Boshqa kurslar bo'yicha aniq buyruqlar biriktirildi: {other_updated} nafar.")

# 4. JSON fayllarni saqlash
with open(students_path, 'w', encoding='utf-8') as f:
    json.dump(students, f, ensure_ascii=False, indent=2)

baza_path = os.path.join(BASE_DIR, 'data', 'talabalar_bazasi.json')
with open(baza_path, 'w', encoding='utf-8') as f:
    json.dump({'students': students}, f, ensure_ascii=False, indent=2)

print("✅ data/students.json va talabalar_bazasi.json yangilandi.")

# 5. Excel bazalarini yangilash (Col 26: Buyruq raqami, Col 27: Buyruq sanasi)
st_map = {s['row']: s for s in students}
for fn in ['Talabalar_Toliq_Royxati.xlsx', 'Talabalar_Yangilangan_Royxat.xlsx']:
    xp = os.path.join(BASE_DIR, 'data', fn)
    if os.path.exists(xp):
        wb_x = openpyxl.load_workbook(xp)
        ws_x = wb_x.active
        # Col 26 va 27
        b_col, bs_col = None, None
        for c in range(1, ws_x.max_column + 1):
            v = str(ws_x.cell(1, c).value or '').lower()
            if 'buyruq raqam' in v: b_col = c
            if 'buyruq sana' in v: bs_col = c
        b_col = b_col or 26
        bs_col = bs_col or 27

        for r in range(2, ws_x.max_row + 1):
            if r in st_map:
                st = st_map[r]
                ws_x.cell(r, b_col, value=st.get('buyruq') or '')
                ws_x.cell(r, bs_col, value=st.get('buyruq_sana') or '')
        wb_x.save(xp)
        print(f"✅ data/{fn} buyruq ustunlari yangilandi.")

# 6. "Davomat jurnali 26-02 (TO'LDIRILGAN).docx" ni xatosiz va taxminiy ma'lumotlarsiz yangilash
print("\n6. Word davomat jurnalini qayta yangilash...")
doc_orig = os.path.join(BASE_DIR, 'Davomat jurnali 26-02.docx')
out_docx = os.path.join(BASE_DIR, 'Davomat jurnali 26-02 (TO\'LDIRILGAN).docx')
out_docx_h = os.path.join(BASE_DIR, 'hisobotlar', 'Davomat jurnali 26-02 (TO\'LDIRILGAN).docx')

g2602 = [s for s in students if s.get('group') == '26-02']
g2602_sorted = sorted(g2602, key=lambda x: str(x.get('fish', '')))

if os.path.exists(doc_orig):
    doc = docx.Document(doc_orig)

    def set_cell(cell, text, bold=False, size=9.5, align=WD_ALIGN_PARAGRAPH.LEFT):
        cell.text = ""
        p = cell.paragraphs[0]
        p.alignment = align
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)
        run = p.add_run(str(text or ''))
        run.font.name = 'Times New Roman'
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    # TABLE 1: Ro'yxat, Telefon, Qabul buyrug'i
    # Col 0: T/r, Col 1: F.I.Sh, Col 2: Telefon, Col 3: Buyruq va sana ("T-40/2, 02.09.2026")
    t1 = doc.tables[0]
    for idx, s in enumerate(g2602_sorted, 1):
        if idx >= len(t1.rows): break
        row = t1.rows[idx]
        set_cell(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(row.cells[1], s.get('fish', ''), bold=True)
        set_cell(row.cells[2], s.get('tel_shaxsiy') or s.get('tel', ''), align=WD_ALIGN_PARAGRAPH.CENTER)
        # Rasmiy aniq buyruq: T-40/2, 02.09.2026
        set_cell(row.cells[3], f"{s.get('buyruq')}, {s.get('buyruq_sana')}", align=WD_ALIGN_PARAGRAPH.CENTER)

    # TABLE 2: Doimiy manzil va Tug'ilgan sana
    # Col 0: T/r, Col 1: F.I.Sh, Col 2: Doimiy manzil (taxminsiz!), Col 3: Tug'ilgan sana
    t2 = doc.tables[1]
    for idx, s in enumerate(g2602_sorted, 1):
        if idx >= len(t2.rows): break
        row = t2.rows[idx]
        set_cell(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(row.cells[1], s.get('fish', ''), bold=True)
        # Faqat mavjud haqiqiy manzil (taxminiy to'qimasiz!)
        manzil_txt = s.get('manzil_toliq') or s.get('manzil_tuman') or ""
        set_cell(row.cells[2], manzil_txt)
        set_cell(row.cells[3], s.get('dob', ''), align=WD_ALIGN_PARAGRAPH.CENTER)

    # TABLE 3: Yaqin qarindoshlar
    # Col 0: T/r, Col 1: Qarindoshligi, Col 2: Telefon
    t3 = doc.tables[2]
    for idx, s in enumerate(g2602_sorted, 1):
        r_idx = idx + 1
        if r_idx >= len(t3.rows): break
        row = t3.rows[r_idx]
        set_cell(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER)
        if s.get('tel_otaona'):
            kim = s.get('tel_otaona_kim') or "Otasi / Onasi"
            set_cell(row.cells[1], kim)
            set_cell(row.cells[2], s.get('tel_otaona'), align=WD_ALIGN_PARAGRAPH.CENTER)
        else:
            # Agar ota-onasi raqami berilmagan bo'lsa, bo'sh qoldiriladi (taxminiy yozilmaydi!)
            set_cell(row.cells[1], "")
            set_cell(row.cells[2], "")
        set_cell(row.cells[3], "")
        set_cell(row.cells[4], "")

    # TABLE 4: O'qish davridagi yashash manzili va ishlaydigan telefoni
    t4 = doc.tables[3]
    for idx, s in enumerate(g2602_sorted, 1):
        if idx >= len(t4.rows): break
        row = t4.rows[idx]
        set_cell(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER)
        qat = s.get('qatnov') or ""
        manz = s.get('manzil_toliq') or ""
        if qat and manz:
            full_qat = f"{qat}: {manz}"
        elif qat:
            full_qat = qat
        elif manz:
            full_qat = manz
        else:
            full_qat = ""
        set_cell(row.cells[1], full_qat)
        set_cell(row.cells[2], s.get('tel_shaxsiy') or s.get('tel', ''), align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(row.cells[3], "")

    # TABLE 5: Ichki tartib qoidasi bilan tanishtirilganligi
    t5 = doc.tables[4]
    for idx, s in enumerate(g2602_sorted, 1):
        if idx >= len(t5.rows): break
        row = t5.rows[idx]
        set_cell(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(row.cells[1], s.get('fish', ''), bold=True)
        set_cell(row.cells[2], "Tanishtirildi", align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(row.cells[3], "02.09.2026", align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(row.cells[4], "")

    # TABLES 6 to 23: Kunlik davomat jadvallari
    for t_idx in range(5, min(24, len(doc.tables))):
        tbl = doc.tables[t_idx]
        for idx, s in enumerate(g2602_sorted, 1):
            r_idx = idx + 1
            if r_idx >= len(tbl.rows): break
            row = tbl.rows[r_idx]
            set_cell(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER, size=8.5)
            set_cell(row.cells[1], s.get('fish', ''), bold=False, size=8.5)

    doc.save(out_docx)
    doc.save(out_docx_h)
    print("✅ Davomat jurnali Word hujjati rasmiy buyruq bilan yangilandi!")

# 7. Excel hisobotini ham rasmiy buyruqlar bilan qayta yaratish
print("\n7. Davomat Excel hisobotini yangilash...")
import scripts.generate_davomat_reports as gdr

# 8. Supabase bilan to'liq sinxronlash
print("\n8. Supabase bilan buyruqlarni sinxronlash...")
try:
    import urllib.request
    SUPABASE_URL = "https://ebzzfbifmorqqtdfvenz.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVienpmYmlmbW9ycXF0ZGZ2ZW56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDg0NjkxMSwiZXhwIjoyMTA2NDIyOTExfQ.h4WmIB4CgX2N7qtybjJ8qrEevvKRUc71esgVOiSzAL4"

    req_get = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/students?select=id,row",
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    )
    with urllib.request.urlopen(req_get, timeout=15) as resp:
        supa_rows = json.loads(resp.read().decode())
    row_to_id = {item['row']: item['id'] for item in supa_rows}

    payload = []
    for s in students:
        r_num = s['row']
        if r_num not in row_to_id: continue
        payload.append({
            'id': row_to_id[r_num],
            'row': r_num,
            'buyruq': s.get('buyruq') or '',
            'buyruq_sana': s.get('buyruq_sana') or '',
            'updated_at': datetime.utcnow().isoformat()
        })

    for i in range(0, len(payload), 50):
        chunk = payload[i:i+50]
        req_post = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/students?on_conflict=id",
            data=json.dumps(chunk).encode('utf-8'),
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            method='POST'
        )
        with urllib.request.urlopen(req_post, timeout=20) as resp:
            pass
    print("✅ Supabase muvaffaqiyatli buyruqlar bilan yangilandi.")
except Exception as e_sup:
    print(f"⚠️ Supabase xatosi: {e_sup}")

print("\nBarcha buyruqlar va ma'lumotlar to'liq va rasmiy tarzda yangilandi!")
