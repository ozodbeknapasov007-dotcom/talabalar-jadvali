// Python (scripts/generate_qabul_shablon.py) uchun ko'prik: portal bilan aynan bir xil
// qabul qatorlari va tarjimalarni olish.
//   stdin : [{ "student": {...}, "istisno": {...} | null }, ...]
//   stdout: [QabulRow, ...]
// Node 22.18+ .ts faylni to'g'ridan-to'g'ri yuklaydi (type stripping).
import { qabulRow } from '../lib/qabul.ts'

let input = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) input += chunk

const items = JSON.parse(input)
const rows = items.map(({ student, istisno }) => qabulRow(student, istisno ?? undefined))
process.stdout.write(JSON.stringify(rows))
