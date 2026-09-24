import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ota papkada ham package.json bor — Turbopack ildizni adashtirmasin
  turbopack: { root: __dirname },
}

export default nextConfig
