# -*- coding: utf-8 -*-
"""
================================================================================
E-SHAHODATNOMA.UZ DAN BRAUZER ORQALI SHAHODATNOMANI QIDIRISH VA YUKLAB OLISH
================================================================================
"""

import sys
import time
import os
import asyncio
from playwright.sync_api import sync_playwright

def search_certificate_via_browser(
    pin: str = "61508085680038",
    serial: str = "AE",
    number: str = "3555106",
    student_name: str = "Xasanova Dilnura"
):
    print("=" * 70)
    print(f"   E-SHAHODATNOMA.UZ: {student_name.upper()} SHAHODATNOMASINI QIDIRISH")
    print("=" * 70)
    print(f"PINFL: {pin} | Seriya: {serial} | Raqam: {number}")
    print("\n[1] Brauzer ochilmoqda...")

    with sync_playwright() as p:
        # Tizimdagi Microsoft Edge yoki Chrome brauzerini ishga tushiramiz
        browser = p.chromium.launch(
            channel="msedge",  # yoki chrome
            headless=False,     # Foydalanuvchi ekranda ko'rishi uchun
            args=["--start-maximized"]
        )
        context = browser.new_context(no_viewport=True, accept_downloads=True)
        page = context.new_page()

        print("[2] https://e-shahodatnoma.uz/cert/search sahifasiga kirilmoqda...")
        page.goto("https://e-shahodatnoma.uz/cert/search", timeout=60000)
        page.wait_for_load_state("networkidle")

        time.sleep(2)

        print("[3] Ma'lumotlar avtomatik kiritilmoqda...")
        try:
            # PINFL maydonini topish
            pin_input = page.locator("input[placeholder*='JShShIR'], input[placeholder*='PIN'], input[type='text']").first
            if pin_input:
                pin_input.fill(pin)
                print(f"    - PINFL kiritildi: {pin}")

            # Seriya maydoni
            serial_input = page.locator("input[placeholder*='seriya'], input[placeholder*='Seriya']").first
            if serial_input:
                serial_input.fill(serial)
                print(f"    - Pasport seriyasi kiritildi: {serial}")

            # Raqam maydoni
            number_input = page.locator("input[placeholder*='raqam'], input[placeholder*='Raqam']").first
            if number_input:
                number_input.fill(number)
                print(f"    - Pasport raqami kiritildi: {number}")

        except Exception as e:
            print("    [Ogohlantirish] Maydonlarni to'ldirishda:", e)

        print("\n" + "=" * 70)
        print("   DIQQAT: Brauzer oynasida ko'ringan Captcha (rasmli kod)ni kiriting")
        print("   va 'Qidirish' (Search) tugmasini bosing!")
        print("=" * 70)

        # Foydalanuvchi natijani ko'rishi va yuklab olishi uchun kutish
        print("\n[Kutish] Natija yuklanishi kutilmoqda (60 soniya)...")
        time.sleep(60)

        browser.close()

if __name__ == "__main__":
    search_certificate_via_browser()
