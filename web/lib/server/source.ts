import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Change, Student } from '@/lib/types'

/*
  Ma'lumot ikki xil yo'l bilan o'qiladi/yoziladi:

  local  — kompyuterda `npm run dev`: talabalar ota papkadagi students.json dan
           o'qiladi, o'zgarishlar Python xizmatining (localhost:8080) mavjud
           /api/update_student, /api/verify_student, /api/delete_student
           endpointlariga yuboriladi. Xizmat darhol Excelga yozadi.

  github — Vercel: talabalar GitHub'dagi students.json dan o'qiladi,
           o'zgarishlar scripts/remote_changes.json navbatiga qo'shiladi.
           Kompyuterdagi Python xizmati navbatni tortib Excelga qo'llaydi.
*/

export type SyncMode = 'local' | 'github'

export function syncMode(): SyncMode {
  const m = process.env.SYNC_MODE
  if (m === 'local' || m === 'github') return m
  return process.env.VERCEL ? 'github' : 'local'
}

const REPO_DIR = process.env.REPO_DIR || path.resolve(process.cwd(), '..')
const LOCAL_API = (process.env.LOCAL_API || 'http://localhost:8080').replace(/\/$/, '')

const GH_OWNER = process.env.GITHUB_OWNER || 'OzodbekNapasov'
const GH_REPO = process.env.GITHUB_REPO || 'Talabalar-ro-yhati'
const GH_BRANCH = process.env.GITHUB_BRANCH || 'main'
const QUEUE_PATH = 'scripts/remote_changes.json'

function ghHeaders(accept = 'application/vnd.github+json'): HeadersInit {
  const h: Record<string, string> = { Accept: accept, 'User-Agent': 'talabalar-portal' }
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return h
}

function contentsUrl(p: string) {
  const enc = p.split('/').map(encodeURIComponent).join('/')
  return `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${enc}`
}

/** GitHub'dan faylni xom holda (1 MB dan katta bo'lsa ham) o'qish */
async function ghReadRaw(p: string): Promise<Buffer | null> {
  const res = await fetch(`${contentsUrl(p)}?ref=${GH_BRANCH}`, {
    headers: ghHeaders('application/vnd.github.raw'),
    cache: 'no-store',
  })
  if (res.ok) return Buffer.from(await res.arrayBuffer())
  if (res.status === 404) return null
  // Token yo'q yoki limit — ommaviy raw manziliga urinamiz (5 daqiqagacha kesh bo'lishi mumkin)
  const raw = await fetch(
    `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${p.split('/').map(encodeURIComponent).join('/')}`,
    { cache: 'no-store' },
  )
  return raw.ok ? Buffer.from(await raw.arrayBuffer()) : null
}

/** students.json hali yaratilmagan bo'lsa — index.html ichidagi RAW_STUDENTS dan ajratib olamiz */
function parseFromIndexHtml(html: string): Student[] {
  const marker = 'var RAW_STUDENTS = '
  const i = html.indexOf(marker)
  if (i === -1) throw new Error("index.html ichida RAW_STUDENTS topilmadi")
  const start = i + marker.length
  const end = html.indexOf('\n', start)
  return JSON.parse(html.slice(start, end).trim().replace(/;$/, ''))
}

export async function loadStudents(): Promise<Student[]> {
  if (syncMode() === 'local') {
    try {
      return JSON.parse(await readFile(path.join(REPO_DIR, 'students.json'), 'utf-8'))
    } catch {
      return parseFromIndexHtml(await readFile(path.join(REPO_DIR, 'index.html'), 'utf-8'))
    }
  }
  const json = await ghReadRaw('students.json')
  if (json) return JSON.parse(json.toString('utf-8'))
  const html = await ghReadRaw('index.html')
  if (!html) throw new Error("GitHub'dan talabalar ma'lumotini o'qib bo'lmadi")
  return parseFromIndexHtml(html.toString('utf-8'))
}

/* ------------------------------ YOZISH ------------------------------ */

async function sendLocal(change: Change): Promise<void> {
  if (change.type === 'add_student') {
    const d = change.data
    const res = await fetch(`${LOCAL_API}/api/add_students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        students: [{
          ism: d.ism || '',
          ota: d.ota || '',
          shnum: d.shnum || '',
          pass_val: d.pv || '',
          pinfl: d.pinfl || '',
          dob: d.dob || '',
          ber_sana: d.ber || '',
          cert_val: d.sh_doc || '',
          cert_tur: d.doc_tur || 'Shahodatnoma',
          maktab: d.mak || '',
          yil: d.yil || '2024',
          yonalis: d.yon || 'Hamshiralik ishi - 3 yillik',
          tel: d.tel || '',
          group: d.group || '26-02',
        }],
      }),
      cache: 'no-store',
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || body.success === false) {
      throw new Error(body.error || `Python xizmati ${res.status} qaytardi`)
    }
    return
  }
  const q = new URLSearchParams()
  let endpoint: string
  if (change.type === 'update_student') {
    endpoint = '/api/update_student'
    q.set('row', String(change.data.row))
    for (const [k, v] of Object.entries(change.data.fields)) q.set(k, v ?? '')
  } else if (change.type === 'verify_student') {
    endpoint = '/api/verify_student'
    for (const [k, v] of Object.entries(change.data)) q.set(k, String(v))
  } else {
    endpoint = '/api/delete_student'
    for (const [k, v] of Object.entries(change.data)) q.set(k, String(v))
  }
  const res = await fetch(`${LOCAL_API}${endpoint}?${q}`, { cache: 'no-store' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    throw new Error(body.error || `Python xizmati ${res.status} qaytardi`)
  }
}

/** remote_changes.json navbatiga qo'shish (409 bo'lsa yangi SHA bilan qayta urinadi) */
async function sendGithub(change: Change): Promise<void> {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN sozlanmagan')
  const entry = { ...change, id: `chg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, created_at: new Date().toISOString() }

  let lastErr = ''
  for (let attempt = 1; attempt <= 5; attempt++) {
    const getRes = await fetch(`${contentsUrl(QUEUE_PATH)}?ref=${GH_BRANCH}`, { headers: ghHeaders(), cache: 'no-store' })
    let list: unknown[] = []
    let sha: string | undefined
    if (getRes.ok) {
      const file = await getRes.json()
      sha = file.sha
      try {
        const parsed = JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8'))
        if (Array.isArray(parsed)) list = parsed
      } catch { /* buzilgan fayl — bo'sh ro'yxatdan boshlaymiz */ }
    }
    list.push(entry)

    const putRes = await fetch(contentsUrl(QUEUE_PATH), {
      method: 'PUT',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Remote o'zgarish: ${change.type} (${entry.id})`,
        content: Buffer.from(JSON.stringify(list, null, 2), 'utf-8').toString('base64'),
        branch: GH_BRANCH,
        sha,
      }),
    })
    if (putRes.ok) return
    lastErr = `${putRes.status} ${await putRes.text()}`
    if (putRes.status !== 409 && putRes.status !== 422) break
    await new Promise((r) => setTimeout(r, 300 * attempt))
  }
  throw new Error(`GitHub navbatiga yozilmadi: ${lastErr.slice(0, 200)}`)
}

export async function sendChange(change: Change): Promise<void> {
  return syncMode() === 'local' ? sendLocal(change) : sendGithub(change)
}

/* ------------------------------ HOLAT ------------------------------ */

export async function localSyncStatus() {
  const res = await fetch(`${LOCAL_API}/api/git_sync_status?t=${Date.now()}`, { cache: 'no-store' })
  return res.json()
}

export async function localFlush() {
  const res = await fetch(`${LOCAL_API}/api/flush_to_git?t=${Date.now()}`, { cache: 'no-store' })
  return res.json()
}

/* ---------------------------- HUJJAT FAYLI ---------------------------- */

export async function loadDocFile(name: string): Promise<Buffer | null> {
  if (syncMode() === 'local') {
    try {
      return await readFile(path.join(REPO_DIR, 'files', name))
    } catch {
      return null
    }
  }
  return ghReadRaw(`files/${name}`)
}
