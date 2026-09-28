import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import opentype from 'opentype.js'
import type { MalumotnomaData } from '@/lib/malumotnoma'
import { decodePng, scanToJpeg, stampOnto, type Raster } from './scan'

/*
  Ma'lumotnomani A4 PNG rasm qilib chizish (namuna: 1414×2000 px, ~171 dpi).
  Barcha koordinatalar namunadagi piksellarda yozilgan va S marta kattalashtiriladi.

  Word'dagidek: Times New Roman (Liberation Serif — o'lchamlari aynan bir xil),
  matn 14 pt, qatorlar oralig'i 2, ikki tomonga tekislangan, xat boshi 1,25 sm.
  Satrlarga bo'lishni o'zimiz qilamiz (satori inline qalin/oddiy matnni bitta
  abzatsda justify qila olmaydi): har bir so'z kengligi shrift bo'yicha o'lchanadi.
*/

const S = 1.5
const W = 1414
const H = 2000
const u = (n: number) => Math.round(n * S * 100) / 100

const ASSETS = path.join(process.cwd(), 'assets', 'malumotnoma')

const PT = 2.375 // 1 pt namunadagi pikselda (1414 px = 210 mm)
const BODY = 14 * PT
const HEADER = 12 * PT
const TITLE = 16 * PT
// Liberation Serif: ascender 0.891 em, descender 0.216 em
const ASC = 0.891
const LINE = 1.107

const BODY_LEFT = 203
const BODY_RIGHT = 1309
const INDENT = 288
const BODY_PITCH = 76.67

const HEADER_UZ = ['O’ZBEKISTON', 'RESPUBLIKASI', 'QASHQADARYO VILOYATI', '“QARSHI TIBBIYOT', 'TEXNIKUMI”', 'NODAVLAT TA’LIM', 'MUASSASASI']
const HEADER_RU = ['РЕСПУБЛИКА УЗБЕКИСТАН', 'КАШКАДАРЬИНСКАЯ ОБЛАСТЬ', 'НЕГОСУДАРСТВЕННОЕ', 'ОБРАЗОВАТЕЛЬНОЕ', 'УЧРЕЖДЕНИЕ', '«КАРШИНСКИЙ', 'МЕДИЦИНСКИЙ ТЕХНИКУМ»']

interface Assets {
  regular: ArrayBuffer
  bold: ArrayBuffer
  italic: ArrayBuffer
  fontRegular: opentype.Font
  fontBold: opentype.Font
  logo: string
  stamp: Raster
}

let assetsPromise: Promise<Assets> | null = null

function loadAssets(): Promise<Assets> {
  assetsPromise ??= (async () => {
    // Asl Times New Roman (times.ttf, timesbd.ttf, timesi.ttf) papkaga qo'yilsa — o'shasi,
    // bo'lmasa Liberation Serif (harf kengliklari Times New Roman bilan bir xil)
    const font = (times: string, liberation: string) =>
      readFile(path.join(ASSETS, times)).catch(() => readFile(path.join(ASSETS, liberation)))
    const [regular, bold, italic, logo, stamp] = await Promise.all([
      font('times.ttf', 'LiberationSerif-Regular.ttf'),
      font('timesbd.ttf', 'LiberationSerif-Bold.ttf'),
      font('timesi.ttf', 'LiberationSerif-Italic.ttf'),
      readFile(path.join(ASSETS, 'logo.png')),
      readFile(path.join(ASSETS, 'muhr_imzo.png')),
    ])
    const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
    return {
      regular: ab(regular),
      bold: ab(bold),
      italic: ab(italic),
      fontRegular: opentype.parse(ab(regular)),
      fontBold: opentype.parse(ab(bold)),
      logo: `data:image/png;base64,${logo.toString('base64')}`,
      stamp: decodePng(stamp),
    }
  })().catch((e) => { assetsPromise = null; throw e })
  return assetsPromise
}

/* ------------------------------ Matnni satrlarga bo'lish ------------------------------ */

type Seg = { t: string; b?: boolean }
type Word = Seg[]

function toWords(segs: Seg[]): Word[] {
  const words: Word[] = []
  let cur: Word = []
  for (const seg of segs) {
    const parts = seg.t.split(/(\s+)/)
    for (const p of parts) {
      if (!p) continue
      if (/^\s+$/.test(p)) {
        if (cur.length) words.push(cur)
        cur = []
      } else {
        cur.push({ t: p, b: seg.b })
      }
    }
  }
  if (cur.length) words.push(cur)
  return words
}

/** Xat boshi faqat birinchi satrda; qolganlari BODY_LEFT dan */
function breakLines(words: Word[], a: Assets, firstLeft: number) {
  const width = (w: Word) => w.reduce((n, s) => n + (s.b ? a.fontBold : a.fontRegular).getAdvanceWidth(s.t, BODY, { kerning: true }), 0)
  const space = a.fontRegular.getAdvanceWidth(' ', BODY)
  const lines: { left: number; words: Word[] }[] = []
  let line: Word[] = []
  let used = 0
  let left = firstLeft
  for (const w of words) {
    const ww = width(w)
    if (line.length && used + space + ww > BODY_RIGHT - left) {
      lines.push({ left, words: line })
      line = []
      used = 0
      left = BODY_LEFT
    }
    used += (line.length ? space : 0) + ww
    line.push(w)
  }
  if (line.length) lines.push({ left, words: line })
  return { lines, space }
}

/* ------------------------------------ Chizish ------------------------------------ */

const font = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: 'Times',
  fontSize: u(size),
  lineHeight: `${u(size * LINE)}px`,
  ...extra,
})

/** Matnni asos chizig'i (baseline) bo'yicha joylash */
function At({ x, baseline, size, children, style }: { x: number; baseline: number; size: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ position: 'absolute', left: u(x), top: u(baseline - size * ASC), display: 'flex', whiteSpace: 'pre', ...font(size), ...style }}>{children}</div>
}

function Centered({ cx, baseline, size, text, bold }: { cx: number; baseline: number; size: number; text: string; bold?: boolean }) {
  const half = 330
  return (
    <div style={{ position: 'absolute', left: u(cx - half), width: u(half * 2), top: u(baseline - size * ASC), display: 'flex', justifyContent: 'center', ...font(size, { fontWeight: bold ? 700 : 400 }) }}>
      {text}
    </div>
  )
}

function WordEl({ w, marginRight }: { w: Word; marginRight?: number }) {
  return (
    <div style={marginRight ? { display: 'flex', marginRight } : { display: 'flex' }}>
      {w.map((s, i) => <span key={i} style={{ fontWeight: s.b ? 700 : 400 }}>{s.t}</span>)}
    </div>
  )
}

/** Ikki tomonga tekislangan satr (oxirgi satr — chapga) */
function BodyLine({ left, baseline, words, justify, space }: { left: number; baseline: number; words: Word[]; justify: boolean; space: number }) {
  return (
    <div style={{
      position: 'absolute', left: u(left), width: u(BODY_RIGHT - left), top: u(baseline - BODY * ASC),
      display: 'flex', justifyContent: justify ? 'space-between' : 'flex-start', ...font(BODY),
    }}>
      {words.map((w, i) => <WordEl key={i} w={w} marginRight={!justify && i < words.length - 1 ? u(space) : undefined} />)}
    </div>
  )
}

function seedOf(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Tayyor ma'lumotnoma — skaner qilingandek JPEG */
export async function renderMalumotnoma(d: MalumotnomaData): Promise<Buffer> {
  const a = await loadAssets()

  const first = breakLines(toWords([{ t: 'Ushbu ma’lumotnoma shuni tasdiqlaydiki, haqiqatdan ham' }]), a, INDENT)
  const main = breakLines(toWords([
    { t: d.fish, b: true },
    { t: ` ${d.oquvYili}-o‘quv yilida ` },
    { t: d.yon, b: true },
    { t: ' yo‘nalishiga to‘lov-shartnoma asosida o‘qishga qabul qilingan. Hozirgi kunda ' },
    { t: `${d.bosqich}-bosqich ` },
    { t: `${d.group}-guruhda`, b: true },
    { t: ' tahsil olmoqda.' },
  ]), a, INDENT)

  const firstBaseline = 831
  const bodyBaselines = main.lines.map((_, i) => firstBaseline + BODY_PITCH * (i + 1))
  const lastBody = bodyBaselines[bodyBaselines.length - 1]
  const italicBaseline = lastBody + 105
  // F.I.SH juda uzun bo'lib, satr ko'paysa — imzo qismini pastga suramiz
  const shift = Math.max(0, italicBaseline - 1165)

  const el = (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#fff', color: '#000' }}>
      {HEADER_UZ.map((t, i) => <Centered key={`uz${i}`} cx={302.5} baseline={161 + i * 37.67} size={HEADER} text={t} bold />)}
      {HEADER_RU.map((t, i) => <Centered key={`ru${i}`} cx={1077} baseline={161 + i * 37.67} size={HEADER} text={t} bold />)}
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={a.logo} width={u(215)} height={u(255)} style={{ position: 'absolute', left: u(570), top: u(130) }} />
      <div style={{ position: 'absolute', left: u(80), top: u(445), width: u(1254), height: u(3), background: '#000' }} />

      <At x={117} baseline={479} size={BODY}>Qarshi shahri</At>
      <div style={{ position: 'absolute', left: u(900), width: u(1333 - 900), top: u(486 - BODY * ASC), display: 'flex', justifyContent: 'flex-end', ...font(BODY) }}>
        {`${d.sana} y.`}
      </div>

      <Centered cx={756} baseline={729} size={TITLE} text="MA’LUMOTNOMA" bold />

      <BodyLine left={first.lines[0].left} baseline={firstBaseline} words={first.lines.flatMap((l) => l.words)} justify space={first.space} />
      {main.lines.map((l, i) => (
        <BodyLine key={i} left={l.left} baseline={bodyBaselines[i]} words={l.words} justify={i < main.lines.length - 1} space={main.space} />
      ))}

      <At x={INDENT} baseline={italicBaseline} size={BODY} style={{ fontStyle: 'italic' }}>Ma’lumotnoma so‘ralgan joyga taqdim etish uchun berildi</At>

      <At x={253} baseline={1385 + shift} size={BODY} style={{ fontWeight: 700 }}>“Qarshi tibbiyot texnikumi”</At>
      <At x={269} baseline={1423 + shift} size={BODY} style={{ fontWeight: 700 }}>ijrochi direktori:</At>
      <At x={1030} baseline={1428 + shift} size={BODY} style={{ fontWeight: 700 }}>Sh.Raxmonov</At>
    </div>
  )

  const res = new ImageResponse(el, {
    width: u(W),
    height: u(H),
    fonts: [
      { name: 'Times', data: a.regular, weight: 400, style: 'normal' },
      { name: 'Times', data: a.bold, weight: 700, style: 'normal' },
      { name: 'Times', data: a.italic, weight: 400, style: 'italic' },
    ],
  })
  const page = decodePng(Buffer.from(await res.arrayBuffer()))
  // Muhr matndan keyin, siyoh kabi bosiladi (matn muhr ostida qoladi)
  stampOnto(page, a.stamp, u(585), u(1278 + shift), u(443), u(270))
  return scanToJpeg(page, seedOf(`${d.fish}|${d.sana}`))
}
