import 'server-only'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { applyGroupSettings, DEFAULT_GROUP_SETTINGS, sanitizeGroupSettings, type GroupSettings } from '@/lib/config'
import { buildAddedStudent, fullName } from '@/lib/student'
import type { Change, EditFields, Student } from '@/lib/types'
import { getServiceSupabase } from '@/lib/supabase'

/*
  Ma'lumot ikki xil yo'l bilan o'qiladi/yoziladi:

  local  — kompyuterda `npm run dev`: talabalar ota papkadagi data/students.json dan
           o'qiladi, o'zgarishlar Python xizmatining (localhost:8080) mavjud
           /api/update_student, /api/verify_student, /api/delete_student
           endpointlariga yuboriladi. Xizmat darhol Excelga yozadi.

  github — Vercel: talabalar GitHub'dagi data/students.json dan o'qiladi,
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

const GH_OWNER = process.env.GITHUB_OWNER || 'ozodbeknapasov007-dotcom'
const GH_REPO = process.env.GITHUB_REPO || 'talabalar-jadvali'
const GH_BRANCH = process.env.GITHUB_BRANCH || 'main'
const QUEUE_PATH = 'scripts/remote_changes.json'
const GROUP_SETTINGS_PATH = 'data/guruhlar.json'

/*
  Loyiha papkalari (26.09.2026 dan). GitHub'da ham, kompyuterda ham shu yo'llar.
  Ikkinchi qiymat — ko'chirishdan oldingi eski joy (o'tish davri uchun zaxira).
*/
export const REPO_PATHS = {
  students: ['data/students.json', 'students.json'],
  baza: ['data/talabalar_bazasi.json', 'talabalar_bazasi.json'],
  eskiIndex: ['eski_portal/index.html', 'index.html'],
  hujjatlar: ['hujjatlar/shartnomalar', 'files'],
  pdfJurnallar: ['hisobotlar/pdf_jurnallar', 'pdf_jurnallar'],
  rollar: ['hisobotlar/rollar', ''],
} as const

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

/**
 * Loyiha faylini o'qish: kompyuterda — diskdan, Vercel'da — GitHub'dan.
 * candidates — birinchi topilgani qaytariladi (yangi joy, keyin eski joy).
 */
export async function readRepoFile(candidates: readonly string[]): Promise<Buffer | null> {
  for (const rel of candidates) {
    if (!rel) continue
    if (syncMode() === 'local') {
      try {
        return await readFile(path.join(REPO_DIR, ...rel.split('/')))
      } catch { /* keyingi nomzod */ }
    } else {
      const buf = await ghReadRaw(rel)
      if (buf) return buf
    }
  }
  return null
}

/** Papka ichidagi faylni o'qish (masalan hujjatlar/shartnomalar/<fayl>) */
export function readRepoFileIn(dirs: readonly string[], name: string): Promise<Buffer | null> {
  return readRepoFile(dirs.map((d) => (d ? `${d}/${name}` : name)))
}

async function loadBaseStudents(): Promise<Student[]> {
  const json = await readRepoFile(REPO_PATHS.students)
  if (json) return JSON.parse(json.toString('utf-8'))
  const html = await readRepoFile(REPO_PATHS.eskiIndex)
  if (!html) throw new Error("Talabalar ma'lumotini o'qib bo'lmadi (data/students.json topilmadi)")
  return parseFromIndexHtml(html.toString('utf-8'))
}

/** GitHub'dagi navbat: Vercel'dan yuborilgan, lekin Python xizmati hali Excelga qo'llamagan o'zgarishlar */
async function loadQueue(): Promise<Change[]> {
  const buf = await ghReadRaw(QUEUE_PATH).catch(() => null)
  if (!buf) return []
  try {
    const list = JSON.parse(buf.toString('utf-8'))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/**
 * Navbatdagi o'zgarishlarni students.json ustiga qo'yamiz — aks holda kompyuterdagi
 * xizmat navbatni qo'llamaguncha (yoki kompyuter o'chiq bo'lsa) Vercel eski ma'lumotni
 * ko'rsatadi va tahrir "joyiga qaytib qolgandek" bo'ladi. Qoidalar telegram_sync_service.py
 * dagi process_remote_github_changes() bilan bir xil.
 */
function applyQueue(base: Student[], queue: Change[]): Student[] {
  let list = base.slice()
  let nextRow = list.reduce((m, s) => Math.max(m, s.row), 1) + 1
  const pin = (v: unknown) => String(v ?? '').replace(/\s/g, '')

  for (const chg of queue) {
    if (!chg || typeof chg !== 'object' || !chg.data) continue
    if (chg.type === 'add_student') {
      if (!String(chg.data.ism || '').trim()) continue
      list.push(buildAddedStudent(chg.data, nextRow++))
      continue
    }
    if (chg.type === 'delete_student') {
      const d = chg.data
      const sh = String(d.shnum || '').trim()
      const p = pin(d.pinfl)
      const name = String(d.ism || d.fish || '').trim().toLowerCase()
      const hit =
        (sh && sh !== '—' && sh !== '-' ? list.find((s) => String(s.shnum || '').trim() === sh) : undefined) ??
        (p ? list.find((s) => pin(s.pinfl) === p) : undefined) ??
        (name ? list.find((s) => String(s.ism || '').trim().toLowerCase() === name || fullName(s).toLowerCase() === name) : undefined) ??
        list.find((s) => s.row === Number(d.row))
      if (hit) list = list.filter((s) => s !== hit)
      continue
    }
    const d = chg.data as unknown as Record<string, unknown>
    const sh = pin(d.shnum)
    const p = pin(d.pinfl)

    // Aniq qatorni aniqlash: avval row bo'yicha qaraymiz, lekin PINFL yoki shartnoma raqamini tekshiramiz
    let i = list.findIndex((s) => s.row === Number(d.row))
    if (i !== -1 && (p || sh)) {
      const s = list[i]
      const s_p = pin(s.pinfl)
      const s_sh = pin(s.shnum)
      if ((p && s_p && p !== s_p) || (sh && s_sh && s_sh !== '—' && s_sh !== '-' && sh !== s_sh)) {
        // Qator surilib qolgan! PINFL yoki shnum bo'yicha haqiqiy talabani topamiz
        const found = list.findIndex((x) => (p && pin(x.pinfl) === p) || (sh && pin(x.shnum) === sh))
        if (found !== -1) i = found
      }
    } else if (i === -1 && (p || sh)) {
      i = list.findIndex((x) => (p && pin(x.pinfl) === p) || (sh && pin(x.shnum) === sh))
    }
    if (i === -1) continue

    if (chg.type === 'verify_student') {
      list[i] = { ...list[i], verified: chg.data.status }
    } else if (chg.type === 'baza_student') {
      list[i] = { ...list[i], baza: chg.data.status }
    } else if (chg.type === 'update_student') {
      const f = { ...chg.data.fields }
      // Xizmat bo'sh ism/otasining ismini yozmaydi
      if (!f.ism) delete f.ism
      if (!f.ota) delete f.ota
      const s = { ...list[i], ...f }
      s.fish = `${s.ism || ''} ${s.ota || ''}`.trim()
      list[i] = s
    }
  }
  return list
}

let cachedStudents: { data: Student[]; expiresAt: number } | null = null
const CACHE_TTL_MS = 6_000 // 6 soniya server kesh (GitHub rate limit xatolarining oldini oladi)

export function invalidateCache() {
  cachedStudents = null
}

async function loadFromSupabase(): Promise<Student[] | null> {
  try {
    const sb = getServiceSupabase()
    const { data, error } = await sb.from('students').select('*').order('row', { ascending: true })
    if (error || !data || data.length === 0) return null
    return data as Student[]
  } catch {
    return null
  }
}

export async function loadStudents(): Promise<Student[]> {
  // 1. Avval Supabase'dan o'qish (eng tezkor, jonli va real vaqt ma'lumot)
  const sbData = await loadFromSupabase()
  if (sbData && sbData.length > 0) {
    return sbData
  }

  // 2. Agar Supabase vaqtincha mavjud bo'lmasa, zaxira sifatida fayllar/GitHub'dan o'qish (kesh bilan)
  const now = Date.now()
  if (cachedStudents && cachedStudents.expiresAt > now) {
    return cachedStudents.data
  }

  const [students, queue] = await Promise.all([
    loadBaseStudents(),
    syncMode() === 'github' ? loadQueue() : Promise.resolve([]),
  ])
  const result = queue.length ? applyQueue(students, queue) : students
  cachedStudents = { data: result, expiresAt: now + CACHE_TTL_MS }
  return result
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
    const d = change.data as { row: number; fields: EditFields; shnum?: string; pinfl?: string; ism?: string }
    q.set('row', String(d.row))
    if (d.shnum) q.set('shnum_verify', String(d.shnum))
    if (d.pinfl) q.set('pinfl_verify', String(d.pinfl))
    if (d.ism) q.set('ism_verify', String(d.ism))
    for (const [k, v] of Object.entries(d.fields)) q.set(k, v != null ? String(v) : '')
  } else if (change.type === 'verify_student') {
    endpoint = '/api/verify_student'
    for (const [k, v] of Object.entries(change.data)) q.set(k, String(v))
  } else if (change.type === 'baza_student') {
    endpoint = '/api/baza_student'
    for (const [k, v] of Object.entries(change.data)) q.set(k, String(v))
  } else {
    endpoint = '/api/delete_student'
    for (const [k, v] of Object.entries(change.data)) q.set(k, String(v))
  }
  // URLSearchParams probelni "+" qiladi, Python xizmati esa unquote() bilan o'qiydi va
  // "+" ni probelga qaytarmaydi ("Azamat+qizi") — shuning uchun %20 bilan kodlaymiz
  const query = [...q].map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  const res = await fetch(`${LOCAL_API}${endpoint}?${query}`, { cache: 'no-store' })
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

async function sendSupabase(change: Change): Promise<void> {
  const sb = getServiceSupabase()
  if (change.type === 'update_student') {
    const d = change.data
    const shnum = d.shnum
    const pinfl = d.pinfl
    const updateData: Record<string, unknown> = { ...d.fields, updated_at: new Date().toISOString() }
    if (d.fields.ism || d.fields.ota) {
      updateData.fish = `${d.fields.ism || ''} ${d.fields.ota || ''}`.trim()
    }
    let query = sb.from('students').update(updateData)
    if (pinfl) query = query.eq('pinfl', pinfl.replace(/\s/g, ''))
    else if (shnum && shnum !== '—' && shnum !== '-') query = query.eq('shnum', shnum)
    else query = query.eq('row', d.row)
    const { error } = await query
    if (error) throw error
  } else if (change.type === 'verify_student') {
    const d = change.data
    let query = sb.from('students').update({ verified: d.status, updated_at: new Date().toISOString() })
    if (d.pinfl) query = query.eq('pinfl', d.pinfl.replace(/\s/g, ''))
    else if (d.shnum && d.shnum !== '—' && d.shnum !== '-') query = query.eq('shnum', d.shnum)
    else query = query.eq('row', d.row)
    const { error } = await query
    if (error) throw error
  } else if (change.type === 'baza_student') {
    const d = change.data
    let query = sb.from('students').update({ baza: d.status, updated_at: new Date().toISOString() })
    if (d.pinfl) query = query.eq('pinfl', d.pinfl.replace(/\s/g, ''))
    else if (d.shnum && d.shnum !== '—' && d.shnum !== '-') query = query.eq('shnum', d.shnum)
    else query = query.eq('row', d.row)
    const { error } = await query
    if (error) throw error
  } else if (change.type === 'delete_student') {
    const d = change.data
    let query = sb.from('students').delete()
    if (d.pinfl) query = query.eq('pinfl', d.pinfl.replace(/\s/g, ''))
    else if (d.shnum && d.shnum !== '—' && d.shnum !== '-') query = query.eq('shnum', d.shnum)
    else query = query.eq('row', d.row)
    const { error } = await query
    if (error) throw error
  } else if (change.type === 'add_student') {
    const d = change.data
    const { count } = await sb.from('students').select('*', { count: 'exact', head: true })
    const nextRow = (count || 562) + 1
    const newStudent = buildAddedStudent(d, nextRow)
    const { error } = await sb.from('students').insert(newStudent)
    if (error) throw error
  }
}

export async function sendChange(change: Change): Promise<void> {
  invalidateCache()
  let supabaseOk = false
  try {
    await sendSupabase(change)
    supabaseOk = true
  } catch (err) {
    console.error('Supabase write error, continuing to local/github:', err)
  }
  try {
    if (syncMode() === 'local') {
      await sendLocal(change)
    } else {
      await sendGithub(change)
    }
  } catch (err) {
    if (!supabaseOk) {
      throw err
    }
  } finally {
    invalidateCache()
  }
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
  return readRepoFileIn(REPO_PATHS.hujjatlar, name)
}

/* ------------------------------ GURUH SOZLAMALARI ------------------------------ */

/** data/guruhlar.json (bo'lmasa — config.ts dagi boshlang'ich qiymatlar) va server xotirasiga qo'llash */
export async function loadGroupSettings(): Promise<GroupSettings> {
  let settings = DEFAULT_GROUP_SETTINGS
  try {
    const buf = await readRepoFile([GROUP_SETTINGS_PATH])
    if (buf) {
      const parsed = sanitizeGroupSettings(JSON.parse(buf.toString('utf-8')))
      if (Object.keys(parsed).length) settings = parsed
    }
  } catch { /* buzilgan fayl — boshlang'ich qiymatlar */ }
  applyGroupSettings(settings)
  return settings
}

/**
 * Sozlamalarni saqlash. Lokal: faylni diskka yozib, Python xizmatiga GitHub'ga yuborishni
 * aytadi. Vercel: GitHub'dagi faylni to'g'ridan-to'g'ri yangilaydi (xizmat uni git pull bilan oladi).
 */
export async function saveGroupSettings(raw: unknown): Promise<GroupSettings> {
  const settings = sanitizeGroupSettings(raw)
  if (!Object.keys(settings).length) throw new Error("Guruh sozlamalari bo'sh yoki noto'g'ri")
  const text = JSON.stringify(settings, null, 2) + '\n'

  if (syncMode() === 'local') {
    const file = path.join(REPO_DIR, ...GROUP_SETTINGS_PATH.split('/'))
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, text, 'utf-8')
    await fetch(`${LOCAL_API}/api/flush_to_git?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null)
  } else {
    if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN sozlanmagan')
    let lastErr = ''
    for (let attempt = 1; attempt <= 4; attempt++) {
      const getRes = await fetch(`${contentsUrl(GROUP_SETTINGS_PATH)}?ref=${GH_BRANCH}`, { headers: ghHeaders(), cache: 'no-store' })
      const sha = getRes.ok ? (await getRes.json()).sha : undefined
      const putRes = await fetch(contentsUrl(GROUP_SETTINGS_PATH), {
        method: 'PUT',
        headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Guruh sozlamalari yangilandi', content: Buffer.from(text, 'utf-8').toString('base64'), branch: GH_BRANCH, sha }),
      })
      if (putRes.ok) { lastErr = ''; break }
      lastErr = `${putRes.status} ${(await putRes.text()).slice(0, 160)}`
      if (putRes.status !== 409 && putRes.status !== 422) break
      await new Promise((r) => setTimeout(r, 300 * attempt))
    }
    if (lastErr) throw new Error(`GitHub'ga yozilmadi: ${lastErr}`)
  }
  applyGroupSettings(settings)
  return settings
}
