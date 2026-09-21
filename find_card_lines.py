with open('qayta_tekshiruv/03_hisobot_yasat.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'card_html' in line or 'cards_content' in line or 'student-card' in line or 'class="card' in line:
        print(f"{idx+1}: {line.strip()[:100]}")
