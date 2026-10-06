import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('data/students.json', 'r', encoding='utf-8') as f:
    students = json.load(f)

print(f"Total students: {len(students)}")
bad_count = 0
for s in students:
    t = str(s.get('tel', ''))
    t1 = str(s.get('tel_shaxsiy', ''))
    t2 = str(s.get('tel_otaona', ''))
    # Check for invalid phone codes or strange numbers
    # Uzbekistan mobile prefixes: 90, 91, 93, 94, 95, 97, 98, 99, 88, 77, 33, 50, 71, etc.
    # What are "00 lik raqam"? e.g. starting with 00, or +998 00 ..., or +998 51, or similar?
    for label, val in [('tel', t), ('tel_shaxsiy', t1), ('tel_otaona', t2)]:
        if not val: continue
        # Check if contains 00 or strange prefix or format error
        clean = ''.join(c for c in val if c.isdigit())
        if clean.startswith('998'):
            clean = clean[3:]
        if clean.startswith('00') or clean.startswith('0') or len(clean) < 9 or clean.startswith('51') or clean.startswith('20'):
            print(f"Row {s.get('row', '?')} ({s.get('fish', '')}) -> {label}: {repr(val)}")
            bad_count += 1
            break

print(f"Found {bad_count} suspicious phone entries.")
