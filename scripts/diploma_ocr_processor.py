# -*- coding: utf-8 -*-
"""
KOLLEJ/TEXNIKUM DIPLOM OCR PROTSESSORI
========================================
27 ta kollej/texnikum talabalarining Word fayllaridan
diplom seriya, raqam, muassasa nomi va yilini aniqlash.
"""
import docx, io, os, re, sys, asyncio, openpyxl, glob
from PIL import Image, ImageEnhance, ImageFilter
from openpyxl.styles import PatternFill, Font, Alignment
from collections import Counter
import winocr

sys.stdout.reconfigure(encoding='utf-8')

# ═══════════════════════════════════════════════════════
# KOLLEJ/TEXNIKUM TALABALAR RO'YXATI (Excel dan)
# ═══════════════════════════════════════════════════════
INPUT_EXCEL = 'Talabalar_Toliq_Royxati.xlsx'
wb = openpyxl.load_workbook(INPUT_EXCEL)
ws = wb.active
headers = [ws.cell(row=1, column=c).value for c in range(1, ws.max_column+1)]

def hcol(kw):
    for i, h in enumerate(headers):
        if h and kw.lower() in str(h).lower(): return i+1
    return None

c_ism     = 2
c_edutur  = hcol("muassasasi turi")
c_maktab  = hcol("o'qish joyi")
c_yil     = hcol("Bitirgan yili")
c_cert    = hcol("Seriyasi va Raqami")
c_docx    = hcol("docx")
c_status  = hcol("holat") or hcol("Status")
c_cfio    = hcol("Shahodatnoma bo'yicha")

# Kollej/texnikum talabalar (cert = "Mavjud emas")
college_rows = []
for r in range(2, ws.max_row+1):
    ism = ws.cell(row=r, column=c_ism).value
    if not ism: continue
    et   = str(ws.cell(row=r, column=c_edutur).value or '') if c_edutur else ''
    st   = str(ws.cell(row=r, column=c_status).value or '') if c_status else ''
    cert = str(ws.cell(row=r, column=c_cert).value   or '') if c_cert   else ''
    if 'TOPILMADI' in st.upper(): continue
    kws = ['kollej','texnikum','litsey','kasb']
    if any(k in et.lower() for k in kws) and cert in ['Mavjud emas','','- ','-',None]:
        maktab = str(ws.cell(row=r, column=c_maktab).value or '') if c_maktab else ''
        yil    = str(ws.cell(row=r, column=c_yil).value    or '') if c_yil    else ''
        docx_v = str(ws.cell(row=r, column=c_docx).value   or '') if c_docx   else ''
        cfio   = str(ws.cell(row=r, column=c_cfio).value   or '') if c_cfio   else ''
        # docx yo'lini topish
        m_link = re.search(r'"([^"]+\.docx)"', docx_v)
        fpath  = m_link.group(1) if m_link else ''
        college_rows.append({
            'row': r, 'ism': str(ism), 'et': et,
            'maktab': maktab, 'yil': yil, 'fpath': fpath, 'cfio': cfio
        })

print(f"Kollej/Texnikum talabalar: {len(college_rows)} ta")
for x in college_rows:
    print(f"  [{x['row']}] {x['ism']} | {x['et']} | fayl: {os.path.basename(x['fpath']) if x['fpath'] else 'YOQ'}")

# ═══════════════════════════════════════════════════════
# MUASSASA NOMI TO'G'RILASH
# ═══════════════════════════════════════════════════════
INST_CORRECTIONS = {
    "Kittob tuman 2-sonli texnikum":    "Kitob tumani 2-sonli texnikumi",
    "Agrobiznes kasb -hunar kolleji":   "Agrobiznes kasb-hunar kolleji",
    "Yakkabpog' Axborot texnalogiyalari kolle": "Yakkabog' axborot texnologiyalari kolleji",
    "' Sanoat va Xizmat ko'rsatish kasb hunar": "Sanoat va xizmat ko'rsatish kasb-hunar kolleji",
}

def clean_inst(name: str) -> str:
    name = name.strip()
    for wrong, right in INST_CORRECTIONS.items():
        if wrong.lower() in name.lower():
            return right
    # Asosiy tozalash
    name = re.sub(r'\s+', ' ', name)
    name = name.strip(" ,'\"")
    # Birinchi harf katta
    if name:
        name = name[0].upper() + name[1:]
    return name

# ═══════════════════════════════════════════════════════
# OCR FUNKSIYASI
# ═══════════════════════════════════════════════════════
DIPL_SERIYALAR = {
    'NQ','NE','NK','NA','NB','NC','ND','NF','NG',   # Kasb-hunar kolleji (eski)
    'BK','BA','BD','BI','BB','BC','BE','BF','BG',   # Bakalavr/Kollej yangi
    'SA','SD','SK','SB','SC','SE','SF',             # Sertifikat
    'TA','TK','TB','TC','TD','TE','TF','TG','TH',   # Texnikum
    'KA','KB','KC','KD','KE','KF',                  # Kollej
    'DA','DB','DC','DD','DE','DF','DG','DH',        # Diplom (umumiy)
    'FA','FB','FC','FD','FE','FF','FG','FH',        # Fan bo'yicha
    'IA','IB','IC',                                  # Institut
}

async def ocr_all_angles(img: Image.Image) -> list[str]:
    results = []
    for ang in [0, 180, 90, 270]:
        rot = img if ang == 0 else img.rotate(ang, expand=True)
        # Bir necha preprocessing
        for enh_val in [1.0, 1.8, 2.5]:
            proc = ImageEnhance.Contrast(rot).enhance(enh_val)
            try:
                r = await winocr.recognize_pil(proc, 'en')
                if r.text.strip():
                    results.append(r.text)
            except:
                pass
    return results

async def extract_diploma_from_file(fpath: str, known_maktab: str, known_yil: str) -> dict:
    result = {
        'dipl_ser': '', 'dipl_num': '', 'dipl_full': '',
        'inst_name': '', 'grad_year': known_yil, 'source': '', 'all_text': ''
    }
    if not fpath or not os.path.exists(fpath):
        result['source'] = 'Fayl topilmadi'
        return result

    try:
        doc = docx.Document(fpath)
    except:
        result['source'] = 'Fayl o\'qilmadi'
        return result

    # Matndan ham izlash
    doc_text_parts = []
    for para in doc.paragraphs:
        doc_text_parts.append(para.text)
    for tbl in doc.tables:
        for row in tbl.rows:
            for cell in row.cells:
                doc_text_parts.append(cell.text)
    doc_text = '\n'.join(doc_text_parts)

    # Rasmlardan OCR
    img_texts = []
    for rel in doc.part.rels.values():
        if "image" not in rel.target_ref: continue
        try:
            blob = rel.target_part.blob
            img = Image.open(io.BytesIO(blob)).convert('RGB')
            texts = await ocr_all_angles(img)
            img_texts.extend(texts)
        except:
            pass

    all_text = doc_text + '\n' + '\n'.join(img_texts)
    result['all_text'] = all_text[:500]
    full_up = all_text.upper().replace('\n', ' ')

    # 1. Diplom seriyali qidirish — birlashtirilgan pattern
    # "NQ 4603554", "BK № 123456", "SA123456"
    m = re.search(
        r'\b(' + '|'.join(DIPL_SERIYALAR) + r')\s*[№#°No]*\s*(\d{5,8})\b',
        full_up
    )
    if m:
        result['dipl_ser'] = m.group(1)
        result['dipl_num'] = m.group(2)
        result['dipl_full'] = f"{m.group(1)} № {m.group(2)}"
        result['source'] = 'OCR (Diplom seriya)'
    else:
        # Umumiy 2 harf + raqam (diplom bo'lmagan holatlar)
        m2 = re.search(r'\b([A-Z]{2})\s*[№#°]*\s*(\d{6,8})\b', full_up)
        if m2 and m2.group(1) not in {'AE','AD','AC','AB','AA','AF'}:
            result['dipl_ser'] = m2.group(1)
            result['dipl_num'] = m2.group(2)
            result['dipl_full'] = f"{m2.group(1)} № {m2.group(2)}"
            result['source'] = 'OCR (Umumiy)'

    # 2. Muassasa nomi — OCR matndan
    inst_found = ''
    for line in all_text.split('\n'):
        low = line.lower().strip()
        if any(k in low for k in ['kollej','texnikum','litsey','kasb-hunar','kasb hunar','politexnikum']):
            cleaned = line.strip()
            if 10 < len(cleaned) < 100 and not re.match(r'^\d', cleaned):
                # OCR xatolarini tuzatish
                cleaned = re.sub(r'\s+', ' ', cleaned).strip()
                inst_found = cleaned
                break

    if inst_found:
        result['inst_name'] = clean_inst(inst_found)
    elif known_maktab and known_maktab not in ['-', '']:
        result['inst_name'] = clean_inst(known_maktab)

    # 3. Yil
    m_yil = re.findall(r'\b(20(?:0[5-9]|1[0-9]|2[0-6]))\b', full_up)
    if m_yil:
        cnt = Counter(m_yil)
        # Eng ishonchli yil (eng ko'p uchraydigan va known_yil ga mos)
        best = cnt.most_common(1)[0][0]
        if known_yil and known_yil in m_yil:
            result['grad_year'] = known_yil
        else:
            result['grad_year'] = best

    return result

# ═══════════════════════════════════════════════════════
# ASOSIY ISHLOV
# ═══════════════════════════════════════════════════════
async def main():
    print(f"\n{'='*60}")
    print("DIPLOM OCR BOSHLANDI")
    print(f"{'='*60}")

    results = {}
    for i, cr in enumerate(college_rows):
        fname = os.path.basename(cr['fpath']) if cr['fpath'] else 'YOQ'
        print(f"\n[{i+1}/{len(college_rows)}] {cr['ism']} ({fname})")
        info = await extract_diploma_from_file(cr['fpath'], cr['maktab'], cr['yil'])
        results[cr['row']] = info
        print(f"  Diplom:   {info['dipl_full'] or 'Topilmadi'}")
        print(f"  Muassasa: {info['inst_name'] or cr['maktab']}")
        print(f"  Yil:      {info['grad_year']}")
        print(f"  Manba:    {info['source']}")

    # ═══════════════════════════════════════════════════
    # EXCEL YANGILASH
    # ═══════════════════════════════════════════════════
    print(f"\n{'='*60}")
    print("EXCEL YANGILANMOQDA...")

    FILL_C = PatternFill("solid", fgColor="E2EFDA")
    FILL_W = PatternFill("solid", fgColor="FFF2CC")
    AL_C   = Alignment(horizontal='center', vertical='center')

    updated = 0
    for row_idx, info in results.items():
        maktab_val = info['inst_name'] or str(ws.cell(row=row_idx, column=c_maktab).value or '')

        if info['dipl_full']:
            ws.cell(row=row_idx, column=c_cert, value=info['dipl_full']).fill = FILL_C
            updated += 1
        
        # Muassasa nomini yangilash
        if info['inst_name'] and c_maktab:
            ws.cell(row=row_idx, column=c_maktab, value=info['inst_name'])

        # Yilni tekshirish
        if info['grad_year'] and c_yil:
            cur_yil = str(ws.cell(row=row_idx, column=c_yil).value or '')
            if not cur_yil or cur_yil in ['-','']:
                ws.cell(row=row_idx, column=c_yil, value=info['grad_year'])

    wb.save(INPUT_EXCEL)
    print(f"[OK] Excel yangilandi: {updated} ta diplom yozildi")

    # Yakuniy hisobot
    print(f"\n{'='*60}")
    print("YAKUNIY HISOBOT:")
    found = [(r, v) for r, v in results.items() if v['dipl_full']]
    not_found = [(r, v) for r, v in results.items() if not v['dipl_full']]
    print(f"  Topilgan diplomlar:    {len(found)} ta")
    print(f"  Topilmagan diplomlar:  {len(not_found)} ta")
    if not_found:
        print("  Topilmaganlar:")
        for r, v in not_found:
            cr = next(x for x in college_rows if x['row']==r)
            print(f"    [{r}] {cr['ism']} | {v['source']}")

asyncio.run(main())
