import { dobFromPinfl } from './student'
import type { EditFields } from './types'

export const AI_MODELS = [
  ['google/gemini-2.5-flash', 'Gemini 2.5 Flash (Tez)'],
  ['google/gemini-2.5-pro', 'Gemini 2.5 Pro (Aniq)'],
  ['openai/gpt-4o', 'GPT-4o'],
  ['anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet'],
] as const

export type AiModelId = (typeof AI_MODELS)[number][0]

const MODEL_STORAGE_KEY = 'portal_ai_model'
const LOCAL_PY_SERVER = 'http://localhost:8080'

export function getSavedAiModel(): AiModelId {
  if (typeof window === 'undefined') return 'google/gemini-2.5-flash'
  const saved = localStorage.getItem(MODEL_STORAGE_KEY)
  if (saved && AI_MODELS.some(([id]) => id === saved)) return saved as AiModelId
  return 'google/gemini-2.5-flash'
}

export function setSavedAiModel(model: AiModelId) {
  try { localStorage.setItem(MODEL_STORAGE_KEY, model) } catch { /* ignore */ }
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || ''))
    r.onerror = () => reject(new Error("Faylni o'qib bo'lmadi"))
    r.readAsDataURL(file)
  })
}

/** .docx (ZIP) ichidan word/document.xml matni va word/media/* rasmlarini brauzerning o'zida ajratib olish */
export async function extractDocxClient(file: File): Promise<{ text: string; images: string[] }> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  const view = new DataView(buf)
  const images: string[] = []
  let text = ''

  let offset = 0
  while (offset + 30 <= bytes.length) {
    const sig = view.getUint32(offset, true)
    if (sig !== 0x04034b50) break
    const method = view.getUint16(offset + 8, true)
    const compSize = view.getUint32(offset + 18, true)
    const nameLen = view.getUint16(offset + 26, true)
    const extraLen = view.getUint16(offset + 28, true)
    const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen)
    const name = new TextDecoder().decode(nameBytes)
    const dataStart = offset + 30 + nameLen + extraLen
    const dataEnd = dataStart + compSize
    if (dataEnd > bytes.length) break
    const rawSlice = bytes.subarray(dataStart, dataEnd)

    const decompress = async (): Promise<Uint8Array | null> => {
      if (method === 0) return rawSlice
      if (method === 8 && typeof DecompressionStream !== 'undefined') {
        try {
          const ds = new DecompressionStream('deflate-raw')
          const writer = ds.writable.getWriter()
          writer.write(rawSlice)
          writer.close()
          const resBuf = await new Response(ds.readable).arrayBuffer()
          return new Uint8Array(resBuf)
        } catch {
          return null
        }
      }
      return null
    }

    if (name === 'word/document.xml') {
      const dec = await decompress()
      if (dec) {
        const xml = new TextDecoder().decode(dec)
        text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      }
    } else if (name.startsWith('word/media/') && /\.(png|jpe?g|webp)$/i.test(name)) {
      const dec = await decompress()
      if (dec && dec.byteLength > 1024) {
        const mime = name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
        const blob = new Blob([new Uint8Array(dec)], { type: mime })
        images.push(await fileToDataUrl(blob))
      }
    }
    offset = dataEnd
  }

  return { text, images }
}

/** Matndan pasport, JSHSHIR, shartnoma, telefon va F.I.SH ni regex orqali dastlabki aniqlash */
export function parseFieldsFromText(text: string): Partial<EditFields> & { sh_qr?: string } {
  const out: Partial<EditFields> & { sh_qr?: string } = {}
  if (!text) return out

  const pinflMatch = text.match(/\b([3456]\d{13})\b/)
  if (pinflMatch) {
    out.pinfl = pinflMatch[1]
    const dob = dobFromPinfl(out.pinfl)
    if (dob) out.dob = dob
  }

  const pvMatch = text.match(/\b(A[A-E]|FA|XS|KA)\s*(\d{7})\b/i)
  if (pvMatch) {
    out.pv = (pvMatch[1] + pvMatch[2]).toUpperCase()
  }

  const certMatch = text.match(/\b(UM|U|AB|AA|DT|K|S|T|V)\s*№?\s*(\d{6,8})\b/i)
  if (certMatch && (!out.pv || (certMatch[1] + certMatch[2]).toUpperCase() !== out.pv)) {
    out.sh_doc = `${certMatch[1].toUpperCase()} ${certMatch[2]}`
  }

  const telMatch = text.match(/(?:\+?998[\s-]?)?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/)
  if (telMatch) {
    out.tel = telMatch[0].trim()
  }

  const shMatch = text.match(/shartnoma\s*(?:№|#|\s)\s*(\d{1,4})/i)
  if (shMatch) {
    out.shnum = shMatch[1]
  }

  const qrMatch = text.match(/https?:\/\/[^\s"'<>]+(?:uzedu\.uz|edu\.uz|gov\.uz)[^\s"'<>]*/i)
  if (qrMatch) {
    out.sh_qr = qrMatch[0]
  }

  return out
}

/** Brauzer buferidan (Ctrl+V) yoki Windows Clipboard API dan fayl/rasmlarni olish */
export async function getFilesFromClipboard(): Promise<File[]> {
  const files: File[] = []

  // 1. Browser Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard?.read) {
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type)
            const ext = type.split('/')[1] || 'png'
            files.push(new File([blob], `clipboard_${Date.now()}.${ext}`, { type }))
          }
        }
      }
    } catch {
      // Ruxsat berilmagan yoki fayl nusxalangan bo'lsa, keyingi bosqichga o'tamiz
    }
  }

  if (files.length > 0) return files

  // 2. Local Python server Windows Clipboard API (/api/get_clipboard_files)
  try {
    const res = await fetch(`${LOCAL_PY_SERVER}/api/get_clipboard_files`, { method: 'POST' })
    const data = await res.json()
    if (data.ok && Array.isArray(data.files)) {
      for (const f of data.files) {
        const resp = await fetch(f.data)
        const blob = await resp.blob()
        files.push(new File([blob], f.name || 'clipboard.png', { type: f.mime || blob.type }))
      }
    }
  } catch {
    // Local Python server o'chiq bo'lishi mumkin
  }

  return files
}

/** Rasmlardan QR kodni brauzerning BarcodeDetector API si yordamida skanerlash */
export async function scanQrFromDataUrls(dataUrls: string[]): Promise<string | null> {
  const Detector = (globalThis as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (img: ImageBitmap) => Promise<{ rawValue?: string }[]> } }).BarcodeDetector
  if (!Detector) return null

  try {
    const detector = new Detector({ formats: ['qr_code'] })
    for (const src of dataUrls) {
      const resp = await fetch(src)
      const blob = await resp.blob()
      const bmp = await createImageBitmap(blob)
      const codes = await detector.detect(bmp)
      for (const c of codes) {
        if (c.rawValue) return c.rawValue
      }
    }
  } catch {
    // BarcodeDetector ishlamasa e'tibor bermaymiz
  }
  return null
}

export interface DocAnalysisResult {
  fields: Partial<EditFields> & { sh_qr?: string }
  docFile?: string
  qrFound?: string
  images: string[]
  message: string
}

/** Talaba hujjatlarini (.docx yoki rasm) yuklash, QR va AI tahlil qilish */
export async function analyzeAndUploadDocs(opts: {
  row?: number
  passFiles?: File[]
  certFiles?: File[]
  generalFiles?: File[]
  existingImages?: string[]
  model?: AiModelId
}): Promise<DocAnalysisResult> {
  const model = opts.model || getSavedAiModel()
  const allFiles = [...(opts.passFiles || []), ...(opts.certFiles || []), ...(opts.generalFiles || [])]
  const previewImages: string[] = [...(opts.existingImages || [])]
  let extractedText = ''

  for (const f of allFiles) {
    if (f.name.toLowerCase().endsWith('.docx')) {
      const { text, images } = await extractDocxClient(f)
      if (text) extractedText += '\n' + text
      previewImages.push(...images)
    } else if (f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name)) {
      previewImages.push(await fileToDataUrl(f))
    }
  }

  // 1. Agar mavjud talaba (row) bo'lsa va local Python server ishlasa, /api/upload_student_doc ga yuboramiz
  if (opts.row && (opts.passFiles?.length || opts.certFiles?.length)) {
    try {
      const fd = new FormData()
      fd.append('row', String(opts.row))
      fd.append('model', model)
      opts.passFiles?.[0] && fd.append('pass_file_1', opts.passFiles[0])
      opts.passFiles?.[1] && fd.append('pass_file_2', opts.passFiles[1])
      opts.certFiles?.[0] && fd.append('cert_file_1', opts.certFiles[0])
      opts.certFiles?.[1] && fd.append('cert_file_2', opts.certFiles[1])

      const res = await fetch(`${LOCAL_PY_SERVER}/api/upload_student_doc`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.ok) {
        const ext = data.extracted || {}
        const fields: Partial<EditFields> & { sh_qr?: string } = {}
        for (const k of ['ism', 'ota', 'pv', 'pinfl', 'dob', 'ber', 'doc_tur', 'sh_doc', 'mak', 'yil'] as const) {
          if (ext[k]) fields[k] = String(ext[k])
        }
        if (ext.sh_qr) fields.sh_qr = String(ext.sh_qr)
        return {
          fields,
          docFile: data.doc_file,
          qrFound: data.qr_found || ext.sh_qr,
          images: previewImages,
          message: data.ai_error
            ? `Hujjat saqlandi (${data.doc_file}). AI eslatmasi: ${data.ai_error}`
            : `Hujjat saqlandi va AI tahlili bajarildi (${Object.keys(fields).length} ta maydon aniqlandi)`,
        }
      }
    } catch {
      // Local Python server o'chiq bo'lsa pastdagi universal tahlilga o'tadi
    }
  }

  // 2. Yangi talaba yoki umumiy fayl uchun /api/analyze_new_doc ni sinab ko'ramiz
  if (allFiles.length > 0) {
    try {
      const fd = new FormData()
      fd.append('file', allFiles[0])
      allFiles.slice(1).forEach((f, idx) => fd.append(`extra_file_${idx}`, f))
      fd.append('model', model)

      const res = await fetch(`${LOCAL_PY_SERVER}/api/analyze_new_doc`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.ok && data.extracted) {
        const ext = data.extracted
        const fields: Partial<EditFields> & { sh_qr?: string } = {}
        for (const k of ['ism', 'ota', 'pv', 'pinfl', 'dob', 'ber', 'doc_tur', 'sh_doc', 'mak', 'yil', 'shnum', 'tel'] as const) {
          if (ext[k]) fields[k] = String(ext[k])
        }
        if (ext.sh_qr) fields.sh_qr = String(ext.sh_qr)
        return {
          fields,
          docFile: data.saved_file,
          qrFound: ext.sh_qr,
          images: previewImages,
          message: `AI tahlili muvaffaqiyatli bajarildi (${Object.keys(fields).length} ta maydon aniqlandi)`,
        }
      }
    } catch {
      // Local server ishlamasa client-side tahlilga o'tamiz
    }
  }

  // 3. Client-side QR + Matn regex tahlili (Vercel / Offline rejim uchun)
  const fields = parseFieldsFromText(extractedText)
  const qr = await scanQrFromDataUrls(previewImages)
  if (qr) {
    fields.sh_qr = qr
    const m = qr.match(/\b(UM|U|AB|AA|DT|K|S)\s*(\d{6,8})\b/i)
    if (m && !fields.sh_doc) fields.sh_doc = `${m[1].toUpperCase()} ${m[2]}`
  }

  const count = Object.keys(fields).length
  return {
    fields,
    qrFound: qr || fields.sh_qr,
    images: previewImages,
    message: count > 0
      ? `${count} ta maydon hujjatdan avtomatik aniqlandi${qr ? ' (QR kod topildi ✓)' : ''}`
      : qr
        ? `QR kod aniqlandi: ${qr}`
        : previewImages.length > 0
          ? "Rasmlar yuklandi (to'liq AI tahlil uchun lokal serverni yoqing)"
          : "Ma'lumot topilmadi",
  }
}
