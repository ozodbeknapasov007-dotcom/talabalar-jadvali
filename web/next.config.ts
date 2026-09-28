import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ota papkada ham package.json bor — Turbopack ildizni adashtirmasin
  turbopack: { root: __dirname },
  // Ma'lumotnoma shriftlari, logotip va muhr — diskdan o'qiladi, Vercel'ga ham tushsin
  outputFileTracingIncludes: {
    '/api/malumotnoma': ['./assets/malumotnoma/**/*'],
    '/api/telegram_webhook': ['./assets/malumotnoma/**/*'],
  },
}

export default nextConfig
