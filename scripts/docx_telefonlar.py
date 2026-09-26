# -*- coding: utf-8 -*-
"""
Shartnoma .docx fayllaridagi "TELEFON RAQAMI" bo'limidan talaba telefonlarini olish.

Fayl talabaga shunday bog'lanadi:
  1) bazadagi doc_file nomi bo'yicha (files/ yoki TOPILGAN_30/ papkasida);
  2) bo'lmasa — fayl nomidagi shartnoma raqami + familiya bo'yicha.
Har ikki holatda ham fayl matnida talabaning familiyasi bo'lishi shart
(boshqa odamning shartnomasidan raqam olinib ketmasligi uchun).
"""
import glob
import os
import re
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOC_DIRS = [os.path.join(ROOT, 'hujjatlar', 'shartnomalar'), os.path.join(ROOT, 'hujjatlar', 'TOPILGAN_30')]

# 91-948-38-79 · 91.460.65.62 · 996810119 · +998 91 948 38 79
PHONE_RE = re.compile(r'(?<![\d.-])(?:\+?998[\s.-]?)?(\(?\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2})(?![\d.-])')
APOS = re.compile(r"[‘’ʻʼ`´']")

_text_cache: dict[str, str] = {}
_index: dict[str, str] | None = None


PHONE_CODES = {'20', '33', '50', '55', '61', '62', '65', '66', '67', '69', '70', '71', '72', '73',
               '74', '75', '76', '77', '78', '79', '87', '88', '90', '91', '92', '93', '94', '95', '97', '98', '99'}


def _norm(s: str) -> str:
    return APOS.sub('', str(s or '')).lower().replace('_', ' ')


def _phon(s: str) -> str:
    """Imlo farqlarini tekislash: Xasanova/Hasanova, Arziqulova/Arzikulova, Yo'ldosheva/Yuldosheva."""
    s = _norm(s)
    for a, b in (('yo', 'u'), ('yu', 'u'), ('ye', 'e'), ('x', 'h'), ('q', 'k'), ('o', 'u'), ('iy', 'i')):
        s = s.replace(a, b)
    return re.sub(r'\s+', ' ', s)


def docx_text(path: str) -> str:
    if path not in _text_cache:
        try:
            x = zipfile.ZipFile(path).read('word/document.xml').decode('utf-8')
        except Exception:
            x = ''
        x = re.sub(r'</w:p>|<w:br/>', '\n', x).replace('<w:tab/>', '\t')
        _text_cache[path] = re.sub(r'<[^>]+>', '', x)
    return _text_cache[path]


def _files() -> dict[str, str]:
    global _index
    if _index is None:
        _index = {}
        for d in DOC_DIRS:
            for f in glob.glob(os.path.join(d, '*.docx')):
                _index.setdefault(os.path.basename(f), f)
    return _index


def phones_in_docx(path: str) -> list[str]:
    t = docx_text(path)
    m = re.search(r'TELEFON RAQAMI(.*?)(?:\n\s*\n|$)', t, re.S)
    if not m:
        return []
    # Bo'lim oxiridagi uzun raqamlar (Word chizma ID lari) telefon emas — faqat 1-2 qator olinadi
    block = '\n'.join(m.group(1).strip('\n').split('\n')[:2])
    # Raqam ichidagi tasodifiy '+' (masalan 97-066-2+6-92) — bazadagi '+' xatosi bilan bir xil
    block = re.sub(r'(?<=\d)\+(?=\d)', '', block)
    out = []
    for raw in PHONE_RE.findall(block):
        d = re.sub(r'\D', '', raw)
        # operator kodi to'g'ri va oxiri 0000 bo'lmagan (chizma ID laridan farqlash uchun)
        if len(d) == 9 and d[:2] in PHONE_CODES and not d.endswith('0000') and d not in out:
            out.append(d)
    return out


def find_docx(student: dict) -> str | None:
    files = _files()
    words = _phon(student.get('ism') or student.get('fish') or '').split(' ')
    fam, first = words[0], (words[1] if len(words) > 1 else '')
    if len(fam) < 4:
        return None

    def mentions(path):
        t = _phon(docx_text(path))
        return fam[:-2] in t or (len(first) >= 4 and first in t)

    df = student.get('doc_file') or ''
    if df in files and mentions(files[df]):
        return files[df]
    shnum = str(student.get('shnum') or '').strip()
    if shnum.isdigit():
        for name, path in files.items():
            n = _phon(name)
            if re.search(rf'(?<!\d){shnum}(?!\d)', n) and n.startswith(fam[:4]) and mentions(path):
                return path
    return None


def docx_phones(student: dict) -> tuple[list[str], str]:
    """(telefonlar, manba fayl nomi) — topilmasa ([], '')."""
    path = find_docx(student)
    if not path:
        return [], ''
    ph = phones_in_docx(path)
    return (ph, os.path.basename(path)) if ph else ([], '')
