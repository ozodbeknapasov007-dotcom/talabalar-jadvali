'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn } from 'lucide-react'

/** Faqat sayt ichidagi manzilga qaytish ("//boshqa.sayt" yoki "https://..." emas) */
function safeNext(): string {
  const n = new URLSearchParams(window.location.search).get('next') || '/'
  return n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : '/'
}

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!login.trim() || !password) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        window.location.replace(safeNext())
        return
      }
      setError(data.error || 'Kirib bo‘lmadi')
      setPassword('')
    } catch {
      setError('Server bilan aloqa yo‘q')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-ink-950 px-4 py-10">
      <form onSubmit={submit} className="panel w-full max-w-[380px] p-6 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl border border-line bg-ink-850">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="size-7" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[0.14em] text-emerald-soft uppercase">Shahrisabz Tibbiyot Texnikumi</div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-fg">Talabalar portali</h1>
          </div>
        </div>

        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-line bg-ink-950/50 px-3 py-2.5 text-[12.5px] text-fg-muted">
          <LockKeyhole size={15} className="mt-px shrink-0 text-sky" />
          <span>Portalda talabalarning shaxsiy ma'lumotlari bor. Davom etish uchun tizimga kiring.</span>
        </div>

        <label className="mb-3.5 block">
          <span className="label">Login</span>
          <input
            className="field"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
          />
        </label>
        <label className="mb-5 block">
          <span className="label">Parol</span>
          <span className="relative block">
            <input
              className="field pr-10"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-fg-subtle hover:text-fg"
              aria-label={show ? 'Parolni yashirish' : "Parolni ko'rsatish"}
              title={show ? 'Parolni yashirish' : "Parolni ko'rsatish"}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose/45 bg-rose/10 px-3 py-2 text-[12.5px] text-rose">{error}</div>
        )}

        <button type="submit" className="btn-success h-10 w-full" disabled={busy || !login.trim() || !password}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {busy ? 'Tekshirilmoqda…' : 'Kirish'}
        </button>
      </form>
    </main>
  )
}
