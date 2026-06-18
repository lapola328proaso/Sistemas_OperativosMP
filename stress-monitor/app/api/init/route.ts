import { NextResponse } from 'next/server'
import { initDB } from '@/lib/db'

export async function POST() {
  try {
    await initDB()
    return NextResponse.json({ ok: true, message: 'DB initialized' })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
