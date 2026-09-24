import 'server-only'
import { inflateRawSync } from 'node:zlib'

const MIME: Record<string, string> = {
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
}

/** .docx (zip) ichidagi word/media/* rasmlarini data: URL sifatida ajratish */
export function extractDocxImages(buf: Buffer): string[] {
  const images: string[] = []
  let offset = 0
  while (offset < buf.length - 30) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) {
      offset++
      continue
    }
    const method = buf.readUInt16LE(offset + 8)
    const compSize = buf.readUInt32LE(offset + 18)
    const nameLen = buf.readUInt16LE(offset + 26)
    const extraLen = buf.readUInt16LE(offset + 28)
    const name = buf.toString('utf8', offset + 30, offset + 30 + nameLen)
    const dataStart = offset + 30 + nameLen + extraLen
    const dataEnd = dataStart + compSize

    if (name.startsWith('word/media/') && !name.endsWith('/')) {
      const ext = name.split('.').pop()?.toLowerCase() ?? ''
      const mime = MIME[ext]
      if (mime) {
        try {
          const raw = buf.subarray(dataStart, dataEnd)
          const data = method === 8 ? inflateRawSync(raw) : raw
          images.push(`data:${mime};base64,${data.toString('base64')}`)
        } catch { /* buzilgan rasm — o'tkazib yuboramiz */ }
      }
    }
    offset = Math.max(dataEnd, offset + 1)
  }
  return images
}
