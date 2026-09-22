import os
import openpyxl
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# qayta_tekshiruv ichida bo'lsa, asosiy loyiha papkasi bir pog'ona yuqorida:
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR) if os.path.basename(CURRENT_DIR) == 'qayta_tekshiruv' else CURRENT_DIR

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
    os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)

    g_students = [s for s in students if s.get('group') == group_code]
    g_students.sort(key=lambda x: str(x.get('ism', '')).lower())

    leader = GROUP_LEADERS.get(group_code, "—")
    g_title = GROUP_TITLES.get(group_code, "")

    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=A4,
        leftMargin=28,
        rightMargin=28,
        topMargin=25,
        bottomMargin=20
    )

    elements = []
    avail_width = A4[0] - 56

    count = len(g_students)
    if count <= 25:
        row_height = 20
        font_size = 9.5
        header_font_size = 9.5
        padding_size = 3
    elif count <= 30:
        row_height = 18
        font_size = 9.0
        header_font_size = 9.0
        padding_size = 2.5
    else:
        row_height = 16
        font_size = 8.5
        header_font_size = 8.5
        padding_size = 2

    title_style = ParagraphStyle(
        'DocTitle',
        fontName=FONT_BOLD,
        fontSize=13,
        leading=16,
        alignment=1,
        textColor=colors.HexColor('#0f172a')
    )

    info_left_style = ParagraphStyle(
        'InfoLeft',
        fontName=FONT_BOLD,
        fontSize=10,
        leading=13,
        alignment=0,
        textColor=colors.HexColor('#1e293b')
    )

    info_right_style = ParagraphStyle(
        'InfoRight',
        fontName=FONT_BOLD,
        fontSize=10,
        leading=13,
        alignment=2,
        textColor=colors.HexColor('#1e293b')
    )

    header_para_style = ParagraphStyle(
        'HeaderCell',
        fontName=FONT_BOLD,
        fontSize=header_font_size,
        leading=header_font_size + 2,
        alignment=1,
        textColor=colors.HexColor('#0f172a')
    )

    cell_name_style = ParagraphStyle(
        'CellName',
        fontName=FONT_BOLD,
        fontSize=font_size,
        leading=font_size + 2,
        alignment=0,
        textColor=colors.HexColor('#0f172a')
    )

    cell_center_style = ParagraphStyle(
        'CellCenter',
        fontName=FONT_NORMAL,
        fontSize=font_size,
        leading=font_size + 2,
        alignment=1,
        textColor=colors.HexColor('#334155')
    )

    header_table_data = [
        [
            Paragraph("Abu Ali ibn Sino nomidagi Jamoat salomatligi texnikumi", title_style),
            ""
        ],
        [
            Paragraph(f"Yo'nalish: <b>{g_title}</b> | Guruh: <b>{group_code}</b>", info_left_style),
            Paragraph(f"Guruh rahbari: <b>{leader}</b>", info_right_style)
        ]
    ]

    ht = Table(header_table_data, colWidths=[avail_width * 0.65, avail_width * 0.35])
    ht.setStyle(TableStyle([
        ('SPAN', (0, 0), (1, 0)),
        ('ALIGN', (0, 0), (1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(ht)

    w_no = 28
    w_sh = 45
    w_dob = 72
    w_imzo = 75
    w_name = avail_width - (w_no + w_sh + w_dob + w_imzo)

    col_widths = [w_no, w_sh, w_name, w_dob, w_imzo]

    headers = [
        Paragraph("№", header_para_style),
        Paragraph("Shartnoma", header_para_style),
        Paragraph("F.I.SH (To'liq)", header_para_style),
        Paragraph("Tug'ilgan sana", header_para_style),
        Paragraph("Imzo", header_para_style)
    ]

    data = [headers]

    for idx, st in enumerate(g_students, start=1):
        sh_num = f"#{st.get('shnum', '')}" if st.get('shnum') else "—"
        row = [
            Paragraph(str(idx), cell_center_style),
            Paragraph(sh_num, cell_center_style),
            Paragraph(st.get('fio', st.get('ism', '')), cell_name_style),
            Paragraph(st.get('dob') or "—", cell_center_style),
            Paragraph("", cell_center_style)
        ]
        data.append(row)

    t = Table(data, colWidths=col_widths, rowHeights=[row_height + 2] + [row_height] * len(g_students))
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
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
