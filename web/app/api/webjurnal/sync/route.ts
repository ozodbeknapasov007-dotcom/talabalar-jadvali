import { NextRequest, NextResponse } from 'next/server'
import {
  getWebJurnalConfig,
  syncStudentsToWebJurnal,
  syncBatchStudentsToWebJurnal,
  type StudentSyncItem,
} from '@/lib/server/webjurnal'

export const dynamic = 'force-dynamic'

/**
 * GET /api/webjurnal/sync
 * Web Jurnal ulanish holatini va mavjud guruhlarni tekshiradi
 */
export async function GET() {
  const { url, apiKey } = getWebJurnalConfig()
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      webjurnalUrl: url,
      data,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message, webjurnalUrl: url },
      { status: 502 }
    )
  }
}

/**
 * POST /api/webjurnal/sync
 * Web Jurnalga talabalarni sinxronlash (webhook yoki batch import uchun)
 *
 * Body formatlari:
 * 1. Bitta guruh:
 *    { "groupName": "26-02", "students": ["F.I.O 1", "F.I.O 2"] }
 *
 * 2. Bir nechta guruhdagi talabalar:
 *    { "students": [ { "groupName": "26-02", "fullName": "F.I.O 1" }, ... ] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: "JSON ma'lumoti yaroqsiz yoki bo'sh" },
        { status: 400 }
      )
    }

    // 1. Agar to'g'ridan-to'g'ri groupName va students massivi berilgan bo'lsa
    if (body.groupName && Array.isArray(body.students)) {
      const groupName = String(body.groupName).trim()
      const students = body.students.map((s: unknown) => String(s || '').trim()).filter(Boolean)
      const result = await syncStudentsToWebJurnal(groupName, students)
      return NextResponse.json({
        success: result.ok,
        result,
      })
    }

    // 2. Agar ob'yektlar ko'rinishidagi talabalar massivi berilgan bo'lsa (batch)
    if (Array.isArray(body.students)) {
      const items: StudentSyncItem[] = []
      for (const st of body.students) {
        if (!st) continue
        if (typeof st === 'string') {
          items.push({ groupName: String(body.defaultGroup || '26-02'), fullName: st })
        } else if (typeof st === 'object') {
          const g = String(st.groupName || st.group || body.defaultGroup || '26-02').trim()
          const n = String(st.fullName || st.fish || `${st.ism || ''} ${st.ota || ''}`).trim()
          if (n) items.push({ groupName: g, fullName: n })
        }
      }

      if (items.length === 0) {
        return NextResponse.json(
          { success: false, error: "Talabalar ro'yxati bo'sh" },
          { status: 400 }
        )
      }

      const results = await syncBatchStudentsToWebJurnal(items)
      return NextResponse.json({
        success: true,
        totalItems: items.length,
        results,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Kutilgan maydonlar topilmadi: { groupName, students: string[] } yoki { students: Array } yuboring.",
      },
      { status: 400 }
    )
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
