# -*- coding: utf-8 -*-
"""
2-BOSQICH: AI O'QIGAN PASPORT F.I.SH NI TEKSHIRISH
===================================================
1-bosqichda Gemini 2.5 Pro pasport bosma sahifasini o'qidi.
Bu yerda uning javobi MUSTAQIL manbalar bilan tekshiriladi va
TEKSHIRUVDAN O'TMAGAN QIYMAT EXCELGA YOZILMAYDI.

Tekshiruvlar:
  A. SHAXS LANGARI — AI to'g'ri hujjatga qaraganmi?
     pasport №, PINFL, tug'ilgan sana ID-karta MRZ (yoki baza) bilan mos kelishi shart.
     PINFL nazorat raqami (checksum) ham tekshiriladi.
  B. AI ISMNI TO'G'RI O'QIDIMI — familiya+ism MRZ bilan solishtiriladi
     (undosh skeleti usuli: transliteratsiyaga chidamli).
  C. OTASINING ISMI — MRZ da yo'q, shuning uchun shartnoma matni /
     e-shahodatnoma PDF / 7-ustun bilan solishtiriladi.
  D. SHAKL — "qizi"/"o'g'li" bilan tugashi, raqamsiz, 2-5 so'z.
  E. PASPORT vs RO'YXAT — 24-ustun holatini beradi (karantin emas, xabar).

    python scripts/verify_passport_names.py --scan     # faqat hisobot
    python scripts/verify_passport_names.py --apply    # 9 va 24-ustunga yozadi
"""
import os
import sys
import re
import json
import shutil
import datetime
import importlib.util

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(BASE_DIR, 'scripts')
EXCEL_PATH = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
RESULT_JSON = os.path.join(BASE_DIR, 'scratch', 'verify_results.json')
CACHE_DIR = os.path.join(BASE_DIR, 'scratch', 'passport_name_cache')
OUT_JSON = os.path.join(BASE_DIR, 'scratch', 'passport_name_check.json')
REPORT = os.path.join(BASE_DIR, 'PASPORT_ISMLARI.txt')

APPLY = '--apply' in sys.argv

import openpyxl
sys.path.insert(0, SCRIPTS)
from contract_names import read_contract_name


def _load(name, fname):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SCRIPTS, fname))
    mod = importlib.util.module_from_spec(spec)
    saved = sys.argv
    sys.argv = [name, '--scan']          # import paytida --apply ishlamasin
    try:
        spec.loader.exec_module(mod)
    finally:
        sys.argv = saved
    return mod


V = _load('verif', 'verify_all_students.py')
CK = _load('cksum', 'audit_pinfl_checksum.py')

nb = V.nb
clean_uz_name = V.clean_uz_name
classify_name = V.classify_name
pinfl_ok = CK.pinfl_ok

COL = {'ifo': 2, 'ota': 7, 'fish': 8, 'pass_fish': 9, 'pass': 10, 'pinfl': 11,
       'ber': 12, 'dob': 13, 'cert_fish': 14, 'guruh': 23, 'match': 24}

# O'zbekiston pasportlarida otasining ismi ikki shaklda uchraydi:
#   o'zbekcha — "Alisher qizi", "Sherali o'g'li"
#   ruscha    — "Odilovna", "Abdisamiyevna", "Farhodovich"
SUF_OK = re.compile(
    r"(?i)(\b(qizi|kizi|o'g'li|og'li|ogli|ugli)|"
    r"(ovna|yevna|evna|ovich|yevich|evich|ovna|ична|ович))\s*$")


def norm_pass(v):
    s = nb(v).upper().replace(' ', '').replace('-', '')
    m = re.match(r'^([A-Z]{2})(\d{7})$', s)
    return f"{m.group(1)}{m.group(2)}" if m else s


def norm_date(v):
    if isinstance(v, datetime.datetime):
        return v.strftime('%d.%m.%Y')
    s = nb(v)
    m = re.match(r'^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$', s)
    if m:
        return f"{int(m.group(1)):02d}.{int(m.group(2)):02d}.{m.group(3)}"
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        return f"{m.group(3)}.{m.group(2)}.{m.group(1)}"
    return s


def ai_passport_no(ans):
    """pass_series + pass_number -> 'AC1967100'"""
    ser = re.sub(r'[^A-Za-z]', '', nb(ans.get('pass_series'))).upper()
    num = re.sub(r'\D', '', nb(ans.get('pass_number')))
    if ser and num:
        return norm_pass(f'{ser}{num}')
    return norm_pass(ans.get('pass_number'))


def skel_same(a, b):
    """Ikki ism-bo'lagi bir xilmi (unli farqiga chidamli, undosh farqiga yo'q)"""
    a, b = nb(a), nb(b)
    if not a or not b:
        return None
    return V._skeleton(a) == V._skeleton(b)


def fish_parts(full):
    """'Xurramova Shodiya Arol qizi' -> ('Xurramova Shodiya', 'Arol qizi')"""
    t = nb(full).split()
    if len(t) < 2:
        return nb(full), ''
    return ' '.join(t[:2]), ' '.join(t[2:])


# ══════════════════════════════════════════════════════════════════
def load_cache():
    out = {}
    if not os.path.isdir(CACHE_DIR):
        return out
    for fn in os.listdir(CACHE_DIR):
        if not fn.endswith('.json'):
            continue
        try:
            d = json.load(open(os.path.join(CACHE_DIR, fn), encoding='utf-8'))
        except Exception:
            continue
        if d.get('file'):
            out[d['file']] = d
    return out


def build_rows():
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active
    rows = []
    for r in range(2, ws.max_row + 1):
        ifo = nb(ws.cell(row=r, column=COL['ifo']).value)
        if not ifo:
            continue
        rows.append({
            'row': r, 'ifo': ifo,
            'guruh': nb(ws.cell(row=r, column=COL['guruh']).value),
            'ota': nb(ws.cell(row=r, column=COL['ota']).value),
            'pass': norm_pass(ws.cell(row=r, column=COL['pass']).value),
            'pinfl': nb(ws.cell(row=r, column=COL['pinfl']).value),
            'dob': norm_date(ws.cell(row=r, column=COL['dob']).value),
            'cert_fish': nb(ws.cell(row=r, column=COL['cert_fish']).value),
        })
    return rows


def evaluate(st, scan, cache):
    """Bitta talabani baholaydi -> natija dict"""
    res = {'row': st['row'], 'ifo': st['ifo'], 'guruh': st['guruh'],
           'file': scan.get('file'), 'qabul': False, 'pass_fish': '',
           'holat24': '', 'sabab': [], 'manbalar': {}}

    rec = cache.get(scan.get('file') or '')
    if not rec or rec.get('holat') != 'OK' or not rec.get('natija'):
        res['sabab'].append("AI pasportni o'qiy olmadi")
        res['holat24'] = "PASPORT: O'QILMADI"
        return res
    ans = rec['natija']

    # ── manbalar ────────────────────────────────────────────────
    qr = scan.get('qr') or {}
    mrz_name = nb(qr.get('mrz_name'))
    mrz_pass = norm_pass(qr.get('pass'))
    mrz_pinfl = nb(qr.get('pinfl'))
    mrz_dob = norm_date(qr.get('dob'))

    c_fam = c_ota = ''
    if scan.get('file'):
        try:
            c_fam, c_ota = read_contract_name(
                os.path.join(BASE_DIR, 'files', scan['file']))
        except Exception:
            pass

    cert_fish = nb(qr.get('fish')) or st['cert_fish']
    cert_fam, cert_ota = fish_parts(cert_fish)

    ai_fam_ism = f"{nb(ans.get('surname'))} {nb(ans.get('name'))}".strip()
    ai_ota = nb(ans.get('patronymic'))
    ai_pass = ai_passport_no(ans)
    ai_pinfl = re.sub(r'\D', '', nb(ans.get('pinfl')))
    ai_dob = norm_date(ans.get('birth_date'))

    res['manbalar'] = {
        'AI': f"{ai_fam_ism} {ai_ota}".strip(),
        'MRZ': mrz_name, 'shartnoma': f"{c_fam} {c_ota}".strip(),
        'shahodatnoma': cert_fish, "ro'yxat": f"{st['ifo']} {st['ota']}".strip(),
    }

    # ── A. SHAXS LANGARI ────────────────────────────────────────
    if ai_pinfl and not pinfl_ok(ai_pinfl):
        res['sabab'].append(f"AI PINFL nazorat raqamidan o'tmadi: {ai_pinfl}")
        res['holat24'] = 'PASPORT: TEKSHIRILSIN (langar)'
        return res

    if mrz_pinfl or mrz_pass:
        bad = []
        if mrz_pinfl and ai_pinfl and ai_pinfl != mrz_pinfl:
            bad.append(f"PINFL: AI={ai_pinfl} MRZ={mrz_pinfl}")
        if mrz_pass and ai_pass and ai_pass != mrz_pass:
            bad.append(f"Pasport: AI={ai_pass} MRZ={mrz_pass}")
        if mrz_dob and ai_dob and ai_dob != mrz_dob:
            bad.append(f"Tug'ilgan: AI={ai_dob} MRZ={mrz_dob}")
        if bad:
            res['sabab'].append('AI MRZ bilan zid — ' + '; '.join(bad))
            res['holat24'] = 'PASPORT: TEKSHIRILSIN (langar)'
            return res
        res['langar'] = 'MRZ'
    else:
        # MRZ yo'q (biometrik pasport) — baza bilan solishtiramiz
        bad = []
        if st['pinfl'] and ai_pinfl and ai_pinfl != st['pinfl']:
            bad.append(f"PINFL: AI={ai_pinfl} baza={st['pinfl']}")
        if st['pass'] and ai_pass and ai_pass != st['pass']:
            bad.append(f"Pasport: AI={ai_pass} baza={st['pass']}")
        if st['dob'] and ai_dob and ai_dob != st['dob']:
            bad.append(f"Tug'ilgan: AI={ai_dob} baza={st['dob']}")
        if bad:
            res['sabab'].append('AI baza bilan zid — ' + '; '.join(bad))
            res['holat24'] = 'PASPORT: TEKSHIRILSIN (langar)'
            return res
        if not (st['pinfl'] or st['pass']):
            res['sabab'].append("Langar yo'q: na MRZ, na bazada pasport ma'lumoti bor")
            res['holat24'] = 'PASPORT: TEKSHIRILSIN (langar)'
            return res
        res['langar'] = 'baza'

    # ── B. AI ISMNI TO'G'RI O'QIDIMI ────────────────────────────
    controls = [('MRZ', mrz_name), ('shartnoma', c_fam),
                ('shahodatnoma', cert_fam), ("ro'yxat", st['ifo'])]
    verdicts = {k: classify_name(ai_fam_ism, v) for k, v in controls if nb(v)}
    if not verdicts:
        res['sabab'].append("Ismni solishtirish uchun manba yo'q")
        res['holat24'] = 'PASPORT: TEKSHIRILSIN (ism zid)'
        return res
    if not any(v in ('mos', 'imlo') for v in verdicts.values()):
        det = ', '.join(f'{k}={v}' for k, v in verdicts.items())
        res['sabab'].append(f"AI o'qigan familiya/ism hech bir manbaga mos emas ({det})")
        res['holat24'] = 'PASPORT: TEKSHIRILSIN (ism zid)'
        return res
    res['B_tasdiq'] = [k for k, v in verdicts.items() if v in ('mos', 'imlo')]

    # ── C. OTASINING ISMI ───────────────────────────────────────
    ota_ctl = [('shartnoma', c_ota), ('shahodatnoma', cert_ota), ("ro'yxat", st['ota'])]
    ota_ctl = [(k, v) for k, v in ota_ctl if nb(v)]
    if not ai_ota:
        res['sabab'].append("AI otasining ismini bermadi")
        res['holat24'] = 'PASPORT: TEKSHIRILSIN (ota ismi)'
        return res
    if ota_ctl:
        oks = [k for k, v in ota_ctl if skel_same(ai_ota.split()[0], nb(v).split()[0])]
        if not oks:
            det = '; '.join(f'{k}="{v}"' for k, v in ota_ctl)
            res['sabab'].append(f"Otasining ismi zid: AI=\"{ai_ota}\" | {det}")
            res['holat24'] = 'PASPORT: TEKSHIRILSIN (ota ismi zid)'
            return res
        res['C_tasdiq'] = oks
        ota_tasdiq = True
    else:
        ota_tasdiq = False

    # ── D. SHAKL ────────────────────────────────────────────────
    full = clean_uz_name(f"{ai_fam_ism} {ai_ota}")
    if not SUF_OK.search(full):
        res['sabab'].append(f"Otasining ismi 'qizi'/'o'g'li' bilan tugamaydi: {full}")
        res['holat24'] = 'PASPORT: TEKSHIRILSIN (shakl)'
        return res
    if re.search(r'\d', full) or not (2 <= len(full.split()) <= 5):
        res['sabab'].append(f"Shakl noto'g'ri: {full}")
        res['holat24'] = 'PASPORT: TEKSHIRILSIN (shakl)'
        return res

    # ── E. PASPORT vs RO'YXAT (karantin emas — xabar) ───────────
    # Uch daraja: aynan mos / imlo farqi (q-k, x-h, unli) / haqiqiy farq
    base_full = f"{st['ifo']} {st['ota']}".strip()

    def _plain(s):
        return re.sub(r"[`‘’ʻʼ´']", '', nb(s)).lower()

    aynan = _plain(ai_fam_ism) == _plain(st['ifo'])
    if st['ota']:
        aynan = aynan and _plain(ai_ota) == _plain(st['ota'])

    e = classify_name(ai_fam_ism, st['ifo'])
    ota_e = skel_same(ai_ota.split()[0], st['ota'].split()[0]) if st['ota'] else None

    if e == 'boshqa' or ota_e is False:
        holat = "PASPORT: RO'YXATDAN FARQ"
    elif aynan:
        holat = 'PASPORT: MOS'
    else:
        # bir odam, lekin yozuvi boshqacha (Arzikulova/Arziqulova, Dinora/Dinara)
        holat = 'PASPORT: IMLO FARQI'

    if not ota_tasdiq:
        holat += ' | OTA ISMI TASDIQLANMAGAN'

    res['qabul'] = True
    res['pass_fish'] = full
    res['holat24'] = holat
    res['baza_fish'] = base_full

    # ── BONUS: 7-ustun bo'sh bo'lsa, otasining ismini to'ldirish ────
    # Faqat AI va shartnoma matni MUSTAQIL ravishda bir xil aytganda.
    if not st['ota'] and 'shartnoma' in res.get('C_tasdiq', []):
        res['ota_toldir'] = clean_uz_name(ai_ota)
    return res


# ══════════════════════════════════════════════════════════════════
def main():
    if not os.path.exists(RESULT_JSON):
        print('❌ scratch/verify_results.json yo\'q'); sys.exit(1)
    scans = {s['row']: s for s in json.load(open(RESULT_JSON, encoding='utf-8'))}
    cache = load_cache()
    rows = build_rows()
    locked = V.load_locked()

    results = []
    for st in rows:
        scan = scans.get(st['row'], {})
        r = evaluate(st, scan, cache)
        r['qulflangan'] = (st['ifo'].lower(), st['guruh']) in locked
        results.append(r)

    json.dump(results, open(OUT_JSON, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    ok = [r for r in results if r['qabul']]
    rej = [r for r in results if not r['qabul'] and r['holat24'] != "PASPORT: O'QILMADI"]
    noread = [r for r in results if r['holat24'] == "PASPORT: O'QILMADI"]
    farq = [r for r in ok if r['holat24'].startswith("PASPORT: RO'YXATDAN FARQ")]
    imlo = [r for r in ok if r['holat24'].startswith('PASPORT: IMLO FARQI')]
    noota = [r for r in ok if 'TASDIQLANMAGAN' in r['holat24']]

    L = []
    def p(s=''):
        L.append(s); print(s)

    p('=' * 78)
    p('  PASPORTDAGI F.I.SH — 2-BOSQICH TEKSHIRUVI')
    p(f'  Sana: {datetime.datetime.now():%d.%m.%Y %H:%M}')
    p('=' * 78)
    p(f'  Jami talaba                    : {len(results)}')
    p(f"  ✅ Tekshiruvdan o'tdi (yoziladi): {len(ok)}")
    p(f"     ├ ro'yxat bilan aynan mos    : {len(ok) - len(farq) - len(imlo)}")
    p(f'     ├ imlo farqi (q/k, x/h, unli): {len(imlo)}')
    p(f"     └ RO'YXATDAN HAQIQIY FARQ    : {len(farq)}")
    p(f'  🛑 Rad etildi (yozilmaydi)      : {len(rej)}')
    p(f"  —  AI o'qiy olmadi              : {len(noread)}")
    p(f'  ⚠️  Otasining ismi tasdiqlanmagan: {len(noota)}')
    p('=' * 78)

    if rej:
        GURUHLAR = [
            ("Langar yo'q",
             "  ⚠️  LANGAR YO'Q — solishtirish uchun pasport ma'lumoti yo'q",
             "AI o'qidi, lekin bazada ham, QR da ham pasport №/PINFL yo'q.\n"
             "     Xato emas — shunchaki tasdiqlab bo'lmaydi."),
            ('zid',
             '  🛑 ZIDDIYAT — AI boshqacha o\'qidi',
             "AI javobi mustaqil manbalarga mos kelmadi. Rasmini o'zim ko'rishim kerak."),
            ('boshqa',
             '  🛑 BOSHQA SABAB',
             ''),
        ]

        def _tur(r):
            s = ' '.join(r['sabab'])
            if "Langar yo'q" in s:
                return "Langar yo'q"
            if 'zid' in s or 'mos emas' in s:
                return 'zid'
            return 'boshqa'

        for key, sarlavha, izoh in GURUHLAR:
            grp = [r for r in rej if _tur(r) == key]
            if not grp:
                continue
            p('')
            p('█' * 78)
            p(f'{sarlavha} ({len(grp)} ta)')
            if izoh:
                p(f'     {izoh}')
            p('█' * 78)
            for r in grp:
                p(f"\n  [{r['guruh']}] {r['ifo']}  (qator {r['row']})")
                p(f"      fayl  : {r['file']}")
                for s in r['sabab']:
                    p(f"      ❌ {s}")
                for k, v in r['manbalar'].items():
                    if v:
                        p(f"      {k:14s}: {v}")

    if farq:
        p('')
        p('█' * 78)
        p(f"  ❗ PASPORT RO'YXATDAN HAQIQIY FARQ QILADI ({len(farq)} ta)")
        p('     Boshqacha ism. Qiymat 9-ustunga yoziladi, lekin 2-ustun (sizning')
        p('     ro\'yxatingiz) O\'ZGARTIRILMAYDI — qarorni siz qabul qilasiz.')
        p('█' * 78)
        for r in farq:
            p(f"\n  [{r['guruh']}] qator {r['row']}")
            p(f"      ro'yxatda : {r['baza_fish']}")
            p(f"      pasportda : {r['pass_fish']}")
            p(f"      tasdiq    : {', '.join(r.get('B_tasdiq', []))}")

    if imlo:
        p('')
        p('-' * 78)
        p(f"  ≈ IMLO FARQI ({len(imlo)} ta) — bir odam, yozuvi boshqacha")
        p('    Rasmiy hujjatdagi yozuv q/k, x/h yoki unli harf bilan farq qiladi.')
        p('-' * 78)
        for r in imlo:
            p(f"\n  [{r['guruh']}] qator {r['row']}")
            p(f"      ro'yxatda : {r['baza_fish']}")
            p(f"      pasportda : {r['pass_fish']}")

    if noota:
        p('')
        p('-' * 78)
        p(f"  ⚠️  OTASINING ISMINI TASDIQLAB BO'LMADI ({len(noota)} ta)")
        p('     AI o\'qidi, lekin solishtirish uchun mustaqil manba yo\'q edi.')
        p('-' * 78)
        for r in noota:
            p(f"      [{r['guruh']}] {r['ifo']:28s} -> {r['pass_fish']}")

    if noread:
        p('')
        p('-' * 78)
        p(f"  📄 AI PASPORTNI O'QIY OLMADI ({len(noread)} ta)")
        p('-' * 78)
        for r in noread:
            p(f"      [{r['guruh']}] {r['ifo']:28s} fayl={r['file'] or '—'}")

    ota_fill = [r for r in ok if r.get('ota_toldir')]
    if ota_fill:
        p('')
        p('-' * 78)
        p(f"  ➕ BO'SH OTASINING ISMI TO'LDIRILADI ({len(ota_fill)} ta)")
        p('    Pasport (AI) va shartnoma matni mustaqil ravishda bir xil aytdi.')
        p('-' * 78)
        for r in ota_fill:
            p(f"      [{r['guruh']}] {r['ifo']:28s} -> {r['ota_toldir']}")

    lock_ok = [r for r in ok if r['qulflangan']]
    if lock_ok:
        p('')
        p('-' * 78)
        p(f"  🔒 QO'LDA TASDIQLANGAN QATORLAR ({len(lock_ok)} ta)")
        p('     Bu skript faqat 9 va 24-ustunga yozadi, boshqasiga tegmaydi.')
        p('-' * 78)
        for r in lock_ok:
            p(f"      [{r['guruh']}] {r['ifo']:28s} -> {r['pass_fish']}")

    p('')
    p('=' * 78)
    with open(REPORT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(L))
    print(f'\n📄 Hisobot: PASPORT_ISMLARI.txt')
    print(f'💾 scratch/passport_name_check.json')

    if not APPLY:
        print('\n🔍 SKAN rejimi — Excel o\'zgartirilmadi.')
        print('   Yozish uchun: python scripts/verify_passport_names.py --apply')
        return

    stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    bp = os.path.join(BASE_DIR, 'backup',
                      f'Talabalar_Toliq_Royxati_PASPORT_ISM_OLDIN_{stamp}.xlsx')
    os.makedirs(os.path.join(BASE_DIR, 'backup'), exist_ok=True)
    shutil.copy2(EXCEL_PATH, bp)

    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active
    ws.cell(row=1, column=COL['pass_fish'], value="Passport bo'yicha F.I.SH")
    n_w = n_ota = 0
    for r in results:
        if r['qabul']:
            ws.cell(row=r['row'], column=COL['pass_fish'], value=r['pass_fish'])
            n_w += 1
            # 7-ustun bo'sh bo'lsa va ikki mustaqil manba mos kelsa — to'ldiramiz
            if r.get('ota_toldir') and not nb(ws.cell(row=r['row'], column=COL['ota']).value):
                ws.cell(row=r['row'], column=COL['ota'], value=r['ota_toldir'])
                ism = nb(ws.cell(row=r['row'], column=COL['ifo']).value)
                ws.cell(row=r['row'], column=COL['fish'],
                        value=f"{ism} {r['ota_toldir']}".strip())
                n_ota += 1
        ws.cell(row=r['row'], column=COL['match'], value=r['holat24'])
    wb.save(EXCEL_PATH)

    print(f"\n✅ Zaxira: backup/{os.path.basename(bp)}")
    print(f"💾 9-ustunga yozildi   : {n_w} ta")
    print(f"💾 24-ustun yangilandi : {len(results)} ta")
    print(f"➕ Otasining ismi to'ldirildi: {n_ota} ta")
    print("   (rad etilganlarning 9-ustuniga TEGILMADI)")


if __name__ == '__main__':
    main()
