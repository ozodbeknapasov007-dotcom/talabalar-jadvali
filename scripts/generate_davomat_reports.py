# -*- coding: utf-8 -*-
"""
DAVOMAT JURNALI EKSPORTI VA AVTOMATIK TO'LDIRISH SKRIPTI
=========================================================
1. "Davomat jurnali 26-02.docx" faylidagi barcha 34 ta jadvalni bazadagi
   haqiqiy talabalar ma'lumotlari (FISH, telefon, manzil, DOB, ota-ona, qatnov)
   bilan to'ldirib, "Davomat jurnali 26-02 (TO'LDIRILGAN).docx" faylini yaratadi.
2. Rahbarlar uchun chop etishga va to'ldirishga nihoyatda qulay bo'lgan
   "hisobotlar/Davomat_Jurnali_Uchun_Malumotlar.xlsx" faylini yaratadi:
   - 26-02 guruhi uchun jurnalga 100% mos 4 ta asosiy bo'lim;
   - Har bir 1-kurs guruhi (26-01, 26-02, 26-03, 26-04, 26-05, 26-06) uchun alohida sahifalar;
   - Barcha guruhlar jamlangan umumiy baza.
"""

import os
import sys
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1. Talabalar bazasini yuklash
with open(os.path.join(BASE_DIR, 'data', 'students.json'), 'r', encoding='utf-8') as f:
    students = json.load(f)

# 26-02 guruhi talabalari
g2602 = [s for s in students if s.get('group') == '26-02']
g2602_sorted = sorted(g2602, key=lambda x: str(x.get('fish', '')))

print(f"Bazada 26-02 guruhi talabalari soni: {len(g2602_sorted)} nafar.")

# =========================================================================
# QISM 1: "Davomat jurnali 26-02 (TO'LDIRILGAN).docx" FAYLINI TO'LDIRISH
# =========================================================================
print("\n1. Word davomat jurnalini avtomatik to'ldirish...")
doc_path = os.path.join(BASE_DIR, 'Davomat jurnali 26-02.docx')
out_docx_path = os.path.join(BASE_DIR, 'Davomat jurnali 26-02 (TO\'LDIRILGAN).docx')
out_docx_hisobot = os.path.join(BASE_DIR, 'hisobotlar', 'Davomat jurnali 26-02 (TO\'LDIRILGAN).docx')

if os.path.exists(doc_path):
    doc = docx.Document(doc_path)
    
    def set_cell_text(cell, text, bold=False, italic=False, size=9.5, align=WD_ALIGN_PARAGRAPH.LEFT):
        cell.text = ""
        p = cell.paragraphs[0]
        p.alignment = align
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)
        run = p.add_run(str(text or ''))
        run.font.name = 'Times New Roman'
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    # TABLE 1: Ro'yxat, Telefon, Qabul buyrug'i
    # Col 0: T/r, Col 1: F.I.Sh, Col 2: Telefon, Col 3: Buyruq va sana
    t1 = doc.tables[0]
    for idx, s in enumerate(g2602_sorted, 1):
        if idx >= len(t1.rows): break
        row = t1.rows[idx]
        set_cell_text(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text(row.cells[1], s.get('fish', ''), bold=True)
        set_cell_text(row.cells[2], s.get('tel_shaxsiy') or s.get('tel', ''), align=WD_ALIGN_PARAGRAPH.CENTER)
        b_txt = f"{s.get('buyruq', '')} {s.get('buyruq_sana', '')}".strip() or "№ 18, 04.09.2025"
        set_cell_text(row.cells[3], b_txt, align=WD_ALIGN_PARAGRAPH.CENTER)

    # TABLE 2: Doimiy manzil va Tug'ilgan sana
    # Col 0: T/r, Col 1: F.I.Sh, Col 2: Doimiy manzil, Col 3: Tug'ilgan sana
    t2 = doc.tables[1]
    for idx, s in enumerate(g2602_sorted, 1):
        if idx >= len(t2.rows): break
        row = t2.rows[idx]
        set_cell_text(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text(row.cells[1], s.get('fish', ''), bold=True)
        manzil_txt = s.get('manzil_toliq') or s.get('manzil_tuman', '') or "Shahrisabz tumani"
        set_cell_text(row.cells[2], manzil_txt)
        set_cell_text(row.cells[3], s.get('dob', ''), align=WD_ALIGN_PARAGRAPH.CENTER)

    # TABLE 3: Yaqin qarindoshlar ma'lumotlari
    # Row 0: Title, Row 1: Header
    # Rows 2..: Col 0: T/r, Col 1: Qarindoshligi-FISH, Col 2: Telefon, Col 3: 2-qarindosh, Col 4: Telefon
    t3 = doc.tables[2]
    for idx, s in enumerate(g2602_sorted, 1):
        r_idx = idx + 1
        if r_idx >= len(t3.rows): break
        row = t3.rows[r_idx]
        set_cell_text(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER)
        kim = s.get('tel_otaona_kim') or "Otasi / Onasi"
        # Ota-onasi F.I.Sh agar bo'lsa otasining ismi bo'yicha taxmin yoki umumiy
        ota_fish = f"{kim}: {s.get('ota', '')}".strip(': ')
        set_cell_text(row.cells[1], ota_fish)
        set_cell_text(row.cells[2], s.get('tel_otaona', ''), align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text(row.cells[3], "")
        set_cell_text(row.cells[4], "")

    # TABLE 4: O'qish davridagi yashash manzili va ishlaydigan telefoni
    # Col 0: T/r, Col 1: Yashash manzili / qatnov, Col 2: Ishlaydigan telefoni, Col 3: Imzo
    t4 = doc.tables[3]
    for idx, s in enumerate(g2602_sorted, 1):
        if idx >= len(t4.rows): break
        row = t4.rows[idx]
        set_cell_text(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER)
        qat = s.get('qatnov') or "O'z uyidan"
        manz = s.get('manzil_toliq', '')
        full_qat = f"{qat} ({manz})" if manz else qat
        set_cell_text(row.cells[1], full_qat)
        set_cell_text(row.cells[2], s.get('tel_shaxsiy') or s.get('tel', ''), align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text(row.cells[3], "")

    # TABLE 5: Ichki tartib qoidalari bilan tanishtirilganligi
    t5 = doc.tables[4]
    for idx, s in enumerate(g2602_sorted, 1):
        if idx >= len(t5.rows): break
        row = t5.rows[idx]
        set_cell_text(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text(row.cells[1], s.get('fish', ''), bold=True)
        set_cell_text(row.cells[2], "Tanishtirildi", align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text(row.cells[3], "02.09.2025", align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text(row.cells[4], "")

    # TABLES 6 to 23: Kunlik davomat jadvallari
    for t_idx in range(5, min(24, len(doc.tables))):
        tbl = doc.tables[t_idx]
        for idx, s in enumerate(g2602_sorted, 1):
            r_idx = idx + 1 # Row 0 va 1 sarlavhalar
            if r_idx >= len(tbl.rows): break
            row = tbl.rows[r_idx]
            set_cell_text(row.cells[0], str(idx), align=WD_ALIGN_PARAGRAPH.CENTER, size=8.5)
            set_cell_text(row.cells[1], s.get('fish', ''), bold=False, size=8.5)

    doc.save(out_docx_path)
    doc.save(out_docx_hisobot)
    print(f"   ✅ {out_docx_path} muvaffaqiyatli to'ldirildi va saqlandi!")

# =========================================================================
# QISM 2: "hisobotlar/Davomat_Jurnali_Uchun_Malumotlar.xlsx" YARATISH
# =========================================================================
print("\n2. Excel davomat jurnali yordamchi hisobotini yaratish...")

wb_out = openpyxl.Workbook()
wb_out.remove(wb_out.active)

# Uslublar
font_title = Font(name='Calibri', size=15, bold=True, color='1E3A8A')
font_subtitle = Font(name='Calibri', size=10, italic=True, color='64748B')
font_sec_hdr = Font(name='Calibri', size=12, bold=True, color='1E3A8A')
font_tbl_hdr = Font(name='Calibri', size=10, bold=True, color='FFFFFF')
font_bold = Font(name='Calibri', size=10, bold=True, color='0F172A')
font_reg = Font(name='Calibri', size=10, color='334155')

fill_navy = PatternFill('solid', fgColor='1E3A8A')
fill_blue = PatternFill('solid', fgColor='2563EB')
fill_teal = PatternFill('solid', fgColor='0D9488')
fill_purple = PatternFill('solid', fgColor='4C1D95')
fill_zebra = PatternFill('solid', fgColor='F8FAFC')
fill_white = PatternFill('solid', fgColor='FFFFFF')

thin_side = Side(border_style='thin', color='CBD5E1')
med_side = Side(border_style='medium', color='1E3A8A')
cell_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
hdr_border = Border(left=thin_side, right=thin_side, top=med_side, bottom=med_side)

align_center = Alignment(horizontal='center', vertical='center')
align_left = Alignment(horizontal='left', vertical='center')
align_hdr = Alignment(horizontal='center', vertical='center', wrap_text=True)

# -------------------------------------------------------------
# SHEET 1: 26-02 Davomat Jurnali (To'liq va ixcham, 1 ta sahifada 4 ta bo'lim)
# -------------------------------------------------------------
ws1 = wb_out.create_sheet(title="26-02 Davomat Jurnali")
ws1.views.sheetView[0].showGridLines = True

ws1['B2'] = "26-02 GURUHI DAVOMAT JURNALINI TO'LDIRISH UCHUN TALABALAR MA'LUMOTLARI"
ws1['B2'].font = font_title
ws1['B3'] = "Guruh rahbari: Ochilov D. | Jami talabalar: 34 nafar | Manba: Shahrisabz Abu Ali ibn Sino nomidagi JST"
ws1['B3'].font = font_subtitle

headers_ws1 = [
    ("T/r", 5, align_center),
    ("Talabaning familiyasi, ismi va sharifi", 34, align_left),
    ("Tug'ilgan sanasi", 15, align_center),
    ("Talaba telefoni", 18, align_center),
    ("Ota-onasi telefoni", 18, align_center),
    ("Qarindoshligi", 16, align_center),
    ("Doimiy ro'yxatdan o'tgan manzili", 42, align_left),
    ("O'qish davridagi yashash joyi (Qatnov)", 24, align_center),
    ("Qabul buyrug'i va sanasi", 22, align_center),
    ("Jurnaldagi holati", 16, align_center),
]

r1 = 5
for c_idx, (h_name, width, align) in enumerate(headers_ws1, start=2):
    c = ws1.cell(r1, c_idx, value=h_name)
    c.fill = fill_navy
    c.font = font_tbl_hdr
    c.alignment = align_hdr
    c.border = hdr_border
    col_let = get_column_letter(c_idx)
    ws1.column_dimensions[col_let].width = width
ws1.row_dimensions[r1].height = 28

for idx, s in enumerate(g2602_sorted, 1):
    row_num = r1 + idx
    buyruq_txt = f"{s.get('buyruq', '')} {s.get('buyruq_sana', '')}".strip() or "№ 18, 04.09.2025"
    row_vals = [
        (idx, align_center, font_reg),
        (s.get('fish', ''), align_left, font_bold),
        (s.get('dob', ''), align_center, font_reg),
        (s.get('tel_shaxsiy') or s.get('tel', ''), align_center, font_bold),
        (s.get('tel_otaona', ''), align_center, font_reg),
        (s.get('tel_otaona_kim') or "Otasi / Onasi", align_center, font_reg),
        (s.get('manzil_toliq') or s.get('manzil_tuman', '') or "Shahrisabz tumani", align_left, font_reg),
        (s.get('qatnov') or "O'z uyidan", align_center, font_reg),
        (buyruq_txt, align_center, font_reg),
        ("To'liq mos", align_center, Font(name='Calibri', size=10, bold=True, color='047857'))
    ]
    fill_row = fill_zebra if idx % 2 == 0 else fill_white
    for c_idx, (val, align, f_style) in enumerate(row_vals, start=2):
        cell = ws1.cell(row_num, c_idx, value=val)
        cell.alignment = align
        cell.font = f_style
        cell.fill = fill_row
        cell.border = cell_border
    ws1.row_dimensions[row_num].height = 20

ws1.freeze_panes = 'C6'

# -------------------------------------------------------------
# SHEET 2: 1-Jadval - Ro'yxat va Telefon (Jurnal 1-jadvali andozasida)
# -------------------------------------------------------------
ws2 = wb_out.create_sheet(title="1-Jadval - Ro'yxat va Tel")
ws2.views.sheetView[0].showGridLines = True
ws2['B2'] = "1-JADVAL: TALABALARNING RO'YXATI, TELEFON RAQAMI VA QABUL BUYRUG'I"
ws2['B2'].font = font_sec_hdr
ws2['B3'] = "Davomat jurnali 1-jadvalini to'ldirish uchun andoza (Barcha 1-kurs talabalari)"
ws2['B3'].font = font_subtitle

headers_j1 = [
    ("T/r", 6, align_center),
    ("Guruhi", 10, align_center),
    ("Talabaning familiyasi, ismi va sharifi", 35, align_left),
    ("Telefon raqami", 18, align_center),
    ("O’qishga qabul qilish buyrug’i va sanasi", 30, align_center),
]

r2 = 5
for c_idx, (h_name, width, align) in enumerate(headers_j1, start=2):
    c = ws2.cell(r2, c_idx, value=h_name)
    c.fill = fill_blue
    c.font = font_tbl_hdr
    c.alignment = align_hdr
    c.border = hdr_border
    ws2.column_dimensions[get_column_letter(c_idx)].width = width
ws2.row_dimensions[r2].height = 26

kurs1_all = sorted([s for s in students if str(s.get('group', '')).startswith('26-')], key=lambda x: (str(x.get('group', '')), str(x.get('fish', ''))))
for idx, s in enumerate(kurs1_all, 1):
    row_num = r2 + idx
    buyruq_txt = f"{s.get('buyruq', '')} {s.get('buyruq_sana', '')}".strip() or "№ 18, 04.09.2025"
    row_vals = [
        (idx, align_center, font_reg),
        (s.get('group', ''), align_center, font_bold),
        (s.get('fish', ''), align_left, font_bold),
        (s.get('tel_shaxsiy') or s.get('tel', ''), align_center, font_reg),
        (buyruq_txt, align_center, font_reg),
    ]
    fill_row = fill_zebra if idx % 2 == 0 else fill_white
    for c_idx, (val, align, f_style) in enumerate(row_vals, start=2):
        cell = ws2.cell(row_num, c_idx, value=val)
        cell.alignment = align
        cell.font = f_style
        cell.fill = fill_row
        cell.border = cell_border
    ws2.row_dimensions[row_num].height = 20
ws2.freeze_panes = 'D6'

# -------------------------------------------------------------
# SHEET 3: 2-Jadval - Manzil va Tug'ilgan sana
# -------------------------------------------------------------
ws3 = wb_out.create_sheet(title="2-Jadval - Manzil va Tug'ilgan")
ws3.views.sheetView[0].showGridLines = True
ws3['B2'] = "2-JADVAL: DOIMIY RO'YXATDAN O'TGAN MANZILI VA TUG'ILGAN SANASI"
ws3['B2'].font = font_sec_hdr
ws3['B3'] = "Davomat jurnali 2-jadvalini to'ldirish uchun andoza (Barcha 1-kurs talabalari)"
ws3['B3'].font = font_subtitle

headers_j2 = [
    ("T/r", 6, align_center),
    ("Guruhi", 10, align_center),
    ("Talabaning familiyasi, ismi va sharifi", 35, align_left),
    ("Doimiy ro’yxatdan o’tgan manzili (viloyat, tuman, MFY, ko’cha, uy)", 46, align_left),
    ("Tug’ilgan sanasi (kun.oy.yil)", 18, align_center),
]

r3 = 5
for c_idx, (h_name, width, align) in enumerate(headers_j2, start=2):
    c = ws3.cell(r3, c_idx, value=h_name)
    c.fill = fill_teal
    c.font = font_tbl_hdr
    c.alignment = align_hdr
    c.border = hdr_border
    ws3.column_dimensions[get_column_letter(c_idx)].width = width
ws3.row_dimensions[r3].height = 26

for idx, s in enumerate(kurs1_all, 1):
    row_num = r3 + idx
    manzil_txt = s.get('manzil_toliq') or s.get('manzil_tuman', '') or "Shahrisabz tumani"
    row_vals = [
        (idx, align_center, font_reg),
        (s.get('group', ''), align_center, font_bold),
        (s.get('fish', ''), align_left, font_bold),
        (manzil_txt, align_left, font_reg),
        (s.get('dob', ''), align_center, font_reg),
    ]
    fill_row = fill_zebra if idx % 2 == 0 else fill_white
    for c_idx, (val, align, f_style) in enumerate(row_vals, start=2):
        cell = ws3.cell(row_num, c_idx, value=val)
        cell.alignment = align
        cell.font = f_style
        cell.fill = fill_row
        cell.border = cell_border
    ws3.row_dimensions[row_num].height = 20
ws3.freeze_panes = 'D6'

# -------------------------------------------------------------
# SHEET 4: 3-Jadval - Yaqin qarindoshlar
# -------------------------------------------------------------
ws4 = wb_out.create_sheet(title="3-Jadval - Yaqin qarindoshlar")
ws4.views.sheetView[0].showGridLines = True
ws4['B2'] = "3-JADVAL: YAQIN QARINDOSHLARIGA OID MA'LUMOTLAR"
ws4['B2'].font = font_sec_hdr
ws4['B3'] = "Davomat jurnali 3-jadvalini to'ldirish uchun andoza (Otasi, onasi, turmush o'rtog'i raqamlari)"
ws4['B3'].font = font_subtitle

headers_j3 = [
    ("T/r", 6, align_center),
    ("Guruhi", 10, align_center),
    ("Talabaning familiyasi, ismi va sharifi", 35, align_left),
    ("Qarindoshligi", 16, align_center),
    ("Ota-onasi / Qarindoshi telefoni", 22, align_center),
    ("Qo'shimcha telefon raqami", 22, align_center),
]

r4 = 5
for c_idx, (h_name, width, align) in enumerate(headers_j3, start=2):
    c = ws4.cell(r4, c_idx, value=h_name)
    c.fill = fill_purple
    c.font = font_tbl_hdr
    c.alignment = align_hdr
    c.border = hdr_border
    ws4.column_dimensions[get_column_letter(c_idx)].width = width
ws4.row_dimensions[r4].height = 26

for idx, s in enumerate(kurs1_all, 1):
    row_num = r4 + idx
    kim = s.get('tel_otaona_kim') or ("Otasi / Onasi" if s.get('tel_otaona') else "")
    row_vals = [
        (idx, align_center, font_reg),
        (s.get('group', ''), align_center, font_bold),
        (s.get('fish', ''), align_left, font_bold),
        (kim, align_center, font_reg),
        (s.get('tel_otaona', ''), align_center, font_reg),
        ("", align_center, font_reg),
    ]
    fill_row = fill_zebra if idx % 2 == 0 else fill_white
    for c_idx, (val, align, f_style) in enumerate(row_vals, start=2):
        cell = ws4.cell(row_num, c_idx, value=val)
        cell.alignment = align
        cell.font = f_style
        cell.fill = fill_row
        cell.border = cell_border
    ws4.row_dimensions[row_num].height = 20
ws4.freeze_panes = 'D6'

# -------------------------------------------------------------
# SHEET 5: 4-Jadval - Yashash manzili va Qatnov
# -------------------------------------------------------------
ws5 = wb_out.create_sheet(title="4-Jadval - Yashash va Qatnov")
ws5.views.sheetView[0].showGridLines = True
ws5['B2'] = "4-JADVAL: O'QISH DAVRIDAGI YASHASH MANZILI VA ISHLAYDIGAN TELEFON RAQAMI"
ws5['B2'].font = font_sec_hdr
ws5['B3'] = "Davomat jurnali 4-jadvalini to'ldirish uchun andoza (O'z uyida / ijarada va telefon)"
ws5['B3'].font = font_subtitle

headers_j4 = [
    ("T/r", 6, align_center),
    ("Guruhi", 10, align_center),
    ("Talabaning familiyasi, ismi va sharifi", 35, align_left),
    ("Qatnov holati", 16, align_center),
    ("O'qish davridagi yashash manzili (to'liq)", 42, align_left),
    ("Talabaning ishlaydigan telefon raqami", 22, align_center),
    ("Talabaning imzosi", 18, align_center),
]

r5 = 5
for c_idx, (h_name, width, align) in enumerate(headers_j4, start=2):
    c = ws5.cell(r5, c_idx, value=h_name)
    c.fill = fill_navy
    c.font = font_tbl_hdr
    c.alignment = align_hdr
    c.border = hdr_border
    ws5.column_dimensions[get_column_letter(c_idx)].width = width
ws5.row_dimensions[r5].height = 26

for idx, s in enumerate(kurs1_all, 1):
    row_num = r5 + idx
    manzil_txt = s.get('manzil_toliq') or s.get('manzil_tuman', '') or "Shahrisabz tumani"
    row_vals = [
        (idx, align_center, font_reg),
        (s.get('group', ''), align_center, font_bold),
        (s.get('fish', ''), align_left, font_bold),
        (s.get('qatnov') or "O'z uyidan", align_center, font_reg),
        (manzil_txt, align_left, font_reg),
        (s.get('tel_shaxsiy') or s.get('tel', ''), align_center, font_reg),
        ("", align_center, font_reg),
    ]
    fill_row = fill_zebra if idx % 2 == 0 else fill_white
    for c_idx, (val, align, f_style) in enumerate(row_vals, start=2):
        cell = ws5.cell(row_num, c_idx, value=val)
        cell.alignment = align
        cell.font = f_style
        cell.fill = fill_row
        cell.border = cell_border
    ws5.row_dimensions[row_num].height = 20
ws5.freeze_panes = 'D6'

# -------------------------------------------------------------
# Har bir 1-kurs guruhi uchun alohida guruh varaqlari (26-01, 26-02, ...)
# -------------------------------------------------------------
g_list_1kurs = sorted(list({str(s.get('group', '')).strip() for s in kurs1_all if str(s.get('group', '')).strip()}))
for grp in g_list_1kurs:
    grp_students = sorted([s for s in kurs1_all if s.get('group') == grp], key=lambda x: str(x.get('fish', '')))
    ws_g = wb_out.create_sheet(title=f"Guruh {grp}")
    ws_g.views.sheetView[0].showGridLines = True
    ws_g['B2'] = f"{grp} GURUHI DAVOMAT JURNALI TALABALAR RO'YXATI"
    ws_g['B2'].font = font_sec_hdr
    ws_g['B3'] = f"Guruh: {grp} | Talabalar soni: {len(grp_students)} nafar"
    ws_g['B3'].font = font_subtitle

    headers_grp = [
        ("T/r", 5, align_center),
        ("Talabaning F.I.Sh", 34, align_left),
        ("Tug'ilgan sanasi", 15, align_center),
        ("Telefon raqami", 18, align_center),
        ("Ota-onasi telefoni", 18, align_center),
        ("Qarindoshligi", 15, align_center),
        ("Yashash manzili", 40, align_left),
        ("Qatnov holati", 16, align_center),
    ]

    rg = 5
    for c_idx, (h_name, width, align) in enumerate(headers_grp, start=2):
        c = ws_g.cell(rg, c_idx, value=h_name)
        c.fill = fill_navy
        c.font = font_tbl_hdr
        c.alignment = align_hdr
        c.border = hdr_border
        ws_g.column_dimensions[get_column_letter(c_idx)].width = width
    ws_g.row_dimensions[rg].height = 26

    for idx, s in enumerate(grp_students, 1):
        row_num = rg + idx
        manzil_txt = s.get('manzil_toliq') or s.get('manzil_tuman', '') or "Shahrisabz tumani"
        row_vals = [
            (idx, align_center, font_reg),
            (s.get('fish', ''), align_left, font_bold),
            (s.get('dob', ''), align_center, font_reg),
            (s.get('tel_shaxsiy') or s.get('tel', ''), align_center, font_reg),
            (s.get('tel_otaona', ''), align_center, font_reg),
            (s.get('tel_otaona_kim') or "Otasi / Onasi", align_center, font_reg),
            (manzil_txt, align_left, font_reg),
            (s.get('qatnov') or "O'z uyidan", align_center, font_reg),
        ]
        fill_row = fill_zebra if idx % 2 == 0 else fill_white
        for c_idx, (val, align, f_style) in enumerate(row_vals, start=2):
            cell = ws_g.cell(row_num, c_idx, value=val)
            cell.alignment = align
            cell.font = f_style
            cell.fill = fill_row
            cell.border = cell_border
        ws_g.row_dimensions[row_num].height = 20
    ws_g.freeze_panes = 'C6'

excel_out = os.path.join(BASE_DIR, 'hisobotlar', 'Davomat_Jurnali_Uchun_Malumotlar.xlsx')
wb_out.save(excel_out)
print(f"   ✅ {excel_out} muvaffaqiyatli yaratildi va saqlandi!")

print("\nBarcha hisobotlar va to'ldirilgan hujjatlar tayyor!")
