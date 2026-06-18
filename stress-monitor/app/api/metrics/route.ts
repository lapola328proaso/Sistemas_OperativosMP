import { NextResponse } from 'next/server'
import { collectMetrics } from '@/lib/os-monitor'
import { stressState } from '@/lib/stress-engine'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [os, dbResult] = await Promise.all([
      collectMetrics(),
      query('SELECT count(*) FROM pg_stat_activity WHERE state = $1', ['active'])
    ])
    return NextResponse.json({
      os,
      stress: stressState,
      db: {
        activeConnections: parseInt(dbResult.rows[0].count),
        queryDuration: dbResult.duration
      }
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
