# -*- coding: utf-8 -*-
"""
Supabase ma'lumotlar bazasiga 562 ta talabani to'liq yuklash skripti.
"""
import os
import json
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDENTS_FILE = os.path.join(BASE_DIR, 'data', 'students.json')

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://ebzzfbifmorqqtdfvenz.supabase.co")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

def upload_students():
    if not os.path.exists(STUDENTS_FILE):
        print("XATO: data/students.json topilmadi!")
        return

    with open(STUDENTS_FILE, 'r', encoding='utf-8') as f:
        students = json.load(f)

    print(f"Jami talabalar soni: {len(students)} ta.")

    # Supabase REST API orqali batch yuklash (50 tadan)
    batch_size = 50
    url = f"{SUPABASE_URL}/rest/v1/students"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    uploaded = 0
    for i in range(0, len(students), batch_size):
        batch = students[i:i + batch_size]
        payload = []
        for s in batch:
            row_data = {
                "row": int(s.get("row") or 0),
                "tr": int(s.get("tr") or 0),
                "ism": str(s.get("ism") or "").strip(),
                "ota": str(s.get("ota") or "").strip(),
                "fish": str(s.get("fish") or "").strip(),
                "group": str(s.get("group") or "").strip(),
                "shnum": str(s.get("shnum") or "").strip(),
                "sana": str(s.get("sana") or "").strip(),
                "pv": str(s.get("pv") or "").strip(),
                "pass_type": str(s.get("pass_type") or "").strip(),
                "pinfl": str(s.get("pinfl") or "").strip().replace(" ", ""),
                "dob": str(s.get("dob") or "").strip(),
                "ber": str(s.get("ber") or "").strip(),
                "sh_doc": str(s.get("sh_doc") or "").strip(),
                "sh_qr": str(s.get("sh_qr") or "").strip(),
                "mak": str(s.get("mak") or "").strip(),
                "doc_tur": str(s.get("doc_tur") or "").strip(),
                "yil": str(s.get("yil") or "").strip(),
                "yon": str(s.get("yon") or "").strip(),
                "tel": str(s.get("tel") or "").strip(),
                "doc_file": str(s.get("doc_file") or "").strip(),
                "status": str(s.get("status") or "full"),
                "pass_fish": str(s.get("pass_fish") or "").strip(),
                "cert_fish": str(s.get("cert_fish") or "").strip(),
                "name_match": str(s.get("name_match") or "").strip(),
                "name_flag": str(s.get("name_flag") or "").strip(),
                "verified": str(s.get("verified") or "KUTILMOQDA"),
                "baza": str(s.get("baza") or "KIRITILDI"),
                "buyruq": str(s.get("buyruq") or "").strip(),
                "buyruq_sana": str(s.get("buyruq_sana") or "").strip()
            }
            payload.append(row_data)

        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req) as resp:
                uploaded += len(batch)
                print(f"Yuklandi: {uploaded}/{len(students)}...")
        except urllib.error.HTTPError as e:
            err = e.read().decode('utf-8')
            print(f"Xatolik yuz berdi ({e.code}): {err}")
            return False

    print(f"✅ MUVAFFAQIYATLI: Barcha {uploaded} ta talaba Supabase'ga to'liq yuklandi!")
    return True

if __name__ == '__main__':
    upload_students()
