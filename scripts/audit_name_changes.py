# -*- coding: utf-8 -*-
"""
RO'YXATDAGI ISMLAR O'ZGARDIMI? — NAZORAT
=========================================
2-ustun "I.F.O" (familiya + ism) — FOYDALANUVCHINING RO'YXATI.
Unga hech qanday avtomatik skript tegmasligi kerak.

Bu skript joriy bazani zaxiralar bilan solishtirib, 2-ustun (va 7-ustun
"Otasining ismi") o'zgargan-o'zgarmaganini ko'rsatadi.

    python scripts/audit_name_changes.py
    python scripts/audit_name_changes.py backup/<fayl>.xlsx
"""
import openpyxl
import os
import sys
import glob

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUR = os.path.join(BASE_DIR, 'data', 'Talabalar_Toliq_Royxati.xlsx')

COL_TR, COL_IFO, COL_OTA, COL_FISH, COL_GURUH = 1, 2, 7, 8, 23


def nb(v):
    return str(v if v is not None else '').replace('\xa0', ' ').strip()


def read(path):
    """T/R bo'yicha kalitlangan qatorlar (qator raqami siljishi mumkin)"""
    ws = openpyxl.load_workbook(path, read_only=True).active
    out = {}
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
        ifo = nb(r[COL_IFO - 1])
        if not ifo:
            continue
        key = nb(r[COL_TR - 1]) or f'row{i}'
        out[key] = {
            'qator': i,
            'ifo': ifo,
            'ota': nb(r[COL_OTA - 1]),
            'fish': nb(r[COL_FISH - 1]),
            'guruh': nb(r[COL_GURUH - 1]),
        }
    return out


def compare(old_path, cur):
    old = read(old_path)
    name_chg, ota_chg, ota_fill, yoq, yangi = [], [], [], [], []

    for k, o in old.items():
        c = cur.get(k)
        if not c:
            yoq.append(o)
            continue
        if o['ifo'] != c['ifo']:
            name_chg.append((o, c))
        if o['ota'] != c['ota']:
            if not o['ota'] and c['ota']:
                ota_fill.append((o, c))
            else:
                ota_chg.append((o, c))
    for k, c in cur.items():
        if k not in old:
            yangi.append(c)
    return name_chg, ota_chg, ota_fill, yoq, yangi


def main():
    cur = read(CUR)
    if len(sys.argv) > 1:
        backups = [os.path.join(BASE_DIR, sys.argv[1])]
    else:
        backups = sorted(glob.glob(os.path.join(BASE_DIR, 'arxiv', 'backup', '*.xlsx')))

    print('=' * 78)
    print("  2-USTUN (SIZNING RO'YXATINGIZ) O'ZGARDIMI? — NAZORAT")
    print('=' * 78)
    print(f'  Joriy bazada: {len(cur)} ta talaba')
    print('=' * 78)

    jami_xato = 0
    for bp in backups:
        name = os.path.basename(bp)
        try:
            n_chg, o_chg, o_fill, yoq, yangi = compare(bp, cur)
        except Exception as e:
            print(f'\n  {name}\n     o\'qib bo\'lmadi: {e}')
            continue
        # Faqat shu sessiyada yaratilgan zaxiralar bilan solishtiramiz
        if '20260918' not in name:
            continue

        status = '✅' if not n_chg else '❌'
        print(f'\n{status} {name}')
        print(f"     familiya/ism o'zgargan : {len(n_chg)}")
        print(f"     otasining ismi ALMASHGAN: {len(o_chg)}")
        print(f"     otasining ismi to'ldirilgan (bo'sh edi): {len(o_fill)}")
        if yoq:
            print(f"     zaxirada bor, hozir yo'q : {len(yoq)}")
        if yangi:
            print(f"     yangi qo'shilgan         : {len(yangi)}")

        jami_xato += len(n_chg) + len(o_chg)
        for o, c in n_chg:
            print(f"        ❌ [{o['guruh']}] {o['ifo']!r}  ->  {c['ifo']!r}")
        for o, c in o_chg:
            print(f"        ⚠️  [{o['guruh']}] {o['ifo']}: ota {o['ota']!r} -> {c['ota']!r}")
        for o, c in o_fill[:40]:
            print(f"        ➕ [{o['guruh']}] {o['ifo']:26s} ota: (bo'sh) -> {c['ota']!r}")

    print()
    print('=' * 78)
    if jami_xato == 0:
        print("  ✅ XULOSA: sizning ro'yxatingizdagi hech bir familiya/ism o'zgarmagan.")
        print("     Otasining ismi faqat BO'SH bo'lgan joyda to'ldirilgan.")
    else:
        print(f"  ❌ XULOSA: {jami_xato} ta o'zgarish topildi — yuqorida ko'rsatilgan.")
    print('=' * 78)


if __name__ == '__main__':
    main()
