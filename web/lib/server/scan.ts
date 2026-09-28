import 'server-only'
import jpeg from 'jpeg-js'
import { PNG } from 'pngjs'

/*
  "Skaner qilingandek" effekt: satori chizgan toza sahifa ustiga muhrni siyoh kabi
  (matn ustidan) bosadi, keyin qog'oz rangi, yorug'lik notekisligi, biroz yumshoqlik
  va donadorlik qo'shib JPEG qiladi. Hammasi toza JS — Vercel'da ham ishlaydi.
*/

export interface Raster { width: number; height: number; data: Uint8Array }

export function decodePng(buf: Buffer): Raster {
  const png = PNG.sync.read(buf)
  return { width: png.width, height: png.height, data: png.data }
}

/** Takrorlanadigan tasodifiy sonlar — bitta talaba uchun rasm har safar bir xil chiqadi */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Muhrni sahifaga bosish. Siyoh shaffof: oq qog'ozda muhr rangida, qora matn
 * ustida esa matnni to'q ko'kka bo'yaydi — muhr matn ustida turgani ko'rinadi.
 * x, y, w, h — sahifa pikselida; angle — muhrning qiyshayishi (gradus).
 */
export function stampOnto(page: Raster, stamp: Raster, x: number, y: number, w: number, h: number, angle = 0) {
  const { width: PW, height: PH, data: P } = page
  const { width: SW, height: SH, data: S } = stamp
  const cx = x + w / 2, cy = y + h / 2
  const cos = Math.cos((angle * Math.PI) / 180), sin = Math.sin((angle * Math.PI) / 180)
  const sx = SW / w, sy = SH / h
  const pad = Math.ceil(Math.max(w, h) * 0.1)
  const x0 = Math.max(0, Math.floor(x - pad)), x1 = Math.min(PW, Math.ceil(x + w + pad))
  const y0 = Math.max(0, Math.floor(y - pad)), y1 = Math.min(PH, Math.ceil(y + h + pad))

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      // Sahifa nuqtasini muhr rasmidagi nuqtaga aylantirib o'tkazamiz
      const dx = px + 0.5 - cx, dy = py + 0.5 - cy
      const u = (cos * dx + sin * dy + w / 2) * sx - 0.5
      const v = (-sin * dx + cos * dy + h / 2) * sy - 0.5
      if (u < 0 || v < 0 || u >= SW - 1 || v >= SH - 1) continue
      const ui = u | 0, vi = v | 0, fu = u - ui, fv = v - vi
      const i00 = (vi * SW + ui) * 4, i10 = i00 + 4, i01 = i00 + SW * 4, i11 = i01 + 4
      const w00 = (1 - fu) * (1 - fv), w10 = fu * (1 - fv), w01 = (1 - fu) * fv, w11 = fu * fv
      const a = (S[i00 + 3] * w00 + S[i10 + 3] * w10 + S[i01 + 3] * w01 + S[i11 + 3] * w11) / 255
      if (a <= 0.004) continue
      const pi = (py * PW + px) * 4
      for (let c = 0; c < 3; c++) {
        // premultiplied bilinear rang
        const col = (S[i00 + c] * S[i00 + 3] * w00 + S[i10 + c] * S[i10 + 3] * w10 + S[i01 + c] * S[i01 + 3] * w01 + S[i11 + c] * S[i11 + 3] * w11) / 255 / a
        const base = P[pi + c]
        // Oq qog'ozda — muhr rangi, qora matn ustida — to'q ko'k (siyoh matnni qoplaydi)
        const ink = col * (0.6 + (0.4 * base) / 255)
        P[pi + c] = base * (1 - a) + ink * a
      }
    }
  }
}

/** Qog'oz, yorug'lik, yumshoqlik va donadorlik — keyin JPEG */
export function scanToJpeg(page: Raster, seed: number, quality = 86): Buffer {
  const { width: W, height: H, data: P } = page
  const n = W * H

  // 1) Yengil xiralik (3×3 [1 2 1] yadrosi) — lazer printer va skaner yumshoqligi
  const tmp = new Uint8ClampedArray(n * 3)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const l = Math.max(0, x - 1), r = Math.min(W - 1, x + 1)
      const i = (y * W + x) * 4, il = (y * W + l) * 4, ir = (y * W + r) * 4, o = (y * W + x) * 3
      for (let c = 0; c < 3; c++) tmp[o + c] = (P[il + c] + 2 * P[i + c] + P[ir + c] + 2) >> 2
    }
  }
  const out = Buffer.alloc(n * 4)
  const rand = rng(seed)
  // Past chastotali yorug'lik notekisligi (skaner lampasi), tasodifiy fazalar bilan
  const p1 = rand() * 6.28, p2 = rand() * 6.28, p3 = rand() * 6.28
  for (let y = 0; y < H; y++) {
    const up = Math.max(0, y - 1) * W, dn = Math.min(H - 1, y + 1) * W
    const fy = y / H
    for (let x = 0; x < W; x++) {
      const fx = x / W
      const light = 1.5 * Math.sin(fx * 2.3 + p1) + 1.2 * Math.sin(fy * 1.7 + p2) + 0.8 * Math.sin((fx + fy) * 3.1 + p3) - 2.2 * ((fx - 0.5) ** 2 + (fy - 0.5) ** 2) * 4
      const grain = (rand() + rand() + rand() - 1.5) * 7 // ~gauss shovqin
      const o = (y * W + x) * 4
      for (let c = 0; c < 3; c++) {
        const v = (tmp[(up + x) * 3 + c] + 2 * tmp[(y * W + x) * 3 + c] + tmp[(dn + x) * 3 + c] + 2) >> 2
        // Ton: qog'oz oq emas (iliq kulrang-oq), qora — to'q kulrang
        const paper = c === 0 ? 247 : c === 1 ? 246 : 241
        const black = c === 2 ? 34 : 30
        const t = black + (v / 255) * (paper - black)
        out[o + c] = Math.max(0, Math.min(255, Math.round(t + light + grain + (rand() - 0.5) * 2)))
      }
      out[o + 3] = 255
    }
  }
  return jpeg.encode({ width: W, height: H, data: out }, quality).data
}
