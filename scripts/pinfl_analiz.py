# -*- coding: utf-8 -*-
"""
JSHSHIR (PINFL) TARKIBIY TAHLILI
=================================
O'zbekiston PINFL kodi 14 raqam:

    X  DDMMYY  RRR  SS  C
    1  2..7    8-10 11-13  14

  1      — jins + tug'ilgan asr  (3=erkak,4=ayol → 1900-lar; 5=erkak,6=ayol → 2000-lar)
  2..7   — tug'ilgan sana KKOOYY
  8..10  — TUG'ILGAN JOY kodi (tuman/shahar)
  11..13 — tartib raqami
  14     — nazorat raqami ([7,3,1] og'irliklari, yig'indi mod 10)

Skript TEKSHIRUV/data.js dagi 24 ta yozuv + asosiy Excel bo'yicha:
  1) nazorat raqamini tekshiradi,
  2) PINFL ichidagi sanani pasportdagi sana bilan solishtiradi,
  3) PINFL ichidagi jins/asrni tekshiradi,
  4) hudud kodini pasportda yozilgan tug'ilgan joy bilan bog'lab,
     kod -> tuman lug'atini o'zi yig'adi va ziddiyatlarni ko'rsatadi.
"""
import json, os, re, sys, collections

sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = [7, 3, 1, 7, 3, 1, 7, 3, 1, 7, 3, 1, 7]


def nazorat_ok(p):
    if not re.fullmatch(r'\d{14}', p or ''):
        return None
    return sum(int(p[i]) * W[i] for i in range(13)) % 10 == int(p[13])


def parse(p):
    """PINFL ni bo'laklarga ajratadi."""
    if not re.fullmatch(r'\d{14}', p or ''):
        return None
    asr = {'1': (1800, 'E'), '2': (1800, 'A'), '3': (1900, 'E'), '4': (1900, 'A'),
           '5': (2000, 'E'), '6': (2000, 'A')}.get(p[0])
    kun, oy, yil = p[1:3], p[3:5], p[5:7]
    sana = None
    if asr:
        try:
            sana = '%02d.%02d.%04d' % (int(kun), int(oy), asr[0] + int(yil))
        except ValueError:
            sana = None
    return {'bayroq': p[0], 'asr': asr[0] if asr else None,
            'jins': asr[1] if asr else None, 'sana': sana,
            'hudud': p[7:10], 'tartib': p[10:13], 'nazorat': p[13]}


def yozuvlar():
    """TEKSHIRUV/data.js dan yozuvlarni o'qiydi (JS emas, oddiy matn sifatida)."""
    src = open(os.path.join(BASE, 'TEKSHIRUV', 'data.js'), encoding='utf-8').read()
    out = []
    for blok in src.split('\n{\n')[1:]:
        def g(key, ichida=blok):
            m = re.search(key + r':"([^"]*)"', ichida)
            return m.group(1) if m else ''
        pas = re.search(r'pasport:\{(.*?)\},\n', blok, re.S)
        pas = pas.group(1) if pas else ''
        out.append({
            'royxat': g('royxat'),
            'familiya': g('familiya', pas).split(' (')[0],
            'ism': g('ism', pas),
            'otasi': g('otasi', pas),
            'tugilgan': g('tugilgan', pas),
            'jinsi': g('jinsi', pas),
            'joy': g('tugilgan_joy', pas),
            'pinfl': g('jshshir', pas),
            'organ': g('organ', pas),
        })
    return out


def excel_qoshimcha():
    """Asosiy Excel dagi PINFL lar — hudud lug'atini kengaytirish uchun."""
    try:
        import openpyxl
    except ImportError:
        return []
    yol = os.path.join(BASE, 'Talabalar_Toliq_Royxati.xlsx')
    if not os.path.exists(yol):
        return []
    ws = openpyxl.load_workbook(yol, read_only=True).active
    out = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        p = re.sub(r'\D', '', str(r[10] or ''))
        if len(p) == 14:
            out.append({'ifo': str(r[1] or '').strip(), 'pinfl': p,
                        'tugilgan': str(r[12] or '').strip()})
    return out


def main():
    Y = yozuvlar()
    bor = [y for y in Y if re.fullmatch(r'\d{14}', y['pinfl'] or '')]
    yoq = [y for y in Y if y not in bor]

    print('=' * 78)
    print('  JSHSHIR (PINFL) TARKIBIY TAHLILI  —  TEKSHIRUV/data.js')
    print('=' * 78)
    print(f"  Yozuvlar: {len(Y)}   |   PINFL bor: {len(bor)}   |   PINFL yo'q: {len(yoq)}")
    print()

    # ---- 1. Hudud kodi -> tug'ilgan joy lug'ati -------------------------------
    lug = collections.defaultdict(collections.Counter)
    for y in bor:
        if y['joy'] and y['joy'] != '—':
            lug[parse(y['pinfl'])['hudud']][y['joy']] += 1

    print('-' * 78)
    print('  1) HUDUD KODI (8-10 raqam)  ->  PASPORTDAGI TUG\'ILGAN JOY')
    print('-' * 78)
    for kod in sorted(lug):
        for joy, n in lug[kod].most_common():
            bel = '  ' if len(lug[kod]) == 1 else ' ‼'
            print(f"  {kod}{bel}{joy:<24} — {n} ta")
    print()

    # ---- 2. Har bir yozuv bo'yicha tekshiruv ----------------------------------
    print('-' * 78)
    print('  2) HAR BIR YOZUV BO\'YICHA TEKSHIRUV')
    print('-' * 78)
    xato_soni = 0
    for y in sorted(Y, key=lambda x: x['familiya'] or x['royxat']):
        nom = (y['familiya'] + ' ' + y['ism']).strip() or y['royxat']
        if not re.fullmatch(r'\d{14}', y['pinfl'] or ''):
            print(f"  ⚠  {nom:<32} PINFL YO'Q")
            continue
        d = parse(y['pinfl'])
        muam = []
        if nazorat_ok(y['pinfl']) is not True:
            muam.append('nazorat raqami XATO')
        if d['sana'] != y['tugilgan']:
            muam.append(f"sana mos emas (PINFL: {d['sana']}, pasport: {y['tugilgan']})")
        kutilgan = 'A' if y['jinsi'].lower().startswith('ayol') else 'E'
        if d['jins'] != kutilgan:
            muam.append(f"jins mos emas (PINFL: {d['jins']})")
        joylar = set(lug[d['hudud']])
        if y['joy'] and y['joy'] != '—' and len(joylar) > 1:
            muam.append(f"hudud kodi {d['hudud']} bir nechta joyga mos: {', '.join(sorted(joylar))}")
        bayroq = '❌' if muam else '✅'
        joy_nom = (lug[d['hudud']].most_common(1)[0][0] if lug[d['hudud']] else '?')
        print(f"  {bayroq} {nom:<32} {y['pinfl']}  "
              f"{d['bayroq']}|{d['sana']}|{d['hudud']}={joy_nom}|{d['tartib']}|{d['nazorat']}")
        for m in muam:
            xato_soni += 1
            print(f"        ↳ {m}")
    print()

    # ---- 3. PINFL yo'qlar uchun qayta tiklash --------------------------------
    if yoq:
        print('-' * 78)
        print('  3) PINFL YO\'Q — MA\'LUM MA\'LUMOTDAN QISMAN TIKLASH')
        print('-' * 78)
        for y in yoq:
            nom = (y['familiya'] + ' ' + y['ism']).strip() or y['royxat']
            t = y['tugilgan']
            m = re.fullmatch(r'(\d{2})\.(\d{2})\.(\d{4})', t or '')
            if not m:
                print(f"  ?  {nom:<32} tug'ilgan sana ham noma'lum")
                continue
            kk, oo, yyyy = m.groups()
            ayol = y['jinsi'].lower().startswith('ayol')
            b = ('6' if ayol else '5') if int(yyyy) >= 2000 else ('4' if ayol else '3')
            print(f"  ?  {nom:<32} {b}{kk}{oo}{yyyy[2:]}???????   "
                  f"(sana {t} dan; hudud kodi va tartib raqami noma'lum)")
        print()

    # ---- 4. Asosiy Excel bo'yicha lug'atni kengaytirish ----------------------
    qosh = excel_qoshimcha()
    if qosh:
        print('-' * 78)
        print(f"  4) ASOSIY EXCEL: {len(qosh)} ta PINFL")
        print('-' * 78)
        yomon = [q for q in qosh if nazorat_ok(q['pinfl']) is not True]
        print(f"  nazorat raqami xato: {len(yomon)}")
        for q in yomon[:20]:
            print(f"     ❌ {q['ifo'][:36]:<38} {q['pinfl']}")
        hud = collections.Counter(parse(q['pinfl'])['hudud'] for q in qosh)
        print(f"\n  Hudud kodlari tarqalishi ({len(hud)} xil kod):")
        for kod, n in hud.most_common():
            nomi = lug[kod].most_common(1)[0][0] if lug.get(kod) else '(noma\'lum)'
            print(f"     {kod}  {n:>4} ta   {nomi}")
        # sana mosligi
        nos = 0
        for q in qosh:
            d = parse(q['pinfl'])
            t = (q['tugilgan'] or '')[:10].replace('-', '.').strip()
            if re.fullmatch(r'\d{4}\.\d{2}\.\d{2}', t):
                t = '.'.join(reversed(t.split('.')))
            if t and d['sana'] and t != d['sana']:
                nos += 1
        print(f"\n  Tug'ilgan sana PINFL bilan mos emas: {nos} ta")
    print('=' * 78)
    print(f"  XULOSA: TEKSHIRUV bo'yicha {xato_soni} ta nomuvofiqlik topildi.")
    print('=' * 78)


if __name__ == '__main__':
    main()
