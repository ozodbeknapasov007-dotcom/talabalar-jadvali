# -*- coding: utf-8 -*-
"""
TO'LIQ YANGILANGAN INTERAKTIV HTML + EXCEL GENERATOR (V4 - EKRANGA TO'LIQ SIG'ADIGAN ULTRA-IXCHAM DIZAYN)
========================================================================================================
- Barcha ma'lumotlar kompyuter va noutbuk ekraniga 100% GORIZONTAL SCROLLSIZ TO'LIQ SIG'ADI.
- "Telefon" ustuni foydalanuvchi talabiga ko'ra butunlay olib tashlandi.
- Dublikat ustunlar (To'liq pasport + alohida seriya/raqam) bitta chiroyli va ixcham ustunga birlashtirildi.
- Shartnoma raqami bo'yicha to'liq tartiblangan (1, 2, 3... 196).
- Har 3 yosh oralig'ida dinamik yosh filtrlari (15-17, 18-20, 21-23, 24-26, 27-29, 30-32, 33+).
- Excel yuklab olish tugmasi (Telefon ustunisiz, toza formatda).
"""

import openpyxl
import re
import sys
import html as html_lib
import os
import urllib.parse
import json
from openpyxl.styles import Font, PatternFill, Alignment

sys.stdout.reconfigure(encoding='utf-8')

# ═══════════════════════════════════════════════════════
# YORDAMCHI FUNKSIYALAR
# ═══════════════════════════════════════════════════════

def split_passport(val):
    if not val:
        return ('-', '-', '-')
    val = str(val).strip()
    if 'mavjud emas' in val.lower() or 'topilmadi' in val.lower():
        return ('-', '-', '-')
    m = re.match(r'^([A-Za-z]{2})\s*(\d{7,8})$', val)
    if m:
        ser = m.group(1).upper()
        num = m.group(2)
        tur = 'ID-karta' if ser in {'AD', 'AE', 'AF', 'AG', 'AH'} else 'Biometrik pasport'
        return (tur, ser, num)
    return ('-', val, '-')

def split_cert(val, edu_type=""):
    if not val:
        return ('-', '-', '-')
    val = str(val).strip()
    if 'mavjud emas' in val.lower() or 'topilmadi' in val.lower():
        return ('-', '-', '-')

    m = re.match(r'^([A-Za-z\'-]{1,6})\s*[^\d]*(\d{5,10})$', val)
    if not m:
        m2 = re.match(r'^(\d{6,10})$', val.strip())
        if m2:
            return ('Shahodatnoma', '-', m2.group(1))
        return ('-', val, '-')
    seriya = m.group(1).upper()
    raqam  = m.group(2)

    if seriya in {'K', 'NQ', 'NC', 'NE', 'NG', 'NK'}:
        seriya = 'K'
        tur = 'Diplom'
    elif seriya in {'P', 'PT', 'LO', 'OF'}:
        seriya = 'PT'
        tur = 'Diplom'
    elif seriya in {'IM'}:
        seriya = 'IM'
        tur = 'Diplom'
    elif seriya in {'T', 'TK', 'TB', 'TC', 'TD', 'TE'}:
        seriya = 'T'
        tur = 'Diplom'
    elif seriya in {'B', 'BK', 'BA', 'BD', 'BI', 'BB', 'BC'}:
        seriya = 'B'
        tur = 'Diplom'
    elif seriya in {'M', 'MA', 'MB', 'MC', 'MD', 'MG'}:
        seriya = 'M'
        tur = 'Diplom'
    elif seriya in {'AT', 'AK', 'AL', 'AM'}:
        seriya = 'AT'
        tur = 'Attestat'
    elif seriya in {'UM', 'DB', "O'R-SH", "OR-SH"} or 'maktab' in edu_type.lower():
        tur = 'Shahodatnoma'
    elif any(k in edu_type.lower() for k in ['kollej', 'texnikum', 'oliy']):
        tur = 'Diplom'
    else:
        tur = 'Shahodatnoma'
    return (tur, seriya, raqam)

def calc_age(dob_str):
    if not dob_str or dob_str in ['-', 'None', '']:
        return (None, "noma'lum")
    m = re.search(r'\b(\d{2})\.(\d{2})\.(\d{4})\b', str(dob_str))
    if not m:
        return (None, "noma'lum")
    y = int(m.group(3))
    age = 2026 - y
    if age < 0 or age > 90:
        return (None, "noma'lum")
    
    if 15 <= age <= 17: grp = "15-17"
    elif 18 <= age <= 20: grp = "18-20"
    elif 21 <= age <= 23: grp = "21-23"
    elif 24 <= age <= 26: grp = "24-26"
    elif 27 <= age <= 29: grp = "27-29"
    elif 30 <= age <= 32: grp = "30-32"
    elif age >= 33: grp = "33+"
    else: grp = "15-17"
    return (age, grp)

def parse_shnum(val):
    if val is None or str(val).strip() in ['-', '', 'None', 'nan']:
        return (999999, '')
    s = str(val).strip()
    m = re.search(r'\d+', s)
    if m:
        return (int(m.group(0)), s)
    return (999998, s)

# ═══════════════════════════════════════════════════════
# EXCEL O'QISH VA YANGILASH
# ═══════════════════════════════════════════════════════

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_EXCEL  = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
OUTPUT_EXCEL = os.path.join(BASE_DIR, 'Talabalar_Yangilangan_Royxat.xlsx')
OUTPUT_HTML  = os.path.join(BASE_DIR, 'natijalar_hisoboti.html')

wb_in = openpyxl.load_workbook(INPUT_EXCEL)
ws_in = wb_in.active
headers = [ws_in.cell(row=1, column=c).value for c in range(1, ws_in.max_column + 1)]

def hcol(keyword):
    for i, h in enumerate(headers):
        if h and keyword.lower() in str(h).lower():
            return i + 1
    return None

c_tr      = 1
c_ism     = 2
c_yonalis = hcol("Yo'nalishi")
c_tolov   = hcol("lov statusi")
c_shnum   = hcol("Shartnoma raqami")
c_shsan   = hcol("Sanasi")
c_ota     = hcol("Otasining ismi")
c_fish    = hcol("liq F.I.SH")
c_pfio    = hcol("Passport bo'yicha")
c_pass    = hcol("Passport / ID")
c_pinfl   = hcol("JSHSHIR")
c_passber = hcol("berilgan sanasi") or hcol("berilgan")
c_dob     = hcol("tug'ilgan sanasi") or hcol("tug'ilgan") or hcol("tugi'lgan")
c_psrc    = hcol("manbasi")
c_cfio    = hcol("Shahodatnoma bo'yicha")
c_cert    = hcol("Diplom Seriyasi") or hcol("Seriyasi va Raqami") or hcol("Shahodatnoma / Diplom")
c_cqr     = hcol("QR") or hcol("Havola")
c_maktab  = hcol("o'qish joyi") or hcol("muassasasi") or hcol("maktab")
c_edutur  = hcol("turi")
c_yil     = hcol("Bitirgan yili") or hcol("yili")
c_docx    = hcol("docx") or hcol("fayl")
c_status  = hcol("holat") or hcol("Status")
c_note    = hcol("Izoh") or hcol("Notes")

raw_rows = []
for r in range(2, ws_in.max_row + 1):
    ism = ws_in.cell(row=r, column=c_ism).value
    if not ism or not str(ism).strip():
        continue
    
    shnum_val = ws_in.cell(row=r, column=c_shnum).value if c_shnum else '-'
    pval = str(ws_in.cell(row=r, column=c_pass).value or '').strip() if c_pass else ''
    etyp = str(ws_in.cell(row=r, column=c_edutur).value or '').strip() if c_edutur else ''
    cval = str(ws_in.cell(row=r, column=c_cert).value or '').strip() if c_cert else ''
    
    p_tur, p_ser, p_num = split_passport(pval)
    c_tur, c_ser, c_num = split_cert(cval, etyp)
    
    dob_val = str(ws_in.cell(row=r, column=c_dob).value or '').strip() if c_dob else ''
    age, age_grp = calc_age(dob_val)
    
    # DOCX FAYLNI files/ PAPKASIDAN 100% QAT'IY (STRICT) QIDIRISH
    all_files_list = os.listdir('files') if os.path.exists('files') else []
    docx_fname = '-'
    docx_path = ''
    
    sh_str = str(shnum_val or '').strip()
    ism_clean = str(ism or '').strip().lower().replace("'", "").replace("‘", "").replace("’", "")
    parts = [p for p in ism_clean.split() if len(p) >= 3]
    
    # 1. Ham Ism, ham Shartnoma raqami mos kelsa
    if sh_str and sh_str not in ['-', '', 'None'] and parts:
        for f in all_files_list:
            f_low = f.lower().replace("'", "").replace("‘", "").replace("’", "")
            if f_low.endswith('.docx') and parts[0] in f_low:
                if re.search(rf'[\s_Nn#]{re.escape(sh_str)}(?:[\s_]|\.docx)', f_low) or f_low.endswith(f" {sh_str}.docx"):
                    docx_fname = f
                    docx_path = os.path.join('files', f)
                    break
                
    # 2. Familiya VA Ismi (ikkalasi birgalikda) to'liq mos kelsa
    if not docx_path and len(parts) >= 2:
        for f in all_files_list:
            f_low = f.lower().replace("'", "").replace("‘", "").replace("’", "")
            if f_low.endswith('.docx') and parts[0] in f_low and parts[1] in f_low:
                docx_fname = f
                docx_path = os.path.join('files', f)
                break

    row_dict = {
        "orig_row": r,
        "ism": str(ism).strip(),
        "yonalis": str(ws_in.cell(row=r, column=c_yonalis).value or '-').strip() if c_yonalis else '-',
        "tolov": str(ws_in.cell(row=r, column=c_tolov).value or '-').strip() if c_tolov else '-',
        "shnum": str(shnum_val or '-').strip(),
        "shsan": str(ws_in.cell(row=r, column=c_shsan).value or '-').strip() if c_shsan else '-',
        "ota": str(ws_in.cell(row=r, column=c_ota).value or '-').strip() if c_ota else '-',
        "fish": str(ws_in.cell(row=r, column=c_fish).value or '-').strip() if c_fish else '-',
        "pfio": str(ws_in.cell(row=r, column=c_pfio).value or '-').strip() if c_pfio else '-',
        "pass_full": pval if pval else '-',
        "pass_tur": p_tur,
        "pass_ser": p_ser,
        "pass_num": p_num,
        "pinfl": str(ws_in.cell(row=r, column=c_pinfl).value or '-').strip() if c_pinfl else '-',
        "passber": str(ws_in.cell(row=r, column=c_passber).value or '-').strip() if c_passber else '-',
        "dob": dob_val if dob_val else '-',
        "age": age,
        "age_grp": age_grp,
        "psrc": str(ws_in.cell(row=r, column=c_psrc).value or '-').strip() if c_psrc else '-',
        "cfio": str(ws_in.cell(row=r, column=c_cfio).value or '-').strip() if c_cfio else '-',
        "cert_full": cval if cval else '-',
        "cert_tur": c_tur,
        "cert_ser": c_ser,
        "cert_num": c_num,
        "cqr": str(ws_in.cell(row=r, column=c_cqr).value or '-').strip() if c_cqr else '-',
        "maktab": str(ws_in.cell(row=r, column=c_maktab).value or '-').strip() if c_maktab else '-',
        "edutur": etyp if etyp else '-',
        "yil": str(ws_in.cell(row=r, column=c_yil).value or '-').strip() if c_yil else '-',
        "docx": docx_fname,
        "docx_path": docx_path,
        "status": str(ws_in.cell(row=r, column=c_status).value or 'TOPILDI').strip() if c_status else 'TOPILDI',
        "note": str(ws_in.cell(row=r, column=c_note).value or '-').strip() if c_note else '-',
    }
    raw_rows.append(row_dict)

# SHARTNOMA RAQAMI BO'YICHA TARTIBLASH (1, 2, 3... 196)
raw_rows.sort(key=lambda x: parse_shnum(x['shnum']))

# ═══════════════════════════════════════════════════════
# EXCEL YARATISH (TELEFONSIZ, TOZA VA IXCHAM 28 USTUN)
# ═══════════════════════════════════════════════════════

wb_out = openpyxl.Workbook()
ws_out = wb_out.active
ws_out.title = "Talabalar"

excel_cols = [
    ("T/R", 6),
    ("Talaba F.I.SH", 25),
    ("Yo'nalishi", 22),
    ("To'lov statusi", 14),
    ("Shartnoma raqami", 16),
    ("Sanasi", 12),
    ("Otasining ismi", 18),
    ("To'liq F.I.SH", 28),
    ("Pasport / ID (To'liq)", 18),
    ("Hujjat turi", 16),
    ("Pasport seriyasi", 14),
    ("Pasport raqami", 14),
    ("JSHSHIR (PINFL)", 18),
    ("Tug'ilgan sana", 14),
    ("Pasport berilgan sana", 18),
    ("Ta'lim hujjati (To'liq)", 18),
    ("Ta'lim hujjati turi", 16),
    ("Ta'lim hujjati seriyasi", 16),
    ("Ta'lim hujjati raqami", 16),
    ("Tugatgan muassasasi", 35),
    ("Muassasa turi", 18),
    ("Bitirgan yili", 12),
    ("QR Havola", 15),
    ("Word shartnoma (.docx)", 25),
    ("Holat (Status)", 12),
    ("Izoh / Eslatmalar", 30)
]

for col_idx, (col_name, col_w) in enumerate(excel_cols, 1):
    cell = ws_out.cell(row=1, column=col_idx, value=col_name)
    cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    if "Pasport" in col_name or "Hujjat turi" in col_name:
        cell.fill = PatternFill("solid", fgColor="2E75B6")
    elif "Ta'lim" in col_name:
        cell.fill = PatternFill("solid", fgColor="375623")
    else:
        cell.fill = PatternFill("solid", fgColor="1F497D")
    ws_out.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = col_w

for new_tr, r_data in enumerate(raw_rows, 1):
    r_idx = new_tr + 1
    ws_out.cell(row=r_idx, column=1, value=new_tr)
    ws_out.cell(row=r_idx, column=2, value=r_data['ism'])
    ws_out.cell(row=r_idx, column=3, value=r_data['yonalis'])
    ws_out.cell(row=r_idx, column=4, value=r_data['tolov'])
    ws_out.cell(row=r_idx, column=5, value=r_data['shnum'])
    ws_out.cell(row=r_idx, column=6, value=r_data['shsan'])
    ws_out.cell(row=r_idx, column=7, value=r_data['ota'])
    ws_out.cell(row=r_idx, column=8, value=r_data['fish'])
    ws_out.cell(row=r_idx, column=9, value=r_data['pass_full'])
    ws_out.cell(row=r_idx, column=10, value=r_data['pass_tur'])
    ws_out.cell(row=r_idx, column=11, value=r_data['pass_ser'])
    ws_out.cell(row=r_idx, column=12, value=r_data['pass_num'])
    ws_out.cell(row=r_idx, column=13, value=r_data['pinfl'])
    ws_out.cell(row=r_idx, column=14, value=r_data['dob'])
    ws_out.cell(row=r_idx, column=15, value=r_data['passber'])
    ws_out.cell(row=r_idx, column=16, value=r_data['cert_full'])
    ws_out.cell(row=r_idx, column=17, value=r_data['cert_tur'])
    ws_out.cell(row=r_idx, column=18, value=r_data['cert_ser'])
    ws_out.cell(row=r_idx, column=19, value=r_data['cert_num'])
    ws_out.cell(row=r_idx, column=20, value=r_data['maktab'])
    ws_out.cell(row=r_idx, column=21, value=r_data['edutur'])
    ws_out.cell(row=r_idx, column=22, value=r_data['yil'])
    ws_out.cell(row=r_idx, column=23, value=r_data['cqr'])
    if r_data['docx_path'] and os.path.exists(r_data['docx_path']):
        ws_out.cell(row=r_idx, column=24, value=f'=HYPERLINK("{r_data["docx_path"]}", "📄 {r_data["docx"]}")')
    else:
        ws_out.cell(row=r_idx, column=24, value=r_data['docx'])
    ws_out.cell(row=r_idx, column=25, value=r_data['status'])
    ws_out.cell(row=r_idx, column=26, value=r_data['note'])

ws_out.freeze_panes = "C2"
wb_out.save(OUTPUT_EXCEL)
print(f"[OK] Excel saqlandi: {OUTPUT_EXCEL}")

# ═══════════════════════════════════════════════════════
# STATISTIKA
# ═══════════════════════════════════════════════════════

total_count = len(raw_rows)
p_found_cnt = sum(1 for r in raw_rows if r['pass_ser'] not in ['-', None, ''])
p_pct = round(p_found_cnt / total_count * 100, 1) if total_count else 0
c_found_cnt = sum(1 for r in raw_rows if r['cert_ser'] not in ['-', None, ''])
c_pct = round(c_found_cnt / total_count * 100, 1) if total_count else 0

age_stats = {
    "15-17": sum(1 for r in raw_rows if r['age_grp'] == "15-17"),
    "18-20": sum(1 for r in raw_rows if r['age_grp'] == "18-20"),
    "21-23": sum(1 for r in raw_rows if r['age_grp'] == "21-23"),
    "24-26": sum(1 for r in raw_rows if r['age_grp'] == "24-26"),
    "27-29": sum(1 for r in raw_rows if r['age_grp'] == "27-29"),
    "30-32": sum(1 for r in raw_rows if r['age_grp'] == "30-32"),
    "33+":   sum(1 for r in raw_rows if r['age_grp'] == "33+"),
}

# ═══════════════════════════════════════════════════════
# HTML QATORLARINI YASASH (EKRANGA 100% SIG'ADIGAN ULTRA-COMPACT)
# ═══════════════════════════════════════════════════════

html_tbody_rows = []

for idx, r in enumerate(raw_rows, 1):
    ism_esc   = html_lib.escape(r['ism'])
    fish_esc  = html_lib.escape(r['fish']) if r['fish'] != '-' else ''
    shnum_esc = html_lib.escape(r['shnum'])
    pfull_esc = html_lib.escape(r['pass_full'])
    ptur_esc  = html_lib.escape(r['pass_tur'])
    pser_esc  = html_lib.escape(r['pass_ser'])
    pnum_esc  = html_lib.escape(r['pass_num'])
    pinfl_esc = html_lib.escape(r['pinfl'])
    passber_esc = html_lib.escape(r['passber'])
    dob_esc   = html_lib.escape(r['dob'])
    cfull_esc = html_lib.escape(r['cert_full'])
    ctur_esc  = html_lib.escape(r['cert_tur'])
    cser_esc  = html_lib.escape(r['cert_ser'])
    cnum_esc  = html_lib.escape(r['cert_num'])
    maktab_esc= html_lib.escape(r['maktab'])
    yil_esc   = html_lib.escape(r['yil'])
    docx_esc  = html_lib.escape(r['docx'])
    cqr_raw   = r['cqr']
    st_raw    = r['status']
    age_val   = r['age']
    age_grp   = r['age_grp']

    search_str = f"{ism_esc} {fish_esc} {pfull_esc} {cfull_esc} {shnum_esc} {pinfl_esc} {maktab_esc}".lower()

    # 1. Pasport birlashgan ixcham bloki (Seriya + Raqam + Turi bitta katakda)
    if pser_esc not in ['-', '']:
        pt_cls = "bi" if ptur_esc == "ID-karta" else "bp"
        pass_cell_html = f'''<div style="font-weight:700;font-family:monospace;font-size:12px;color:var(--bd);">{pser_esc} {pnum_esc}</div>
<span class="b {pt_cls}" style="font-size:9px;padding:0px 4px;margin-top:1px;">{ptur_esc}</span>'''
    else:
        pass_cell_html = '<span style="color:#bbb">—</span>'

    # 2. PINFL bloki
    if len(pinfl_esc) == 14 and pinfl_esc.isdigit():
        pinfl_cell_html = f'<code class="bok" style="font-size:11px;font-weight:600;">{pinfl_esc}</code>'
    else:
        pinfl_cell_html = '<span style="color:#bbb">—</span>'

    # 3. Tug'ilgan sana va Yosh bloki
    if dob_esc not in ['-', '']:
        age_badge = f'<span class="b ba" style="font-size:9px;padding:0px 4px;margin-left:4px;">{age_val} yosh</span>' if age_val else ''
        dob_cell_html = f'<div style="white-space:nowrap;font-size:11px;font-weight:500;">{dob_esc}{age_badge}</div>'
    else:
        dob_cell_html = '<span style="color:#bbb">—</span>'

    # 4. Berilgan sana
    ber_cell_html = f'<span style="font-size:11px;color:#555;">{passber_esc}</span>' if passber_esc not in ['-', ''] else '<span style="color:#bbb">—</span>'

    # 5. Ta'lim hujjati birlashgan ixcham bloki (Turi + Seriya + Raqam bitta katakda)
    if cser_esc not in ['-', '']:
        ct_cls = "bd" if ctur_esc == "Diplom" else "bs"
        cert_cell_html = f'''<div style="font-weight:700;font-family:monospace;font-size:12px;color:var(--gd);">{cser_esc} {cnum_esc}</div>
<span class="b {ct_cls}" style="font-size:9px;padding:0px 4px;margin-top:1px;">{ctur_esc}</span>'''
    else:
        cert_cell_html = '<span style="color:#bbb">—</span>'

    # 6. Muassasa va Yil
    if maktab_esc not in ['-', '']:
        maktab_cell_html = f'<div class="tm-cell" title="{maktab_esc}">{maktab_esc}</div>'
    else:
        maktab_cell_html = '<span style="color:#bbb">—</span>'

    yil_cell_html = f'<b style="color:#1e3c72;font-size:11px;">{yil_esc}</b>' if yil_esc not in ['-', ''] else '<span style="color:#bbb">—</span>'

    # 7. Havolalar (QR va Docx bitta ixcham ustunda)
    links_list = []
    if cqr_raw and cqr_raw.startswith('http'):
        links_list.append(f'<a href="{html_lib.escape(cqr_raw)}" target="_blank" class="ql" title="QR orqali ochish">🔗 QR</a>')
    if r['docx_path']:
        docx_url = 'files/' + urllib.parse.quote(docx_esc)
        links_list.append(f'<a href="{docx_url}" download="{docx_esc}" class="dl" title="{docx_esc}">📄 Docx</a>')
    
    links_btns = " ".join(links_list) if links_list else '<span style="color:#bbb">—</span>'
    if r['docx_path'] and docx_esc != '-':
        links_cell_html = f'<div style="display:flex;flex-direction:column;align-items:center;gap:3px;"><div>{links_btns}</div><div style="font-size:9px;color:#0284c7;max-width:105px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;" title="{docx_esc}">{docx_esc}</div></div>'
    else:
        links_cell_html = links_btns

    # Yo'nalishi badge
    yon_esc = html_lib.escape(r.get('yonalis', '-'))
    if 'Hamshiralik ishi - 3 yillik' in yon_esc:
        yon_badge = '<span style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">Hamshiralik 3y</span>'
    elif 'Hamshiralik ishi - 2 yillik' in yon_esc:
        yon_badge = '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">Hamshiralik 2y</span>'
    elif 'Feldsherlik' in yon_esc:
        yon_badge = '<span style="background:#fce7f3;color:#9d174d;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">Feldsherlik</span>'
    elif 'Farmatsiya' in yon_esc:
        yon_badge = '<span style="background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">Farmatsiya</span>'
    elif yon_esc != '-':
        yon_badge = f'<span style="background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">{yon_esc}</span>'
    else:
        yon_badge = '<span style="color:#bbb">—</span>'

    # 8. Status
    st_html = '<span class="s-ok">✅</span>' if 'TOPILDI' in st_raw else '<span class="s-er">❌</span>'

    # 9. Amallar (Tahrirlash va O'chirish)
    st_json_str = html_lib.escape(json.dumps(r, ensure_ascii=False))
    actions_cell_html = f'''<div style="display:flex;align-items:center;justify-content:center;gap:4px;">
      <button onclick="openEditStudentModal(this)" data-student="{st_json_str}" style="background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-size:11px;cursor:pointer;" title="Tahrirlash">✏️</button>
      <button onclick="deleteStudentPrompt('{shnum_esc}', '{ism_esc}')" style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:2px 6px;border-radius:4px;font-size:11px;cursor:pointer;" title="O'chirish">🗑️</button>
    </div>'''

    tr_html = f'''<tr class="trow"
    data-shnum="{shnum_esc}"
    data-pt="{ptur_esc}"
    data-ser="{pser_esc}"
    data-ct="{ctur_esc}"
    data-cser="{cser_esc}"
    data-age-group="{age_grp}"
    data-hp="{'yes' if pser_esc not in ['-', ''] else 'no'}"
    data-hc="{'yes' if cser_esc not in ['-', ''] else 'no'}"
    data-st="{st_raw}"
    data-search="{search_str}">
    <td class="tc">{idx}</td>
    <td class="ti">{ism_esc}{f"<div style='font-size:10px;font-weight:400;color:#64748b;'>{fish_esc}</div>" if fish_esc else ""}</td>
    <td class="tc">{yon_badge}</td>
    <td class="tc"><b style="font-size:12px;color:#1e3c72;">#{shnum_esc}</b></td>
    <td>{pass_cell_html}</td>
    <td>{pinfl_cell_html}</td>
    <td>{dob_cell_html}</td>
    <td class="tc">{ber_cell_html}</td>
    <td>{cert_cell_html}</td>
    <td>{maktab_cell_html}</td>
    <td class="tc">{yil_cell_html}</td>
    <td class="tc" style="white-space:nowrap;">{links_cell_html}</td>
    <td class="tc">{st_html}</td>
    <td class="tc">{actions_cell_html}</td>
  </tr>'''
    html_tbody_rows.append(tr_html)

tbody_content = "\n".join(html_tbody_rows)

# ═══════════════════════════════════════════════════════
# TO'LIQ HTML SHABLONI (100% RESPONSIVE NO HORIZONTAL SCROLL)
# ═══════════════════════════════════════════════════════

HTML_PAGE = f'''<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Talabalar Shartnomalari & Hujjatlari Boshqaruv Paneli</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
:root {{
  --bg: #f8fafc;
  --card: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --bdr: #e2e8f0;
  --p: #2563eb;
  --g: #16a34a;
  --bd: #1d4ed8;
  --gd: #15803d;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:'Inter',sans-serif; background:var(--bg); color:var(--text); font-size:12px; line-height:1.35; }}

/* HEADER */
header {{ background:linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color:#fff; padding:14px 20px; box-shadow:0 2px 10px rgba(0,0,0,0.1); }}
.htop {{ display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }}
h1 {{ font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px; }}
.btn-xl {{ background:#22c55e; color:#fff; border:none; padding:8px 14px; border-radius:6px; font-weight:600; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; text-decoration:none; box-shadow:0 2px 6px rgba(34,197,94,0.3); transition:all 0.2s; }}
.btn-xl:hover {{ background:#16a34a; }}
.wrap {{ padding:14px 18px; max-width:100%; margin:0 auto; }}

/* FILTRLAR PANELI */
.fpanel {{ background:var(--card); border-radius:10px; border:1px solid var(--bdr); padding:12px 16px; margin-bottom:12px; box-shadow:0 1px 2px rgba(0,0,0,0.03); }}
.fsec {{ margin-bottom:8px; display:flex; align-items:center; flex-wrap:wrap; gap:6px; }}
.fsec:last-child {{ margin-bottom:0; }}
.flbl {{ font-weight:600; color:var(--muted); font-size:11px; min-width:115px; display:flex; align-items:center; gap:4px; }}
.fb {{ background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; padding:3px 9px; border-radius:5px; font-size:11px; font-weight:500; cursor:pointer; transition:all 0.15s; }}
.fb:hover {{ background:#e2e8f0; }}
.fb.active {{ background:var(--p); border-color:var(--p); color:#fff; font-weight:600; }}
.sbox {{ flex:1; min-width:220px; position:relative; }}
.sinput {{ width:100%; padding:6px 10px 6px 30px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-family:'Inter',sans-serif; }}
.sinput:focus {{ outline:none; border-color:var(--p); }}
.sico {{ position:absolute; left:9px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:12px; }}

/* JADVAL - EKRANGA 100% SIG'ADIGAN */
.tcard {{ background:var(--card); border-radius:10px; border:1px solid var(--bdr); box-shadow:0 1px 3px rgba(0,0,0,0.04); overflow:hidden; }}
.tresp {{ width:100%; overflow-x:auto; }}
table {{ width:100%; border-collapse:collapse; text-align:left; font-size:11.5px; table-layout:auto; }}
thead {{ position:sticky; top:0; z-index:10; background:#1e293b; color:#fff; }}
th {{ padding:8px 8px; font-weight:600; border-bottom:1px solid #334155; border-right:1px solid #334155; font-size:11px; white-space:nowrap; }}
th.th-p {{ background:#1e40af; }}
th.th-c {{ background:#166534; }}
td {{ padding:6px 8px; border-bottom:1px solid var(--bdr); border-right:1px solid var(--bdr); vertical-align:middle; }}
tr:hover td {{ background:#f8fafc; }}
.trow.hidden {{ display:none !important; }}
.tc {{ text-align:center; }}

/* NISHONLAR VA LINKLAR */
.b {{ display:inline-block; padding:1px 5px; border-radius:3px; font-size:10px; font-weight:600; line-height:1.2; }}
.bi {{ background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }}
.bp {{ background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; }}
.bd {{ background:#fef3c7; color:#b45309; border:1px solid #fde68a; }}
.bs {{ background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; }}
.ba {{ background:#faf5ff; color:#7e22ce; border:1px solid #f3e8ff; }}
.bok {{ background:#ecfdf5; color:#047857; font-family:'JetBrains Mono',monospace; padding:1px 4px; border-radius:3px; }}
.ti {{ font-weight:600; color:#0f172a; min-width:130px; }}
.tm-cell {{ max-width:220px; white-space:normal; color:#475569; font-size:11px; line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }}
.ql {{ background:#f0fdf4; color:#15803d; text-decoration:none; padding:2px 5px; border-radius:3px; font-weight:600; border:1px solid #bbf7d0; font-size:10px; }}
.dl {{ background:#eff6ff; color:#1d4ed8; text-decoration:none; padding:2px 5px; border-radius:3px; font-weight:600; border:1px solid #bfdbfe; font-size:10px; }}
.s-ok {{ color:#16a34a; font-weight:700; font-size:12px; }}
.s-er {{ color:#dc2626; font-weight:700; font-size:12px; }}
</style>
</head>
<body>

<header>
  <div class="htop">
    <div>
      <h1>🎓 Talabalar Shartnomalari & Hujjatlari Boshqaruv Paneli</h1>
      <p style="font-size:11px;opacity:0.85;margin-top:2px;">Barcha ma'lumotlar Shartnoma raqami bo'yicha saralangan | Ekranga 100% moslashtirilgan</p>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <button onclick="openAddStudentModal()" class="btn-xl" style="background:#16a34a;box-shadow:0 2px 6px rgba(22,163,74,0.35);">
        <span>➕</span> <span>Yangi Talaba Qo'shish</span>
      </button>
      <a href="Talabalar_Yangilangan_Royxat.xlsx" download class="btn-xl">⬇️ Excel yuklab olish</a>
    </div>
  </div>
</header>

<div class="wrap">
  <!-- FILTRLAR PANELI -->
  <div class="fpanel">
    <!-- Tezkor Qidiruv -->
    <div class="fsec">
      <span class="flbl">🔍 Qidiruv:</span>
      <div class="sbox">
        <span class="sico">🔎</span>
        <input type="text" id="searchInput" class="sinput" placeholder="Ism, pasport, maktab, PINFL, shartnoma raqami bo'yicha qidiring...">
      </div>
      <button class="fb active" onclick="resetAllFilters()">🔄 Barchasini tozalash</button>
      <span id="matchCount" style="font-weight:600;color:var(--p);margin-left:auto;font-size:11px;">{total_count} ta talaba ko'rsatilmoqda</span>
    </div>

    <!-- 1. Yoshi bo'yicha Filter -->
    <div class="fsec">
      <span class="flbl">🎂 Yoshi bo'yicha:</span>
      <button class="fb active" data-group="age" data-val="all" onclick="setF(this)">Barchasi</button>
      <button class="fb" data-group="age" data-val="15-17" onclick="setF(this)">15–17 yosh ({age_stats['15-17']})</button>
      <button class="fb" data-group="age" data-val="18-20" onclick="setF(this)">18–20 yosh ({age_stats['18-20']})</button>
      <button class="fb" data-group="age" data-val="21-23" onclick="setF(this)">21–23 yosh ({age_stats['21-23']})</button>
      <button class="fb" data-group="age" data-val="24-26" onclick="setF(this)">24–26 yosh ({age_stats['24-26']})</button>
      <button class="fb" data-group="age" data-val="27-29" onclick="setF(this)">27–29 yosh ({age_stats['27-29']})</button>
      <button class="fb" data-group="age" data-val="30-32" onclick="setF(this)">30–32 yosh ({age_stats['30-32']})</button>
      <button class="fb" data-group="age" data-val="33+" onclick="setF(this)">33+ yosh ({age_stats['33+']})</button>
    </div>

    <!-- 2. Ta'lim Hujjati Turi & Seriyasi -->
    <div class="fsec">
      <span class="flbl">📜 Ta'lim hujjati:</span>
      <button class="fb active" data-group="ct" data-val="all" onclick="setF(this)">Barchasi</button>
      <button class="fb" data-group="ct" data-val="Diplom" onclick="setF(this)">🎓 Diplom (26)</button>
      <button class="fb" data-group="ct" data-val="Shahodatnoma" onclick="setF(this)">📄 Shahodatnoma (133)</button>
      <button class="fb" data-group="cser" data-val="UM" onclick="setF(this)">UM</button>
      <button class="fb" data-group="cser" data-val="K" onclick="setF(this)">K</button>
      <button class="fb" data-group="cser" data-val="PT" onclick="setF(this)">PT</button>
      <button class="fb" data-group="cser" data-val="IM" onclick="setF(this)">IM</button>
      <button class="fb" data-group="cser" data-val="DB" onclick="setF(this)">DB</button>
      <button class="fb" data-group="ct" data-val="topilmagan" onclick="setF(this)">❌ Topilmagan</button>
    </div>

    <!-- 3. Pasport Turi -->
    <div class="fsec">
      <span class="flbl">🪪 Pasport / ID:</span>
      <button class="fb active" data-group="pt" data-val="all" onclick="setF(this)">Barchasi</button>
      <button class="fb" data-group="pt" data-val="ID-karta" onclick="setF(this)">ID-karta (AD/AE)</button>
      <button class="fb" data-group="pt" data-val="Biometrik pasport" onclick="setF(this)">Biometrik (AB/AC)</button>
      <button class="fb" data-group="pt" data-val="topilmagan" onclick="setF(this)">❌ Topilmagan</button>
    </div>
  </div>

  <!-- ASOSIY JADVAL -->
  <div class="tcard">
    <div class="tresp">
      <table id="mainTable">
        <thead>
          <tr>
            <th class="tc" style="width:35px;">T/R</th>
            <th>Talaba F.I.SH</th>
            <th class="tc" style="width:115px;">Yo'nalishi</th>
            <th class="tc" style="width:55px;">Sh. №</th>
            <th class="th-p">Pasport / ID</th>
            <th>JSHSHIR (PINFL)</th>
            <th>Tug'ilgan sana / Yosh</th>
            <th class="tc">Berilgan sana</th>
            <th class="th-c">Ta'lim hujjati</th>
            <th>Tugatgan Muassasasi</th>
            <th class="tc" style="width:45px;">Yil</th>
            <th class="tc" style="width:90px;">Hujjatlar</th>
            <th class="tc" style="width:35px;">Holat</th>
            <th class="tc" style="width:60px;">Amallar</th>
          </tr>
        </thead>
        <tbody id="tableBody">
{tbody_content}
        </tbody>
      </table>
    </div>
  </div>
</div>

<script>
let currentFilters = {{
  age: 'all',
  ct: 'all',
  cser: 'all',
  pt: 'all',
  search: ''
}};

function setF(btn) {{
  const group = btn.getAttribute('data-group');
  const val = btn.getAttribute('data-val');
  
  document.querySelectorAll(`.fb[data-group="${{group}}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  currentFilters[group] = val;
  applyFilter();
}}

function resetAllFilters() {{
  currentFilters = {{ age: 'all', ct: 'all', cser: 'all', pt: 'all', search: '' }};
  document.querySelectorAll('.fb').forEach(b => {{
    if (b.getAttribute('data-val') === 'all') b.classList.add('active');
    else b.classList.remove('active');
  }});
  document.getElementById('searchInput').value = '';
  applyFilter();
}}

document.getElementById('searchInput').addEventListener('input', function(e) {{
  currentFilters.search = e.target.value.toLowerCase().trim();
  applyFilter();
}});

function applyFilter() {{
  const rows = document.querySelectorAll('#tableBody tr');
  let visible = 0;

  rows.forEach(r => {{
    const rAge = r.getAttribute('data-age-group') || '';
    const rCt = r.getAttribute('data-ct') || '';
    const rCser = r.getAttribute('data-cser') || '';
    const rPt = r.getAttribute('data-pt') || '';
    const rHp = r.getAttribute('data-hp') || '';
    const rHc = r.getAttribute('data-hc') || '';
    const rSearch = r.getAttribute('data-search') || '';

    let match = true;

    if (currentFilters.age !== 'all' && rAge !== currentFilters.age) match = false;
    if (match && currentFilters.ct !== 'all') {{
      if (currentFilters.ct === 'topilmagan') {{
        if (rHc === 'yes') match = false;
      }} else if (rCt !== currentFilters.ct) {{
        match = false;
      }}
    }}
    if (match && currentFilters.cser !== 'all') {{
      if (rCser !== currentFilters.cser) match = false;
    }}
    if (match && currentFilters.pt !== 'all') {{
      if (currentFilters.pt === 'topilmagan') {{
        if (rHp === 'yes') match = false;
      }} else if (rPt !== currentFilters.pt) {{
        match = false;
      }}
    }}
    if (match && currentFilters.search) {{
      if (!rSearch.includes(currentFilters.search)) match = false;
    }}

    if (match) {{
      r.classList.remove('hidden');
      visible++;
    }} else {{
      r.classList.add('hidden');
    }}
  }});

  document.getElementById('matchCount').innerText = `${{visible}} ta talaba ko'rsatilmoqda`;
}}

let manualRowCount = 0;

function openAddStudentModal() {{
  let modal = document.getElementById('addStudentModal');
  if (!modal) {{
    modal = document.createElement('div');
    modal.id = 'addStudentModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.75);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:15px;';
    document.body.appendChild(modal);
  }}

  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);max-width:1150px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;animation:fadeIn 0.2s ease-out;">
      <!-- Header -->
      <div style="background:#1e3c72;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
        <h3 style="margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;">
          <span>➕</span> Yangi Talaba Qo'shish (AI & Manual)
        </h3>
        <div style="display:flex;gap:6px;">
          <button id="tabBtn1" onclick="switchAddTab(1)" style="background:#2563eb;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;">⚡ 1. AI Docx Tahlil</button>
          <button id="tabBtn2" onclick="switchAddTab(2)" style="background:rgba(255,255,255,0.15);color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;">✍️ 2. Ism + Yo'nalish + Docx</button>
          <button id="tabBtn3" onclick="switchAddTab(3)" style="background:rgba(255,255,255,0.15);color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;">📋 3. Qatorma-qator jadval</button>
        </div>
      </div>
      
      <div style="padding:18px;overflow-y:auto;flex:1;" id="modalBodyContent">
        <!-- TAB 1: AI Docx Drag & Drop -->
        <div id="tab1Content">
          <div style="border:2px dashed #93c5fd;background:#f0f7ff;border-radius:10px;padding:30px 20px;text-align:center;cursor:pointer;transition:all 0.2s;" onclick="document.getElementById('docxFileInput1').click()" ondragover="event.preventDefault();this.style.background='#dbeafe';" ondragleave="this.style.background='#f0f7ff';" ondrop="handleDocxDrop(event, 1)">
            <input type="file" id="docxFileInput1" accept=".docx" style="display:none;" onchange="handleDocxFileSelect(this, 1)">
            <div style="font-size:36px;margin-bottom:8px;">📄⚡</div>
            <h4 style="margin:0 0 6px 0;color:#1e3c72;font-size:15px;">Word (.docx) shartnoma faylini bu yerga tashlang yoki tanlang</h4>
            <p style="margin:0;font-size:12px;color:#64748b;">OpenRouter AI Vision faylni to'liq o'qib, Ism, Pasport, PINFL, Shahodatnoma/Diplom va Maktabni avtomatik ajratadi.</p>
          </div>
        </div>

        <!-- TAB 2: Ism + Yo'nalish + Docx -->
        <div id="tab2Content" style="display:none;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:4px;">Talabaning Ismi va Familiyasi *</label>
              <input type="text" id="tab2_ism" placeholder="Masalan: Karimova Dilnoza" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;">
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:4px;">Yo'nalishi *</label>
              <select id="tab2_yon" style="width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;">
                <option value="Hamshiralik ishi - 3 yillik">Hamshiralik ishi - 3 yillik</option>
                <option value="Hamshiralik ishi - 2 yillik">Hamshiralik ishi - 2 yillik</option>
                <option value="Feldsherlik ishi">Feldsherlik ishi</option>
                <option value="Farmatsiya ishi">Farmatsiya ishi</option>
              </select>
            </div>
          </div>
          <div style="border:2px dashed #93c5fd;background:#f0f7ff;border-radius:10px;padding:24px 20px;text-align:center;cursor:pointer;" onclick="document.getElementById('docxFileInput2').click()" ondragover="event.preventDefault();this.style.background='#dbeafe';" ondragleave="this.style.background='#f0f7ff';" ondrop="handleDocxDrop(event, 2)">
            <input type="file" id="docxFileInput2" accept=".docx" style="display:none;" onchange="handleDocxFileSelect(this, 2)">
            <div style="font-size:28px;margin-bottom:4px;">📁</div>
            <h4 style="margin:0 0 4px 0;color:#1e3c72;font-size:13.5px;">Ushbu talabaning Word (.docx) shartnoma faylini tanlang</h4>
            <p style="margin:0;font-size:11.5px;color:#64748b;">AI barcha hujjatlarini o'qib, siz kiritgan ma'lumotlar bilan birlashtiradi.</p>
          </div>
        </div>

        <!-- TAB 3: Qatorma-qator jadval -->
        <div id="tab3Content" style="display:none;">
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;" id="manualStudentTable">
              <thead>
                <tr style="background:#0f172a;color:#fff;text-align:left;">
                  <th style="padding:6px 8px;width:150px;">Familiyasi va Ismi *</th>
                  <th style="padding:6px 8px;width:100px;">Otasining ismi</th>
                  <th style="padding:6px 8px;width:115px;">Yo'nalishi</th>
                  <th style="padding:6px 8px;width:55px;">Sh. № *</th>
                  <th style="padding:6px 8px;width:95px;">Pasport / ID</th>
                  <th style="padding:6px 8px;width:115px;">PINFL (14 xona)</th>
                  <th style="padding:6px 8px;width:90px;">Tug'ilgan sana</th>
                  <th style="padding:6px 8px;width:95px;">Hujjat turi</th>
                  <th style="padding:6px 8px;width:100px;">Seriya & Raqam</th>
                  <th style="padding:6px 8px;">Tugatgan muassasasi</th>
                  <th style="padding:6px 8px;width:50px;">Yil</th>
                  <th style="padding:6px 8px;width:30px;text-align:center;"></th>
                </tr>
              </thead>
              <tbody id="manualTableBody"></tbody>
            </table>
          </div>
          <button onclick="addNewStudentRow()" style="margin-top:10px;background:#f1f5f9;border:1px dashed #94a3b8;color:#1e3c72;padding:6px 14px;border-radius:6px;font-weight:600;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            <span>➕</span> Yana bitta qator qo'shish
          </button>
        </div>

        <!-- AI TAHLIL NATIJASI VA TASDIQLASH FORMASI -->
        <div id="aiPreviewBox" style="display:none;margin-top:16px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:16px;animation:fadeIn 0.2s ease-out;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">
            <h4 style="margin:0;color:#1e3c72;font-size:14px;display:flex;align-items:center;gap:6px;">
              <span>🤖</span> AI Tahlil Natijalari (Tekshirib tasdiqlang)
            </h4>
            <span id="aiFileNameTag" style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:4px;font-family:monospace;"></span>
          </div>
          
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;font-size:11.5px;">
            <div>
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">Familiya va Ism *</label>
              <input type="text" id="ai_ism" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;font-weight:600;color:#1e3c72;">
            </div>
            <div>
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">Otasining ismi</label>
              <input type="text" id="ai_ota" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;">
            </div>
            <div>
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">Shartnoma № *</label>
              <input type="text" id="ai_shnum" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;font-weight:700;color:#2563eb;text-align:center;">
            </div>
            <div>
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">Yo'nalishi</label>
              <input type="text" id="ai_yon" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;">
            </div>
            <div>
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">Pasport / ID-karta</label>
              <input type="text" id="ai_pass" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;font-family:monospace;text-transform:uppercase;font-weight:600;">
            </div>
            <div>
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">JSHSHIR (PINFL - 14 xona)</label>
              <input type="text" id="ai_pinfl" oninput="autoDobFromPinfl(this, 'ai_dob')" maxlength="14" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;font-family:monospace;">
            </div>
            <div>
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">Tug'ilgan sana</label>
              <input type="text" id="ai_dob" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;">
            </div>
            <div>
              <label style="display:block;font-weight:600;color:#e65100;margin-bottom:2px;">🪪 Pasport Berilgan sanasi</label>
              <input type="text" id="ai_ber_sana" placeholder="Masalan: 20.09.2024" style="width:100%;padding:6px 8px;border:1px solid #fb923c;border-radius:4px;background:#fff7ed;">
            </div>
            <div>
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">Hujjat turi</label>
              <select id="ai_ctur" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;">
                <option value="Shahodatnoma">Shahodatnoma</option>
                <option value="Diplom">Diplom</option>
              </select>
            </div>
            <div>
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">Shahodatnoma/Diplom Seriya & №</label>
              <input type="text" id="ai_cert" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;font-family:monospace;text-transform:uppercase;font-weight:600;color:#15803d;">
            </div>
            <div style="grid-column: span 2;">
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">Tugatgan Muassasasi (Maktab / Kollej)</label>
              <input type="text" id="ai_maktab" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;">
            </div>
            <div>
              <label style="display:block;font-weight:600;color:#475569;margin-bottom:2px;">Bitirgan yili</label>
              <input type="text" id="ai_yil" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;text-align:center;">
            </div>
          </div>
        </div>

        <div id="aiLoadingIndicator" style="display:none;text-align:center;padding:30px 20px;">
          <div style="font-size:32px;animation:spin 1s linear infinite;display:inline-block;">🔄</div>
          <h4 style="margin:10px 0 4px 0;color:#1e3c72;font-size:15px;">OpenRouter AI faylni chuqur tahlil qilmoqda...</h4>
          <p style="margin:0;font-size:12px;color:#64748b;">Pasport, PINFL va diplom rasmlari skanerlanmoqda, iltimos kuting.</p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 20px;display:flex;justify-content:flex-end;gap:10px;">
        <button onclick="closeAddStudentModal()" style="background:#e2e8f0;border:1px solid #cbd5e1;color:#475569;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;">❌ Bekor qilish</button>
        <button id="btnSaveActive" onclick="saveActiveStudentForm()" style="background:#16a34a;border:none;color:#fff;padding:8px 22px;border-radius:6px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(22,163,74,0.35);">💾 Bazaga Saqlash</button>
      </div>
    </div>
  `;

  manualRowCount = 0;
  addNewStudentRow();
  modal.style.display = 'flex';
}}

let currentActiveTab = 1;
function switchAddTab(tab) {{
  currentActiveTab = tab;
  for (let i = 1; i <= 3; i++) {{
    document.getElementById(`tab${{i}}Content`).style.display = i === tab ? 'block' : 'none';
    const btn = document.getElementById(`tabBtn${{i}}`);
    if (btn) {{
      btn.style.background = i === tab ? '#2563eb' : 'rgba(255,255,255,0.15)';
    }}
  }}
}}

function handleDocxDrop(e, tab) {{
  e.preventDefault();
  e.currentTarget.style.background = '#f0f7ff';
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {{
    processDocxUpload(e.dataTransfer.files[0], tab);
  }}
}}

function handleDocxFileSelect(input, tab) {{
  if (input.files && input.files[0]) {{
    processDocxUpload(input.files[0], tab);
  }}
}}

async function processDocxUpload(file, tab) {{
  if (!file.name.endsWith('.docx')) {{
    alert("Iltimos, faqat Word (.docx) shartnoma faylini yuklang!");
    return;
  }}

  document.getElementById('aiLoadingIndicator').style.display = 'block';
  document.getElementById('aiPreviewBox').style.display = 'none';

  const reader = new FileReader();
  reader.onload = async function(e) {{
    const b64 = e.target.result.split(',')[1];
    const ism_val = tab === 2 ? document.getElementById('tab2_ism').value.trim() : '';
    const yon_val = tab === 2 ? document.getElementById('tab2_yon').value : '';

    try {{
      const apiUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? '/api/analyze_docx' : 'http://localhost:8080/api/analyze_docx';
      const res = await fetch(apiUrl, {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{
          file_base64: b64,
          filename: file.name,
          ism: ism_val,
          yonalis: yon_val
        }})
      }});
      const data = await res.json();
      document.getElementById('aiLoadingIndicator').style.display = 'none';

      if (data.success) {{
        document.getElementById('aiPreviewBox').style.display = 'block';
        document.getElementById('aiFileNameTag').innerText = `Fayl: ${{data.filename}}`;
        document.getElementById('ai_ism').value = data.ism || '';
        document.getElementById('ai_ota').value = data.ota || '';
        document.getElementById('ai_shnum').value = data.shnum || '';
        document.getElementById('ai_yon').value = data.yonalis || 'Hamshiralik ishi - 3 yillik';
        document.getElementById('ai_pass').value = data.pass_val || '';
        document.getElementById('ai_pinfl').value = data.pinfl || '';
        document.getElementById('ai_dob').value = data.dob || '';
        document.getElementById('ai_ber_sana').value = data.ber_sana || '';
        document.getElementById('ai_ctur').value = data.cert_tur || 'Shahodatnoma';
        document.getElementById('ai_cert').value = data.cert_val || '';
        document.getElementById('ai_maktab').value = data.maktab || '';
        document.getElementById('ai_yil').value = data.yil || '2026';
        showToast("✅ AI faylni muvaffaqiyatli tahlil qildi!", "success");
      }} else {{
        showToast(`⚠️ Xatolik: ${{data.error || 'Tahlil qilib bo‘lmadi'}}`, "error");
      }}
    }} catch (err) {{
      document.getElementById('aiLoadingIndicator').style.display = 'none';
      showToast("⚠️ Server bilan ulanishda xatolik!", "error");
    }}
  }};
  reader.readAsDataURL(file);
}}

function addNewStudentRow() {{
  manualRowCount++;
  const tbody = document.getElementById('manualTableBody');
  const tr = document.createElement('tr');
  tr.id = `mRow_${{manualRowCount}}`;
  tr.style.borderBottom = '1px solid #e2e8f0';

  tr.innerHTML = `
    <td style="padding:4px;"><input type="text" class="m-ism" placeholder="Masalan: Karimova Dilnoza" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;"></td>
    <td style="padding:4px;"><input type="text" class="m-ota" placeholder="Shokir qizi" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;"></td>
    <td style="padding:4px;">
      <select class="m-yon" style="width:100%;padding:4px 2px;border:1px solid #cbd5e1;border-radius:4px;font-size:10.5px;">
        <option value="Hamshiralik ishi - 3 yillik">Hamshiralik 3y</option>
        <option value="Hamshiralik ishi - 2 yillik">Hamshiralik 2y</option>
        <option value="Feldsherlik ishi">Feldsherlik</option>
        <option value="Farmatsiya ishi">Farmatsiya</option>
      </select>
    </td>
    <td style="padding:4px;"><input type="text" class="m-shnum" placeholder="228" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;font-weight:600;text-align:center;"></td>
    <td style="padding:4px;"><input type="text" class="m-pass" placeholder="AD3936978" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;font-family:monospace;text-transform:uppercase;"></td>
    <td style="padding:4px;"><input type="text" class="m-pinfl" oninput="autoDobFromPinfl(this)" placeholder="42412955590015" maxlength="14" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;font-family:monospace;"></td>
    <td style="padding:4px;"><input type="text" class="m-dob" placeholder="24.12.1995" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;"></td>
    <td style="padding:4px;">
      <select class="m-ctur" style="width:100%;padding:4px 2px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;">
        <option value="Shahodatnoma">Shahodatnoma</option>
        <option value="Diplom">Diplom</option>
      </select>
    </td>
    <td style="padding:4px;"><input type="text" class="m-cert" placeholder="K 3359681" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;font-family:monospace;text-transform:uppercase;"></td>
    <td style="padding:4px;"><input type="text" class="m-maktab" placeholder="Shahrisabz Iqtisodiyot Kolleji" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;"></td>
    <td style="padding:4px;"><input type="text" class="m-yil" placeholder="2014" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;text-align:center;"></td>
    <td style="padding:4px;text-align:center;">
      <button onclick="document.getElementById('mRow_${{manualRowCount}}').remove()" style="background:#fee2e2;border:none;color:#dc2626;padding:2px 6px;border-radius:4px;cursor:pointer;font-weight:700;">✕</button>
    </td>
  `;
  tbody.appendChild(tr);
}}

function autoDobFromPinfl(pinflInput, targetId) {{
  const p = pinflInput.value.trim();
  if (p.length === 14 && /^\\d+$/.test(p)) {{
    const dd = p.substring(1, 3);
    const mm = p.substring(3, 5);
    const yy = p.substring(5, 7);
    const cent = (p[0] === '3' || p[0] === '4') ? '19' : '20';
    const dobVal = `${{dd}}.${{mm}}.${{cent}}${{yy}}`;
    if (targetId) {{
      document.getElementById(targetId).value = dobVal;
    }} else {{
      const row = pinflInput.closest('tr');
      if (row) {{
        const dobInput = row.querySelector('.m-dob');
        if (dobInput) dobInput.value = dobVal;
      }}
    }}
  }}
}}

async function saveActiveStudentForm() {{
  const students = [];

  // Agar AI Preview oynasi ochiq bo'lsa
  const previewBox = document.getElementById('aiPreviewBox');
  if (previewBox && previewBox.style.display !== 'none') {{
    const ism = document.getElementById('ai_ism').value.trim();
    if (!ism) {{
      alert("Iltimos, talaba ismini kiriting!");
      return;
    }}
    students.push({{
      ism: ism,
      ota: document.getElementById('ai_ota').value.trim(),
      shnum: document.getElementById('ai_shnum').value.trim(),
      yonalis: document.getElementById('ai_yon').value.trim(),
      pass_val: document.getElementById('ai_pass').value.trim(),
      pinfl: document.getElementById('ai_pinfl').value.trim(),
      dob: document.getElementById('ai_dob').value.trim(),
      ber_sana: document.getElementById('ai_ber_sana').value.trim(),
      cert_tur: document.getElementById('ai_ctur').value,
      cert_val: document.getElementById('ai_cert').value.trim(),
      maktab: document.getElementById('ai_maktab').value.trim(),
      yil: document.getElementById('ai_yil').value.trim()
    }});
  }} else {{
    // Qatorma-qator jadvaldan o'qish
    const rows = document.querySelectorAll('#manualTableBody tr');
    rows.forEach(r => {{
      const ism = r.querySelector('.m-ism').value.trim();
      if (ism) {{
        students.push({{
          ism: ism,
          ota: r.querySelector('.m-ota').value.trim(),
          yonalis: r.querySelector('.m-yon').value,
          shnum: r.querySelector('.m-shnum').value.trim(),
          pass_val: r.querySelector('.m-pass').value.trim(),
          pinfl: r.querySelector('.m-pinfl').value.trim(),
          dob: r.querySelector('.m-dob').value.trim(),
          cert_tur: r.querySelector('.m-ctur').value,
          cert_val: r.querySelector('.m-cert').value.trim(),
          maktab: r.querySelector('.m-maktab').value.trim(),
          yil: r.querySelector('.m-yil').value.trim()
        }});
      }}
    }});
  }}

  if (students.length === 0) {{
    alert("Iltimos, kamida bitta talaba ma'lumotlarini kiriting yoki Word faylni yuklang!");
    return;
  }}

  closeAddStudentModal();
  showToast("💾 Talabalar bazaga saqlanmoqda...", "info");

  try {{
    const addUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? '/api/add_students' : 'http://localhost:8080/api/add_students';
    const res = await fetch(addUrl, {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ students: students }})
    }});
    const data = await res.json();
    if (data.success) {{
      showToast(data.message, "success");
      setTimeout(() => {{ window.location.reload(); }}, 1200);
    }} else {{
      showToast(`⚠️ Xatolik yuz berdi`, "error");
    }}
  }} catch (err) {{
    showToast("⚠️ Server bilan ulanishda xatolik. YANGILASH.bat orqali ishga tushiring!", "error");
  }}
}}

function openEditStudentModal(btn) {{
  const raw = btn.getAttribute('data-student');
  if (!raw) return;
  const st = JSON.parse(raw);

  let modal = document.getElementById('editStudentModal');
  if (!modal) {{
    modal = document.createElement('div');
    modal.id = 'editStudentModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.75);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:15px;';
    document.body.appendChild(modal);
  }}

  const docxName = st.docx_esc && st.docx_esc !== '-' ? st.docx_esc : '';

  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);max-width:920px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;animation:fadeIn 0.2s ease-out;">
      <div style="background:#1e3c72;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
        <h3 style="margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;">
          <span>✏️</span> Talaba Ma'lumotlarini Tahrirlash & AI Tahlil
        </h3>
        <span style="font-size:12px;background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:4px;font-weight:700;">Shartnoma #${{st.shnum || '-'}}</span>
      </div>

      <div style="padding:18px 20px;overflow-y:auto;flex:1;">
        <!-- AI Fayl Biriktirish & Drag-Drop Qutisi -->
        <div id="editDropZone" 
             ondragover="event.preventDefault(); this.style.borderColor='#0284c7'; this.style.background='#e0f2fe';"
             ondragleave="this.style.borderColor='#7dd3fc'; this.style.background='#f0f9ff';"
             ondrop="handleEditFileDrop(event)"
             style="background:#f0f9ff;border:2px dashed #7dd3fc;border-radius:10px;padding:12px 18px;margin-bottom:14px;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:26px;">📄⚡</div>
            <div>
              <div style="font-size:12.5px;font-weight:700;color:#0369a1;">
                Word (.docx) faylini shu yerga sudrab tashlang (Drag & Drop)
              </div>
              <div style="font-size:11px;color:#64748b;margin-top:2px;">
                ${{docxName ? `📁 Hozirgi fayl: <b style="color:#0284c7;">${{docxName}}</b>` : "Faylni tashlasangiz, AI pasport, PINFL va ta'lim hujjatini avtomatik ajratadi."}}
              </div>
            </div>
          </div>
          <div>
            <input type="file" id="editFileInput" accept=".docx" style="display:none;" onchange="handleEditFileSelect(this)">
            <button type="button" onclick="document.getElementById('editFileInput').click()" style="background:#0284c7;color:#fff;border:none;padding:7px 15px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 2px 4px rgba(2,132,199,0.25);">
              📂 Fayl tanlash
            </button>
          </div>
        </div>

        <div id="editAiLoading" style="display:none;text-align:center;padding:12px;background:#fefce8;border:1px solid #fef08a;border-radius:8px;margin-bottom:12px;">
          <span style="font-size:18px;animation:spin 1s linear infinite;display:inline-block;">🔄</span>
          <span style="font-size:12px;font-weight:600;color:#854d0e;margin-left:8px;">OpenRouter AI faylni tahlil qilib ma'lumotlarni ajratmoqda...</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;font-size:12px;">
          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Familiya va Ism *</label>
            <input type="text" id="edit_ism" value="${{st.ism || ''}}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-weight:600;color:#1e3c72;">
          </div>
          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Otasining ismi</label>
            <input type="text" id="edit_ota" value="${{st.ota || ''}}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;">
          </div>
          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Shartnoma № *</label>
            <input type="text" id="edit_shnum" value="${{st.shnum || ''}}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-weight:700;color:#2563eb;text-align:center;">
          </div>

          <div style="grid-column:span 2;">
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Yo'nalishi</label>
            <select id="edit_yon" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;">
              <option value="Hamshiralik ishi - 3 yillik" ${{st.yonalis === 'Hamshiralik ishi - 3 yillik' ? 'selected' : ''}}>Hamshiralik ishi - 3 yillik</option>
              <option value="Hamshiralik ishi - 2 yillik" ${{st.yonalis === 'Hamshiralik ishi - 2 yillik' ? 'selected' : ''}}>Hamshiralik ishi - 2 yillik</option>
              <option value="Feldsherlik ishi" ${{st.yonalis === 'Feldsherlik ishi' ? 'selected' : ''}}>Feldsherlik ishi</option>
              <option value="Farmatsiya ishi" ${{st.yonalis === 'Farmatsiya ishi' ? 'selected' : ''}}>Farmatsiya ishi</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Pasport / ID-karta</label>
            <input type="text" id="edit_pass" value="${{st.pser || ''}}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-family:monospace;text-transform:uppercase;font-weight:600;">
          </div>

          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">JSHSHIR (PINFL - 14 xona)</label>
            <input type="text" id="edit_pinfl" oninput="autoDobFromPinfl(this, 'edit_dob')" maxlength="14" value="${{st.pinfl || ''}}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-family:monospace;">
          </div>
          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Tug'ilgan sana</label>
            <input type="text" id="edit_dob" value="${{st.dob || ''}}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;">
          </div>
          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Berilgan sana (Pasport / Shahodatnoma)</label>
            <input type="text" id="edit_ber_sana" value="${{st.ber_sana || ''}}" placeholder="Masalan: 16.06.2026" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;">
          </div>
          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Hujjat turi</label>
            <select id="edit_ctur" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;">
              <option value="Shahodatnoma" ${{st.ctur === 'Shahodatnoma' ? 'selected' : ''}}>Shahodatnoma</option>
              <option value="Diplom" ${{st.ctur === 'Diplom' ? 'selected' : ''}}>Diplom</option>
            </select>
          </div>

          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Shahodatnoma / Diplom Seriya & №</label>
            <input type="text" id="edit_cert" value="${{st.cser || ''}}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-family:monospace;text-transform:uppercase;font-weight:600;color:#15803d;">
          </div>
          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Tugatgan Muassasasi</label>
            <input type="text" id="edit_maktab" value="${{st.maktab || ''}}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;">
          </div>
          <div>
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:3px;">Bitirgan yili</label>
            <input type="text" id="edit_yil" value="${{st.yil || ''}}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;text-align:center;">
          </div>
        </div>
      </div>

      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;">
        <button onclick="deleteStudentPrompt('${{st.shnum || ''}}', '${{st.ism || ''}}')" style="background:#fee2e2;border:1px solid #fecaca;color:#dc2626;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;">🗑️ Ushbu Talabani O'chirish</button>
        <div style="display:flex;gap:10px;">
          <button onclick="closeEditStudentModal()" style="background:#e2e8f0;border:1px solid #cbd5e1;color:#475569;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;">❌ Bekor qilish</button>
          <button onclick="saveEditStudentData('${{st.shnum || ''}}')" style="background:#2563eb;border:none;color:#fff;padding:8px 22px;border-radius:6px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(37,99,235,0.35);">💾 O'zgarishlarni Saqlash</button>
        </div>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}}

function handleEditFileDrop(e) {{
  e.preventDefault();
  const dropZone = document.getElementById('editDropZone');
  if (dropZone) {{
    dropZone.style.borderColor = '#7dd3fc';
    dropZone.style.background = '#f0f9ff';
  }}
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {{
    processEditDocx(e.dataTransfer.files[0]);
  }}
}}

function handleEditFileSelect(input) {{
  if (input.files && input.files[0]) {{
    processEditDocx(input.files[0]);
  }}
}}

async function processEditDocx(file) {{
  if (!file.name.endsWith('.docx')) {{
    alert("Iltimos, faqat Word (.docx) shartnoma faylini tanlang!");
    return;
  }}

  document.getElementById('editAiLoading').style.display = 'block';

  const reader = new FileReader();
  reader.onload = async function(e) {{
    const b64 = e.target.result.split(',')[1];
    const ism_val = document.getElementById('edit_ism').value.trim();
    const yon_val = document.getElementById('edit_yon').value;

    try {{
      const apiUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? '/api/analyze_docx' : 'http://localhost:8080/api/analyze_docx';
      const res = await fetch(apiUrl, {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{
          file_base64: b64,
          filename: file.name,
          ism: ism_val,
          yonalis: yon_val
        }})
      }});
      const data = await res.json();
      document.getElementById('editAiLoading').style.display = 'none';

      if (data.success) {{
        if (data.ism) document.getElementById('edit_ism').value = data.ism;
        if (data.ota) document.getElementById('edit_ota').value = data.ota;
        if (data.shnum) document.getElementById('edit_shnum').value = data.shnum;
        if (data.yonalis) document.getElementById('edit_yon').value = data.yonalis;
        if (data.pass_val) document.getElementById('edit_pass').value = data.pass_val;
        if (data.pinfl) document.getElementById('edit_pinfl').value = data.pinfl;
        if (data.dob) document.getElementById('edit_dob').value = data.dob;
        if (data.ber_sana) document.getElementById('edit_ber_sana').value = data.ber_sana;
        if (data.cert_tur) document.getElementById('edit_ctur').value = data.cert_tur;
        if (data.cert_val) document.getElementById('edit_cert').value = data.cert_val;
        if (data.maktab) document.getElementById('edit_maktab').value = data.maktab;
        if (data.yil) document.getElementById('edit_yil').value = data.yil;
        showToast(`✅ "${{file.name}}" fayli AI orqali to'liq tahlil qilindi!`, "success");
      }} else {{
        showToast(`⚠️ Xatolik: ${{data.error || 'Tahlil qilib bo‘lmadi'}}`, "error");
      }}
    }} catch (err) {{
      document.getElementById('editAiLoading').style.display = 'none';
      showToast("⚠️ Server bilan ulanishda xatolik!", "error");
    }}
  }};
  reader.readAsDataURL(file);
}}

function closeEditStudentModal() {{
  const modal = document.getElementById('editStudentModal');
  if (modal) modal.style.display = 'none';
}}

async function saveEditStudentData(origShnum) {{
  const ism = document.getElementById('edit_ism').value.trim();
  if (!ism) {{
    alert("Iltimos, talaba ismini kiriting!");
    return;
  }}

  const payload = {{
    shnum: document.getElementById('edit_shnum').value.trim() || origShnum,
    ism: ism,
    ota: document.getElementById('edit_ota').value.trim(),
    yonalis: document.getElementById('edit_yon').value,
    pass_val: document.getElementById('edit_pass').value.trim(),
    pinfl: document.getElementById('edit_pinfl').value.trim(),
    dob: document.getElementById('edit_dob').value.trim(),
    cert_tur: document.getElementById('edit_ctur').value,
    cert_val: document.getElementById('edit_cert').value.trim(),
    maktab: document.getElementById('edit_maktab').value.trim(),
    yil: document.getElementById('edit_yil').value.trim()
  }};

  closeEditStudentModal();
  showToast("💾 O'zgarishlar saqlanmoqda...", "info");

  try {{
    const updateUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? '/api/update_student' : 'http://localhost:8080/api/update_student';
    const res = await fetch(updateUrl, {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify(payload)
    }});
    const data = await res.json();
    if (data.success) {{
      showToast(data.message, "success");
      setTimeout(() => {{ window.location.reload(); }}, 1000);
    }} else {{
      showToast(`⚠️ Xatolik: ${{data.message || 'Saqlab bo‘lmadi'}}`, "error");
    }}
  }} catch (err) {{
    showToast("⚠️ Server bilan ulanishda xatolik!", "error");
  }}
}}

async function deleteStudentPrompt(shnum, ism) {{
  const confirmMsg = `⚠️ DIQQAT!\n\nHaqiqatan ham [Shartnoma #${{shnum || '-'}}] "${{ism}}" talabasini butunlay o'chirib tashlamoqchimisiz?\n\nBu amalni ortga qaytarib bo'lmaydi!`;
  if (!confirm(confirmMsg)) return;

  closeEditStudentModal();
  showToast("🗑️ Talaba o'chirilmoqda...", "warning");

  try {{
    const delUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? '/api/delete_student' : 'http://localhost:8080/api/delete_student';
    const res = await fetch(delUrl, {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ shnum: shnum, ism: ism }})
    }});
    const data = await res.json();
    if (data.success) {{
      showToast(data.message, "success");
      setTimeout(() => {{ window.location.reload(); }}, 1000);
    }} else {{
      showToast(`⚠️ Xatolik: ${{data.message || 'O‘chirib bo‘lmadi'}}`, "error");
    }}
  }} catch (err) {{
    showToast("⚠️ Server bilan ulanishda xatolik!", "error");
  }}
}}

function closeAddStudentModal() {{
  const modal = document.getElementById('addStudentModal');
  if (modal) modal.style.display = 'none';
}}

function showToast(msg, type) {{
  let toast = document.getElementById('syncToast');
  if (!toast) {{
    toast = document.createElement('div');
    toast.id = 'syncToast';
    toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;padding:12px 20px;border-radius:8px;color:#fff;font-weight:600;font-size:13px;box-shadow:0 4px 15px rgba(0,0,0,0.2);transition:all 0.3s;';
    document.body.appendChild(toast);
  }}
  if (type === 'success') toast.style.background = '#16a34a';
  else if (type === 'info') toast.style.background = '#0284c7';
  else if (type === 'warning') toast.style.background = '#d97706';
  else toast.style.background = '#dc2626';

  toast.innerText = msg;
  toast.style.display = 'block';
  toast.style.opacity = '1';

  setTimeout(() => {{
    toast.style.opacity = '0';
    setTimeout(() => toast.style.display = 'none', 300);
  }}, 4000);
}}
</script>
<style>
@keyframes fadeIn {{ from {{ opacity:0; transform:scale(0.95); }} to {{ opacity:1; transform:scale(1); }} }}
@keyframes spin {{ 100% {{ transform: rotate(360deg); }} }}
</style>
</body>
</html>
'''

with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
    f.write(HTML_PAGE)

print(f"[OK] HTML saqlandi: {OUTPUT_HTML}")
