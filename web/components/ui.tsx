'use client'

import { Check, Clock, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import { GROUP_TITLES } from '@/lib/config'
import { isAcademicLeave, isWithdrawn } from '@/lib/student'
import type { Student } from '@/lib/types'

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export function GroupBadge({ group, className, short }: { group: string; className?: string; short?: boolean }) {
  if (!group) return <span className={cx('chip border-amber/40 bg-amber/10 text-amber', className)}>Guruhsiz</span>
  if (isWithdrawn(group)) return <span className={cx('chip border-rose/40 bg-rose/10 text-rose', className)} title="Talabalar safidan chiqarilganlar">{short ? 'Chiqarilgan' : 'Safdan chiqarilgan'}</span>
  if (isAcademicLeave(group)) return <span className={cx('chip border-violet/40 bg-violet/10 text-violet', className)} title="Akademik ta'til olganlar">{short ? "Akad. ta'til" : "Akademik ta'til"}</span>
  const farm = GROUP_TITLES[group]?.startsWith('Farmatsiya')
  return (
    <span className={cx('chip mono', farm ? 'border-emerald/40 bg-emerald/10 text-emerald-soft' : 'border-blue/40 bg-blue/10 text-blue-soft', className)}>
      {group}
    </span>
  )
}

export function VerifyButton({ student, onToggle, compact }: { student: Student; onToggle: (s: Student) => void; compact?: boolean }) {
  const ok = student.verified === 'TASDIQLANDI'
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(student) }}
      title={ok ? "Tasdiqlangan — bekor qilish uchun bosing" : 'Tasdiqlash uchun bosing'}
      className={cx(
        'chip cursor-pointer transition-colors',
        ok
          ? 'border-emerald/45 bg-emerald/12 text-emerald-soft hover:bg-emerald/20'
          : 'border-amber/40 bg-amber/10 text-amber hover:bg-amber/20',
      )}
    >
      {ok ? <Check size={12} strokeWidth={3} /> : <Clock size={12} strokeWidth={2.5} />}
      {compact ? (ok ? 'OK' : 'Kutilmoqda') : ok ? 'Tasdiqlangan' : 'Kutilmoqda'}
    </button>
  )
}

const STATUS = {
  full: { icon: CheckCircle2, cls: 'text-emerald-soft', label: "Hujjatlar to'liq" },
  chala: { icon: AlertTriangle, cls: 'text-amber', label: 'Chala — pasport yoki shahodatnoma yetishmaydi' },
  yoq: { icon: XCircle, cls: 'text-rose', label: "Hujjat yo'q" },
} as const

export function StatusIcon({ status, size = 16 }: { status: string; size?: number }) {
  const s = STATUS[status as keyof typeof STATUS] ?? STATUS.yoq
  const Icon = s.icon
  return (
    <span title={s.label} className={cx('inline-flex', s.cls)}>
      <Icon size={size} strokeWidth={2.4} />
    </span>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-fg-subtle">{children || '—'}</span>
}

export function Mono({ value, className }: { value: string; className?: string }) {
  if (!value) return <span className="font-semibold text-rose/80">—</span>
  return <span className={cx('mono font-semibold text-sky-soft', className)}>{value}</span>
}

export function ProgressBar({ value, tone = 'emerald' }: { value: number; tone?: 'emerald' | 'sky' }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700/70">
      <div
        className={cx('h-full rounded-full transition-[width] duration-500', tone === 'emerald' ? 'bg-gradient-to-r from-emerald to-emerald-soft' : 'bg-gradient-to-r from-blue to-sky')}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}
