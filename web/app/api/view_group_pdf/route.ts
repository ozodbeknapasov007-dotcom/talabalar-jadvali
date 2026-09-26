import type { NextRequest } from 'next/server'
import { REPO_PATHS, readRepoFileIn } from '@/lib/server/source'

/**
 * Guruh A4 PDF jurnali: /api/view_group_pdf?group=26-03
 * group=barcha — barcha guruhlar bitta faylda (Barcha_Guruhlar_Jurnali.pdf).
 * Kompyuterda hisobotlar/pdf_jurnallar/ dan, Vercel'da GitHub'dan o'qiladi.
 */
export async function GET(request: NextRequest) {
  const group = (request.nextUrl.searchParams.get('group') || '').trim()
  if (!group || !/^[\w-]+$/.test(group)) {
    return Response.json({ error: "Guruh noto'g'ri" }, { status: 400 })
  }
  const fileName = group.toLowerCase() === 'barcha' ? 'Barcha_Guruhlar_Jurnali.pdf' : `Guruh_${group}.pdf`
  const buf = await readRepoFileIn(REPO_PATHS.pdfJurnallar, fileName)
  if (!buf) return Response.json({ error: `${fileName} topilmadi` }, { status: 404 })

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
