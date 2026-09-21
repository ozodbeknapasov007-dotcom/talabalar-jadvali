import re

with open('hisobot.html', 'r', encoding='utf-8') as f:
    html = f.read()

print("HTML size:", len(html))

# Look for tab buttons, section headings, numbers like 1., 2., 3., 4.
headings = re.findall(r'<h[1-4][^>]*>(.*?)</h[1-4]>', html, re.I)
print("\n--- Headings in hisobot.html ---")
for h in headings[:30]:
    clean_h = re.sub(r'<[^>]+>', '', h).strip()
    if clean_h:
        print("  ", clean_h)

buttons = re.findall(r'<button[^>]*>(.*?)</button>', html, re.I | re.DOTALL)
print("\n--- Buttons in hisobot.html ---")
for b in buttons[:30]:
    clean_b = re.sub(r'<[^>]+>', '', b).strip()
    if clean_b and len(clean_b) < 60:
        print("  ", clean_b)

# Look for nav tabs or view switchers
view_matches = re.findall(r'(?:tab|view|switch|rejim|nav)[^>]*>(.*?)</', html, re.I)
print("\n--- View/Tab snippets ---")
for v in view_matches[:20]:
    clean_v = re.sub(r'<[^>]+>', '', v).strip()
    if clean_v and len(clean_v) < 60:
        print("  ", clean_v)
