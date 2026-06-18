import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM metrics_history ORDER BY recorded_at DESC LIMIT 60`
    )
    return NextResponse.json({ rows: result.rows.reverse() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST() {
  try {
    const { collectMetrics } = await import('@/lib/os-monitor')
    const { stressState } = await import('@/lib/stress-engine')
    const os = await collectMetrics()
    const dbRes = await query(
      'SELECT count(*) FROM pg_stat_activity WHERE state = $1', ['active']
    )
    await query(
      `INSERT INTO metrics_history (cpu_percent, ram_percent, active_db_connections, http_rps)
       VALUES ($1, $2, $3, $4)`,
      [os.cpu.percent, os.memory.percent,
       parseInt(dbRes.rows[0].count), stressState.http.rps]
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
