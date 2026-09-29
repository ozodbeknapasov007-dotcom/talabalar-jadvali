# -*- coding: utf-8 -*-
"""
QABUL - 2026.xlsx — barcha rasmiy guruhlar (GROUPS) bo'yicha qabul jadvali (administrator shabloni asosida).

Qatorlar va rasmiy EN / RU tarjimalar portal eksporti bilan AYNAN BIR XIL bo'lishi uchun
web/lib/qabul.ts dan olinadi (node web/scripts/qabul-rows.mjs orqali). Bu skript faqat
Excel faylni yozadi.

Manba: talabalar_bazasi.json. Bazada telefon bo'lmasa — shartnoma .docx dagi raqam.
"Jami" sahifasi birinchi, uning A ustunida "Guruhi" (qolganlari bittaga suriladi). Safdan chiqarilganlar kirmaydi.
"""
import json
import os
import subprocess
import sys

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shubhali_malumotlar_audit import GROUPS, load_students  # noqa: E402

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROWS_CLI = os.path.join(ROOT, 'web', 'scripts', 'qabul-rows.mjs')
QABUL_FILE = 'QABUL - 2026'  # web/lib/qabul.ts dagi QABUL_FILE bilan bir xil
OUT_SHABLON_2 = os.path.join(ROOT, 'hisobotlar', 'qabul', f'{QABUL_FILE}.xlsx')
OUT_DESKTOP = os.path.join(r'c:\Users\user\Desktop', f'{QABUL_FILE}.xlsx')
OUT_DIR_GROUPS = os.path.join(ROOT, 'hisobotlar', 'qabul', 'guruhlar')

# web/lib/qabul.ts dagi QABUL_HEADERS / QABUL_WIDTHS / QABUL_NAMUNA bilan bir xil
HEADERS = [
    '№', 'F.I.O', 'JSHSHIR', 'Pasport seriya raqami',
    'Tel raqam(pastdagi shablondagidek kiritilsin)', '2-Tel raqam(pastdagi shablondagidek kiritilsin)',
    'Yashash viloyat+tumani', 'UY manzili',
    'Avval o`qigan muassasa nomi(Uzbek tilida)', 'Avval o`qigan muassasa nomi(Ingliz tilida)',
    'Avval o`qigan muassasa nomi(Rus tilida)', 'Maktab, kollej va HK',
    'Avval olgan diplom seriya+raqami', 'Boshlagan va tugatgan yili',
]
GROUP_HEADER = 'Guruhi'
WIDTHS = [4.5, 36, 17.5, 15, 18, 18, 27, 18, 40, 44, 48, 15, 16.5, 15]
GROUP_WIDTH = 10
NAMUNA = ('Namuna: Saydalimov Anvarjon Sarvarjon o`g`li | 517******0016 | AC1686958 | 990201527 | Qashqadaryo, Qarshi | '
          '4-mittituman 21/23 | Qarshi shahar 1-maktab | Qarshi City School No. 1 | Школа №1 города Карши | Maktab | AA1775603 | 2008-2019')
REVIEW_COL = {'viloyat': 7, 'makEn': 10, 'makRu': 11}  # 1 dan boshlangan ustun
CENTER_COLS = {1, 3, 4, 5, 6, 12, 13, 14}  # guruh ustunisiz raqamlash


def qabul_rows(students: list[dict]) -> list[dict]:
    """web/lib/qabul.ts → qabulRow() natijalari (tartib saqlanadi)."""
    items = []
    for s in students:
        student = {k: v for k, v in s.items() if not k.startswith('_')}
        n = s['_n']
        if n.get('tel_manba') not in ('baza', ''):
            student['extraPhones'] = n['phones']
        items.append({'student': student, 'istisno': s.get('_ist') or None})
    res = subprocess.run(['node', ROWS_CLI], input=json.dumps(items, ensure_ascii=False).encode('utf-8'),
                         capture_output=True, check=True)
    return json.loads(res.stdout.decode('utf-8'))


def row_cells(r: dict, idx: int, with_group: bool) -> list:
    num9 = lambda t: int(t) if len(t) == 9 and t.isdigit() else t  # noqa: E731
    cells = [idx, r['fio'], r['pinfl'], r['pv'], num9(r['tel1']), num9(r['tel2']), r['viloyat'], r['manzil'],
             r['makUz'], r['makEn'], r['makRu'], r['eduType'], r['diplom'], r['yillar']]
    return [r['group']] + cells if with_group else cells


def populate_sheet(ws, rows: list[dict], title_note: str, with_group: bool = False):
    thin = Side(style='thin', color='000000')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    font_header = Font(name='Times New Roman', size=12, bold=True)
    font_cell = Font(name='Times New Roman', size=12)
    fill_header = PatternFill('solid', start_color='E8EEF5')
    fill_review = PatternFill('solid', start_color='FFF2CC')

    # "Jami" sahifasida A ustuni — Guruhi, qolganlari bittaga suriladi
    shift = 1 if with_group else 0
    headers = ([GROUP_HEADER] if with_group else []) + HEADERS
    widths = ([GROUP_WIDTH] if with_group else []) + WIDTHS
    for c, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(c)].width = w

    ws.cell(1, 2, title_note).font = Font(name='Times New Roman', size=11, bold=True, color='1E3A8A')
    ws.cell(2, 2, NAMUNA).font = Font(name='Times New Roman', size=10, italic=True, color='555555')
    ws.row_dimensions[3].height = 63.0
    for c, h in enumerate(headers, 1):
        cell = ws.cell(3, c, h)
        cell.font, cell.fill, cell.border = font_header, fill_header, border
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

    for idx, r in enumerate(sorted(rows, key=lambda x: x['fio'].lower()), 1):
        rr = idx + 3
        ws.row_dimensions[rr].height = 18.0
        review_cols = {REVIEW_COL[k] + shift for k in r['review'] if k in REVIEW_COL}
        for c, val in enumerate(row_cells(r, idx, with_group), 1):
            cell = ws.cell(rr, c, val if val != '' else None)
            cell.font, cell.border = font_cell, border
            center = c <= shift or (c - shift) in CENTER_COLS
            cell.alignment = Alignment(horizontal='center' if center else 'left', vertical='center')
            if c - shift == 3:
                cell.number_format = '@'
            if c in review_cols:
                cell.fill = fill_review
    ws.freeze_panes = 'D4' if with_group else 'C4'


def main():
    students = load_students()
    official = [s for s in students if s.get('group') in GROUPS]
    rows = qabul_rows(official)
    by_group = {g: [r for r in rows if r['group'] == g] for g in GROUPS}
    groups = [g for g in GROUPS if by_group[g]]

    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    ws_all = wb.create_sheet(title=f"Jami ({len(rows)} nafar)")
    populate_sheet(ws_all, rows, f"Barcha rasmiy guruhlar ({groups[0]} .. {groups[-1]}) — Jami {len(rows)} nafar talaba",
                   with_group=True)
    for g in groups:
        ws = wb.create_sheet(title=f"Guruh {g}")
        populate_sheet(ws, by_group[g], f"Guruh {g} — Qabul uchun ma'lumotlar ({len(by_group[g])} nafar talaba)")

    wb.save(OUT_SHABLON_2)
    print(f"Saved: {OUT_SHABLON_2}")
    try:
        wb.save(OUT_DESKTOP)
        print(f"Saved: {OUT_DESKTOP}")
    except Exception as e:
        print(f"Could not save to Desktop directly (may be open in Excel): {e}")

    os.makedirs(OUT_DIR_GROUPS, exist_ok=True)
    for g in groups:
        wb_g = openpyxl.Workbook()
        ws_g = wb_g.active
        ws_g.title = 'Лист1'
        populate_sheet(ws_g, by_group[g], f"Guruh {g} ({len(by_group[g])} nafar)")
        wb_g.save(os.path.join(OUT_DIR_GROUPS, f"{QABUL_FILE} ({g}).xlsx"))
    print(f"Saved {len(groups)} individual group templates in: {OUT_DIR_GROUPS}")
    for g in groups:
        print(f"  {g}: {len(by_group[g])} nafar")
    review = sum(1 for r in rows if r['review'])
    print(f"Qo'lda tekshirish kerak (sariq kataklar): {review} ta qator")


if __name__ == '__main__':
    main()
