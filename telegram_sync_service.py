# -*- coding: utf-8 -*-
"""
MAHALLIY BOSHQARUV VA TALABALARNI QO'SHISH SERVERI
==================================================
- Foydalanuvchi HTML dagi formadan to'g'ridan-to'g'ri yangi talabalarni qo'shadi.
- Bir nechta talabani bir vaqtda qatorma-qator kiritish imkoniyati.
- Excel va HTML avtomatik tarzda yangilanadi.
"""

import os
import sys
import json
import openpyxl
import docx
import io
import re
import base64
import urllib.request
import urllib.parse
from urllib.parse import unquote
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import subprocess
import mimetypes
import webbrowser
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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
FILES_DIR = os.path.join(BASE_DIR, 'files')
os.makedirs(FILES_DIR, exist_ok=True)

import threading
import time

EXCEL_LOCK = threading.Lock()
VERIFICATIONS_FILE = os.path.join(BASE_DIR, 'scripts', 'verifications.json')
VERIFICATIONS_LOCK = threading.Lock()

REBUILD_TIMER = None
REBUILD_LOCK = threading.Lock()
IS_REBUILDING = False
REBUILD_PENDING = False

# ===== GIT AUTO-PUSH SOZLAMALARI =====
GIT_AUTO_PUSH = True   # False qilib qo'ying agar push kerak bo'lmasa
GIT_PUSH_LOCK = threading.Lock()
_git_push_timer = None

def _do_git_push():
    """Fonda git add + commit + push bajaradi (bloklamaydi)."""
    try:
        result_add = subprocess.run(
            ['git', 'add',
             'Talabalar_Toliq_Royxati.xlsx',
             'scripts/verifications.json',
             'scripts/manual_file_map.json'],
            cwd=BASE_DIR, capture_output=True, text=True, timeout=30
        )
        result_status = subprocess.run(
            ['git', 'status', '--porcelain'],
            cwd=BASE_DIR, capture_output=True, text=True, timeout=10
        )
        if result_status.stdout.strip():
            result_commit = subprocess.run(
                ['git', 'commit', '-m', 'Auto: talaba ma\'lumotlari yangilandi'],
                cwd=BASE_DIR, capture_output=True, text=True, timeout=30
            )
            if result_commit.returncode == 0:
                result_push = subprocess.run(
                    ['git', 'push'],
                    cwd=BASE_DIR, capture_output=True, text=True, timeout=60
                )
                if result_push.returncode == 0:
                    print("[GIT] ✅ GitHub'ga muvaffaqiyatli push qilindi")
                else:
                    print(f"[GIT] ⚠️ Push xatosi: {result_push.stderr.strip()}")
            else:
                print(f"[GIT] ℹ️ Commit xatosi: {result_commit.stderr.strip()}")
        else:
            print("[GIT] ℹ️ O'zgarmagan fayl yo'q — push o'tkazib yuborildi")
    except subprocess.TimeoutExpired:
        print("[GIT] ⚠️ Git operatsiyasi vaqt tugashi bilan bekor qilindi")
    except Exception as e:
        print(f"[GIT] ❌ Git xatosi: {e}")

def schedule_git_push():
    """Ma'lumot saqlangandan so'ng 5 soniyadan keyin git push qiladi.
    Bir necha ketma-ket o'zgarish bo'lsa, faqat bitta push qiladi."""
    global _git_push_timer
    if not GIT_AUTO_PUSH:
        return
    with GIT_PUSH_LOCK:
        if _git_push_timer is not None:
            _git_push_timer.cancel()
        _git_push_timer = threading.Timer(5.0, _do_git_push)
        _git_push_timer.daemon = True
        _git_push_timer.start()

def load_verifications_map():
    with VERIFICATIONS_LOCK:
        if os.path.exists(VERIFICATIONS_FILE):
            try:
                with open(VERIFICATIONS_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"verifications.json yuklash xatosi: {e}")
        return {}

def save_verification_atomic(row, v_status, shnum=None, pinfl=None):
    with VERIFICATIONS_LOCK:
        os.makedirs(os.path.dirname(VERIFICATIONS_FILE), exist_ok=True)
        vmap = {}
        if os.path.exists(VERIFICATIONS_FILE):
            try:
                with open(VERIFICATIONS_FILE, 'r', encoding='utf-8') as f:
                    vmap = json.load(f)
            except Exception:
                vmap = {}
        
        r_str = str(row)
        if v_status == 'TASDIQLANDI':
            vmap[r_str] = 'TASDIQLANDI'
            if shnum: vmap['sh_' + str(shnum).strip()] = 'TASDIQLANDI'
            if pinfl: vmap['pinfl_' + str(pinfl).strip()] = 'TASDIQLANDI'
        else:
            vmap.pop(r_str, None)
            if shnum: vmap.pop('sh_' + str(shnum).strip(), None)
            if pinfl: vmap.pop('pinfl_' + str(pinfl).strip(), None)
            vmap[r_str] = 'KUTILMOQDA'
            if shnum: vmap['sh_' + str(shnum).strip()] = 'KUTILMOQDA'
            if pinfl: vmap['pinfl_' + str(pinfl).strip()] = 'KUTILMOQDA'

        tmp_path = VERIFICATIONS_FILE + '.tmp'
        try:
            with open(tmp_path, 'w', encoding='utf-8') as f:
                json.dump(vmap, f, ensure_ascii=False, indent=2)
            if os.path.exists(VERIFICATIONS_FILE):
                os.remove(VERIFICATIONS_FILE)
            os.rename(tmp_path, VERIFICATIONS_FILE)
        except Exception as e:
            print(f"verifications.json yozishda xato: {e}")

def _run_rebuild_worker():
    global IS_REBUILDING, REBUILD_PENDING
    with REBUILD_LOCK:
        if IS_REBUILDING:
            REBUILD_PENDING = True
            return
        IS_REBUILDING = True
        REBUILD_PENDING = False

    try:
        while True:
            script1 = os.path.join(BASE_DIR, 'qayta_tekshiruv', '03_hisobot_yasat.py')
            if os.path.exists(script1):
                try:
                    subprocess.run([sys.executable, script1], check=False, cwd=BASE_DIR)
                except Exception as e:
                    print(f"03_hisobot_yasat xatosi: {e}")

            with REBUILD_LOCK:
                if REBUILD_PENDING:
                    REBUILD_PENDING = False
                    continue
                else:
                    IS_REBUILDING = False
                    break
    except Exception as e:
        print(f"Rebuild worker global xato: {e}")
        with REBUILD_LOCK:
            IS_REBUILDING = False

def trigger_report_rebuild(delay=1.5, async_mode=True):
    """Barcha hisobotlar va yangilangan Excel fayllarini xavfsiz, debounced sinxronlashtirish"""
    global REBUILD_TIMER
    schedule_git_push()   # Git push ham shu payt rejalashtirilib qo'yiladi
    if not async_mode:
        _run_rebuild_worker()
        return

    with REBUILD_LOCK:
        if REBUILD_TIMER is not None:
            try:
                REBUILD_TIMER.cancel()
            except Exception:
                pass
        REBUILD_TIMER = threading.Timer(delay, _run_rebuild_worker)
        REBUILD_TIMER.daemon = True
        REBUILD_TIMER.start()


OPENROUTER_API_KEY = "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"
OPENROUTER_MODELS = ["google/gemini-2.5-pro", "google/gemini-2.5-flash", "openai/gpt-4o"]

def clean_uz_name(text):
    if not text:
        return ""
    text = str(text).strip()
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r"[`‘’ʻʼ´]", "'", text)
    text = re.sub(r"(?i)to['\s]*l\s+qin", "To'lqin", text)
    text = re.sub(r"(?i)abdu\s*g['\s]*affor", "Abdug'affor", text)
    
    words = text.split(' ')
    cleaned_words = []
    for w in words:
        w_lower = w.lower()
        if w_lower in ['qizi', 'kizi']:
            cleaned_words.append('qizi')
        elif w_lower in ["o'g'li", "o‘g‘li", "o’g’li", "ogli", "ugli", "o'gli"]:
            cleaned_words.append("o'g'li")
        elif "'" in w:
            parts = w.split("'")
            fixed_parts = []
            for i, p in enumerate(parts):
                if i == 0:
                    fixed_parts.append(p.capitalize())
                else:
                    fixed_parts.append(p.lower())
            cleaned_words.append("'".join(fixed_parts))
        else:
            cleaned_words.append(w.capitalize())
            
    return " ".join(cleaned_words).strip()

SYSTEM_PROMPT = """Siz O'zbekiston Respublikasining barcha turdagi shaxsni tasdiqlovchi va ta'lim hujjatlarini (Yashil biometrik pasport, ID-karta, Kollej/Litsey diplomi, Maktab shahodatnomasi) juda yuqori aniqlikda tahlil qiluvchi PROFESSIONAL AI EKSPERTSIZ.

TASVIR XIRA, YARAQLAGAN YOKI QIYIQ BO'LGAN TAQDIRDA HAM DIQQAT BILAN O'QING:

Quyidagi JSON formatida to'liq va aniq javob bering:
{
  "is_passport": true/false,
  "pass_series": "AE, AD, AB, AC yoki 2 ta harf",
  "pass_number": "7 xonali raqam",
  "pinfl": "14 xonali JSHSHIR raqami (agar ko'rinsa yoki pastdagi MRZ kodda bo'lsa)",
  "birth_date": "DD.MM.YYYY (masalan 15.08.2008)",
  "surname": "Familiyasi (masalan: Karimova, Xasanova)",
  "name": "Ismi (masalan: Dilnoza, Zilola)",
  "patronymic": "OTASINING ISMI - JUDA MUHIM! (masalan: Eson qizi, Halim qizi, Umid qizi, Sherali qizi, Sunnat o'g'li, Farhodovich). Hech qachon tushirib qoldirmang!",
  "full_name": "Familiya Ism Sharif (to'liq)",
  "passport_issue_date": "FAQAT PASPORT yoki ID-KARTANING BERILGAN SANASI (DD.MM.YYYY). Shahodatnoma yoki Diplom sanasini MUTLAQ bermang! Masalan: 20.09.2024",
  
  "is_education_doc": true/false,
  "doc_type": "Diplom" yoki "Shahodatnoma",
  "doc_series": "K, UM, O'R-SH yoki seriya harflari",
  "doc_number": "Raqami (masalan 03728724, 3359681)",
  "institution": "Tugatgan maktab, litsey yoki kollejning TO'LIQ NOMI (masalan: 24-sonli umumiy o'rta ta'lim maktabi, Shahrisabz tibbiyot kolleji)",
  "specialty": "Mutaxassislik yoki yo'nalish nomi (agar yozilgan bo'lsa)",
  "grad_year": "Bitirgan yili (masalan 2026, 2023, 2018)"
}

MUHIM QOIDALAR:
1. "patronymic" (Otasining ismi) maydonini albatta toping va to'ldiring! Hujjatdagi "Otasining ismi / Father's name / Otchestvo" satriga qarang.
2. "passport_issue_date" - FAQAT pasport yoki ID-kartaning berilgan sanasi. Shahodatnoma/Diplom sanasini bu maydonga HECH QACHON yozmang!
3. Agar rasm biometrik yashil pasport bo'lsa, pasport seriyasi, raqami va pastki 2 qatorli MRZ chizig'idagi ma'lumotlarni o'qing.
4. Agar rasm kollej diplomi bo'lsa, qo'lyozma raqam va kollej nomini aniq o'qing.
5. Faqat toza JSON qaytaring."""

def call_openrouter_vision(img_bytes, is_retry=False):
    b64_img = base64.b64encode(img_bytes).decode('utf-8')
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    # Pro modeldan boshlaymiz
    models_to_try = [OPENROUTER_MODELS[0], OPENROUTER_MODELS[1]] if is_retry else [OPENROUTER_MODELS[0]]
    
    for model_name in models_to_try:
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": SYSTEM_PROMPT},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                    ]
                }
            ],
            "temperature": 0.05
        }
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://localhost:8080"
        })
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                content = res['choices'][0]['message']['content'].strip()
                content = re.sub(r'^```json\s*', '', content)
                content = re.sub(r'\s*```$', '', content)
                parsed = json.loads(content)
                if parsed:
                    return parsed
        except Exception as e:
            print(f"OpenRouter [{model_name}] xato: {e}")
            continue
            
def parse_uz_id_card_qr(text):
    """
    O'zbekiston ID-karta QR kodi (ICAO / TD1 MRZ format):
    IUUZBAE4629898462802085680012<
    0802282F3510144UZBUZB<<<<<<<<8
    YAHYOMURODOVA<<GULSANAM<<<<<<<
    """
    data = {}
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    if len(lines) >= 3:
        l1, l2, l3 = lines[0], lines[1], lines[2]
        m_l1 = re.search(r'([A-Z]{2}\d{7})\d?([3-6]\d{13})', l1.replace('<', ''))
        if m_l1:
            data['pass_val'] = m_l1.group(1)
            data['pinfl'] = m_l1.group(2)
        else:
            m_p = re.search(r'(AD|AE|AA|AB|AC|FA)(\d{7})', l1)
            if m_p: data['pass_val'] = m_p.group(1) + m_p.group(2)
            m_pin = re.search(r'([3-6]\d{13})', l1)
            if m_pin: data['pinfl'] = m_pin.group(1)
            
        m_l2 = re.search(r'^(\d{2})(\d{2})(\d{2})[0-9MF]', l2.replace('<', ''))
        if m_l2:
            yy, mm, dd = m_l2.group(1), m_l2.group(2), m_l2.group(3)
            year = f"20{yy}" if int(yy) <= 30 else f"19{yy}"
            data['dob'] = f"{dd}.{mm}.{year}"
            
        m_name = re.search(r'([A-Z]+)<<([A-Z]+)', l3)
        if m_name:
            fam = m_name.group(1).capitalize()
            ism = m_name.group(2).capitalize()
            data['ism'] = f"{fam} {ism}"
            
    full_str = "".join(lines)
    if 'pass_val' not in data:
        m_p = re.search(r'(AD|AE|AA|AB|AC|FA)(\d{7})', full_str)
        if m_p: data['pass_val'] = m_p.group(1) + m_p.group(2)
    if 'pinfl' not in data:
        m_pin = re.search(r'([3-6]\d{13})', full_str)
        if m_pin: data['pinfl'] = m_pin.group(1)
    if 'dob' not in data:
        m_dob = re.search(r'\b(\d{2})(\d{2})(\d{2})[0-9MF]', full_str)
        if m_dob:
            yy, mm, dd = m_dob.group(1), m_dob.group(2), m_dob.group(3)
            year = f"20{yy}" if int(yy) <= 30 else f"19{yy}"
            data['dob'] = f"{dd}.{mm}.{year}"

    return data

def parse_eshahodatnoma_pdf(pdf_url):
    """
    e-shahodatnoma.uz PDF hujjatini yuklab, to'liq o'qish
    """
    data = {}
    if not pypdf:
        return data
    try:
        req = urllib.request.Request(pdf_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=12) as resp:
            pdf_bytes = resp.read()
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
                
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            
            for l in lines:
                if re.match(r'^\d{7,8}$', l):
                    data['cert_val'] = f"UM {l}" if not l.startswith('UM') else l
                    break
                    
            for l in lines:
                if re.search(r"(?i)(qizi|o'g'li|ogli|ugli)$", l):
                    parts = l.split()
                    if len(parts) >= 3:
                        data['fish'] = l
                        data['ism'] = f"{parts[0]} {parts[1]}"
                        data['ota'] = " ".join(parts[2:])
                    break
                    
            for l in lines:
                m_mak = re.search(r'(\d{4})\s+(.+?maktab.+)', l, re.I)
                if m_mak:
                    data['yil'] = m_mak.group(1)
                    data['maktab'] = m_mak.group(2).strip()
                    break
                elif '-sonli' in l or 'maktab' in l.lower():
                    data['maktab'] = l
                    
            m_dob = re.search(r'(\d{2}\.\d{2}\.\d{4})', text)
            if m_dob:
                data['dob'] = m_dob.group(1)
                
            data['cert_tur'] = "Shahodatnoma"
            data['sh_qr'] = pdf_url
    except Exception as e:
        print(f"e-shahodatnoma PDF yuklashda xato: {e}")
        
    return data

def scan_all_qrs(blobs_raw):
    """
    Barcha rasm bloklaridan QR-kodlarni 4 burchakda (0°, 90°, 180°, 270°) aniqlaydi va ma'lumotlarni chiqaradi
    """
    qr_data = {}
    if not zxingcpp:
        return qr_data
        
    found_urls = set()
    found_mrzs = set()

    for b in blobs_raw:
        try:
            pil_img = Image.open(io.BytesIO(b)).convert('RGB')
            # 4 burchakda tekshiramiz (chunki rasm 90 gradus burilgan bo'lishi mumkin)
            for angle in [0, 90, 180, 270]:
                rot_img = pil_img.rotate(angle, expand=True) if angle != 0 else pil_img
                results = zxingcpp.read_barcodes(rot_img)
                for r in results:
                    txt = (r.text or '').strip()
                    if not txt: continue
                    
                    # 1. e-shahodatnoma QR
                    if ('e-shahodatnoma.uz' in txt or 'getcertpdf' in txt or txt.endswith('.pdf')) and txt not in found_urls:
                        found_urls.add(txt)
                        pdf_data = parse_eshahodatnoma_pdf(txt)
                        if pdf_data:
                            qr_data.update(pdf_data)
                            
                    # 2. ID-karta QR / MRZ
                    elif ('I<UZB' in txt or 'IUUZB' in txt or 'UZB' in txt or len(txt.split('\n')) >= 2) and txt not in found_mrzs:
                        found_mrzs.add(txt)
                        id_data = parse_uz_id_card_qr(txt)
                        if id_data:
                            # Faqat to'ldirilgan maydonlarni yangilash
                            for k, v in id_data.items():
                                if v: qr_data[k] = v
        except Exception as e:
            pass
            
    return qr_data

def analyze_docx_content(docx_bytes, filename, default_ism="", default_yon="", use_pro=False):
    result = {
        "success": True,
        "filename": filename,
        "ism": default_ism,
        "ota": "",
        "shnum": "",
        "yonalis": default_yon or "Hamshiralik ishi - 3 yillik",
        "pass_val": "",
        "pinfl": "",
        "dob": "",
        "cert_tur": "Shahodatnoma",
        "cert_val": "",
        "maktab": "",
        "yil": "2024",
        "ber_sana": "",
        "sh_qr": ""
    }
    
    m_sh = re.search(r'[\s_Nn](\d{1,4})\.docx$', filename, re.I)
    if m_sh:
        result['shnum'] = m_sh.group(1)
        
    try:
        saved_temp = os.path.join(FILES_DIR, filename)
        with open(saved_temp, 'wb') as f:
            f.write(docx_bytes)
            
        images, blobs_raw, full_text = extract_doc_images_with_crop(saved_temp)
        
        if not result['shnum']:
            m_sh2 = re.search(r'[№#\.\s]*(\d{1,4})[\s-]*(?:sonli|shartnoma)', full_text, re.I)
            if m_sh2: result['shnum'] = m_sh2.group(1)

        # 1-QADAM: AVVAL QR-KODLARNI TEKSHIRISH (100% RASMIY VA ANIQ!)
        qr_extracted = scan_all_qrs(blobs_raw)
        if qr_extracted:
            print(f"QR kod orqali rasmiy ma'lumotlar olindi: {qr_extracted}")
            if qr_extracted.get('ism'): result['ism'] = clean_uz_name(qr_extracted['ism'])
            if qr_extracted.get('ota'): result['ota'] = clean_uz_name(qr_extracted['ota'])
            if qr_extracted.get('pass_val'): result['pass_val'] = qr_extracted['pass_val']
            if qr_extracted.get('pinfl'): result['pinfl'] = qr_extracted['pinfl']
            if qr_extracted.get('dob'): result['dob'] = qr_extracted['dob']
            if qr_extracted.get('cert_val'): result['cert_val'] = qr_extracted['cert_val']
            if qr_extracted.get('cert_tur'): result['cert_tur'] = qr_extracted['cert_tur']
            if qr_extracted.get('maktab'): result['maktab'] = qr_extracted['maktab']
            if qr_extracted.get('yil'): result['yil'] = qr_extracted['yil']
            if qr_extracted.get('sh_qr'): result['sh_qr'] = qr_extracted['sh_qr']

        # 2-QADAM: AI VISION TAHLIL (PRO YOKI FLASH)
        model_to_use = 'google/gemini-2.5-pro' if use_pro else 'google/gemini-2.5-flash'
        print(f"Hujjat AI tahlili: model = {model_to_use}")

        content_items = [{'type': 'text', 'text': """Sen professional O'zbekiston ID-karta, Biometrik pasport va Shahodatnoma/Diplom o'quvchisisan.
Ushbu rasmlarni juda sinchiklab tahlil qil va talabaning haqiqiy ma'lumotlarini chiqargin.

Qat'iy Qoidalar:
1. Pasport/ID seriya va raqami:
   - ID-karta: 'AD' yoki 'AE' harflari va KETMA-KET ANIQ 7 TA RAQAM (jami 9 ta belgi!). Masalan: AD1234567, AE4629898.
   - Biometrik pasport: 'AA', 'AB', 'AC', 'FA' va 7 ta raqam.
   - Hech qachon 8 ta yoki 6 ta raqam yozma!
2. JSHSHIR (PINFL):
   - ID-karta yoki pasport pastidagi/orqasidagi ANIQ 14 xonali raqam!
3. Tug'ilgan sana (DOB):
   - Pasportdagi tug'ilgan sana (DD.MM.YYYY).
4. Pasport BERILGAN SANASI (Date of issue):
   - FAQAT Pasport yoki ID-karta berilgan sanasi (Date of issue: DD.MM.YYYY).
   - Shahodatnoma sanasini yoki kelajak sanani EMAS!
5. Shahodatnoma yoki Diplom:
   - Hujjat turi: Maktab bo'lsa 'Shahodatnoma', Kollej/Litsey/Texnikum bo'lsa 'Diplom'
   - Seriya va raqami: Masalan 'UM 03729356' yoki 'T-V 123456'
   - Maktab/Muassasa nomi: Maktab yoki Kollejning to'liq nomi
   - Bitirgan yili: Masalan '2024'

Aniq JSON formatda qaytar:
{
  "ism": "Familiya Ism",
  "ota": "... qizi / ... o'g'li",
  "pass_ser": "AE1234567",
  "pinfl": "14 xonali PINFL",
  "dob": "DD.MM.YYYY",
  "pass_ber": "DD.MM.YYYY",
  "sh_doc": "UM 1234567",
  "doc_tur": "Shahodatnoma",
  "maktab": "...-maktab",
  "yil": "2024"
}"""}]

        for b in blobs_raw:
            b64 = base64.b64encode(b).decode('utf-8')
            content_items.append({'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{b64}'}})

        ai_payload = {
            'model': model_to_use,
            'messages': [{'role': 'user', 'content': content_items}],
            'temperature': 0.0
        }
        
        req = urllib.request.Request(
            'https://openrouter.ai/api/v1/chat/completions',
            data=json.dumps(ai_payload).encode('utf-8'),
            headers={'Authorization': f'Bearer {OPENROUTER_API_KEY}', 'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=45) as resp:
            res_json = json.loads(resp.read().decode('utf-8'))
            raw = res_json['choices'][0]['message']['content'].strip()
            raw = re.sub(r'^```json\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            ai_data = json.loads(raw)
            
            # Agar QR dan olinmagan bo'lsa yoki bo'sh bo'lsa AI ma'lumotlarini qo'yish
            if not result.get('ism') and ai_data.get('ism'): result['ism'] = clean_uz_name(ai_data['ism'])
            if not result.get('ota') and ai_data.get('ota'): result['ota'] = clean_uz_name(ai_data['ota'])
            if not result.get('pass_val') and ai_data.get('pass_ser'): result['pass_val'] = ai_data['pass_ser']
            if not result.get('pinfl') and ai_data.get('pinfl'): result['pinfl'] = str(ai_data['pinfl'])
            if not result.get('dob') and ai_data.get('dob'): result['dob'] = ai_data['dob']
            if ai_data.get('pass_ber'): result['ber_sana'] = ai_data['pass_ber']
            if not result.get('cert_val') and ai_data.get('sh_doc'): result['cert_val'] = ai_data['sh_doc']
            if not result.get('cert_tur') and ai_data.get('doc_tur'): result['cert_tur'] = ai_data['doc_tur']
            if not result.get('maktab') and ai_data.get('maktab'): result['maktab'] = ai_data['maktab']
            if not result.get('yil') and ai_data.get('yil'): result['yil'] = str(ai_data['yil'])
            
            # Pasport seriya 7 raqam bo'lishini qat'iy tekshirish
            pv = result.get('pass_val', '')
            m_fix = re.search(r'([A-Z]{2})(\d{7})', pv)
            if m_fix:
                result['pass_val'] = m_fix.group(1) + m_fix.group(2)
            
    except Exception as e:
        print(f"analyze_docx_content xatosi: {e}")
        
    return result

def save_manual_students(students_list):
    if not os.path.exists(EXCEL_PATH):
        return 0
    
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active

    added = 0
    for st in students_list:
        ism = str(st.get('ism', '')).strip()
        if not ism:
            continue
        
        ota = str(st.get('ota', '')).strip()
        fish = f"{ism} {ota}".strip() if ota else ism
        shnum = str(st.get('shnum', '')).strip()
        pass_val = str(st.get('pass_val', '')).strip().upper()
        pinfl = str(st.get('pinfl', '')).strip()
        dob = str(st.get('dob', '')).strip()
        
        if (not dob or dob == '-') and len(pinfl) == 14 and pinfl.isdigit():
            dd, mm, yy = int(pinfl[1:3]), int(pinfl[3:5]), int(pinfl[5:7])
            cent = 1900 if int(pinfl[0]) in (3, 4) else 2000
            dob = f"{dd:02d}.{mm:02d}.{cent+yy}"

        ber_sana = str(st.get('ber_sana', '')).strip()  # FAQAT pasport berilgan sanasi

        cert_val = str(st.get('cert_val', '')).strip()
        cert_tur = str(st.get('cert_tur', 'Shahodatnoma')).strip()
        cqr = str(st.get('cqr', '')).strip()
        maktab = str(st.get('maktab', '')).strip()
        yil = str(st.get('yil', '')).strip()
        yonalis = str(st.get('yonalis', 'Hamshiralik ishi - 3 yillik')).strip()

        nr = ws.max_row + 1
        ws.cell(row=nr, column=1, value=nr - 1)
        ws.cell(row=nr, column=2, value=ism)
        ws.cell(row=nr, column=3, value=yonalis)
        ws.cell(row=nr, column=4, value="To'lov qildi")
        ws.cell(row=nr, column=5, value=shnum)
        ws.cell(row=nr, column=6, value="")
        ws.cell(row=nr, column=7, value=ota)
        ws.cell(row=nr, column=8, value=fish)
        # 9-ustun "Passport bo'yicha F.I.SH" — FAQAT pasport rasmidan o'qilgan
        # ma'lumot turadi. Uni scripts/verify_passport_names.py boshqaradi.
        # To'liq F.I.SH 8-ustunda, shuning uchun bu yerda yozilmaydi.
        ws.cell(row=nr, column=10, value=pass_val)
        ws.cell(row=nr, column=11, value=pinfl)
        ws.cell(row=nr, column=12, value=ber_sana)  # Pasport BERILGAN SANASI (12-ustun)
        ws.cell(row=nr, column=13, value=dob)        # Tug'ilgan sana (13-ustun)
        ws.cell(row=nr, column=14, value="")         # Shahodatnoma bo'yicha F.I.SH
        ws.cell(row=nr, column=15, value=cert_val)
        ws.cell(row=nr, column=16, value=cqr)
        ws.cell(row=nr, column=17, value=maktab)
        ws.cell(row=nr, column=18, value="Umumiy o'rta maktab" if cert_tur == "Shahodatnoma" else "Kollej")
        ws.cell(row=nr, column=19, value=yil)
        ws.cell(row=nr, column=20, value="")
        ws.cell(row=nr, column=21, value="TOPILDI")
        ws.cell(row=nr, column=22, value="AI orqali tahlil qilinib qo'shildi")
        added += 1

    wb.save(EXCEL_PATH)
    schedule_git_push()
    trigger_report_rebuild()
def extract_doc_images_with_crop(target_path):
    import docx, xml.etree.ElementTree as ET
    from PIL import Image, ImageFile
    import io, base64, zipfile, struct, zlib
    ImageFile.LOAD_TRUNCATED_IMAGES = True

    images = []
    blobs_raw = []
    full_text = ""

    # 1. docx orqali ochish va crop parametrlarini olish
    try:
        d = docx.Document(target_path)
        p_texts = [p.text.strip() for p in d.paragraphs if p.text.strip()]
        for t in d.tables:
            for row in t.rows:
                for cell in row.cells:
                    if cell.text.strip(): p_texts.append(cell.text.strip())
        full_text = "\n".join(p_texts)

        root = ET.fromstring(d._element.xml)
        crops_by_rid = {}
        for el in root.iter():
            if el.tag.endswith('blipFill'):
                blip = None
                src_rect = None
                for child in el.iter():
                    if child.tag.endswith('blip'): blip = child
                    elif child.tag.endswith('srcRect'): src_rect = child
                
                embed_id = None
                if blip is not None:
                    for k, v in blip.attrib.items():
                        if k.endswith('embed'): embed_id = v
                
                crop = {}
                if src_rect is not None:
                    for k, v in src_rect.attrib.items():
                        try:
                            crop[k] = int(v) / 100000.0
                        except: pass
                if embed_id:
                    crops_by_rid[embed_id] = crop

        for rid, rel in d.part.rels.items():
            if 'image' in rel.target_ref:
                blob = rel.target_part.blob
                if len(blob) > 2000:
                    blobs_raw.append(blob) # Original rasm (QR kod uchun juda muhim!)
                    try:
                        im = Image.open(io.BytesIO(blob)).convert('RGB')
                        crop = crops_by_rid.get(rid, {})
                        w, h = im.size
                        left = int(w * crop.get('l', 0))
                        top = int(h * crop.get('t', 0))
                        right = int(w * (1.0 - crop.get('r', 0)))
                        bottom = int(h * (1.0 - crop.get('b', 0)))
                        
                        if right > left and bottom > top and (crop.get('l') or crop.get('t') or crop.get('r') or crop.get('b')):
                            cropped = im.crop((left, top, right, bottom))
                            buf = io.BytesIO()
                            cropped.save(buf, format='JPEG', quality=95)
                            final_bytes = buf.getvalue()
                        else:
                            buf = io.BytesIO()
                            im.save(buf, format='JPEG', quality=95)
                            final_bytes = buf.getvalue()
                            
                        b64 = base64.b64encode(final_bytes).decode('utf-8')
                        images.append(f"data:image/jpeg;base64,{b64}")
                    except Exception as e:
                        b64 = base64.b64encode(blob).decode('utf-8')
                        images.append(f"data:image/jpeg;base64,{b64}")
    except Exception as e:
        pass

    # 2. Agar rasm topilmagan bo'lsa (yoki docx buzilgan bo'lsa) -> Universal Local Header Scanner
    if len(blobs_raw) == 0:
        try:
            with open(target_path, 'rb') as f:
                data = f.read()
            pos = 0
            while True:
                idx = data.find(b'PK\x03\x04', pos)
                if idx == -1: break
                header = data[idx:idx+30]
                if len(header) < 30: break
                comp_method = struct.unpack('<H', header[8:10])[0]
                comp_size = struct.unpack('<I', header[18:22])[0]
                fname_len = struct.unpack('<H', header[26:28])[0]
                extra_len = struct.unpack('<H', header[28:30])[0]
                fname = data[idx+30:idx+30+fname_len].decode('utf-8', 'ignore')
                file_data_start = idx + 30 + fname_len + extra_len
                file_raw = data[file_data_start:file_data_start + comp_size]
                
                if 'media/' in fname and len(file_raw) > 2000:
                    try:
                        if comp_method == 8:
                            decomp = zlib.decompress(file_raw, -15)
                        else:
                            decomp = file_raw
                        im = Image.open(io.BytesIO(decomp)).convert('RGB')
                        buf = io.BytesIO()
                        im.save(buf, format='JPEG', quality=95)
                        final_bytes = buf.getvalue()
                        blobs_raw.append(final_bytes)
                        b64 = base64.b64encode(final_bytes).decode('utf-8')
                        images.append(f"data:image/jpeg;base64,{b64}")
                    except Exception as e2:
                        pass
                pos = idx + 4
        except Exception as e_scan:
            print(f"Universal scanner xatosi: {e_scan}")

    return images, blobs_raw, full_text

def apply_full_excel_styling(wb, ws):
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    ws.views.sheetView[0].showGridLines = True
    ws.freeze_panes = 'C2'  # A va B ustunlar (T/R va Guruh) muzlatiladi

    thin_gray = Side(style='thin', color='CBD5E1')
    header_side = Side(style='medium', color='0F172A')
    cell_border = Border(left=thin_gray, right=thin_gray, top=thin_gray, bottom=thin_gray)
    header_border = Border(left=thin_gray, right=thin_gray, top=header_side, bottom=header_side)

    header_fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
    header_font = Font(name='Segoe UI', size=10.5, bold=True, color='FFFFFF')

    row_fill_white = PatternFill(start_color='FFFFFF', end_color='FFFFFF', fill_type='solid')
    row_fill_zebra = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')

    fill_topildi = PatternFill(start_color='DCFCE7', end_color='DCFCE7', fill_type='solid')
    font_topildi = Font(name='Segoe UI', size=10, bold=True, color='15803D')

    fill_chala = PatternFill(start_color='FEF3C7', end_color='FEF3C7', fill_type='solid')
    font_chala = Font(name='Segoe UI', size=10, bold=True, color='B45309')

    fill_yoq = PatternFill(start_color='FEE2E2', end_color='FEE2E2', fill_type='solid')
    font_yoq = Font(name='Segoe UI', size=10, bold=True, color='B91C1C')

    fill_mos = PatternFill(start_color='DCFCE7', end_color='DCFCE7', fill_type='solid')
    font_mos = Font(name='Segoe UI', size=9.5, color='166534')

    fill_translit = PatternFill(start_color='DBEAFE', end_color='DBEAFE', fill_type='solid')
    font_translit = Font(name='Segoe UI', size=9.5, color='1E40AF')

    fill_farq = PatternFill(start_color='FEE2E2', end_color='FEE2E2', fill_type='solid')
    font_farq = Font(name='Segoe UI', size=9.5, color='991B1B')

    fill_tekshir = PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid')
    font_tekshir = Font(name='Segoe UI', size=9.5, color='64748B')

    regular_font = Font(name='Segoe UI', size=10, color='1E293B')
    bold_font = Font(name='Segoe UI', size=10, bold=True, color='0F172A')

    ws.row_dimensions[1].height = 28
    for col_idx in range(1, ws.max_column + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = header_border
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=False)

    center_cols = {1, 2, 5, 6, 7, 10, 11, 12, 13, 14, 16, 19, 20, 21, 23, 24}

    for r in range(2, ws.max_row + 1):
        ws.row_dimensions[r].height = 22
        base_fill = row_fill_zebra if r % 2 == 1 else row_fill_white
        status_val = str(ws.cell(row=r, column=21).value or '').strip().upper()
        match_val = str(ws.cell(row=r, column=23).value or '').strip().upper()

        for c in range(1, ws.max_column + 1):
            cell = ws.cell(row=r, column=c)
            cell.border = cell_border
            is_center = c in center_cols
            cell.alignment = Alignment(horizontal='center' if is_center else 'left', vertical='center')
            cell.font = bold_font if c in [1, 2, 3, 9, 11, 16, 24] else regular_font
            cell.fill = base_fill

            if c == 21:
                if 'TOPILDI' in status_val:
                    cell.fill = fill_topildi
                    cell.font = font_topildi
                elif 'CHALA' in status_val:
                    cell.fill = fill_chala
                    cell.font = font_chala
                elif 'YOQ' in status_val:
                    cell.fill = fill_yoq
                    cell.font = font_yoq
            elif c == 23:
                if 'BOSHQA' in match_val or 'FARQ' in match_val:
                    cell.fill = fill_farq
                    cell.font = font_farq
                elif 'TRANSLIT' in match_val:
                    cell.fill = fill_translit
                    cell.font = font_translit
                elif 'MOS' in match_val:
                    cell.fill = fill_mos
                    cell.font = font_mos
                else:
                    cell.fill = fill_tekshir
                    cell.font = font_tekshir
            elif c == 24:
                verify_val = str(cell.value or '').strip().upper()
                if 'TASDIQ' in verify_val:
                    cell.fill = fill_topildi
                    cell.font = font_topildi
                else:
                    cell.fill = fill_chala
                    cell.font = font_chala

    col_widths = {
        1: 6, 2: 13, 3: 28, 4: 26, 5: 15, 6: 16, 7: 13, 8: 24,
        9: 32, 10: 28, 11: 18, 12: 18, 13: 15, 14: 15, 15: 32, 16: 18, 17: 35,
        18: 35, 19: 20, 20: 13, 21: 16, 22: 40, 23: 28, 24: 20
    }
    for col_idx, width in col_widths.items():
        if col_idx <= ws.max_column:
            ws.column_dimensions[get_column_letter(col_idx)].width = width

    ws.auto_filter.ref = f"A1:{get_column_letter(ws.max_column)}{ws.max_row}"

def build_full_multisheet_excel(source_ws, filter_status=None):
    import openpyxl
    out_wb = openpyxl.Workbook()
    default_sheet = out_wb.active

    GROUPS_CONFIG = [
        ("Jami", None),
        ("26-01 (Mirzayeva.D)", "26-01"),
        ("26-02 (Ochilov.D)", "26-02"),
        ("26-03 (To'rayeva.S)", "26-03"),
        ("26-04 (Hamdamova.M)", "26-04"),
        ("26-05 (Rayimova.X)", "26-05"),
        ("26-06 (Yuldashev.O)", "26-06"),
        ("26-07 (Asraliyev.A)", "26-07")
    ]

    NEW_HEADERS = [
        "T/R",
        "Guruh",
        "I.F.O",
        "Yo'nalishi",
        "To'lov statusi",
        "Shartnoma raqami",
        "Sanasi",
        "Otasining ismi (Sharifi)",
        "To'liq F.I.SH",
        "Passport bo'yicha F.I.SH",
        "Passport / ID-karta (Seriya va raqam)",
        "JSHSHIR (PINFL)",
        "Berilgan sanasi",
        "Tug'ilgan sanasi",
        "Shahodatnoma bo'yicha F.I.SH",
        "Shahodatnoma / Diplom Seriyasi",
        "Shahodatnoma QR Havolasi (e-shahodatnoma.uz)",
        "Tugatgan o'qish joyi",
        "Ta'lim muassasasi turi",
        "Bitirgan yili",
        "Qidiruv holati (Status)",
        "Izoh va Eslatmalar (Notes)",
        "Ism mosligi (Pasport / Shahodatnoma)",
        "Operator Tasdig'i"
    ]

    # Barcha talabalar qatorlarini yig'ish (bo'sh qatorlar filtrlanadi)
    all_rows = []
    for r in range(2, source_ws.max_row + 1):
        vals = [source_ws.cell(row=r, column=c).value for c in range(1, source_ws.max_column + 1)]
        if not vals[1] and not vals[4]:
            continue
        while len(vals) < 25:
            vals.append("")
        if not vals[24]:
            vals[24] = "KUTILMOQDA"
        all_rows.append(vals)

    for sheet_title, grp_filter in GROUPS_CONFIG:
        ws = out_wb.create_sheet(title=sheet_title)
        ws.append(NEW_HEADERS)

        # Qatorlarni saralash va filtrlash
        if grp_filter:
            # Faqat shu guruh talabalari, familiyasi bo'yicha alifbo (A-Z) tartibida
            sheet_rows = [r for r in all_rows if str(r[22] or '').strip() == grp_filter]
            sheet_rows.sort(key=lambda x: str(x[1] or '').strip().lower())
        else:
            # Jami sahifasi: guruh va alifbo tartibida
            sheet_rows = list(all_rows)
            sheet_rows.sort(key=lambda x: (str(x[22] or '').strip(), str(x[1] or '').strip().lower()))

        out_tr = 1
        for row_vals in sheet_rows:
            stat_val = str(row_vals[20] or '').strip().upper()
            if filter_status and filter_status not in ['ALL', 'BARCHASI', '']:
                if filter_status in ['TOPILDI', 'FULL'] and 'TOPILDI' not in stat_val: continue
                if filter_status in ['CHALA'] and 'CHALA' not in stat_val: continue
                if filter_status in ['YOQ', 'FAYL_YOQ', 'TOPILMADI'] and ('FAYL_YOQ' not in stat_val and 'YOQ' not in stat_val): continue

            # 24 ustunli yangi qator (Telefon raqami (20-ustun) chiqarib tashlangan, Guruh 2-ustunda joylashtirilgan)
            new_row = [
                out_tr,                                         # 1: T/R
                str(row_vals[22] or '').strip(),                # 2: Guruh (Boshida, filterlash uchun)
                row_vals[1] or '',                              # 3: I.F.O
                row_vals[2] or '',                              # 4: Yo'nalishi
                row_vals[3] or '',                              # 5: To'lov statusi
                row_vals[4] or '',                              # 6: Shartnoma raqami
                row_vals[5] or '',                              # 7: Sanasi
                row_vals[6] or '',                              # 8: Otasining ismi
                row_vals[7] or '',                              # 9: To'liq F.I.SH
                row_vals[8] or '',                              # 10: Passport bo'yicha F.I.SH
                row_vals[9] or '',                              # 11: Passport / ID-karta
                row_vals[10] or '',                             # 12: JSHSHIR (PINFL)
                row_vals[11] or '',                             # 13: Berilgan sanasi
                row_vals[12] or '',                             # 14: Tug'ilgan sanasi
                row_vals[13] or '',                             # 15: Shahodatnoma bo'yicha F.I.SH
                row_vals[14] or '',                             # 16: Shahodatnoma / Diplom Seriyasi
                row_vals[15] or '',                             # 17: Shahodatnoma QR Havolasi
                row_vals[16] or '',                             # 18: Tugatgan o'qish joyi
                row_vals[17] or '',                             # 19: Ta'lim muassasasi turi
                row_vals[18] or '',                             # 20: Bitirgan yili
                row_vals[20] or '',                             # 21: Qidiruv holati (Status)
                row_vals[21] or '',                             # 22: Izoh va Eslatmalar
                row_vals[23] or '',                             # 23: Ism mosligi
                row_vals[24] or 'KUTILMOQDA'                    # 24: Operator Tasdig'i
            ]
            ws.append(new_row)
            out_tr += 1

        apply_full_excel_styling(out_wb, ws)

    if default_sheet in out_wb.worksheets:
        out_wb.remove(default_sheet)

    if "Jami" in out_wb.sheetnames:
        out_wb.active = out_wb["Jami"]

    return out_wb

class WebServerHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed_path = unquote(self.path.split('?')[0])

        if parsed_path in ('/', '/index.html', '/hisobot.html', '/natijalar_hisoboti.html', '/qayta_tekshiruv/hisobot.html'):
            target_html = None
            for candidate in [
                os.path.join(BASE_DIR, 'hisobot.html'),
                os.path.join(BASE_DIR, 'natijalar_hisoboti.html'),
                os.path.join(BASE_DIR, 'qayta_tekshiruv', 'hisobot.html')
            ]:
                if os.path.exists(candidate):
                    target_html = candidate
                    break
            if target_html:
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                with open(target_html, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, "Hisobot sahifasi topilmadi. Avval hisobotni yarating.")
            return

        if parsed_path in ('/Talabalar_Yangilangan_Royxat.xlsx', '/Talabalar_Toliq_Royxati.xlsx'):
            ex_file = os.path.join(BASE_DIR, 'Talabalar_Yangilangan_Royxat.xlsx')
            if not os.path.exists(ex_file):
                ex_file = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
            if os.path.exists(ex_file):
                self.send_response(200)
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                self.send_header('Content-Disposition', f'attachment; filename="{os.path.basename(ex_file)}"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                with open(ex_file, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, "Excel topilmadi")
            return

        if parsed_path.startswith('/api/doc_preview'):
            query = self.path.split('?')[-1] if '?' in self.path else ''
            params = dict(qc.split('=') for qc in query.split('&') if '=' in qc)
            fname = unquote(params.get('file', '')).strip()
            
            target_path = os.path.join(FILES_DIR, fname)
            if not os.path.exists(target_path):
                # Aniq faylni topish
                for f in os.listdir(FILES_DIR):
                    if f.lower() == fname.lower():
                        target_path = os.path.join(FILES_DIR, f)
                        break
            if os.path.exists(target_path) and os.path.isfile(target_path):
                try:
                    images, _, doc_text = extract_doc_images_with_crop(target_path)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": True,
                        "filename": os.path.basename(target_path),
                        "filepath": os.path.abspath(target_path),
                        "text": doc_text,
                        "images": images
                    }).encode('utf-8'))
                    return
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                    return
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": f"Fayl topilmadi: {fname}"}).encode('utf-8'))
                return

        if parsed_path.startswith('/api/reanalyze_student'):
            query = self.path.split('?')[-1] if '?' in self.path else ''
            params = dict(qc.split('=') for qc in query.split('&') if '=' in qc)
            fname = unquote(params.get('file', '')).strip()
            row_idx = int(params.get('row', '0'))
            
            target_path = os.path.join(FILES_DIR, fname)
            if not os.path.exists(target_path):
                for f in os.listdir(FILES_DIR):
                    if f.lower() == fname.lower():
                        target_path = os.path.join(FILES_DIR, f)
                        break

            if not os.path.exists(target_path) or not os.path.isfile(target_path):
                self.send_response(404)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Fayl topilmadi"}).encode('utf-8'))
                return

            try:
                import openpyxl, urllib.request
                _, image_blobs, _ = extract_doc_images_with_crop(target_path)

                if not image_blobs:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Faylda rasm topilmadi"}).encode('utf-8'))
                    return

                # 1-QADAM: AVVAL QR KODLARNI TEKSHIRISH (100% RASMIY VA ANIQ!)
                qr_extracted = scan_all_qrs(image_blobs)
                print(f"reanalyze_student QR natijasi: {qr_extracted}")

                # 2-QADAM: GEMINI 2.5 PRO MODELI ORQALI CHUQUR TAHLIL
                use_model = "google/gemini-2.5-pro" if (params.get('model') == 'pro' or params.get('pro') == '1' or True) else "google/gemini-2.5-flash"
                print(f"reanalyze_student ishlatilayotgan AI modeli: {use_model}")

                content_items = [{"type": "text", "text": """Sen professional O'zbekiston ID-karta, Biometrik pasport va Shahodatnoma/Diplom o'quvchisisan.
Ushbu rasmlarni juda sinchiklab tahlil qil va talabaning haqiqiy ma'lumotlarini chiqargin.

Qat'iy Qoidalar:
1. Pasport/ID seriya va raqami:
   - ID-karta: 'AD' yoki 'AE' harflari va KETMA-KET ANIQ 7 TA RAQAM (jami 9 ta belgi!). Masalan: AD1234567, AE4629898.
   - Biometrik pasport: 'AA', 'AB', 'AC', 'FA' va 7 ta raqam.
   - Hech qachon 8 ta yoki 6 ta raqam yozma!
2. JSHSHIR (PINFL):
   - ID-karta yoki pasport pastidagi/orqasidagi ANIQ 14 xonali raqam!
3. Tug'ilgan sana (DOB):
   - Pasportdagi tug'ilgan sana (DD.MM.YYYY).
4. Pasport BERILGAN SANASI (Date of issue):
   - FAQAT Pasport yoki ID-karta berilgan sanasi (Date of issue: DD.MM.YYYY).
   - Shahodatnoma sanasini yoki kelajak sanani EMAS!
5. Shahodatnoma yoki Diplom:
   - Hujjat turi: Maktab bo'lsa 'Shahodatnoma', Kollej/Litsey/Texnikum bo'lsa 'Diplom'
   - Seriya va raqami: Masalan 'UM 03729356' yoki 'T-V 123456'
   - Maktab/Muassasa nomi: Maktab yoki Kollejning to'liq nomi
   - Bitirgan yili: Masalan '2024'

Aniq JSON formatda qaytar:
{
  "ism": "Familiya Ism",
  "ota": "... qizi yoki ... o'g'li",
  "pass_ser": "AE1234567",
  "pinfl": "14 xonali PINFL",
  "dob": "DD.MM.YYYY",
  "pass_ber": "DD.MM.YYYY",
  "sh_doc": "UM 1234567",
  "doc_tur": "Shahodatnoma",
  "maktab": "...-maktab",
  "yil": "2024"
}"""}]

                for b in image_blobs:
                    b64 = base64.b64encode(b).decode('utf-8')
                    content_items.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})

                ai_payload = {
                    "model": use_model,
                    "messages": [{"role": "user", "content": content_items}],
                    "temperature": 0.0
                }

                req = urllib.request.Request(
                    "https://openrouter.ai/api/v1/chat/completions",
                    data=json.dumps(ai_payload).encode('utf-8'),
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
                )

                parsed_ai = {}
                with urllib.request.urlopen(req, timeout=45) as resp:
                    res_data = json.loads(resp.read().decode('utf-8'))
                    raw_txt = res_data['choices'][0]['message']['content'].strip()
                    raw_txt = re.sub(r'^```json\s*', '', raw_txt)
                    raw_txt = re.sub(r'\s*```$', '', raw_txt)
                    parsed_ai = json.loads(raw_txt)

                # QR kod ma'lumotlarini birlashtirish (QR ustuvor!)
                if qr_extracted:
                    if qr_extracted.get('ism'): parsed_ai['ism'] = clean_uz_name(qr_extracted['ism'])
                    if qr_extracted.get('ota'): parsed_ai['ota'] = clean_uz_name(qr_extracted['ota'])
                    if qr_extracted.get('pass_val'): parsed_ai['pass_ser'] = qr_extracted['pass_val']
                    if qr_extracted.get('pinfl'): parsed_ai['pinfl'] = qr_extracted['pinfl']
                    if qr_extracted.get('dob'): parsed_ai['dob'] = qr_extracted['dob']
                    if qr_extracted.get('cert_val'): parsed_ai['sh_doc'] = qr_extracted['cert_val']
                    if qr_extracted.get('cert_tur'): parsed_ai['doc_tur'] = qr_extracted['cert_tur']
                    if qr_extracted.get('maktab'): parsed_ai['maktab'] = qr_extracted['maktab']
                    if qr_extracted.get('yil'): parsed_ai['yil'] = qr_extracted['yil']
                    if qr_extracted.get('sh_qr'): parsed_ai['sh_qr'] = qr_extracted['sh_qr']

                # Pasport seriya 7 raqam bo'lishini to'g'rilash
                if parsed_ai.get('pass_ser'):
                    m_fix = re.search(r'([A-Z]{2})(\d{7})', parsed_ai['pass_ser'])
                    if m_fix:
                        parsed_ai['pass_ser'] = m_fix.group(1) + m_fix.group(2)

                # Excelga saqlash
                if row_idx >= 2:
                    wb = openpyxl.load_workbook(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                    ws = wb.active
                    # ASL RO'YXAT HIMOYASI: 2 va 7-ustun foydalanuvchining o'z
                    # ro'yxati. AI ularni O'ZGARTIRMAYDI — faqat BO'SH bo'lsa to'ldiradi.
                    # (AI o'qigan ism 9-ustunda ko'rinadi.)
                    if parsed_ai.get('ism') and not str(ws.cell(row=row_idx, column=2).value or '').strip():
                        ws.cell(row=row_idx, column=2, value=clean_uz_name(parsed_ai['ism']))
                    if parsed_ai.get('ota') and not str(ws.cell(row=row_idx, column=7).value or '').strip():
                        ws.cell(row=row_idx, column=7, value=clean_uz_name(parsed_ai['ota']))
                    
                    cur_ism = clean_uz_name(parsed_ai.get('ism', '')) or str(ws.cell(row=row_idx, column=2).value or '')
                    cur_ota = clean_uz_name(parsed_ai.get('ota', '')) or str(ws.cell(row=row_idx, column=7).value or '')
                    ws.cell(row=row_idx, column=8, value=f"{cur_ism} {cur_ota}".strip())
                    # 9-ustun (Passport bo'yicha F.I.SH) — bu yerda yozilmaydi,
                    # uni scripts/verify_passport_names.py boshqaradi.

                    if parsed_ai.get('pass_ser'): ws.cell(row=row_idx, column=10, value=parsed_ai['pass_ser'])
                    if parsed_ai.get('pinfl'): ws.cell(row=row_idx, column=11, value=str(parsed_ai['pinfl']))
                    if parsed_ai.get('pass_ber'): ws.cell(row=row_idx, column=12, value=parsed_ai['pass_ber'])
                    if parsed_ai.get('dob'): ws.cell(row=row_idx, column=13, value=parsed_ai['dob'])
                    ws.cell(row=row_idx, column=14, value="Mavjud")
                    if parsed_ai.get('sh_doc'): ws.cell(row=row_idx, column=15, value=parsed_ai['sh_doc'])
                    if parsed_ai.get('sh_qr'): ws.cell(row=row_idx, column=16, value=parsed_ai['sh_qr'])
                    if parsed_ai.get('maktab'): ws.cell(row=row_idx, column=17, value=parsed_ai['maktab'])
                    if parsed_ai.get('doc_tur'): ws.cell(row=row_idx, column=18, value=parsed_ai['doc_tur'])
                    if parsed_ai.get('yil'): ws.cell(row=row_idx, column=19, value=str(parsed_ai['yil']))
                    
                    wb.save(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                    wb.save(os.path.join(BASE_DIR, 'Talabalar_Yangilangan_Royxat.xlsx'))

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "filename": os.path.basename(target_path),
                    "filepath": os.path.abspath(target_path),
                    "data": parsed_ai
                }).encode('utf-8'))
                return

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        # ========================================================
        # 1. FAQAT QR-KOD BO'YICHA 100% RASMIY SKAN QILISH ENDPOINTI
        # ========================================================
        if parsed_path.startswith('/api/scan_student_qr'):
            query = self.path.split('?')[-1] if '?' in self.path else ''
            params = dict(qc.split('=') for qc in query.split('&') if '=' in qc)
            fname = unquote(params.get('file', '')).strip()
            row_idx = int(params.get('row', '0'))
            
            target_path = os.path.join(FILES_DIR, fname)
            if not os.path.exists(target_path):
                for f in os.listdir(FILES_DIR):
                    if f.lower() == fname.lower():
                        target_path = os.path.join(FILES_DIR, f)
                        break

            if not os.path.exists(target_path) or not os.path.isfile(target_path):
                self.send_response(404)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Fayl topilmadi"}).encode('utf-8'))
                return

            try:
                import openpyxl
                _, image_blobs, _ = extract_doc_images_with_crop(target_path)
                if not image_blobs:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Faylda rasm topilmadi"}).encode('utf-8'))
                    return

                # Barcha rasmlarni 4 burchakda skan qilamiz
                qr_res = scan_all_qrs(image_blobs)
                print(f"scan_student_qr natijasi: {qr_res}")

                if not qr_res:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Rasmlarda QR-kod yoki MRZ topilmadi"}).encode('utf-8'))
                    return

                # Excelga saqlash
                if row_idx >= 2:
                    wb = openpyxl.load_workbook(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                    ws = wb.active
                    # ASL RO'YXAT HIMOYASI — faqat bo'sh bo'lsa to'ldiriladi
                    if qr_res.get('ism') and not str(ws.cell(row=row_idx, column=2).value or '').strip():
                        ws.cell(row=row_idx, column=2, value=clean_uz_name(qr_res['ism']))
                    if qr_res.get('ota') and not str(ws.cell(row=row_idx, column=7).value or '').strip():
                        ws.cell(row=row_idx, column=7, value=clean_uz_name(qr_res['ota']))
                    cur_ism = clean_uz_name(qr_res.get('ism', '')) or str(ws.cell(row=row_idx, column=2).value or '')
                    cur_ota = clean_uz_name(qr_res.get('ota', '')) or str(ws.cell(row=row_idx, column=7).value or '')
                    ws.cell(row=row_idx, column=8, value=f"{cur_ism} {cur_ota}".strip())
                    # 9-ustun (Passport bo'yicha F.I.SH) — bu yerda yozilmaydi,
                    # uni scripts/verify_passport_names.py boshqaradi.
                    if qr_res.get('pass_val'): ws.cell(row=row_idx, column=10, value=qr_res['pass_val'])
                    if qr_res.get('pinfl'): ws.cell(row=row_idx, column=11, value=str(qr_res['pinfl']))
                    if qr_res.get('dob'): ws.cell(row=row_idx, column=13, value=qr_res['dob'])
                    ws.cell(row=row_idx, column=14, value="Mavjud")
                    if qr_res.get('cert_val'): ws.cell(row=row_idx, column=15, value=qr_res['cert_val'])
                    if qr_res.get('sh_qr'): ws.cell(row=row_idx, column=16, value=qr_res['sh_qr'])
                    if qr_res.get('maktab'): ws.cell(row=row_idx, column=17, value=qr_res['maktab'])
                    if qr_res.get('cert_tur'): ws.cell(row=row_idx, column=18, value=qr_res['cert_tur'])
                    if qr_res.get('yil'): ws.cell(row=row_idx, column=19, value=str(qr_res['yil']))
                    wb.save(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                    wb.save(os.path.join(BASE_DIR, 'Talabalar_Yangilangan_Royxat.xlsx'))

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "filename": os.path.basename(target_path),
                    "data": {
                        "ism": qr_res.get('ism', ''),
                        "ota": qr_res.get('ota', ''),
                        "pass_ser": qr_res.get('pass_val', ''),
                        "pinfl": qr_res.get('pinfl', ''),
                        "dob": qr_res.get('dob', ''),
                        "sh_doc": qr_res.get('cert_val', ''),
                        "doc_tur": qr_res.get('cert_tur', 'Shahodatnoma'),
                        "maktab": qr_res.get('maktab', ''),
                        "yil": str(qr_res.get('yil', '2024')),
                        "sh_qr": qr_res.get('sh_qr', '')
                    }
                }).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        # ========================================================
        # 2. TALABANI BAZADAN BUTUNLAY O'CHIRISH (DELETE STUDENT)
        # ========================================================
        if parsed_path.startswith('/api/delete_student'):
            query = self.path.split('?')[-1] if '?' in self.path else ''
            params = dict(qc.split('=') for qc in query.split('&') if '=' in qc)
            row_idx = int(params.get('row', '0'))

            if row_idx < 2:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Noto'g'ri qator indeksi"}).encode('utf-8'))
                return

            try:
                import openpyxl, subprocess
                wb = openpyxl.load_workbook(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                ws = wb.active
                
                deleted_name = str(ws.cell(row=row_idx, column=2).value or '')
                ws.delete_rows(row_idx)
                
                # T/r larni qayta tartiblash
                for idx, r in enumerate(range(2, ws.max_row + 1), start=1):
                    ws.cell(row=r, column=1, value=idx)
                    
                wb.save(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                wb.save(os.path.join(BASE_DIR, 'Talabalar_Yangilangan_Royxat.xlsx'))
                
                # Hisobotni qayta yaratish
                trigger_report_rebuild()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "deleted_row": row_idx,
                    "deleted_name": deleted_name,
                    "remaining_total": ws.max_row - 1
                }).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        if parsed_path.startswith('/api/update_student'):
            query = self.path.split('?')[-1] if '?' in self.path else ''
            params = dict(qc.split('=') for qc in query.split('&') if '=' in qc)
            row_idx = int(params.get('row', '0'))

            if row_idx < 2:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Noto'g'ri qator indeksi"}).encode('utf-8'))
                return

            try:
                def get_param(k):
                    val = params.get(k, None)
                    return unquote(val).strip() if val is not None else None

                ism = clean_uz_name(get_param('ism')) if get_param('ism') is not None else None
                ota = clean_uz_name(get_param('ota')) if get_param('ota') is not None else None
                pv = get_param('pv')
                pinfl = get_param('pinfl')
                dob = get_param('dob')
                ber = get_param('ber')
                sh_doc = get_param('sh_doc')
                doc_tur = get_param('doc_tur')
                mak = get_param('mak')
                yil = get_param('yil')
                yon = get_param('yon')
                group = get_param('group')
                verify = get_param('verify')

                if verify:
                    save_verification_atomic(row_idx, verify, pinfl=pinfl)

                with EXCEL_LOCK:
                    import openpyxl
                    excel_path = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
                    wb = openpyxl.load_workbook(excel_path)
                    ws = wb.worksheets[0]

                    if ism is not None: ws.cell(row=row_idx, column=2, value=ism)
                    if ota is not None: ws.cell(row=row_idx, column=7, value=ota)
                    
                    cur_ism = ism if ism is not None else str(ws.cell(row=row_idx, column=2).value or '')
                    cur_ota = ota if ota is not None else str(ws.cell(row=row_idx, column=7).value or '')
                    ws.cell(row=row_idx, column=8, value=f"{cur_ism} {cur_ota}".strip())

                    if pv is not None: ws.cell(row=row_idx, column=10, value=pv)
                    if pinfl is not None: ws.cell(row=row_idx, column=11, value=pinfl)
                    if ber is not None: ws.cell(row=row_idx, column=12, value=ber)
                    if dob is not None: ws.cell(row=row_idx, column=13, value=dob)
                    if sh_doc is not None: ws.cell(row=row_idx, column=15, value=sh_doc)
                    if mak is not None: ws.cell(row=row_idx, column=17, value=mak)
                    if doc_tur is not None: ws.cell(row=row_idx, column=18, value=doc_tur)
                    if yil is not None: ws.cell(row=row_idx, column=19, value=yil)
                    if yon is not None: ws.cell(row=row_idx, column=3, value=yon)
                    if group is not None and group: ws.cell(row=row_idx, column=23, value=group)
                    
                    if verify is not None:
                        if ws.cell(row=1, column=25).value != "Operator Tasdig'i":
                            ws.cell(row=1, column=25, value="Operator Tasdig'i")
                        ws.cell(row=row_idx, column=25, value=verify)

                    wb.save(excel_path)
                    wb.save(os.path.join(BASE_DIR, 'Talabalar_Yangilangan_Royxat.xlsx'))

                # Debounced hisobot qayta generatsiya
                trigger_report_rebuild(delay=1.5)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Ma'lumotlar muvaffaqiyatli saqlandi!"}).encode('utf-8'))
                return

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        if parsed_path == '/api/get_verifications':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            self.end_headers()
            vmap = load_verifications_map()
            self.wfile.write(json.dumps({"success": True, "verifications": vmap}).encode('utf-8'))
            return

        if parsed_path.startswith('/api/verify_student'):
            query = self.path.split('?')[-1] if '?' in self.path else ''
            params = dict(qc.split('=') for qc in query.split('&') if '=' in qc)
            row_idx = int(params.get('row', '0'))
            v_status = unquote(params.get('status', 'TASDIQLANDI')).strip().upper()
            target_shnum = unquote(params.get('shnum', '')).strip()
            target_pinfl = unquote(params.get('pinfl', '')).strip()
            target_name = unquote(params.get('ism', '')).strip()

            if row_idx < 2 and not target_shnum and not target_pinfl and not target_name:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Noto'g'ri qator yoki talaba ma'lumotlari"}).encode('utf-8'))
                return

            # 1. Tezkor JSON keshga darhol saqlash (1ms) — F5 da mutlaqo yo'qolmasligi uchun
            save_verification_atomic(row_idx, v_status, target_shnum, target_pinfl)

            # 2. Excel bazaga xavfsiz Lock va Retry bilan yozish
            excel_saved = False
            excel_err = None
            excel_path = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')

            with EXCEL_LOCK:
                for attempt in range(3):
                    try:
                        import openpyxl
                        wb = openpyxl.load_workbook(excel_path)
                        main_ws = wb.worksheets[0]
                        if row_idx <= main_ws.max_row:
                            if not target_shnum:
                                target_shnum = str(main_ws.cell(row=row_idx, column=5).value or '').strip()
                            if not target_pinfl:
                                target_pinfl = str(main_ws.cell(row=row_idx, column=11).value or '').strip()
                            if not target_name:
                                target_name = str(main_ws.cell(row=row_idx, column=2).value or '').strip()

                        for sheet in wb.worksheets:
                            if sheet.cell(row=1, column=25).value != "Operator Tasdig'i":
                                sheet.cell(row=1, column=25, value="Operator Tasdig'i")
                            
                            if sheet == main_ws and row_idx <= sheet.max_row:
                                sheet.cell(row=row_idx, column=25, value=v_status)
                            else:
                                for r in range(2, sheet.max_row + 1):
                                    s_shnum = str(sheet.cell(row=r, column=5).value or '').strip()
                                    s_pinfl = str(sheet.cell(row=r, column=11).value or '').strip()
                                    s_name = str(sheet.cell(row=r, column=2).value or '').strip()
                                    if (target_shnum and s_shnum == target_shnum) or (target_pinfl and s_pinfl == target_pinfl) or (target_name and s_name == target_name):
                                        sheet.cell(row=r, column=25, value=v_status)
                                        break

                        wb.save(excel_path)
                        excel_saved = True
                        break
                    except Exception as ex:
                        excel_err = ex
                        time.sleep(0.2)

            if not excel_saved:
                print(f"[OGOHLANTIRISH] Excel saqlashda vaqtinchalik ogohlantirish ({excel_err}), lekin JSON keshda 100% saqlandi!")

            # 3. Debounced qayta hisobot yasash (1.5s ichida yangi kliklar kutiladi)
            trigger_report_rebuild(delay=1.5)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "row": row_idx, "status": v_status}).encode('utf-8'))
            return

        if parsed_path.startswith('/api/add_new_student'):
            query = self.path.split('?')[-1] if '?' in self.path else ''
            params = dict(qc.split('=') for qc in query.split('&') if '=' in qc)

            try:
                import openpyxl
                wb = openpyxl.load_workbook(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                ws = wb.active

                def get_param(k):
                    val = params.get(k, None)
                    return unquote(val).strip() if val is not None else ''

                ism = clean_uz_name(get_param('ism'))
                ota = clean_uz_name(get_param('ota'))
                fish = f"{ism} {ota}".strip() if ota else ism
                shnum = get_param('shnum')
                pv = get_param('pv')
                pinfl = get_param('pinfl')
                dob = get_param('dob')
                ber = get_param('ber')  # FAQAT pasport berilgan sanasi
                sh_doc = get_param('sh_doc')
                doc_tur = get_param('doc_tur') or 'Shahodatnoma'
                mak = get_param('mak')
                yil = get_param('yil')
                yon = get_param('yon') or 'Hamshiralik ishi - 3 yillik'
                tel = get_param('tel')
                group = get_param('group') or ('26-01' if 'farmat' in yon.lower() else '26-02')
                doc_file = get_param('doc_file')

                if not ism:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Talaba ismi kiritilishi shart!"}).encode('utf-8'))
                    return

                # Shartnoma raqami avtomatik qo'yilmaydi — faqat kiritilgan bo'lsagina saqlanadi
                shnum = shnum.strip() if shnum else ""

                new_row = ws.max_row + 1
                tr_num = new_row - 1

                ws.cell(row=new_row, column=1, value=tr_num)
                ws.cell(row=new_row, column=2, value=ism)
                ws.cell(row=new_row, column=3, value=yon)
                ws.cell(row=new_row, column=4, value="To'lov qildi")
                ws.cell(row=new_row, column=5, value=shnum)
                ws.cell(row=new_row, column=6, value="")
                ws.cell(row=new_row, column=7, value=ota)
                ws.cell(row=new_row, column=8, value=fish)
                # 9-ustun (Passport bo'yicha F.I.SH) — bu yerda yozilmaydi,
                # uni scripts/verify_passport_names.py boshqaradi.
                ws.cell(row=new_row, column=10, value=pv)
                ws.cell(row=new_row, column=11, value=pinfl)
                ws.cell(row=new_row, column=12, value=ber)
                ws.cell(row=new_row, column=13, value=dob)
                ws.cell(row=new_row, column=14, value="Mavjud" if (pv or sh_doc) else "Yo'q")
                ws.cell(row=new_row, column=15, value=sh_doc)
                ws.cell(row=new_row, column=16, value="")
                ws.cell(row=new_row, column=17, value=mak)
                ws.cell(row=new_row, column=18, value=doc_tur)
                ws.cell(row=new_row, column=19, value=yil)
                ws.cell(row=new_row, column=20, value=tel)
                ws.cell(row=new_row, column=23, value=group)

                wb.save(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                wb.save(os.path.join(BASE_DIR, 'Talabalar_Yangilangan_Royxat.xlsx'))

                # Fondada hisobot HTML larini ham yangilash
                trigger_report_rebuild()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": f"Yangi talaba #{shnum} {fish} muvaffaqiyatli qo'shildi!" if shnum else f"Yangi talaba {fish} muvaffaqiyatli qo'shildi!",
                    "row": new_row,
                    "shnum": shnum
                }).encode('utf-8'))
                return

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        if parsed_path.startswith('/js/') or parsed_path.startswith('/css/') or parsed_path.startswith('/images/') or parsed_path.startswith('/pdf_jurnallar/'):
            rel_path = parsed_path.lstrip('/')
            static_file = os.path.join(BASE_DIR, rel_path)
            if os.path.exists(static_file) and os.path.isfile(static_file):
                mime, _ = mimetypes.guess_type(static_file)
                if not mime:
                    if rel_path.endswith('.js'): mime = 'application/javascript; charset=utf-8'
                    elif rel_path.endswith('.css'): mime = 'text/css; charset=utf-8'
                    elif rel_path.endswith('.png'): mime = 'image/png'
                    elif rel_path.endswith('.jpg') or rel_path.endswith('.jpeg'): mime = 'image/jpeg'
                    elif rel_path.endswith('.svg'): mime = 'image/svg+xml'
                    elif rel_path.endswith('.pdf'): mime = 'application/pdf'
                    else: mime = 'application/octet-stream'
                self.send_response(200)
                self.send_header('Content-Type', mime)
                if rel_path.endswith('.pdf'):
                    self.send_header('Content-Disposition', f'inline; filename="{os.path.basename(static_file)}"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                with open(static_file, 'rb') as f:
                    self.wfile.write(f.read())
                return

        if parsed_path.startswith('/files/'):
            fname = parsed_path[7:]
            target_path = os.path.join(FILES_DIR, fname)
            if os.path.exists(target_path) and os.path.isfile(target_path):
                self.send_response(200)
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                self.send_header('Content-Disposition', f'attachment; filename="{os.path.basename(target_path)}"')
                self.end_headers()
                with open(target_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
            else:
                self.send_error(404, f"Fayl topilmadi: {fname}")
                return

        if parsed_path == '/api/export_full_excel' or parsed_path == '/api/export_excel':
            query = self.path.split('?')[-1] if '?' in self.path else ''
            params = dict(qc.split('=') for qc in query.split('&') if '=' in qc)
            filter_group = params.get('group', None)
            if filter_group: filter_group = unquote(filter_group).strip().upper()
            filter_status = params.get('status', None)
            if filter_status: filter_status = unquote(filter_status).strip().upper()

            try:
                import io
                import openpyxl

                source_wb = openpyxl.load_workbook(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'), data_only=True)
                source_ws = source_wb.active

                # Barcha guruhlarni alohida sahifalar (Multi-Sheet) bilan to'liq yaratish
                out_wb = build_full_multisheet_excel(source_ws, filter_status=filter_status)

                # Agar ma'lum bir guruh tanlangan bo'lsa, o'sha varaqni faol qilish
                if filter_group and filter_group not in ['ALL', 'BARCHASI', '']:
                    for sname in out_wb.sheetnames:
                        if filter_group in sname:
                            out_wb.active = out_wb[sname]
                            break

                output_stream = io.BytesIO()
                out_wb.save(output_stream)
                output_stream.seek(0)

                dl_name = "Talabalar_Barcha_Guruhlar_2026-2027.xlsx"
                self.send_response(200)
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                self.send_header('Content-Disposition', f'attachment; filename="{dl_name}"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(output_stream.getvalue())
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        if parsed_path == '/api/export_all_groups_excel':
            try:
                import io
                import openpyxl

                source_wb = openpyxl.load_workbook(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'), data_only=True)
                source_ws = source_wb.active

                out_wb = build_full_multisheet_excel(source_ws)

                output_stream = io.BytesIO()
                out_wb.save(output_stream)
                output_stream.seek(0)

                dl_name = "Talabalar_Barcha_Guruhlar_2026-2027.xlsx"
                self.send_response(200)
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                self.send_header('Content-Disposition', f'attachment; filename="{dl_name}"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(output_stream.getvalue())
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        if parsed_path == '/api/view_group_pdf':
            query = self.path.split('?')[-1] if '?' in self.path else ''
            params = dict(qc.split('=') for qc in query.split('&') if '=' in qc)
            target_group = params.get('group', '26-01')
            if target_group: target_group = unquote(target_group).strip()
            pdf_path = os.path.join(BASE_DIR, 'pdf_jurnallar', f"Guruh_{target_group}.pdf")
            if not os.path.exists(pdf_path):
                try:
                    from generate_pdfs import build_all_group_pdfs
                    build_all_group_pdfs()
                except Exception as ex_pdf:
                    print(f"PDF yaratishda xatolik: {ex_pdf}")
            if os.path.exists(pdf_path):
                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                self.send_header('Content-Disposition', f'inline; filename="Guruh_{target_group}.pdf"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                with open(pdf_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
            else:
                self.send_error(404, f"Guruh PDF topilmadi: {target_group}")
                return

        if parsed_path == '/api/export_group_journal' or parsed_path == '/api/export_group_excel':
            # 1-list: Jami (Guruhi|T/R|F.I.SH|Sana), 2-8 listlar: Har guruh alohida (T/R|F.I.SH|Sana)
            try:
                import io
                import openpyxl
                from openpyxl.styles import Font, Alignment, Border, Side
                from openpyxl.utils import get_column_letter

                source_wb = openpyxl.load_workbook(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                source_ws = source_wb.active

                students = []
                for r in range(2, source_ws.max_row + 1):
                    ism = str(source_ws.cell(row=r, column=2).value or '').strip()
                    shnum = str(source_ws.cell(row=r, column=5).value or '').strip()
                    ota = str(source_ws.cell(row=r, column=7).value or '').strip()
                    fish = str(source_ws.cell(row=r, column=8).value or '').strip()
                    dob = str(source_ws.cell(row=r, column=13).value or '').strip()
                    group = str(source_ws.cell(row=r, column=23).value or '').strip()

                    if not ism and not shnum: continue
                    if not group: continue
                    full_fio = fish or f"{ism} {ota}".strip()
                    students.append({'ism': ism, 'fio': full_fio, 'dob': dob, 'group': group})

                GROUPS = ["26-01", "26-02", "26-03", "26-04", "26-05", "26-06", "26-07"]
                students.sort(key=lambda x: (GROUPS.index(x['group']) if x['group'] in GROUPS else 99, x['ism'].lower()))

                out_wb = openpyxl.Workbook()

                black_thin_border = Border(
                    left=Side(style='thin', color='000000'),
                    right=Side(style='thin', color='000000'),
                    top=Side(style='thin', color='000000'),
                    bottom=Side(style='thin', color='000000')
                )
                header_border = Border(
                    left=Side(style='thin', color='000000'),
                    right=Side(style='thin', color='000000'),
                    top=Side(style='medium', color='000000'),
                    bottom=Side(style='medium', color='000000')
                )

                def setup_print(ws):
                    ws.page_setup.orientation = ws.ORIENTATION_PORTRAIT
                    ws.page_setup.paperSize = ws.PAPERSIZE_A4
                    ws.page_setup.fitToWidth = 1
                    ws.sheet_properties.pageSetUpPr.fitToPage = True
                    ws.page_margins.left = 0.33
                    ws.page_margins.right = 0.33
                    ws.page_margins.top = 0.35
                    ws.page_margins.bottom = 0.35
                    ws.print_options.horizontalCentered = True

                # ============================================================
                # 1-LIST: JAMI — Guruhi | T/R | F.I.SH | Tug'ilgan Sana
                # ============================================================
                ws_jami = out_wb.active
                ws_jami.title = "Jami"
                setup_print(ws_jami)

                ws_jami.merge_cells('A1:D1')
                tc = ws_jami['A1']
                tc.value = "2026-2027 O'QUV YILI | BARCHA GURUHLAR TALABALARI RO'YXATI"
                tc.font = Font(name='Cambria', size=16, bold=True, color='000000')
                tc.alignment = Alignment(horizontal='center', vertical='center')
                ws_jami.row_dimensions[1].height = 30
                ws_jami.row_dimensions[2].height = 8

                jami_headers = [
                    ("Guruhi", 10, 'center'),
                    ("T/R", 6, 'center'),
                    ("Talabaning To'liq F.I.SH", 50, 'left'),
                    ("Tug'ilgan Sana", 18, 'center'),
                ]
                ws_jami.row_dimensions[3].height = 24
                for col_idx, (h_name, width, align) in enumerate(jami_headers, 1):
                    cell = ws_jami.cell(row=3, column=col_idx, value=h_name)
                    cell.font = Font(name='Cambria', size=13, bold=True, color='000000')
                    cell.alignment = Alignment(horizontal=align, vertical='center')
                    cell.border = header_border
                    ws_jami.column_dimensions[get_column_letter(col_idx)].width = width

                current_group = None
                group_counter = 0
                row_num = 4
                for st in students:
                    if st['group'] != current_group:
                        current_group = st['group']
                        group_counter = 0
                    group_counter += 1
                    ws_jami.row_dimensions[row_num].height = 19
                    for col_idx, (val, align, bold) in enumerate([
                        (st['group'], 'center', True),
                        (group_counter, 'center', True),
                        (st['fio'], 'left', False),
                        (st['dob'] or '—', 'center', False),
                    ], 1):
                        c = ws_jami.cell(row=row_num, column=col_idx, value=val)
                        c.font = Font(name='Cambria', size=12, bold=bold, color='000000')
                        c.alignment = Alignment(horizontal=align, vertical='center')
                        c.border = black_thin_border
                    row_num += 1

                # ============================================================
                # 2-8 LISTLAR: Har guruh alohida — T/R | F.I.SH | Tug'ilgan Sana
                # ============================================================
                for g in GROUPS:
                    g_students = [s for s in students if s['group'] == g]
                    g_students.sort(key=lambda x: x['ism'].lower())

                    ws = out_wb.create_sheet(title=f"Guruh_{g}")
                    setup_print(ws)
                    ws.page_setup.fitToHeight = 1
                    ws.page_margins.header = 0.2
                    ws.page_margins.footer = 0.2
                    ws.views.sheetView[0].showGridLines = True

                    ws.merge_cells('A1:C1')
                    tc2 = ws['A1']
                    tc2.value = f"2026-2027 O'QUV YILI | {g} - GURUH TALABALARI RO'YXATI"
                    tc2.font = Font(name='Cambria', size=16, bold=True, color='000000')
                    tc2.alignment = Alignment(horizontal='center', vertical='center')
                    ws.row_dimensions[1].height = 30
                    ws.row_dimensions[2].height = 8

                    grp_headers = [
                        ("T/R", 6, 'center'),
                        ("Talabaning To'liq F.I.SH", 50, 'left'),
                        ("Tug'ilgan Sana", 18, 'center'),
                    ]
                    ws.row_dimensions[3].height = 24
                    for col_idx, (h_name, width, align) in enumerate(grp_headers, 1):
                        cell = ws.cell(row=3, column=col_idx, value=h_name)
                        cell.font = Font(name='Cambria', size=13, bold=True, color='000000')
                        cell.alignment = Alignment(horizontal=align, vertical='center')
                        cell.border = header_border
                        ws.column_dimensions[get_column_letter(col_idx)].width = width

                    for idx, st in enumerate(g_students, 1):
                        rn = 3 + idx
                        ws.row_dimensions[rn].height = 19
                        for col_idx, (val, align, bold) in enumerate([
                            (idx, 'center', True),
                            (st['fio'], 'left', False),
                            (st['dob'] or '—', 'center', False),
                        ], 1):
                            c = ws.cell(row=rn, column=col_idx, value=val)
                            c.font = Font(name='Cambria', size=12, bold=bold, color='000000')
                            c.alignment = Alignment(horizontal=align, vertical='center')
                            c.border = black_thin_border

                output_stream = io.BytesIO()
                out_wb.save(output_stream)
                output_stream.seek(0)

                self.send_response(200)
                self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                self.send_header('Content-Disposition', 'attachment; filename="Talabalar_Guruh_Jurnali_2026-2027.xlsx"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(output_stream.getvalue())
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        self.send_error(404, "Sahifa topilmadi")

    def do_POST(self):
        parsed_path = self.path.split('?')[0]

        if parsed_path == '/api/upload_and_attach_to_student':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode('utf-8'))
                b64_content = data.get('file_base64', '')
                filename = data.get('filename', 'talaba_hujjati.docx')
                row_idx = int(data.get('row', '0'))

                if not b64_content:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Fayl tanlanmagan"}).encode('utf-8'))
                    return

                docx_bytes = base64.b64decode(b64_content)
                saved_path = os.path.join(FILES_DIR, filename)
                with open(saved_path, 'wb') as f:
                    f.write(docx_bytes)

                # 1. Rasmlarni ajratib olish (Crop qilingan holda)
                images, blobs_raw, full_text = extract_doc_images_with_crop(saved_path)

                # 2. AVVAL QR KODLARNI TEKSHIRISH (100% RASMIY VA ANIQ!)
                qr_extracted = scan_all_qrs(blobs_raw)
                print(f"upload_and_attach QR natijasi: {qr_extracted}")

                # 3. AI ORQALI CHUQUR TAHLIL QILISH (GEMINI 2.5 PRO)
                content_items = [{'type': 'text', 'text': """Sen professional O'zbekiston ID-karta, Biometrik pasport va Shahodatnoma/Diplom o'quvchisisan.
Ushbu rasmlarni juda sinchiklab tahlil qil va talabaning haqiqiy ma'lumotlarini chiqargin.

Qat'iy Qoidalar:
1. Pasport/ID seriya va raqami:
   - ID-karta: 'AD' yoki 'AE' harflari va KETMA-KET ANIQ 7 TA RAQAM (jami 9 ta belgi!). Masalan: AD1234567, AE4629898.
   - Biometrik pasport: 'AA', 'AB', 'AC', 'FA' va 7 ta raqam.
   - Hech qachon 8 ta yoki 6 ta raqam yozma!
2. JSHSHIR (PINFL):
   - ID-karta yoki pasport pastidagi/orqasidagi ANIQ 14 xonali raqam!
3. Tug'ilgan sana (DOB):
   - Pasportdagi tug'ilgan sana (DD.MM.YYYY).
4. Pasport BERILGAN SANASI (Date of issue):
   - FAQAT Pasport yoki ID-karta berilgan sanasi (Date of issue: DD.MM.YYYY).
   - Shahodatnoma sanasini yoki kelajak sanani EMAS!
5. Shahodatnoma yoki Diplom:
   - Hujjat turi: Maktab bo'lsa 'Shahodatnoma', Kollej/Litsey/Texnikum bo'lsa 'Diplom'
   - Seriya va raqami: Masalan 'UM 03729356' yoki 'T-V 123456'
   - Maktab/Muassasa nomi: Maktab yoki Kollejning to'liq nomi
   - Bitirgan yili: Masalan '2024'

Aniq JSON formatda qaytar:
{
  "ism": "Familiya Ism",
  "ota": "... qizi / ... o'g'li",
  "pass_ser": "AE1234567",
  "pinfl": "14 xonali PINFL",
  "dob": "DD.MM.YYYY",
  "pass_ber": "DD.MM.YYYY",
  "sh_doc": "UM 1234567",
  "doc_tur": "Shahodatnoma",
  "maktab": "...-maktab",
  "yil": "2024"
}"""}]

                for b in blobs_raw:
                    b64 = base64.b64encode(b).decode('utf-8')
                    content_items.append({'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{b64}'}})

                ai_data = {}
                try:
                    payload = {'model': 'google/gemini-2.5-pro', 'messages': [{'role': 'user', 'content': content_items}], 'temperature': 0.0}
                    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', data=json.dumps(payload).encode('utf-8'), headers={'Authorization': f'Bearer {OPENROUTER_API_KEY}', 'Content-Type': 'application/json'})
                    with urllib.request.urlopen(req, timeout=45) as resp:
                        res_json = json.loads(resp.read().decode('utf-8'))
                        raw = res_json['choices'][0]['message']['content'].strip()
                        raw = re.sub(r'^```json\s*', '', raw)
                        raw = re.sub(r'\s*```$', '', raw)
                        ai_data = json.loads(raw)
                except Exception as e:
                    print(f"AI Vision xatosi: {e}")

                # QR kod ustuvor
                if qr_extracted:
                    if qr_extracted.get('ism'): ai_data['ism'] = qr_extracted['ism']
                    if qr_extracted.get('ota'): ai_data['ota'] = qr_extracted['ota']
                    if qr_extracted.get('pass_val'): ai_data['pass_ser'] = qr_extracted['pass_val']
                    if qr_extracted.get('pinfl'): ai_data['pinfl'] = qr_extracted['pinfl']
                    if qr_extracted.get('dob'): ai_data['dob'] = qr_extracted['dob']
                    if qr_extracted.get('cert_val'): ai_data['sh_doc'] = qr_extracted['cert_val']
                    if qr_extracted.get('cert_tur'): ai_data['doc_tur'] = qr_extracted['cert_tur']
                    if qr_extracted.get('maktab'): ai_data['maktab'] = qr_extracted['maktab']
                    if qr_extracted.get('yil'): ai_data['yil'] = qr_extracted['yil']
                    if qr_extracted.get('sh_qr'): ai_data['sh_qr'] = qr_extracted['sh_qr']

                # Pasport seriya 7 raqam bo'lishini to'g'rilash
                if ai_data.get('pass_ser'):
                    m_fix = re.search(r'([A-Z]{2})(\d{7})', ai_data['pass_ser'])
                    if m_fix:
                        ai_data['pass_ser'] = m_fix.group(1) + m_fix.group(2)

                # 3. Excelga yozish
                if row_idx >= 2:
                    wb = openpyxl.load_workbook(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                    ws = wb.active

                    clean_ism = clean_uz_name(ai_data.get('ism', ''))
                    clean_ota = clean_uz_name(ai_data.get('ota', ''))

                    # ASL RO'YXAT HIMOYASI — faqat bo'sh bo'lsa to'ldiriladi
                    if clean_ism:
                        if not str(ws.cell(row=row_idx, column=2).value or '').strip():
                            ws.cell(row=row_idx, column=2, value=clean_ism)
                        ai_data['ism'] = clean_ism
                    if clean_ota:
                        if not str(ws.cell(row=row_idx, column=7).value or '').strip():
                            ws.cell(row=row_idx, column=7, value=clean_ota)
                        ai_data['ota'] = clean_ota
                    
                    cur_ism = clean_ism or str(ws.cell(row=row_idx, column=2).value or '')
                    cur_ota = clean_ota or str(ws.cell(row=row_idx, column=7).value or '')
                    ws.cell(row=row_idx, column=8, value=f"{cur_ism} {cur_ota}".strip())
                    # 9-ustun (Passport bo'yicha F.I.SH) — bu yerda yozilmaydi,
                    # uni scripts/verify_passport_names.py boshqaradi.

                    if ai_data.get('pass_ser'): ws.cell(row=row_idx, column=10, value=ai_data['pass_ser'])
                    if ai_data.get('pinfl'): ws.cell(row=row_idx, column=11, value=str(ai_data['pinfl']))
                    if ai_data.get('pass_ber'): ws.cell(row=row_idx, column=12, value=ai_data['pass_ber'])
                    if ai_data.get('dob'): ws.cell(row=row_idx, column=13, value=ai_data['dob'])
                    ws.cell(row=row_idx, column=14, value="Mavjud")
                    if ai_data.get('sh_doc'): ws.cell(row=row_idx, column=15, value=ai_data['sh_doc'])
                    if ai_data.get('maktab'): ws.cell(row=row_idx, column=17, value=ai_data['maktab'])
                    if ai_data.get('doc_tur'): ws.cell(row=row_idx, column=18, value=ai_data['doc_tur'])
                    if ai_data.get('yil'): ws.cell(row=row_idx, column=19, value=str(ai_data['yil']))

                    wb.save(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
                    wb.save(os.path.join(BASE_DIR, 'Talabalar_Yangilangan_Royxat.xlsx'))

                    # Fondada hisobot HTML larini ham yangilash
                    trigger_report_rebuild()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": "Fayl muvaffaqiyatli yuklandi va AI orqali to'liq o'qilib Excelga saqlandi!",
                    "filename": filename,
                    "images": images,
                    "data": ai_data
                }).encode('utf-8'))
                return

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        if parsed_path == '/api/analyze_docx':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode('utf-8'))
                b64_content = data.get('file_base64', '')
                filename = data.get('filename', 'yangi_shartnoma.docx')
                default_ism = data.get('ism', '')
                default_yon = data.get('yonalis', '')
                use_pro = (data.get('model') == 'pro' or data.get('use_pro') == True or data.get('pro') == '1')
                
                docx_bytes = base64.b64decode(b64_content)
                saved_path = os.path.join(FILES_DIR, filename)
                with open(saved_path, 'wb') as f:
                    f.write(docx_bytes)
                    
                analysis = analyze_docx_content(docx_bytes, filename, default_ism, default_yon, use_pro=use_pro)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(analysis).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
            return
        if parsed_path == '/api/update_student':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode('utf-8'))
                success = update_student_data(data)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": success,
                    "message": "Talaba ma'lumotlari muvaffaqiyatli yangilandi!" if success else "Talaba topilmadi"
                }).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
            return

        if parsed_path == '/api/delete_student':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode('utf-8'))
                shnum = data.get('shnum', '')
                ism = data.get('ism', '')
                success = delete_student_data(shnum, ism)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": success,
                    "message": "Talaba bazadan o'chirildi!" if success else "Talaba topilmadi"
                }).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
            return

        if parsed_path == '/api/add_students':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode('utf-8'))
                students = data.get('students', [])
                count = save_manual_students(students)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "count": count,
                    "message": f"{count} ta talaba muvaffaqiyatli bazaga qo'shildi!"
                }).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": str(e)
                }).encode('utf-8'))
            return

        self.send_error(404, "Endpoint topilmadi")

def update_student_data(st):
    if not os.path.exists(EXCEL_PATH):
        return False
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active
    
    shnum = str(st.get('shnum', '')).strip()
    ism = str(st.get('ism', '')).strip()
    
    target_row = None
    if shnum:
        for r in range(2, ws.max_row + 1):
            if str(ws.cell(row=r, column=5).value or '').strip() == shnum:
                target_row = r
                break
    if not target_row and ism:
        for r in range(2, ws.max_row + 1):
            if str(ws.cell(row=r, column=2).value or '').strip().lower() == ism.lower():
                target_row = r
                break
                
    if not target_row:
        return False
        
    ota = str(st.get('ota', '')).strip()
    fish = f"{ism} {ota}".strip() if ota else ism
    pass_val = str(st.get('pass_val', '')).strip().upper()
    pinfl = str(st.get('pinfl', '')).strip()
    dob = str(st.get('dob', '')).strip()
    ber_sana = str(st.get('ber_sana', '')).strip()
    cert_val = str(st.get('cert_val', '')).strip()
    cert_tur = str(st.get('cert_tur', 'Shahodatnoma')).strip()
    maktab = str(st.get('maktab', '')).strip()
    yil = str(st.get('yil', '')).strip()
    yonalis = str(st.get('yonalis', 'Hamshiralik ishi - 3 yillik')).strip()
    
    ws.cell(row=target_row, column=2, value=ism)
    ws.cell(row=target_row, column=3, value=yonalis)
    if shnum: ws.cell(row=target_row, column=5, value=shnum)
    ws.cell(row=target_row, column=7, value=ota)
    ws.cell(row=target_row, column=8, value=fish)
    # 9-ustun (Passport bo'yicha F.I.SH) — bu yerda yozilmaydi,
    # uni scripts/verify_passport_names.py boshqaradi.
    ws.cell(row=target_row, column=10, value=pass_val)
    ws.cell(row=target_row, column=11, value=pinfl)
    if ber_sana and ber_sana != '-': ws.cell(row=target_row, column=12, value=ber_sana)  # Pasport berilgan sana
    ws.cell(row=target_row, column=13, value=dob)
    ws.cell(row=target_row, column=15, value=cert_val)
    ws.cell(row=target_row, column=17, value=maktab)
    ws.cell(row=target_row, column=18, value="Umumiy o'rta maktab" if cert_tur == "Shahodatnoma" else "Kollej")
    ws.cell(row=target_row, column=19, value=yil)
    ws.cell(row=target_row, column=21, value="TOPILDI")
    ws.cell(row=target_row, column=22, value="Tahrirlandi")
    
    wb.save(EXCEL_PATH)
    trigger_report_rebuild()
    return True

def delete_student_data(shnum, ism):
    if not os.path.exists(EXCEL_PATH):
        return False
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active
    
    target_row = None
    sh_clean = str(shnum or '').strip()
    ism_clean = str(ism or '').strip().lower()
    
    if sh_clean:
        for r in range(2, ws.max_row + 1):
            if str(ws.cell(row=r, column=5).value or '').strip() == sh_clean:
                target_row = r
                break
    if not target_row and ism_clean:
        for r in range(2, ws.max_row + 1):
            if str(ws.cell(row=r, column=2).value or '').strip().lower() == ism_clean:
                target_row = r
                break
                
    if not target_row:
        return False
        
    ws.delete_rows(target_row, 1)
    
    for r in range(2, ws.max_row + 1):
        ws.cell(row=r, column=1, value=r - 1)
        
    wb.save(EXCEL_PATH)
    trigger_report_rebuild()
    return True

def run_server(port=8080):
    class ThreadedServer(ThreadingHTTPServer):
        daemon_threads = True
        allow_reuse_address = True

    chosen_port = port
    httpd = None
    for p in [port, port + 1, port + 2, 8088, 8000]:
        try:
            server_address = ('0.0.0.0', p)
            httpd = ThreadedServer(server_address, WebServerHandler)
            chosen_port = p
            break
        except OSError as e:
            print(f"[OGOHLANTIRISH] Port {p} band bo'lgani uchun keyingi port tekshirilmoqda ({e})...")
            continue

    if not httpd:
        print("[XATO] Hech bir portda serverni ishga tushirib bo'lmadi!")
        return

    dashboard_url = f"http://localhost:{chosen_port}/hisobot.html"
    print(f"==================================================================")
    print(f"[SERVER] TALABALARNI QO'SHISH & DASHBOARD SERVERI ISHGA TUSHDI!")
    print(f"[MANZIL] Dashboard manzili: {dashboard_url}")
    print(f"==================================================================")

    # Brauzerda avtomatik ochish
    try:
        webbrowser.open(dashboard_url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[SERVER] Server to'xtatildi.")
        httpd.server_close()

if __name__ == '__main__':
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            port = 8080
    run_server(port)
