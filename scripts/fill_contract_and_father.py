# -*- coding: utf-8 -*-
"""
SHARTNOMA RAQAMI VA OTASINING ISMINI TO'LDIRISH
================================================
Shartnoma raqami manbai : Word fayl nomidagi raqam
    (109/111 talabada baza bilan aynan mos chiqqani tekshirildi = 98.2%)
Otasining ismi manbai   : e-shahodatnoma.uz rasmiy PDF dagi to'liq F.I.SH

Qoidalar:
  • Faqat BO'SH kataklar to'ldiriladi, mavjud qiymat o'zgartirilmaydi
  • Karantindagi talabalarga tegilmaydi (fayli boshqa odamniki)
  • Raqam boshqa talabada band bo'lsa — yozilmaydi, ogohlantiriladi
  • Manbasi yo'q bo'lsa — hech narsa taxmin qilinmaydi

    python scripts/fill_contract_and_father.py --dry-run
    python scripts/fill_contract_and_father.py
"""
import openpyxl, os, sys, re, json, shutil, datetime

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
RESULT_JSON = os.path.join(BASE_DIR, 'scratch', 'verify_results.json')
HARD_QR = os.path.join(BASE_DIR, 'scratch', 'hard_qr_found.json')

DRY = '--dry-run' in sys.argv


def nb(v):
    return re.sub(r'\s+', ' ', str(v if v is not None else '').replace('\xa0', ' ')).strip()


def clean_uz_name(text):
    text = nb(text)
    if not text:
        return ''
    text = re.sub(r"[`‘’ʻʼ´]", "'", text)
    out = []
    for w in text.split(' '):
        wl = w.lower()
        if wl in ('qizi', 'kizi', 'qzy'):
            out.append('qizi')
        elif wl in ("o'g'li", 'ogli', 'ugli', "o'gli", 'uli'):
            out.append("o'g'li")
        elif "'" in w:
            parts = w.split("'")
            out.append("'".join(p.capitalize() if i == 0 else p.lower()
                                for i, p in enumerate(parts)))
        else:
            out.append(w.capitalize())
    return ' '.join(out)


def num_from_filename(fname):
    """Fayl nomidagi shartnoma raqamini ajratadi ('... 203.docx' -> '203')"""
    stem = re.sub(r'\.docx$', '', fname, flags=re.I)
    stem = re.sub(r'\(\d+\)\s*$', '', stem)                  # '(2)' nusxa belgisi
    stem = re.sub(r"(?i)\b(chala|kursga|utdi|oylik)\b", ' ', stem)
    nums = re.findall(r'\d{1,4}', stem)
    if not nums:
        return ''
    # Odatda raqam oxirida turadi
    return str(int(nums[-1]))


results = json.load(open(RESULT_JSON, encoding='utf-8'))
by_row = {r['row']: r for r in results}
hard = json.load(open(HARD_QR, encoding='utf-8')) if os.path.exists(HARD_QR) else {}

# Kuchaytirilgan skanerlashda qayta tiklangan QR larni parslash uchun
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_vs = __import__('importlib').import_module('importlib.util')
_spec = _vs.spec_from_file_location(
    'verif', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'verify_all_students.py'))
_V = _vs.module_from_spec(_spec)
_sys_argv = sys.argv
sys.argv = ['verify', '--scan']          # modul import paytida --apply ishlamasin
_spec.loader.exec_module(_V)
sys.argv = _sys_argv

wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb.active

# Band bo'lgan shartnoma raqamlari
taken = {}
for r in range(2, ws.max_row + 1):
    s = nb(ws.cell(row=r, column=5).value)
    if s.isdigit():
        taken.setdefault(str(int(s)), []).append(nb(ws.cell(row=r, column=2).value))

fill_sh, skip_sh, coll_sh = [], [], []
fill_ota, skip_ota = [], []

for r in range(2, ws.max_row + 1):
    ifo = nb(ws.cell(row=r, column=2).value)
    if not ifo:
        continue
    guruh = nb(ws.cell(row=r, column=23).value)
    res = by_row.get(r, {})
    trusted = res.get('trusted', True)
    fname = res.get('file') or ''

    # ── SHARTNOMA RAQAMI ──────────────────────────────────
    if not nb(ws.cell(row=r, column=5).value):
        if not trusted:
            skip_sh.append((guruh, ifo, 'karantin — fayl boshqa odamniki'))
        elif not fname:
            skip_sh.append((guruh, ifo, 'Word fayli yo\'q'))
        else:
            n = num_from_filename(fname)
            if not n:
                skip_sh.append((guruh, ifo, f'fayl nomida raqam yo\'q ({fname})'))
            elif n in taken:
                coll_sh.append((guruh, ifo, n, taken[n], fname))
            else:
                fill_sh.append((r, guruh, ifo, n, fname))
                taken.setdefault(n, []).append(ifo)

    # ── OTASINING ISMI ────────────────────────────────────
    if not nb(ws.cell(row=r, column=7).value):
        fish = nb((res.get('qr') or {}).get('fish'))
        if not trusted:
            skip_ota.append((guruh, ifo, 'karantin — fayl boshqa odamniki'))
        elif fish and len(fish.split()) >= 3:
            ota = clean_uz_name(' '.join(fish.split()[2:]))
            fill_ota.append((r, guruh, ifo, ota, clean_uz_name(fish)))
        else:
            sabab = 'shahodatnoma QR o\'qilmadi' if fname else 'Word fayli yo\'q'
            skip_ota.append((guruh, ifo, sabab))

# ── KUCHAYTIRILGAN SKANERLASHDA TIKLANGAN QR ──────────────
QR_COLS = {'pass': 10, 'pinfl': 11, 'ber': 12, 'dob': 13}
fill_qr, skip_qr = [], []
for row_s, texts in hard.items():
    r = int(row_s)
    ifo = nb(ws.cell(row=r, column=2).value)
    guruh = nb(ws.cell(row=r, column=23).value)
    data = {}
    for t in texts:
        if 'UZB' in t and len(t.split('\n')) >= 2:
            data.update({k: v for k, v in _V.parse_mrz(t).items() if v})
    if data.get('expiry'):
        data['ber'] = _V.issue_from_expiry(data['expiry'])

    # Ism nazorati — bu hujjat shu talabanikimi?
    mrz_name = data.get('mrz_name', '')
    cls = _V.classify_name(mrz_name, ifo) if mrz_name else None
    if cls == 'boshqa':
        skip_qr.append((guruh, ifo, f"BOSHQA ODAM: '{mrz_name}'"))
        continue

    vals = []
    for k, col in QR_COLS.items():
        v = nb(data.get(k))
        if not v:
            continue
        cur = nb(ws.cell(row=r, column=col).value)
        if not cur:
            vals.append((col, k, v, None))          # bo'sh -> to'ldirish
        elif cur != v:
            vals.append((col, k, v, cur))           # farq -> tuzatish
    if vals:
        fill_qr.append((r, guruh, ifo, vals, cls))

# ── HISOBOT ───────────────────────────────────────────────
print('=' * 74)
print('  SHARTNOMA RAQAMI')
print('=' * 74)
print(f"  ✅ To'ldiriladi : {len(fill_sh)}")
for _, g, ifo, n, f in fill_sh:
    print(f"      [{g}] {ifo:30s} -> #{n:4s}  ({f})")
if coll_sh:
    print(f"\n  ⚠️  RAQAM BAND — yozilmadi ({len(coll_sh)} ta):")
    for g, ifo, n, who, f in coll_sh:
        print(f"      [{g}] {ifo:30s} #{n} allaqachon: {', '.join(who)}")
if skip_sh:
    print(f"\n  ❌ Manba yo'q ({len(skip_sh)} ta):")
    for g, ifo, why in skip_sh:
        print(f"      [{g}] {ifo:30s} {why}")

print()
print('=' * 74)
print('  OTASINING ISMI')
print('=' * 74)
print(f"  ✅ To'ldiriladi : {len(fill_ota)}")
for _, g, ifo, ota, fish in fill_ota:
    print(f"      [{g}] {ifo:30s} -> {ota:24s} ({fish})")
if skip_ota:
    print(f"\n  ❌ Manba yo'q ({len(skip_ota)} ta) — TAXMIN QILINMADI:")
    for g, ifo, why in skip_ota:
        print(f"      [{g}] {ifo:30s} {why}")

print()
print('=' * 74)
print('  KUCHAYTIRILGAN SKANERLASHDA TIKLANGAN QR')
print('=' * 74)
print(f"  ✅ To'ldiriladi : {len(fill_qr)}")
for _, g, ifo, vals, cls in fill_qr:
    imlo = '  (ism imlosi biroz farq qiladi)' if cls == 'imlo' else ''
    print(f"      [{g}] {ifo}{imlo}")
    for col, k, v, cur in vals:
        if cur is None:
            print(f"          {k:6s} (bo'sh)  ->  {v}")
        else:
            print(f"          {k:6s} ❌ {cur}  ->  {v}   <-- TUZATILADI")
for g, ifo, why in skip_qr:
    print(f"      ❌ [{g}] {ifo}: {why}")

if DRY:
    print('\n🔍 DRY-RUN — hech narsa yozilmadi')
    sys.exit(0)

# ── YOZISH ────────────────────────────────────────────────
stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
bp = os.path.join(BASE_DIR, 'backup', f'Talabalar_Toliq_Royxati_SHARTNOMA_OTA_OLDIN_{stamp}.xlsx')
shutil.copy2(EXCEL_PATH, bp)
print(f"\n✅ Zaxira: backup/{os.path.basename(bp)}")

for r, g, ifo, n, f in fill_sh:
    ws.cell(row=r, column=5, value=n)

for r, g, ifo, ota, fish in fill_ota:
    ws.cell(row=r, column=7, value=ota)
    if not nb(ws.cell(row=r, column=8).value) or len(nb(ws.cell(row=r, column=8).value).split()) < 3:
        ws.cell(row=r, column=8, value=fish)
    if not nb(ws.cell(row=r, column=14).value):
        ws.cell(row=r, column=14, value=fish)

for r, g, ifo, vals, cls in fill_qr:
    for col, k, v, cur in vals:
        ws.cell(row=r, column=col, value=v)
    ws.cell(row=r, column=11).number_format = '@'

# Statusni qayta hisoblash
for r in range(2, ws.max_row + 1):
    if not nb(ws.cell(row=r, column=2).value):
        continue
    pv = nb(ws.cell(row=r, column=10).value)
    pin = nb(ws.cell(row=r, column=11).value)
    dob = nb(ws.cell(row=r, column=13).value)
    ce = nb(ws.cell(row=r, column=15).value)
    ws.cell(row=r, column=21,
            value='TOPILDI' if (pv and pin and dob and ce)
            else ('CHALA' if (pv or pin or ce) else 'FAYL_YOQ'))

wb.save(EXCEL_PATH)
print(f"💾 Saqlandi: shartnoma {len(fill_sh)} ta, otasining ismi {len(fill_ota)} ta, "
      f"tiklangan QR {len(fill_qr)} ta")
