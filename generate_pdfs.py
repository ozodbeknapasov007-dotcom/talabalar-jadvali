import os
import openpyxl
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Fontlarni ro'yxatdan o'tkazish
try:
    pdfmetrics.registerFont(TTFont('Times', 'C:/Windows/Fonts/times.ttf'))
    pdfmetrics.registerFont(TTFont('Times-Bold', 'C:/Windows/Fonts/timesbd.ttf'))
    FONT_NORMAL = 'Times'
    FONT_BOLD = 'Times-Bold'
except Exception as e:
    FONT_NORMAL = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'

GROUP_LEADERS = {
    "26-01": "Mirzayeva.D",
    "26-02": "Ochilov.D",
    "26-03": "To'rayeva.S",
    "26-04": "Hamdamova.M",
    "26-05": "Rayimova.X",
    "26-06": "Yuldashev.O",
    "26-07": "Asraliyev.A"
}

GROUP_TITLES = {
    "26-01": "Farmatsiya ishi",
    "26-02": "Hamshiralik ishi",
    "26-03": "Hamshiralik ishi",
    "26-04": "Hamshiralik ishi",
    "26-05": "Hamshiralik ishi",
    "26-06": "Hamshiralik ishi",
    "26-07": "Hamshiralik ishi"
}

def create_single_group_pdf(group_code, students, output_pdf_path):
    """
    Har bir guruh uchun toza, professional A4 formatli PDF jurnal yaratish.
    Tagida about:blank yoki brauzer sarlavhalari bo'lmaydi.
    """
    os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)

    g_students = [s for s in students if s.get('group') == group_code]
    g_students.sort(key=lambda x: str(x.get('ism', '')).lower())

    leader = GROUP_LEADERS.get(group_code, "—")
    g_title = GROUP_TITLES.get(group_code, "")

    # A4: 595.27 x 841.89 pt. 28pt = ~10mm margin
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=A4,
        leftMargin=28,
        rightMargin=28,
        topMargin=26,
        bottomMargin=24
    )

    elements = []

    title_style = ParagraphStyle(
        'MainTitle',
        fontName=FONT_BOLD,
        fontSize=12.5,
        leading=16,
        alignment=1, # Center
        spaceAfter=3,
        textColor=colors.HexColor('#0f172a')
    )

    sub_style = ParagraphStyle(
        'SubTitle',
        fontName=FONT_NORMAL,
        fontSize=9,
        leading=12,
        alignment=1,
        textColor=colors.HexColor('#475569'),
        spaceAfter=9
    )

    title_text = f"2026-2027 O'QUV YILI | {group_code} - GURUH TALABALARI RO'YXATI"
    elements.append(Paragraph(title_text, title_style))

    sub_text = f"Yo'nalish: <b>{g_title}</b> &nbsp;&bull;&nbsp; Guruh rahbari: <b>{leader}</b> &nbsp;&bull;&nbsp; Jami: <b>{len(g_students)} nafar</b>"
    elements.append(Paragraph(sub_text, sub_style))

    # Jadval stillari
    # 30 talaba 1 sahifada to'liq sig'ishi uchun satr balandligini ixcham qilamiz
    row_count = len(g_students)
    font_size = 9 if row_count > 25 else 9.5
    leading_size = 11 if row_count > 25 else 12
    padding_size = 2.8 if row_count > 25 else 3.5

    header_style_tr = ParagraphStyle('HTR', fontName=FONT_BOLD, fontSize=font_size, leading=leading_size, alignment=1, textColor=colors.white)
    header_style_left = ParagraphStyle('HTL', fontName=FONT_BOLD, fontSize=font_size, leading=leading_size, alignment=0, textColor=colors.white)
    header_style_center = ParagraphStyle('HTC', fontName=FONT_BOLD, fontSize=font_size, leading=leading_size, alignment=1, textColor=colors.white)

    cell_style_tr = ParagraphStyle('CTR', fontName=FONT_BOLD, fontSize=font_size, leading=leading_size, alignment=1, textColor=colors.HexColor('#334155'))
    cell_style_left = ParagraphStyle('CTL', fontName=FONT_NORMAL, fontSize=font_size, leading=leading_size, alignment=0, textColor=colors.HexColor('#0f172a'))
    cell_style_center = ParagraphStyle('CTC', fontName=FONT_NORMAL, fontSize=font_size, leading=leading_size, alignment=1, textColor=colors.HexColor('#1e293b'))

    data = [
        [
            Paragraph("T/R", header_style_tr),
            Paragraph("Talabaning To'liq F.I.SH (Familiya Ism Sharif)", header_style_left),
            Paragraph("Tug'ilgan Sana", header_style_center)
        ]
    ]

    for idx, st in enumerate(g_students, 1):
        fio = st.get('fio') or f"{st.get('ism', '')} {st.get('ota', '')}".strip()
        dob = st.get('dob') or "—"
        data.append([
            Paragraph(str(idx), cell_style_tr),
            Paragraph(fio, cell_style_left),
            Paragraph(dob, cell_style_center)
        ])

    # Kenglik: T/R=36pt, F.I.SH=403pt, Sana=100pt -> Jami 539pt (A4 595 - 56 = 539pt)
    t = Table(data, colWidths=[36, 403, 100], repeatRows=1)

    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), padding_size),
        ('BOTTOMPADDING', (0, 0), (-1, -1), padding_size),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
        ('LINEBELOW', (0, 0), (-1, 0), 1.2, colors.HexColor('#0f172a')),
    ]

    for row_idx in range(1, len(data)):
        if row_idx % 2 == 0:
            t_style.append(('BACKGROUND', (0, row_idx), (-1, row_idx), colors.HexColor('#f8fafc')))

    t.setStyle(TableStyle(t_style))
    elements.append(t)

    doc.build(elements)
    return output_pdf_path

def build_all_group_pdfs():
    """Barcha 7 ta guruh uchun PDF larni generatsiya qiladi"""
    excel_path = os.path.join(BASE_DIR, 'Talabalar_Toliq_Royxati.xlsx')
    if not os.path.exists(excel_path):
        return {}

    wb = openpyxl.load_workbook(excel_path, data_only=True)
    ws = wb.active

    students = []
    for r in range(2, ws.max_row + 1):
        ism = str(ws.cell(row=r, column=2).value or '').strip()
        shnum = str(ws.cell(row=r, column=5).value or '').strip()
        ota = str(ws.cell(row=r, column=7).value or '').strip()
        fish = str(ws.cell(row=r, column=8).value or '').strip()
        dob = str(ws.cell(row=r, column=13).value or '').strip()
        group = str(ws.cell(row=r, column=23).value or '').strip()
        if not ism and not shnum: continue
        full_fio = fish or f"{ism} {ota}".strip()
        students.append({'ism': ism, 'ota': ota, 'fio': full_fio, 'dob': dob, 'group': group})

    groups = ["26-01", "26-02", "26-03", "26-04", "26-05", "26-06", "26-07"]
    generated_files = {}

    target_dirs = [
        os.path.join(BASE_DIR, 'pdf_jurnallar'),
        os.path.join(BASE_DIR, 'qayta_tekshiruv', 'pdf_jurnallar')
    ]

    for g in groups:
        for tdir in target_dirs:
            os.makedirs(tdir, exist_ok=True)
            out_file = os.path.join(tdir, f"Guruh_{g}.pdf")
            create_single_group_pdf(g, students, out_file)
            generated_files[g] = out_file

    print(f"[OK] Barcha {len(groups)} ta guruh uchun toza A4 PDF jurnallar yaratildi!")
    return generated_files

if __name__ == '__main__':
    build_all_group_pdfs()
