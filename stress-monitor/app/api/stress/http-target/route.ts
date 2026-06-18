import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const arr = Array.from({ length: 10000 }, (_, i) => i * Math.random())
  arr.sort()
  return NextResponse.json({ ok: true, sum: arr.reduce((a, b) => a + b, 0) })
}
