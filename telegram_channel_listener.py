# -*- coding: utf-8 -*-
"""
TELEGRAM KANAL VA BOT INTEGRATSIYASI
===================================
- Kanal ID: -1004375713276 ("Qabul shartnomalari 2026-2027")
- Bot: @shartnoma_editor_bot
- Har qanday yangi Word/Rasm/PDF fayli kelganda:
  1. Yuklab oladi (files/ papkasiga)
  2. Gemini AI orqali Pasport, PINFL, DOB, Berilgan sana, Shahodatnoma ma'lumotlarini o'qiydi
  3. Excel bazaga yozadi va hisobotni yangilaydi
"""

import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

AUTO_FETCH_ENABLED = False  # Foydalanuvchi buyrug'iga binoan butunlay o'chirilgan

if not AUTO_FETCH_ENABLED:
    print("🛑 [XAVFSIZLIK] Avtomatik olish to'xtatilgan! (Foydalanuvchi buyrug'i: 'avtomatik olmasin, avtomatik olish kk bo'lsa senga o'zim aytaman')")
    print("ℹ️ Agar avtomatik olish kerak bo'lsa, foydalanuvchi ruxsat berganida yoqiladi.")
    sys.exit(0)

import io
import re
import json
import base64
import asyncio
import urllib.request
import docx
import openpyxl
from aiogram import Bot, Dispatcher, types, F
from aiogram.enums import ContentType

def _bot_token():
    # Token kodda saqlanmaydi (repo ommaviy): avval muhit o'zgaruvchisi,
    # keyin gitignore qilingan scripts/backup_config.json
    if os.environ.get("TELEGRAM_BOT_TOKEN"):
        return os.environ["TELEGRAM_BOT_TOKEN"]
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scripts', 'backup_config.json'), encoding='utf-8') as f:
            return json.load(f).get('bot_token', '')
    except Exception:
        return ''


BOT_TOKEN = _bot_token()
CHANNEL_ID = -1004375713276
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILES_DIR = os.path.join(BASE_DIR, 'files')
os.makedirs(FILES_DIR, exist_ok=True)

OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


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

def analyze_and_save_doc(file_path):
    try:
        fname = os.path.basename(file_path)
        d = docx.Document(file_path)
        image_blobs = []
        for rel in d.part.rels.values():
            if 'image' in rel.target_ref:
                b = rel.target_part.blob
                if len(b) > 2500:
                    image_blobs.append(b)

        content_items = [{'type': 'text', 'text': """Ushbu hujjat tasvirlarini (Pasport / ID-karta va Shahodatnoma) juda sinchkovlik bilan tahlil qil.
1. F.I.SH (Familiya, Ism, Otasining ismi)
2. Pasport / ID seriya va 7 ta raqami
3. JSHSHIR (PINFL - 14 xonali raqam)
4. Tug'ilgan sana (DD.MM.YYYY)
5. FAQAT Pasport / ID-karta BERILGAN SANASI (Date of issue: DD.MM.YYYY - Shahodatnoma sanasini EMAS!)
6. Shahodatnoma yoki Diplom seriya va raqami
7. Maktab / Kollej nomi
8. Bitirgan yili
Aniq JSON formatda qaytar:
{
  "ism": "Familiya Ism",
  "ota": "... qizi / ... o'g'li",
  "pass_ser": "AD1234567",
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
            content_items.append({'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{b64}'}})

        payload = {'model': 'google/gemini-2.5-flash', 'messages': [{'role': 'user', 'content': content_items}], 'temperature': 0.0}
        req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', data=json.dumps(payload).encode('utf-8'), headers={'Authorization': f'Bearer {OPENROUTER_KEY}', 'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            raw = res['choices'][0]['message']['content'].strip()
            raw = re.sub(r'^```json\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            data = json.loads(raw)
            
            # Excelga yozish
            excel_path = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
            wb = openpyxl.load_workbook(excel_path)
            ws = wb.active

            m_sh = re.search(r'[\s_Nn](\d{1,4})\.docx$', fname, re.I)
            shnum = m_sh.group(1) if m_sh else ""

            clean_ism = clean_uz_name(data.get('ism', ''))
            clean_ota = clean_uz_name(data.get('ota', ''))

            # Agar mavjud bo'lsa yangilaymiz, bo'lmasa yangi qator qo'shamiz
            found_row = None
            for r in range(2, ws.max_row + 1):
                cur_sh = str(ws.cell(row=r, column=5).value or '').strip()
                cur_ism = str(ws.cell(row=r, column=2).value or '').strip()
                if (shnum and cur_sh == shnum) or (clean_ism and clean_ism.lower() in cur_ism.lower()):
                    found_row = r
                    break

            if not found_row:
                print(f"⚠️ [TG Kanal] '{clean_ism}' (#{shnum}) rasmiy talabalar ro'yxatida topilmadi. Yangi talaba sifatida qo'shilmadi (ro'yxat himoyalangan).")
                return None, None

            r = found_row

            # ASL RO'YXAT HIMOYASI: 2 va 7-ustun foydalanuvchining o'z ro'yxati.
            # AI ularni O'ZGARTIRMAYDI — faqat BO'SH bo'lsa to'ldiradi
            # (ya'ni bot yangi talaba qo'shganda).
            if clean_ism and not str(ws.cell(row=r, column=2).value or '').strip():
                ws.cell(row=r, column=2, value=clean_ism)
            if clean_ota and not str(ws.cell(row=r, column=7).value or '').strip():
                ws.cell(row=r, column=7, value=clean_ota)
            fish = f"{clean_ism} {clean_ota}".strip()
            ws.cell(row=r, column=8, value=fish)
            # 9-ustun "Passport bo'yicha F.I.SH" — FAQAT pasport rasmidan o'qilgan
            # ma'lumot turadi. Uni scripts/verify_passport_names.py boshqaradi.
            # To'liq F.I.SH 8-ustunda, shuning uchun bu yerda yozilmaydi.
            if data.get('pass_ser'): ws.cell(row=r, column=10, value=data['pass_ser'])
            if data.get('pinfl'): ws.cell(row=r, column=11, value=str(data['pinfl']))
            if data.get('pass_ber'): ws.cell(row=r, column=12, value=data['pass_ber'])
            if data.get('dob'): ws.cell(row=r, column=13, value=data['dob'])
            ws.cell(row=r, column=14, value="Mavjud")
            if data.get('sh_doc'): ws.cell(row=r, column=15, value=data['sh_doc'])
            if data.get('maktab'): ws.cell(row=r, column=17, value=data['maktab'])
            if data.get('doc_tur'): ws.cell(row=r, column=18, value=data['doc_tur'])
            if data.get('yil'): ws.cell(row=r, column=19, value=str(data['yil']))

            wb.save(os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx'))
            wb.save(os.path.join(BASE_DIR, 'Talabalar_Yangilangan_Royxat.xlsx'))

            # Hisobotni yangilash
            import subprocess
            subprocess.Popen(['python', os.path.join(BASE_DIR, 'qayta_tekshiruv', '03_hisobot_yasat.py')], cwd=BASE_DIR)
            print(f"✅ Excel va Hisobot yangilandi: {fish} (#{shnum})")
            return fish, shnum
    except Exception as e:
        print(f"Xatolik: {e}")
        return None, None

@dp.message(F.document)
async def handle_document(message: types.Message):
    doc = message.document
    if doc.file_name.endswith('.docx'):
        file = await bot.get_file(doc.file_id)
        dest = os.path.join(FILES_DIR, doc.file_name)
        await bot.download_file(file.file_path, dest)
        print(f"📥 Yangi Word fayli yuklab olindi: {doc.file_name}")
        fish, shnum = analyze_and_save_doc(dest)
        if fish and message.chat.type == 'private':
            await message.reply(f"✅ Muvaffaqiyatli qabul qilindi va Excel bazaga kiritildi:\n👤 **{fish}** (#{shnum})")

@dp.channel_post(F.document)
async def handle_channel_document(message: types.Message):
    doc = message.document
    if doc.file_name.endswith('.docx'):
        file = await bot.get_file(doc.file_id)
        dest = os.path.join(FILES_DIR, doc.file_name)
        await bot.download_file(file.file_path, dest)
        print(f"📢 Kanalga yangi Word fayli tashlandi: {doc.file_name}")
        analyze_and_save_doc(dest)

AUTO_FETCH_ENABLED = False  # Foydalanuvchi buyrug'iga binoan butunlay o'chirilgan

async def main():
    if not AUTO_FETCH_ENABLED:
        print("🛑 [XAVFSIZLIK] Avtomatik olish to'xtatilgan! (Foydalanuvchi buyrug'i: 'avtomatik olmasin, avtomatik olish kk bo'lsa senga o'zim aytaman')")
        print("ℹ️ Agar avtomatik olish kerak bo'lsa, foydalanuvchi ruxsat berganida yoqiladi.")
        return
    print(f"🤖 @shartnoma_editor_bot kanal va xabarlarni tinglashni boshladi...")
    print(f"Kanal: {CHANNEL_ID} (Qabul shartnomalari 2026-2027)")
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())

