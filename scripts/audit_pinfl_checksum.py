# -*- coding: utf-8 -*-
"""
PINFL (JSHSHIR) NAZORAT RAQAMI BO'YICHA TEKSHIRUV
==================================================
O'zbekiston PINFL kodining 14-raqami — nazorat raqami.
Dastlabki 13 raqam [7,3,1] og'irliklari bilan ko'paytirilib,
yig'indining 10 ga bo'lgandagi qoldig'i 14-raqamga teng bo'lishi shart.

Bu QR dan mustaqil tekshiruv: bitta raqam xato terilgan bo'lsa ham aniqlaydi.
"""
import openpyxl, os, sys, re

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')

W = [7, 3, 1, 7, 3, 1, 7, 3, 1, 7, 3, 1, 7]


def pinfl_ok(p):
    if not re.fullmatch(r'\d{14}', p):
        return None
    s = sum(int(p[i]) * W[i] for i in range(13))
    return s % 10 == int(p[13])


def fix_candidates(p):
    """Bitta raqamni o'zgartirib to'g'ri qilish mumkin bo'lgan variantlar"""
    out = []
    for i in range(14):
        for d in '0123456789':
            if d == p[i]:
                continue
            c = p[:i] + d + p[i + 1:]
            if pinfl_ok(c):
                out.append((i, c))
    return out


def main():
    """Hisobot. Modul boshqa skriptdan import qilinganda ishlamaydi."""
    ws = openpyxl.load_workbook(EXCEL_PATH, read_only=True).active
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r[1]:
            rows.append({'ifo': str(r[1]).strip(), 'guruh': str(r[22] or '').strip(),
                         'pinfl': str(r[10] or '').strip(), 'dob': str(r[12] or '').strip()})

    have = [x for x in rows if x['pinfl']]
    bad = [x for x in have if pinfl_ok(x['pinfl']) is False]
    malformed = [x for x in have if pinfl_ok(x['pinfl']) is None]

    print('=' * 72)
    print('  PINFL NAZORAT RAQAMI TEKSHIRUVI')
    print('=' * 72)
    print(f"  PINFL mavjud          : {len(have)} / {len(rows)}")
    print(f"  ✅ nazorat raqami to'g'ri: {len(have) - len(bad) - len(malformed)}")
    print(f"  ❌ NAZORAT RAQAMI XATO : {len(bad)}")
    print(f"  ⚠️  formati noto'g'ri    : {len(malformed)}")
    print('=' * 72)

    if malformed:
        print('\n⚠️  FORMATI NOTO\'G\'RI:')
        for x in malformed:
            print(f"   [{x['guruh']}] {x['ifo']:28s} {x['pinfl']!r}")

    if bad:
        print('\n❌ NAZORAT RAQAMI MOS KELMAYDI — bu PINFL da xato bor:')
        for x in bad:
            print(f"\n   [{x['guruh']}] {x['ifo']}")
            print(f"      PINFL: {x['pinfl']}   (tug'ilgan: {x['dob'] or '—'})")
            cands = fix_candidates(x['pinfl'])
            if cands:
                print(f"      bitta raqam tuzatilsa to'g'ri bo'ladi ({len(cands)} variant):")
                for i, c in cands[:6]:
                    mark = ''.join('^' if k == i else ' ' for k in range(14))
                    print(f"         {c}")
                    print(f"         {mark}  ({i+1}-raqam: {x['pinfl'][i]} -> {c[i]})")
            else:
                print('      bitta raqam bilan tuzatib bo\'lmaydi')

    print('\n' + '=' * 72)


if __name__ == '__main__':
    main()
