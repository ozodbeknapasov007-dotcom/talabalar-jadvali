import { readRepoFile, saveRepoJsonFile } from '@/lib/server/source'
import type { ContractsPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface HiddenContractsData {
  hidden_student_rows: number[]
  records: Record<string, { reason?: string; updated_at?: string }>
}

/** Buxgalteriya shartnomalari va qarzdorlik hisoboti */
export async function GET() {
  try {
    const buf = await readRepoFile(['data/contracts.json', 'contracts.json'])
    if (!buf) {
      return Response.json({ error: "data/contracts.json fayli topilmadi" }, { status: 404 })
    }
    const data = JSON.parse(buf.toString('utf-8')) as ContractsPayload
    return Response.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}

/** Talaba kontrakti ko'rinmasligi / yashirilishi (imtiyoz, grant yoki maxsus holat) holatini o'zgartirish */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      studentRow?: number | string
      id?: string
      hidden: boolean
      reason?: string
    } | null

    if (!body || (body.studentRow == null && !body.id)) {
      return Response.json({ success: false, error: "studentRow yoki id ko'rsatilmadi" }, { status: 400 })
    }

    const rowNum = body.studentRow != null ? Number(body.studentRow) : null
    const targetId = body.id ? String(body.id) : null
    const hidden = Boolean(body.hidden)
    const reason = String(body.reason || '').trim()

    // 1. data/hidden_contracts.json ni yuklash
    let hiddenData: HiddenContractsData = { hidden_student_rows: [], records: {} }
    const hiddenBuf = await readRepoFile(['data/hidden_contracts.json', 'hidden_contracts.json'])
    if (hiddenBuf) {
      try {
        hiddenData = JSON.parse(hiddenBuf.toString('utf-8')) as HiddenContractsData
        if (!Array.isArray(hiddenData.hidden_student_rows)) hiddenData.hidden_student_rows = []
        if (!hiddenData.records || typeof hiddenData.records !== 'object') hiddenData.records = {}
      } catch {
        hiddenData = { hidden_student_rows: [], records: {} }
      }
    }

    // 2. data/contracts.json ni yuklash
    const contractsBuf = await readRepoFile(['data/contracts.json', 'contracts.json'])
    if (!contractsBuf) {
      return Response.json({ success: false, error: "data/contracts.json topilmadi" }, { status: 404 })
    }
    const payload = JSON.parse(contractsBuf.toString('utf-8')) as ContractsPayload

    // Talabani topish
    const targetStudent = payload.students.find((s) => {
      if (rowNum != null && s.student_row === rowNum) return true
      if (targetId && s.id === targetId) return true
      return false
    })

    if (!targetStudent) {
      return Response.json({ success: false, error: "Talaba kontrakt ro'yxatidan topilmadi" }, { status: 404 })
    }

    const effectiveRow = targetStudent.student_row ?? rowNum

    // 3. Hidden ro'yxatini yangilash
    if (effectiveRow != null) {
      const rowKey = String(effectiveRow)
      if (hidden) {
        if (!hiddenData.hidden_student_rows.includes(effectiveRow)) {
          hiddenData.hidden_student_rows.push(effectiveRow)
        }
        hiddenData.records[rowKey] = {
          reason: reason || 'Yashirilgan',
          updated_at: new Date().toISOString(),
        }
      } else {
        hiddenData.hidden_student_rows = hiddenData.hidden_student_rows.filter((r) => r !== effectiveRow)
        delete hiddenData.records[rowKey]
      }
    }

    // 4. Talaba holatini o'zgartirish
    targetStudent.is_hidden = hidden
    targetStudent.hidden_reason = hidden ? (reason || 'Yashirilgan') : ''

    // 5. KPI va agregatlarni qayta hisoblash
    const visibleStudents = payload.students.filter((s) => !s.is_hidden)
    const hiddenStudents = payload.students.filter((s) => s.is_hidden)

    const totalReq = visibleStudents.reduce((acc, s) => acc + (s.shartnoma_summa || 0), 0)
    const totalPaid = visibleStudents.reduce((acc, s) => acc + (s.tolangan_summa || 0), 0)
    const totalDebt = visibleStudents.reduce((acc, s) => acc + (s.qarzdorlik > 0 ? s.qarzdorlik : 0), 0)
    const debtorsCount = visibleStudents.filter((s) => s.qarzdorlik > 0).length
    const paidCount = visibleStudents.filter((s) => s.qarzdorlik <= 0).length

    payload.kpi.total_students = payload.students.length
    payload.kpi.visible_students = visibleStudents.length
    payload.kpi.hidden_students_count = hiddenStudents.length
    payload.kpi.total_req_sum = totalReq
    payload.kpi.total_paid_sum = totalPaid
    payload.kpi.total_debt_sum = totalDebt
    payload.kpi.total_debtors_count = debtorsCount
    payload.kpi.total_paid_full_count = paidCount
    payload.kpi.total_pay_percent =
      totalReq > 0 ? Math.round((totalPaid / totalReq) * 1000) / 10 : 0
    payload.hidden_rows = hiddenData.hidden_student_rows

    if (payload.summary_table) {
      for (const item of payload.summary_table) {
        const grpVisible = visibleStudents.filter((s) => s.group === item.group)
        item.students_count = grpVisible.length
        item.total_debt = grpVisible.reduce((acc, s) => acc + (s.qarzdorlik > 0 ? s.qarzdorlik : 0), 0)
      }
    }

    if (payload.groups) {
      for (const gr of payload.groups) {
        const grpVisible = visibleStudents.filter((s) => s.group === gr.group)
        gr.total_students = grpVisible.length
        gr.contracts_count = grpVisible.length
        gr.total_req = grpVisible.reduce((acc, s) => acc + (s.shartnoma_summa || 0), 0)
        gr.total_paid = grpVisible.reduce((acc, s) => acc + (s.tolangan_summa || 0), 0)
        gr.total_debt = grpVisible.reduce((acc, s) => acc + (s.qarzdorlik > 0 ? s.qarzdorlik : 0), 0)
        gr.debtors_count = grpVisible.filter((s) => s.qarzdorlik > 0).length
        gr.paid_count = grpVisible.filter((s) => s.qarzdorlik <= 0).length
        gr.pay_percent = gr.total_req > 0 ? Math.round((gr.total_paid / gr.total_req) * 1000) / 10 : 0
      }
    }

    // 6. Saqlash (hidden_contracts.json va contracts.json)
    await Promise.all([
      saveRepoJsonFile('data/hidden_contracts.json', hiddenData, `Talaba ${targetStudent.fish} shartnoma holati (${hidden ? 'yashirildi' : 'tiklandi'})`),
      saveRepoJsonFile('data/contracts.json', payload, `Kontraktlar xulosasi yangilandi (${targetStudent.fish})`),
    ])

    return Response.json({
      success: true,
      hidden,
      student: targetStudent,
      payload,
    })
  } catch (e) {
    return Response.json({ success: false, error: (e as Error).message }, { status: 500 })
  }
}
