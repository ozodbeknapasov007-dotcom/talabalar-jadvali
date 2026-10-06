# -*- coding: utf-8 -*-
"""Qo'lda moslashtirilgan talabalar ma'lumotlarini kiritish."""
import sys, re, json
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path

STUDENTS_FILE = Path(__file__).parent.parent / "data" / "students.json"

def cp(v):
    """Telefon tozalash"""
    if not v: return ''
    s = str(v).strip()
    try:
        s = str(int(float(s)))
    except: pass
    d = re.sub(r'[^0-9]', '', s)
    if len(d) == 9: return '+998' + d
    if len(d) == 12 and d.startswith('998'): return '+' + d
    return s

with open(STUDENTS_FILE, encoding='utf-8') as f:
    students = json.load(f)

def upd(idx, tel1=None, tel2=None, kim=None, tuman=None, mfy=None, kocha=None, uy=None, qatnov=None):
    s = students[idx]
    if tel1:  s['tel_shaxsiy']   = cp(tel1)
    if tel2:  s['tel_otaona']    = cp(tel2)
    if kim:   s['tel_otaona_kim'] = kim
    if tuman: s['manzil_tuman'] = tuman
    if mfy:   s['manzil_mfy']   = mfy
    if kocha: s['manzil_kocha'] = kocha
    if uy:    s['manzil_uy']    = uy
    if qatnov: s['qatnov']      = qatnov
    parts = [p for p in [tuman, mfy, kocha, uy] if p]
    if parts: s['manzil_toliq'] = ', '.join(parts)
    print(f"  [{idx}] {s['fish']} [{s['group']}] — yangilandi")

# ── Manual corrections ──────────────────────────────────────────────────────

# [350] Javliyeva Nargiza Ortiq qizi [26-02]  (survey: "Jovliyeva")
upd(350, 880880124, 915613002, 'Onam',
    'Kitob tumani', 'Sevaz MFY', "Taraqqiyot ko'chasi", '130-uy', "O'z uyidan")

# [353] Nu'monova Saidabonu Ulug'bek qizi [26-02]  (survey: "Numonova")
upd(353, 776070824, 873990179, 'Onam',
    'Shahrisabz shahar', "Ipak Yo'li MFY", "Ipak Yo'li", '118/26', "O'z uyidan")

# [367] To'xtayeva Durdona Nazim qizi [26-02]  (survey: "Tòxtayeva" - tel yo'q)
upd(367, qatnov="O'z uyidan")

# [358] Ro'zimurodova Larisa Ma'matali qizi [26-02]  (survey: "Ruzmurodava Larisa" - ma'lumot minimal)
# Survey rows uchun ma'lumot topilmadi, skip

# [421] Maxmudova Musallam Qamariddin qizi [26-04]  (survey: "Mahmudova Musallam")
upd(421, 505899948, 507347386, 'Onam',
    'Kitob tumani', "Sho'robsoy MFY", "Komillik ko'chasi", '18-uy', "O'z uyidan")

# [431] Xamdamova Madina Abdiqodir qizi [26-04]  (survey: "Hamdamova Madina")
upd(431, 885872701, 884906872, 'Onam',
    'Kitob tumani', "Ho'jailimkoni MFY", "Ho'jailimkoni qishlog'i", '248-uy', "O'z uyidan")

# [411] A'zamov Shohjaxon Sherali o'g'li [26-04]  (survey: "Azamov Shohjahon Sherali 9")
upd(411, 991312508, 876078287, 'Onam',
    'Shahrisabz tumani', 'Kichik Novqat MFY', "Soybo'yi ko'chasi", '04-uy', "O'z uyidan")

# [408] Abdixalilova Shohzoda Bahodir qizi [26-04]  (survey: "Abdixalilova shahzoda")
upd(408, 703318708, 701190686, 'Onam',
    'Chiroqchi tumani', 'Quruqsoy MFY', "Buzovut qishlog'i", '111-uy', 'Ijaradan')

# [474] Azimova Zahroxon Abdirauf qizi [26-06]  (survey: "Azimova zaxro")
upd(474, 977997671, 884037671, 'Dadam',
    'Shahrisabz tumani', 'Kesh MFY', 'Kalokon', '73-uy', "O'z uyidan")

# [387] Pardayeva Farangiz Norali qizi [26-03]  (survey: "Farangiz Pardayeva")
upd(387, 876450108, 990427984, 'Onam',
    'Shahrisabz tumani', 'Oq Oltin MFY', "Al-Xorazmiy ko'chasi", '212-uy', "O'z uyidan")

# [401] Usmonova Yulduz Nu'mon qizi [26-03]  (kirill yozuvida kelgan: усмонова юлдуз)
upd(401, 876310721, 875280782, 'Onam',
    'Kitob tumani', None, "Guliston ko'chasi", '90-uy', "O'z uyidan")

# [399] Tursunmurodova Diyora Jasur qizi [26-03]  (kirill: Турсунмуродова Диера)
upd(399, tuman='Kitob tumani')

# [466] Tursunova Aziza Anvarovna [26-05]
upd(466, 919600814, 912250767, 'Qaynonam',
    'Shahrisabz shahar', 'Zingiron MFY', "Zingiron ko'chasi", '46-uy', "O'z uyidan")

# [467] Tursunova Fotima Qosim qizi [26-05]
upd(467, 778098130, 995658681, 'Onam',
    'Kitob tumani', 'Jilisuv MFY', 'Yangi Jilisuv', '99-uy', "O'z uyidan")

# [468] Tursunova Zuhra Qosim qizi [26-05]
upd(468, 778098230, 995658681, 'Onam',
    'Kitob tumani', 'Navbahor MFY', "Yangi Jilisuv qishlog'i", '99-uy', "O'z uyidan")

# [448] Ixtiyorova Niginabonu Xolovna [26-05]  (survey: "Ixtiyorova Nigina Xol qizi")
# tel2 aslida: "88.183.11.67" → 881831167, kim: "87.629.51.08" = raqam (onam deb olish)
upd(448, 881831167, 876295108, 'Onam',
    'Kitob tumani', 'Iskana MFY', "Iskana ko'chasi", '40-uy', "O'z uyidan")

# Saqlash
with open(STUDENTS_FILE, 'w', encoding='utf-8') as f:
    json.dump(students, f, ensure_ascii=False, indent=2)

print('\n✅ Manual corrections saqlandi!')
