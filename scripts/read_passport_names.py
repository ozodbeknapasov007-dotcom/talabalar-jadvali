# -*- coding: utf-8 -*-
"""
1-BOSQICH: PASPORT BOSMA SAHIFASIDAN F.I.SH NI AI BILAN O'QISH
===============================================================
QR/MRZ to'g'ri o'zbekcha yozuvni va otasining ismini BERA OLMAYDI:
  • ICAO MRZ harflarni almashtiradi (q->K, x->H) va apostrofni tashlaydi
  • MRZ da otasining ismi umuman yo'q
  • Biometrik pasportda (AA/AB/AC/FA) QR butunlay yo'q
To'g'ri yozuv faqat pasportning bosma sahifasida bor — shuni o'qiymiz.

BU SKRIPT EXCELGA HECH QACHON YOZMAYDI.
Natija keshga tushadi, keyin 2-bosqich (verify_passport_names.py) tekshiradi.

    python scripts/read_passport_names.py --only "Xurramova Shodiya"
    python scripts/read_passport_names.py --limit 20
    python scripts/read_passport_names.py            # hammasi
"""
import os
import sys
import io
import re
import json
import time
import argparse
import datetime
import importlib.util

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES_DIR = os.path.join(BASE_DIR, 'hujjatlar', 'shartnomalar')
RESULT_JSON = os.path.join(BASE_DIR, 'arxiv', 'scratch', 'verify_results.json')
CACHE_DIR = os.path.join(BASE_DIR, 'arxiv', 'scratch', 'passport_name_cache')
os.makedirs(CACHE_DIR, exist_ok=True)

try:
    import zxingcpp
except ImportError:
    zxingcpp = None
from PIL import Image


# ── Mavjud loyiha kodini qayta ishlatamiz (nusxa ko'chirmaymiz) ──────────
def _load_sync_service():
    """
    telegram_sync_service.py dan SYSTEM_PROMPT, call_openrouter_vision va
    extract_doc_images_with_crop ni oladi. Modul import qilinganda server
    ishga tushmaydi (u `if __name__ == '__main__'` bilan himoyalangan).
    """
    path = os.path.join(BASE_DIR, 'xizmatlar', 'telegram_sync_service.py')
    spec = importlib.util.spec_from_file_location('tss', path)
    mod = importlib.util.module_from_spec(spec)
    saved = sys.argv
    sys.argv = ['tss']          # port argumenti tasodifan o'qilmasin
    try:
        spec.loader.exec_module(mod)
    finally:
        sys.argv = saved
    return mod


TSS = _load_sync_service()


def cache_key(fname):
    return re.sub(r'[^A-Za-z0-9._-]+', '_', fname)[-120:]


def cache_path(fname):
    return os.path.join(CACHE_DIR, cache_key(fname) + '.json')


def is_cert_qr_image(blob):
    """Rasmda e-shahodatnoma QR bormi? (bo'lsa — bu pasport emas, o'tkazamiz)"""
    if not zxingcpp:
        return False
    try:
        img = Image.open(io.BytesIO(blob)).convert('RGB')
    except Exception:
        return False
    for angle in (0, 90, 180, 270):
        im = img.rotate(angle, expand=True) if angle else img
        try:
            res = zxingcpp.read_barcodes(im)
        except Exception:
            continue
        for bc in res:
            t = (bc.text or '')
            if 'e-shahodatnoma' in t or 'getcertpdf' in t:
                return True
            if t:
                return False          # boshqa QR (ID-karta) — bu pasport, qoldiramiz
    return False


def looks_like_passport(ans):
    """AI javobi haqiqatan pasport o'qilganini bildiradimi?"""
    if not isinstance(ans, dict):
        return False
    if not ans.get('is_passport'):
        return False
    has_id = bool(str(ans.get('pass_number') or '').strip()) or \
             bool(re.fullmatch(r'\d{14}', str(ans.get('pinfl') or '').strip()))
    has_name = bool(str(ans.get('surname') or '').strip()) and \
               bool(str(ans.get('name') or '').strip())
    return has_id and has_name


def has_patronymic(ans):
    return bool(str((ans or {}).get('patronymic') or '').strip())


def answer_score(ans):
    """
    Javobni baholaydi. ID-kartaning ORQA tomonida otasining ismi YO'Q
    (u faqat old tomonda bosilgan), shuning uchun otasining ismi bor
    javob doim afzal ko'riladi.
    """
    if not looks_like_passport(ans):
        return 0
    s = 1
    if has_patronymic(ans):
        s += 10
    if str(ans.get('pass_number') or '').strip():
        s += 2
    if re.fullmatch(r'\d{14}', str(ans.get('pinfl') or '').strip()):
        s += 2
    if str(ans.get('passport_issue_date') or '').strip():
        s += 1
    return s


def read_one(student, refresh=False, retries=2):
    """Bitta talabaning faylidan pasport ma'lumotini o'qiydi (keshlanadi)"""
    fname = student.get('file')
    if not fname:
        return {'holat': 'FAYL_YOQ'}

    cp = cache_path(fname)
    if os.path.exists(cp) and not refresh:
        try:
            cached = json.load(open(cp, encoding='utf-8'))
            if cached.get('holat') == 'OK':
                cached['keshdan'] = True
                return cached
        except Exception:
            pass

    path = os.path.join(FILES_DIR, fname)
    if not os.path.exists(path):
        return {'holat': 'FAYL_DISKDA_YOQ', 'file': fname}

    try:
        _images, blobs_raw, _text = TSS.extract_doc_images_with_crop(path)
    except Exception as e:
        return {'holat': 'RASM_XATO', 'file': fname, 'xato': str(e)}

    if not blobs_raw:
        return {'holat': 'RASM_YOQ', 'file': fname}

    rec = {'file': fname, 'model': TSS.OPENROUTER_MODELS[0],
           'vaqt': datetime.datetime.now().isoformat(timespec='seconds'),
           'urinishlar': [], 'natija': None, 'holat': 'TOPILMADI'}

    best_score = 0
    for idx, blob in enumerate(blobs_raw):
        if is_cert_qr_image(blob):
            rec['urinishlar'].append({'rasm': idx, 'otkazildi': 'shahodatnoma QR'})
            continue

        ans = None
        for attempt in range(retries):
            ans = TSS.call_openrouter_vision(blob, is_retry=False)
            if not ans:
                # Pro model xato bersa yoki to'lov so'rasa, Flash modeliga o'tamiz
                ans = TSS.call_openrouter_vision(blob, is_retry=True)
            if ans:
                break
            time.sleep(1.5 * (attempt + 1))

        rec['urinishlar'].append({'rasm': idx, 'javob': ans})
        sc = answer_score(ans)
        if sc > best_score:
            best_score, rec['natija'], rec['rasm_indeks'] = sc, ans, idx
            rec['holat'] = 'OK'
        # Otasining ismi ham bor javob topildi — qidirishni to'xtatamiz
        if has_patronymic(ans) and looks_like_passport(ans):
            break

    with open(cp, 'w', encoding='utf-8') as fh:
        json.dump(rec, fh, ensure_ascii=False, indent=1)
    rec['keshdan'] = False
    return rec


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument('--only', action='append', default=[],
                    help="faqat shu talaba (bir necha marta berish mumkin)")
    ap.add_argument('--limit', type=int, default=0, help="nechta talabani o'qish")
    ap.add_argument('--refresh', action='store_true', help="keshni chetlab o'tish")
    args = ap.parse_args()

    if not os.path.exists(RESULT_JSON):
        print('❌ scratch/verify_results.json yo\'q. Avval:')
        print('   python scripts/verify_all_students.py --scan')
        sys.exit(1)

    students = json.load(open(RESULT_JSON, encoding='utf-8'))
    students.sort(key=lambda s: (s.get('guruh') or '', s.get('ifo') or ''))

    if args.only:
        want = {o.strip().lower() for o in args.only}
        students = [s for s in students if (s.get('ifo') or '').strip().lower() in want]
        topilmadi = want - {(s.get('ifo') or '').strip().lower() for s in students}
        for t in topilmadi:
            print(f"⚠️  bazada topilmadi: {t}")

    with_file = [s for s in students if s.get('file')]
    if args.limit:
        with_file = with_file[:args.limit]

    print('=' * 70)
    print('  1-BOSQICH — PASPORTDAN F.I.SH O\'QISH')
    print(f"  Model: {TSS.OPENROUTER_MODELS[0]}")
    print('=' * 70)
    print(f"  Jami talaba        : {len(students)}")
    print(f"  Fayli bor          : {len(with_file)}")
    print(f"  Fayli yo'q         : {len(students) - len([s for s in students if s.get('file')])}")
    print('=' * 70)
    print()

    ok = fail = cached = 0
    for i, st in enumerate(with_file, 1):
        rec = read_one(st, refresh=args.refresh)
        mark = '✅' if rec.get('holat') == 'OK' else '❌'
        src = ' (kesh)' if rec.get('keshdan') else ''
        nat = rec.get('natija') or {}
        fish = ' '.join(x for x in (nat.get('surname'), nat.get('name'),
                                    nat.get('patronymic')) if x) or rec.get('holat')
        print(f"{mark} [{i}/{len(with_file)}] [{st.get('guruh')}] "
              f"{st.get('ifo'):28s} -> {fish}{src}")
        if rec.get('holat') == 'OK':
            ok += 1
        else:
            fail += 1
        if rec.get('keshdan'):
            cached += 1

    print()
    print('=' * 70)
    print(f"  ✅ O'qildi        : {ok}")
    print(f"  ❌ O'qilmadi      : {fail}")
    print(f"  💾 Keshdan olindi : {cached}")
    print(f"  Kesh: scratch/passport_name_cache/")
    print('=' * 70)
    print("\n2-bosqich (tekshiruv):  python scripts/verify_passport_names.py --scan")


if __name__ == '__main__':
    main()
