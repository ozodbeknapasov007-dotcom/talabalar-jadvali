import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { MalumotnomaData } from '@/lib/malumotnoma'

/*
  Ma'lumotnoma — Word shablonidan (assets/malumotnoma/shablon.docx).
  Shablon Word'da tahrirlanadi; unda {{FISH}}, {{OQUV_YILI}}, {{YONALISH}},
  {{BOSQICH}}, {{GURUH}}, {{SANA}} belgilari qoladi — faqat shular almashtiriladi,
  qolgan hammasi (rasmlar, shrift, joylashuv) shablondagidek.
*/

const TEMPLATE = path.join(process.cwd(), 'assets', 'malumotnoma', 'shablon.docx')

let templatePromise: Promise<Record<string, Uint8Array>> | null = null

function loadTemplate() {
  templatePromise ??= readFile(TEMPLATE)
    .then((buf) => unzipSync(new Uint8Array(buf)))
    .catch((e) => { templatePromise = null; throw e })
  return templatePromise
}

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * {{KALIT}} larni almashtirish. Word ba'zan bitta so'zni bir nechta <w:t> ga bo'lib
 * yuboradi (imlo tekshiruvi, tahrir) — shuning uchun matn tugunlari birlashtirilib
 * qidiriladi va natija birinchi tugunga yoziladi.
 */
export function fillPlaceholders(xml: string, values: Record<string, string>): string {
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g
  const nodes: { start: number; end: number; text: string }[] = []
  for (let m; (m = re.exec(xml)); ) nodes.push({ start: m.index, end: m.index + m[0].length, text: m[1] })

  for (const [key, raw] of Object.entries(values)) {
    const token = `{{${key}}}`
    const value = escapeXml(raw)
    for (;;) {
      const joined = nodes.map((n) => n.text).join('')
      const at = joined.indexOf(token)
      if (at < 0) break
      let pos = 0
      let first = -1
      for (let i = 0; i < nodes.length; i++) {
        const from = pos, to = pos + nodes[i].text.length
        pos = to
        if (to <= at || from >= at + token.length) continue
        const a = Math.max(at, from) - from, b = Math.min(at + token.length, to) - from
        const t = nodes[i].text
        if (first < 0) {
          first = i
          nodes[i].text = t.slice(0, a) + value + t.slice(b)
        } else {
          nodes[i].text = t.slice(0, a) + t.slice(b)
        }
      }
    }
  }

  let out = ''
  let last = 0
  for (const n of nodes) {
    const space = /\s/.test(n.text) ? ' xml:space="preserve"' : ''
    out += xml.slice(last, n.start) + `<w:t${space}>${n.text}</w:t>`
    last = n.end
  }
  return out + xml.slice(last)
}

/** Tayyor ma'lumotnoma — .docx */
export async function renderMalumotnoma(d: MalumotnomaData): Promise<Buffer> {
  const files = { ...(await loadTemplate()) }
  const xml = strFromU8(files['word/document.xml'])
  files['word/document.xml'] = strToU8(fillPlaceholders(xml, {
    FISH: d.fish,
    OQUV_YILI: d.oquvYili,
    YONALISH: d.yon,
    BOSQICH: String(d.bosqich),
    // Guruh va bosqich qatorlar orasida bo'linmasin — bo'linmaydigan chiziqcha
    GURUH: d.group.replace(/-/g, '‑'),
    SANA: d.sana,
  }))
  return Buffer.from(zipSync(files, { level: 6 }))
}
