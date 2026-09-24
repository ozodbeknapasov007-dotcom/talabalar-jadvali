import type { NextRequest } from 'next/server'
import { extractDocxImages } from '@/lib/server/docx'
import { loadDocFile } from '@/lib/server/source'

const IMAGE_EXT: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

export async function GET(request: NextRequest) {
  const name = (request.nextUrl.searchParams.get('file') || '').trim()
  // files/ papkasidan tashqariga chiqishga yo'l qo'ymaymiz
  if (!name || name.includes('..') || name.startsWith('/') || name.includes('\\')) {
    return Response.json({ images: [], error: "Fayl nomi noto'g'ri" }, { status: 400 })
  }

  const buf = await loadDocFile(name)
  if (!buf) return Response.json({ images: [], error: 'Fayl topilmadi' })

  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const images = ext === 'docx'
    ? extractDocxImages(buf)
    : IMAGE_EXT[ext]
      ? [`data:${IMAGE_EXT[ext]};base64,${buf.toString('base64')}`]
      : []

  return Response.json(
    { images },
    // Fayl nomi o'zgarmaguncha rasmlar ham o'zgarmaydi — brauzer keshlasin
    { headers: { 'Cache-Control': 'private, max-age=3600' } },
  )
}
