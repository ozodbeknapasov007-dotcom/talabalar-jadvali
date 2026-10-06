# -*- coding: utf-8 -*-
"""
Proxy loader for xizmatlar/telegram_sync_service.py
Allows running 'python telegram_sync_service.py' from root directory.
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_DIR = os.path.join(BASE_DIR, 'xizmatlar')
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

service_script = os.path.join(SERVICE_DIR, 'telegram_sync_service.py')
if __name__ == '__main__':
    with open(service_script, 'r', encoding='utf-8') as f:
        code = compile(f.read(), service_script, 'exec')
        exec(code, {'__name__': '__main__', '__file__': service_script})
