# -*- coding: utf-8 -*-
"""
Qabul uchun shablon (2).xlsx formatida barcha 7 ta rasmiy guruh (26-01 .. 26-07)
va umumiy ro'yxatni ma'lumotlarni umuman chalkashtirmasdan tayyorlash skripti.
"""
import json
import os
import re
import sys
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDENTS_JSON = os.path.join(ROOT, 'students.json')
EXCEL_MAIN = os.path.join(ROOT, 'Talabalar_Toliq_Royxati.xlsx')
DESKTOP_OLD_SHABLON = r'c:\Users\user\Desktop\Qabul uchun shablon.xlsx'
OUT_SHABLON_2 = os.path.join(ROOT, 'Qabul uchun shablon (2).xlsx')
OUT_DESKTOP = r'c:\Users\user\Desktop\Qabul uchun shablon (2).xlsx'
OUT_DIR_GROUPS = os.path.join(ROOT, 'qabul_shablonlari')

GROUPS = ['26-01', '26-02', '26-03', '26-04', '26-05', '26-06', '26-07']

PINFL_DISTRICTS = {
    '559': 'Qashqadaryo, Shahrisabz tumani',
    '572': 'Qashqadaryo, Shahrisabz shahri',
    '568': 'Qashqadaryo, Kitob tumani',
    '264': 'Qashqadaryo, Kitob tumani',
    '570': "Qashqadaryo, Yakkabog' tumani",
    '253': "Qashqadaryo, Yakkabog' tumani",
    '566': 'Qashqadaryo, Qamashi tumani',
    '256': 'Qashqadaryo, Qamashi tumani',
    '563': 'Qashqadaryo, Chiroqchi tumani',
    '275': 'Qashqadaryo, Chiroqchi tumani',
    '564': "Qashqadaryo, G'uzor tumani",
    '259': "Qashqadaryo, G'uzor tumani",
    '558': 'Qashqadaryo, Qarshi shahri',
    '560': 'Qashqadaryo, Qarshi tumani',
    '561': 'Qashqadaryo, Koson tumani',
    '562': 'Qashqadaryo, Kasbi tumani',
    '565': 'Qashqadaryo, Dehqonobod tumani',
    '567': 'Qashqadaryo, Mirishkor tumani',
    '569': 'Qashqadaryo, Muborak tumani',
    '571': 'Qashqadaryo, Nishon tumani',
    '789': 'Surxondaryo viloyati',
    '549': 'Samarqand viloyati',
}

DISTRICT_KEYWORDS = [
    (r'shahrisabz\s+sh', 'Qashqadaryo, Shahrisabz shahri', 'Shahrisabz City', 'города Шахрисабз'),
    (r'shahrisabz', 'Qashqadaryo, Shahrisabz tumani', 'Shahrisabz District', 'Шахрисабзского района'),
    (r'kitob', 'Qashqadaryo, Kitob tumani', 'Kitob District', 'Китобского района'),
    (r'yakkabog', "Qashqadaryo, Yakkabog' tumani", 'Yakkabog District', 'Яккабагского района'),
    (r'qamashi', 'Qashqadaryo, Qamashi tumani', 'Qamashi District', 'Камашинского района'),
    (r'chiroqchi', 'Qashqadaryo, Chiroqchi tumani', 'Chiroqchi District', 'Чиракчинского района'),
    (r'ko[\'ʻ`\u2018\u2019]?kdala', "Qashqadaryo, Ko'kdala tumani", 'Kukdala District', 'Кукдалинского района'),
    (r'g[\'ʻ`\u2018\u2019]?uzor', "Qashqadaryo, G'uzor tumani", 'Guzar District', 'Гузарского района'),
    (r'qarshi\s+sh', 'Qashqadaryo, Qarshi shahri', 'Qarshi City', 'города Карши'),
    (r'qarshi', 'Qashqadaryo, Qarshi tumani', 'Qarshi District', 'Каршинского района'),
    (r'koson', 'Qashqadaryo, Koson tumani', 'Koson District', 'Касанского района'),
    (r'kasbi', 'Qashqadaryo, Kasbi tumani', 'Kasbi District', 'Касбинского района'),
    (r'dehqonobod', 'Qashqadaryo, Dehqonobod tumani', 'Dehqonobod District', 'Дехканабадского района'),
    (r'mirishkor', 'Qashqadaryo, Mirishkor tumani', 'Mirishkor District', 'Миришкорского района'),
    (r'muborak', 'Qashqadaryo, Muborak tumani', 'Muborak District', 'Мубарекского района'),
    (r'nishon', 'Qashqadaryo, Nishon tumani', 'Nishon District', 'Нишанского района'),
]


def clean_phone_9(raw: str) -> str:
    if not raw:
        return ''
    digits = re.sub(r'\D', '', str(raw))
    if len(digits) == 12 and digits.startswith('998'):
        digits = digits[3:]
    return digits if len(digits) == 9 else str(raw).strip()


def detect_district(mak: str, pinfl: str, manual_dist: str = '') -> tuple[str, str, str]:
    text = f"{manual_dist} {mak}".lower()
    for pat, uz, en, ru in DISTRICT_KEYWORDS:
        if re.search(pat, text):
            return uz, en, ru
    if len(pinfl) == 14:
        code = pinfl[7:10]
        uz = PINFL_DISTRICTS.get(code, '')
        if uz:
            for pat, u2, en, ru in DISTRICT_KEYWORDS:
                if u2 == uz:
                    return uz, en, ru
            return uz, 'Kashkadarya Region', 'Кашкадарьинской области'
    if manual_dist:
        return manual_dist, 'Kashkadarya Region', 'Кашкадарьинской области'
    return 'Qashqadaryo, Shahrisabz tumani', 'Shahrisabz District', 'Шахрисабзского района'


def classify_edu_type(mak: str, doc_tur: str, sh_doc: str, manual_type: str = '') -> str:
    if manual_type in ('Maktab', 'Kollej', 'Texnikum', 'Litsey'):
        return manual_type
    m = (mak or '').lower()
    s = (sh_doc or '').strip().upper()
    if 'texnikum' in m:
        return 'Texnikum'
    if 'kollej' in m or doc_tur == 'Diplom' or s.startswith(('K ', 'K0', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'D ')):
        return 'Kollej'
    if 'litsey' in m:
        return 'Litsey'
    return 'Maktab'


def translate_institution(mak: str, edu_type: str, dist_en: str, dist_ru: str, dist_uz: str) -> tuple[str, str, str]:
    raw = (mak or '').strip()
    num_match = re.search(r'(\d+)\s*-?\s*(?:sonli|son|maktab|IDUM|DIMI)', raw, re.IGNORECASE)
    if not num_match:
        num_match = re.search(r'\b(\d{1,3})\b', raw)
    school_no = num_match.group(1) if num_match else ''

    # Agar maktab nomi faqat "36-maktab" bo'lsa, tuman nomini ham qo'shib to'liq yozamiz
    short_dist_uz = dist_uz.replace('Qashqadaryo, ', '').strip()
    if not raw:
        if edu_type == 'Kollej':
            return f"{short_dist_uz} kasb-hunar kolleji", f"{dist_en} Vocational College", f"Профессиональный колледж {dist_ru}"
        return f"{short_dist_uz} umumiy o'rta ta'lim maktabi", f"{dist_en} Secondary School", f"Общеобразовательная школа {dist_ru}"

    uz_full = raw
    if school_no and len(raw) < 18 and 'tuman' not in raw.lower() and 'shahar' not in raw.lower():
        uz_full = f"{short_dist_uz} {school_no}-maktab"

    low = raw.lower()
    if 'tibbiyot kollej' in low or 'tibbiyot texnikum' in low:
        en = f"{dist_en} Medical College"
        ru = f"Медицинский колледж {dist_ru}"
    elif 'pedagogika kollej' in low:
        en = f"{dist_en} Pedagogical College"
        ru = f"Педагогический колледж {dist_ru}"
    elif 'sanoat' in low and 'kollej' in low:
        en = f"{dist_en} Industrial and Service Vocational College"
        ru = f"Профессиональный колледж промышленности и сервиса {dist_ru}"
    elif 'qurilish' in low or 'qurulish' in low:
        en = f"{dist_en} Construction Vocational College"
        ru = f"Строительный профессиональный колледж {dist_ru}"
    elif 'agro' in low and 'kollej' in low:
        en = f"{dist_en} Agro-Industrial Vocational College"
        ru = f"Агропромышленный профессиональный колледж {dist_ru}"
    elif edu_type == 'Kollej':
        en = f"{dist_en} Vocational College"
        ru = f"Профессиональный колледж {dist_ru}"
    elif edu_type == 'Texnikum':
        en = f"{dist_en} Technical College"
        ru = f"Техникум {dist_ru}"
    elif edu_type == 'Litsey':
        en = f"{dist_en} Academic Lyceum"
        ru = f"Академический лицей {dist_ru}"
    elif school_no:
        en = f"{dist_en} School No. {school_no}"
        ru = f"Школа №{school_no} {dist_ru}"
    else:
        en = f"{dist_en} Secondary School"
        ru = f"Общеобразовательная школа {dist_ru}"

    return uz_full, en, ru


def compute_study_years(yil: str, edu_type: str, manual_years: str = '') -> str:
    if manual_years and '-' in str(manual_years):
        return str(manual_years).strip()
    y_str = str(yil or '').strip()
    if re.match(r'^\d{4}\s*-\s*\d{4}$', y_str):
        return y_str.replace(' ', '')
    m = re.search(r'\b(19\d{2}|20\d{2})\b', y_str)
    if not m:
        return ''
    end_year = int(m.group(1))
    duration = 3 if edu_type in ('Kollej', 'Texnikum', 'Litsey') else 11
    return f"{end_year - duration}-{end_year}"


def load_manual_overrides() -> dict[str, dict]:
    overrides = {}
    if not os.path.exists(DESKTOP_OLD_SHABLON):
        return overrides
    try:
        wb = openpyxl.load_workbook(DESKTOP_OLD_SHABLON, data_only=True)
        ws = wb.active
        for r in range(5, ws.max_row + 1):
            pinfl = str(ws.cell(r, 3).value or '').strip()
            if len(pinfl) == 14:
                overrides[pinfl] = {
                    'tel1': clean_phone_9(ws.cell(r, 5).value),
                    'tel2': clean_phone_9(ws.cell(r, 6).value),
                    'dist': str(ws.cell(r, 7).value or '').strip(),
                    'addr': str(ws.cell(r, 8).value or '').strip(),
                    'mak': str(ws.cell(r, 9).value or '').strip(),
                    'edu_type': str(ws.cell(r, 11).value or '').strip(),
                    'sh_doc': str(ws.cell(r, 12).value or '').strip(),
                    'years': str(ws.cell(r, 13).value or '').strip(),
                }
    except Exception as e:
        print('Warning reading old shablon:', e)
    return overrides


HEADERS = [
    '№',
    'F.I.O',
    'JSHSHIR',
    'Pasport seriya raqami',
    'Tel raqam(pastdagi shablondagidek kiritilsin)',
    '2-Tel raqam(pastdagi shablondagidek kiritilsin)',
    'Yashash viloyat+tumani',
    'UY manzili',
    'Avval o`qigan muassasa nomi(Uzbek tilida)',
    'Avval o`qigan muassasa nomi(Ingliz tilida)',
    'Avval o`qigan muassasa nomi(Rus tilida)',
    'Maktab, kollej va HK',
    'Avval olgan diplom seriya+raqami',
    'Boshlagan va tugatgan yili',
]

COL_WIDTHS = {
    1: 4.5,
    2: 36.0,
    3: 17.5,
    4: 15.0,
    5: 18.0,
    6: 18.0,
    7: 27.0,
    8: 18.0,
    9: 36.0,
    10: 32.0,
    11: 34.0,
    12: 15.0,
    13: 16.5,
    14: 15.0,
}


def populate_sheet(ws, students_list: list[dict], overrides: dict[str, dict], title_note: str = ''):
    thin = Side(style='thin', color='000000')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    font_header = Font(name='Times New Roman', size=12, bold=True)
    font_sample = Font(name='Times New Roman', size=10, italic=True, color='555555')
    font_cell = Font(name='Times New Roman', size=12, bold=False)
    fill_header = PatternFill(start_color='E8EEF5', end_color='E8EEF5', fill_type='solid')
    fill_sample = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')

    for col_idx, width in COL_WIDTHS.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    if title_note:
        ws.cell(1, 2, title_note).font = Font(name='Times New Roman', size=11, bold=True, color='1E3A8A')
    ws.cell(2, 2, "Namuna: Saydalimov Anvarjon Sarvarjon o`g`li | 517******0016 | AC1686958 | 990201527 | Qashqadaryo, Qarshi | 4-mittituman 21/23 | Qarshi shahar 1-maktab | Qarshi City School No. 1 | Школа №1 города Карши | Maktab | AA1775603 | 2008-2019").font = font_sample

    ws.row_dimensions[3].height = 63.0
    for c_idx, h_text in enumerate(HEADERS, start=1):
        cell = ws.cell(3, c_idx, h_text)
        cell.font = font_header
        cell.fill = fill_header
        cell.border = border
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

    sorted_students = sorted(students_list, key=lambda x: f"{x.get('ism', '')} {x.get('ota', '')}".strip().lower())

    for idx, s in enumerate(sorted_students, start=1):
        r = idx + 3
        ws.row_dimensions[r].height = 18.0

        pinfl = str(s.get('pinfl') or '').strip()
        ov = overrides.get(pinfl, {})

        fio = f"{s.get('ism') or ''} {s.get('ota') or ''}".strip()
        pv = str(s.get('pv') or '').strip().upper().replace(' ', '')

        raw_tel = str(s.get('tel') or '').strip()
        tel_parts = [clean_phone_9(p) for p in re.split(r'[;,/]+', raw_tel) if p.strip()]
        tel1 = ov.get('tel1') or (tel_parts[0] if len(tel_parts) >= 1 else '')
        tel2 = ov.get('tel2') or (tel_parts[1] if len(tel_parts) >= 2 else '')

        mak_raw = ov.get('mak') or str(s.get('mak') or '').strip()
        sh_doc_raw = str(s.get('sh_doc') or ov.get('sh_doc') or '').strip().upper()
        if sh_doc_raw.startswith('=VLOOKUP'):
            sh_doc_raw = str(s.get('sh_doc') or '').strip().upper()

        dist_uz, dist_en, dist_ru = detect_district(mak_raw, pinfl, ov.get('dist', ''))
        edu_type = classify_edu_type(mak_raw, str(s.get('doc_tur') or ''), sh_doc_raw, ov.get('edu_type', ''))
        mak_uz, mak_en, mak_ru = translate_institution(mak_raw, edu_type, dist_en, dist_ru, dist_uz)
        years = compute_study_years(str(s.get('yil') or ''), edu_type, ov.get('years', ''))
        addr = ov.get('addr', '')

        row_values = [
            idx,
            fio,
            pinfl,
            pv,
            int(tel1) if tel1.isdigit() else tel1,
            int(tel2) if tel2.isdigit() else tel2,
            dist_uz,
            addr,
            mak_uz,
            mak_en,
            mak_ru,
            edu_type,
            sh_doc_raw,
            years,
        ]

        for c_idx, val in enumerate(row_values, start=1):
            cell = ws.cell(r, c_idx, val if val != '' else None)
            cell.font = font_cell
            cell.border = border
            if c_idx in (1, 3, 4, 5, 6, 12, 13, 14):
                cell.alignment = Alignment(horizontal='center', vertical='center')
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center')
            if c_idx == 3:
                cell.number_format = '@'


def main():
    with open(STUDENTS_JSON, 'r', encoding='utf-8') as f:
        students = json.load(f)

    overrides = load_manual_overrides()

    # Enrich students.json with any phone/mak from Desktop/Qabul uchun shablon.xlsx
    updated_count = 0
    for s in students:
        pinfl = str(s.get('pinfl') or '').strip()
        ov = overrides.get(pinfl)
        if ov:
            if not s.get('tel') and ov.get('tel1'):
                s['tel'] = ov['tel1'] + (f", {ov['tel2']}" if ov.get('tel2') else '')
                updated_count += 1
            if not s.get('mak') and ov.get('mak'):
                s['mak'] = ov['mak']
                updated_count += 1

    if updated_count > 0:
        with open(STUDENTS_JSON, 'w', encoding='utf-8') as f:
            json.dump(students, f, ensure_ascii=False, indent=2)
        print(f"Enriched {updated_count} fields in students.json from Desktop shablon.")

    # Build multi-sheet workbook (Each official group 26-01 .. 26-07 + Jami)
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    official_students = [s for s in students if s.get('group') in GROUPS]

    for g in GROUPS:
        g_students = [s for s in students if s.get('group') == g]
        ws = wb.create_sheet(title=f"Guruh {g}")
        populate_sheet(ws, g_students, overrides, title_note=f"Guruh {g} — Qabul uchun ma'lumotlar ({len(g_students)} nafar talaba)")

    ws_all = wb.create_sheet(title="Jami (165 nafar)")
    populate_sheet(ws_all, official_students, overrides, title_note=f"Barcha rasmiy guruhlar (26-01 .. 26-07) — Jami {len(official_students)} nafar talaba")

    wb.save(OUT_SHABLON_2)
    print(f"Saved: {OUT_SHABLON_2}")
    try:
        wb.save(OUT_DESKTOP)
        print(f"Saved: {OUT_DESKTOP}")
    except Exception as e:
        print(f"Could not save to Desktop directly (may be open in Excel): {e}")
        alt_desktop = r'c:\Users\user\Desktop\Qabul_uchun_shablon_7_guruh_tayyor.xlsx'
        wb.save(alt_desktop)
        print(f"Saved alternative Desktop copy: {alt_desktop}")

    os.makedirs(OUT_DIR_GROUPS, exist_ok=True)
    for g in GROUPS:
        wb_g = openpyxl.Workbook()
        ws_g = wb_g.active
        ws_g.title = 'Лист1'
        g_students = [s for s in students if s.get('group') == g]
        populate_sheet(ws_g, g_students, overrides, title_note=f"Guruh {g} ({len(g_students)} nafar)")
        out_g = os.path.join(OUT_DIR_GROUPS, f"Qabul_uchun_shablon_Guruh_{g}.xlsx")
        wb_g.save(out_g)
    print(f"Saved 7 individual group templates in: {OUT_DIR_GROUPS}")


if __name__ == '__main__':
    main()
