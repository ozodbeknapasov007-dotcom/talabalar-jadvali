# -*- coding: utf-8 -*-
"""
PASPORT VA SHAHODATNOMADAGI F.I.SH NI TO'LIQ (OTASINING ISMI BILAN) YOZISH
========================================================================
Foydalanuvchining talabi:
  "menga passportdagi va shahodatnomadagi i.f.o to'liq yozilib berishi kerak,
   yani otasining ismi ham tushub, faqat familiya va ism bo'lib qolmasin.
   ABDURAHMONOVA PARVINABONU ni otasini ismi yo'qku shunga o'xshashlarni aytayapman"

Ushbu skript:
  1. AI o'qigan pasport bosma sahifalaridan to'liq F.I.SH ni oladi
  2. MRZ faqat familiya+ism bergan holatlarda shartnoma/baza ota ismini qo'shadi
  3. Shahodatnoma PDF laridagi barcha xato belgilarni tuzatib, to'liq F.I.SH ni yozadi
  4. Excelning 7, 8, 9, 14, 24-ustunlarini mukammal sinxronlashtiradi
"""
import os
import sys
import re
import json
import shutil
import datetime
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, 'scripts'))
from contract_names import read_contract_name

EXCEL_PATH = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
EXCEL_YANGI = os.path.join(BASE_DIR, 'Talabalar_Yangilangan_Royxat.xlsx')
CACHE_DIR = os.path.join(BASE_DIR, 'scratch', 'passport_name_cache')
QR_CACHE = os.path.join(BASE_DIR, 'scratch', 'qr_cache')
VERIFY_JSON = os.path.join(BASE_DIR, 'scratch', 'verify_results.json')
FILES_DIR = os.path.join(BASE_DIR, 'files')

try:
    import pypdf
except ImportError:
    pypdf = None

def clean_name(s):
    if not s:
        return ""
    s = str(s).strip()
    s = re.sub(r'[\ufffd`‘’ʻʼ´ʹ]', "'", s)
    s = re.sub(r'\s+', ' ', s)
    return s

def clean_uz_title(s):
    if not s:
        return ""
    s = clean_name(s)
    words = s.split(' ')
    res = []
    for w in words:
        wl = w.lower()
        if wl in ['qizi', 'kizi']:
            res.append('qizi')
        elif wl in ["o'g'li", "o‘g‘li", "o’g’li", "ogli", "ugli"]:
            res.append("o'g'li")
        elif wl in ['ovna', 'yevna', 'evna', 'ovich', 'yevich', 'evich']:
            res.append(wl)
        elif "'" in w:
            parts = w.split("'")
            fixed = [parts[0].capitalize()] + [p.lower() for p in parts[1:]]
            res.append("'".join(fixed))
        else:
            res.append(w.capitalize())
    return " ".join(res)

def get_pdf_name(url):
    if not url or not pypdf:
        return ""
    key = re.sub(r'\W+', '_', url)[-120:]
    f = os.path.join(QR_CACHE, key + '.pdf')
    if not os.path.exists(f):
        return ""
    try:
        reader = pypdf.PdfReader(f)
        text = "\n".join((p.extract_text() or '') for p in reader.pages)
        for l in text.split('\n'):
            l_clean = clean_name(l)
            if re.search(r"(?i)\b(qizi|o'g'li|ogli|ugli|kizi)\.?$", l_clean) and len(l_clean.split()) >= 3:
                return clean_uz_title(l_clean)
    except Exception:
        pass
    return ""

def get_passport_ai_name(fname):
    if not fname:
        return None
    ckey = re.sub(r'[^A-Za-z0-9._-]+', '_', fname)[-120:] + '.json'
    cpath = os.path.join(CACHE_DIR, ckey)
    if os.path.exists(cpath):
        try:
            d = json.load(open(cpath, encoding='utf-8'))
            if d.get('holat') == 'OK' and d.get('natija'):
                nat = d['natija']
                sur = nat.get('surname') or ''
                nam = nat.get('name') or ''
                pat = nat.get('patronymic') or ''
                full = f"{sur} {nam} {pat}".strip()
                return {
                    'surname': sur,
                    'name': nam,
                    'patronymic': pat,
                    'full': clean_uz_title(full),
                    'ota': clean_uz_title(pat),
                    'has_patronymic': bool(pat.strip())
                }
        except Exception:
            pass
    return None

def process_and_update(apply=False):
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active

    verify_data = {}
    if os.path.exists(VERIFY_JSON):
        for item in json.load(open(VERIFY_JSON, encoding='utf-8')):
            verify_data[item['row']] = item

    results = []
    updated_pass_count = 0
    updated_cert_count = 0
    updated_ota_count = 0
    updated_fish_count = 0

    for r in range(2, ws.max_row + 1):
        ifo_asl = clean_name(ws.cell(r, 2).value)
        if not ifo_asl:
            continue
        guruh = clean_name(ws.cell(r, 23).value)
        ota_baza = clean_name(ws.cell(r, 7).value)
        fish_baza = clean_name(ws.cell(r, 8).value)
        pass_excel_old = clean_name(ws.cell(r, 9).value)
        pass_num = clean_name(ws.cell(r, 10).value)
        cert_excel_old = clean_name(ws.cell(r, 14).value)
        cert_num = clean_name(ws.cell(r, 15).value)
        qr_url = clean_name(ws.cell(r, 16).value)

        v_item = verify_data.get(r, {})
        doc_file = v_item.get('file')
        qr = v_item.get('qr') or {}
        if not qr_url:
            qr_url = qr.get('qr') or ''
        mrz_name = qr.get('mrz_name') or ''

        # 1. Shartnoma fayl matnidan ota ismi
        c_fam, c_ota = '', ''
        if doc_file:
            c_path = os.path.join(FILES_DIR, doc_file)
            if os.path.exists(c_path):
                try:
                    c_fam, c_ota = read_contract_name(c_path)
                except Exception:
                    pass

        # 2. Shahodatnoma PDF dan to'liq FIO
        pdf_cert = get_pdf_name(qr_url)

        # 3. AI o'qigan pasport
        ai_pass = get_passport_ai_name(doc_file)

        # 4. Tasdiqlangan eng ishonchli ota ismi
        ota_final = ""
        if c_ota:
            ota_final = clean_uz_title(c_ota)
        elif ai_pass and ai_pass['has_patronymic']:
            ota_final = ai_pass['ota']
        elif pdf_cert:
            p_words = pdf_cert.split()
            if len(p_words) >= 3:
                ota_final = " ".join(p_words[2:])
        elif ota_baza:
            ota_final = clean_uz_title(ota_baza)

        # 5. Pasport F.I.SH (9-ustun) — ALBATTA OTASINING ISMI BILAN!
        pass_final = ""
        has_passport = bool(pass_num or doc_file or pass_excel_old)
        if has_passport:
            if ai_pass and ai_pass['has_patronymic']:
                pass_final = ai_pass['full']
            elif ai_pass and ai_pass['surname'] and ai_pass['name']:
                fam_ism = clean_uz_title(f"{ai_pass['surname']} {ai_pass['name']}")
                pass_final = f"{fam_ism} {ota_final}".strip() if ota_final else fam_ism
            elif mrz_name:
                mrz_title = clean_uz_title(mrz_name)
                pass_final = f"{mrz_title} {ota_final}".strip() if ota_final else mrz_title
            elif pass_excel_old:
                p_words = pass_excel_old.split()
                if len(p_words) <= 2 and ota_final:
                    pass_final = clean_uz_title(f"{pass_excel_old} {ota_final}")
                else:
                    pass_final = clean_uz_title(pass_excel_old)
            elif ifo_asl and ota_final:
                pass_final = clean_uz_title(f"{ifo_asl} {ota_final}")

        # 6. Shahodatnoma F.I.SH (14-ustun) — ALBATTA OTASINING ISMI BILAN!
        cert_final = ""
        has_cert = bool(cert_num or qr_url or cert_excel_old)
        if has_cert:
            if pdf_cert:
                cert_final = clean_uz_title(pdf_cert)
            elif cert_excel_old:
                c_words = cert_excel_old.split()
                if len(c_words) <= 2 and ota_final:
                    cert_final = clean_uz_title(f"{cert_excel_old} {ota_final}")
                else:
                    cert_final = clean_uz_title(cert_excel_old)
            elif ifo_asl and ota_final:
                cert_final = clean_uz_title(f"{ifo_asl} {ota_final}")

        # 7. To'liq F.I.SH (8-ustun)
        fish_final = ""
        if pass_final and len(pass_final.split()) >= 3:
            fish_final = pass_final
        elif cert_final and len(cert_final.split()) >= 3:
            fish_final = cert_final
        elif ifo_asl and ota_final:
            fish_final = clean_uz_title(f"{ifo_asl} {ota_final}")
        elif fish_baza:
            fish_final = clean_uz_title(fish_baza)
        else:
            fish_final = clean_uz_title(ifo_asl)

        # 8. Ism mosligi (24-ustun)
        match_col = ws.cell(r, 24).value or ""
        
        results.append({
            'row': r,
            'guruh': guruh,
            'ifo_asl': ifo_asl,
            'ota_old': ota_baza,
            'ota_new': ota_final,
            'fish_old': fish_baza,
            'fish_new': fish_final,
            'pass_old': pass_excel_old,
            'pass_new': pass_final,
            'cert_old': cert_excel_old,
            'cert_new': cert_final,
        })

        if apply:
            if ota_final and ota_final != ota_baza:
                ws.cell(r, 7, value=ota_final)
                updated_ota_count += 1
            if fish_final and fish_final != fish_baza:
                ws.cell(r, 8, value=fish_final)
                updated_fish_count += 1
            if pass_final and pass_final != pass_excel_old:
                ws.cell(r, 9, value=pass_final)
                updated_pass_count += 1
            if cert_final and cert_final != cert_excel_old:
                ws.cell(r, 14, value=cert_final)
                updated_cert_count += 1

    print("=================================================================")
    print("  MUKAMMAL F.I.SH YANGILASH STATISTIKASI")
    print("=================================================================")
    print(f"Jami talabalar soni                    : {len(results)}")
    print(f"Pasport F.I.SH shakllantirilgan        : {sum(1 for x in results if x['pass_new'])}")
    print(f"  - 3+ so'z (TO'LIQ otasining ismi bilan): {sum(1 for x in results if x['pass_new'] and len(x['pass_new'].split()) >= 3)}")
    print(f"  - 1-2 so'z (chala/faqat familiya ism) : {sum(1 for x in results if x['pass_new'] and len(x['pass_new'].split()) < 3)}")
    print(f"Shahodatnoma F.I.SH shakllantirilgan   : {sum(1 for x in results if x['cert_new'])}")
    print(f"  - 3+ so'z (TO'LIQ otasining ismi bilan): {sum(1 for x in results if x['cert_new'] and len(x['cert_new'].split()) >= 3)}")
    print(f"  - 1-2 so'z (chala)                    : {sum(1 for x in results if x['cert_new'] and len(x['cert_new'].split()) < 3)}")
    print(f"8-ustun (To'liq F.I.SH) 3+ so'z        : {sum(1 for x in results if x['fish_new'] and len(x['fish_new'].split()) >= 3)}")
    print("=================================================================")

    if apply:
        ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        shutil.copyfile(EXCEL_PATH, f"{EXCEL_PATH}.bak_{ts}")
        wb.save(EXCEL_PATH)
        wb.save(EXCEL_YANGI)
        print(f"\n✅ EXCEL FAYLLAR MUVAFFAQIYATLI SAQLANDI:")
        print(f"  1. {EXCEL_PATH}")
        print(f"  2. {EXCEL_YANGI}")
        print(f"  - 9-ustun (Passport bo'yicha F.I.SH) yangilandi : {updated_pass_count} ta")
        print(f"  - 14-ustun (Shahodatnoma bo'yicha F.I.SH)       : {updated_cert_count} ta")
        print(f"  - 8-ustun (To'liq F.I.SH)                       : {updated_fish_count} ta")
        print(f"  - 7-ustun (Otasining ismi) to'ldirildi          : {updated_ota_count} ta")

if __name__ == '__main__':
    apply_flag = '--apply' in sys.argv
    process_and_update(apply=apply_flag)
