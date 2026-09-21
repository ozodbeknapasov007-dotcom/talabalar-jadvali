# -*- coding: utf-8 -*-
"""
CHUQUR TAHLIL VA OCR QILUVCHI PARSER (PREVIEW UCHUN)
===================================================
"""
import openpyxl, docx, os, sys, re, io
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

# Agar easyocr bo'lsa OCR qilamiz
try:
    import easyocr
    reader = easyocr.Reader(['uz', 'ru', 'en'], gpu=False)
except:
    reader = None

def extract_student_info(docx_path):
    if not os.path.exists(docx_path):
        return None
    
    fname = os.path.basename(docx_path)
    doc = docx.Document(docx_path)
    
    info = {
        'docx': fname,
        'docx_path': os.path.abspath(docx_path),
        'ism': '',
        'ota': '',
        'fish': '',
        'yonalis': 'Hamshiralik ishi',
        'tolov': "To'lov qildi",
        'shnum': '',
        'shsan': '',
        'maktab': '',
        'edutur': "Umumiy o'rta maktab",
        'yil': '',
        'tel': '',
        'pass_ser': '',
        'pass_num': '',
        'pass_tur': 'ID-karta',
        'pinfl': '',
        'dob': '',
        'passber': '',
        'cert_tur': 'Shahodatnoma',
        'cert_ser': '',
        'cert_num': '',
        'cert_full': ''
    }

    for t in doc.tables:
        for row in t.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if len(cells) >= 2:
                k = cells[0].lower()
                v = cells[1]
                if 'familiya' in k or 'ism' in k: info['ism'] = v
                elif 'ota' in k: info['ota'] = v
                elif 'yo’nalish' in k or "yo'nalish" in k: info['yonalis'] = v
                elif 'o’qish joyi' in k or "o'qish joyi" in k: info['maktab'] = v
                elif 'tugatgan yili' in k:
                    # Sanadan yilni ajratish
                    m_y = re.search(r'\b(\d{4})\b', v)
                    info['yil'] = m_y.group(1) if m_y else v
                elif 'shartnoma raqami' in k: info['shnum'] = v
                elif 'shartnoma sanasi' in k: info['shsan'] = v
                elif 'telefon' in k: info['tel'] = v

    if not info['ism']:
        m_name = re.match(r'^([A-Za-z\'\s]+)\s*\d*', fname.replace('.docx', ''))
        if m_name: info['ism'] = m_name.group(1).strip()

    if info['ota'] and info['ism']:
        info['fish'] = f"{info['ism']} {info['ota']}"
    else:
        info['fish'] = info['ism']

    # Rasmlarni tahlil qilish
    img_blobs = [rel.target_part.blob for rel in doc.part.rels.values() if 'image' in rel.target_ref]
    for b in img_blobs:
        try:
            im = Image.open(io.BytesIO(b)).convert('RGB')
            # Kichik rasmlarni tashlab yuboramiz
            if im.size[0] < 200 or im.size[1] < 200: continue
            
            if reader:
                ocr_res = reader.readtext(im, detail=0)
                ocr_text = " ".join(ocr_res)
                
                # Pasport/ID karta tekshiruvi
                m_p = re.search(r'\b(A[A-HJ-Z])\s*(\d{7})\b', ocr_text)
                if m_p:
                    info['pass_ser'] = m_p.group(1).upper()
                    info['pass_num'] = m_p.group(2)
                    info['pass_tur'] = 'ID-karta' if info['pass_ser'] in {'AD', 'AE', 'AF', 'AG', 'AH'} else 'Biometrik pasport'

                m_pinfl = re.search(r'\b([1-6]\d{13})\b', ocr_text)
                if m_pinfl:
                    info['pinfl'] = m_pinfl.group(1)
                    # PINFL dan tug'ilgan sana
                    p = info['pinfl']
                    dd, mm, yy = int(p[1:3]), int(p[3:5]), int(p[5:7])
                    cent = 1900 if int(p[0]) in (3, 4) else 2000
                    info['dob'] = f"{dd:02d}.{mm:02d}.{cent+yy}"

                # Shahodatnoma/Diplom tekshiruvi
                m_c = re.search(r'\b(UM|K|PT|IM|DB|AT|O\'?R-?SH)\s*[№#\.]*\s*(\d{6,8})\b', ocr_text, re.I)
                if m_c:
                    info['cert_ser'] = m_c.group(1).upper()
                    info['cert_num'] = m_c.group(2)
                    if info['cert_ser'] in {'K', 'PT', 'IM'}: info['cert_tur'] = 'Diplom'
                    else: info['cert_tur'] = 'Shahodatnoma'
                    info['cert_full'] = f"{info['cert_ser']} № {info['cert_num']}"
        except:
            continue

    return info
