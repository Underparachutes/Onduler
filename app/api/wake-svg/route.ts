import { NextRequest, NextResponse } from 'next/server'
import { wakeToSvg } from '@/lib/wakes'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const seed = Math.max(1, parseInt(p.get('seed') ?? '42', 10) || 42)
  const n = Math.min(12, Math.max(3, parseInt(p.get('n') ?? '7', 10) || 7))
  const size = Math.min(2400, Math.max(200, parseInt(p.get('size') ?? '800', 10) || 800))
  const bg = sanitizeColor(p.get('bg'), '#000000')
  const stroke = sanitizeColor(p.get('stroke'), '#e8e6e1')
  const download = p.has('download')

  const svg = wakeToSvg(seed, n, size, bg, stroke)

  const headers: Record<string, string> = {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=31536000, immutable',
  }
  if (download) {
    headers['Content-Disposition'] = `attachment; filename="wake-${seed}-${n}.svg"`
  }

  return new NextResponse(svg, { headers })
}

function sanitizeColor(raw: string | null, fallback: string): string {
  if (!raw) return fallback
  if (/^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw
  if (/^[a-zA-Z]+$/.test(raw)) return raw
  return fallback
}
