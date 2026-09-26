# -*- coding: utf-8 -*-
"""
QO'LDA KO'RIB CHIQISH YORDAMCHISI
==================================
Tekshiruvdan o'tmagan talabani bir joyda ko'rsatadi: bazadagi qiymat,
AI javobi, barcha mustaqil manbalar va hujjat rasmlarini diskka chiqaradi —
keyin rasmni ochib, o'z ko'zing bilan hal qilasan.

    python scripts/review_passport.py "Aliqulova Shahzoda"
    python scripts/review_passport.py --rad          # rad etilganlarning hammasi
"""
import os
import sys
import io
import json
import argparse

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK_JSON = os.path.join(BASE_DIR, 'arxiv', 'scratch', 'passport_name_check.json')
CACHE_DIR = os.path.join(BASE_DIR, 'arxiv', 'scratch', 'passport_name_cache')
IMG_DIR = os.path.join(BASE_DIR, 'arxiv', 'scratch', 'imgs')
os.makedirs(IMG_DIR, exist_ok=True)

import docx
from PIL import Image


def dump_images(fname):
    """Docx rasmlarini diskka chiqaradi, yo'llarini qaytaradi"""
    out = []
    p = os.path.join(BASE_DIR, 'hujjatlar', 'shartnomalar', fname)
    if not os.path.exists(p):
        return out
    try:
        d = docx.Document(p)
    except Exception as e:
        print(f'   docx xato: {e}')
        return out
    blobs = [r.target_part.blob for r in d.part.rels.values()
             if 'image' in r.target_ref and len(r.target_part.blob) > 1500]
    stem = os.path.splitext(fname)[0].replace(' ', '_').replace("'", '')
    for i, b in enumerate(blobs):
        try:
            img = Image.open(io.BytesIO(b)).convert('RGB')
        except Exception:
            continue
        if max(img.size) > 1500:
            k = 1500 / max(img.size)
            img = img.resize((int(img.width * k), int(img.height * k)), Image.LANCZOS)
        path = os.path.join(IMG_DIR, f'{stem}_{i}.jpg')
        img.save(path, quality=90)
        out.append((i, path, img.size))
    return out


def cache_for(fname):
    key = ''.join(c if c.isalnum() or c in '._-' else '_' for c in fname)[-120:]
    p = os.path.join(CACHE_DIR, key + '.json')
    if os.path.exists(p):
        try:
            return json.load(open(p, encoding='utf-8'))
        except Exception:
            pass
    # nom mos kelmasa — ichidagi 'file' bo'yicha qidiramiz
    for fn in os.listdir(CACHE_DIR):
        try:
            d = json.load(open(os.path.join(CACHE_DIR, fn), encoding='utf-8'))
        except Exception:
            continue
        if d.get('file') == fname:
            return d
    return None


def show(r):
    print('█' * 74)
    print(f"  [{r['guruh']}] {r['ifo']}   (qator {r['row']})")
    print('█' * 74)
    print(f"  holat : {r['holat24']}")
    print(f"  fayl  : {r['file']}")
    for s in r.get('sabab', []):
        print(f"  ❌ {s}")
    print('\n  ── MANBALAR ──')
    for k, v in (r.get('manbalar') or {}).items():
        if v:
            print(f"     {k:14s}: {v}")
    if r.get('pass_fish'):
        print(f"\n  natija: {r['pass_fish']}")

    rec = cache_for(r['file']) if r.get('file') else None
    if rec:
        print('\n  ── AI XOM JAVOBI (har bir rasm) ──')
        for u in rec.get('urinishlar', []):
            j = u.get('javob')
            if not j:
                sabab = u.get('otkazildi') or 'javob yoq'
                print(f"     rasm {u.get('rasm')}: {sabab}")
                continue
            print(f"     rasm {u.get('rasm')}: pasportmi={j.get('is_passport')} "
                  f"| {j.get('surname')} {j.get('name')} {j.get('patronymic')}")
            print(f"        {j.get('pass_series')}{j.get('pass_number')} "
                  f"PINFL={j.get('pinfl')} tug={j.get('birth_date')} "
                  f"berilgan={j.get('passport_issue_date')}")

    if r.get('file'):
        print('\n  ── RASMLAR (Read bilan ochib ko\'ring) ──')
        for i, path, size in dump_images(r['file']):
            print(f"     [{i}] {size}  {path}")
    print()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ism', nargs='*', help='talaba I.F.O')
    ap.add_argument('--rad', action='store_true',
                    help="tekshiruvdan o'tmaganlarning hammasi")
    args = ap.parse_args()

    if not os.path.exists(CHECK_JSON):
        print('❌ Avval: python scripts/verify_passport_names.py --scan'); sys.exit(1)
    R = json.load(open(CHECK_JSON, encoding='utf-8'))

    if args.rad:
        sel = [r for r in R if not r['qabul'] and r['holat24'] != "PASPORT: O'QILMADI"]
    elif args.ism:
        want = {' '.join(args.ism).strip().lower()} if len(args.ism) > 1 else \
               {a.strip().lower() for a in args.ism}
        sel = [r for r in R if r['ifo'].strip().lower() in want]
    else:
        print('Ishlatish: python scripts/review_passport.py "Ism Familiya"  yoki  --rad')
        sys.exit(0)

    if not sel:
        print('Topilmadi.'); sys.exit(0)
    for r in sel:
        show(r)


if __name__ == '__main__':
    main()
