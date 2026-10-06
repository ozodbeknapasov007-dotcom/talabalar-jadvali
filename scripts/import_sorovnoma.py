# -*- coding: utf-8 -*-
"""
So'rovnomadan talabalar ma'lumotlarini students.json ga kiritish.
Fuzzy name matching bilan topilmayotganlarni ham topadi.
"""
import sys, re, json, unicodedata
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')
import openpyxl

SURVEY_FILE = r"C:\Users\user\Downloads\26-01-26-06 (javoblar) (1).xlsx"
STUDENTS_FILE = Path(__file__).parent.parent / "data" / "students.json"

# ── Yordamchi funksiyalar ──────────────────────────────────────────────────

def clean_name(s):
    if not s: return ''
    return ' '.join(str(s).strip().split())

def norm_name(s):
    """Taqqoslash uchun: kichik, unicode normallash, ʻ/ʼ → '"""
    s = clean_name(s).lower()
    s = unicodedata.normalize('NFC', s)
    # Apostroflarni birlashtirish
    s = re.sub(r"[ʻʼʽ'`']", "'", s)
    # G' → g, o' → o taqqoslashda (lekin saqlab ham ko'rish uchun emas)
    return s

def surname_first_letters(fish):
    parts = norm_name(fish).split()
    if not parts: return ''
    return parts[0][:3]  # familiyaning birinchi 3 harfi

def levenshtein(a, b):
    if a == b: return 0
    if not a: return len(b)
    if not b: return len(a)
    m, n = len(a), len(b)
    dp = list(range(n+1))
    for i in range(1, m+1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n+1):
            cost = 0 if a[i-1] == b[j-1] else 1
            dp[j] = min(dp[j]+1, dp[j-1]+1, prev[j-1]+cost)
    return dp[n]

def similarity(a, b):
    """0..1 oralig'ida o'xshashlik"""
    d = levenshtein(a, b)
    mx = max(len(a), len(b), 1)
    return 1 - d/mx

def clean_phone(v, extra_text=''):
    """Telefon raqamni +998xxxxxxxxx formatiga keltirish"""
    if not v: return ''
    s = str(v).strip()
    # Float edi → butun son
    try:
        n = int(float(s))
        s = str(n)
    except:
        pass
    digits = re.sub(r'[^0-9]', '', s)
    if len(digits) == 9:
        return '+998' + digits
    elif len(digits) == 12 and digits.startswith('998'):
        return '+' + digits
    elif len(digits) == 11 and digits.startswith('998'):
        return '+998' + digits[3:]
    # Birinchi 9-raqamli qismni topish
    parts = s.split()
    if parts:
        d2 = re.sub(r'[^0-9]', '', parts[0])
        if len(d2) == 9:
            return '+998' + d2
        elif len(d2) == 12 and d2.startswith('998'):
            return '+' + d2
    return s

def clean_date(v):
    if not v: return ''
    if isinstance(v, datetime):
        return v.strftime('%d.%m.%Y')
    s = str(v).strip()
    try:
        n = int(float(s))
        s_d = str(n)
        if len(s_d) == 8:
            return s_d[0:2] + '.' + s_d[2:4] + '.' + s_d[4:]
        if len(s_d) == 7:
            return '0' + s_d[0] + '.' + s_d[1:3] + '.' + s_d[3:]
    except:
        pass
    s = re.sub(r'[\s/]+', '.', s.strip())
    return s

# ── Asosiy skript ───────────────────────────────────────────────────────────

def main():
    # Ma'lumotlarni yuklash
    wb = openpyxl.load_workbook(SURVEY_FILE)
    ws = wb.active

    with open(STUDENTS_FILE, encoding='utf-8') as f:
        students = json.load(f)

    # Index: normalized fish → [index_list]
    idx_fish = {}
    for i, s in enumerate(students):
        key = norm_name(s.get('fish', ''))
        if key:
            idx_fish.setdefault(key, []).append(i)

    # Index: (group, normalized ism) → [index_list]
    idx_group_ism = {}
    for i, s in enumerate(students):
        g = s.get('group', '')
        key = norm_name(s.get('ism', ''))
        if g and key:
            idx_group_ism.setdefault((g, key), []).append(i)

    # Barcha 26-xx talabalar (fuzzy uchun)
    kurs1_idx = [(i, s) for i, s in enumerate(students)
                 if str(s.get('group', '')).startswith('26-')]

    updated = 0
    not_found_list = []
    fuzzy_matched = 0

    for r in range(2, ws.max_row + 1):
        row_vals = [ws.cell(r, c).value for c in range(1, 13)]
        guruh    = str(row_vals[1] or '').strip()
        full     = clean_name(row_vals[2])
        dob      = clean_date(row_vals[3])
        tuman    = clean_name(row_vals[4])
        mfy      = clean_name(row_vals[5])
        kocha    = clean_name(row_vals[6])
        uy       = clean_name(row_vals[7])
        qatnov   = clean_name(row_vals[8])
        tel1_raw = row_vals[9]
        tel2_raw = row_vals[10]
        tel2_kim = clean_name(row_vals[11])

        tel1 = clean_phone(tel1_raw)
        tel2 = clean_phone(tel2_raw)

        if not full:
            continue

        # 1. To'liq ism bo'yicha qidirish
        found_idxs = idx_fish.get(norm_name(full), [])
        if len(found_idxs) > 1:
            g_filtered = [i for i in found_idxs if students[i].get('group', '') == guruh]
            if g_filtered:
                found_idxs = g_filtered

        # 2. ism (birinchi 2 so'z) + guruh bo'yicha qidirish
        if not found_idxs:
            parts = norm_name(full).split()
            ism_key = ' '.join(parts[:2]) if len(parts) >= 2 else norm_name(full)
            cands = idx_group_ism.get((guruh, ism_key), [])
            if cands:
                found_idxs = cands

        # 3. Fuzzy matching: faqat bir xil guruh ichida
        if not found_idxs:
            best_score = 0
            best_idx = None
            nf = norm_name(full)
            fam_start = nf.split()[0][:3] if nf.split() else ''
            for si, s in kurs1_idx:
                if s.get('group', '') != guruh:
                    continue
                sf = norm_name(s.get('fish', ''))
                # Familiyaning birinchi 3 harfi bir xil bo'lsa qidirish (tezlashtirish)
                sf_start = sf.split()[0][:3] if sf.split() else ''
                if fam_start and sf_start and fam_start != sf_start:
                    continue
                score = similarity(nf, sf)
                if score > best_score:
                    best_score = score
                    best_idx = si
            if best_idx is not None and best_score >= 0.72:
                found_idxs = [best_idx]
                fuzzy_matched += 1
                print(f"  FUZZY ({best_score:.2f}): '{full}' → '{students[best_idx]['fish']}' [{guruh}]")

        if not found_idxs:
            not_found_list.append({'guruh': guruh, 'fish': full})
            continue

        si = found_idxs[0]
        s = students[si]

        # Yangilash (bo'sh bo'lsa yoki yangi ma'lumot bor bo'lsa)
        if tel1:    s['tel_shaxsiy']   = tel1
        if tel2:    s['tel_otaona']    = tel2
        if tel2_kim: s['tel_otaona_kim'] = tel2_kim
        if tuman:   s['manzil_tuman'] = tuman
        if mfy:     s['manzil_mfy']   = mfy
        if kocha:   s['manzil_kocha'] = kocha
        if uy:      s['manzil_uy']    = uy
        if qatnov:  s['qatnov']       = qatnov
        if dob and not s.get('dob'):
            s['dob'] = dob

        parts_m = [p for p in [tuman, mfy, kocha, uy] if p]
        if parts_m:
            s['manzil_toliq'] = ', '.join(parts_m)

        updated += 1

    # Saqlash
    with open(STUDENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(students, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Yangilandi: {updated} (shu jumladan fuzzy: {fuzzy_matched})")
    print(f"❌ Topilmadi: {len(not_found_list)}")
    if not_found_list:
        print("\nTopilmaganlar:")
        for nf in not_found_list:
            print(f"  [{nf['guruh']}] {nf['fish']}")

if __name__ == '__main__':
    main()
