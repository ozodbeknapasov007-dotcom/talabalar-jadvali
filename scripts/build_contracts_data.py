# -*- coding: utf-8 -*-
"""
KONTRAKTLAR VA QARZDORLIK MA'LUMOTLARINI YIG'ISH VA TAYYORLASH SKRIPTI
=====================================================================
Buxgalteriya fayli (Kontraktlar/29.09.2026_GACHA_KONTRAKTLAR.xlsx) va 
talabalar bazasi (data/students.json) o'rtasidagi to'liq shartnoma, to'lov
va qarzdorlik ko'rsatkichlarini hisoblab, web-platforma uchun data/contracts.json
faylini yaratadi.
"""

import os
import sys
import re
import json
from difflib import SequenceMatcher
from datetime import datetime
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDENTS_PATH = os.path.join(BASE_DIR, 'data', 'students.json')
EXCEL_PATH = os.path.join(BASE_DIR, 'Kontraktlar', '29.09.2026_GACHA_KONTRAKTLAR.xlsx')
OUTPUT_JSON_PATH = os.path.join(BASE_DIR, 'data', 'contracts.json')

def clean_short(s):
    if not s:
        return []
    s = s.lower()
    s = re.sub(r'[\'ʻʼ`‘´’\u2018\u2019\u02bb\u02bc]', '', s)
    s = re.sub(r'[\s\-\.\,]+', ' ', s)
    s = s.replace('sh', 's').replace('ch', 'c').replace('dj', 'j')
    s = s.replace('o‘', 'o').replace('g‘', 'g').replace("o'", "o").replace("g'", "g")
    s = s.replace('o’', 'o').replace('g’', 'g')
    s = s.replace('ya', 'ia').replace('yu', 'iu').replace('yo', 'io').replace('ye', 'e')
    s = s.replace('h', 'x').replace('q', 'k').replace('p', 'f').replace('b', 'p')
    s = s.replace('d', 't').replace('z', 's').replace('v', 'w')
    words = []
    for w in s.split():
        for suf in ['yeva', 'yev', 'ova', 'ov', 'qizi', 'ogli', 'kizi']:
            if w.endswith(suf) and len(w) > len(suf) + 2:
                w = w[:-len(suf)]
                break
        words.append(w)
    return words[:2]

def kurs_of_group(group_code):
    g = str(group_code or '').strip()
    if g.startswith('26-'):
        return 1
    if g.startswith('25-'):
        return 2
    if g.startswith('24-'):
        return 3
    return 0

def build_contracts_data():
    if not os.path.exists(STUDENTS_PATH):
        raise FileNotFoundError(f"{STUDENTS_PATH} topilmadi")
    if not os.path.exists(EXCEL_PATH):
        raise FileNotFoundError(f"{EXCEL_PATH} topilmadi")

    with open(STUDENTS_PATH, 'r', encoding='utf-8') as f:
        students_db = json.load(f)

    for s in students_db:
        s_fio = s.get('fish') or f"{s.get('ism', '')} {s.get('ota', '')}".strip()
        s['fio'] = s_fio
        s['parts'] = clean_short(s_fio)

    wb_in = openpyxl.load_workbook(EXCEL_PATH, data_only=True)

    # 1. KONTRAKTLAR varag'ini o'qish (Aktiv 2-3 kurs)
    ws_k = wb_in['KONTRAKTLAR']
    kontrakt_rows = []
    for r in range(19, ws_k.max_row + 1):
        fio = ws_k.cell(row=r, column=3).value
        grp = ws_k.cell(row=r, column=1).value
        req = ws_k.cell(row=r, column=4).value or 0
        paid = ws_k.cell(row=r, column=5).value or 0
        debt = ws_k.cell(row=r, column=6).value or 0
        if fio and str(fio).strip().lower() != 'jami':
            fio_str = str(fio).strip()
            kontrakt_rows.append({
                'sheet': 'KONTRAKTLAR',
                'row': r,
                'fio': fio_str,
                'grp': str(grp).strip(),
                'req': float(req) if isinstance(req, (int, float)) else 0.0,
                'paid': float(paid) if isinstance(paid, (int, float)) else 0.0,
                'debt': float(debt) if isinstance(debt, (int, float)) else 0.0,
                'parts': clean_short(fio_str)
            })

    # 2. Akademik.TSCH varag'ini o'qish
    ws_a = wb_in['Akademik.TSCH']
    akademik_rows = []
    for r in range(4, ws_a.max_row + 1):
        fio = ws_a.cell(row=r, column=3).value
        grp = ws_a.cell(row=r, column=1).value
        req = ws_a.cell(row=r, column=4).value or 0
        paid = ws_a.cell(row=r, column=5).value or 0
        debt = ws_a.cell(row=r, column=6).value or 0
        if fio and str(fio).strip().lower() != 'jami':
            fio_str = str(fio).strip()
            akademik_rows.append({
                'sheet': 'Akademik.TSCH',
                'row': r,
                'fio': fio_str,
                'grp': str(grp).strip(),
                'req': float(req) if isinstance(req, (int, float)) else 0.0,
                'paid': float(paid) if isinstance(paid, (int, float)) else 0.0,
                'debt': float(debt) if isinstance(debt, (int, float)) else 0.0,
                'parts': clean_short(fio_str)
            })

    # Bijective Matching
    matched_k_to_db = {}
    matched_db_to_k = {}
    used_db_rows = set()

    # Pass 1: exact parts match in same group
    for kr in kontrakt_rows:
        for s in students_db:
            if s['row'] in used_db_rows: continue
            if kr['parts'] == s['parts'] and kr['grp'] == s.get('group'):
                matched_k_to_db[kr['row']] = (s, 'Aniq moslik')
                matched_db_to_k[s['row']] = kr
                used_db_rows.add(s['row'])
                break

    # Pass 2: exact parts match in any group
    for kr in kontrakt_rows:
        if kr['row'] in matched_k_to_db: continue
        for s in students_db:
            if s['row'] in used_db_rows: continue
            if kr['parts'] == s['parts']:
                matched_k_to_db[kr['row']] = (s, 'Guruh farqi bilan moslik')
                matched_db_to_k[s['row']] = kr
                used_db_rows.add(s['row'])
                break

    # Pass 3: fuzzy in same group
    for kr in kontrakt_rows:
        if kr['row'] in matched_k_to_db: continue
        best_sim = 0
        best_s = None
        for s in students_db:
            if s['row'] in used_db_rows: continue
            if kr['grp'] == s.get('group'):
                sim = SequenceMatcher(None, ' '.join(kr['parts']), ' '.join(s['parts'])).ratio()
                if sim > best_sim and sim >= 0.70:
                    best_sim = sim
                    best_s = s
        if best_s:
            matched_k_to_db[kr['row']] = (best_s, f"O'xshashlik ({best_sim:.2f})")
            matched_db_to_k[best_s['row']] = kr
            used_db_rows.add(best_s['row'])

    # Pass 4: fuzzy cross group
    for kr in kontrakt_rows:
        if kr['row'] in matched_k_to_db: continue
        best_sim = 0
        best_s = None
        for s in students_db:
            if s['row'] in used_db_rows: continue
            sim = SequenceMatcher(None, ' '.join(kr['parts']), ' '.join(s['parts'])).ratio()
            if sim > best_sim and sim >= 0.72:
                best_sim = sim
                best_s = s
        if best_s:
            matched_k_to_db[kr['row']] = (best_s, f"Kross-guruh o'xshashlik ({best_sim:.2f})")
            matched_db_to_k[best_s['row']] = kr
            used_db_rows.add(best_s['row'])

    # Match Akademik.TSCH rows
    matched_a_to_db = {}
    matched_db_to_a = {}
    for ar in akademik_rows:
        for s in students_db:
            if s['row'] in matched_db_to_k or s['row'] in matched_db_to_a: continue
            if ar['parts'] == s['parts']:
                matched_a_to_db[ar['row']] = s
                matched_db_to_a[s['row']] = ar
                used_db_rows.add(s['row'])
                break
        if ar['row'] not in matched_a_to_db:
            best_sim = 0
            best_s = None
            for s in students_db:
                if s['row'] in matched_db_to_k or s['row'] in matched_db_to_a: continue
                sim = SequenceMatcher(None, ' '.join(ar['parts']), ' '.join(s['parts'])).ratio()
                if sim > best_sim and sim >= 0.70:
                    best_sim = sim
                    best_s = s
            if best_s:
                matched_a_to_db[ar['row']] = best_s
                matched_db_to_a[best_s['row']] = ar
                used_db_rows.add(best_s['row'])

    print(f"KONTRAKTLAR moslandi: {len(matched_k_to_db)} / {len(kontrakt_rows)}")
    print(f"Akademik.TSCH moslandi: {len(matched_a_to_db)} / {len(akademik_rows)}")

    # 3. Yagona talabalar kontrakt ro'yxatini shakllantirish
    contract_items = []

    # 1. Bazadagi barcha talabalarni aylanish
    for s in students_db:
        s_row = s['row']
        fio = s.get('fish') or s.get('ism', '')
        b_grp = s.get('group', '') or ''
        pinfl = s.get('pinfl', '') or ''
        tel = s.get('tel_shaxsiy') or s.get('tel', '') or ''
        kurs = kurs_of_group(b_grp)

        if s_row in matched_db_to_k:
            kr = matched_db_to_k[s_row]
            k_grp = kr['grp']
            req = kr['req']
            paid = kr['paid']
            debt = kr['debt']
            pct = round((paid / req * 100), 1) if req > 0 else (100.0 if paid >= req else 0.0)
            
            if debt > 0:
                fin_status = 'qarzdor'
            elif debt < 0:
                fin_status = 'avans'
            else:
                fin_status = 'tolangan'

            contract_items.append({
                'id': f"k_{s_row}",
                'student_row': s_row,
                'fish': fio,
                'contract_fio': kr['fio'],
                'group': b_grp,
                'contract_group': k_grp,
                'kurs': kurs or kurs_of_group(k_grp),
                'pinfl': pinfl,
                'tel': tel,
                'shartnoma_summa': req,
                'tolangan_summa': paid,
                'qarzdorlik': debt,
                'tolov_foiz': pct,
                'holat': fin_status,
                'toifa': 'aktiv',
                'manba': f"KONTRAKTLAR (qator {kr['row']})",
                'source_sheet': 'KONTRAKTLAR',
                'source_row': kr['row']
            })
        elif s_row in matched_db_to_a:
            ar = matched_db_to_a[s_row]
            k_grp = ar['grp']
            req = ar['req']
            paid = ar['paid']
            debt = ar['debt']
            pct = round((paid / req * 100), 1) if req > 0 else (100.0 if paid >= req else 0.0)

            if debt > 0:
                fin_status = 'qarzdor'
            elif debt < 0:
                fin_status = 'avans'
            else:
                fin_status = 'tolangan'

            contract_items.append({
                'id': f"a_{s_row}",
                'student_row': s_row,
                'fish': fio,
                'contract_fio': ar['fio'],
                'group': b_grp or k_grp,
                'contract_group': k_grp,
                'kurs': kurs or kurs_of_group(k_grp),
                'pinfl': pinfl,
                'tel': tel,
                'shartnoma_summa': req,
                'tolangan_summa': paid,
                'qarzdorlik': debt,
                'tolov_foiz': pct,
                'holat': fin_status,
                'toifa': 'akademik_tsg',
                'manba': f"Akademik.TSCH (qator {ar['row']})",
                'source_sheet': 'Akademik.TSCH',
                'source_row': ar['row']
            })
        else:
            # 1-kurs yoki boshqa kontrakt shakllanmagan talaba
            is_1kurs = b_grp.startswith('26-')
            contract_items.append({
                'id': f"n_{s_row}",
                'student_row': s_row,
                'fish': fio,
                'contract_fio': fio,
                'group': b_grp,
                'contract_group': b_grp,
                'kurs': kurs,
                'pinfl': pinfl,
                'tel': tel,
                'shartnoma_summa': 0.0,
                'tolangan_summa': 0.0,
                'qarzdorlik': 0.0,
                'tolov_foiz': 0.0,
                'holat': 'shartnoma_kutilmoqda' if is_1kurs else 'topilmadi',
                'toifa': '1-kurs' if is_1kurs else 'shartnomasiz',
                'manba': "Yangi qabul (shartnoma shakllanmagan)" if is_1kurs else "Buxgalteriya varag'ida yo'q",
                'source_sheet': '1 chi kurs' if is_1kurs else None,
                'source_row': None
            })

    # Shuningdek, KONTRAKTLAR varag'ida bo'lib, bazada topilmaganlar bo'lsa
    for kr in kontrakt_rows:
        if kr['row'] not in matched_k_to_db:
            debt = kr['debt']
            pct = round((kr['paid'] / kr['req'] * 100), 1) if kr['req'] > 0 else 0.0
            contract_items.append({
                'id': f"extra_k_{kr['row']}",
                'student_row': None,
                'fish': kr['fio'],
                'contract_fio': kr['fio'],
                'group': kr['grp'],
                'contract_group': kr['grp'],
                'kurs': kurs_of_group(kr['grp']),
                'pinfl': '',
                'tel': '',
                'shartnoma_summa': kr['req'],
                'tolangan_summa': kr['paid'],
                'qarzdorlik': debt,
                'tolov_foiz': pct,
                'holat': 'qarzdor' if debt > 0 else ('avans' if debt < 0 else 'tolangan'),
                'toifa': 'faqat_kontrakt',
                'manba': f"KONTRAKTLAR (qator {kr['row']}) - Bazada topilmadi",
                'source_sheet': 'KONTRAKTLAR',
                'source_row': kr['row']
            })

    # Shuningdek, Akademik.TSCH varag'ida bo'lib bazada topilmaganlar bo'lsa
    for ar in akademik_rows:
        if ar['row'] not in matched_a_to_db:
            debt = ar['debt']
            pct = round((ar['paid'] / ar['req'] * 100), 1) if ar['req'] > 0 else 0.0
            contract_items.append({
                'id': f"extra_a_{ar['row']}",
                'student_row': None,
                'fish': ar['fio'],
                'contract_fio': ar['fio'],
                'group': ar['grp'],
                'contract_group': ar['grp'],
                'kurs': kurs_of_group(ar['grp']),
                'pinfl': '',
                'tel': '',
                'shartnoma_summa': ar['req'],
                'tolangan_summa': ar['paid'],
                'qarzdorlik': debt,
                'tolov_foiz': pct,
                'holat': 'qarzdor' if debt > 0 else ('avans' if debt < 0 else 'tolangan'),
                'toifa': 'akademik_tsg',
                'manba': f"Akademik.TSCH (qator {ar['row']}) - Bazada topilmadi",
                'source_sheet': 'Akademik.TSCH',
                'source_row': ar['row']
            })

    # Saralash: Qarzdorlik kamayish tartibida (eng katta qarz birinchi), so'ng guruh va ism
    contract_items.sort(key=lambda x: (-x['qarzdorlik'], x['group'], x['fish']))

    # 4. Guruhlar bo'yicha agregat hisobot
    groups_dict = {}
    for item in contract_items:
        g = item['group'] or item['contract_group'] or 'Boshqa'
        if g not in groups_dict:
            groups_dict[g] = {
                'group': g,
                'kurs': item['kurs'] or kurs_of_group(g),
                'total_students': 0,
                'contracts_count': 0,
                'total_req': 0.0,
                'total_paid': 0.0,
                'total_debt': 0.0,
                'total_advance': 0.0,
                'debtors_count': 0,
                'paid_count': 0,
                'advance_count': 0,
            }
        gr = groups_dict[g]
        gr['total_students'] += 1
        if item['shartnoma_summa'] > 0 or item['tolangan_summa'] > 0:
            gr['contracts_count'] += 1
            gr['total_req'] += item['shartnoma_summa']
            gr['total_paid'] += item['tolangan_summa']
            if item['qarzdorlik'] > 0:
                gr['total_debt'] += item['qarzdorlik']
                gr['debtors_count'] += 1
            elif item['qarzdorlik'] < 0:
                gr['total_advance'] += abs(item['qarzdorlik'])
                gr['advance_count'] += 1
            else:
                gr['paid_count'] += 1

    group_summaries = list(groups_dict.values())
    for gr in group_summaries:
        gr['pay_percent'] = round((gr['total_paid'] / gr['total_req'] * 100), 1) if gr['total_req'] > 0 else 0.0

    group_summaries.sort(key=lambda x: (x['kurs'], x['group']))

    # 5. Umumiy KPI ko'rsatkichlari
    total_active_req = sum(item['shartnoma_summa'] for item in contract_items if item['source_sheet'] == 'KONTRAKTLAR')
    total_active_paid = sum(item['tolangan_summa'] for item in contract_items if item['source_sheet'] == 'KONTRAKTLAR')
    total_active_debt = sum(item['qarzdorlik'] for item in contract_items if item['source_sheet'] == 'KONTRAKTLAR' and item['qarzdorlik'] > 0)
    total_active_advance = abs(sum(item['qarzdorlik'] for item in contract_items if item['source_sheet'] == 'KONTRAKTLAR' and item['qarzdorlik'] < 0))
    total_active_debtors = sum(1 for item in contract_items if item['source_sheet'] == 'KONTRAKTLAR' and item['qarzdorlik'] > 0)
    total_active_paid_full = sum(1 for item in contract_items if item['source_sheet'] == 'KONTRAKTLAR' and item['qarzdorlik'] == 0)
    total_active_advance_count = sum(1 for item in contract_items if item['source_sheet'] == 'KONTRAKTLAR' and item['qarzdorlik'] < 0)

    # Akademik & TSCH
    total_akademik_debt = sum(item['qarzdorlik'] for item in contract_items if item['source_sheet'] == 'Akademik.TSCH' and item['qarzdorlik'] > 0)
    total_akademik_debtors = sum(1 for item in contract_items if item['source_sheet'] == 'Akademik.TSCH' and item['qarzdorlik'] > 0)

    total_1kurs = sum(1 for item in contract_items if item['toifa'] == '1-kurs')

    kpi = {
        'total_students_db': len(students_db),
        'total_contract_records': len(contract_items),
        'active_contracts_count': len(kontrakt_rows),
        'total_req_sum': total_active_req,
        'total_paid_sum': total_active_paid,
        'total_debt_sum': total_active_debt,
        'total_advance_sum': total_active_advance,
        'total_debtors_count': total_active_debtors,
        'total_paid_full_count': total_active_paid_full,
        'total_advance_count': total_active_advance_count,
        'total_pay_percent': round((total_active_paid / total_active_req * 100), 1) if total_active_req > 0 else 0.0,
        'akademik_debt_sum': total_akademik_debt,
        'akademik_debtors_count': total_akademik_debtors,
        'course1_count': total_1kurs,
        'updated_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    result = {
        'kpi': kpi,
        'groups': group_summaries,
        'students': contract_items
    }

    with open(OUTPUT_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"✅ data/contracts.json muvaffaqiyatli yaratildi:")
    print(f"   Jami talabalar: {len(contract_items)}")
    print(f"   Shartnoma summasi: {total_active_req:,.0f} so'm")
    print(f"   To'langan: {total_active_paid:,.0f} so'm")
    print(f"   Qarzdorlik: {total_active_debt:,.0f} so'm ({total_active_debtors} nafar)")
    print(f"   Ortiqcha to'lov: {total_active_advance:,.0f} so'm ({total_active_advance_count} nafar)")

if __name__ == '__main__':
    build_contracts_data()
