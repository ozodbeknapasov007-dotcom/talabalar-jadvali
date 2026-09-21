# -*- coding: utf-8 -*-
"""
TALABALAR MA'LUMOTLARINI QR ORQALI TO'LIQ TEKSHIRISH
=====================================================
Manbalar (ikkalasi ham RASMIY, AI ISHLATILMAYDI):
  1. ID-karta QR kodi (ICAO TD1 MRZ) -> pasport, PINFL, tug'ilgan sana, amal muddati
  2. e-shahodatnoma.uz QR -> rasmiy PDF -> shahodatnoma raqami, F.I.SH, maktab, yil

Bosqich A (--scan) : faqat skanerlaydi, natijani JSON ga yozadi. HECH NARSA O'ZGARMAYDI.
Bosqich B (--apply): JSON asosida Excel ni yangilaydi (faqat tasdiqlangan maydonlar).

Ishlatish:
    python scripts/verify_all_students.py --scan
    python scripts/verify_all_students.py --apply
"""

import os, sys, io, re, json, time, datetime, difflib, urllib.request, urllib.error
import concurrent.futures as cf

import openpyxl
import docx
from PIL import Image

try:
    import zxingcpp
except ImportError:
    zxingcpp = None
try:
    import pypdf
except ImportError:
    pypdf = None

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
SOURCE_XLSX = os.path.join(BASE_DIR, "to'liq 1-KURS 2026-2027.xlsx")
FILES_DIR = os.path.join(BASE_DIR, 'files')
CACHE_DIR = os.path.join(BASE_DIR, 'scratch', 'qr_cache')
RESULT_JSON = os.path.join(BASE_DIR, 'scratch', 'verify_results.json')
REPORT_TXT = os.path.join(BASE_DIR, 'TEKSHIRUV_HISOBOTI.txt')

os.makedirs(CACHE_DIR, exist_ok=True)

MODE = '--apply' if '--apply' in sys.argv else '--scan'
WORKERS = 6


# ══════════════════════════════════════════════════════════════════
#  MATN NORMALLASHTIRISH
# ══════════════════════════════════════════════════════════════════

def nb(v):
    if v is None:
        return ''
    return re.sub(r'\s+', ' ', str(v).replace('\xa0', ' ')).strip()


def norm_name(s):
    """
    Ismlarni taqqoslash uchun normallashtiradi.
    MRZ transliteratsiyasi bazadagi o'zbek lotinidan farq qiladi:
      ARZIKULOVA <-> Arziqulova  (k/q)
      HAZRATOVA  <-> Xazratova   (h/x)
    """
    s = nb(s).lower()
    s = re.sub(r"[`‘’ʻʼ´'\-.,]", '', s)
    # fonetik ekvivalentlar
    s = s.replace('x', 'h').replace('q', 'k').replace('ц', 'ts')
    s = s.replace('sh', 's').replace('ch', 'c').replace('yo', 'o').replace('yu', 'u')
    s = re.sub(r'(o|u)+', 'o', s)
    s = re.sub(r'(e|i|y)+', 'i', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def name_tokens(s):
    """Familiya/ism tokenlari — 'qizi', 'o'g'li' kabi qo'shimchalarsiz"""
    SUF = {'kizi', 'kzi', 'ogli', 'oglu', 'oli', 'uli', 'ovic', 'ovna', 'evic', 'evna'}
    return [t for t in norm_name(s).split() if len(t) >= 3 and t not in SUF]


def levenshtein(a, b):
    if a == b:
        return 0
    if not a or not b:
        return max(len(a), len(b))
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def raw_tokens(s):
    """
    Ismni xom holicha tokenlarga ajratadi (unlilarni o'zgartirmasdan).
    'qizi', 'o'g'li' kabi qo'shimchalar tashlab yuboriladi.
    """
    SUF = {'qizi', 'kizi', 'qzy', "o'g'li", 'ogli', 'ugli', "o'gli", 'uli',
           'ovich', 'ovna', 'evich', 'evna'}
    s = re.sub(r"[`‘’ʻʼ´]", "'", nb(s)).lower()
    return [t for t in re.split(r'[^a-z\']+', s) if len(t) >= 3 and t not in SUF]


def _canon_id(w):
    """Hujjatlarda bir xil tovushning turlicha yozilishini birlashtiradi"""
    w = re.sub(r"[`‘’ʻʼ´']", '', nb(w)).lower()
    return w.replace('x', 'h').replace('q', 'k')


def _skeleton(w):
    """
    So'zning undosh skeleti — unli harflar olib tashlanadi.
    Imlo variantlari odatda FAQAT unlilarda farq qiladi:
        Mustafayeva / Mustafoyeva  -> mstfv   (bir odam)
        Shahzoda    / Shohzoda     -> shzd    (bir odam)
    Undosh farq qilsa — bu boshqa ism:
        Nematova    / Nurmatova    -> nmtv / nrmtv   (BOSHQA odam)
        Sabina      / Shabnam      -> sbn  / shbnm   (BOSHQA odam)
    """
    w = _canon_id(w)
    w = re.sub(r'[aeiouy]', '', w)
    return re.sub(r'(.)\1+', r'\1', w)          # qo'sh undoshlarni bittaga


def classify_name(qr_name, base_name):
    """
    QR/PDF dagi ism bazadagi ism bilan bir odamnikimi?
      'mos'    — to'liq mos (harf almashinuvi hisobga olinib)
      'imlo'   — bir odam, unli harf farqi (Dinara/Dinora, Shahzoda/Shohzoda)
      'boshqa' — BOSHQA ODAM: faylni biriktirish xato
      None     — aniqlab bo'lmadi
    """
    ta, tb = raw_tokens(qr_name), raw_tokens(base_name)
    if len(ta) < 1 or len(tb) < 1:
        return None

    pairs = [(ta[0], tb[0])]
    if len(ta) > 1 and len(tb) > 1:
        pairs.append((ta[1], tb[1]))

    if all(_canon_id(a) == _canon_id(b) for a, b in pairs):
        return 'mos'
    # Undosh skeleti bir xil bo'lsa — faqat unli farqi, ya'ni bir odam
    if all(_skeleton(a) == _skeleton(b) for a, b in pairs):
        return 'imlo'
    return 'boshqa'


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


def norm_pass(v):
    s = nb(v).upper().replace(' ', '')
    m = re.match(r'^([A-Z]{2})(\d{7})$', s)
    return f"{m.group(1)}{m.group(2)}" if m else s


def norm_cert(v):
    s = nb(v).upper()
    m = re.match(r'^([A-Z]{1,3})\s*(\d{5,10})$', s)
    if m:
        return f"{m.group(1)} {m.group(2).lstrip('0').zfill(len(m.group(2)))}"
    return s


def cert_digits(v):
    """Shahodatnoma raqamini faqat raqam sifatida (boshidagi nollarsiz) taqqoslash"""
    d = re.sub(r'\D', '', nb(v))
    return d.lstrip('0')


# ══════════════════════════════════════════════════════════════════
#  QR / MRZ PARSERLAR
# ══════════════════════════════════════════════════════════════════

def parse_mrz(text):
    """
    O'zbekiston ID-karta TD1 MRZ:
      IUUZBAE2261219361402095680050<
      0902148F3504082UZBUZB<<<<<<<<8
      ABDURAHMONOVA<<PARVINABONU<<<<
    """
    d = {}
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if len(lines) < 2:
        return d

    l1 = lines[0].replace('<', '')
    m = re.search(r'([A-Z]{2}\d{7})\d?([3-6]\d{13})', l1)
    if m:
        d['pass'] = m.group(1)
        d['pinfl'] = m.group(2)
    else:
        mp = re.search(r'((?:AA|AB|AC|AD|AE|AF|FA)\d{7})', l1)
        if mp:
            d['pass'] = mp.group(1)
        mi = re.search(r'([3-6]\d{13})', l1)
        if mi:
            d['pinfl'] = mi.group(1)

    if len(lines) >= 2:
        l2 = lines[1].replace('<', '')
        # YYMMDD + check + sex + YYMMDD(expiry) + check
        m2 = re.match(r'^(\d{6})(\d)([MF<])(\d{6})', l2)
        if m2:
            dob_raw, _, sex, exp_raw = m2.groups()
            d['dob'] = _yymmdd(dob_raw, past=True)
            d['expiry'] = _yymmdd(exp_raw, past=False)
            if sex in 'MF':
                d['sex'] = sex

    if len(lines) >= 3:
        mn = re.search(r'([A-Z]+)<<([A-Z<]+)', lines[2])
        if mn:
            fam = mn.group(1)
            rest = mn.group(2).replace('<', ' ').strip()
            d['mrz_name'] = f"{fam} {rest}".strip()

    return d


def _yymmdd(s, past=True):
    yy, mm, dd = int(s[:2]), int(s[2:4]), int(s[4:6])
    if past:
        year = 2000 + yy if yy <= 30 else 1900 + yy
    else:
        year = 2000 + yy
    try:
        datetime.date(year, mm, dd)
    except ValueError:
        return ''
    return f"{dd:02d}.{mm:02d}.{year}"


def issue_from_expiry(expiry):
    """
    O'zbekiston ID-kartasi 10 yilga beriladi va amal muddati
    berilgan sanadan 10 yil o'tib, bir kun oldin tugaydi.
      berilgan = amal_muddati - 10 yil + 1 kun
    (4/4 namunada aniq tasdiqlangan)
    """
    if not expiry:
        return ''
    try:
        d = datetime.datetime.strptime(expiry, '%d.%m.%Y').date()
        return (datetime.date(d.year - 10, d.month, d.day)
                + datetime.timedelta(days=1)).strftime('%d.%m.%Y')
    except Exception:
        return ''


def fetch_cert_pdf(url, retries=3):
    """e-shahodatnoma PDF ni yuklab oladi (diskda keshlanadi)"""
    key = re.sub(r'\W+', '_', url)[-120:]
    cache_f = os.path.join(CACHE_DIR, key + '.pdf')
    if os.path.exists(cache_f) and os.path.getsize(cache_f) > 1000:
        return open(cache_f, 'rb').read()

    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=25) as r:
                raw = r.read()
            if raw[:4] == b'%PDF':
                with open(cache_f, 'wb') as f:
                    f.write(raw)
                return raw
            last_err = 'PDF emas'
        except Exception as e:
            last_err = str(e)
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f'yuklab bo\'lmadi: {last_err}')


def parse_cert_pdf(raw):
    """
    e-shahodatnoma PDF matnidan ma'lumot ajratadi.
    Blank shablondan keyin qiymatlar ketma-ket keladi:
      03727987 / 14.02.2009 / F.I.SH / 2026 <joy> / ... / berilgan sana / maktab
    """
    d = {}
    if not pypdf:
        return d
    reader = pypdf.PdfReader(io.BytesIO(raw))
    text = "\n".join((p.extract_text() or '') for p in reader.pages)
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    d['doc_tur'] = 'Diplom' if re.search(r'(?i)\bdiplom\b', text[:600]) else 'Shahodatnoma'
    ser_m = re.search(r'\b(UM|AD|DD|SD)\s*№', text)
    ser = ser_m.group(1) if ser_m else 'UM'

    for l in lines:
        if re.match(r'^\d{7,8}$', l):
            d['cert'] = f"{ser} {l}"
            break

    for l in lines:
        if re.search(r"(?i)\b(qizi|o'g'li|ogli|ugli|kizi)\.?$", l) and len(l.split()) >= 3:
            d['fish'] = clean_uz_name(l)
            break

    # Tug'ilgan sanani ALOHIDA kalitda saqlaymiz — MRZ dagisini ustiga yozmasligi
    # va ikkalasini o'zaro solishtirish imkoni bo'lishi uchun
    dates = re.findall(r'\b(\d{2}\.\d{2}\.\d{4})\b', text)
    if dates:
        d['cert_dob'] = dates[0]
    if len(dates) > 1:
        d['cert_issued'] = dates[-1]

    for l in lines:
        m = re.match(r'^(\d{4})\s+(.{4,})$', l)
        if m and not re.search(r'(?i)(bahosi|score|fanlar)', l):
            d['yil'] = m.group(1)
            d['joy'] = m.group(2).strip()
            break

    for l in lines:
        if re.search(r"(?i)(maktab|litsey|kollej|texnikum|bilim yurti)", l):
            d['maktab'] = re.sub(r'(?i)ni$', '', l).strip()
            break

    return d


def scan_docx_qrs(path):
    """Docx ichidagi barcha rasmlardan QR kodlarni o'qiydi (4 burchakda + kattalashtirib)"""
    texts = []
    if not zxingcpp:
        return texts
    try:
        d = docx.Document(path)
    except Exception as e:
        raise RuntimeError(f'docx ochilmadi: {e}')

    blobs = [r.target_part.blob for r in d.part.rels.values()
             if 'image' in r.target_ref and len(r.target_part.blob) > 2000]

    for b in blobs:
        try:
            img = Image.open(io.BytesIO(b)).convert('RGB')
        except Exception:
            continue
        found_here = False
        for angle in (0, 90, 180, 270):
            im = img.rotate(angle, expand=True) if angle else img
            for r in zxingcpp.read_barcodes(im):
                t = (r.text or '').strip()
                if t and t not in texts:
                    texts.append(t)
                    found_here = True
            if found_here:
                break
        # Topilmasa — 2x kattalashtirib qayta urinish (past sifatli skanlar uchun)
        if not found_here and max(img.size) < 1600:
            big = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
            for r in zxingcpp.read_barcodes(big):
                t = (r.text or '').strip()
                if t and t not in texts:
                    texts.append(t)
    return texts


# ══════════════════════════════════════════════════════════════════
#  FAYL <-> TALABA BOG'LANISHI
# ══════════════════════════════════════════════════════════════════

MANUAL_MAP = os.path.join(BASE_DIR, 'scripts', 'manual_file_map.json')


def _load_manual_cfg():
    if not os.path.exists(MANUAL_MAP):
        return {}
    try:
        return json.load(open(MANUAL_MAP, encoding='utf-8'))
    except Exception as e:
        print(f"⚠️  manual_file_map.json o'qilmadi: {e}")
        return {}


def load_manual_map():
    """Qo'lda tekshirilgan fayl bog'lanishlari — avtomatik qidiruvdan ustun"""
    out = {}
    data = _load_manual_cfg().get('fayllar', {})
    real = {f.lower(): f for f in os.listdir(FILES_DIR)}
    for key, val in data.items():
        if not isinstance(val, dict):
            continue
        ifo, _, guruh = key.partition('|')
        actual = real.get(str(val.get('file', '')).lower())
        if actual:
            out[(ifo.strip().lower(), guruh.strip())] = actual
        else:
            print(f"⚠️  qo'lda ko'rsatilgan fayl yo'q: {val.get('file')} ({key})")
    return out


def load_locked():
    """
    Qulflangan qatorlar — hujjat rasmidan qo'lda tasdiqlangan.
    Avtomatik skriptlar bu qatorlarga yozmaydi.
    Qaytaradi: {(ifo_kichik, guruh): sabab}
    """
    return {(k.partition('|')[0].strip().lower(), k.partition('|')[2].strip()): v
            for k, v in _load_manual_cfg().get('qulflangan', {}).items()}


def build_file_map():
    """
    Manba faylning "Word Fayli" ustuni — ishonchli bog'lanish.
    Qo'lda tekshirilganlar undan ham ustun turadi.
    Kalit: (I.F.O kichik harfda, guruh)
    """
    wb = openpyxl.load_workbook(SOURCE_XLSX, data_only=True)
    ws = wb.active
    fmap = {}
    real = {f.lower(): f for f in os.listdir(FILES_DIR)}
    for row in ws.iter_rows(min_row=13, values_only=True):
        guruh = nb(row[1])
        if guruh == 'N':
            continue
        fam, ism_ = clean_uz_name(row[3]), clean_uz_name(row[4])
        wfile = nb(row[16])
        if not wfile:
            continue
        actual = real.get(wfile.lower()) or real.get((wfile + '.docx').lower())
        if actual:
            fmap[(f"{fam} {ism_}".strip().lower(), guruh)] = actual

    fmap.update(load_manual_map())      # qo'lda tekshirilganlar ustun
    return fmap


def canon_match(s):
    """Taqqoslash uchun kanonik shakl — hujjatlardagi imlo tebranishlarini yumshatadi"""
    s = re.sub(r"[`‘’ʻʼ´']", '', nb(s)).lower()
    s = s.replace('x', 'h').replace('q', 'k').replace('u', 'o')
    return re.sub(r'[^a-z ]+', ' ', s).strip()


def file_stem_name(f):
    """Fayl nomidan ismni ajratadi (raqam va izohlarsiz)"""
    stem = re.sub(r'\.docx$', '', f, flags=re.I)
    stem = re.sub(r'\(\d+\)', ' ', stem)
    stem = re.sub(r'(?i)\b(chala|kursga|utdi|oylik)\b', ' ', stem)
    stem = re.sub(r'\d+', ' ', stem)
    stem = re.sub(r'(?i)(^|\s)n(\s|$)', ' ', stem)      # 'N 32' kabi belgilar
    return canon_match(stem)


def file_number(f):
    """Fayl nomidagi shartnoma raqami"""
    stem = re.sub(r'\.docx$', '', f, flags=re.I)
    stem = re.sub(r'\(\d+\)\s*$', '', stem)
    nums = re.findall(r'\d{1,4}', stem)
    return str(int(nums[-1])) if nums else None


def name_score(a, b):
    """0..1 — ikki ismning o'xshashligi (familiya va ism alohida tortiladi)"""
    ta, tb = canon_match(a).split(), canon_match(b).split()
    if not ta or not tb:
        return 0.0
    fam = difflib.SequenceMatcher(None, ta[0], tb[0]).ratio()
    if len(ta) > 1 and len(tb) > 1:
        giv = max(difflib.SequenceMatcher(None, x, y).ratio()
                  for x in ta[1:] for y in tb[1:])
        return fam * 0.55 + giv * 0.45
    return fam * 0.7


def build_candidates(students, all_files):
    """
    Har bir talaba uchun fayl nomzodlarini baholaydi.
    Shartnoma raqami eng kuchli belgi; nom o'xshashligi qo'shimcha tasdiq.
    Bitta fayl faqat bitta talabaga biriktiriladi (eng yuqori ball bo'yicha).
    """
    finfo = [(f, file_stem_name(f), file_number(f)) for f in all_files]
    pairs = []
    for st in students:
        shnum = str(st['shnum']).strip()
        shnum = str(int(shnum)) if shnum.isdigit() else None
        for f, fname, fnum in finfo:
            ns = name_score(st['ifo'], fname)
            num_hit = bool(shnum and fnum and shnum == fnum)
            if num_hit and ns >= 0.55:
                score, conf = 3.0 + ns, 'aniq'        # raqam + nom mos
            elif num_hit and ns >= 0.55:
                score, conf = 2.0 + ns, 'shubhali'    # raqam mos, nom zaifroq
            elif ns >= 0.88:
                score, conf = 1.0 + ns, 'aniq'        # nom kuchli mos
            elif ns >= 0.78:
                score, conf = ns, 'shubhali'
            else:
                continue
            pairs.append((score, conf, st['row'], f))

    # Ochko'z taqsimlash: eng yuqori balldan boshlab, 1 fayl -> 1 talaba
    pairs.sort(reverse=True, key=lambda p: p[0])
    taken_file, taken_row, out = set(), set(), {}
    for score, conf, row, f in pairs:
        if row in taken_row or f in taken_file:
            continue
        taken_row.add(row)
        taken_file.add(f)
        out[row] = (f, conf)
    return out


# ══════════════════════════════════════════════════════════════════
#  ASOSIY SKANERLASH
# ══════════════════════════════════════════════════════════════════

FIELDS = [
    ('pass',  10, 'Pasport/ID'),
    ('pinfl', 11, 'PINFL'),
    ('ber',   12, 'Berilgan sana'),
    ('dob',   13, "Tug'ilgan sana"),
    ('cert',  15, 'Shahodatnoma'),
    ('qr',    16, 'QR havola'),
    ('maktab', 17, 'Maktab'),
    ('doc_tur', 18, 'Hujjat turi'),
    ('yil',   19, 'Bitirgan yili'),
]


def load_students():
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active
    out = []
    for r in range(2, ws.max_row + 1):
        ifo = nb(ws.cell(row=r, column=2).value)
        if not ifo:
            continue
        out.append({
            'row': r,
            'tr': ws.cell(row=r, column=1).value,
            'ifo': ifo,
            'shnum': nb(ws.cell(row=r, column=5).value),
            'ota': nb(ws.cell(row=r, column=7).value),
            'fish': nb(ws.cell(row=r, column=8).value),
            'guruh': nb(ws.cell(row=r, column=23).value),
            'excel': {
                'pass':  norm_pass(ws.cell(row=r, column=10).value),
                'pinfl': nb(ws.cell(row=r, column=11).value),
                'ber':   norm_date(ws.cell(row=r, column=12).value),
                'dob':   norm_date(ws.cell(row=r, column=13).value),
                'cert':  norm_cert(ws.cell(row=r, column=15).value),
                'qr':    nb(ws.cell(row=r, column=16).value),
                'maktab': nb(ws.cell(row=r, column=17).value),
                'doc_tur': nb(ws.cell(row=r, column=18).value),
                'yil':   nb(ws.cell(row=r, column=19).value),
            },
        })
    return out


def process_one(st, fmap, cands):
    """Bitta talabani skanerlaydi — natija dict"""
    res = {'row': st['row'], 'tr': st['tr'], 'ifo': st['ifo'], 'guruh': st['guruh'],
           'shnum': st['shnum'], 'excel': st['excel'],
           'file': None, 'file_conf': None, 'qr': {}, 'warn': [], 'err': None}

    # 1) Manba jadvalidagi aniq ko'rsatma  2) nom/raqam bo'yicha nomzod
    key = (st['ifo'].lower(), st['guruh'])
    f = fmap.get(key)
    conf = 'manba' if f else None
    if not f:
        f, conf = cands.get(st['row'], (None, None))
    res['file'], res['file_conf'] = f, conf

    if not f:
        res['err'] = 'FAYL_TOPILMADI'
        return res

    path = os.path.join(FILES_DIR, f)
    try:
        texts = scan_docx_qrs(path)
    except Exception as e:
        res['err'] = f'SKAN_XATO: {e}'
        return res

    qr = {}
    for t in texts:
        if 'e-shahodatnoma.uz' in t or 'getcertpdf' in t:
            qr['qr'] = t
            try:
                pdf = fetch_cert_pdf(t)
                qr.update({k: v for k, v in parse_cert_pdf(pdf).items() if v})
            except Exception as e:
                res['warn'].append(f'Shahodatnoma PDF yuklanmadi: {e}')
        elif 'UZB' in t and len(t.split('\n')) >= 2:
            m = parse_mrz(t)
            if m.get('pass') or m.get('pinfl'):
                qr.update({k: v for k, v in m.items() if v})

    if qr.get('expiry'):
        qr['ber'] = issue_from_expiry(qr['expiry'])

    # ID-karta yo'q bo'lsa, tug'ilgan sanani shahodatnomadan olamiz
    if not qr.get('dob') and qr.get('cert_dob'):
        qr['dob'] = qr['cert_dob']

    if not qr:
        res['err'] = 'QR_TOPILMADI'
    res['qr'] = qr
    return res


def compare(res):
    """Excel va QR ni solishtiradi -> maydon bo'yicha holat"""
    ex, qr = res['excel'], res['qr']
    diffs, fills, oks = [], [], []

    for k, col, label in FIELDS:
        qv, ev = nb(qr.get(k)), nb(ex.get(k))
        if not qv:
            continue
        # taqqoslash normalizatsiyasi
        if k == 'cert':
            same = cert_digits(qv) == cert_digits(ev) if ev else False
        elif k == 'pass':
            same = norm_pass(qv) == norm_pass(ev)
        elif k in ('maktab', 'doc_tur'):
            same = norm_name(qv)[:22] == norm_name(ev)[:22] if ev else False
        else:
            same = qv == ev

        if not ev:
            fills.append((k, col, label, qv))
        elif same:
            oks.append((k, label))
        else:
            diffs.append((k, col, label, ev, qv))

    # ── ISM NAZORATI ────────────────────────────────────────────
    # Hujjatdagi ism bazadagiga mos kelmasa, bu BOSHQA ODAMNING hujjati.
    # Bunday holatda hech qanday ma'lumot ko'chirilmaydi (karantin).
    res['trusted'] = True
    for src, val in (('ID-karta MRZ', qr.get('mrz_name')),
                     ('Shahodatnoma PDF', qr.get('fish'))):
        if not val:
            continue
        c = classify_name(val, res['ifo'])
        if c == 'boshqa':
            res['trusted'] = False
            res['warn'].append(
                f"❌ BOSHQA ODAM — {src}: '{val}' | bazada: '{res['ifo']}' "
                f"(fayl: {res['file']})")
        elif c == 'imlo':
            res['warn'].append(
                f"imlo farqi — {src}: '{val}' | bazada: '{res['ifo']}'")

    # Tug'ilgan sana ikki rasmiy manbada har xil bo'lsa
    if qr.get('dob') and qr.get('cert_dob') and qr['dob'] != qr['cert_dob']:
        res['trusted'] = False
        res['warn'].append(
            f"❌ Tug'ilgan sana manbalarda har xil: ID-karta={qr['dob']} "
            f"shahodatnoma={qr['cert_dob']}")

    if not res['trusted']:
        # Karantin: taklif qilingan o'zgarishlar saqlanadi, lekin QO'LLANILMAYDI
        res['karantin'] = {'diffs': diffs, 'fills': fills}
        return [], [], oks

    return diffs, fills, oks


def detect_shared_documents(results):
    """
    Bitta hujjat (PINFL / pasport / shahodatnoma / fayl) bir nechta talabaga
    biriktirilgan bo'lsa — bog'lanish xato. Hammasi karantinga olinadi.
    """
    for field, label in (('pinfl', 'PINFL'), ('pass', 'Pasport'),
                         ('cert', 'Shahodatnoma'), ('qr', 'QR havola')):
        seen = {}
        for r in results:
            v = nb(r['qr'].get(field))
            if not v:
                continue
            seen.setdefault(v, []).append(r)
        for v, group in seen.items():
            if len(group) < 2:
                continue
            kimlar = ', '.join(f"{g['ifo']} [{g['guruh']}]" for g in group)
            for r in group:
                r['trusted'] = False
                r['warn'].append(
                    f"❌ Bir xil {label} ({v}) {len(group)} ta talabada: {kimlar}")
                if r.get('diffs') or r.get('fills'):
                    kar = r.setdefault('karantin', {'diffs': [], 'fills': []})
                    kar['diffs'] = kar.get('diffs', []) + r.get('diffs', [])
                    kar['fills'] = kar.get('fills', []) + r.get('fills', [])
                    r['diffs'], r['fills'] = [], []

    # Bitta docx fayl bir nechta talabaga biriktirilgan
    byfile = {}
    for r in results:
        if r.get('file'):
            byfile.setdefault(r['file'], []).append(r)
    for f, group in byfile.items():
        if len(group) < 2:
            continue
        kimlar = ', '.join(f"{g['ifo']} [{g['guruh']}]" for g in group)
        for r in group:
            r['trusted'] = False
            note = f"❌ Bir xil fayl ({f}) {len(group)} ta talabada: {kimlar}"
            if note not in r['warn']:
                r['warn'].append(note)
            if r.get('diffs') or r.get('fills'):
                kar = r.setdefault('karantin', {'diffs': [], 'fills': []})
                kar['diffs'] = kar.get('diffs', []) + r.get('diffs', [])
                kar['fills'] = kar.get('fills', []) + r.get('fills', [])
                r['diffs'], r['fills'] = [], []


def main_scan():
    if not zxingcpp:
        print('❌ zxingcpp o\'rnatilmagan — QR o\'qib bo\'lmaydi'); sys.exit(1)

    students = load_students()
    fmap = build_file_map()
    all_files = [f for f in os.listdir(FILES_DIR) if f.lower().endswith('.docx')]

    # Manbada ko'rsatilmagan talabalar uchun nomzod fayllarni aniqlaymiz
    rest = [st for st in students if (st['ifo'].lower(), st['guruh']) not in fmap]
    used = set(fmap.values())
    free_files = [f for f in all_files if f not in used]
    cands = build_candidates(rest, free_files)

    print(f"📋 Talabalar: {len(students)} ta")
    print(f"🔗 Manbadan aniq fayl bog'lanishi: {len(fmap)} ta")
    print(f"🔎 Nom/raqam bo'yicha topilgan    : {len(cands)} ta")
    print(f"📁 files/ dagi .docx: {len(all_files)} ta")
    print(f"🔍 Skanerlash boshlandi ({WORKERS} ta parallel oqim)...\n")

    results = []
    done = 0
    with cf.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(process_one, st, fmap, cands): st for st in students}
        for fut in cf.as_completed(futs):
            st = futs[fut]
            try:
                r = fut.result()
            except Exception as e:
                r = {'row': st['row'], 'tr': st['tr'], 'ifo': st['ifo'],
                     'guruh': st['guruh'], 'shnum': st['shnum'], 'excel': st['excel'],
                     'file': None, 'file_conf': None, 'qr': {},
                     'warn': [], 'err': f'KUTILMAGAN: {e}'}
            d, f_, o = compare(r)
            r['diffs'], r['fills'], r['oks'] = d, f_, o
            results.append(r)
            done += 1
            if done % 10 == 0 or done == len(students):
                print(f"   {done}/{len(students)} ...")

    detect_shared_documents(results)

    results.sort(key=lambda x: (x['guruh'], x['ifo']))
    with open(RESULT_JSON, 'w', encoding='utf-8') as fh:
        json.dump(results, fh, ensure_ascii=False, indent=1)
    print(f"\n💾 Natijalar: scratch/verify_results.json")
    write_report(results)
    return results


def write_report(results):
    L = []
    def p(s=''):
        L.append(s)
        print(s)

    n = len(results)
    no_file = [r for r in results if r['err'] == 'FAYL_TOPILMADI']
    no_qr = [r for r in results if r['err'] == 'QR_TOPILMADI']
    errs = [r for r in results if r['err'] and r['err'].startswith(('SKAN', 'KUTILMAGAN'))]
    with_diff = [r for r in results if r.get('diffs')]
    with_fill = [r for r in results if r.get('fills')]
    karantin = [r for r in results if not r.get('trusted', True)]
    with_warn = [r for r in results if r.get('warn') and r.get('trusted', True)]
    shubhali = [r for r in results if r['file_conf'] == 'shubhali']

    p('=' * 78)
    p('  QR ORQALI TEKSHIRUV HISOBOTI')
    p(f"  Sana: {datetime.datetime.now():%d.%m.%Y %H:%M}")
    p('=' * 78)
    p(f"  Jami talabalar             : {n}")
    p(f"  Word fayli topilmadi       : {len(no_file)}")
    p(f"  Faylda QR topilmadi        : {len(no_qr)}")
    p(f"  Skanerlashda xato          : {len(errs)}")
    p(f"  QR bilan tekshirildi       : {n - len(no_file) - len(no_qr) - len(errs)}")
    p('-' * 78)
    p(f"  🛑 KARANTIN (ishonchsiz)   : {len(karantin)} ta talaba  <-- QO'LDA HAL QILINSIN")
    p(f"  ❌ Ma'lumotda farq bor      : {len(with_diff)} ta talaba")
    p(f"  ➕ Bo'sh maydon to'ldiriladi: {len(with_fill)} ta talaba")
    p(f"  ⚠️  Ogohlantirish (imlo)     : {len(with_warn)} ta talaba")
    p(f"  ❓ Fayl bog'lanishi shubhali: {len(shubhali)} ta talaba")
    p('=' * 78)

    if karantin:
        p('')
        p('█' * 78)
        p('  🛑 KARANTIN — HUJJAT BOSHQA ODAMNIKI YOKI IKKI TALABAGA BIRIKTIRILGAN')
        p('     Bu talabalarga HECH QANDAY ma\'lumot yozilmaydi.')
        p('     Har birini qo\'lda tekshirib, to\'g\'ri faylni biriktirish kerak.')
        p('█' * 78)
        for r in karantin:
            p(f"\n  [{r['guruh']}] {r['ifo']}  (qator {r['row']}, shartnoma #{r['shnum'] or '-'})")
            p(f"      biriktirilgan fayl: {r['file']}")
            for w in r['warn']:
                p(f"      {w}")
            kar = r.get('karantin') or {}
            blocked = (kar.get('diffs') or []) + (kar.get('fills') or [])
            if blocked:
                p(f"      ── yozilmagan (bloklangan) qiymatlar:")
                for item in blocked:
                    if len(item) == 5:
                        _, _, label, ev, qv = item
                        p(f"         • {label}: {ev!r} -> {qv!r}")
                    else:
                        _, _, label, qv = item
                        p(f"         • {label}: (bo'sh) -> {qv!r}")

    if with_diff:
        p('')
        p('█' * 78)
        p("  ❌ FARQLAR — BAZADAGI QIYMAT RASMIY HUJJATGA MOS EMAS")
        p("     (QR = ID-karta / e-shahodatnoma.uz rasmiy ma'lumoti)")
        p('█' * 78)
        for r in with_diff:
            p(f"\n  [{r['guruh']}] {r['ifo']}  (qator {r['row']}, shartnoma #{r['shnum'] or '-'})")
            p(f"      fayl: {r['file']}")
            for k, col, label, ev, qv in r['diffs']:
                p(f"      • {label:16s} bazada: {ev!r}")
                p(f"        {'':16s} QR    : {qv!r}   <-- TO'G'RISI")

    if with_warn:
        p('')
        p('█' * 78)
        p('  ⚠️  OGOHLANTIRISHLAR — QO\'LDA TEKSHIRISH TAVSIYA ETILADI')
        p('█' * 78)
        for r in with_warn:
            p(f"\n  [{r['guruh']}] {r['ifo']}  (qator {r['row']})")
            p(f"      fayl: {r['file']}")
            for w in r['warn']:
                p(f"      ⚠ {w}")

    if shubhali:
        p('')
        p('█' * 78)
        p("  ❓ FAYL BOG'LANISHI SHUBHALI — bir nechta mos fayl topildi")
        p('█' * 78)
        for r in shubhali:
            p(f"  [{r['guruh']}] {r['ifo']:36s} -> {r['file']}")

    if no_file:
        p('')
        p('-' * 78)
        p(f"  📂 WORD FAYLI TOPILMADI ({len(no_file)} ta) — tekshirib bo'lmadi")
        p('-' * 78)
        for r in no_file:
            p(f"  [{r['guruh']}] {r['ifo']:36s} #{r['shnum'] or '-'}")

    if no_qr:
        p('')
        p('-' * 78)
        p(f"  🔍 FAYLDA QR TOPILMADI ({len(no_qr)} ta) — rasm sifati past yoki QR yo'q")
        p('-' * 78)
        for r in no_qr:
            p(f"  [{r['guruh']}] {r['ifo']:36s} -> {r['file']}")

    if errs:
        p('')
        p('-' * 78)
        p(f"  ⛔ XATOLAR ({len(errs)} ta)")
        p('-' * 78)
        for r in errs:
            p(f"  [{r['guruh']}] {r['ifo']:36s} {r['err']}")

    if with_fill:
        p('')
        p('-' * 78)
        p(f"  ➕ TO'LDIRILADIGAN BO'SH MAYDONLAR ({len(with_fill)} ta talaba)")
        p('-' * 78)
        for r in with_fill:
            flds = ', '.join(f"{lb}={v}" for _, _, lb, v in r['fills'])
            p(f"  [{r['guruh']}] {r['ifo']:34s} {flds[:150]}")

    p('')
    p('=' * 78)
    p("  Excelga yozish uchun:  python scripts/verify_all_students.py --apply")
    p('=' * 78)

    with open(REPORT_TXT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(L))
    print(f"\n📄 Hisobot: TEKSHIRUV_HISOBOTI.txt")


# ══════════════════════════════════════════════════════════════════
#  BOSQICH B — EXCELGA YOZISH
# ══════════════════════════════════════════════════════════════════

def main_apply():
    if not os.path.exists(RESULT_JSON):
        print('❌ Avval --scan ni ishga tushiring'); sys.exit(1)
    results = json.load(open(RESULT_JSON, encoding='utf-8'))

    import shutil
    os.makedirs(os.path.join(BASE_DIR, 'backup'), exist_ok=True)
    stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    bp = os.path.join(BASE_DIR, 'backup', f'Talabalar_Toliq_Royxati_QR_TEKSHIRUVDAN_OLDIN_{stamp}.xlsx')
    shutil.copy2(EXCEL_PATH, bp)
    print(f"✅ Zaxira: backup/{os.path.basename(bp)}")

    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active
    n_fix = n_fill = n_skip = n_lock = 0
    touched = set()
    locked = load_locked()

    for r in results:
        row = r['row']

        # Qo'lda tasdiqlangan qatorga tegilmaydi
        if (r['ifo'].strip().lower(), r['guruh'].strip()) in locked:
            n_lock += 1
            continue
        for k, col, label, ev, qv in r.get('diffs', []):
            ws.cell(row=row, column=col, value=qv)
            n_fix += 1
            touched.add(row)
        for k, col, label, qv in r.get('fills', []):
            ws.cell(row=row, column=col, value=qv)
            n_fill += 1
            touched.add(row)

        # Karantindagi talabaga hech narsa yozilmaydi
        if not r.get('trusted', True):
            prev = nb(ws.cell(row=row, column=22).value)
            note = 'KARANTIN: ' + '; '.join(r.get('warn', []))[:250]
            if 'KARANTIN:' not in prev:
                ws.cell(row=row, column=22, value=(prev + ' | ' + note).strip(' |'))
            n_skip += 1
            continue

        # F.I.SH va otasining ismini shahodatnoma PDF dan to'ldirish (bo'sh bo'lsa)
        pdf_fish = nb(r['qr'].get('fish'))
        if pdf_fish and not nb(ws.cell(row=row, column=7).value):
            parts = pdf_fish.split()
            if len(parts) >= 3:
                ws.cell(row=row, column=7, value=' '.join(parts[2:]))
                ws.cell(row=row, column=8, value=pdf_fish)
                ws.cell(row=row, column=14, value=pdf_fish)
                touched.add(row)

        # Statusni qayta hisoblash
        pv = nb(ws.cell(row=row, column=10).value)
        pin = nb(ws.cell(row=row, column=11).value)
        dob = nb(ws.cell(row=row, column=13).value)
        ce = nb(ws.cell(row=row, column=15).value)
        ws.cell(row=row, column=21,
                value='TOPILDI' if (pv and pin and dob and ce)
                else ('CHALA' if (pv or pin or ce) else 'FAYL_YOQ'))

        # PINFL matn formatida qolsin
        ws.cell(row=row, column=11).number_format = '@'

        if r.get('warn'):
            prev = nb(ws.cell(row=row, column=22).value)
            note = 'TEKSHIRILSIN: ' + '; '.join(r['warn'])[:200]
            if note not in prev:
                ws.cell(row=row, column=22, value=(prev + ' | ' + note).strip(' |'))

    wb.save(EXCEL_PATH)
    print(f"🔧 Tuzatilgan qiymatlar : {n_fix}")
    print(f"➕ To'ldirilgan maydonlar: {n_fill}")
    print(f"🛑 Karantin (tegilmadi)  : {n_skip} ta talaba")
    print(f"🔒 Qo'lda tasdiqlangan   : {n_lock} ta talaba (tegilmadi)")
    print(f"📝 O'zgargan qatorlar    : {len(touched)}")
    print(f"💾 Saqlandi: {os.path.basename(EXCEL_PATH)}")


if __name__ == '__main__':
    if MODE == '--apply':
        main_apply()
    else:
        main_scan()
