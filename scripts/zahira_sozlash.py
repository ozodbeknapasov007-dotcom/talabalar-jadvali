"""Kunlik Telegram zahirasini sozlash yordamchisi.

Ishlatish:
  1. Telegram'da @shartnoma_editor_bot ni oching va "/start" yuboring
  2. Shu skriptni ishga tushiring:  python scripts/zahira_sozlash.py

Skript sizning chat ID ingizni aniqlab scripts/backup_config.json ga
yozib qo'yadi va sinov zahirasini yuboradi. Shundan keyin xizmat
har kuni belgilangan soatda (standart 18:00) zahirani o'zi jo'natadi.

DIQQAT: bot tokeni faqat backup_config.json da turadi, bu fayl
.gitignore da — GitHub'ga tushmaydi.
"""
import json
import os
import sys
import time

import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, 'scripts', 'backup_config.json')


def load_config():
    if not os.path.exists(CONFIG_PATH):
        print("XATO: scripts/backup_config.json topilmadi.")
        print("Quyidagi mazmun bilan yarating:")
        print('  {"bot_token": "<bot tokeni>", "chat_id": "", "hour": 18, "minute": 0}')
        sys.exit(1)
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_config(cfg):
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def find_chat_id(token, wait_seconds=120):
    """Bot bilan yozishgan shaxsiy chatni kutadi va ID sini qaytaradi."""
    print(f"Telegram'da @shartnoma_editor_bot ga '/start' yuboring...")
    print(f"({wait_seconds} soniya kutaman)")
    deadline = time.time() + wait_seconds
    offset = None

    while time.time() < deadline:
        params = {'timeout': 10}
        if offset is not None:
            params['offset'] = offset
        try:
            r = requests.get(f"https://api.telegram.org/bot{token}/getUpdates",
                             params=params, timeout=25).json()
        except Exception as e:
            print(f"  tarmoq xatosi: {e}")
            time.sleep(3)
            continue

        if not r.get('ok'):
            print(f"  Telegram xatosi: {str(r)[:160]}")
            time.sleep(3)
            continue

        for upd in r.get('result', []):
            offset = upd['update_id'] + 1
            msg = upd.get('message') or upd.get('edited_message') or {}
            chat = msg.get('chat') or {}
            if chat.get('type') == 'private':
                name = chat.get('first_name') or chat.get('username') or '?'
                print(f"  Topildi: {name} (ID: {chat['id']})")
                return str(chat['id'])

        sys.stdout.write('.')
        sys.stdout.flush()

    return None


def send_test(token, chat_id):
    path = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
    if not os.path.exists(path):
        print("Ogohlantirish: Talabalar_Toliq_Royxati.xlsx topilmadi, sinov o'tkazilmadi")
        return False
    with open(path, 'rb') as fh:
        r = requests.post(
            f"https://api.telegram.org/bot{token}/sendDocument",
            data={'chat_id': chat_id, 'caption': 'Sinov zahirasi — sozlash muvaffaqiyatli!'},
            files={'document': (os.path.basename(path), fh)},
            timeout=120
        )
    ok = r.ok and r.json().get('ok')
    print("Sinov zahirasi yuborildi!" if ok else f"Sinov yuborilmadi: {r.text[:200]}")
    return ok


def main():
    cfg = load_config()
    token = str(cfg.get('bot_token', '')).strip()
    if not token:
        print("XATO: backup_config.json da bot_token bo'sh")
        sys.exit(1)

    chat_id = str(cfg.get('chat_id', '')).strip()
    if chat_id:
        print(f"Chat ID allaqachon sozlangan: {chat_id}")
    else:
        chat_id = find_chat_id(token)
        print()
        if not chat_id:
            print("Chat topilmadi. Botga '/start' yuborib, skriptni qayta ishga tushiring.")
            sys.exit(1)
        cfg['chat_id'] = chat_id
        save_config(cfg)
        print(f"Saqlandi: chat_id = {chat_id}")

    send_test(token, chat_id)
    print(f"\nTayyor. Har kuni soat {cfg.get('hour', 18):02d}:{cfg.get('minute', 0):02d} da "
          f"zahira avtomatik yuboriladi (xizmat ishlab turgan bo'lsa).")


if __name__ == '__main__':
    main()
