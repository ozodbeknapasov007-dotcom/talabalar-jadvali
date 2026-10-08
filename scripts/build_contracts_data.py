# -*- coding: utf-8 -*-
"""
KONTRAKTLAR VA QARZDORLIK MA'LUMOTLARINI YIG'ISH VA TAYYORLASH SKRIPTI
=====================================================================
Buxgalteriya fayli: 02.10.2026_GACHA_KONTRAKTLAR.xlsx
- Faqat talabalar bazasidagi (data/students.json) faol talabalar bog'lanadi.
- TSCH (safdan chiqarilganlar) va akademik ta'tildagilar QAT'IYAN chiqarilmaydi.
- Kontrakti ko'rinmasligi kerak bo'lgan talabalar (data/hidden_contracts.json)
  orqali yashiriladi va ularning holati belgilanadi.
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
HIDDEN_CONTRACTS_PATH = os.path.join(BASE_DIR, 'data', 'hidden_contracts.json')

# 02.10.2026 faylini izlash
candidate_paths = [
    os.path.join(BASE_DIR, 'Kontraktlar', '02.10.2026_GACHA_KONTRAKTLAR.xlsx'),
    os.path.join(BASE_DIR, '02.10.2026_GACHA_KONTRAKTLAR.xlsx'),
    os.path.join(BASE_DIR, 'Kontraktlar', '29.09.2026_GACHA_KONTRAKTLAR.xlsx'),
]

EXCEL_PATH = None
for p in candidate_paths:
    if os.path.exists(p):
        EXCEL_PATH = p
        break

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

def is_academic_or_withdrawn(g):
    gl = str(g or '').strip().lower()
    return 'akademik' in gl or 'chiqaril' in gl or 'chetlat' in gl or gl == 'n'

def build_contracts_data():
    if not EXCEL_PATH:
        raise FileNotFoundError("02.10.2026_GACHA_KONTRAKTLAR.xlsx fayli topilmadi")
    print(f"Manba fayl: {EXCEL_PATH}")

    # 1. Bazadagi talabalarni yuklash va faqat faollarni olish
    students_db = []
    if os.path.exists(STUDENTS_PATH):
        with open(STUDENTS_PATH, 'r', encoding='utf-8') as f:
            students_db = json.load(f)

    # Yashirilgan talabalar ro'yxati
    hidden_rows = set()
    hidden_records = {}
    if os.path.exists(HIDDEN_CONTRACTS_PATH):
        try:
            with open(HIDDEN_CONTRACTS_PATH, 'r', encoding='utf-8') as f:
                h_data = json.load(f)
                hidden_rows = set(h_data.get('hidden_student_rows', []))
                hidden_records = h_data.get('records', {})
        except Exception:
            pass

    # Faqat 2-3 kurs faol talabalari (Akademik va TSCH chiqarilgan!)
    active_students_db = []
    for s in students_db:
        grp = s.get('group', '')
        if is_academic_or_withdrawn(grp):
            continue
        if grp.startswith('26-'):
            # 1-kurs talabalari buxgalteriyaning ushbu varag'ida emas
            continue
        s_fio = s.get('fish') or f"{s.get('ism', '')} {s.get('ota', '')}".strip()
        s['fio'] = s_fio
        s['parts'] = clean_short(s_fio)
        active_students_db.append(s)

    print(f"Bazada faol 2-3 kurs talabalari soni: {len(active_students_db)}")

    wb_in = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws_k = wb_in['KONTRAKTLAR']

    # 2. YUQORI XULOSA JADVALI (Qatorlar 2 dan 14 gacha)
    top_summary = []
    for r in range(2, 15):
        rahbar = ws_k.cell(r, 3).value
        grp = ws_k.cell(r, 4).value
        soni = ws_k.cell(r, 5).value or 0
        qarz = ws_k.cell(r, 6).value or 0
        if grp:
            grp_str = str(grp).strip()
            top_summary.append({
                'row': r,
                'rahbar': str(rahbar or '').strip(),
                'group': grp_str,
                'kurs': kurs_of_group(grp_str),
                'students_count': int(soni),
                'total_debt': float(qarz),
            })

    # 3. ASOSIY TALABALAR JADVALI (Qatorlar 19 dan 340 gacha)
    kontrakt_rows = []
    for r in range(19, ws_k.max_row + 1):
        grp = ws_k.cell(row=r, column=1).value
        tr = ws_k.cell(row=r, column=2).value
        fio = ws_k.cell(row=r, column=3).value
        req = ws_k.cell(row=r, column=4).value or 0
        paid = ws_k.cell(row=r, column=5).value or 0
        debt = ws_k.cell(row=r, column=6).value or 0

        if fio and str(fio).strip().lower() != 'jami':
            fio_str = str(fio).strip()
            grp_str = str(grp or '').strip()
            kontrakt_rows.append({
                'file_row': r,
                'file_tr': tr if tr is not None else len(kontrakt_rows) + 1,
                'fio': fio_str,
                'group': grp_str,
                'kurs': kurs_of_group(grp_str),
                'req': float(req) if isinstance(req, (int, float)) else 0.0,
                'paid': float(paid) if isinstance(paid, (int, float)) else 0.0,
                'debt': float(debt) if isinstance(debt, (int, float)) else 0.0,
                'parts': clean_short(fio_str)
            })

    print(f"Buxgalteriya KONTRAKTLAR varag'idan o'qildi: {len(kontrakt_rows)} ta qator")

    # Baza talabalari bilan moslashtirish (Bijective)
    matched_to_db = {}
    matched_db_to_kr = {}
    used_db_rows = set()

    # Pass 1: exact parts & exact group
    for kr in kontrakt_rows:
        for s in active_students_db:
            if s['row'] in used_db_rows: continue
            if kr['parts'] == s['parts'] and kr['group'] == s.get('group'):
                matched_to_db[kr['file_row']] = s
                matched_db_to_kr[s['row']] = kr
                used_db_rows.add(s['row'])
                break

    # Pass 2: exact parts & any group
    for kr in kontrakt_rows:
        if kr['file_row'] in matched_to_db: continue
        for s in active_students_db:
            if s['row'] in used_db_rows: continue
            if kr['parts'] == s['parts']:
                matched_to_db[kr['file_row']] = s
                matched_db_to_kr[s['row']] = kr
                used_db_rows.add(s['row'])
                break

    # Pass 3: fuzzy match
    for kr in kontrakt_rows:
        if kr['file_row'] in matched_to_db: continue
        best_sim = 0
        best_s = None
        for s in active_students_db:
            if s['row'] in used_db_rows: continue
            sim = SequenceMatcher(None, ' '.join(kr['parts']), ' '.join(s['parts'])).ratio()
            if sim > best_sim and sim >= 0.70:
                best_sim = sim
                best_s = s
        if best_s:
            matched_to_db[kr['file_row']] = best_s
            matched_db_to_kr[best_s['row']] = kr
            used_db_rows.add(best_s['row'])

    print(f"Baza bilan 100% bog'langan talabalar: {len(matched_to_db)} / {len(kontrakt_rows)}")

    # 4. Yagona ro'yxatni shakllantirish (Aynan fayldagi 322 talaba)
    contract_items = []
    for idx, kr in enumerate(kontrakt_rows, start=1):
        db_s = matched_to_db.get(kr['file_row'])
        s_row = db_s['row'] if db_s else None
        req = kr['req']
        paid = kr['paid']
        debt = kr['debt']
        pct = round((paid / req * 100), 1) if req > 0 else (100.0 if paid >= req else 0.0)

        is_hidden = s_row in hidden_rows if s_row else False
        hidden_meta = hidden_records.get(str(s_row), {}) if s_row else {}

        contract_items.append({
            'id': f"k_{kr['file_row']}",
            'tr': idx,
            'file_tr': kr['file_tr'],
            'student_row': s_row,
            'fish': db_s.get('fish') if db_s else kr['fio'],
            'contract_fio': kr['fio'],
            'base_fio': db_s.get('fish') if db_s else kr['fio'],
            'group': db_s.get('group') if db_s else kr['group'],
            'contract_group': kr['group'],
            'base_group': db_s.get('group') if db_s else kr['group'],
            'kurs': kr['kurs'],
            'pinfl': db_s.get('pinfl', '') if db_s else '',
            'shartnoma_summa': req,
            'tolangan_summa': paid,
            'qarzdorlik': debt,
            'tolov_foiz': pct,
            'holat': 'qarzdor' if debt > 0 else 'tolangan',
            'toifa': 'aktiv',
            'is_hidden': is_hidden,
            'hidden_reason': hidden_meta.get('reason', ''),
            'manba': f"KONTRAKTLAR (qator {kr['file_row']})",
            'source_sheet': 'KONTRAKTLAR',
            'source_row': kr['file_row']
        })

    # 5. Guruhlar bo'yicha agregat hisobot (Ko'rinadigan talabalar bo'yicha)
    visible_items = [it for it in contract_items if not it['is_hidden']]
    hidden_items = [it for it in contract_items if it['is_hidden']]

    groups_dict = {}
    for item in visible_items:
        g = item['group']
        if g not in groups_dict:
            groups_dict[g] = {
                'group': g,
                'kurs': item['kurs'],
                'rahbar': '',
                'total_students': 0,
                'contracts_count': 0,
                'total_req': 0.0,
                'total_paid': 0.0,
                'total_debt': 0.0,
                'debtors_count': 0,
                'paid_count': 0,
            }
        gr = groups_dict[g]
        gr['total_students'] += 1
        gr['contracts_count'] += 1
        gr['total_req'] += item['shartnoma_summa']
        gr['total_paid'] += item['tolangan_summa']
        if item['qarzdorlik'] > 0:
            gr['total_debt'] += item['qarzdorlik']
            gr['debtors_count'] += 1
        else:
            gr['paid_count'] += 1

    leader_map = {ts['group']: ts['rahbar'] for ts in top_summary}
    for g, gr in groups_dict.items():
        gr['rahbar'] = leader_map.get(g, '')
        gr['pay_percent'] = round((gr['total_paid'] / gr['total_req'] * 100), 1) if gr['total_req'] > 0 else 0.0

    group_summaries = list(groups_dict.values())
    group_summaries.sort(key=lambda x: (x['kurs'], x['group']))

    # 6. KPI hisoblash

    total_req = sum(item['shartnoma_summa'] for item in visible_items)
    total_paid = sum(item['tolangan_summa'] for item in visible_items)
    total_debt = sum(item['qarzdorlik'] for item in visible_items if item['qarzdorlik'] > 0)
    debtors_count = sum(1 for item in visible_items if item['qarzdorlik'] > 0)
    paid_full_count = sum(1 for item in visible_items if item['qarzdorlik'] <= 0)

    kpi = {
        'date': '02.10.2026',
        'file_name': os.path.basename(EXCEL_PATH),
        'total_students': len(contract_items),
        'visible_students': len(visible_items),
        'hidden_students_count': len(hidden_items),
        'total_groups': len(group_summaries),
        'total_req_sum': total_req,
        'total_paid_sum': total_paid,
        'total_debt_sum': total_debt,
        'total_debtors_count': debtors_count,
        'total_paid_full_count': paid_full_count,
        'total_pay_percent': round((total_paid / total_req * 100), 1) if total_req > 0 else 0.0,
        'updated_at': '02.10.2026'
    }

    result = {
        'kpi': kpi,
        'summary_table': top_summary,
        'groups': group_summaries,
        'students': contract_items,
        'hidden_rows': list(hidden_rows)
    }

    with open(OUTPUT_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n✅ data/contracts.json muvaffaqiyatli saqlandi:")
    print(f"   Bazada mavjud va bog'langan talabalar: {len(contract_items)}")
    print(f"   Ko'rsatiladigan: {len(visible_items)}, Yashirilgan: {len(hidden_items)}")
    print(f"   Qarzdorlik: {total_debt:,.2f} so'm ({debtors_count} nafar)")

if __name__ == '__main__':
    build_contracts_data()
