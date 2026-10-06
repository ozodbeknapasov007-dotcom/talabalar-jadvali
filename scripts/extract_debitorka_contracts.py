# -*- coding: utf-8 -*-
"""
Shaxrisabz debitorka final (107).xlsx faylidan shartnoma raqami yo'q talabalar
uchun shartnoma raqamlarini sinchiklab ajratib olish va integratsiya qilish skripti.
"""
import os
import re
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDENTS_PATH = os.path.join(BASE_DIR, 'data', 'students.json')
BAZA_PATH = os.path.join(BASE_DIR, 'data', 'talabalar_bazasi.json')
DEBITORKA_PATH = os.path.join(BASE_DIR, 'Shaxrisabz debitorka final (107).xlsx')
REPORT_PATH = os.path.join(BASE_DIR, 'hisobotlar', 'Debitorka_Shartnomalar_Biriktiruvi.xlsx')

def normalize_name(text):
    if not text:
        return ""
    t = text.lower()
    t = t.replace("o'", "o").replace("g'", "g").replace("sh", "s").replace("ch", "c")
    t = t.replace("oʻ", "o").replace("gʻ", "g").replace("o‘", "o").replace("g‘", "g")
    t = t.replace("'", "").replace("‘", "").replace("ʻ", "").replace("`", "")
    t = re.sub(r'[^a-zа-яё]', '', t)
    return t

def extract_contract_number(desc):
    """
    To'lov maqsadidan shartnoma raqamini sinchiklab ajratish.
    Faqat haqiqiy shartnoma raqamlarini oladi (yillar, tranzaksiya kodlari chiqariladi).
    """
    if not desc:
        return None
    d = str(desc).strip()

    # Pattern 1: Sh/A yoki SH/A yoki sh/ yoki shartnoma
    # Masalan: Sh/A 203, SH/A150, sh/a 385, Sh/A367, sh/a-122, sh/276, sh/ 45, SH/ 57
    m1 = re.search(r'(?:sh/?a|shartnoma|sh/)[\s\-_/]*(\d{1,4})(?!\d)', d, re.I)
    if m1:
        cand = m1.group(1).lstrip('0') or '0'
        if cand not in ['2024', '2025', '2026', '2027', '24', '25', '26', '27']:
            return cand

    # Pattern 2: 25/26 yoki 26/27 dan keyingi raqam
    # Masalan: 25/26 Sh/A 346, 26/27 sh/a 303
    m2 = re.search(r'2[456]/2[567][\s\-_/]*(?:sh/?a?)?[\s\-_/]*(\d{1,4})', d, re.I)
    if m2:
        cand = m2.group(1).lstrip('0') or '0'
        if cand not in ['2024', '2025', '2026', '2027', '24', '25', '26', '27']:
            return cand

    # Pattern 3: sonli shartnoma yoki sonli
    # Masalan: 500-sonli, 358-sonli, 215-sonli
    m3 = re.search(r'(\d{1,4})\s*-\s*s(?:onli)?\b', d, re.I)
    if m3:
        cand = m3.group(1).lstrip('0') or '0'
        if cand not in ['2024', '2025', '2026', '2027', '24', '25', '26', '27']:
            return cand

    # Pattern 4: № dan keyingi raqam
    # Masalan: № 510, №388
    m4 = re.search(r'№\s*(\d{1,4})', d, re.I)
    if m4:
        cand = m4.group(1).lstrip('0') or '0'
        if cand not in ['2024', '2025', '2026', '2027', '24', '25', '26', '27']:
            return cand

    return None

def main():
    with open(STUDENTS_PATH, 'r', encoding='utf-8') as f:
        students = json.load(f)

    # Indekslar
    by_pv = {}
    by_pin = {}
    by_name = {}

    for s in students:
        pv = str(s.get('pv') or '').replace(' ', '').upper()
        if pv:
            by_pv[pv] = s
        pin = str(s.get('pinfl') or '').replace(' ', '')
        if pin:
            by_pin[pin] = s
        norm = normalize_name(s.get('fish', ''))
        if norm:
            by_name[norm] = s

    wb = openpyxl.load_workbook(DEBITORKA_PATH, data_only=True)

    extracted = {}
    logs = []

    # 1. bank varag'ini tekshirish
    if 'bank' in wb.sheetnames:
        ws = wb['bank']
        for r in range(2, ws.max_row + 1):
            sana = str(ws.cell(r, 1).value or '')[:10]
            summa = ws.cell(r, 7).value
            desc = str(ws.cell(r, 8).value or '').strip()
            col_fish = str(ws.cell(r, 9).value or '').strip()
            kurs = ws.cell(r, 10).value

            if not desc:
                continue

            target = None
            match_method = ""

            # 1. Pasport seriya va raqami orqali tekshirish
            m_pv = re.search(r'([A-Z]{2}\s*\d{7})', desc, re.I)
            if m_pv:
                pv_clean = m_pv.group(1).replace(' ', '').upper()
                if pv_clean in by_pv:
                    target = by_pv[pv_clean]
                    match_method = f"Pasport: {pv_clean}"

            # 2. JSHSHIR (PINFL) orqali tekshirish
            if not target:
                m_pin = re.search(r'\b([3-6]\d{13})\b', desc)
                if m_pin:
                    pin_clean = m_pin.group(1)
                    if pin_clean in by_pin:
                        target = by_pin[pin_clean]
                        match_method = f"PINFL: {pin_clean}"

            # 3. FISH ustuni orqali tekshirish
            if not target and col_fish and col_fish != '?':
                cf_norm = normalize_name(col_fish)
                if cf_norm in by_name:
                    target = by_name[cf_norm]
                    match_method = f"FISH: {col_fish}"
                else:
                    for s_norm, s in by_name.items():
                        if len(cf_norm) >= 12 and (cf_norm in s_norm or s_norm in cf_norm):
                            target = s
                            match_method = f"FISH fuzzy: {col_fish}"
                            break

            # 4. Tavsif (desc) ichidagi ism orqali tekshirish
            if not target:
                desc_norm = normalize_name(desc)
                for s_norm, s in by_name.items():
                    if len(s_norm) >= 14 and s_norm in desc_norm:
                        target = s
                        match_method = f"Tavsifdagi ism"
                        break

            sh_num = extract_contract_number(desc)

            if target and sh_num:
                row_id = target['row']
                curr_sh = str(target.get('shnum') or '').strip()
                
                # Agar oldin topilmagan bo'lsa yoki yaxshiroq match bo'lsa
                if row_id not in extracted:
                    extracted[row_id] = {
                        'student': target,
                        'shnum': sh_num,
                        'source': match_method,
                        'sana': sana,
                        'summa': summa,
                        'desc': desc,
                        'old_shnum': curr_sh,
                        'is_new': (not curr_sh or curr_sh in ['—', '-'])
                    }

    print(f"Debitorka faylidan jami {len(extracted)} nafar talaba bo'yicha shartnoma ma'lumotlari aniqlandi.")

    # Yangi biriktiriladigan shartnomalar
    newly_found = [item for item in extracted.values() if item['is_new']]
    already_had = [item for item in extracted.values() if not item['is_new']]

    print(f"Bazada shartnomasi BO'LMAGAN talabalarga yangi topilgan shartnomalar: {len(newly_found)} nafar!")
    print(f"Bazada shartnomasi bo'lgan va debitorkada tasdiqlanganlar: {len(already_had)} nafar.")

    # 1. students.json va talabalar_bazasi.json ni yangilash
    # Shartnomasi bo'lmagan talabalarga shartnoma raqamini kiritamiz
    updated_rows = {}
    for item in newly_found:
        r_id = item['student']['row']
        updated_rows[r_id] = item['shnum']

    for s in students:
        r = s.get('row')
        if r in updated_rows:
            s['shnum'] = updated_rows[r]

    with open(STUDENTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(students, f, ensure_ascii=False, indent=2)

    if os.path.exists(BAZA_PATH):
        with open(BAZA_PATH, 'r', encoding='utf-8') as f:
            baza = json.load(f)
        baza_list = baza.get('students', []) if isinstance(baza, dict) else baza
        for s in baza_list:
            r = s.get('row')
            if r in updated_rows:
                s['shnum'] = updated_rows[r]
        with open(BAZA_PATH, 'w', encoding='utf-8') as f:
            json.dump(baza, f, ensure_ascii=False, indent=2)

    print(f"data/students.json va data/talabalar_bazasi.json yangilandi (+{len(updated_rows)} ta shartnoma qo'shildi).")

    # 2. Excel hisobot yaratish
    out_wb = openpyxl.Workbook()
    # Varag' 1: Yangi topilgan shartnomalar
    ws1 = out_wb.active
    ws1.title = "Yangi biriktirilganlar"

    headers1 = [
        "T/R", "Guruh", "F.I.SH", "Pasport", "JSHSHIR", 
        "Yangi Shartnoma №", "To'lov sanasi", "To'lov summasi", 
        "Aniqlash usuli", "To'lov topshirig'i tavsifi"
    ]
    ws1.append(headers1)

    for idx, item in enumerate(sorted(newly_found, key=lambda x: (x['student'].get('group', ''), x['student'].get('fish', ''))), 1):
        st = item['student']
        ws1.append([
            idx,
            st.get('group', ''),
            st.get('fish', ''),
            st.get('pv', ''),
            st.get('pinfl', ''),
            item['shnum'],
            item['sana'],
            item['summa'],
            item['source'],
            item['desc']
        ])

    # Varag' 2: Tasdiqlangan mavjud shartnomalar
    ws2 = out_wb.create_sheet("Mavjud tasdiqlanganlar")
    headers2 = [
        "T/R", "Guruh", "F.I.SH", "Bazada Shartnoma №", "Debitorkada Shartnoma №", 
        "Holati", "Aniqlash usuli", "Tavsif"
    ]
    ws2.append(headers2)

    for idx, item in enumerate(sorted(already_had, key=lambda x: (x['student'].get('group', ''), x['student'].get('fish', ''))), 1):
        st = item['student']
        old_sh = item['old_shnum']
        new_sh = item['shnum']
        match_status = "To'liq mos" if str(old_sh).strip() == str(new_sh).strip() else f"Farq bor (Bazada: {old_sh}, Deb: {new_sh})"
        ws2.append([
            idx,
            st.get('group', ''),
            st.get('fish', ''),
            old_sh,
            new_sh,
            match_status,
            item['source'],
            item['desc']
        ])

    # Formatlash
    thin = Side(border_style="thin", color="D1D5DB")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    font_head = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    fill_head = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")

    for ws_cur in [ws1, ws2]:
        for col_idx in range(1, ws_cur.max_column + 1):
            cell = ws_cur.cell(1, col_idx)
            cell.font = font_head
            cell.fill = fill_head
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = border

        for row_idx in range(2, ws_cur.max_row + 1):
            for col_idx in range(1, ws_cur.max_column + 1):
                c = ws_cur.cell(row_idx, col_idx)
                c.border = border
                if col_idx in [1, 2, 4, 5, 6, 7]:
                    c.alignment = Alignment(horizontal="center", vertical="center")

        # Auto width
        for col in ws_cur.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws_cur.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 60)

    out_wb.save(REPORT_PATH)
    print(f"Hisobot saqlandi: {REPORT_PATH}")

if __name__ == '__main__':
    main()
